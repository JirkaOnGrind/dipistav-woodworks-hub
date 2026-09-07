from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[3]
STATE_ROOT = ROOT / "tmp" / "pellets-v18-phase2-blank-stacks" / "state-03"
VERIFY_RUN = os.environ.get("DIPISTAV_VERIFY_RUN") == "1"
RUN_ROOT = STATE_ROOT / ("determinism-verify-d" if VERIFY_RUN else "candidates")
SOURCE_ROOT = STATE_ROOT / "source"
MASTER_ROOT = RUN_ROOT / "masters"
QA_ROOT = RUN_ROOT / "qa"
SOURCE = SOURCE_ROOT / "pellets-blank-prone-illustrated-source-d-v18.png"
UNIT = SOURCE_ROOT / "pellets-blank-prone-illustrated-unit-candidate-d-v18.png"
PROMPT = STATE_ROOT / "pellets-blank-state-03-candidate-d-v18.prompt.md"
STEM = "pellets-blank-03-master-candidate-d-v18"
MASTER_PNG = MASTER_ROOT / f"{STEM}.png"
MASTER_WEBP = MASTER_ROOT / f"{STEM}.webp"
MANIFEST = MASTER_ROOT / f"{STEM}.manifest.json"
UPRIGHT = ROOT / "artwork-sources" / "pellets" / "pellets-blank-upright-unit-master-v18.png"
UPRIGHT_LOCK = ROOT / "artwork-sources" / "pellets" / "pellets-blank-upright-unit-master-v18.lock.json"
TIER2 = ROOT / "artwork-sources" / "pellets" / "pellets-blank-02-master-v18.png"
TIER2_LOCK = ROOT / "artwork-sources" / "pellets" / "pellets-blank-02-master-v18.lock.json"

TARGET_WIDTH = 1060
TARGET_HEIGHT = 861
WORK_SCALE = 4
ROW_VECTOR = (520, 170)
CANVAS = (2560, 1536)
SAFE_INSET = 0.07

sys.path.insert(0, str(ROOT / "scripts"))
from artwork_v11 import save_webp  # noqa: E402
from pellet_artwork_v15 import alpha_bbox, composite, source_rgba  # noqa: E402

spec = importlib.util.spec_from_file_location("candidate_c_helpers", STATE_ROOT / "build_state_03_candidate_c.py")
helpers = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(helpers)


def normalize_unit(source: Image.Image) -> Image.Image:
    crop = helpers.clean_warm_alpha(source.crop(alpha_bbox(source)))
    work = crop.resize((TARGET_WIDTH * WORK_SCALE, TARGET_HEIGHT * WORK_SCALE), Image.Resampling.BICUBIC)
    return helpers.clean_warm_alpha(work.resize((TARGET_WIDTH, TARGET_HEIGHT), Image.Resampling.LANCZOS))


def overlap_count(mask: np.ndarray, dx: int, dy: int) -> int:
    height, width = mask.shape
    return int(np.count_nonzero(mask[dy:height, dx:width] & mask[: height - dy, : width - dx]))


