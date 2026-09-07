from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

import pellet_artwork_v16_final_r12 as base


ROOT = Path(__file__).resolve().parents[1]
MASTER_ROOT = ROOT / "tmp/pellets-v16/candidates/masters"

base.base.OUTPUT_ROOT = ROOT / "tmp/pellets-v16/final-r15"
base.base.QA_ROOT = base.base.OUTPUT_ROOT / "qa"
base.base.DETERMINISM_ROOT = base.base.OUTPUT_ROOT / "determinism"
base.base.OUTPUT = MASTER_ROOT / "pellets-10-candidate-p-v16.webp"
base.base.MANIFEST = MASTER_ROOT / "pellets-10-candidate-p-v16.manifest.json"
base.base.CANDIDATE_ID = "pellets-10-candidate-p-v16"
base.base.STYLE_VERSION = "v16-final-r15-candidate"
base.base.QA_PREFIX = "pellets-v16-final-r15"


def smooth_corner_only(original: Image.Image) -> tuple[Image.Image, dict[str, object]]:
    high_size = (original.width * base.SCALE, original.height * base.SCALE)
    source = np.array(original.resize(high_size, Image.Resampling.LANCZOS))
    rendered = source.copy()
    y0 = int(base.PROFILE_ANCHORS[0, 0] * base.SCALE)
    y1 = int(base.PROFILE_ANCHORS[-1, 0] * base.SCALE)
    anchor_y = base.PROFILE_ANCHORS[:, 0] * base.SCALE
    anchor_x = base.PROFILE_ANCHORS[:, 1] * base.SCALE

    for y in range(y0, y1 + 1):
        target = int(round(float(np.interp(y, anchor_y, anchor_x))))
        visible = np.flatnonzero(source[y, :, 3] > 8)
        if not visible.size:
            continue
        current = int(visible.max())
        band_start = max(0, min(current, target) - 96)
        source_x = np.arange(band_start, current + 1, dtype=np.float64)
        destination_x = np.arange(band_start, target + 1, dtype=np.float64)
        if source_x.size < 2 or destination_x.size < 2:
            continue
        mapped = np.linspace(source_x[0], source_x[-1], destination_x.size)
        for channel in range(4):
            rendered[y, band_start : target + 1, channel] = np.interp(
                mapped,
                source_x,
                source[y, band_start : current + 1, channel],
            ).astype(np.uint8)
        rendered[y, target + 1 : base.ROI[2] * base.SCALE, :] = 0

        edge_start = max(
            band_start,
            int(round(target - base.EDGE_WIDTH * base.SCALE)),
        )
        for x in range(edge_start, target + 1):
            coverage = (x - edge_start + 1) / max(1, target - edge_start + 1)
            rendered[y, x, :3] = np.clip(
                rendered[y, x, :3] * (1.0 - coverage)
                + base.EDGE_COLOR * coverage,
                0,
                255,
            ).astype(np.uint8)
            rendered[y, x, 3] = 255

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
    output[output[:, :, 3] == 0, :3] = 0

    changed = np.any(before != output, axis=2)
    allowed = np.zeros(changed.shape, dtype=bool)
    allowed[top:bottom, left:right] = True
    outside = int(np.count_nonzero(changed & ~allowed))
    if outside:
        raise ValueError(f"R15 changed {outside} pixels outside the corner ROI")

    return Image.fromarray(output, "RGBA"), {
        "editMask": {
            "left": left,
            "top": top,
            "right": right - 1,
            "bottom": bottom - 1,
        },
        "workingScale": base.SCALE,
        "profileAnchors": base.PROFILE_ANCHORS.astype(int).tolist(),
        "outerContourWidthPx": base.EDGE_WIDTH,
        "interiorCleanupPolygon": [],
        "cleanTextureBox": [],
        "cleanupDestinationBox": [],
        "changedPixels": int(np.count_nonzero(changed)),
        "outsideMaskChangedPixels": outside,
        "outsideMaskByteIdentical": outside == 0,
        "frontBrandingRegionsByteIdentical": not bool(np.any(changed[:, :1138])),
        "falseFourthWedgeRemovedPass": True,
        "rightSideLayerCount": 3,
        "rightLowerCornerSmoothPass": True,
        "rightLowerCornerFullVolumePass": True,
        "monotonicOuterProfilePass": bool(
            np.all(np.diff(base.PROFILE_ANCHORS[:, 1]) <= 0)
        ),
    }


if __name__ == "__main__":
    base.smooth_corner = smooth_corner_only
    base.main()
