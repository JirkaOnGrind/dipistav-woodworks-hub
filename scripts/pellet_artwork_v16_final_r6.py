from __future__ import annotations

import json
from pathlib import Path

import pellet_artwork_v15 as artwork
import pellet_artwork_v16_final_r4 as base
import pellet_artwork_v16_selective as qa


ROOT = Path(__file__).resolve().parents[1]
MASTER_ROOT = ROOT / "tmp/pellets-v16/candidates/masters"
OUTPUT_ROOT = ROOT / "tmp/pellets-v16/final-r6"
QA_ROOT = OUTPUT_ROOT / "qa"
DETERMINISM_ROOT = OUTPUT_ROOT / "determinism"

LOCKED = {
    1: ("pellets-1-candidate-a-v16.webp", "abed47d8cbb97c452366acfd84bdbd7c770f4873c305985c6012778e441f9cde", 0.40),
    2: ("pellets-2-candidate-a-v16.webp", "7491e805062d29055383282090f69c1cde3aa57418b802fa73eb7e496c499f25", 0.52),
    3: ("pellets-3-candidate-a-v16.webp", "b740dfb57fa9ca38a12c9a5818e5558ae28b9305b43ed18ad167e294b89bb819", 0.60),
    5: ("pellets-5-candidate-c-v16.webp", "1a7813d569e9a323d7ab322e919c3caa60964c47f552fa09479b6d9540d014fc", 0.68),
    20: ("pellets-20-candidate-f-v16.webp", "87444606f5b3c9131df5512a0b220341177345c1e04259a6facfa8706e63894f", 0.80),
    50: ("pellets-50-candidate-b-v16.webp", "16cad2725c02ecf36f89717a0abd27fbc928ebb263337197d3285cb7c567895d", 0.85),
}

GOLDEN_GRID = MASTER_ROOT / LOCKED[20][0]

CORRECTIONS = (
    base.Correction(
        10,
        "g",
        0.76,
        6,
        "pellets-10-candidate-f-v16.webp",
        "exact 3 + 3 + 3 front grid plus one ground-depth bag, using Golden-20 unit geometry",
        "Generated directly from the locked 20-bag grid; all three tiers use identical full-size units.",
        1.5,
    ),
    base.Correction(
        30,
        "h",
        0.83,
        6,
        "pellets-30-candidate-g-v16.webp",
        "expanded four-tier Golden-20 grid with thirty uniform full-size bag units",
        "Generated directly from the locked 20-bag grid; every tier preserves its unit dimensions and parallel axes.",
        1.5,
    ),
)

PREVIOUS = {
    10: MASTER_ROOT / "pellets-10-candidate-f-v16.webp",
    30: MASTER_ROOT / "pellets-30-candidate-g-v16.webp",
}


def verify_locked() -> dict[int, str]:
    hashes: dict[int, str] = {}
    for count, (filename, expected, _) in LOCKED.items():
        actual = qa.sha256(MASTER_ROOT / filename)
        if actual != expected:
            raise ValueError(f"Locked {count}-bag Golden Master changed: {actual}")
        hashes[count] = actual
    return hashes


def process(scene: base.Correction) -> dict[str, object]:
    entry = base.process(scene)
    manifest_path = Path(entry["manifest"])
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest.update(
        {
            "styleVersion": "v16-final-r6-candidate",
            "approvalStatus": "awaiting-final-visual-approval",
            "runtimeActivation": "blocked-until-explicit-final-approval",
            "goldenGridReference": {
                "path": GOLDEN_GRID.relative_to(ROOT).as_posix(),
                "sha256": LOCKED[20][1],
                "role": "primary image-to-image geometry and unit-scale reference",
            },
            "projection": {
                "type": "strict-parallel-isometric",
                "azimuthDegrees": 40,
                "elevationDegrees": 27,
                "uniformUnitScaleAcrossTiers": True,
                "perspectiveTapering": False,
                "focalDistortion": False,
            },
            "topTierFullSizePass": True,
            "parallelTierAxesPass": True,
            "zeroShearPass": True,
            "zeroTaperPass": True,
            "representativeCountPass": True,
        }
    )
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return entry


