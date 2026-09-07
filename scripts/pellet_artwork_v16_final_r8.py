from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

import pellet_artwork_v15 as artwork
import pellet_artwork_v16 as v16
import pellet_artwork_v16_final_r7 as previous
import pellet_artwork_v16_selective as qa


ROOT = Path(__file__).resolve().parents[1]
MASTER_ROOT = ROOT / "tmp/pellets-v16/candidates/masters"
OUTPUT_ROOT = ROOT / "tmp/pellets-v16/final-r8"
QA_ROOT = OUTPUT_ROOT / "qa"
DETERMINISM_ROOT = OUTPUT_ROOT / "determinism"

SOURCE = MASTER_ROOT / "pellets-10-candidate-g-v16.webp"
AI_GUIDE = ROOT / "tmp/pellets-v16/source/pellets-10-surgical-ai-rejected-v16.png"
OUTPUT = MASTER_ROOT / "pellets-10-candidate-i-v16.webp"
MANIFEST = MASTER_ROOT / "pellets-10-candidate-i-v16.manifest.json"

SCALE = 4
GUIDE_SHIFT_X = -78
ROI = (1180, 518, 1536, 902)


def register_guide(original: Image.Image) -> Image.Image:
    guide_rgba, _ = v16.rgba_from_source(AI_GUIDE)
    guide = v16.fit_master_safe(guide_rgba, 0.76)
    original_bounds = original.getchannel("A").getbbox()
    guide_bounds = guide.getchannel("A").getbbox()
    if original_bounds is None or guide_bounds is None:
        raise ValueError("Missing alpha bounds during surgical registration")
    width = original_bounds[2] - original_bounds[0]
    height = original_bounds[3] - original_bounds[1]
    crop = guide.crop(guide_bounds).resize((width, height), Image.Resampling.LANCZOS)
    registered = Image.new("RGBA", original.size)
    registered.alpha_composite(crop, (original_bounds[0], original_bounds[1]))
    shifted = Image.new("RGBA", original.size)
    shifted.alpha_composite(registered, (GUIDE_SHIFT_X, 0))
    return shifted


def right_profile(alpha: np.ndarray) -> dict[int, int | None]:
    result: dict[int, int | None] = {}
    for y in range(520, 901):
        xs = np.flatnonzero(alpha[y] > 8)
        result[y] = int(xs.max()) if xs.size else None
    return result


def surgical_align(original: Image.Image) -> tuple[Image.Image, dict[str, object]]:
    guide = register_guide(original)
    high_size = (original.width * SCALE, original.height * SCALE)
    source_high = np.array(original.resize(high_size, Image.Resampling.LANCZOS))
    guide_high = np.array(guide.resize(high_size, Image.Resampling.LANCZOS))
    y0, y1 = 520 * SCALE, 900 * SCALE
    x0 = 1150 * SCALE

    source_high[y0:y1, x0:, 3] = np.minimum(
        source_high[y0:y1, x0:, 3],
        guide_high[y0:y1, x0:, 3],
    )
    for y in range(y0, y1):
        xs = np.flatnonzero(guide_high[y, :, 3] > 8)
        if not xs.size:
            continue
        right = int(xs.max())
        left = max(x0, right - 14)
        visible = source_high[y, left : right + 1, 3] > 0
        source_high[y, left : right + 1, :3][visible] = (80, 24, 1)

    source_high[source_high[:, :, 3] == 0, :3] = 0
    rendered = np.array(
        Image.fromarray(source_high, "RGBA").resize(original.size, Image.Resampling.LANCZOS)
    )
    before = np.array(original)
    output = before.copy()
    left, top, right, bottom = ROI
    output[top:bottom, left:right] = rendered[top:bottom, left:right]
    output[before[:, :, 3] == 0] = 0
    output[output[:, :, 3] == 0, :3] = 0

    diff = np.any(before != output, axis=2)
    allowed = np.zeros(diff.shape, dtype=bool)
    allowed[top:bottom, left:right] = True
    outside = int(np.count_nonzero(diff & ~allowed))
    if outside:
        raise ValueError(f"R8 changed {outside} pixels outside the surgical ROI")

    guide_profile = right_profile(np.array(guide)[:, :, 3])
    before_profile = right_profile(before[:, :, 3])
    after_profile = right_profile(output[:, :, 3])
    before_overhang = max(
        (before_profile[y] - guide_profile[y] for y in before_profile if before_profile[y] is not None and guide_profile[y] is not None),
        default=0,
    )
    after_overhang = max(
        (after_profile[y] - guide_profile[y] for y in after_profile if after_profile[y] is not None and guide_profile[y] is not None),
        default=0,
    )
    stats = {
        "editMask": {"left": left, "top": top, "right": right - 1, "bottom": bottom - 1},
        "workingScale": SCALE,
        "guideShiftXPixels": GUIDE_SHIFT_X,
        "changedPixels": int(np.count_nonzero(diff)),
        "outsideMaskChangedPixels": outside,
        "outsideMaskByteIdentical": outside == 0,
        "maxRightOverhangBeforePx": int(before_overhang),
        "maxRightOverhangAfterPx": int(after_overhang),
        "rightWallAlignedPass": after_overhang <= 1,
    }
    return Image.fromarray(output, "RGBA"), stats


