from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import shutil
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
WORK_ROOT = ROOT / "tmp" / "pellets-v18-phase2-blank-stacks"
LOCKED_ROOT = ROOT / "artwork-sources" / "pellets"
LOCKED_TIER3_PNG = LOCKED_ROOT / "pellets-blank-03-master-v18.png"
LOCKED_TIER3_LOCK = LOCKED_ROOT / "pellets-blank-03-master-v18.lock.json"
VERIFY_RUN = os.environ.get("DIPISTAV_VERIFY_RUN") == "1"
Z_STEP = 128
SAFE_INSET = 0.07
CANVASES = {12: (2048, 1536), 15: (2048, 1792), 21: (2048, 2048)}

spec = importlib.util.spec_from_file_location(
    "locked_module_builder", WORK_ROOT / "build_tier_06_09_from_locked_tier_03.py"
)
base = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(base)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def lock_approved_tier(quantity: int) -> dict[str, object]:
    state_root = WORK_ROOT / f"state-{quantity:02d}"
    candidate_root = state_root / "candidates" / "masters"
    candidate_stem = f"pellets-blank-{quantity:02d}-master-candidate-a-v18"
    candidate_png = candidate_root / f"{candidate_stem}.png"
    candidate_webp = candidate_root / f"{candidate_stem}.webp"
    candidate_manifest_path = candidate_root / f"{candidate_stem}.manifest.json"
    candidate_manifest = json.loads(candidate_manifest_path.read_text(encoding="utf-8"))
    if sha256(candidate_png) != candidate_manifest["masterPngSha256"]:
        raise ValueError(f"Approved Tier {quantity} PNG no longer matches its manifest")
    if sha256(candidate_webp) != candidate_manifest["masterWebpSha256"]:
        raise ValueError(f"Approved Tier {quantity} WebP no longer matches its manifest")

    locked_stem = f"pellets-blank-{quantity:02d}-master-v18"
    locked_png = LOCKED_ROOT / f"{locked_stem}.png"
    locked_webp = LOCKED_ROOT / f"{locked_stem}.webp"
    locked_lock = LOCKED_ROOT / f"{locked_stem}.lock.json"
    for source, target in ((candidate_png, locked_png), (candidate_webp, locked_webp)):
        if target.exists() and sha256(target) != sha256(source):
            raise ValueError(f"Refusing to overwrite a different locked Tier {quantity} asset: {target}")
        shutil.copyfile(source, target)
    lock = {
        "assetId": locked_stem,
        "approvalStatus": "approved-and-locked",
        "approvedCandidate": candidate_stem,
        "runtimeActive": False,
        "quantity": quantity,
        "layers": quantity // 3,
        "bagsPerLayer": 3,
        "zStepPixels": Z_STEP,
        "lockedTier3PngSha256": candidate_manifest["lockedTier3PngSha256"],
        "png": {"path": str(locked_png.relative_to(ROOT)).replace("\\", "/"), "sha256": sha256(locked_png)},
        "webp": {"path": str(locked_webp.relative_to(ROOT)).replace("\\", "/"), "sha256": sha256(locked_webp)},
    }
    locked_lock.write_text(json.dumps(lock, indent=2) + "\n", encoding="utf-8")
    return lock


def validate(
    master: Image.Image,
    canvas: tuple[int, int],
    quantity: int,
    layers: int,
    layer: Image.Image,
    placements: list[tuple[int, int]],
) -> dict[str, object]:
    pixels = np.asarray(master)
    alpha = pixels[:, :, 3]
    bounds = base.alpha_bbox(master)
    margins = (bounds[0], bounds[1], master.width - bounds[2], master.height - bounds[3])
    errors: list[str] = []
    if master.size != canvas:
        errors.append(f"canvas mismatch: {master.size} != {canvas}")
    if any(margins[index] < canvas[index % 2] * SAFE_INSET for index in range(4)):
        errors.append(f"safe inset failed: {margins}")
    if any(alpha[y, x] for x, y in ((0, 0), (canvas[0] - 1, 0), (0, canvas[1] - 1), (canvas[0] - 1, canvas[1] - 1))):
        errors.append("corners are not transparent")
    if any(position[0] != placements[0][0] for position in placements):
        errors.append("horizontal layer alignment failed")
    if any(placements[index + 1][1] - placements[index][1] != Z_STEP for index in range(layers - 1)):
        errors.append("constant Z step failed")
    bright_edge = int(np.count_nonzero((alpha > 0) & (alpha < 240) & (pixels[:, :, :3].min(axis=2) >= 225)))
    if bright_edge:
        errors.append(f"bright edge pixels: {bright_edge}")
    return {
        "status": "pass" if not errors else "fail",
        "canvas": {"width": canvas[0], "height": canvas[1]},
        "alphaBoundsPixels": {"left": bounds[0], "top": bounds[1], "right": bounds[2], "bottom": bounds[3]},
        "marginsPixels": {"left": margins[0], "top": margins[1], "right": margins[2], "bottom": margins[3]},
        "layerCount": layers,
        "bagsPerLayer": 3,
        "bagCount": quantity,
        "layerPixelSize": {"width": layer.width, "height": layer.height},
        "layerZStepPixels": Z_STEP,
        "horizontalLayerOffsetPixels": 0,
        "instanceScalePercent": 100,
        "sourceLayerResampling": "none",
        "visibleInterlayerGapPixels": 0,
        "transparentRgbClean": bool(np.all(pixels[:, :, :3][alpha == 0] == 0)),
        "whiteOrBrightEdgePixels": bright_edge,
        "errors": errors,
    }


