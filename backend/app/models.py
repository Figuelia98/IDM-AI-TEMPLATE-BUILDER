from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class FieldNode(BaseModel):
    xpath: str
    name: str
    label: str | None = None
    value: str | None = None
    is_leaf: bool = False
    attributes: dict[str, str] = Field(default_factory=dict)
    mapped: bool = False
    children: list[FieldNode] = Field(default_factory=list)


class ContentControlInfo(BaseModel):
    control_id: str
    alias: str | None = None
    tag: str | None = None
    text: str = ""
    part: str
    xpath: str | None = None
    script: str | None = None
    mapped_xpath: str | None = None
    mapped_name: str | None = None
    resolved: bool = False


class DocumentState(BaseModel):
    structure_name: str
    template_name: str
    tree: FieldNode
    controls: list[ContentControlInfo]
    mapped_count: int
    unmapped_control_count: int
    unmapped_field_count: int
    leaf_count: int
    can_undo: bool = False


class HealthResponse(BaseModel):
    status: str
    document_loaded: bool
    openai: dict


class FieldPatch(BaseModel):
    xpath: str
    value: str


class FieldUpdateRequest(BaseModel):
    xpath: str
    value: str


class AiEditRequest(BaseModel):
    instruction: str
    mode: Literal["ask", "agent", "plan", "debug"] = "agent"
    useRules: bool = True


class AiEditResponse(BaseModel):
    summary: str
    patches: list[FieldPatch]
    document: DocumentState
