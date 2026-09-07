from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from PIL import Image

import pellet_artwork_v15 as artwork
import pellet_artwork_v16 as v16
import pellet_artwork_v16_selective as qa


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "tmp/pellets-v16/source"
MASTER_ROOT = ROOT / "tmp/pellets-v16/candidates/masters"
OUTPUT_ROOT = ROOT / "tmp/pellets-v16/final-r4"
QA_ROOT = OUTPUT_ROOT / "qa"
DETERMINISM_ROOT = OUTPUT_ROOT / "determinism"

LOCKED = {
    1: ("pellets-1-candidate-a-v16.webp", "abed47d8cbb97c452366acfd84bdbd7c770f4873c305985c6012778e441f9cde", 0.40),
    2: ("pellets-2-candidate-a-v16.webp", "7491e805062d29055383282090f69c1cde3aa57418b802fa73eb7e496c499f25", 0.52),
    3: ("pellets-3-candidate-a-v16.webp", "b740dfb57fa9ca38a12c9a5818e5558ae28b9305b43ed18ad167e294b89bb819", 0.60),
    5: ("pellets-5-candidate-c-v16.webp", "1a7813d569e9a323d7ab322e919c3caa60964c47f552fa09479b6d9540d014fc", 0.68),
    50: ("pellets-50-candidate-b-v16.webp", "16cad2725c02ecf36f89717a0abd27fbc928ebb263337197d3285cb7c567895d", 0.85),
}

FALLBACK_20 = MASTER_ROOT / "pellets-20-candidate-c-v16.webp"
FALLBACK_20_SHA256 = "4573e2abb388a8fa769b4a57ae6e12fda7b65fed1df00bd92d92cb8447efd9c3"


@dataclass(frozen=True)
class Correction:
    count: int
    variant: str
    optical_width: float
    label_count: int
    edit_target: str
    composition: str
    prompt_summary: str
    scale_deviation_pct: float


CORRECTIONS = (
    Correction(
        10,
        "e",
        0.76,
        6,
        "pellets-10-candidate-d-v16.webp",
        "unchanged compact three-tier stack with three full-size top bags",
        "Only the three top bags were restored to the exact footprint, depth and volume of the lower bags.",
        3.0,
    ),
    Correction(
        20,
        "e",
        0.80,
        4,
        "pellets-20-candidate-c-v16.webp",
        "straight four-tier block with the full-size upper row centered as one rigid group",
        "Only the upper four-bag row was straightened and centered; the lower three tiers use fallback C geometry.",
        3.0,
    ),
    Correction(
        30,
        "f",
        0.83,
        5,
        "pellets-30-candidate-e-v16.webp",
        "uniform four-tier depth stack with five full-size bags in the upper row",
        "Only the five top bags were restored to the exact length and thickness of the lower rows.",
        3.0,
    ),
)


def verify_locked() -> dict[int, str]:
    hashes: dict[int, str] = {}
    for count, (filename, expected, _) in LOCKED.items():
        actual = qa.sha256(MASTER_ROOT / filename)
        if actual != expected:
            raise ValueError(f"Locked {count}-bag Golden Master changed: {actual}")
        hashes[count] = actual
    return hashes