def build_tier(quantity: int, layers: int, tier3_lock: dict[str, object]) -> dict[str, object]:
    canvas = CANVASES[quantity]
    state_root = WORK_ROOT / f"state-{quantity:02d}"
    run_root = state_root / ("determinism-verify" if VERIFY_RUN else "candidates")
    master_root = run_root / "masters"
    qa_root = run_root / "qa"
    stem = f"pellets-blank-{quantity:02d}-master-candidate-a-v18"
    png_path = master_root / f"{stem}.png"
    webp_path = master_root / f"{stem}.webp"
    manifest_path = master_root / f"{stem}.manifest.json"

    tier3 = Image.open(LOCKED_TIER3_PNG).convert("RGBA")
    layer = tier3.crop(base.alpha_bbox(tier3))
    union_height = layer.height + Z_STEP * (layers - 1)
    origin = ((canvas[0] - layer.width) // 2, (canvas[1] - union_height) // 2)
    placements = [(origin[0], origin[1] + Z_STEP * index) for index in range(layers)]
    master = Image.new("RGBA", canvas, (0, 0, 0, 0))
    for position in reversed(placements):
        master.alpha_composite(layer, position)
    pixels = np.asarray(master).copy()
    pixels[pixels[:, :, 3] == 0, :3] = 0
    master = Image.fromarray(pixels, "RGBA")
    report = validate(master, canvas, quantity, layers, layer, placements)
    if report["status"] != "pass":
        raise ValueError(json.dumps(report, indent=2))

    master_root.mkdir(parents=True, exist_ok=True)
    master.save(png_path, format="PNG", optimize=True)
    base.save_webp(master, webp_path)
    base.save_qa(master, qa_root, stem.replace("-master", ""), report)
    layer_pixel_hash = hashlib.sha256(layer.tobytes()).hexdigest()
    manifest = {
        "candidateId": stem,
        "tier": quantity,
        "quantity": quantity,
        "approvalStatus": "awaiting-visual-approval",
        "runtimeActive": False,
        "brandingPolicy": "zero-branding-all-surfaces",
        "compositionMode": f"{layers}-byte-identical-locked-tier3-layers-no-resampling",
        "geometry": {"layers": layers, "bagsPerLayer": 3, "alignment": "direct-vertical-flush", "zStepPixels": Z_STEP},
        "cameraLock": {"projection": "orthographic", "azimuthDegrees": 40, "elevationDegrees": 27, "zoomFactor": 1.0},
        "scaleLock": {"instanceScalePercent": 100, "zoomOutAllowed": False, "canvasExpandedVertically": True},
        "lockedTier3PngSha256": tier3_lock["png"]["sha256"],
        "layerPixelSha256": [layer_pixel_hash] * layers,
        "placementsTopToBottom": [{"layer": index + 1, "x": position[0], "y": position[1]} for index, position in enumerate(placements)],
        "validation": report,
        "masterPngSha256": sha256(png_path),
        "masterWebpSha256": sha256(webp_path),
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest


def main() -> None:
    tier3_lock = json.loads(LOCKED_TIER3_LOCK.read_text(encoding="utf-8"))
    if sha256(LOCKED_TIER3_PNG) != tier3_lock["png"]["sha256"]:
        raise ValueError("Locked Tier 3 PNG hash mismatch")
    locks = {"tier6": lock_approved_tier(6), "tier9": lock_approved_tier(9)}
    builds = {
        "tier12": build_tier(12, 4, tier3_lock),
        "tier15": build_tier(15, 5, tier3_lock),
        "tier21": build_tier(21, 7, tier3_lock),
    }
    print(json.dumps({"approvedLocks": locks, "candidates": builds}, indent=2))


if __name__ == "__main__":
    main()
