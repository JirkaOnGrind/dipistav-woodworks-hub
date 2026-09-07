from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageFilter


ROOT = Path(__file__).resolve().parents[2]
WORK_ROOT = ROOT / "tmp" / "pellets-v18-phase2-blank-stacks"
LOCKED_ROOT = ROOT / "artwork-sources" / "pellets"
LOCKED_TIER3 = LOCKED_ROOT / "pellets-blank-03-master-v18.png"
LOCKED_TIER3_LOCK = LOCKED_ROOT / "pellets-blank-03-master-v18.lock.json"
LOCKED_TIER24 = LOCKED_ROOT / "pellets-blank-24-master-v18.png"
LOCKED_TIER24_LOCK = LOCKED_ROOT / "pellets-blank-24-master-v18.lock.json"

SOURCE_5 = WORK_ROOT / "state-30" / "source" / "pellets-blank-05-uniform-source-b-v18.png"
SOURCE_6 = WORK_ROOT / "state-60" / "source" / "pellets-blank-06-uniform-source-b-v18.png"
MODULE_5 = WORK_ROOT / "state-30" / "source" / "pellets-blank-05-uniform-unit-candidate-b-v18.png"
MODULE_6 = WORK_ROOT / "state-60" / "source" / "pellets-blank-06-uniform-unit-candidate-b-v18.png"

VERIFY_RUN = os.environ.get("DIPISTAV_VERIFY_RUN") == "1"
WORK_SCALE = 4
CELL_WIDTH = 487
LAYER_HEIGHT = 861
Z_STEP = 108
SAFE_INSET = 0.07
CONTACT_OFFSET = 8
CONTACT_BLUR = 5
CONTACT_STRENGTH = 0.48

TARGETS = {
    30: {"layers": 6, "bags_per_layer": 5, "canvas": (3072, 2048)},
    40: {"layers": 8, "bags_per_layer": 5, "canvas": (3072, 2304)},
    60: {"layers": 10, "bags_per_layer": 6, "canvas": (3584, 2560)},
}

helper_spec = importlib.util.spec_from_file_location(
    "alpha_helpers", WORK_ROOT / "state-03" / "build_state_03_candidate_c.py"
)
helpers = importlib.util.module_from_spec(helper_spec)
assert helper_spec.loader is not None
helper_spec.loader.exec_module(helpers)

base_spec = importlib.util.spec_from_file_location(
    "base_builder", WORK_ROOT / "build_tier_06_09_from_locked_tier_03.py"
)
base = importlib.util.module_from_spec(base_spec)
assert base_spec.loader is not None
base_spec.loader.exec_module(base)

sys.path.insert(0, str(ROOT / "scripts"))
from pellet_artwork_v15 import alpha_bbox, source_rgba  # noqa: E402


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify_lock(asset: Path, lock_path: Path) -> str:
    lock = json.loads(lock_path.read_text(encoding="utf-8"))
    actual = sha256(asset)
    if actual != lock["png"]["sha256"]:
        raise ValueError(f"Locked asset hash mismatch: {asset}")
    return actual


def mark_rejected(quantity: int) -> None:
    path = (
        WORK_ROOT
        / f"state-{quantity:02d}"
        / "candidates"
        / "masters"
        / f"pellets-blank-{quantity:02d}-master-candidate-a-v18.manifest.json"
    )
    if not path.exists():
        return
    manifest = json.loads(path.read_text(encoding="utf-8"))
    manifest["approvalStatus"] = "rejected-by-user"
    manifest["rejectionReason"] = "non-uniform far-right bag width and insufficient interlayer contact weight"
    manifest["supersededByCandidate"] = f"pellets-blank-{quantity:02d}-master-candidate-b-v18"
    path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def normalize_uniform_module(source_path: Path, bags_per_layer: int) -> tuple[Image.Image, str]:
    source, alpha_method = source_rgba(source_path)
    crop = helpers.clean_warm_alpha(source.crop(alpha_bbox(source)))
    target = (CELL_WIDTH * bags_per_layer, LAYER_HEIGHT)
    work = crop.resize((target[0] * WORK_SCALE, target[1] * WORK_SCALE), Image.Resampling.BICUBIC)
    module = helpers.clean_warm_alpha(work.resize(target, Image.Resampling.LANCZOS))
    pixels = np.asarray(module).copy()
    pixels[pixels[:, :, 3] == 0, :3] = 0
    return Image.fromarray(pixels, "RGBA"), alpha_method