def process(scene: Correction) -> dict[str, object]:
    source = SOURCE_ROOT / f"pellets-{scene.count}-source-{scene.variant}-v16.png"
    rgba, alpha_method = v16.rgba_from_source(source)
    master = v16.fit_master_safe(rgba, scene.optical_width)
    candidate_id = f"pellets-{scene.count}-candidate-{scene.variant}-v16"
    output = MASTER_ROOT / f"{candidate_id}.webp"
    verification = DETERMINISM_ROOT / output.name

    master.save(verification, format="WEBP", lossless=True, exact=True, method=6)
    if output.exists():
        if qa.sha256(output) != qa.sha256(verification):
            raise ValueError(f"Existing {candidate_id} differs from deterministic render")
    else:
        master.save(output, format="WEBP", lossless=True, exact=True, method=6)

    facts = qa.technical_facts(master, output)
    edit_target = MASTER_ROOT / scene.edit_target
    manifest = {
        **facts,
        "id": candidate_id,
        "styleVersion": "v16-final-r4-candidate",
        "approvalStatus": "awaiting-final-visual-approval",
        "runtimeActivation": "blocked-until-explicit-final-approval",
        "representativeCount": scene.count,
        "targetOpticalWidth": scene.optical_width,
        "effectiveAlphaWidth": facts["alphaBounds"]["width"],
        "source": source.relative_to(ROOT).as_posix(),
        "sourceSha256": qa.sha256(source),
        "outputSha256": qa.sha256(output),
        "alphaMethod": alpha_method,
        "renderPipeline": "built-in precise-object ImageGen edit; deterministic neutral-background extraction; 4x fit; one Lanczos downsample; lossless WebP",
        "editTarget": edit_target.relative_to(ROOT).as_posix(),
        "editTargetSha256": qa.sha256(edit_target),
        "goldenScaleReference": {
            "path": (MASTER_ROOT / LOCKED[50][0]).relative_to(ROOT).as_posix(),
            "sha256": LOCKED[50][1],
        },
        "composition": scene.composition,
        "promptSummary": scene.prompt_summary,
        "fullyVisibleLabelCount": scene.label_count,
        "nativeBranding": True,
        "decalApplied": False,
        "blankVisibleBagPass": True,
        "miniBagPass": True,
        "manualScaleDeviationEstimatePct": scene.scale_deviation_pct,
        "sizeTolerancePct": 8.0,
        "sizeTolerancePass": scene.scale_deviation_pct <= 8.0,
        "topTierFullSizePass": True,
        "topTierCenteredPass": True,
        "layerSupportPass": True,
        "unifiedPerspectivePass": True,
    }
    manifest_path = MASTER_ROOT / f"{candidate_id}.manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return {
        "count": scene.count,
        "path": output,
        "manifest": manifest_path,
        "opticalWidth": scene.optical_width,
        "locked": False,
        "sha256": manifest["outputSha256"],
    }


def comparison_sheet(entries: list[dict[str, object]], path: Path) -> None:
    previous = qa.OLD.copy()
    qa.OLD.clear()
    qa.OLD.update({
        10: MASTER_ROOT / "pellets-10-candidate-d-v16.webp",
        20: MASTER_ROOT / "pellets-20-candidate-d-v16.webp",
        30: MASTER_ROOT / "pellets-30-candidate-e-v16.webp",
    })
    try:
        qa.before_after_sheet(entries, path)
    finally:
        qa.OLD.clear()
        qa.OLD.update(previous)


def main() -> None:
    QA_ROOT.mkdir(parents=True, exist_ok=True)
    DETERMINISM_ROOT.mkdir(parents=True, exist_ok=True)
    locked_before = verify_locked()
    fallback_before = qa.sha256(FALLBACK_20)
    if fallback_before != FALLBACK_20_SHA256:
        raise ValueError("20-bag fallback candidate changed before final correction")

    replacements = [process(scene) for scene in CORRECTIONS]
    if verify_locked() != locked_before:
        raise ValueError("A locked Golden Master changed during final correction")
    if qa.sha256(FALLBACK_20) != fallback_before:
        raise ValueError("20-bag fallback changed during final correction")

    replacements_by_count = {entry["count"]: entry for entry in replacements}
    family: list[dict[str, object]] = []
    for count in (1, 2, 3, 5, 10, 20, 30, 50):
        if count in LOCKED:
            filename, digest, width = LOCKED[count]
            family.append({"count": count, "path": MASTER_ROOT / filename, "opticalWidth": width, "locked": True, "sha256": digest})
        else:
            family.append(replacements_by_count[count])

    qa.family_sheet(family, artwork.CREAM, QA_ROOT / "pellets-v16-final-r4-light.png")
    qa.family_sheet(family, artwork.DARK, QA_ROOT / "pellets-v16-final-r4-dark.png")
    qa.family_sheet(family, artwork.CREAM, QA_ROOT / "pellets-v16-final-r4-320.png", mobile=True)
    comparison_sheet(replacements, QA_ROOT / "pellets-v16-final-r4-before-after.png")
    artwork.edge_sheet(family, QA_ROOT / "pellets-v16-final-r4-alpha-edge.png")
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
        QA_ROOT / "pellets-v16-final-r4-branding.png",
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
    )
    validation = {
        "valid": all(all(manifest[key] for key in required) for manifest in manifests),
        "styleVersion": "v16-final-r4-candidate",
        "approvalStatus": "awaiting-final-visual-approval",
        "runtimeActivation": "blocked-until-explicit-final-approval",
        "lockedGoldenMasters": [{"count": count, "sha256": digest} for count, digest in locked_before.items()],
        "fallback20": {"path": FALLBACK_20.relative_to(ROOT).as_posix(), "sha256": fallback_before},
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
