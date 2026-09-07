from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import shutil
import sys
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

MODULE_SPECS = {
    5: {
        "source": WORK_ROOT / "state-30" / "source" / "pellets-blank-05-coplanar-source-a-v18.png",
        "module": WORK_ROOT / "state-30" / "source" / "pellets-blank-05-coplanar-unit-candidate-a-v18.png",
        "size": (2435, 861),
    },
    6: {
        "source": WORK_ROOT / "state-60" / "source" / "pellets-blank-06-coplanar-source-a-v18.png",
        "module": WORK_ROOT / "state-60" / "source" / "pellets-blank-06-coplanar-unit-candidate-a-v18.png",
        "size": (2922, 861),
    },
}
TIER_SPECS = {
    30: {"layers": 6, "bagsPerLayer": 5, "canvas": (3072, 2048)},
    40: {"layers": 8, "bagsPerLayer": 5, "canvas": (3072, 2304)},
    60: {"layers": 10, "bagsPerLayer": 6, "canvas": (3584, 2560)},
}

wide_spec = importlib.util.spec_from_file_location(
    "wide_module_builder", WORK_ROOT / "build_tier_20_24_wide_module.py"
)
wide = importlib.util.module_from_spec(wide_spec)
assert wide_spec.loader is not None
wide_spec.loader.exec_module(wide)

sys.path.insert(0, str(ROOT / "scripts"))
from pellet_artwork_v15 import alpha_bbox, source_rgba  # noqa: E402


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def lock_approved_wide_tier(quantity: int) -> dict[str, object]:
    candidate_root = WORK_ROOT / f"state-{quantity:02d}" / "candidates" / "masters"
    candidate_stem = f"pellets-blank-{quantity:02d}-master-candidate-a-v18"
    candidate_png = candidate_root / f"{candidate_stem}.png"
    candidate_webp = candidate_root / f"{candidate_stem}.webp"
    candidate_manifest_path = candidate_root / f"{candidate_stem}.manifest.json"
    manifest = json.loads(candidate_manifest_path.read_text(encoding="utf-8"))
    if sha256(candidate_png) != manifest["masterPngSha256"] or sha256(candidate_webp) != manifest["masterWebpSha256"]:
        raise ValueError(f"Approved Tier {quantity} no longer matches its manifest")
    locked_stem = f"pellets-blank-{quantity:02d}-master-v18"
    locked_png = LOCKED_ROOT / f"{locked_stem}.png"
    locked_webp = LOCKED_ROOT / f"{locked_stem}.webp"
    locked_lock = LOCKED_ROOT / f"{locked_stem}.lock.json"
    for source, target in ((candidate_png, locked_png), (candidate_webp, locked_webp)):
        if target.exists() and sha256(target) != sha256(source):
            raise ValueError(f"Refusing to overwrite a different locked Tier {quantity} asset")
        shutil.copyfile(source, target)
    lock = {
        "assetId": locked_stem,
        "approvalStatus": "approved-and-locked",
        "approvedCandidate": candidate_stem,
        "runtimeActive": False,
        "quantity": quantity,
        "layers": manifest["geometry"]["layers"],
        "bagsPerLayer": manifest["geometry"]["bagsPerLayer"],
        "zStepPixels": manifest["geometry"]["zStepPixels"],
        "lockedTier3PngSha256": manifest["lockedTier3PngSha256"],
        "png": {"path": str(locked_png.relative_to(ROOT)).replace("\\", "/"), "sha256": sha256(locked_png)},
        "webp": {"path": str(locked_webp.relative_to(ROOT)).replace("\\", "/"), "sha256": sha256(locked_webp)},
    }
    locked_lock.write_text(json.dumps(lock, indent=2) + "\n", encoding="utf-8")
    return lock


def normalize_module(source_path: Path, target_size: tuple[int, int]) -> tuple[Image.Image, str]:
    source, alpha_method = source_rgba(source_path)
    crop = wide.helpers.clean_warm_alpha(source.crop(alpha_bbox(source)))
    work = crop.resize((target_size[0] * 4, target_size[1] * 4), Image.Resampling.BICUBIC)
    module = wide.helpers.clean_warm_alpha(work.resize(target_size, Image.Resampling.LANCZOS))
    pixels = np.asarray(module).copy()
    pixels[pixels[:, :, 3] == 0, :3] = 0
    return Image.fromarray(pixels, "RGBA"), alpha_method


def validate(
    master: Image.Image,
    quantity: int,
    layers: int,
    bags_per_layer: int,
    canvas: tuple[int, int],
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
        "bagsPerLayer": bags_per_layer,
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


def build_tier(quantity: int, module: Image.Image, module_source: Path, module_path: Path, tier3_lock: dict[str, object]) -> dict[str, object]:
    spec = TIER_SPECS[quantity]
    layers = spec["layers"]
    bags_per_layer = spec["bagsPerLayer"]
    canvas = spec["canvas"]
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
    report = validate(master, quantity, layers, bags_per_layer, canvas, module, placements)
    if report["status"] != "pass":
        raise ValueError(json.dumps(report, indent=2))

    master_root.mkdir(parents=True, exist_ok=True)
    master.save(png_path, format="PNG", optimize=True)
    wide.tall.base.save_webp(master, webp_path)
    wide.tall.base.save_qa(master, qa_root, stem.replace("-master", ""), report)
    module_pixel_hash = hashlib.sha256(module.tobytes()).hexdigest()
    manifest = {
        "candidateId": stem,
        "tier": quantity,
        "quantity": quantity,
        "approvalStatus": "awaiting-visual-approval",
        "runtimeActive": False,
        "brandingPolicy": "zero-branding-all-surfaces",
        "compositionMode": f"{layers}-byte-identical-{bags_per_layer}-bag-coplanar-layers-no-resampling",
        "geometry": {"layers": layers, "bagsPerLayer": bags_per_layer, "alignment": "direct-vertical-flush", "zStepPixels": Z_STEP},
        "cameraLock": {"projection": "orthographic", "azimuthDegrees": 40, "elevationDegrees": 27, "zoomFactor": 1.0},
        "scaleLock": {"instanceScalePercent": 100, "zoomOutAllowed": False, "canvasExpanded": True},
        "lockedTier3PngSha256": tier3_lock["png"]["sha256"],
        "moduleSourceSha256": sha256(module_source),
        "modulePngSha256": sha256(module_path),
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
    approved_locks = {"tier20": lock_approved_wide_tier(20), "tier24": lock_approved_wide_tier(24)}
    modules: dict[int, Image.Image] = {}
    alpha_methods: dict[int, str] = {}
    for count, module_spec in MODULE_SPECS.items():
        module, alpha_method = normalize_module(module_spec["source"], module_spec["size"])
        module_spec["module"].parent.mkdir(parents=True, exist_ok=True)
        module.save(module_spec["module"], format="PNG", optimize=True)
        modules[count] = module
        alpha_methods[count] = alpha_method
    builds = {
        "tier30": build_tier(30, modules[5], MODULE_SPECS[5]["source"], MODULE_SPECS[5]["module"], tier3_lock),
        "tier40": build_tier(40, modules[5], MODULE_SPECS[5]["source"], MODULE_SPECS[5]["module"], tier3_lock),
        "tier60": build_tier(60, modules[6], MODULE_SPECS[6]["source"], MODULE_SPECS[6]["module"], tier3_lock),
    }
    print(json.dumps({"approvedLocks": approved_locks, "sourceAlphaMethods": alpha_methods, "candidates": builds}, indent=2))


if __name__ == "__main__":
    main()
