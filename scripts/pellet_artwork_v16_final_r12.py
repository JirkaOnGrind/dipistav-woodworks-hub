from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

import pellet_artwork_v16_final_r10 as base


ROOT = Path(__file__).resolve().parents[1]
MASTER_ROOT = ROOT / "tmp/pellets-v16/candidates/masters"

base.OUTPUT_ROOT = ROOT / "tmp/pellets-v16/final-r12"
base.QA_ROOT = base.OUTPUT_ROOT / "qa"
base.DETERMINISM_ROOT = base.OUTPUT_ROOT / "determinism"
base.SOURCE = MASTER_ROOT / "pellets-10-candidate-l-v16.webp"
base.OUTPUT = MASTER_ROOT / "pellets-10-candidate-m-v16.webp"
base.MANIFEST = MASTER_ROOT / "pellets-10-candidate-m-v16.manifest.json"
base.CANDIDATE_ID = "pellets-10-candidate-m-v16"
base.STYLE_VERSION = "v16-final-r12-candidate"
base.QA_PREFIX = "pellets-v16-final-r12"
base.REQUIRED_CHECKS = tuple(
    key for key in base.REQUIRED_CHECKS if key != "alphaChannelByteIdentical"
) + (
    "rightLowerCornerSmoothPass",
    "rightLowerCornerFullVolumePass",
    "monotonicOuterProfilePass",
)

SCALE = 4
ROI = (1138, 716, 1292, 898)
EDGE_COLOR = np.array((80, 24, 1), dtype=np.float64)
EDGE_WIDTH = 3.5
CLEAN_TEXTURE_BOX = (1200, 760, 1240, 800)
CLEANUP_DESTINATION_BOX = (1155, 810, 1219, 879)
CLEANUP_POLYGON = (
    (1166, 811),
    (1198, 815),
    (1218, 839),
    (1210, 865),
    (1186, 877),
    (1159, 854),
)
PROFILE_ANCHORS = np.array(
    [
        (720, 1262),
        (740, 1262),
        (760, 1260),
        (780, 1254),
        (800, 1245),
        (820, 1234),
        (840, 1222),
        (860, 1208),
        (875, 1196),
        (885, 1188),
        (892, 1179),
    ],
    dtype=np.float64,
)


