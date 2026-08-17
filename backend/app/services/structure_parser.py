"""Parse Infor M3 M3OutDocument XML into a labeled field tree with stable xpaths."""

from __future__ import annotations

from lxml import etree

from app.models import FieldNode


def parse_structure_xml(xml_bytes: bytes) -> tuple[etree._Element, FieldNode]:
    parser = etree.XMLParser(remove_blank_text=False, huge_tree=True)
    root = etree.fromstring(xml_bytes, parser)
    if root.tag != "M3OutDocument":
        raise ValueError(f"Expected root element M3OutDocument, got {root.tag}")
    tree = _element_to_node(root, parent_path="", sibling_names=_sibling_name_counts(root))
    return root, tree


def parse_structure_tree(xml_bytes: bytes) -> FieldNode:
    _, tree = parse_structure_xml(xml_bytes)
    return tree


def structure_to_bytes(root: etree._Element) -> bytes:
    return etree.tostring(
        root,
        xml_declaration=True,
        encoding="UTF-8",
        pretty_print=True,
    )


def flatten_leaves(node: FieldNode) -> list[FieldNode]:
    if node.is_leaf:
        return [node]
    leaves: list[FieldNode] = []
    for child in node.children:
        leaves.extend(flatten_leaves(child))
    return leaves


def find_node(node: FieldNode, xpath: str) -> FieldNode | None:
    if node.xpath == xpath:
        return node
    for child in node.children:
        found = find_node(child, xpath)
        if found is not None:
            return found
    return None


def apply_value(root: etree._Element, xpath: str, value: str) -> None:
    if "/@" in xpath.rsplit("/", 1)[-1] or xpath.rsplit("/", 1)[-1].startswith("@"):
        _set_attribute(root, xpath, value)
        return
    matches = root.xpath(xpath)
    if not matches:
        raise ValueError(f"XPath did not match any node: {xpath}")
    if len(matches) > 1:
        raise ValueError(f"XPath matched {len(matches)} nodes; expected 1: {xpath}")
    element = matches[0]
    if not isinstance(element, etree._Element):
        raise ValueError(f"XPath did not resolve to an element: {xpath}")
    _set_leaf_text(element, value)


def resolve_xpath_value(root: etree._Element, xpath: str) -> str | None:
    try:
        results = root.xpath(xpath)
    except etree.XPathEvalError:
        return None
    if not results:
        return None
    item = results[0]
    if isinstance(item, etree._Element):
        text = item.text or ""
        return text.strip() if text.strip() else text
    return str(item)


def _set_attribute(root: etree._Element, xpath: str, value: str) -> None:
    element_path, attr = xpath.rsplit("/@", 1)
    matches = root.xpath(element_path)
    if not matches:
        raise ValueError(f"XPath did not match any node: {xpath}")
    element = matches[0]
    if not isinstance(element, etree._Element):
        raise ValueError(f"XPath did not resolve to an element: {xpath}")
    element.set(attr, value)


def _set_leaf_text(element: etree._Element, value: str) -> None:
    element.text = value
    for child in list(element):
        if child.tag is etree.Comment:
            continue
        if len(child) == 0 and not child.attrib and not (child.text or "").strip():
            element.remove(child)


def _local(tag: str) -> str:
    if "}" in tag:
        return tag.rsplit("}", 1)[-1]
    return tag


def _sibling_name_counts(element: etree._Element) -> dict[str, int]:
    counts: dict[str, int] = {}
    for child in element:
        if not isinstance(child.tag, str):
            continue
        name = _local(child.tag)
        counts[name] = counts.get(name, 0) + 1
    return counts


def _escape_attr(value: str) -> str:
    return value.replace('"', '\\"')


def _predicate_for(element: etree._Element, name: str, occurrence: int, name_count: int) -> str:
    type_attr = element.get("Type")
    if type_attr:
        return f'[@Type="{_escape_attr(type_attr)}"]'
    kfld = element.get("KFLD")
    if kfld and name_count > 1:
        return f'[@KFLD="{_escape_attr(kfld)}"]'
    label = element.get("Label")
    if label and name_count > 1:
        return f'[@Label="{_escape_attr(label)}"]'
    if name_count > 1:
        return f"[{occurrence}]"
    return ""


def _is_leaf(element: etree._Element) -> bool:
    element_children = [c for c in element if isinstance(c.tag, str)]
    if element_children:
        return False
    return True


def _element_to_node(element: etree._Element, parent_path: str, sibling_names: dict[str, int]) -> FieldNode:
    name = _local(element.tag)
    occurrence = 1
    parent = element.getparent()
    if parent is not None:
        occurrence = 0
        for sibling in parent:
            if isinstance(sibling.tag, str) and _local(sibling.tag) == name:
                occurrence += 1
                if sibling is element:
                    break
    predicate = ""
    if parent_path:
        predicate = _predicate_for(element, name, occurrence, sibling_names.get(name, 1))
    xpath = f"{parent_path}/{name}{predicate}" if parent_path else f"/{name}"

    attributes = {k: v for k, v in element.attrib.items()}
    label = element.get("Label")
    children_nodes: list[FieldNode] = []
    child_counts = _sibling_name_counts(element)

    for child in element:
        if not isinstance(child.tag, str):
            continue
        children_nodes.append(_element_to_node(child, xpath, child_counts))

    leaf = _is_leaf(element)
    value = None
    if leaf:
        value = (element.text or "").strip()
        if not value and element.text:
            value = element.text

    return FieldNode(
        xpath=xpath,
        name=name,
        label=label,
        value=value if leaf else None,
        is_leaf=leaf,
        attributes=attributes,
        children=children_nodes,
    )
