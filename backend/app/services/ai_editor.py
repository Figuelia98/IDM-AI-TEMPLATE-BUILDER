"""Natural-language edits applied as xpath patches on M3OutDocument XML."""

from __future__ import annotations

import json
import logging
import os
import re
from pathlib import Path
from typing import Any

from openai import OpenAI

from app.models import FieldNode, FieldPatch
from app.rules import ChatMode, get_system_prompt
from app.services.structure_parser import flatten_leaves

logger = logging.getLogger(__name__)

DEFAULT_MODEL = "gpt-4o-mini"
ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
MAX_FIELDS = 180


def openai_configured() -> bool:
    return bool(os.getenv("OPENAI_API_KEY", "").strip())


def get_openai_model() -> str:
    return os.getenv("OPENAI_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL


def get_openai_status() -> dict[str, Any]:
    key_configured = openai_configured()
    env_file_found = ENV_PATH.is_file()
    model = get_openai_model() if key_configured else None
    if key_configured:
        reason = "API key configured"
        enabled = True
    elif env_file_found:
        reason = "OPENAI_API_KEY not set in backend/.env"
        enabled = False
    else:
        reason = "backend/.env not found; set OPENAI_API_KEY environment variable"
        enabled = False
    return {
        "enabled": enabled,
        "reason": reason,
        "model": model,
        "key_configured": key_configured,
        "env_file_found": env_file_found,
    }


def propose_patches(
    tree: FieldNode,
    instruction: str,
    mode: ChatMode = "agent",
    use_rules: bool = True,
    extra_fields: list[dict[str, str | None]] | None = None,
) -> tuple[str, list[FieldPatch]]:
    """Generate patches for template edits using AI.
    
    Args:
        tree: Field tree structure
        instruction: User's natural language instruction
        mode: Chat mode (ask, agent, plan, debug)
        use_rules: Whether to apply AI rules (True = use rules, False = skip rules)
        extra_fields: Additional fields to include in inventory
        
    Returns:
        Tuple of (summary, patches)
    """
    instruction = (instruction or "").strip()
    if not instruction:
        raise ValueError("Instruction is empty")
    inventory = _inventory(tree, extra_fields)
    if not openai_configured():
        return _heuristic_patches(inventory, instruction)

    system_prompt = get_system_prompt(mode, use_rules)
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", "").strip())
    payload = {
        "mode": mode,
        "useRules": use_rules,
        "instruction": instruction,
        "fields": inventory,
    }
    response = client.chat.completions.create(
        model=get_openai_model(),
        temperature=0.1,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
        ],
    )
    content = (response.choices[0].message.content or "").strip()
    parsed = _parse_json(content)
    summary = str(parsed.get("summary") or "Applied AI edits.")
    raw_patches = parsed.get("patches") or []
    allowed = {item["xpath"] for item in inventory}
    patches: list[FieldPatch] = []
    for item in raw_patches:
        if not isinstance(item, dict):
            continue
        xpath = str(item.get("xpath") or "").strip()
        if xpath not in allowed:
            continue
        if "value" not in item:
            continue
        patches.append(FieldPatch(xpath=xpath, value=str(item.get("value") or "")))
    return summary, patches


def _inventory(
    tree: FieldNode,
    extra_fields: list[dict[str, str | None]] | None = None,
) -> list[dict[str, str | None]]:
    leaves = flatten_leaves(tree)
    preferred = [leaf for leaf in leaves if _is_preferred(leaf)]
    rest = [leaf for leaf in leaves if leaf not in preferred]
    selected = (preferred + rest)[:MAX_FIELDS]
    inventory = [
        {
            "xpath": leaf.xpath,
            "name": leaf.name,
            "label": leaf.label,
            "value": leaf.value,
        }
        for leaf in selected
    ]
    seen = {item["xpath"] for item in inventory}
    for item in extra_fields or []:
        xpath = item.get("xpath")
        if not xpath or xpath in seen:
            continue
        inventory.append(
            {
                "xpath": xpath,
                "name": item.get("name"),
                "label": item.get("label"),
                "value": item.get("value"),
            }
        )
        seen.add(xpath)
        if len(inventory) >= MAX_FIELDS + 40:
            break
    return inventory


def _is_preferred(leaf: FieldNode) -> bool:
    path = leaf.xpath
    if "/Media/" in path or "/Printer" in path:
        return False
    if "/AddressFormatRules" in path:
        return False
    if "/Formatting/" in path:
        return False
    return True


def _parse_json(content: str) -> dict[str, Any]:
    try:
        data = json.loads(content)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", content, re.DOTALL)
    if match:
        data = json.loads(match.group(0))
        if isinstance(data, dict):
            return data
    raise ValueError("AI response was not valid JSON")


def _heuristic_patches(inventory: list[dict[str, str | None]], instruction: str) -> tuple[str, list[FieldPatch]]:
    """Offline fallback: 'set <label or name> to <value>'."""
    match = re.search(
        r"(?:set|change|update)\s+(.+?)\s+(?:to|into|=)\s+(.+)$",
        instruction,
        re.IGNORECASE,
    )
    if not match:
        raise RuntimeError(
            "OpenAI is not configured. Set OPENAI_API_KEY in backend/.env, "
            "or use: set <field> to <value>"
        )
    target = match.group(1).strip().strip("\"'")
    value = match.group(2).strip().strip("\"'")
    target_norm = _norm(target)
    hits = []
    for item in inventory:
        names = [_norm(item.get("name")), _norm(item.get("label"))]
        if target_norm in names or any(target_norm and n and target_norm in n for n in names):
            hits.append(item)
    if not hits:
        raise ValueError(f"No field matched '{target}'")
    if len(hits) > 3:
        hits = hits[:3]
    patches = [FieldPatch(xpath=str(item["xpath"]), value=value) for item in hits]
    labels = ", ".join((item.get("label") or item.get("name") or "") for item in hits)
    return f"Updated {labels} (OpenAI key not configured; used local parser).", patches


def _norm(value: str | None) -> str:
    return re.sub(r"[^a-z0-9]+", "", (value or "").lower())
