"""Fill Word content controls with values from the M3 structure XML."""

from __future__ import annotations

import io
import zipfile

from lxml import etree

from app.models import ContentControlInfo
from app.services.structure_parser import resolve_xpath_value
from app.services.template_parser import W_NS, list_word_xml_parts


def merge_docx(
    docx_bytes: bytes,
    structure_xml: bytes,
    controls: list[ContentControlInfo],
) -> bytes:
    root = etree.fromstring(structure_xml, etree.XMLParser(huge_tree=True))
    values_by_id = _control_values(root, controls)
    if not values_by_id:
        return docx_bytes

    src = zipfile.ZipFile(io.BytesIO(docx_bytes), "r")
    buf = io.BytesIO()
    parts = set(list_word_xml_parts(docx_bytes))
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as dest:
        for item in src.infolist():
            data = src.read(item.filename)
            if item.filename in parts:
                data = _fill_part(item.filename, data, values_by_id)
            dest.writestr(item, data)
    src.close()
    return buf.getvalue()


def _control_values(root: etree._Element, controls: list[ContentControlInfo]) -> dict[str, str]:
    values: dict[str, str] = {}
    for control in controls:
        xpath = control.xpath
        if not xpath:
            continue
        value = resolve_xpath_value(root, xpath)
        if value is None:
            continue
        values[control.control_id] = value
        if control.xpath:
            values[f"xpath:{control.xpath}"] = value
    return values


def _fill_part(part_name: str, xml_bytes: bytes, values_by_id: dict[str, str]) -> bytes:
    parser = etree.XMLParser(huge_tree=True)
    root = etree.fromstring(xml_bytes, parser)
    for index, sdt in enumerate(root.findall(f".//{{{W_NS}}}sdt"), start=1):
        sdt_pr = sdt.find(f"{{{W_NS}}}sdtPr")
        ident = _attr(sdt_pr, "id")
        alias = _attr(sdt_pr, "alias")
        keys = [
            ident,
            f"{part_name}:{index}",
        ]
        xpath = _binding_xpath(alias)
        if xpath:
            keys.append(f"xpath:{xpath}")
        value = next((values_by_id[k] for k in keys if k and k in values_by_id), None)
        if value is None:
            continue
        _set_sdt_text(sdt, value)
    return etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)


def _binding_xpath(alias: str | None) -> str | None:
    if not alias:
        return None
    from app.services.template_parser import parse_idm_binding

    return parse_idm_binding(alias, None).get("xpath")


def _set_sdt_text(sdt: etree._Element, value: str) -> None:
    text_nodes = sdt.findall(f".//{{{W_NS}}}t")
    if not text_nodes:
        content = sdt.find(f"{{{W_NS}}}sdtContent")
        if content is None:
            content = etree.SubElement(sdt, f"{{{W_NS}}}sdtContent")
        run = etree.SubElement(content, f"{{{W_NS}}}r")
        text_el = etree.SubElement(run, f"{{{W_NS}}}t")
        _write_text(text_el, value)
        return
    _write_text(text_nodes[0], value)
    for extra in text_nodes[1:]:
        extra.text = ""


def _write_text(text_el: etree._Element, value: str) -> None:
    text_el.text = value
    if value.startswith(" ") or value.endswith(" "):
        text_el.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")


def _attr(sdt_pr: etree._Element | None, local: str) -> str | None:
    if sdt_pr is None:
        return None
    el = sdt_pr.find(f"{{{W_NS}}}{local}")
    if el is None:
        return None
    return el.get(f"{{{W_NS}}}val")
