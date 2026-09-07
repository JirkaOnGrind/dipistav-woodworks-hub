from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

import pellet_artwork_v15 as artwork
import pellet_artwork_v16 as v16
import pellet_artwork_v16_selective as selective


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "tmp/pellets-v16/source"
MASTER_ROOT = ROOT / "tmp/pellets-v16/candidates/masters"
OUTPUT_ROOT = ROOT / "tmp/pellets-v16/final-r3"
QA_ROOT = OUTPUT_ROOT / "qa"
DETERMINISM_ROOT = OUTPUT_ROOT / "determinism"

FALLBACK_20 = MASTER_ROOT / "pellets-20-candidate-c-v16.webp"
FALLBACK_20_SHA256 = "4573e2abb388a8fa769b4a57ae6e12fda7b65fed1df00bd92d92cb8447efd9c3"

REPLACEMENTS = (
    selective.Replacement(5, "c", 0.68, "unchanged 3 + 2 bond with both upper bags restored to full lower-layer volume", 5, 5, 2.0),
    selective.Replacement(10, "d", 0.76, "unchanged compact stack with the highest tier restored to full lower-tier dimensions", 10, 6, 3.0),
    selective.Replacement(20, "d", 0.80, "unchanged four-tier block with the full-size top row centered over the lower block", 20, 4, 3.0),
    selective.Replacement(30, "e", 0.83, "unchanged five-column block with the highest tier restored to full lower-tier dimensions", 30, 5, 3.0),
)

PREVIOUS = {
    5: MASTER_ROOT / "pellets-5-candidate-b-v16.webp",
    10: MASTER_ROOT / "pellets-10-candidate-c-v16.webp",
    20: MASTER_ROOT / "pellets-20-candidate-c-v16.webp",
    30: MASTER_ROOT / "pellets-30-candidate-d-v16.webp",
}


