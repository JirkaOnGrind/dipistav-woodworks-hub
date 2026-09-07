from __future__ import annotations

import json
from pathlib import Path

import pellet_artwork_v15 as artwork
import pellet_artwork_v16_final_r4 as base
import pellet_artwork_v16_selective as qa


ROOT = Path(__file__).resolve().parents[1]
MASTER_ROOT = ROOT / "tmp/pellets-v16/candidates/masters"
OUTPUT_ROOT = ROOT / "tmp/pellets-v16/final-r5"
QA_ROOT = OUTPUT_ROOT / "qa"
DETERMINISM_ROOT = OUTPUT_ROOT / "determinism"

CORRECTIONS = (
    base.Correction(
        10,
        "f",
        0.76,
        6,
        "pellets-10-candidate-e-v16.webp",
        "three-tier ten-bag stack with three full-scale bags in the highest tier",
        "The highest tier was rebuilt in strict parallel isometry with the same unit footprint as the lower tiers.",
        2.0,
    ),
    base.Correction(
        20,
        "f",
        0.80,
        5,
        "pellets-20-candidate-e-v16.webp",
        "twenty full-size bags in four straight isometric tiers without taper or shear",
        "The block was reprojected to the 30/50 Golden geometry; all four tiers share parallel axes and uniform unit scale.",
        2.0,
    ),
    base.Correction(
        30,
        "g",
        0.83,
        5,
        "pellets-30-candidate-f-v16.webp",
        "preserved thirty-bag axonometric block with a full-scale fourth tier",
        "Only the highest tier was rebuilt; its bags now match the projected length and depth of the lower units.",
        2.0,
    ),
)

PREVIOUS = {
    10: MASTER_ROOT / "pellets-10-candidate-e-v16.webp",
    20: MASTER_ROOT / "pellets-20-candidate-e-v16.webp",
    30: MASTER_ROOT / "pellets-30-candidate-f-v16.webp",
}


def process(scene: base.Correction) -> dict[str, object]:
    entry = base.process(scene)
    manifest_path = Path(entry["manifest"])
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest.update(
        {
            "styleVersion": "v16-final-r5-candidate",
            "approvalStatus": "awaiting-final-visual-approval",
            "runtimeActivation": "blocked-until-explicit-final-approval",
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

    locked_before = base.verify_locked()
    fallback_before = qa.sha256(base.FALLBACK_20)
    if fallback_before != base.FALLBACK_20_SHA256:
        raise ValueError("20-bag fallback candidate changed before R5")

    replacements = [process(scene) for scene in CORRECTIONS]
    if base.verify_locked() != locked_before:
        raise ValueError("A locked Golden Master changed during R5")
    if qa.sha256(base.FALLBACK_20) != fallback_before:
        raise ValueError("20-bag fallback changed during R5")

    replacements_by_count = {entry["count"]: entry for entry in replacements}
    family: list[dict[str, object]] = []
    for count in (1, 2, 3, 5, 10, 20, 30, 50):
        if count in base.LOCKED:
            filename, digest, width = base.LOCKED[count]
            family.append({"count": count, "path": MASTER_ROOT / filename, "opticalWidth": width, "locked": True, "sha256": digest})
        else:
            family.append(replacements_by_count[count])

    qa.family_sheet(family, artwork.CREAM, QA_ROOT / "pellets-v16-final-r5-light.png")
    qa.family_sheet(family, artwork.DARK, QA_ROOT / "pellets-v16-final-r5-dark.png")
    qa.family_sheet(family, artwork.CREAM, QA_ROOT / "pellets-v16-final-r5-320.png", mobile=True)
    comparison_sheet(replacements, QA_ROOT / "pellets-v16-final-r5-before-after.png")
    artwork.edge_sheet(family, QA_ROOT / "pellets-v16-final-r5-alpha-edge.png")
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
        QA_ROOT / "pellets-v16-final-r5-branding.png",
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
    )
    validation = {
        "valid": all(all(manifest[key] for key in required) for manifest in manifests),
        "styleVersion": "v16-final-r5-candidate",
        "approvalStatus": "awaiting-final-visual-approval",
        "runtimeActivation": "blocked-until-explicit-final-approval",
        "lockedGoldenMasters": [{"count": count, "sha256": digest} for count, digest in locked_before.items()],
        "fallback20": {"path": base.FALLBACK_20.relative_to(ROOT).as_posix(), "sha256": fallback_before},
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