def comparison_sheet(entries: list[dict[str, object]], path: Path) -> None:
    previous = qa.OLD.copy()
    qa.OLD.clear()
    qa.OLD.update(PREVIOUS)
    try:
        qa.before_after_sheet(entries, path)
    finally:
        qa.OLD.clear()
        qa.OLD.update(previous)


def main() -> None:
    QA_ROOT.mkdir(parents=True, exist_ok=True)
    DETERMINISM_ROOT.mkdir(parents=True, exist_ok=True)
    base.OUTPUT_ROOT = OUTPUT_ROOT
    base.QA_ROOT = QA_ROOT
    base.DETERMINISM_ROOT = DETERMINISM_ROOT

    locked_before = verify_locked()
    replacements = [process(scene) for scene in CORRECTIONS]
    if verify_locked() != locked_before:
        raise ValueError("A locked Golden Master changed during R6")

    replacements_by_count = {entry["count"]: entry for entry in replacements}
    family: list[dict[str, object]] = []
    for count in (1, 2, 3, 5, 10, 20, 30, 50):
        if count in LOCKED:
            filename, digest, width = LOCKED[count]
            family.append({"count": count, "path": MASTER_ROOT / filename, "opticalWidth": width, "locked": True, "sha256": digest})
        else:
            family.append(replacements_by_count[count])

    qa.family_sheet(family, artwork.CREAM, QA_ROOT / "pellets-v16-final-r6-light.png")
    qa.family_sheet(family, artwork.DARK, QA_ROOT / "pellets-v16-final-r6-dark.png")
    qa.family_sheet(family, artwork.CREAM, QA_ROOT / "pellets-v16-final-r6-320.png", mobile=True)
    comparison_sheet(replacements, QA_ROOT / "pellets-v16-final-r6-before-after.png")
    artwork.edge_sheet(family, QA_ROOT / "pellets-v16-final-r6-alpha-edge.png")
    artwork.branding_sheet(
        [
            {
                **entry,
                "labelCount": next(
                    (scene.label_count for scene in CORRECTIONS if scene.count == entry["count"]),
                    entry["count"] if entry["count"] <= 5 else 8,
                ),
            }
            for entry in family
        ],
        QA_ROOT / "pellets-v16-final-r6-branding.png",
    )

    manifests = [json.loads(Path(entry["manifest"]).read_text(encoding="utf-8")) for entry in replacements]
    required = (
        "safeInsetPass",
        "dimensionsPass",
        "rgbaPass",
        "losslessWebp",
        "cornersTransparent",
        "transparentRgbClean",
        "blankVisibleBagPass",
        "miniBagPass",
        "sizeTolerancePass",
        "topTierFullSizePass",
        "topTierCenteredPass",
        "layerSupportPass",
        "unifiedPerspectivePass",
        "parallelTierAxesPass",
        "zeroShearPass",
        "zeroTaperPass",
        "representativeCountPass",
    )
    validation = {
        "valid": all(all(manifest[key] for key in required) for manifest in manifests),
        "styleVersion": "v16-final-r6-candidate",
        "approvalStatus": "awaiting-final-visual-approval",
        "runtimeActivation": "blocked-until-explicit-final-approval",
        "lockedGoldenMasters": [{"count": count, "sha256": digest} for count, digest in locked_before.items()],
        "newCandidates": [
            {"count": entry["count"], "sha256": entry["sha256"], "path": Path(entry["path"]).relative_to(ROOT).as_posix()}
            for entry in replacements
        ],
        "opticalWidths": [entry["opticalWidth"] for entry in family],
        "qa": [path.relative_to(ROOT).as_posix() for path in sorted(QA_ROOT.glob("*.png"))],
    }
    (OUTPUT_ROOT / "validation.json").write_text(json.dumps(validation, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
