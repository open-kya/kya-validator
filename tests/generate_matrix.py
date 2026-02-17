"""Generate config x manifest expectation matrix for docs/tests."""

from __future__ import annotations

import json
from pathlib import Path

from kya_validator import validate_manifest_json_with_config

BASE_DIR = Path(__file__).resolve().parent
FIXTURES_DIR = BASE_DIR / "fixtures"
STANDARD_DIR = BASE_DIR.parent.parent / "kya-standard"
MINIMAL_PATH = STANDARD_DIR / "examples" / "02-minimal.json"
FULL_PATH = STANDARD_DIR / "examples" / "01-full.json"


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def ensure_manifest_defaults(manifest: dict, base: dict) -> dict:
    merged = json.loads(json.dumps(base))
    for pointer in manifest.get("remove", []):
        remove_pointer(merged, pointer)
    manifest_data = {key: value for key, value in manifest.items() if key != "remove"}
    merged.update(manifest_data)
    return merged


def remove_pointer(payload: dict, pointer: str) -> None:
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


def load_manifests() -> list[dict]:
    manifests = load_json(FIXTURES_DIR / "manifests.json")
    minimal = load_json(MINIMAL_PATH)
    full = load_json(FULL_PATH)
    for entry in manifests:
        template = minimal if entry.get("base") == "minimal" else full
        entry["manifest"] = ensure_manifest_defaults(entry["manifest"], template)
    return manifests


def main() -> None:
    configs = load_json(FIXTURES_DIR / "configs.json")
    manifests = load_manifests()

    expectation_matrix: dict[str, dict[str, dict[str, bool]]] = {}

    for config_entry in configs:
        cfg_id = config_entry["id"]
        config = config_entry["config"]
        expectation_matrix[cfg_id] = {}
        for manifest_entry in manifests:
            manifest_id = manifest_entry["id"]
            manifest = manifest_entry["manifest"]
            result = json.loads(
                validate_manifest_json_with_config(
                    json.dumps(manifest),
                    json.dumps(config),
                )
            )
            expectation_matrix[cfg_id][manifest_id] = {
                "schema": result["schemaValid"],
                "ttl": result["ttlValid"],
                "inspector": result["inspectorValid"],
                "crypto": result["cryptoValid"],
                "policy": result["policyValid"],
                "overall": all(
                    [
                        result["schemaValid"],
                        result["ttlValid"],
                        result["inspectorValid"],
                        result["cryptoValid"],
                        result["policyValid"],
                    ]
                ),
            }

    (FIXTURES_DIR / "expectations.json").write_text(
        json.dumps(expectation_matrix, indent=2, sort_keys=True),
        encoding="utf-8",
    )

    manifest_labels = {entry["id"]: f"{entry['id']} ({entry['name']})" for entry in manifests}
    config_labels = {entry["id"]: f"{entry['id']} ({entry['name']})" for entry in configs}

    header = "| Config \\ Manifest | " + " | ".join(manifest_labels.keys()) + " |"
    separator = "|" + "---|" * (len(manifest_labels) + 1)
    rows = [header, separator]

    def format_cell(result: dict[str, bool]) -> str:
        symbols = {
            "schema": "S",
            "ttl": "T",
            "inspector": "I",
            "crypto": "C",
            "policy": "P",
        }
        return "".join(
            f"{symbols[key]}{'✓' if result[key] else '✗'}"
            for key in ["schema", "ttl", "inspector", "crypto", "policy"]
        )

    for cfg_id in config_labels:
        cells = [config_labels[cfg_id]]
        for manifest_id in manifest_labels:
            cells.append(format_cell(expectation_matrix[cfg_id][manifest_id]))
        rows.append("| " + " | ".join(cells) + " |")

    matrix_md = "\n".join(
        [
            "# Client Config x Manifest Matrix",
            "",
            "Legend: S=Schema, T=TTL, I=Inspector, C=Crypto, P=Policy. ✓=pass, ✗=fail.",
            "",
            "## Manifests",
        ]
        + [f"- {label}" for label in manifest_labels.values()]
        + ["", "## Configs"]
        + [f"- {label}" for label in config_labels.values()]
        + ["", "## Matrix", ""]
        + rows
    )

    (BASE_DIR.parent / "CLIENT_MATRIX.md").write_text(
        matrix_md,
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