def module_contact_rim(module: Image.Image) -> Image.Image:
    alpha = module.getchannel("A")
    soft = alpha.filter(ImageFilter.GaussianBlur(CONTACT_BLUR))
    shifted = Image.new("L", module.size, 0)
    shifted.paste(soft, (0, CONTACT_OFFSET))
    soft_rim = ImageChops.subtract(shifted, alpha)

    tight = alpha.filter(ImageFilter.MaxFilter(9))
    tight_shifted = Image.new("L", module.size, 0)
    tight_shifted.paste(tight, (0, 4))
    tight_rim = ImageChops.subtract(tight_shifted, alpha)
    return ImageChops.lighter(soft_rim, tight_rim)


def apply_contact_shadow(master: Image.Image, rim: Image.Image, position: tuple[int, int]) -> tuple[Image.Image, int]:
    full_mask = Image.new("L", master.size, 0)
    full_mask.paste(rim, position)
    pixels = np.asarray(master).copy()
    mask = np.asarray(full_mask).astype(np.float32) / 255.0
    occupied = pixels[:, :, 3].astype(np.float32) / 255.0
    effective = mask * occupied
    factor = 1.0 - CONTACT_STRENGTH * effective
    pixels[:, :, :3] = np.clip(pixels[:, :, :3].astype(np.float32) * factor[:, :, None], 0, 255).astype(np.uint8)
    pixels[pixels[:, :, 3] == 0, :3] = 0
    return Image.fromarray(pixels, "RGBA"), int(np.count_nonzero(effective > 0.02))


def build_stack(module: Image.Image, quantity: int, config: dict[str, object]) -> tuple[Image.Image, list[tuple[int, int]], int]:
    layers = int(config["layers"])
    canvas = tuple(config["canvas"])
    union_height = module.height + Z_STEP * (layers - 1)
    origin = ((canvas[0] - module.width) // 2, (canvas[1] - union_height) // 2)
    placements = [(origin[0], origin[1] + Z_STEP * index) for index in range(layers)]
    rim = module_contact_rim(module)
    master = Image.new("RGBA", canvas, (0, 0, 0, 0))
    shadow_pixels = 0
    for index in range(layers - 1, -1, -1):
        position = placements[index]
        if index != layers - 1:
            master, count = apply_contact_shadow(master, rim, position)
            shadow_pixels += count
        master.alpha_composite(module, position)
    pixels = np.asarray(master).copy()
    pixels[pixels[:, :, 3] == 0, :3] = 0
    return Image.fromarray(pixels, "RGBA"), placements, shadow_pixels


def validate(
    master: Image.Image,
    module: Image.Image,
    quantity: int,
    config: dict[str, object],
    placements: list[tuple[int, int]],
    shadow_pixels: int,
) -> dict[str, object]:
    layers = int(config["layers"])
    bags_per_layer = int(config["bags_per_layer"])
    canvas = tuple(config["canvas"])
    pixels = np.asarray(master)
    alpha = pixels[:, :, 3]
    bounds = alpha_bbox(master)
    margins = (bounds[0], bounds[1], master.width - bounds[2], master.height - bounds[3])
    errors: list[str] = []
    if master.size != canvas:
        errors.append("canvas mismatch")
    if quantity != layers * bags_per_layer:
        errors.append("bag count mismatch")
    if module.width != CELL_WIDTH * bags_per_layer or module.height != LAYER_HEIGHT:
        errors.append("uniform module grid mismatch")
    if any(position[0] != placements[0][0] for position in placements):
        errors.append("horizontal layer alignment failed")
    if any(placements[i + 1][1] - placements[i][1] != Z_STEP for i in range(layers - 1)):
        errors.append("constant compressed Z step failed")
    if shadow_pixels <= 0:
        errors.append("contact shadow mask is empty")
    if any(margins[i] < canvas[i % 2] * SAFE_INSET for i in range(4)):
        errors.append(f"safe inset failed: {margins}")
    if any(alpha[y, x] for x, y in ((0, 0), (canvas[0] - 1, 0), (0, canvas[1] - 1), (canvas[0] - 1, canvas[1] - 1))):
        errors.append("corners are not transparent")
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
        "uniformCellWidthPixels": CELL_WIDTH,
        "uniformCellWidthsPixels": [CELL_WIDTH] * bags_per_layer,
        "layerPixelSize": {"width": module.width, "height": module.height},
        "layerZStepPixels": Z_STEP,
        "horizontalLayerOffsetPixels": 0,
        "contactShadowPixels": shadow_pixels,
        "contactShadowStrengthPercent": round(CONTACT_STRENGTH * 100),
        "instanceScalePercent": 100,
        "sourceLayerResampling": "none-after-one-module-normalization",
        "transparentRgbClean": bool(np.all(pixels[:, :, :3][alpha == 0] == 0)),
        "whiteOrBrightEdgePixels": bright_edge,
        "errors": errors,
    }


