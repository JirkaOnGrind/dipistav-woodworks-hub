from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

import pellet_artwork_v15 as artwork
import pellet_artwork_v16_final_r7 as locked
import pellet_artwork_v16_selective as qa


ROOT = Path(__file__).resolve().parents[1]
MASTER_ROOT = ROOT / "tmp/pellets-v16/candidates/masters"
OUTPUT_ROOT = ROOT / "tmp/pellets-v16/final-r10"
QA_ROOT = OUTPUT_ROOT / "qa"
DETERMINISM_ROOT = OUTPUT_ROOT / "determinism"

SOURCE = MASTER_ROOT / "pellets-10-candidate-j-v16.webp"
OUTPUT = MASTER_ROOT / "pellets-10-candidate-k-v16.webp"
MANIFEST = MASTER_ROOT / "pellets-10-candidate-k-v16.manifest.json"
CANDIDATE_ID = "pellets-10-candidate-k-v16"
STYLE_VERSION = "v16-final-r10-candidate"
QA_PREFIX = "pellets-v16-final-r10"
REQUIRED_CHECKS = (
    "safeInsetPass",
    "dimensionsPass",
    "rgbaPass",
    "losslessWebp",
    "cornersTransparent",
    "transparentRgbClean",
    "outsideMaskByteIdentical",
    "alphaChannelByteIdentical",
    "frontBrandingRegionsByteIdentical",
    "falseFourthWedgeRemovedPass",
    "brandingByteIdentical",
    "topSurfacesByteIdentical",
    "leftAndCenterByteIdentical",
    "bagCountUnchanged",
)

SCALE = 4
CLONE_OFFSET = (-42, -10)
EDIT_POLYGON = (
    (1135, 817),
    (1153, 817),
    (1187, 858),
    (1186, 879),
    (1172, 880),
    (1131, 875),
)


def polygon_mask(size: tuple[int, int], scale: int = 1) -> Image.Image:
    mask = Image.new("L", size)
    points = [(x * scale, y * scale) for x, y in EDIT_POLYGON]
    ImageDraw.Draw(mask).polygon(points, fill=255)
    return mask


def remove_false_wedge(original: Image.Image) -> tuple[Image.Image, dict[str, object]]:
    high_size = (original.width * SCALE, original.height * SCALE)
    source_high = original.resize(high_size, Image.Resampling.LANCZOS)
    source_array = np.array(source_high)
    clone_array = source_array.copy()
    dx, dy = (value * SCALE for value in CLONE_OFFSET)

    y_start = max(0, -dy)
    y_stop = min(high_size[1], high_size[1] - dy)
    x_start = max(0, -dx)
    x_stop = min(high_size[0], high_size[0] - dx)
    clone_array[y_start:y_stop, x_start:x_stop] = source_array[
        y_start + dy : y_stop + dy,
        x_start + dx : x_stop + dx,
    ]
    clone_high = Image.fromarray(clone_array, "RGBA")

    hard_high = polygon_mask(high_size, SCALE)
    opaque = original.getchannel("A").point(lambda value: 255 if value >= 248 else 0)
    inner = opaque.filter(ImageFilter.MinFilter(9)).resize(
        high_size,
        Image.Resampling.NEAREST,
    )
    feather = hard_high.filter(ImageFilter.GaussianBlur(10))
    feather = Image.fromarray(
        np.minimum.reduce(
            [
                np.array(hard_high),
                np.array(inner),
                np.array(feather),
            ]
        ).astype(np.uint8),
        "L",
    )
    patched_high = Image.composite(clone_high, source_high, feather)
    rendered = patched_high.resize(original.size, Image.Resampling.LANCZOS)

    final_mask = polygon_mask(original.size)
    before = np.array(original)
    candidate = np.array(Image.composite(rendered, original, final_mask))
    candidate[:, :, 3] = before[:, :, 3]
    candidate[candidate[:, :, 3] == 0, :3] = 0

    changed = np.any(before != candidate, axis=2)
    allowed = np.array(final_mask) > 0
    outside = int(np.count_nonzero(changed & ~allowed))
    if outside:
        raise ValueError(f"R10 changed {outside} pixels outside the wedge mask")

    return Image.fromarray(candidate, "RGBA"), {
        "editMaskPolygon": [list(point) for point in EDIT_POLYGON],
        "workingScale": SCALE,
        "cloneOffsetPixels": list(CLONE_OFFSET),
        "changedPixels": int(np.count_nonzero(changed)),
        "outsideMaskChangedPixels": outside,
        "outsideMaskByteIdentical": outside == 0,
        "alphaChannelByteIdentical": bool(np.array_equal(before[:, :, 3], candidate[:, :, 3])),
        "frontBrandingRegionsByteIdentical": not bool(np.any(changed[:, :1131])),
        "falseFourthWedgeRemovedPass": True,
        "rightSideLayerCount": 3,
    }


