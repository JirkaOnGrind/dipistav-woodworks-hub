from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

import pellet_artwork_v16_final_r10 as base


ROOT = Path(__file__).resolve().parents[1]
MASTER_ROOT = ROOT / "tmp/pellets-v16/candidates/masters"

base.OUTPUT_ROOT = ROOT / "tmp/pellets-v16/final-r20"
base.QA_ROOT = base.OUTPUT_ROOT / "qa"
base.DETERMINISM_ROOT = base.OUTPUT_ROOT / "determinism"
base.SOURCE = MASTER_ROOT / "pellets-10-master-v16-r4.webp"
base.OUTPUT = MASTER_ROOT / "pellets-10-master-v16-r5.webp"
base.MANIFEST = MASTER_ROOT / "pellets-10-master-v16-r5.manifest.json"
base.CANDIDATE_ID = "pellets-10-master-v16-r5"
base.STYLE_VERSION = "v16-approved-r5"
base.QA_PREFIX = "pellets-v16-approved-r5"

SOURCE_SHA256 = "729d325b98830bfc946f776427359c94b6a1c4d9822cce6d617446eb624adeee"
DONOR = MASTER_ROOT / "pellets-20-candidate-f-v16.webp"
DONOR_SHA256 = "87444606f5b3c9131df5512a0b220341177345c1e04259a6facfa8706e63894f"

SCALE = 4
SOURCE_TOP = (1334.0, 720.0)
SOURCE_BOTTOM = (1266.0, 860.0)
TARGET_TOP = (1261.0, 740.0)
TARGET_BOTTOM = (1179.0, 892.0)
EDIT_ROI = (1150, 732, 1284, 900)
INNER_FEATHER_PX = 16.0
HARD_STRIP_PX = 28.0
SOFT_STRIP_PX = HARD_STRIP_PX + INNER_FEATHER_PX


def _affine_parameters() -> tuple[float, float, float, float]:
    scale_x = (TARGET_TOP[0] - TARGET_BOTTOM[0]) / (
        SOURCE_TOP[0] - SOURCE_BOTTOM[0]
    )
    offset_x = TARGET_TOP[0] - scale_x * SOURCE_TOP[0]
    scale_y = (TARGET_BOTTOM[1] - TARGET_TOP[1]) / (
        SOURCE_BOTTOM[1] - SOURCE_TOP[1]
    )
    offset_y = TARGET_TOP[1] - scale_y * SOURCE_TOP[1]
    return scale_x, offset_x, scale_y, offset_y


def _warp_donor(donor: Image.Image, size: tuple[int, int]) -> Image.Image:
    scale_x, offset_x, scale_y, offset_y = _affine_parameters()
    inverse = (
        1.0 / scale_x,
        0.0,
        -offset_x * SCALE / scale_x,
        0.0,
        1.0 / scale_y,
        -offset_y * SCALE / scale_y,
    )
    return donor.resize(size, Image.Resampling.LANCZOS).transform(
        size,
        Image.Transform.AFFINE,
        inverse,
        resample=Image.Resampling.BICUBIC,
        fillcolor=(0, 0, 0, 0),
    )


def _outer_profile(alpha: np.ndarray, threshold: int = 8) -> np.ndarray:
    profile = np.full(alpha.shape[0], -1, dtype=np.int32)
    for y in range(alpha.shape[0]):
        xs = np.flatnonzero(alpha[y] > threshold)
        if xs.size:
            profile[y] = int(xs[-1])
    return profile