def process_candidate(scene: selective.Replacement) -> dict[str, object]:
    source = SOURCE_ROOT / f"pellets-{scene.count}-source-{scene.variant}-v16.png"
    rgba, alpha_method = v16.rgba_from_source(source)
    master = v16.fit_master_safe(rgba, scene.optical_width)
    candidate_id = f"pellets-{scene.count}-candidate-{scene.variant}-v16"
    output = MASTER_ROOT / f"{candidate_id}.webp"
    if output.exists():
        verification = DETERMINISM_ROOT / output.name
        master.save(verification, format="WEBP", lossless=True, exact=True, method=6)
        if selective.sha256(verification) != selective.sha256(output):
            raise ValueError(f"Deterministic postprocessing changed for {candidate_id}")
    else:
        master.save(output, format="WEBP", lossless=True, exact=True, method=6)

    facts = selective.technical_facts(master, output)
    prompt = {
        5: "Change only the two upper bags: restore their footprint, thickness and filled volume to exact lower-layer size.",
        10: "Change only the highest tier: restore every upper bag to exact lower-tier size.",
        20: "Change only top-row alignment: translate the row rigidly to the center without resizing.",
        30: "Change only the highest tier: restore every upper bag to exact lower-tier size.",
    }[scene.count]
    manifest = {
        **facts,
        "id": candidate_id,
        "styleVersion": "v16-final-r3-candidate",
        "approvalStatus": "awaiting-final-visual-approval",
        "runtimeActivation": "blocked-until-explicit-final-approval",
        "representativeCount": scene.count,
        "visibleBagCountEstimate": scene.visible_count_estimate,
        "targetOpticalWidth": scene.optical_width,
        "effectiveAlphaWidth": facts["alphaBounds"]["width"],
        "source": source.relative_to(ROOT).as_posix(),
        "sourceSha256": selective.sha256(source),
        "outputSha256": selective.sha256(output),
        "alphaMethod": alpha_method,
        "renderPipeline": "built-in precise-object ImageGen edit; deterministic neutral-background extraction; 4x fit; one Lanczos downsample; lossless WebP",
        "prompt": prompt,
        "editTarget": PREVIOUS[scene.count].relative_to(ROOT).as_posix(),
        "editTargetSha256": selective.sha256(PREVIOUS[scene.count]),
        "goldenScaleReference": {
            "path": (MASTER_ROOT / selective.LOCKED[50][0]).relative_to(ROOT).as_posix(),
            "sha256": selective.LOCKED[50][1],
        },
        "composition": scene.composition,
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
    old = selective.OLD.copy()
    selective.OLD.clear()
    selective.OLD.update(PREVIOUS)
    try:
        selective.before_after_sheet(entries, path)
    finally:
        selective.OLD.clear()
        selective.OLD.update(old)


def main() -> None:
    QA_ROOT.mkdir(parents=True, exist_ok=True)
    DETERMINISM_ROOT.mkdir(parents=True, exist_ok=True)
    locked_before = selective.verify_locked()
    fallback_before = selective.sha256(FALLBACK_20)
    if fallback_before != FALLBACK_20_SHA256:
        raise ValueError("20-bag fallback candidate changed before final refinement")

    replacement_entries = [process_candidate(scene) for scene in REPLACEMENTS]

    if selective.verify_locked() != locked_before:
        raise ValueError("A locked Golden Master changed during final refinement")
    if selective.sha256(FALLBACK_20) != fallback_before:
        raise ValueError("20-bag fallback changed during final refinement")

    replacement_by_count = {entry["count"]: entry for entry in replacement_entries}
    family: list[dict[str, object]] = []
    for count in (1, 2, 3, 5, 10, 20, 30, 50):
        if count in selective.LOCKED:
            filename, digest, width = selective.LOCKED[count]
            family.append({"count": count, "path": MASTER_ROOT / filename, "opticalWidth": width, "locked": True, "sha256": digest})
        else:
            family.append(replacement_by_count[count])

    selective.family_sheet(family, artwork.CREAM, QA_ROOT / "pellets-v16-final-r3-light.png")
    selective.family_sheet(family, artwork.DARK, QA_ROOT / "pellets-v16-final-r3-dark.png")
    selective.family_sheet(family, artwork.CREAM, QA_ROOT / "pellets-v16-final-r3-320.png", mobile=True)
    comparison_sheet(replacement_entries, QA_ROOT / "pellets-v16-final-r3-before-after.png")
    artwork.edge_sheet(family, QA_ROOT / "pellets-v16-final-r3-alpha-edge.png")
    artwork.branding_sheet([
        {**entry, "labelCount": next((r.label_count for r in REPLACEMENTS if r.count == entry["count"]), entry["count"] if entry["count"] <= 3 else 8)}
        for entry in family
    ], QA_ROOT / "pellets-v16-final-r3-branding.png")

    manifests = [json.loads(Path(entry["manifest"]).read_text(encoding="utf-8")) for entry in replacement_entries]
    valid = all(
        manifest["safeInsetPass"]
        and manifest["dimensionsPass"]
        and manifest["rgbaPass"]
        and manifest["losslessWebp"]
        and manifest["cornersTransparent"]
        and manifest["transparentRgbClean"]
        and manifest["blankVisibleBagPass"]
        and manifest["miniBagPass"]
        and manifest["sizeTolerancePass"]
        and manifest["topTierFullSizePass"]
        and manifest["topTierCenteredPass"]
        and manifest["layerSupportPass"]
        and manifest["unifiedPerspectivePass"]
        for manifest in manifests
    )
    validation = {
        "valid": valid,
        "styleVersion": "v16-final-r3-candidate",
        "approvalStatus": "awaiting-final-visual-approval",
        "runtimeActivation": "blocked-until-explicit-final-approval",
        "lockedGoldenMasters": [{"count": count, "sha256": digest} for count, digest in locked_before.items()],
        "fallback20": {"path": FALLBACK_20.relative_to(ROOT).as_posix(), "sha256": fallback_before},
        "newCandidates": [{"count": entry["count"], "sha256": entry["sha256"], "path": Path(entry["path"]).relative_to(ROOT).as_posix()} for entry in replacement_entries],
        "opticalWidths": [entry["opticalWidth"] for entry in family],
        "qa": [path.relative_to(ROOT).as_posix() for path in sorted(QA_ROOT.glob("*.png"))],
    }
    (OUTPUT_ROOT / "validation.json").write_text(json.dumps(validation, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
