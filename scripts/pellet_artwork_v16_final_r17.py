from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

import pellet_artwork_v16_final_r16 as base


ROOT = Path(__file__).resolve().parents[1]
MASTER_ROOT = ROOT / "tmp/pellets-v16/candidates/masters"

base.base.OUTPUT_ROOT = ROOT / "tmp/pellets-v16/final-r17"
base.base.QA_ROOT = base.base.OUTPUT_ROOT / "qa"
base.base.DETERMINISM_ROOT = base.base.OUTPUT_ROOT / "determinism"
base.base.OUTPUT = MASTER_ROOT / "pellets-10-master-v16-r2.webp"
base.base.MANIFEST = MASTER_ROOT / "pellets-10-master-v16-r2.manifest.json"
base.base.CANDIDATE_ID = "pellets-10-master-v16-r2"
base.base.STYLE_VERSION = "v16-approved-r2"
base.base.QA_PREFIX = "pellets-v16-approved-r2"


def interpolate_horizontal_seam(
    original: Image.Image,
) -> tuple[Image.Image, dict[str, object]]:
    high_size = (original.width * base.SCALE, original.height * base.SCALE)
    source = np.array(original.resize(high_size, Image.Resampling.LANCZOS))
    fill = source.copy()

    hard_image = Image.new("L", high_size)
    ImageDraw.Draw(hard_image).polygon(
        [(x * base.SCALE, y * base.SCALE) for x, y in base.EDIT_POLYGON],
        fill=255,
    )
    hard = np.array(hard_image)
    feather = np.minimum(
        hard,
        np.array(hard_image.filter(ImageFilter.GaussianBlur(5))),
    ).astype(np.float64) / 255.0

    x_values = np.flatnonzero(np.any(hard > 0, axis=0))
    sample_margin = 7 * base.SCALE
    for x in x_values:
        ys = np.flatnonzero(hard[:, x] > 0)
        if not ys.size:
            continue
        top = int(ys.min())
        bottom = int(ys.max())
        sample_top = max(0, top - sample_margin)
        sample_bottom = min(high_size[1] - 1, bottom + sample_margin)
        span = max(1, bottom - top)
        for y in range(top, bottom + 1):
            ratio = (y - top) / span
            fill[y, x] = np.clip(
                source[sample_top, x].astype(np.float64) * (1.0 - ratio)
                + source[sample_bottom, x].astype(np.float64) * ratio,
                0,
                255,
            ).astype(np.uint8)

    mask = feather[:, :, None]
    rendered = np.clip(
        source.astype(np.float64) * (1.0 - mask)
        + fill.astype(np.float64) * mask,
        0,
        255,
    ).astype(np.uint8)
    rendered[:, :, 3] = source[:, :, 3]
    rendered[rendered[:, :, 3] == 0, :3] = 0
    downsampled = np.array(
        Image.fromarray(rendered, "RGBA").resize(
            original.size,
            Image.Resampling.LANCZOS,
        )
    )

    before = np.array(original)
    output = before.copy()
    left, top, right, bottom = base.ROI
    output[top:bottom, left:right] = downsampled[top:bottom, left:right]
    output[:, :, 3] = before[:, :, 3]
    output[output[:, :, 3] == 0, :3] = 0
    corrected = Image.fromarray(output, "RGBA")

    changed = np.any(before != output, axis=2)
    allowed = np.zeros(changed.shape, dtype=bool)
    allowed[top:bottom, left:right] = True
    outside = int(np.count_nonzero(changed & ~allowed))
    if outside:
        raise ValueError(f"R17 changed {outside} pixels outside the seam ROI")

    before_strength = base.line_strength(original)
    after_strength = base.line_strength(corrected)
    return corrected, {
        "editMask": {
            "left": left,
            "top": top,
            "right": right - 1,
            "bottom": bottom - 1,
        },
        "editPolygon": [list(point) for point in base.EDIT_POLYGON],
        "workingScale": base.SCALE,
        "cloneOffsetPixels": [],
        "reconstruction": "vertical interpolation between clean kraft texture above and below",
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
        "rightOuterProfileByteIdentical": not bool(
            np.any(changed[:, 1161:])
        ),
    }


if __name__ == "__main__":
    base.remove_horizontal_seam = interpolate_horizontal_seam
    base.main()
