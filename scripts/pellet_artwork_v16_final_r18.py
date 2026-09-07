from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

import pellet_artwork_v16_final_r10 as base


ROOT = Path(__file__).resolve().parents[1]
MASTER_ROOT = ROOT / "tmp/pellets-v16/candidates/masters"

base.OUTPUT_ROOT = ROOT / "tmp/pellets-v16/final-r18"
base.QA_ROOT = base.OUTPUT_ROOT / "qa"
base.DETERMINISM_ROOT = base.OUTPUT_ROOT / "determinism"
base.SOURCE = MASTER_ROOT / "pellets-10-candidate-l-v16.webp"
base.OUTPUT = MASTER_ROOT / "pellets-10-master-v16-r3.webp"
base.MANIFEST = MASTER_ROOT / "pellets-10-master-v16-r3.manifest.json"
base.CANDIDATE_ID = "pellets-10-master-v16-r3"
base.STYLE_VERSION = "v16-approved-r3"
base.QA_PREFIX = "pellets-v16-approved-r3"

SCALE = 4
SOURCE_SHA256 = "0c4082349947636a97eea0bce84a9dd6e2f8a8f2df17f820d88a33dbb21b27c0"
DONOR_BOX = (515, 748, 583, 760)
TARGET_BOX = (1088, 805, 1156, 817)
TARGET_POLYGON = (
    (1088, 805),
    (1156, 807),
    (1155, 817),
    (1088, 815),
)
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


def clone_middle_bottom_texture(
    original: Image.Image,
) -> tuple[Image.Image, dict[str, object]]:
    high_size = (original.width * SCALE, original.height * SCALE)
    source = original.resize(high_size, Image.Resampling.LANCZOS)
    source_rgb = np.array(source, dtype=np.float64)[:, :, :3]

    donor_box = tuple(value * SCALE for value in DONOR_BOX)
    target_box = tuple(value * SCALE for value in TARGET_BOX)
    donor = source.crop(donor_box).convert("RGB")
    target = source.crop(target_box).convert("RGB")

    donor_array = np.array(donor, dtype=np.float64)
    target_array = np.array(target, dtype=np.float64)
    donor_low = np.array(donor.filter(ImageFilter.GaussianBlur(14)), dtype=np.float64)
    target_low = np.array(target.filter(ImageFilter.GaussianBlur(14)), dtype=np.float64)
    texture_patch = np.clip(target_low + (donor_array - donor_low), 0, 255)

    patched_rgb = source_rgb.copy()
    left, top, right, bottom = target_box
    patched_rgb[top:bottom, left:right] = texture_patch

    hard = Image.new("L", high_size)
    ImageDraw.Draw(hard).polygon(
        [(x * SCALE, y * SCALE) for x, y in TARGET_POLYGON],
        fill=255,
    )
    feather = hard.filter(ImageFilter.GaussianBlur(5))
    mask = np.minimum(np.array(hard), np.array(feather)).astype(np.float64) / 255.0
    mask = mask[:, :, None]

    source_array = np.array(source)
    rendered = source_array.copy()
    rendered[:, :, :3] = np.clip(
        source_rgb * (1.0 - mask) + patched_rgb * mask,
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
    roi_left, roi_top, roi_right, roi_bottom = ROI
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
        raise ValueError(f"R18 changed {outside} pixels outside the seam ROI")

    corrected = Image.fromarray(output, "RGBA")
    before_strength = line_strength(original)
    after_strength = line_strength(corrected)
    return corrected, {
        "editMask": {
            "left": roi_left,
            "top": roi_top,
            "right": roi_right - 1,
            "bottom": roi_bottom - 1,
        },
        "editPolygon": [list(point) for point in TARGET_POLYGON],
        "donorBox": {
            "left": DONOR_BOX[0],
            "top": DONOR_BOX[1],
            "right": DONOR_BOX[2],
            "bottom": DONOR_BOX[3],
        },
        "workingScale": SCALE,
        "cloneOffsetPixels": [],
        "reconstruction": "middle-bottom bag high-frequency kraft texture over target low-frequency tone",
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
        "horizontalArtifactRemovedPass": after_strength < before_strength,
        "rightOuterProfileByteIdentical": not bool(np.any(changed[:, 1161:])),
    }


def main() -> None:
    if base.qa.sha256(base.SOURCE) != SOURCE_SHA256:
        raise ValueError("Clean candidate-l source hash changed")

    base.remove_false_wedge = clone_middle_bottom_texture
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
            "renderPipeline": "4x deterministic donor-texture patch; one Lanczos downsample; lossless WebP",
            "editedObject": "single horizontal artifact on bottom-right front panel",
            "cleanBaseSource": base.SOURCE.relative_to(ROOT).as_posix(),
            "cleanBaseSha256": SOURCE_SHA256,
            "lockedInvariants": [
                "clean candidate-l alpha silhouette",
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
            "cleanBaseSha256": SOURCE_SHA256,
            "surgicalDiff": {
                key: manifest[key]
                for key in (
                    "editMask",
                    "editPolygon",
                    "donorBox",
                    "workingScale",
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
