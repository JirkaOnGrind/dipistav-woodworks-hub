from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
WORK_ROOT = ROOT / "tmp" / "pellets-v18-phase2-blank-stacks"
LOCKED_ROOT = ROOT / "artwork-sources" / "pellets"
LOCKED_TIER3_PNG = LOCKED_ROOT / "pellets-blank-03-master-v18.png"
LOCKED_TIER3_LOCK = LOCKED_ROOT / "pellets-blank-03-master-v18.lock.json"
SOURCE = WORK_ROOT / "state-20" / "source" / "pellets-blank-04-coplanar-source-a-v18.png"
FOUR_BAG_MODULE = WORK_ROOT / "state-20" / "source" / "pellets-blank-04-coplanar-unit-candidate-a-v18.png"
VERIFY_RUN = os.environ.get("DIPISTAV_VERIFY_RUN") == "1"
Z_STEP = 128
SAFE_INSET = 0.07
TARGET_LAYER_SIZE = (1948, 861)
CANVASES = {20: (2560, 1792), 24: (2560, 2048)}

spec = importlib.util.spec_from_file_location(
    "tall_module_builder", WORK_ROOT / "build_tier_12_15_21_from_locked_module.py"
)
tall = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(tall)

helper_spec = importlib.util.spec_from_file_location(
    "alpha_helpers", WORK_ROOT / "state-03" / "build_state_03_candidate_c.py"
)
helpers = importlib.util.module_from_spec(helper_spec)
assert helper_spec.loader is not None
helper_spec.loader.exec_module(helpers)

sys.path.insert(0, str(ROOT / "scripts"))
from pellet_artwork_v15 import alpha_bbox, source_rgba  # noqa: E402


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def mark_tier21_rejected() -> None:
    manifest_path = (
        WORK_ROOT
        / "state-21"
        / "candidates"
        / "masters"
        / "pellets-blank-21-master-candidate-a-v18.manifest.json"
    )
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["approvalStatus"] = "rejected-by-user"
    manifest["rejectionReason"] = "seven-layer three-bag footprint is too tall and narrow"
    manifest["supersededByGeometryPolicy"] = "four-bag-wide large-quantity footprint"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def normalize_four_bag_module(source: Image.Image) -> Image.Image:
    crop = helpers.clean_warm_alpha(source.crop(alpha_bbox(source)))
    work = crop.resize((TARGET_LAYER_SIZE[0] * 4, TARGET_LAYER_SIZE[1] * 4), Image.Resampling.BICUBIC)
    module = helpers.clean_warm_alpha(work.resize(TARGET_LAYER_SIZE, Image.Resampling.LANCZOS))
    pixels = np.asarray(module).copy()
    pixels[pixels[:, :, 3] == 0, :3] = 0
    return Image.fromarray(pixels, "RGBA")


def validate(
    master: Image.Image,
    canvas: tuple[int, int],
    quantity: int,
    layers: int,
    module: Image.Image,
    placements: list[tuple[int, int]],
) -> dict[str, object]:
    pixels = np.asarray(master)
    alpha = pixels[:, :, 3]
    bounds = alpha_bbox(master)
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
        "bagsPerLayer": 4,
        "bagCount": quantity,
        "layerPixelSize": {"width": module.width, "height": module.height},
        "layerZStepPixels": Z_STEP,
        "horizontalLayerOffsetPixels": 0,
        "instanceScalePercent": 100,
        "sourceLayerResampling": "none-after-module-normalization",
        "visibleInterlayerGapPixels": 0,
        "transparentRgbClean": bool(np.all(pixels[:, :, :3][alpha == 0] == 0)),
        "whiteOrBrightEdgePixels": bright_edge,
        "errors": errors,
    }


def build_tier(quantity: int, layers: int, module: Image.Image, tier3_lock: dict[str, object]) -> dict[str, object]:
    canvas = CANVASES[quantity]
    state_root = WORK_ROOT / f"state-{quantity:02d}"
    run_root = state_root / ("determinism-verify" if VERIFY_RUN else "candidates")
    master_root = run_root / "masters"
    qa_root = run_root / "qa"
    stem = f"pellets-blank-{quantity:02d}-master-candidate-a-v18"
    png_path = master_root / f"{stem}.png"
    webp_path = master_root / f"{stem}.webp"
    manifest_path = master_root / f"{stem}.manifest.json"

    union_height = module.height + Z_STEP * (layers - 1)
    origin = ((canvas[0] - module.width) // 2, (canvas[1] - union_height) // 2)
    placements = [(origin[0], origin[1] + Z_STEP * index) for index in range(layers)]
    master = Image.new("RGBA", canvas, (0, 0, 0, 0))
    for position in reversed(placements):
        master.alpha_composite(module, position)
    pixels = np.asarray(master).copy()
    pixels[pixels[:, :, 3] == 0, :3] = 0
    master = Image.fromarray(pixels, "RGBA")
    report = validate(master, canvas, quantity, layers, module, placements)
    if report["status"] != "pass":
        raise ValueError(json.dumps(report, indent=2))

    master_root.mkdir(parents=True, exist_ok=True)
    master.save(png_path, format="PNG", optimize=True)
    tall.base.save_webp(master, webp_path)
    tall.base.save_qa(master, qa_root, stem.replace("-master", ""), report)
    module_pixel_hash = hashlib.sha256(module.tobytes()).hexdigest()
    manifest = {
        "candidateId": stem,
        "tier": quantity,
        "quantity": quantity,
        "approvalStatus": "awaiting-visual-approval",
        "runtimeActive": False,
        "brandingPolicy": "zero-branding-all-surfaces",
        "compositionMode": f"{layers}-byte-identical-four-bag-coplanar-layers-no-resampling",
        "geometry": {"layers": layers, "bagsPerLayer": 4, "alignment": "direct-vertical-flush", "zStepPixels": Z_STEP},
        "cameraLock": {"projection": "orthographic", "azimuthDegrees": 40, "elevationDegrees": 27, "zoomFactor": 1.0},
        "scaleLock": {"instanceScalePercent": 100, "zoomOutAllowed": False, "canvasExpandedHorizontally": True},
        "lockedTier3PngSha256": tier3_lock["png"]["sha256"],
        "fourBagSourceSha256": sha256(SOURCE),
        "fourBagModuleSha256": sha256(FOUR_BAG_MODULE),
        "layerPixelSha256": [module_pixel_hash] * layers,
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
    locks = {"tier12": tall.lock_approved_tier(12), "tier15": tall.lock_approved_tier(15)}
    mark_tier21_rejected()
    source, alpha_method = source_rgba(SOURCE)
    module = normalize_four_bag_module(source)
    FOUR_BAG_MODULE.parent.mkdir(parents=True, exist_ok=True)
    module.save(FOUR_BAG_MODULE, format="PNG", optimize=True)
    builds = {
        "tier20": build_tier(20, 5, module, tier3_lock),
        "tier24": build_tier(24, 6, module, tier3_lock),
    }
    print(json.dumps({"approvedLocks": locks, "sourceAlphaMethod": alpha_method, "candidates": builds}, indent=2))


if __name__ == "__main__":
    main()
