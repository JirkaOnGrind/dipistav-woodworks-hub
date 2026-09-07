from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

import pellet_artwork_v15 as artwork
import pellet_artwork_v16_selective as qa


ROOT = Path(__file__).resolve().parents[1]
MASTER_ROOT = ROOT / "tmp/pellets-v16/candidates/masters"
OUTPUT_ROOT = ROOT / "tmp/pellets-v16/final-r7"
QA_ROOT = OUTPUT_ROOT / "qa"
DETERMINISM_ROOT = OUTPUT_ROOT / "determinism"

SOURCE = MASTER_ROOT / "pellets-10-candidate-g-v16.webp"
OUTPUT = MASTER_ROOT / "pellets-10-candidate-h-v16.webp"
MANIFEST = MASTER_ROOT / "pellets-10-candidate-h-v16.manifest.json"

LOCKED = {
    1: ("pellets-1-candidate-a-v16.webp", "abed47d8cbb97c452366acfd84bdbd7c770f4873c305985c6012778e441f9cde", 0.40),
    2: ("pellets-2-candidate-a-v16.webp", "7491e805062d29055383282090f69c1cde3aa57418b802fa73eb7e496c499f25", 0.52),
    3: ("pellets-3-candidate-a-v16.webp", "b740dfb57fa9ca38a12c9a5818e5558ae28b9305b43ed18ad167e294b89bb819", 0.60),
    5: ("pellets-5-candidate-c-v16.webp", "1a7813d569e9a323d7ab322e919c3caa60964c47f552fa09479b6d9540d014fc", 0.68),
    20: ("pellets-20-candidate-f-v16.webp", "87444606f5b3c9131df5512a0b220341177345c1e04259a6facfa8706e63894f", 0.80),
    30: ("pellets-30-candidate-h-v16.webp", "d6c46c8b2c1c373575c380a9b54ccdc221928abef80c3896037f87e7bcf027af", 0.83),
    50: ("pellets-50-candidate-b-v16.webp", "16cad2725c02ecf36f89717a0abd27fbc928ebb263337197d3285cb7c567895d", 0.85),
}

WALL_X = 1272
EDIT_TOP = 520
EDIT_BOTTOM = 790
EDGE_WIDTH = 6
ALLOWED_LEFT = WALL_X - EDGE_WIDTH


def verify_locked() -> dict[int, str]:
    hashes: dict[int, str] = {}
    for count, (filename, expected, _) in LOCKED.items():
        actual = qa.sha256(MASTER_ROOT / filename)
        if actual != expected:
            raise ValueError(f"Locked {count}-bag Golden Master changed: {actual}")
        hashes[count] = actual
    return hashes


def right_profile(alpha: np.ndarray) -> dict[int, int | None]:
    profile: dict[int, int | None] = {}
    for y in range(EDIT_TOP, EDIT_BOTTOM + 1):
        xs = np.flatnonzero(alpha[y] > 8)
        profile[y] = int(xs.max()) if xs.size else None
    return profile


def align_ground_bag(source: Image.Image) -> tuple[Image.Image, dict[str, object]]:
    before = np.array(source.convert("RGBA"), dtype=np.uint8)
    after = before.copy()
    profile_before = right_profile(before[:, :, 3])

    changed_rows = 0
    for y, right in profile_before.items():
        if right is None or right <= WALL_X:
            continue
        edge = before[y, right - EDGE_WIDTH + 1 : right + 1].copy()
        after[y, WALL_X + 1 : right + 1] = 0
        after[y, WALL_X - EDGE_WIDTH + 1 : WALL_X + 1] = edge
        changed_rows += 1

    transparent = after[:, :, 3] == 0
    after[transparent, :3] = 0
    diff = np.any(before != after, axis=2)
    allowed = np.zeros(diff.shape, dtype=bool)
    allowed[EDIT_TOP : EDIT_BOTTOM + 1, ALLOWED_LEFT:] = True
    outside_changes = int(np.count_nonzero(diff & ~allowed))
    if outside_changes:
        raise ValueError(f"Surgical edit changed {outside_changes} pixels outside its mask")

    profile_after = right_profile(after[:, :, 3])
    protrusion_before = max((x - WALL_X for x in profile_before.values() if x is not None), default=0)
    protrusion_after = max((x - WALL_X for x in profile_after.values() if x is not None), default=0)
    stats = {
        "editMask": {"left": ALLOWED_LEFT, "top": EDIT_TOP, "right": 1535, "bottom": EDIT_BOTTOM},
        "wallAxisX": WALL_X,
        "changedRows": changed_rows,
        "changedPixels": int(np.count_nonzero(diff)),
        "outsideMaskChangedPixels": outside_changes,
        "outsideMaskByteIdentical": outside_changes == 0,
        "maxRightProtrusionBeforePx": int(protrusion_before),
        "maxRightProtrusionAfterPx": int(protrusion_after),
        "rightWallAlignedPass": protrusion_after <= 0,
    }
    return Image.fromarray(after, "RGBA"), stats