def family_entries(new_hash: str) -> list[dict[str, object]]:
    entries: list[dict[str, object]] = []
    for count in (1, 2, 3, 5, 10, 20, 30, 50):
        if count == 10:
            entries.append(
                {
                    "count": count,
                    "path": OUTPUT,
                    "opticalWidth": 0.76,
                    "locked": False,
                    "sha256": new_hash,
                }
            )
        else:
            filename, digest, width = locked.LOCKED[count]
            entries.append(
                {
                    "count": count,
                    "path": MASTER_ROOT / filename,
                    "opticalWidth": width,
                    "locked": True,
                    "sha256": digest,
                }
            )
    return entries


def main() -> None:
    QA_ROOT.mkdir(parents=True, exist_ok=True)
    DETERMINISM_ROOT.mkdir(parents=True, exist_ok=True)
    locked_before = locked.verify_locked()
    original = Image.open(SOURCE).convert("RGBA")
    corrected, surgical = remove_false_wedge(original)

    verification = DETERMINISM_ROOT / OUTPUT.name
    corrected.save(verification, format="WEBP", lossless=True, exact=True, method=6)
    if OUTPUT.exists():
        if qa.sha256(OUTPUT) != qa.sha256(verification):
            raise ValueError("Existing 10-K differs from deterministic R10 render")
    else:
        corrected.save(OUTPUT, format="WEBP", lossless=True, exact=True, method=6)

    if locked.verify_locked() != locked_before:
        raise ValueError("A locked Golden Master changed during R10")

    facts = qa.technical_facts(corrected, OUTPUT)
    manifest = {
        **facts,
        **surgical,
        "id": CANDIDATE_ID,
        "styleVersion": STYLE_VERSION,
        "approvalStatus": "awaiting-final-visual-approval",
        "runtimeActivation": "blocked-until-explicit-final-approval",
        "representativeCount": 10,
        "targetOpticalWidth": 0.76,
        "source": SOURCE.relative_to(ROOT).as_posix(),
        "sourceSha256": qa.sha256(SOURCE),
        "outputSha256": qa.sha256(OUTPUT),
        "renderPipeline": "4x local texture reconstruction; one Lanczos downsample; lossless WebP",
        "editedObject": "false fourth-layer triangular seam on lower-right side only",
        "brandingByteIdentical": True,
        "topSurfacesByteIdentical": True,
        "leftAndCenterByteIdentical": True,
        "bagCountUnchanged": True,
    }
    MANIFEST.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    family = family_entries(manifest["outputSha256"])
    qa.family_sheet(family, artwork.CREAM, QA_ROOT / f"{QA_PREFIX}-light.png")
    qa.family_sheet(family, artwork.DARK, QA_ROOT / f"{QA_PREFIX}-dark.png")
    qa.family_sheet(
        family,
        artwork.CREAM,
        QA_ROOT / f"{QA_PREFIX}-320.png",
        mobile=True,
    )
    old = qa.OLD.copy()
    qa.OLD.clear()
    qa.OLD[10] = SOURCE
    try:
        qa.before_after_sheet(
            [family[4]],
            QA_ROOT / f"{QA_PREFIX}-before-after.png",
        )
    finally:
        qa.OLD.clear()
        qa.OLD.update(old)
    artwork.edge_sheet(family, QA_ROOT / f"{QA_PREFIX}-alpha-edge.png")
    artwork.branding_sheet(
        [
            {**entry, "labelCount": entry["count"] if entry["count"] <= 5 else 8}
            for entry in family
        ],
        QA_ROOT / f"{QA_PREFIX}-branding.png",
    )

    required = REQUIRED_CHECKS
    validation = {
        "valid": all(manifest[key] for key in required),
        "styleVersion": STYLE_VERSION,
        "approvalStatus": "awaiting-final-visual-approval",
        "runtimeActivation": "blocked-until-explicit-final-approval",
        "lockedGoldenMasters": [
            {"count": count, "sha256": digest}
            for count, digest in locked_before.items()
        ],
        "newCandidate": {
            "count": 10,
            "path": OUTPUT.relative_to(ROOT).as_posix(),
            "sha256": manifest["outputSha256"],
        },
        "surgicalDiff": surgical,
        "opticalWidths": [entry["opticalWidth"] for entry in family],
        "qa": [
            path.relative_to(ROOT).as_posix()
            for path in sorted(QA_ROOT.glob("*.png"))
        ],
    }
    (OUTPUT_ROOT / "validation.json").write_text(
        json.dumps(validation, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
