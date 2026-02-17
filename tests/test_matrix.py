"""Matrix test coverage for config x manifest expectations."""

from __future__ import annotations

import json
from pathlib import Path

from kya_validator import validate_manifest_json_with_config

BASE_DIR = Path(__file__).resolve().parent
FIXTURES_DIR = BASE_DIR / "fixtures"
STANDARD_DIR = BASE_DIR.parent.parent / "kya-standard"
MINIMAL_PATH = STANDARD_DIR / "examples" / "02-minimal.json"
FULL_PATH = STANDARD_DIR / "examples" / "01-full.json"


def _load_json(name: str):
    return json.loads((FIXTURES_DIR / name).read_text(encoding="utf-8"))


def _merge_manifest(entry: dict) -> dict:
    base = (
        _load_json("_minimal.json") if entry.get("base") == "minimal" else _load_json("_full.json")
    )
    merged = json.loads(json.dumps(base))
    for pointer in entry["manifest"].get("remove", []):
        _remove_pointer(merged, pointer)
    manifest_data = {key: value for key, value in entry["manifest"].items() if key != "remove"}
    merged.update(manifest_data)
    return merged


def _remove_pointer(payload: dict, pointer: str) -> None:
    if not pointer.startswith("/"):
        return
    parts = [part.replace("~1", "/").replace("~0", "~") for part in pointer.strip("/").split("/")]
    target = payload
    for part in parts[:-1]:
        if not isinstance(target, dict):
            return
        target = target.get(part)
        if target is None:
            return
    if isinstance(target, dict):
        target.pop(parts[-1], None)


def test_matrix_expectations():
    configs = _load_json("configs.json")
    manifests = _load_json("manifests.json")
    _minimal = json.loads(MINIMAL_PATH.read_text(encoding="utf-8"))
    _full = json.loads(FULL_PATH.read_text(encoding="utf-8"))
    (FIXTURES_DIR / "_minimal.json").write_text(json.dumps(_minimal, indent=2), encoding="utf-8")
    (FIXTURES_DIR / "_full.json").write_text(json.dumps(_full, indent=2), encoding="utf-8")
    expectations = _load_json("expectations.json")

    case_count = 0
    for config_entry in configs:
        cfg_id = config_entry["id"]
        config = config_entry["config"]
        assert cfg_id in expectations
        for manifest_entry in manifests:
            manifest_id = manifest_entry["id"]
            manifest = _merge_manifest(manifest_entry)
            result = json.loads(
                validate_manifest_json_with_config(
                    json.dumps(manifest),
                    json.dumps(config),
                )
            )
            expected = expectations[cfg_id][manifest_id]
            assert result["schemaValid"] == expected["schema"]
            assert result["ttlValid"] == expected["ttl"]
            assert result["inspectorValid"] == expected["inspector"]
            assert result["cryptoValid"] == expected["crypto"]
            assert result["policyValid"] == expected["policy"]
            case_count += 1

    assert case_count == 200