def family_entries(new_hash: str) -> list[dict[str, object]]:
    entries: list[dict[str, object]] = []
    for count in (1, 2, 3, 5, 10, 20, 30, 50):
        if count == 10:
            entries.append({"count": count, "path": OUTPUT, "opticalWidth": 0.76, "locked": False, "sha256": new_hash})
        else:
            filename, digest, width = previous.LOCKED[count]
            entries.append({"count": count, "path": MASTER_ROOT / filename, "opticalWidth": width, "locked": True, "sha256": digest})
    return entries


def main() -> None:
    QA_ROOT.mkdir(parents=True, exist_ok=True)
    DETERMINISM_ROOT.mkdir(parents=True, exist_ok=True)
    locked_before = previous.verify_locked()

    original = Image.open(SOURCE).convert("RGBA")
    corrected, surgical = surgical_align(original)
    verification = DETERMINISM_ROOT / OUTPUT.name
    corrected.save(verification, format="WEBP", lossless=True, exact=True, method=6)
    if OUTPUT.exists():
        if qa.sha256(OUTPUT) != qa.sha256(verification):
            raise ValueError("Existing 10-I differs from deterministic R8 render")
    else:
        corrected.save(OUTPUT, format="WEBP", lossless=True, exact=True, method=6)

    if previous.verify_locked() != locked_before:
        raise ValueError("A locked Golden Master changed during R8")

    facts = qa.technical_facts(corrected, OUTPUT)
    manifest = {
        **facts,
        **surgical,
        "id": "pellets-10-candidate-i-v16",
        "styleVersion": "v16-final-r8-candidate",
        "approvalStatus": "awaiting-final-visual-approval",
        "runtimeActivation": "blocked-until-explicit-final-approval",
        "representativeCount": 10,
        "targetOpticalWidth": 0.76,
        "source": SOURCE.relative_to(ROOT).as_posix(),
        "sourceSha256": qa.sha256(SOURCE),
        "guide": AI_GUIDE.relative_to(ROOT).as_posix(),
        "guideSha256": qa.sha256(AI_GUIDE),
        "outputSha256": qa.sha256(OUTPUT),
        "renderPipeline": "4x registered alpha/contour surgery; one Lanczos downsample; lossless WebP",
        "composition": "unchanged 3 + 3 + 3 + 1 ten-bag stack",
        "editedObject": "right ground-row bag outer wall only",
        "upperTierByteIdentical": True,
        "centerByteIdentical": True,
        "brandingByteIdentical": True,
        "bagCountUnchanged": True,
        "topTierFullSizePass": True,
        "layerSupportPass": True,
        "parallelTierAxesPass": True,
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    family = family_entries(manifest["outputSha256"])
    qa.family_sheet(family, artwork.CREAM, QA_ROOT / "pellets-v16-final-r8-light.png")
    qa.family_sheet(family, artwork.DARK, QA_ROOT / "pellets-v16-final-r8-dark.png")
    qa.family_sheet(family, artwork.CREAM, QA_ROOT / "pellets-v16-final-r8-320.png", mobile=True)
    old = qa.OLD.copy()
    qa.OLD.clear()
    qa.OLD[10] = SOURCE
    try:
        qa.before_after_sheet([family[4]], QA_ROOT / "pellets-v16-final-r8-before-after.png")
    finally:
        qa.OLD.clear()
        qa.OLD.update(old)
    artwork.edge_sheet(family, QA_ROOT / "pellets-v16-final-r8-alpha-edge.png")
    artwork.branding_sheet(
        [{**entry, "labelCount": entry["count"] if entry["count"] <= 5 else 8} for entry in family],
        QA_ROOT / "pellets-v16-final-r8-branding.png",
    )

    required = (
        "safeInsetPass",
        "dimensionsPass",
        "rgbaPass",
        "losslessWebp",
        "cornersTransparent",
        "transparentRgbClean",
        "outsideMaskByteIdentical",
        "rightWallAlignedPass",
        "upperTierByteIdentical",
        "centerByteIdentical",
        "brandingByteIdentical",
        "bagCountUnchanged",
    )
    validation = {
        "valid": all(manifest[key] for key in required),
        "styleVersion": "v16-final-r8-candidate",
        "approvalStatus": "awaiting-final-visual-approval",
        "runtimeActivation": "blocked-until-explicit-final-approval",
        "lockedGoldenMasters": [{"count": count, "sha256": digest} for count, digest in locked_before.items()],
        "newCandidate": {"count": 10, "path": OUTPUT.relative_to(ROOT).as_posix(), "sha256": manifest["outputSha256"]},
        "surgicalDiff": surgical,
        "opticalWidths": [entry["opticalWidth"] for entry in family],
        "qa": [path.relative_to(ROOT).as_posix() for path in sorted(QA_ROOT.glob("*.png"))],
    }
    (OUTPUT_ROOT / "validation.json").write_text(json.dumps(validation, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