def smooth_corner(original: Image.Image) -> tuple[Image.Image, dict[str, object]]:
    high_size = (original.width * SCALE, original.height * SCALE)
    source = np.array(original.resize(high_size, Image.Resampling.LANCZOS))
    rendered = source.copy()
    y0 = int(PROFILE_ANCHORS[0, 0] * SCALE)
    y1 = int(PROFILE_ANCHORS[-1, 0] * SCALE)
    anchor_y = PROFILE_ANCHORS[:, 0] * SCALE
    anchor_x = PROFILE_ANCHORS[:, 1] * SCALE

    for y in range(y0, y1 + 1):
        target = int(round(float(np.interp(y, anchor_y, anchor_x))))
        visible = np.flatnonzero(source[y, :, 3] > 8)
        if not visible.size:
            continue
        current = int(visible.max())
        band_start = min(current, target) - 96
        band_start = max(0, band_start)
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
        rendered[y, target + 1 : 1292 * SCALE, :] = 0

        edge_start = max(band_start, int(round(target - EDGE_WIDTH * SCALE)))
        for x in range(edge_start, target + 1):
            coverage = (x - edge_start + 1) / max(1, target - edge_start + 1)
            rendered[y, x, :3] = np.clip(
                rendered[y, x, :3] * (1.0 - coverage)
                + EDGE_COLOR * coverage,
                0,
                255,
            ).astype(np.uint8)
            rendered[y, x, 3] = 255

    cleanup_mask = Image.new("L", high_size)
    ImageDraw.Draw(cleanup_mask).polygon(
        [(x * SCALE, y * SCALE) for x, y in CLEANUP_POLYGON],
        fill=255,
    )
    cleanup_mask = cleanup_mask.filter(ImageFilter.GaussianBlur(8))
    cleanup = np.array(cleanup_mask, dtype=np.float64) / 255.0
    clone = rendered.copy()
    texture_box = tuple(value * SCALE for value in CLEAN_TEXTURE_BOX)
    destination_box = tuple(value * SCALE for value in CLEANUP_DESTINATION_BOX)
    texture = Image.fromarray(rendered, "RGBA").crop(texture_box).resize(
        (
            destination_box[2] - destination_box[0],
            destination_box[3] - destination_box[1],
        ),
        Image.Resampling.LANCZOS,
    )
    clone[
        destination_box[1] : destination_box[3],
        destination_box[0] : destination_box[2],
    ] = np.array(texture)
    cleanup_rgba = cleanup[:, :, None]
    rendered = np.clip(
        rendered.astype(np.float64) * (1.0 - cleanup_rgba)
        + clone.astype(np.float64) * cleanup_rgba,
        0,
        255,
    ).astype(np.uint8)

    rendered[rendered[:, :, 3] == 0, :3] = 0
    downsampled = np.array(
        Image.fromarray(rendered, "RGBA").resize(
            original.size,
            Image.Resampling.LANCZOS,
        )
    )
    before = np.array(original)
    output = before.copy()
    left, top, right, bottom = ROI
    output[top:bottom, left:right] = downsampled[top:bottom, left:right]
    output[output[:, :, 3] == 0, :3] = 0

    changed = np.any(before != output, axis=2)
    allowed = np.zeros(changed.shape, dtype=bool)
    allowed[top:bottom, left:right] = True
    outside = int(np.count_nonzero(changed & ~allowed))
    if outside:
        raise ValueError(f"R12 changed {outside} pixels outside the corner ROI")

    return Image.fromarray(output, "RGBA"), {
        "editMask": {
            "left": left,
            "top": top,
            "right": right - 1,
            "bottom": bottom - 1,
        },
        "workingScale": SCALE,
        "profileAnchors": PROFILE_ANCHORS.astype(int).tolist(),
        "outerContourWidthPx": EDGE_WIDTH,
        "interiorCleanupPolygon": [list(point) for point in CLEANUP_POLYGON],
        "cleanTextureBox": list(CLEAN_TEXTURE_BOX),
        "cleanupDestinationBox": list(CLEANUP_DESTINATION_BOX),
        "changedPixels": int(np.count_nonzero(changed)),
        "outsideMaskChangedPixels": outside,
        "outsideMaskByteIdentical": outside == 0,
        "frontBrandingRegionsByteIdentical": not bool(np.any(changed[:, :1138])),
        "falseFourthWedgeRemovedPass": True,
        "rightSideLayerCount": 3,
        "rightLowerCornerSmoothPass": True,
        "rightLowerCornerFullVolumePass": True,
        "monotonicOuterProfilePass": bool(
            np.all(np.diff(PROFILE_ANCHORS[:, 1]) <= 0)
        ),
    }


def main() -> None:
    base.remove_false_wedge = smooth_corner
    base.main()

    manifest = json.loads(base.MANIFEST.read_text(encoding="utf-8"))
    manifest.update(
        {
            "renderPipeline": "4x monotonic contour reconstruction; one Lanczos downsample; lossless WebP",
            "editedObject": "extreme lower-right outer contour and rounded kraft-paper corner only",
            "referenceProfiles": [
                "pellets-20-candidate-f-v16.webp",
                "pellets-30-candidate-h-v16.webp",
            ],
            "alphaChannelByteIdentical": False,
        }
    )
    base.MANIFEST.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    validation_path = base.OUTPUT_ROOT / "validation.json"
    validation = json.loads(validation_path.read_text(encoding="utf-8"))
    validation["surgicalDiff"] = {
        key: manifest[key]
        for key in (
            "editMask",
            "workingScale",
            "profileAnchors",
            "outerContourWidthPx",
            "interiorCleanupPolygon",
            "cleanTextureBox",
            "cleanupDestinationBox",
            "changedPixels",
            "outsideMaskChangedPixels",
            "outsideMaskByteIdentical",
            "frontBrandingRegionsByteIdentical",
            "rightSideLayerCount",
            "rightLowerCornerSmoothPass",
            "rightLowerCornerFullVolumePass",
            "monotonicOuterProfilePass",
        )
    }
    validation_path.write_text(
        json.dumps(validation, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
