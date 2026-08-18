"""IDM AI Template Builder – FastAPI application entry point."""

from __future__ import annotations

import io
import logging
import os
import tempfile
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.models import (
    AiEditRequest,
    AiEditResponse,
    DocumentState,
    FieldUpdateRequest,
    HealthResponse,
)
from app.services.ai_editor import get_openai_status, propose_patches
from app.services.merger import merge_docx
from app.services.session_store import session_store
from app.services.structure_parser import apply_value, resolve_xpath_value

load_dotenv(Path(__file__).resolve().parent / ".env")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SAMPLES_DIR = Path(__file__).resolve().parent.parent / "samples"

app = FastAPI(
    title="IDM AI Template Builder",
    description="Upload M3 IDM structure XML and a Word template, edit with AI, export XML and DOCX.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173").strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root() -> dict:
    frontend = os.getenv("FRONTEND_URL", "http://localhost:5173").strip()
    return {
        "name": "IDM AI Template Builder",
        "message": "This is the API. Open the UI URL in your browser.",
        "ui": frontend,
        "health": "/api/health",
        "docs": "/docs",
    }


@app.get("/api/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        document_loaded=session_store.loaded(),
        openai=get_openai_status(),
    )


@app.post("/api/upload", response_model=DocumentState)
async def upload(
    structure_xml: UploadFile = File(...),
    template: UploadFile = File(...),
) -> DocumentState:
    structure_bytes = await structure_xml.read()
    template_bytes = await template.read()
    if not structure_bytes:
        raise HTTPException(status_code=400, detail="Structure XML file is empty")
    if not template_bytes:
        raise HTTPException(status_code=400, detail="Template file is empty")
    try:
        return session_store.load(
            structure_xml.filename or "structure.xml",
            structure_bytes,
            template.filename or "template.xml",
            template_bytes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Upload failed")
        raise HTTPException(status_code=400, detail=f"Could not parse files: {exc}") from exc


@app.post("/api/load-samples", response_model=DocumentState)
async def load_samples() -> DocumentState:
    structure_path = _find_sample("*Structure*.xml")
    template_path = _find_sample("*Template*.xml")
    if structure_path is None or template_path is None:
        raise HTTPException(
            status_code=404,
            detail="Sample files not found in samples/. Expected *Structure*.xml and *Template*.xml",
        )
    try:
        return session_store.load(
            structure_path.name,
            structure_path.read_bytes(),
            template_path.name,
            template_path.read_bytes(),
        )
    except Exception as exc:
        logger.exception("Failed to load samples")
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/document", response_model=DocumentState)
async def get_document() -> DocumentState:
    return _require_document()


@app.patch("/api/fields", response_model=DocumentState)
async def update_field(body: FieldUpdateRequest) -> DocumentState:
    _require_document()
    try:
        root = session_store.structure_root()
        apply_value(root, body.xpath, body.value)
        session_store.save_root(root, keep_undo=True)
        return session_store.document_state()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/ai-edit", response_model=AiEditResponse)
async def ai_edit(body: AiEditRequest) -> AiEditResponse:
    state = _require_document()
    extra_fields = _binding_fields(state)
    try:
        summary, patches = propose_patches(state.tree, body.instruction, extra_fields)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("AI edit failed")
        raise HTTPException(status_code=502, detail=f"AI edit failed: {exc}") from exc

    applied = []
    skipped = []
    if patches:
        root = session_store.structure_root()
        for patch in patches:
            try:
                apply_value(root, patch.xpath, patch.value)
                applied.append(patch)
            except ValueError:
                skipped.append(patch.xpath)
        if applied:
            session_store.save_root(root, keep_undo=True)
        summary = summary or f"Applied {len(applied)} field change(s)."
        if skipped:
            summary = f"{summary} Skipped {len(skipped)} xpath(s) not present in the XML."
    return AiEditResponse(summary=summary, patches=applied, document=session_store.document_state())


@app.post("/api/undo", response_model=DocumentState)
async def undo() -> DocumentState:
    try:
        return session_store.undo()
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/export/xml")
async def export_xml() -> StreamingResponse:
    data = session_store.require() if session_store.loaded() else None
    if data is None:
        raise HTTPException(status_code=400, detail="Upload a structure XML and template first")
    filename = _xml_filename(data.structure_name)
    return StreamingResponse(
        io.BytesIO(data.structure_xml),
        media_type="application/xml",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/api/export/docx")
async def export_docx() -> StreamingResponse:
    merged, filename = _merged_docx()
    return StreamingResponse(
        io.BytesIO(merged),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/api/preview/docx")
async def preview_docx() -> StreamingResponse:
    merged, _filename = _merged_docx()
    return StreamingResponse(
        io.BytesIO(merged),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


@app.get("/api/template/docx")
async def template_docx() -> StreamingResponse:
    _require_document()
    data = session_store.require()
    return StreamingResponse(
        io.BytesIO(data.template_docx),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


def _docx_bytes_to_pdf(docx_bytes: bytes) -> bytes:
    from docx2pdf import convert
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as temp_in:
        temp_in.write(docx_bytes)
        temp_in_path = temp_in.name
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_out:
        temp_out_path = temp_out.name
    
    try:
        convert(temp_in_path, temp_out_path)
        with open(temp_out_path, "rb") as f:
            pdf_bytes = f.read()
        return pdf_bytes
    except Exception as e:
        logger.exception("PDF conversion failed")
        raise HTTPException(status_code=500, detail=f"PDF conversion failed: {e}")
    finally:
        try:
            os.remove(temp_in_path)
            os.remove(temp_out_path)
        except OSError:
            pass


@app.get("/api/preview/pdf")
async def preview_pdf() -> StreamingResponse:
    merged, _filename = _merged_docx()
    pdf_bytes = _docx_bytes_to_pdf(merged)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
    )


@app.get("/api/template/pdf")
async def template_pdf() -> StreamingResponse:
    _require_document()
    data = session_store.require()
    pdf_bytes = _docx_bytes_to_pdf(data.template_docx)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
    )


def _merged_docx() -> tuple[bytes, str]:
    state = _require_document()
    data = session_store.require()
    merged = merge_docx(data.template_docx, data.structure_xml, state.controls)
    return merged, _docx_filename(data.template_name, data.structure_name)


def _require_document() -> DocumentState:
    if not session_store.loaded():
        raise HTTPException(status_code=400, detail="Upload a structure XML and template first")
    return session_store.document_state()


def _find_sample(pattern: str) -> Path | None:
    roots = [SAMPLES_DIR, Path(__file__).resolve().parent.parent]
    for root in roots:
        if not root.is_dir():
            continue
        matches = sorted(root.glob(pattern))
        matches = [path for path in matches if path.is_file()]
        if matches:
            return matches[0]
    return None


def _xml_filename(name: str) -> str:
    stem = Path(name).stem or "document"
    return f"{stem}.xml"


def _docx_filename(template_name: str, structure_name: str) -> str:
    stem = Path(template_name).stem or Path(structure_name).stem or "document"
    stem = stem.replace("_Template", "").replace(" Template", "").strip() or "document"
    return f"{stem}.docx"


def _binding_fields(state: DocumentState) -> list[dict]:
    if not session_store.loaded():
        return []
    root = session_store.structure_root()
    fields = []
    for control in state.controls:
        if not control.xpath:
            continue
        fields.append(
            {
                "xpath": control.xpath,
                "name": control.mapped_name,
                "label": control.mapped_name,
                "value": resolve_xpath_value(root, control.xpath),
            }
        )
    return fields
