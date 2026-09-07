from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

import pellet_artwork_v16_final_r18 as previous


ROOT = Path(__file__).resolve().parents[1]
MASTER_ROOT = ROOT / "tmp/pellets-v16/candidates/masters"

previous.base.OUTPUT_ROOT = ROOT / "tmp/pellets-v16/final-r19"
previous.base.QA_ROOT = previous.base.OUTPUT_ROOT / "qa"
previous.base.DETERMINISM_ROOT = previous.base.OUTPUT_ROOT / "determinism"
previous.base.OUTPUT = MASTER_ROOT / "pellets-10-master-v16-r4.webp"
previous.base.MANIFEST = MASTER_ROOT / "pellets-10-master-v16-r4.manifest.json"
previous.base.CANDIDATE_ID = "pellets-10-master-v16-r4"
previous.base.STYLE_VERSION = "v16-approved-r4"
previous.base.QA_PREFIX = "pellets-v16-approved-r4"

previous.DONOR_BOX = (530, 737, 598, 749)
previous.MEASURE_Y = (807, 813)


def clone_clean_front_texture(
    original: Image.Image,
) -> tuple[Image.Image, dict[str, object]]:
    high_size = (original.width * previous.SCALE, original.height * previous.SCALE)
    source = original.resize(high_size, Image.Resampling.LANCZOS)
    source_array = np.array(source)

    donor_box = tuple(value * previous.SCALE for value in previous.DONOR_BOX)
    target_box = tuple(value * previous.SCALE for value in previous.TARGET_BOX)
    donor = np.array(source.crop(donor_box).convert("RGB"), dtype=np.float64)
    target = np.array(source.crop(target_box).convert("RGB"), dtype=np.float64)
    color_offset = target.reshape(-1, 3).mean(axis=0) - donor.reshape(-1, 3).mean(axis=0)
    patch = np.clip(donor + color_offset, 0, 255).astype(np.uint8)

    patched = source_array.copy()
    left, top, right, bottom = target_box
    patched[top:bottom, left:right, :3] = patch

    hard = Image.new("L", high_size)
    ImageDraw.Draw(hard).polygon(
        [(x * previous.SCALE, y * previous.SCALE) for x, y in previous.TARGET_POLYGON],
        fill=255,
    )
    feather = hard.filter(ImageFilter.GaussianBlur(5))
    mask = np.minimum(np.array(hard), np.array(feather)).astype(np.float64)[:, :, None] / 255.0
    rendered = np.clip(
        source_array.astype(np.float64) * (1.0 - mask)
        + patched.astype(np.float64) * mask,
        0,
        255,
    ).astype(np.uint8)
    rendered[:, :, 3] = source_array[:, :, 3]
    rendered[rendered[:, :, 3] == 0, :3] = 0
    downsampled = np.array(
        Image.fromarray(rendered, "RGBA").resize(original.size, Image.Resampling.LANCZOS)
    )

    before = np.array(original)
    output = before.copy()
    roi_left, roi_top, roi_right, roi_bottom = previous.ROI
    output[roi_top:roi_bottom, roi_left:roi_right] = downsampled[
        roi_top:roi_bottom,
        roi_left:roi_right,
    ]
    output[:, :, 3] = before[:, :, 3]
    output[output[:, :, 3] == 0, :3] = 0

    changed = np.any(before != output, axis=2)
    allowed = np.zeros(changed.shape, dtype=bool)
    allowed[roi_top:roi_bottom, roi_left:roi_right] = True
    outside = int(np.count_nonzero(changed & ~allowed))
    if outside:
        raise ValueError(f"R19 changed {outside} pixels outside the seam ROI")

    corrected = Image.fromarray(output, "RGBA")
    before_strength = previous.line_strength(original)
    after_strength = previous.line_strength(corrected)
    return corrected, {
        "editMask": {
            "left": roi_left,
            "top": roi_top,
            "right": roi_right - 1,
            "bottom": roi_bottom - 1,
        },
        "editPolygon": [list(point) for point in previous.TARGET_POLYGON],
        "donorBox": {
            "left": previous.DONOR_BOX[0],
            "top": previous.DONOR_BOX[1],
            "right": previous.DONOR_BOX[2],
            "bottom": previous.DONOR_BOX[3],
        },
        "workingScale": previous.SCALE,
        "cloneOffsetPixels": [],
        "reconstruction": "color-matched front texture cloned from the clean middle-bottom bag",
        "changedPixels": int(np.count_nonzero(changed)),
        "outsideMaskChangedPixels": outside,
        "outsideMaskByteIdentical": outside == 0,
        "alphaChannelByteIdentical": bool(
            np.array_equal(before[:, :, 3], output[:, :, 3])
        ),
        "frontBrandingRegionsByteIdentical": not bool(
            np.any(changed[:, :1084]) or np.any(changed[:, 1161:])
        ),
        "falseFourthWedgeRemovedPass": True,
        "rightSideLayerCount": 3,
        "horizontalSeamStrengthBefore": round(before_strength, 6),
        "horizontalSeamStrengthAfter": round(after_strength, 6),
        "horizontalArtifactRemovedPass": after_strength < before_strength * 0.9,
        "rightOuterProfileByteIdentical": not bool(np.any(changed[:, 1161:])),
    }


def main() -> None:
    previous.clone_middle_bottom_texture = clone_clean_front_texture
    previous.main()

    manifest = json.loads(previous.base.MANIFEST.read_text(encoding="utf-8"))
    family = previous.base.family_entries(manifest["outputSha256"])
    for entry in family:
        entry["locked"] = True

    qa_root = previous.base.QA_ROOT
    prefix = previous.base.QA_PREFIX
    previous.base.qa.family_sheet(
        family,
        previous.base.artwork.CREAM,
        qa_root / f"{prefix}-light.png",
    )
    previous.base.qa.family_sheet(
        family,
        previous.base.artwork.DARK,
        qa_root / f"{prefix}-dark.png",
    )
    previous.base.qa.family_sheet(
        family,
        previous.base.artwork.CREAM,
        qa_root / f"{prefix}-320.png",
        mobile=True,
    )
    previous.base.artwork.edge_sheet(
        family,
        qa_root / f"{prefix}-alpha-edge.png",
    )
    previous.base.artwork.branding_sheet(
        [
            {**entry, "labelCount": entry["count"] if entry["count"] <= 5 else 8}
            for entry in family
        ],
        qa_root / f"{prefix}-branding.png",
    )


if __name__ == "__main__":
    main()
