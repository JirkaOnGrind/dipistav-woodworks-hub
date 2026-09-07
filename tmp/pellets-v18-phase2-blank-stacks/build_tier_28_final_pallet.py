from __future__ import annotations

import hashlib
import importlib.util
import json
import os
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
WORK_ROOT = ROOT / "tmp" / "pellets-v18-phase2-blank-stacks"
LOCKED_ROOT = ROOT / "artwork-sources" / "pellets"
LOCKED_TIER24 = LOCKED_ROOT / "pellets-blank-24-master-v18.png"
LOCKED_TIER24_LOCK = LOCKED_ROOT / "pellets-blank-24-master-v18.lock.json"
MODULE_4 = WORK_ROOT / "state-20" / "source" / "pellets-blank-04-coplanar-unit-candidate-a-v18.png"
TIER20_MANIFEST = (
    WORK_ROOT
    / "state-20"
    / "candidates"
    / "masters"
    / "pellets-blank-20-master-candidate-a-v18.manifest.json"
)

VERIFY_RUN = os.environ.get("DIPISTAV_VERIFY_RUN") == "1"
QUANTITY = 28
LAYERS = 7
BAGS_PER_LAYER = 4
CANVAS = (2560, 2048)
EXPECTED_MODULE_SIZE = (1948, 861)

gravity_spec = importlib.util.spec_from_file_location(
    "uniform_gravity", WORK_ROOT / "build_tier_30_40_60_uniform_gravity.py"
)
gravity = importlib.util.module_from_spec(gravity_spec)
assert gravity_spec.loader is not None
gravity_spec.loader.exec_module(gravity)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def abandon_extreme_tiers() -> None:
    for quantity in (30, 40, 60):
        master_root = WORK_ROOT / f"state-{quantity:02d}" / "candidates" / "masters"
        for candidate in ("a", "b"):
            path = master_root / f"pellets-blank-{quantity:02d}-master-candidate-{candidate}-v18.manifest.json"
            if not path.exists():
                continue
            manifest = json.loads(path.read_text(encoding="utf-8"))
            manifest["approvalStatus"] = "abandoned-by-user"
            manifest["abandonmentReason"] = "extreme-height grid integrity abandoned in favor of final 28-bag 7x4 pallet block"
            manifest["supersededByCandidate"] = "pellets-blank-28-master-candidate-a-v18"
            path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def verify_sources() -> dict[str, str]:
    lock = json.loads(LOCKED_TIER24_LOCK.read_text(encoding="utf-8"))
    tier24_hash = sha256(LOCKED_TIER24)
    if tier24_hash != lock["png"]["sha256"]:
        raise ValueError("Locked Tier 24 PNG hash mismatch")
    tier20_manifest = json.loads(TIER20_MANIFEST.read_text(encoding="utf-8"))
    module_hash = sha256(MODULE_4)
    if module_hash != tier20_manifest["fourBagModuleSha256"]:
        raise ValueError("Approved four-bag module hash mismatch")
    return {"tier24PngSha256": tier24_hash, "fourBagModuleSha256": module_hash}


def main() -> None:
    for required in (LOCKED_TIER24, LOCKED_TIER24_LOCK, MODULE_4, TIER20_MANIFEST):
        if not required.exists():
            raise FileNotFoundError(required)
    source_hashes = verify_sources()
    if not VERIFY_RUN:
        abandon_extreme_tiers()

    module = Image.open(MODULE_4).convert("RGBA")
    if module.size != EXPECTED_MODULE_SIZE:
        raise ValueError(f"Four-bag module size drifted: {module.size}")
    config = {"layers": LAYERS, "bags_per_layer": BAGS_PER_LAYER, "canvas": CANVAS}
    master, placements, shadow_pixels = gravity.build_stack(module, QUANTITY, config)
    report = gravity.validate(master, module, QUANTITY, config, placements, shadow_pixels)
    if report["status"] != "pass":
        raise ValueError(json.dumps(report, indent=2))

    state_root = WORK_ROOT / "state-28"
    run_root = state_root / ("determinism-verify" if VERIFY_RUN else "candidates")
    master_root = run_root / "masters"
    qa_root = run_root / "qa"
    stem = "pellets-blank-28-master-candidate-a-v18"
    png_path = master_root / f"{stem}.png"
    webp_path = master_root / f"{stem}.webp"
    manifest_path = master_root / f"{stem}.manifest.json"

    master_root.mkdir(parents=True, exist_ok=True)
    master.save(png_path, format="PNG", optimize=True)
    gravity.base.save_webp(master, webp_path)
    gravity.base.save_qa(master, qa_root, stem.replace("-master", ""), report)

    layer_hash = hashlib.sha256(module.tobytes()).hexdigest()
    manifest = {
        "candidateId": stem,
        "tier": QUANTITY,
        "quantity": QUANTITY,
        "approvalStatus": "awaiting-visual-approval",
        "runtimeActive": False,
        "replacesAbandonedTiers": [30, 40, 60],
        "brandingPolicy": "zero-branding-all-surfaces",
        "compositionMode": "7-byte-identical-approved-four-bag-layers-with-tight-contact-occlusion",
        "geometry": {
            "layers": LAYERS,
            "bagsPerLayer": BAGS_PER_LAYER,
            "bagCount": QUANTITY,
            "uniformCellWidthPixels": gravity.CELL_WIDTH,
            "uniformCellWidthsPixels": [gravity.CELL_WIDTH] * BAGS_PER_LAYER,
            "alignment": "direct-vertical-compressed-contact",
            "zStepPixels": gravity.Z_STEP,
        },
        "cameraLock": {
            "projection": "orthographic",
            "azimuthDegrees": 40,
            "elevationDegrees": 27,
            "zoomFactor": 1.0,
        },
        "scaleLock": {"instanceScalePercent": 100, "zoomOutAllowed": False, "canvasExpanded": True},
        "gravityTreatment": {
            "contactOffsetPixels": gravity.CONTACT_OFFSET,
            "contactBlurPixels": gravity.CONTACT_BLUR,
            "contactShadowStrengthPercent": round(gravity.CONTACT_STRENGTH * 100),
            "contactShadowPixels": shadow_pixels,
        },
        "sourceHashes": source_hashes,
        "layerPixelSha256": [layer_hash] * LAYERS,
        "placementsTopToBottom": [
            {"layer": index + 1, "x": position[0], "y": position[1]}
            for index, position in enumerate(placements)
        ],
        "validation": report,
        "masterPngSha256": sha256(png_path),
        "masterWebpSha256": sha256(webp_path),
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