def build_candidate(
    quantity: int,
    module: Image.Image,
    module_path: Path,
    source_path: Path,
    alpha_method: str,
    locked_hashes: dict[str, str],
) -> dict[str, object]:
    config = TARGETS[quantity]
    state_root = WORK_ROOT / f"state-{quantity:02d}"
    run_root = state_root / ("determinism-verify-b" if VERIFY_RUN else "candidates")
    master_root = run_root / "masters"
    qa_root = run_root / "qa"
    stem = f"pellets-blank-{quantity:02d}-master-candidate-b-v18"
    png_path = master_root / f"{stem}.png"
    webp_path = master_root / f"{stem}.webp"
    manifest_path = master_root / f"{stem}.manifest.json"

    master, placements, shadow_pixels = build_stack(module, quantity, config)
    report = validate(master, module, quantity, config, placements, shadow_pixels)
    if report["status"] != "pass":
        raise ValueError(json.dumps(report, indent=2))

    master_root.mkdir(parents=True, exist_ok=True)
    master.save(png_path, format="PNG", optimize=True)
    base.save_webp(master, webp_path)
    base.save_qa(master, qa_root, stem.replace("-master", ""), report)
    module_hash = hashlib.sha256(module.tobytes()).hexdigest()
    manifest = {
        "candidateId": stem,
        "supersedesRejectedCandidate": stem.replace("candidate-b", "candidate-a"),
        "tier": quantity,
        "quantity": quantity,
        "approvalStatus": "awaiting-visual-approval",
        "runtimeActive": False,
        "brandingPolicy": "zero-branding-all-surfaces",
        "compositionMode": f"{config['layers']}-byte-identical-uniform-{config['bags_per_layer']}-bag-layers-with-contact-occlusion",
        "geometry": {
            "layers": config["layers"],
            "bagsPerLayer": config["bags_per_layer"],
            "uniformCellWidthPixels": CELL_WIDTH,
            "alignment": "direct-vertical-compressed-contact",
            "zStepPixels": Z_STEP,
        },
        "cameraLock": {"projection": "orthographic", "azimuthDegrees": 40, "elevationDegrees": 27, "zoomFactor": 1.0},
        "scaleLock": {"instanceScalePercent": 100, "zoomOutAllowed": False, "canvasExpanded": True},
        "gravityTreatment": {
            "contactOffsetPixels": CONTACT_OFFSET,
            "contactBlurPixels": CONTACT_BLUR,
            "contactShadowStrengthPercent": round(CONTACT_STRENGTH * 100),
            "contactShadowPixels": shadow_pixels,
        },
        "lockedSourceHashes": locked_hashes,
        "sourceAlphaMethod": alpha_method,
        "moduleSourceSha256": sha256(source_path),
        "normalizedModuleFileSha256": sha256(module_path),
        "layerPixelSha256": [module_hash] * int(config["layers"]),
        "placementsTopToBottom": [{"layer": i + 1, "x": p[0], "y": p[1]} for i, p in enumerate(placements)],
        "validation": report,
        "masterPngSha256": sha256(png_path),
        "masterWebpSha256": sha256(webp_path),
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest


def main() -> None:
    for required in (SOURCE_5, SOURCE_6, LOCKED_TIER3, LOCKED_TIER3_LOCK, LOCKED_TIER24, LOCKED_TIER24_LOCK):
        if not required.exists():
            raise FileNotFoundError(required)
    locked_hashes = {
        "tier3PngSha256": verify_lock(LOCKED_TIER3, LOCKED_TIER3_LOCK),
        "tier24PngSha256": verify_lock(LOCKED_TIER24, LOCKED_TIER24_LOCK),
    }
    if not VERIFY_RUN:
        for quantity in TARGETS:
            mark_rejected(quantity)

    module5, alpha5 = normalize_uniform_module(SOURCE_5, 5)
    module6, alpha6 = normalize_uniform_module(SOURCE_6, 6)
    MODULE_5.parent.mkdir(parents=True, exist_ok=True)
    MODULE_6.parent.mkdir(parents=True, exist_ok=True)
    module5.save(MODULE_5, format="PNG", optimize=True)
    module6.save(MODULE_6, format="PNG", optimize=True)

    result = {
        "tier30": build_candidate(30, module5, MODULE_5, SOURCE_5, alpha5, locked_hashes),
        "tier40": build_candidate(40, module5, MODULE_5, SOURCE_5, alpha5, locked_hashes),
        "tier60": build_candidate(60, module6, MODULE_6, SOURCE_6, alpha6, locked_hashes),
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
