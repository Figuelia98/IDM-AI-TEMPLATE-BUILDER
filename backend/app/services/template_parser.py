"""Parse Word Flat OPC XML or .docx and extract content controls."""

from __future__ import annotations

import base64
import io
import json
import zipfile
from dataclasses import dataclass

from lxml import etree

PKG_NS = "http://schemas.microsoft.com/office/2006/xmlPackage"
W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
CT_NS = "http://schemas.openxmlformats.org/package/2006/content-types"

WORD_PART_SUFFIXES = (
    "word/document.xml",
    "/word/document.xml",
)

DEFAULT_CONTENT_TYPES = {
    "rels": "application/vnd.openxmlformats-package.relationships+xml",
    "xml": "application/xml",
    "png": "image/png",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "gif": "image/gif",
    "emf": "image/x-emf",
    "wmf": "image/x-wmf",
    "bin": "application/vnd.openxmlformats-officedocument.obfuscatedFont",
}


@dataclass
class ContentControl:
    control_id: str
    alias: str | None
    tag: str | None
    text: str
    part: str
    xpath: str | None = None
    script: str | None = None


def load_template(filename: str, data: bytes) -> bytes:
    """Return OPC (.docx) zip bytes from a Word XML or .docx upload."""
    name = filename.lower()
    if name.endswith(".docx"):
        _assert_zip(data)
        return data
    if _looks_like_zip(data):
        return data
    return flat_opc_to_docx_bytes(data)


def extract_document_xml(docx_bytes: bytes) -> bytes:
    with zipfile.ZipFile(io.BytesIO(docx_bytes), "r") as zf:
        return zf.read("word/document.xml")


def list_word_xml_parts(docx_bytes: bytes) -> list[str]:
    parts: list[str] = []
    with zipfile.ZipFile(io.BytesIO(docx_bytes), "r") as zf:
        for name in zf.namelist():
            lower = name.lower()
            if not lower.endswith(".xml"):
                continue
            if lower.startswith("word/") and not lower.endswith(".rels"):
                parts.append(name)
    return parts


def extract_content_controls(docx_bytes: bytes) -> list[ContentControl]:
    controls: list[ContentControl] = []
    with zipfile.ZipFile(io.BytesIO(docx_bytes), "r") as zf:
        for part in list_word_xml_parts(docx_bytes):
            xml_bytes = zf.read(part)
            controls.extend(_controls_from_part(part, xml_bytes))
    return controls


def flat_opc_to_docx_bytes(xml_bytes: bytes) -> bytes:
    parser = etree.XMLParser(huge_tree=True, recover=False)
    root = etree.fromstring(xml_bytes, parser)
    if _local(root.tag) != "package":
        raise ValueError("Template is not a Word Flat OPC package (missing pkg:package)")

    buf = io.BytesIO()
    overrides: list[tuple[str, str]] = []
    extra_defaults: dict[str, str] = dict(DEFAULT_CONTENT_TYPES)

    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for part in root.findall(f"{{{PKG_NS}}}part"):
            name = _pkg_attr(part, "name")
            ctype = _pkg_attr(part, "contentType") or "application/xml"
            if not name:
                continue
            zip_name = name.lstrip("/")
            payload = _part_payload(part)
            if payload is None:
                continue
            zf.writestr(zip_name, payload)
            part_name = name if name.startswith("/") else f"/{name}"
            ext = zip_name.rsplit(".", 1)[-1].lower() if "." in zip_name else ""
            if ext in extra_defaults and extra_defaults[ext] == ctype:
                continue
            if ext and ext not in extra_defaults:
                extra_defaults[ext] = ctype
                continue
            overrides.append((part_name, ctype))
        zf.writestr("[Content_Types].xml", _content_types_xml(extra_defaults, overrides))

    return buf.getvalue()


def replace_part(docx_bytes: bytes, part_name: str, xml_bytes: bytes) -> bytes:
    src = zipfile.ZipFile(io.BytesIO(docx_bytes), "r")
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as dest:
        for item in src.infolist():
            data = xml_bytes if item.filename == part_name else src.read(item.filename)
            dest.writestr(item, data)
    src.close()
    return buf.getvalue()


