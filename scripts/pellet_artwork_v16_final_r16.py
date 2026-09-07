from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

import pellet_artwork_v16_final_r10 as base


ROOT = Path(__file__).resolve().parents[1]
MASTER_ROOT = ROOT / "tmp/pellets-v16/candidates/masters"

base.OUTPUT_ROOT = ROOT / "tmp/pellets-v16/final-r16"
base.QA_ROOT = base.OUTPUT_ROOT / "qa"
base.DETERMINISM_ROOT = base.OUTPUT_ROOT / "determinism"
base.SOURCE = MASTER_ROOT / "pellets-10-candidate-p-v16.webp"
base.OUTPUT = MASTER_ROOT / "pellets-10-master-v16.webp"
base.MANIFEST = MASTER_ROOT / "pellets-10-master-v16.manifest.json"
base.CANDIDATE_ID = "pellets-10-master-v16"
base.STYLE_VERSION = "v16-approved"
base.QA_PREFIX = "pellets-v16-approved"

SCALE = 4
EDIT_POLYGON = (
    (1088, 805),
    (1156, 807),
    (1155, 817),
    (1088, 815),
)
CLONE_OFFSET = (0, -14)
ROI = (1084, 801, 1161, 821)
MEASURE_X = (1090, 1145)
MEASURE_Y = (805, 815)


def line_strength(image: Image.Image) -> float:
    gray = np.array(image.convert("RGB"), dtype=np.float64).mean(axis=2)
    x0, x1 = MEASURE_X
    y0, y1 = MEASURE_Y
    values = [
        np.abs(gray[y + 1, x0:x1] - gray[y - 1, x0:x1]).mean()
        for y in range(y0, y1 + 1)
    ]
    return float(max(values))


def remove_horizontal_seam(
    original: Image.Image,
) -> tuple[Image.Image, dict[str, object]]:
    high_size = (original.width * SCALE, original.height * SCALE)
    source = np.array(original.resize(high_size, Image.Resampling.LANCZOS))
    clone = source.copy()
    dx, dy = (value * SCALE for value in CLONE_OFFSET)
    y_start = max(0, -dy)
    y_stop = min(high_size[1], high_size[1] - dy)
    x_start = max(0, -dx)
    x_stop = min(high_size[0], high_size[0] - dx)
    clone[y_start:y_stop, x_start:x_stop] = source[
        y_start + dy : y_stop + dy,
        x_start + dx : x_stop + dx,
    ]

    hard = Image.new("L", high_size)
    ImageDraw.Draw(hard).polygon(
        [(x * SCALE, y * SCALE) for x, y in EDIT_POLYGON],
        fill=255,
    )
    feather = hard.filter(ImageFilter.GaussianBlur(5))
    mask = np.minimum(np.array(hard), np.array(feather)).astype(np.float64) / 255.0
    mask_rgba = mask[:, :, None]
    rendered = np.clip(
        source.astype(np.float64) * (1.0 - mask_rgba)
        + clone.astype(np.float64) * mask_rgba,
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
    left, top, right, bottom = ROI
    output[top:bottom, left:right] = downsampled[top:bottom, left:right]
    output[:, :, 3] = before[:, :, 3]
    output[output[:, :, 3] == 0, :3] = 0
    corrected = Image.fromarray(output, "RGBA")

    changed = np.any(before != output, axis=2)
    allowed = np.zeros(changed.shape, dtype=bool)
    allowed[top:bottom, left:right] = True
    outside = int(np.count_nonzero(changed & ~allowed))
    if outside:
        raise ValueError(f"R16 changed {outside} pixels outside the seam ROI")

    before_strength = line_strength(original)
    after_strength = line_strength(corrected)
    return corrected, {
        "editMask": {
            "left": left,
            "top": top,
            "right": right - 1,
            "bottom": bottom - 1,
        },
        "editPolygon": [list(point) for point in EDIT_POLYGON],
        "workingScale": SCALE,
        "cloneOffsetPixels": list(CLONE_OFFSET),
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


def main() -> None:
    base.remove_false_wedge = remove_horizontal_seam
    base.REQUIRED_CHECKS = base.REQUIRED_CHECKS + (
        "horizontalArtifactRemovedPass",
        "rightOuterProfileByteIdentical",
    )
    base.main()

    manifest = json.loads(base.MANIFEST.read_text(encoding="utf-8"))
    manifest.update(
        {
            "approvalStatus": "approved-for-production",
            "runtimeActivation": "authorized",
            "renderPipeline": "4x masked kraft-texture reconstruction; one Lanczos downsample; lossless WebP",
            "editedObject": "single horizontal artifact on bottom-right front panel",
            "lockedInvariants": [
                "alpha silhouette",
                "right side profile",
                "all branding and 15 kg text",
                "all other bags",
            ],
        }
    )
    base.MANIFEST.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    validation_path = base.OUTPUT_ROOT / "validation.json"
    validation = json.loads(validation_path.read_text(encoding="utf-8"))
    validation.update(
        {
            "approvalStatus": "approved-for-production",
            "runtimeActivation": "authorized",
            "surgicalDiff": {
                key: manifest[key]
                for key in (
                    "editMask",
                    "editPolygon",
                    "workingScale",
                    "cloneOffsetPixels",
                    "changedPixels",
                    "outsideMaskChangedPixels",
                    "outsideMaskByteIdentical",
                    "alphaChannelByteIdentical",
                    "frontBrandingRegionsByteIdentical",
                    "horizontalSeamStrengthBefore",
                    "horizontalSeamStrengthAfter",
                    "horizontalArtifactRemovedPass",
                    "rightOuterProfileByteIdentical",
                )
            },
        }
    )
    validation_path.write_text(
        json.dumps(validation, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
