"""Map Word content controls to M3OutDocument fields via IDM XPath bindings."""

from __future__ import annotations

import re

from lxml import etree

from app.models import ContentControlInfo, FieldNode
from app.services.structure_parser import flatten_leaves, resolve_xpath_value
from app.services.template_parser import ContentControl

_PREDICATE_RE = re.compile(r"\[.*?\]")


class MappingResult:
    def __init__(
        self,
        controls: list[ContentControlInfo],
        mapped_count: int,
        unmapped_control_count: int,
        unmapped_field_count: int,
    ) -> None:
        self.controls = controls
        self.mapped_count = mapped_count
        self.unmapped_control_count = unmapped_control_count
        self.unmapped_field_count = unmapped_field_count


def map_controls_to_fields(
    tree: FieldNode,
    controls: list[ContentControl],
    root: etree._Element | None = None,
) -> MappingResult:
    leaves = flatten_leaves(tree)
    used_xpaths: set[str] = set()
    mapped: list[ContentControlInfo] = []

    for control in controls:
        field = _best_field(control, leaves, used_xpaths)
        binding_xpath = control.xpath
        if field is not None:
            used_xpaths.add(field.xpath)
            field.mapped = True
        resolved = False
        if root is not None and binding_xpath:
            resolved = resolve_xpath_value(root, binding_xpath) is not None
        info = ContentControlInfo(
            control_id=control.control_id,
            alias=_display_alias(control),
            tag=control.tag if control.tag and not str(control.tag).startswith("{") else None,
            text=control.text,
            part=control.part,
            xpath=binding_xpath,
            script=control.script,
            mapped_xpath=field.xpath if field else binding_xpath,
            mapped_name=field.name if field else _xpath_tail(binding_xpath),
            resolved=resolved or field is not None,
        )
        mapped.append(info)

    mapped_count = sum(1 for item in mapped if item.xpath)
    return MappingResult(
        controls=mapped,
        mapped_count=mapped_count,
        unmapped_control_count=sum(1 for item in mapped if not item.xpath),
        unmapped_field_count=sum(1 for leaf in leaves if not leaf.mapped),
    )


def _best_field(
    control: ContentControl,
    leaves: list[FieldNode],
    used_xpaths: set[str],
) -> FieldNode | None:
    available = [leaf for leaf in leaves if leaf.xpath not in used_xpaths]
    binding = control.xpath
    if binding:
        element_path = _element_path(binding)
        exact = [leaf for leaf in available if leaf.xpath == element_path]
        if len(exact) == 1:
            return exact[0]
        stripped = _strip_predicates(element_path)
        relaxed = [leaf for leaf in available if _strip_predicates(leaf.xpath) == stripped]
        if len(relaxed) == 1:
            return relaxed[0]
        tail = _xpath_tail(element_path)
        named = [leaf for leaf in available if leaf.name == tail]
        if len(named) == 1:
            return named[0]
    return _fallback_name_match(control, available)


def _fallback_name_match(control: ContentControl, available: list[FieldNode]) -> FieldNode | None:
    keys = {key for key in (control.alias, control.tag) if key and not str(key).startswith("{")}
    if not keys:
        return None
    hits = [leaf for leaf in available if leaf.name in keys or (leaf.label or "") in keys]
    return hits[0] if len(hits) == 1 else None


def _element_path(xpath: str) -> str:
    if "/@" in xpath:
        return xpath.rsplit("/@", 1)[0]
    return xpath


def _xpath_tail(xpath: str | None) -> str | None:
    if not xpath:
        return None
    tail = _element_path(xpath).rstrip("/").split("/")[-1]
    return _PREDICATE_RE.sub("", tail) or None


def _strip_predicates(xpath: str) -> str:
    return _PREDICATE_RE.sub("", xpath)


def _display_alias(control: ContentControl) -> str | None:
    if control.xpath:
        return control.xpath
    if control.alias and not control.alias.startswith("{"):
        return control.alias
    return None
