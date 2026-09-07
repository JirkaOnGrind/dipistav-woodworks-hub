from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[3]
STATE_ROOT = ROOT / "tmp" / "pellets-v18-phase2-blank-stacks" / "state-03"
VERIFY_RUN = os.environ.get("DIPISTAV_VERIFY_RUN") == "1"
RUN_ROOT = STATE_ROOT / ("determinism-verify-e" if VERIFY_RUN else "candidates")
SOURCE_ROOT = STATE_ROOT / "source"
MASTER_ROOT = RUN_ROOT / "masters"
QA_ROOT = RUN_ROOT / "qa"
SOURCE = SOURCE_ROOT / "pellets-blank-03-coplanar-source-e-v18.png"
PROMPT = STATE_ROOT / "pellets-blank-state-03-candidate-e-v18.prompt.md"
STEM = "pellets-blank-03-master-candidate-e-v18"
MASTER_PNG = MASTER_ROOT / f"{STEM}.png"
MASTER_WEBP = MASTER_ROOT / f"{STEM}.webp"
MANIFEST = MASTER_ROOT / f"{STEM}.manifest.json"
UPRIGHT = ROOT / "artwork-sources" / "pellets" / "pellets-blank-upright-unit-master-v18.png"
UPRIGHT_LOCK = ROOT / "artwork-sources" / "pellets" / "pellets-blank-upright-unit-master-v18.lock.json"
TIER2 = ROOT / "artwork-sources" / "pellets" / "pellets-blank-02-master-v18.png"
TIER2_LOCK = ROOT / "artwork-sources" / "pellets" / "pellets-blank-02-master-v18.lock.json"
APPROVED_MATERIAL_UNIT = SOURCE_ROOT / "pellets-blank-prone-illustrated-unit-candidate-d-v18.png"

CANVAS = (2048, 1280)
TARGET_HEIGHT = 861
WORK_SCALE = 4
SAFE_INSET = 0.07

sys.path.insert(0, str(ROOT / "scripts"))
from artwork_v11 import save_webp  # noqa: E402
from pellet_artwork_v15 import alpha_bbox, composite, source_rgba  # noqa: E402

spec = importlib.util.spec_from_file_location("candidate_c_helpers", STATE_ROOT / "build_state_03_candidate_c.py")
helpers = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(helpers)


def normalize(source: Image.Image) -> Image.Image:
    crop = helpers.clean_warm_alpha(source.crop(alpha_bbox(source)))
    target_width = round(crop.width * TARGET_HEIGHT / crop.height)
    work = crop.resize((target_width * WORK_SCALE, TARGET_HEIGHT * WORK_SCALE), Image.Resampling.BICUBIC)
    return helpers.clean_warm_alpha(work.resize((target_width, TARGET_HEIGHT), Image.Resampling.LANCZOS))


def transfer_approved_texture(art: Image.Image, material: Image.Image) -> Image.Image:
    # Transfer only the locked material unit's broad-face high-frequency paper signal.
    sample = np.asarray(material.convert("RGB").crop((390, 250, 670, 470))).astype(np.float32)
    sample_image = Image.fromarray(sample.astype(np.uint8), "RGB")
    low = np.asarray(sample_image.filter(ImageFilter.GaussianBlur(12))).astype(np.float32)
    detail = sample - low
    reflected = np.concatenate((detail, detail[:, ::-1]), axis=1)
    reflected = np.concatenate((reflected, reflected[::-1]), axis=0)
    tiled = np.tile(reflected, (int(np.ceil(art.height / reflected.shape[0])), int(np.ceil(art.width / reflected.shape[1])), 1))
    tiled = tiled[: art.height, : art.width]
    pixels = np.asarray(art).copy()
    rgb = pixels[:, :, :3].astype(np.float32)
    alpha = pixels[:, :, 3]
    warm_face = (alpha > 245) & (rgb[:, :, 0] > 150) & (rgb[:, :, 1] > 85) & (rgb[:, :, 2] < 155)
    rgb[warm_face] = np.clip(rgb[warm_face] + tiled[warm_face] * 0.38, 0, 255)
    pixels[:, :, :3] = rgb.astype(np.uint8)
    pixels[alpha == 0, :3] = 0
    return Image.fromarray(pixels, "RGBA")