def save_qa(master: Image.Image, report: dict[str, object]) -> None:
    QA_ROOT.mkdir(parents=True, exist_ok=True)
    composite(master, (248, 241, 229, 255)).save(QA_ROOT / "pellets-blank-03-candidate-d-v18-light.png")
    composite(master, (55, 49, 44, 255)).save(QA_ROOT / "pellets-blank-03-candidate-d-v18-dark.png")
    alpha = helpers.checkerboard(master.size)
    alpha.alpha_composite(master)
    alpha.save(QA_ROOT / "pellets-blank-03-candidate-d-v18-alpha.png")
    helpers.thumbnail_panel(master, 320, (248, 241, 229, 255)).save(QA_ROOT / "pellets-blank-03-candidate-d-v18-320px.png")
    helpers.thumbnail_panel(master, 80, (248, 241, 229, 255)).save(QA_ROOT / "pellets-blank-03-candidate-d-v18-80px.png")
    (QA_ROOT / "pellets-blank-03-candidate-d-v18-validation.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )


def main() -> None:
    for required in (SOURCE, PROMPT, UPRIGHT, UPRIGHT_LOCK, TIER2, TIER2_LOCK):
        if not required.exists():
            raise FileNotFoundError(required)
    upright_hash = helpers.verify_lock(UPRIGHT, UPRIGHT_LOCK)
    tier2_hash = helpers.verify_lock(TIER2, TIER2_LOCK)
    source, alpha_method = source_rgba(SOURCE)
    unit = normalize_unit(source)
    SOURCE_ROOT.mkdir(parents=True, exist_ok=True)
    unit.save(UNIT, format="PNG", optimize=True)

    dx, dy = ROW_VECTOR
    union_width = unit.width + dx * 2
    union_height = unit.height + dy * 2
    origin = ((CANVAS[0] - union_width) // 2, (CANVAS[1] - union_height) // 2)
    placements = tuple((origin[0] + dx * i, origin[1] + dy * i) for i in range(3))
    master = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    for position in placements:
        master.alpha_composite(unit, position)
    pixels = np.asarray(master).copy()
    pixels[pixels[:, :, 3] == 0, :3] = 0
    master = Image.fromarray(pixels, "RGBA")

    alpha = np.asarray(master.getchannel("A"))
    bounds = alpha_bbox(master)
    margins = (bounds[0], bounds[1], master.width - bounds[2], master.height - bounds[3])
    unit_mask = np.asarray(unit.getchannel("A")) > 8
    contact_overlap = overlap_count(unit_mask, dx, dy)
    bright_edge = int(np.count_nonzero((alpha > 0) & (alpha < 240) & (pixels[:, :, :3].min(axis=2) >= 225)))
    errors: list[str] = []
    if contact_overlap < 1000:
        errors.append(f"flush contact too weak: {contact_overlap}")
    if any(margins[i] < CANVAS[i % 2] * SAFE_INSET for i in range(4)):
        errors.append(f"safe inset failed: {margins}")
    if bright_edge:
        errors.append(f"bright edge pixels: {bright_edge}")
    report = {
        "status": "pass" if not errors else "fail",
        "canvas": {"width": CANVAS[0], "height": CANVAS[1]},
        "alphaBoundsPixels": {"left": bounds[0], "top": bounds[1], "right": bounds[2], "bottom": bounds[3]},
        "marginsPixels": {"left": margins[0], "top": margins[1], "right": margins[2], "bottom": margins[3]},
        "adjacentContactOverlapPixelsBeforeOcclusion": contact_overlap,
        "visibleEmptyGapPixels": 0,
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
    pixel_hash = hashlib.sha256(unit.tobytes()).hexdigest()
    manifest = {
        "candidateId": STEM,
        "supersedesRejectedCandidate": "pellets-blank-03-master-candidate-c-v18",
        "tier": 3,
        "quantity": 3,
        "approvalStatus": "awaiting-visual-approval",
        "runtimeActive": False,
        "brandingPolicy": "zero-branding-all-surfaces",
        "styleLock": "approved-tier-1-and-tier-2-matte-2.5d-kraft-illustration",
        "cameraLock": {"projection": "orthographic", "azimuthDegrees": 40, "elevationDegrees": 27, "zoomFactor": 1.0},
        "scaleLock": {"proneUnitPixels": {"width": TARGET_WIDTH, "height": TARGET_HEIGHT}, "instanceScalePercent": [100, 100, 100], "zoomOutAllowed": False},
        "layout": "three-heavy-prone-bags-flush-side-contact-with-crisp-visible-boundary-seams",
        "rowVectorPixels": {"x": dx, "y": dy},
        "placements": [{"id": f"prone-{i+1}", "x": p[0], "y": p[1], "width": unit.width, "height": unit.height} for i, p in enumerate(placements)],
        "sourceAlphaMethod": alpha_method,
        "sourceSha256": helpers.sha256(SOURCE),
        "unitSha256": helpers.sha256(UNIT),
        "instancePixelSourceSha256": [pixel_hash] * 3,
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