def _part_payload(part: etree._Element) -> bytes | None:
    xml_data = part.find(f"{{{PKG_NS}}}xmlData")
    binary_data = part.find(f"{{{PKG_NS}}}binaryData")
    if xml_data is not None:
        children = [c for c in xml_data if isinstance(c.tag, str)]
        if not children:
            return None
        return etree.tostring(
            children[0],
            xml_declaration=True,
            encoding="UTF-8",
            standalone=True,
        )
    if binary_data is not None:
        raw = "".join((binary_data.text or "").split())
        if not raw:
            return b""
        return base64.b64decode(raw)
    return None


def _content_types_xml(defaults: dict[str, str], overrides: list[tuple[str, str]]) -> bytes:
    types = etree.Element(f"{{{CT_NS}}}Types", nsmap={None: CT_NS})
    seen_ext: set[str] = set()
    for ext, ctype in defaults.items():
        if ext in seen_ext:
            continue
        seen_ext.add(ext)
        el = etree.SubElement(types, f"{{{CT_NS}}}Default")
        el.set("Extension", ext)
        el.set("ContentType", ctype)
    seen_parts: set[str] = set()
    for part_name, ctype in overrides:
        if part_name in seen_parts:
            continue
        seen_parts.add(part_name)
        el = etree.SubElement(types, f"{{{CT_NS}}}Override")
        el.set("PartName", part_name)
        el.set("ContentType", ctype)
    return etree.tostring(types, xml_declaration=True, encoding="UTF-8", standalone=True)


def _controls_from_part(part: str, xml_bytes: bytes) -> list[ContentControl]:
    parser = etree.XMLParser(huge_tree=True)
    root = etree.fromstring(xml_bytes, parser)
    controls: list[ContentControl] = []
    for index, sdt in enumerate(root.findall(f".//{{{W_NS}}}sdt"), start=1):
        sdt_pr = sdt.find(f"{{{W_NS}}}sdtPr")
        alias = _attr(sdt_pr, "alias") if sdt_pr is not None else None
        tag = _attr(sdt_pr, "tag") if sdt_pr is not None else None
        ident = _attr(sdt_pr, "id") if sdt_pr is not None else None
        text = _sdt_text(sdt)
        binding = parse_idm_binding(alias, tag)
        control_id = ident or f"{part}:{index}"
        controls.append(
            ContentControl(
                control_id=str(control_id),
                alias=alias,
                tag=tag,
                text=text,
                part=part,
                xpath=binding.get("xpath"),
                script=binding.get("script"),
            )
        )
    return controls


def parse_idm_binding(alias: str | None, tag: str | None) -> dict[str, str | None]:
    """Read Infor IDM content-control metadata stored as JSON in alias/tag."""
    merged: dict = {}
    for raw in (tag, alias):
        data = _maybe_json(raw)
        if data:
            merged.update(data)
        elif raw and raw.strip().startswith("/"):
            merged["xpath"] = raw.strip()
    xpath = merged.get("xpath")
    script = merged.get("script")
    if isinstance(script, str) and not script.strip():
        script = None
    return {
        "xpath": xpath.strip() if isinstance(xpath, str) and xpath.strip() else None,
        "script": script if isinstance(script, str) else None,
    }


def _maybe_json(raw: str | None) -> dict | None:
    if not raw:
        return None
    text = raw.strip()
    if not text.startswith("{"):
        return None
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def _pkg_attr(part: etree._Element, local: str) -> str | None:
    return part.get(f"{{{PKG_NS}}}{local}") or part.get(local)


def _sdt_text(sdt: etree._Element) -> str:
    texts = [el.text or "" for el in sdt.findall(f".//{{{W_NS}}}t")]
    return "".join(texts).strip()


def _attr(sdt_pr: etree._Element, local: str) -> str | None:
    el = sdt_pr.find(f"{{{W_NS}}}{local}")
    if el is None:
        return None
    value = el.get(f"{{{W_NS}}}val")
    return value if value else None


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1] if "}" in tag else tag


def _looks_like_zip(data: bytes) -> bool:
    return data[:2] == b"PK"


def _assert_zip(data: bytes) -> None:
    if not _looks_like_zip(data):
        raise ValueError("File does not look like a .docx zip package")
    zipfile.ZipFile(io.BytesIO(data), "r").close()