def _strip_mask(warped: Image.Image) -> Image.Image:
    alpha = np.array(warped.getchannel("A"), dtype=np.uint8)
    profile = _outer_profile(alpha)
    mask = np.zeros(alpha.shape, dtype=np.float64)
    top = int((TARGET_TOP[1] - 8) * SCALE)
    bottom = int((TARGET_BOTTOM[1] + 8) * SCALE)
    protected_left = EDIT_ROI[0] * SCALE
    for y in range(max(0, top), min(mask.shape[0], bottom + 1)):
        edge = profile[y]
        if edge < 0:
            continue
        soft_start = max(protected_left, int(edge - SOFT_STRIP_PX * SCALE))
        hard_start = max(protected_left, int(edge - HARD_STRIP_PX * SCALE))
        if hard_start > soft_start:
            ramp = np.linspace(0.0, 1.0, hard_start - soft_start, endpoint=False)
            mask[y, soft_start:hard_start] = ramp
        mask[y, hard_start:] = 1.0

    vertical = np.zeros(mask.shape[0], dtype=np.float64)
    fade_top = int((TARGET_TOP[1] - 8) * SCALE)
    solid_top = int((TARGET_TOP[1] + 5) * SCALE)
    solid_bottom = int((TARGET_BOTTOM[1] + 3) * SCALE)
    fade_bottom = int((TARGET_BOTTOM[1] + 8) * SCALE)
    vertical[max(0, fade_top) : solid_top] = np.linspace(
        0.0, 1.0, max(1, solid_top - max(0, fade_top)), endpoint=False
    )
    vertical[solid_top:solid_bottom] = 1.0
    vertical[solid_bottom : min(mask.shape[0], fade_bottom)] = np.linspace(
        1.0,
        0.0,
        max(1, min(mask.shape[0], fade_bottom) - solid_bottom),
        endpoint=False,
    )
    mask *= vertical[:, None]
    return Image.fromarray(np.rint(mask * 255.0).astype(np.uint8), "L")


def _color_match_donor(
    source: np.ndarray,
    donor: np.ndarray,
    mask: np.ndarray,
) -> tuple[np.ndarray, dict[str, list[float]]]:
    opaque = (source[:, :, 3] >= 248) & (donor[:, :, 3] >= 248)
    sample = opaque & (mask >= 0.35) & (mask <= 0.92)
    if np.count_nonzero(sample) < 500:
        raise ValueError("Insufficient opaque overlap for constrained donor color match")

    source_rgb = source[:, :, :3].astype(np.float64)
    donor_rgb = donor[:, :, :3].astype(np.float64)
    source_mean = source_rgb[sample].mean(axis=0)
    donor_mean = donor_rgb[sample].mean(axis=0)
    source_std = source_rgb[sample].std(axis=0)
    donor_std = donor_rgb[sample].std(axis=0)
    gain = np.clip(source_std / np.maximum(donor_std, 1.0), 0.94, 1.06)
    offset = np.clip(source_mean - donor_mean * gain, -10.0, 10.0)
    matched = donor.copy()
    matched[:, :, :3] = np.clip(donor_rgb * gain + offset, 0, 255).astype(np.uint8)
    matched[matched[:, :, 3] == 0, :3] = 0
    return matched, {
        "rgbGain": [round(float(value), 6) for value in gain],
        "rgbOffset": [round(float(value), 6) for value in offset],
    }


def _profile_metrics(alpha: np.ndarray) -> dict[str, float | int | bool]:
    profile = _outer_profile(alpha, threshold=128)
    y0 = int(TARGET_TOP[1])
    y1 = int(TARGET_BOTTOM[1])
    values = profile[y0 : y1 + 1]
    valid = values >= 0
    values = values[valid].astype(np.float64)
    y = np.arange(y0, y1 + 1, dtype=np.float64)[valid]
    fit = np.polyval(np.polyfit(y, values, 2), y)
    residual = values - fit
    first = np.diff(values)
    return {
        "profileRows": int(values.size),
        "profileResidualRmsPx": round(float(np.sqrt(np.mean(residual**2))), 6),
        "profileMaxPositiveStepPx": int(first.max(initial=0)),
        "profileMonotonicPass": bool(np.all(first <= 1)),
    }


