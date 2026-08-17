"""In-memory session for the current structure XML and Word template."""

from __future__ import annotations

from dataclasses import dataclass

from lxml import etree

from app.models import DocumentState
from app.services.mapper import map_controls_to_fields
from app.services.structure_parser import flatten_leaves, parse_structure_xml, structure_to_bytes
from app.services.template_parser import extract_content_controls, load_template


@dataclass
class SessionData:
    structure_xml: bytes
    template_docx: bytes
    structure_name: str
    template_name: str
    previous_xml: bytes | None = None


class SessionStore:
    def __init__(self) -> None:
        self._data: SessionData | None = None

    def loaded(self) -> bool:
        return self._data is not None

    def clear(self) -> None:
        self._data = None

    def load(self, structure_name: str, structure_xml: bytes, template_name: str, template_bytes: bytes) -> DocumentState:
        parse_structure_xml(structure_xml)
        docx = load_template(template_name, template_bytes)
        extract_content_controls(docx)
        self._data = SessionData(
            structure_xml=structure_xml,
            template_docx=docx,
            structure_name=structure_name,
            template_name=template_name,
            previous_xml=None,
        )
        return self.document_state()

    def require(self) -> SessionData:
        if self._data is None:
            raise RuntimeError("No document loaded")
        return self._data

    def snapshot(self) -> None:
        data = self.require()
        data.previous_xml = data.structure_xml

    def undo(self) -> DocumentState:
        data = self.require()
        if data.previous_xml is None:
            raise RuntimeError("Nothing to undo")
        current = data.structure_xml
        data.structure_xml = data.previous_xml
        data.previous_xml = current
        return self.document_state()

    def set_structure_xml(self, xml_bytes: bytes, *, keep_undo: bool = True) -> None:
        data = self.require()
        parse_structure_xml(xml_bytes)
        if keep_undo:
            data.previous_xml = data.structure_xml
        data.structure_xml = xml_bytes

    def structure_root(self) -> etree._Element:
        root, _ = parse_structure_xml(self.require().structure_xml)
        return root

    def save_root(self, root: etree._Element, *, keep_undo: bool = True) -> None:
        self.set_structure_xml(structure_to_bytes(root), keep_undo=keep_undo)

    def document_state(self) -> DocumentState:
        data = self.require()
        root, tree = parse_structure_xml(data.structure_xml)
        raw_controls = extract_content_controls(data.template_docx)
        mapping = map_controls_to_fields(tree, raw_controls, root)
        leaves = flatten_leaves(tree)
        return DocumentState(
            structure_name=data.structure_name,
            template_name=data.template_name,
            tree=tree,
            controls=mapping.controls,
            mapped_count=mapping.mapped_count,
            unmapped_control_count=mapping.unmapped_control_count,
            unmapped_field_count=mapping.unmapped_field_count,
            leaf_count=len(leaves),
            can_undo=data.previous_xml is not None,
        )


session_store = SessionStore()