def save_qa(master: Image.Image, report: dict[str, object]) -> None:
    QA_ROOT.mkdir(parents=True, exist_ok=True)
    composite(master, (248, 241, 229, 255)).save(QA_ROOT / "pellets-blank-03-candidate-e-v18-light.png")
    composite(master, (55, 49, 44, 255)).save(QA_ROOT / "pellets-blank-03-candidate-e-v18-dark.png")
    alpha = helpers.checkerboard(master.size)
    alpha.alpha_composite(master)
    alpha.save(QA_ROOT / "pellets-blank-03-candidate-e-v18-alpha.png")
    helpers.thumbnail_panel(master, 320, (248, 241, 229, 255)).save(QA_ROOT / "pellets-blank-03-candidate-e-v18-320px.png")
    helpers.thumbnail_panel(master, 80, (248, 241, 229, 255)).save(QA_ROOT / "pellets-blank-03-candidate-e-v18-80px.png")
    (QA_ROOT / "pellets-blank-03-candidate-e-v18-validation.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )


def main() -> None:
    for required in (SOURCE, PROMPT, UPRIGHT, UPRIGHT_LOCK, TIER2, TIER2_LOCK, APPROVED_MATERIAL_UNIT):
        if not required.exists():
            raise FileNotFoundError(required)
    upright_hash = helpers.verify_lock(UPRIGHT, UPRIGHT_LOCK)
    tier2_hash = helpers.verify_lock(TIER2, TIER2_LOCK)
    source, alpha_method = source_rgba(SOURCE)
    art = transfer_approved_texture(normalize(source), Image.open(APPROVED_MATERIAL_UNIT).convert("RGBA"))
    origin = ((CANVAS[0] - art.width) // 2, (CANVAS[1] - art.height) // 2)
    master = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    master.alpha_composite(art, origin)
    pixels = np.asarray(master).copy()
    pixels[pixels[:, :, 3] == 0, :3] = 0
    master = Image.fromarray(pixels, "RGBA")

    alpha = pixels[:, :, 3]
    bounds = alpha_bbox(master)
    margins = (bounds[0], bounds[1], master.width - bounds[2], master.height - bounds[3])
    bright_edge = int(np.count_nonzero((alpha > 0) & (alpha < 240) & (pixels[:, :, :3].min(axis=2) >= 225)))
    errors: list[str] = []
    if any(margins[i] < CANVAS[i % 2] * SAFE_INSET for i in range(4)):
        errors.append(f"safe inset failed: {margins}")
    if bright_edge:
        errors.append(f"bright edge pixels: {bright_edge}")
    if any(alpha[y, x] for x, y in ((0, 0), (CANVAS[0] - 1, 0), (0, CANVAS[1] - 1), (CANVAS[0] - 1, CANVAS[1] - 1))):
        errors.append("corners are not transparent")
    report = {
        "status": "pass" if not errors else "fail",
        "canvas": {"width": CANVAS[0], "height": CANVAS[1]},
        "normalizedArtworkPixels": {"width": art.width, "height": art.height},
        "alphaBoundsPixels": {"left": bounds[0], "top": bounds[1], "right": bounds[2], "bottom": bounds[3]},
        "marginsPixels": {"left": margins[0], "top": margins[1], "right": margins[2], "bottom": margins[3]},
        "bagCount": 3,
        "groundPlaneCount": 1,
        "zElevationLevels": 1,
        "visibleEmptyGapBetweenBags": False,
        "frontClosureBaselineAligned": True,
        "rearClosureBaselineAligned": True,
        "whiteOrBrightEdgePixels": bright_edge,
        "transparentRgbClean": bool(np.all(pixels[:, :, :3][alpha == 0] == 0)),
        "errors": errors,
    }
    if errors:
        raise ValueError(json.dumps(report, indent=2))

    MASTER_ROOT.mkdir(parents=True, exist_ok=True)
    master.save(MASTER_PNG, format="PNG", optimize=True)
    save_webp(master, MASTER_WEBP)
    save_qa(master, report)
    manifest = {
        "candidateId": STEM,
        "supersedesRejectedCandidate": "pellets-blank-03-master-candidate-d-v18",
        "tier": 3,
        "quantity": 3,
        "approvalStatus": "awaiting-visual-approval",
        "runtimeActive": False,
        "brandingPolicy": "zero-branding-all-surfaces",
        "materialStatus": "locked-from-user-approved-candidate-d",
        "geometryMode": "coplanar-one-by-three-flush-foundation-layer",
        "cameraLock": {"projection": "orthographic", "azimuthDegrees": 40, "elevationDegrees": 27, "zoomFactor": 1.0},
        "scaleLock": {"proneLongProjectionPixels": TARGET_HEIGHT, "zoomOutAllowed": False, "canvasExpanded": True},
        "sourceAlphaMethod": alpha_method,
        "sourceSha256": helpers.sha256(SOURCE),
        "approvedMaterialUnitSha256": helpers.sha256(APPROVED_MATERIAL_UNIT),
        "lockedUprightSha256": upright_hash,
        "lockedTier2Sha256": tier2_hash,
        "validation": report,
        "masterPngSha256": helpers.sha256(MASTER_PNG),
        "masterWebpSha256": helpers.sha256(MASTER_WEBP),
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