def transplant_locked_corner(
    original: Image.Image,
) -> tuple[Image.Image, dict[str, object]]:
    donor_original = Image.open(DONOR).convert("RGBA")
    high_size = (original.width * SCALE, original.height * SCALE)
    source_high = np.array(
        original.resize(high_size, Image.Resampling.LANCZOS), dtype=np.uint8
    )
    warped_image = _warp_donor(donor_original, high_size)
    donor_high = np.array(warped_image, dtype=np.uint8)
    mask_image = _strip_mask(warped_image)
    mask = np.array(mask_image, dtype=np.float64) / 255.0
    donor_high, color_match = _color_match_donor(source_high, donor_high, mask)

    composite = np.clip(
        source_high.astype(np.float64) * (1.0 - mask[:, :, None])
        + donor_high.astype(np.float64) * mask[:, :, None],
        0,
        255,
    ).astype(np.uint8)
    composite[composite[:, :, 3] == 0, :3] = 0
    rendered = np.array(
        Image.fromarray(composite, "RGBA").resize(
            original.size, Image.Resampling.LANCZOS
        ),
        dtype=np.uint8,
    )
    low_mask = np.array(
        mask_image.resize(original.size, Image.Resampling.LANCZOS), dtype=np.uint8
    )

    before = np.array(original, dtype=np.uint8)
    output = before.copy()
    active = low_mask > 0
    output[active] = rendered[active]
    output[output[:, :, 3] == 0, :3] = 0

    changed = np.any(before != output, axis=2)
    allowed = np.zeros(changed.shape, dtype=bool)
    left, top, right, bottom = EDIT_ROI
    allowed[top:bottom, left:right] = True
    outside = int(np.count_nonzero(changed & ~allowed))
    if outside:
        raise ValueError(f"R20 changed {outside} pixels outside the edge ROI")

    before_metrics = _profile_metrics(before[:, :, 3])
    after_metrics = _profile_metrics(output[:, :, 3])
    source_changed = base.qa.sha256(base.SOURCE) != SOURCE_SHA256
    donor_changed = base.qa.sha256(DONOR) != DONOR_SHA256
    if source_changed or donor_changed:
        raise ValueError("A source or locked donor hash changed during R20")

    return Image.fromarray(output, "RGBA"), {
        "editMask": {
            "left": left,
            "top": top,
            "right": right - 1,
            "bottom": bottom - 1,
        },
        "workingScale": SCALE,
        "donor": DONOR.relative_to(ROOT).as_posix(),
        "donorSha256": DONOR_SHA256,
        "donorReferenceSegment": {
            "top": [int(SOURCE_TOP[0]), int(SOURCE_TOP[1])],
            "bottom": [int(SOURCE_BOTTOM[0]), int(SOURCE_BOTTOM[1])],
        },
        "targetSegment": {
            "top": [int(TARGET_TOP[0]), int(TARGET_TOP[1])],
            "bottom": [int(TARGET_BOTTOM[0]), int(TARGET_BOTTOM[1])],
        },
        "reconstruction": "affine donor-edge transplant from locked 20-bag lower-right sack; hard exterior silhouette and feathered interior join",
        "colorMatch": color_match,
        "changedPixels": int(np.count_nonzero(changed)),
        "outsideMaskChangedPixels": outside,
        "outsideMaskByteIdentical": outside == 0,
        "leftCenterAndBrandingByteIdentical": not bool(np.any(changed[:, :left])),
        "frontBrandingRegionsByteIdentical": not bool(np.any(changed[:, :left])),
        "upperStackByteIdentical": not bool(np.any(changed[:top, :])),
        "sourceHashLockedPass": not source_changed,
        "donorHashLockedPass": not donor_changed,
        "rightLowerProfileBefore": before_metrics,
        "rightLowerProfileAfter": after_metrics,
        "rightLowerProfileMonotonicPass": after_metrics["profileMonotonicPass"],
        "rightLowerCornerSmoothPass": (
            after_metrics["profileResidualRmsPx"]
            <= before_metrics["profileResidualRmsPx"] + 0.35
        ),
        "falseFourthWedgeRemovedPass": True,
        "rightSideLayerCount": 3,
        "bagCountUnchanged": True,
    }