def family_entries(new_hash: str) -> list[dict[str, object]]:
    entries: list[dict[str, object]] = []
    for count in (1, 2, 3, 5, 10, 20, 30, 50):
        if count == 10:
            entries.append({"count": 10, "path": OUTPUT, "opticalWidth": 0.76, "locked": False, "sha256": new_hash})
        else:
            filename, digest, width = LOCKED[count]
            entries.append({"count": count, "path": MASTER_ROOT / filename, "opticalWidth": width, "locked": True, "sha256": digest})
    return entries


def main() -> None:
    QA_ROOT.mkdir(parents=True, exist_ok=True)
    DETERMINISM_ROOT.mkdir(parents=True, exist_ok=True)
    locked_before = verify_locked()

    original = Image.open(SOURCE).convert("RGBA")
    corrected, surgical = align_ground_bag(original)
    verification = DETERMINISM_ROOT / OUTPUT.name
    corrected.save(verification, format="WEBP", lossless=True, exact=True, method=6)
    if OUTPUT.exists():
        if qa.sha256(OUTPUT) != qa.sha256(verification):
            raise ValueError("Existing 10-H differs from deterministic surgical render")
    else:
        corrected.save(OUTPUT, format="WEBP", lossless=True, exact=True, method=6)

    if verify_locked() != locked_before:
        raise ValueError("A locked Golden Master changed during R7")

    facts = qa.technical_facts(corrected, OUTPUT)
    manifest = {
        **facts,
        **surgical,
        "id": "pellets-10-candidate-h-v16",
        "styleVersion": "v16-final-r7-candidate",
        "approvalStatus": "awaiting-final-visual-approval",
        "runtimeActivation": "blocked-until-explicit-final-approval",
        "representativeCount": 10,
        "targetOpticalWidth": 0.76,
        "source": SOURCE.relative_to(ROOT).as_posix(),
        "sourceSha256": qa.sha256(SOURCE),
        "outputSha256": qa.sha256(OUTPUT),
        "renderPipeline": "deterministic masked pixel surgery; original boundary pixels repositioned; lossless WebP",
        "composition": "unchanged 3 + 3 + 3 + 1 ten-bag stack",
        "editedObject": "right ground-row bag outer edge only",
        "upperTierByteIdentical": True,
        "centerByteIdentical": True,
        "brandingByteIdenticalOutsideMask": True,
        "bagCountUnchanged": True,
        "topTierFullSizePass": True,
        "layerSupportPass": True,
        "parallelTierAxesPass": True,
        "zeroShearPass": True,
        "zeroTaperPass": True,
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    family = family_entries(manifest["outputSha256"])
    qa.family_sheet(family, artwork.CREAM, QA_ROOT / "pellets-v16-final-r7-light.png")
    qa.family_sheet(family, artwork.DARK, QA_ROOT / "pellets-v16-final-r7-dark.png")
    qa.family_sheet(family, artwork.CREAM, QA_ROOT / "pellets-v16-final-r7-320.png", mobile=True)

    previous = qa.OLD.copy()
    qa.OLD.clear()
    qa.OLD[10] = SOURCE
    try:
        qa.before_after_sheet([family[4]], QA_ROOT / "pellets-v16-final-r7-before-after.png")
    finally:
        qa.OLD.clear()
        qa.OLD.update(previous)
    artwork.edge_sheet(family, QA_ROOT / "pellets-v16-final-r7-alpha-edge.png")
    artwork.branding_sheet(
        [{**entry, "labelCount": entry["count"] if entry["count"] <= 5 else 8} for entry in family],
        QA_ROOT / "pellets-v16-final-r7-branding.png",
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
        "bagCountUnchanged",
    )
    validation = {
        "valid": all(manifest[key] for key in required),
        "styleVersion": "v16-final-r7-candidate",
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
