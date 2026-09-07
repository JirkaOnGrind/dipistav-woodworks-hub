from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

import pellet_artwork_v15 as artwork
import pellet_artwork_v16_final_r7 as previous
import pellet_artwork_v16_final_r8 as base
import pellet_artwork_v16_selective as qa


ROOT = Path(__file__).resolve().parents[1]
MASTER_ROOT = ROOT / "tmp/pellets-v16/candidates/masters"
OUTPUT_ROOT = ROOT / "tmp/pellets-v16/final-r9"
QA_ROOT = OUTPUT_ROOT / "qa"
DETERMINISM_ROOT = OUTPUT_ROOT / "determinism"

SOURCE = MASTER_ROOT / "pellets-10-candidate-g-v16.webp"
OUTPUT = MASTER_ROOT / "pellets-10-candidate-j-v16.webp"
MANIFEST = MASTER_ROOT / "pellets-10-candidate-j-v16.manifest.json"


def configure_surgical_pipeline() -> None:
    base.GUIDE_SHIFT_X = -87
    base.OUTPUT = OUTPUT


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
            filename, digest, width = previous.LOCKED[count]
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


def validate_visible_right_wall(
    original: Image.Image,
    corrected: Image.Image,
) -> dict[str, object]:
    guide = base.register_guide(original)
    before = base.right_profile(np.array(original)[:, :, 3])
    after = base.right_profile(np.array(corrected)[:, :, 3])
    target = base.right_profile(np.array(guide)[:, :, 3])
    rows = range(540, 881)

    def max_overhang(profile: dict[int, int | None]) -> int:
        values = [
            profile[y] - target[y]
            for y in rows
            if profile[y] is not None and target[y] is not None
        ]
        return max(values, default=0)

    before_overhang = max_overhang(before)
    after_overhang = max_overhang(after)
    return {
        "alignmentCheckRows": {"top": 540, "bottom": 880},
        "maxRightOverhangBeforePx": int(before_overhang),
        "maxRightOverhangAfterPx": int(after_overhang),
        "rightWallAlignedPass": after_overhang <= 2,
        "alignmentTolerancePx": 2,
    }


def main() -> None:
    configure_surgical_pipeline()
    QA_ROOT.mkdir(parents=True, exist_ok=True)
    DETERMINISM_ROOT.mkdir(parents=True, exist_ok=True)
    locked_before = previous.verify_locked()

    original = Image.open(SOURCE).convert("RGBA")
    corrected, surgical = base.surgical_align(original)
    surgical.update(validate_visible_right_wall(original, corrected))
    verification = DETERMINISM_ROOT / OUTPUT.name
    corrected.save(verification, format="WEBP", lossless=True, exact=True, method=6)
    if OUTPUT.exists():
        if qa.sha256(OUTPUT) != qa.sha256(verification):
            raise ValueError("Existing 10-J differs from deterministic R9 render")
    else:
        corrected.save(OUTPUT, format="WEBP", lossless=True, exact=True, method=6)

    if previous.verify_locked() != locked_before:
        raise ValueError("A locked Golden Master changed during R9")

    facts = qa.technical_facts(corrected, OUTPUT)
    manifest = {
        **facts,
        **surgical,
        "id": "pellets-10-candidate-j-v16",
        "styleVersion": "v16-final-r9-candidate",
        "approvalStatus": "awaiting-final-visual-approval",
        "runtimeActivation": "blocked-until-explicit-final-approval",
        "representativeCount": 10,
        "targetOpticalWidth": 0.76,
        "source": SOURCE.relative_to(ROOT).as_posix(),
        "sourceSha256": qa.sha256(SOURCE),
        "guide": base.AI_GUIDE.relative_to(ROOT).as_posix(),
        "guideSha256": qa.sha256(base.AI_GUIDE),
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
    MANIFEST.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    family = family_entries(manifest["outputSha256"])
    qa.family_sheet(family, artwork.CREAM, QA_ROOT / "pellets-v16-final-r9-light.png")
    qa.family_sheet(family, artwork.DARK, QA_ROOT / "pellets-v16-final-r9-dark.png")
    qa.family_sheet(
        family,
        artwork.CREAM,
        QA_ROOT / "pellets-v16-final-r9-320.png",
        mobile=True,
    )
    old = qa.OLD.copy()
    qa.OLD.clear()
    qa.OLD[10] = SOURCE
    try:
        qa.before_after_sheet(
            [family[4]],
            QA_ROOT / "pellets-v16-final-r9-before-after.png",
        )
    finally:
        qa.OLD.clear()
        qa.OLD.update(old)
    artwork.edge_sheet(family, QA_ROOT / "pellets-v16-final-r9-alpha-edge.png")
    artwork.branding_sheet(
        [
            {**entry, "labelCount": entry["count"] if entry["count"] <= 5 else 8}
            for entry in family
        ],
        QA_ROOT / "pellets-v16-final-r9-branding.png",
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
        "styleVersion": "v16-final-r9-candidate",
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