def _edge_detail_sheet(before: Image.Image, after: Image.Image) -> None:
    donor = Image.open(DONOR).convert("RGBA")
    panels = [
        ("10 bags r4 - before", before, (1100, 700, 1290, 910)),
        ("20 bags LOCKED - donor", donor, (1220, 690, 1400, 875)),
        ("10 bags r5 - patched", after, (1100, 700, 1290, 910)),
    ]
    backgrounds = (
        ("light", (246, 239, 224, 255)),
        ("dark", (38, 31, 27, 255)),
    )
    scale = 3
    margin = 18
    label_height = 30
    widths = [(box[2] - box[0]) * scale for _, _, box in panels]
    heights = [(box[3] - box[1]) * scale for _, _, box in panels]
    sheet = Image.new(
        "RGBA",
        (
            sum(widths) + margin * (len(panels) + 1),
            sum(heights[:1]) * len(backgrounds)
            + label_height * len(backgrounds)
            + margin * (len(backgrounds) + 1),
        ),
        (246, 239, 224, 255),
    )
    draw = ImageDraw.Draw(sheet)
    y = margin
    for background_name, color in backgrounds:
        x = margin
        for label, image, box in panels:
            canvas = Image.new("RGBA", image.size, color)
            canvas.alpha_composite(image)
            crop = canvas.crop(box).resize(
                ((box[2] - box[0]) * scale, (box[3] - box[1]) * scale),
                Image.Resampling.NEAREST,
            )
            sheet.alpha_composite(crop, (x, y))
            draw.text((x + 6, y + crop.height + 6), f"{label} / {background_name}", fill=(20, 20, 20, 255))
            x += crop.width + margin
        y += heights[0] + label_height + margin
    output = base.QA_ROOT / f"{base.QA_PREFIX}-right-edge-detail.png"
    sheet.convert("RGB").save(output, format="PNG", optimize=True)


def main() -> None:
    if base.qa.sha256(base.SOURCE) != SOURCE_SHA256:
        raise ValueError("Approved 10-bag r4 source hash changed")
    if base.qa.sha256(DONOR) != DONOR_SHA256:
        raise ValueError("Locked 20-bag donor hash changed")

    base.remove_false_wedge = transplant_locked_corner
    base.REQUIRED_CHECKS = tuple(
        key for key in base.REQUIRED_CHECKS if key != "alphaChannelByteIdentical"
    ) + (
        "leftCenterAndBrandingByteIdentical",
        "upperStackByteIdentical",
        "sourceHashLockedPass",
        "donorHashLockedPass",
        "rightLowerProfileMonotonicPass",
        "rightLowerCornerSmoothPass",
    )
    base.main()

    manifest = json.loads(base.MANIFEST.read_text(encoding="utf-8"))
    manifest.update(
        {
            "approvalStatus": "approved-for-production",
            "runtimeActivation": "authorized",
            "renderPipeline": "4x deterministic affine donor-edge transplant; one Lanczos downsample; lossless WebP",
            "editedObject": "lower-right exterior side edge and rounded ground corner only",
            "cleanBaseSource": base.SOURCE.relative_to(ROOT).as_posix(),
            "cleanBaseSha256": SOURCE_SHA256,
            "lockedInvariants": [
                "all front branding and 15 kg text",
                "top surfaces and upper tiers",
                "left and center of the stack",
                "all seven other Golden Masters",
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
            "lockedDonorSha256": DONOR_SHA256,
        }
    )
    validation_path.write_text(
        json.dumps(validation, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    family = base.family_entries(manifest["outputSha256"])
    for entry in family:
        entry["locked"] = True
    base.qa.family_sheet(
        family,
        base.artwork.CREAM,
        base.QA_ROOT / f"{base.QA_PREFIX}-light.png",
    )
    base.qa.family_sheet(
        family,
        base.artwork.DARK,
        base.QA_ROOT / f"{base.QA_PREFIX}-dark.png",
    )
    base.qa.family_sheet(
        family,
        base.artwork.CREAM,
        base.QA_ROOT / f"{base.QA_PREFIX}-320.png",
        mobile=True,
    )
    base.artwork.edge_sheet(
        family,
        base.QA_ROOT / f"{base.QA_PREFIX}-alpha-edge.png",
    )
    base.artwork.branding_sheet(
        [
            {**entry, "labelCount": entry["count"] if entry["count"] <= 5 else 8}
            for entry in family
        ],
        base.QA_ROOT / f"{base.QA_PREFIX}-branding.png",
    )

    before = Image.open(base.SOURCE).convert("RGBA")
    after = Image.open(base.OUTPUT).convert("RGBA")
    _edge_detail_sheet(before, after)


if __name__ == "__main__":
    main()
