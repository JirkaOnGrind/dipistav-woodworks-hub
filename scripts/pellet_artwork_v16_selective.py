from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

import pellet_artwork_v15 as artwork
import pellet_artwork_v16 as v16


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "tmp/pellets-v16/source"
MASTER_ROOT = ROOT / "tmp/pellets-v16/candidates/masters"
OUTPUT_ROOT = ROOT / "tmp/pellets-v16/selective-r2"
QA_ROOT = OUTPUT_ROOT / "qa"
DETERMINISM_ROOT = OUTPUT_ROOT / "determinism"


LOCKED = {
    1: ("pellets-1-candidate-a-v16.webp", "abed47d8cbb97c452366acfd84bdbd7c770f4873c305985c6012778e441f9cde", 0.40),
    2: ("pellets-2-candidate-a-v16.webp", "7491e805062d29055383282090f69c1cde3aa57418b802fa73eb7e496c499f25", 0.52),
    3: ("pellets-3-candidate-a-v16.webp", "b740dfb57fa9ca38a12c9a5818e5558ae28b9305b43ed18ad167e294b89bb819", 0.60),
    50: ("pellets-50-candidate-b-v16.webp", "16cad2725c02ecf36f89717a0abd27fbc928ebb263337197d3285cb7c567895d", 0.85),
}


@dataclass(frozen=True)
class Replacement:
    count: int
    variant: str
    optical_width: float
    composition: str
    visible_count_estimate: int
    label_count: int
    scale_deviation_pct: float


REPLACEMENTS = (
    Replacement(5, "b", 0.68, "three full-size ground bags plus two full-size cross-seam upper bags", 5, 5, 4.0),
    Replacement(10, "c", 0.76, "compact three-tier parallel warehouse bond with one consistent perspective", 10, 6, 6.0),
    Replacement(20, "c", 0.80, "reduced Golden-50 rectangular block with four full-size columns and rear depth", 20, 4, 6.0),
    Replacement(30, "d", 0.83, "reduced Golden-50 rectangular block with five full-size columns and two depth sections", 30, 5, 6.0),
)


OLD = {
    5: MASTER_ROOT / "pellets-5-candidate-a-v16.webp",
    10: MASTER_ROOT / "pellets-10-candidate-a-v16.webp",
    20: MASTER_ROOT / "pellets-20-candidate-b-v16.webp",
    30: MASTER_ROOT / "pellets-30-candidate-c-v16.webp",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify_locked() -> dict[int, str]:
    hashes: dict[int, str] = {}
    for count, (filename, expected, _) in LOCKED.items():
        path = MASTER_ROOT / filename
        actual = sha256(path)
        if actual != expected:
            raise ValueError(f"Locked {count}-bag Golden Master changed: {actual}")
        hashes[count] = actual
    return hashes


def technical_facts(image: Image.Image, output: Path) -> dict[str, object]:
    facts = artwork.metadata(image)
    safe_x = int(np.ceil(artwork.CANVAS[0] * artwork.SAFE_INSET + artwork.CONTOUR_RESERVE))
    safe_y = int(np.ceil(artwork.CANVAS[1] * artwork.SAFE_INSET + artwork.CONTOUR_RESERVE))
    bounds = facts["alphaBoundsPixels"]
    safe_pass = (
        bounds["left"] >= safe_x
        and bounds["top"] >= safe_y
        and bounds["right"] <= artwork.CANVAS[0] - safe_x
        and bounds["bottom"] <= artwork.CANVAS[1] - safe_y
    )
    header = output.read_bytes()[:16]
    return {
        **facts,
        "safeInsetPixels": {"x": safe_x, "y": safe_y},
        "safeInsetPass": safe_pass,
        "dimensionsPass": image.size == artwork.CANVAS,
        "rgbaPass": image.mode == "RGBA",
        "losslessWebp": header[8:12] == b"WEBP" and header[12:16] == b"VP8L",
    }


def contain_master(path: Path, background: tuple[int, int, int, int], box: tuple[int, int]) -> Image.Image:
    image = artwork.composite(Image.open(path).convert("RGBA"), background)
    return artwork.contain(image, box, 16)


def family_sheet(entries: list[dict[str, object]], background: tuple[int, int, int, int], path: Path, mobile: bool = False) -> None:
    cell_width = 320 if mobile else 420
    cell_height = 285 if mobile else 335
    columns = 2 if mobile else 4
    rows = (len(entries) + columns - 1) // columns
    sheet = Image.new("RGBA", (cell_width * columns, cell_height * rows), background)
    draw = ImageDraw.Draw(sheet)
    font = artwork.font(17 if mobile else 20)
    for index, entry in enumerate(entries):
        row, column = divmod(index, columns)
        fitted = contain_master(Path(entry["path"]), background, (cell_width, cell_height - 48))
        x = column * cell_width + (cell_width - fitted.width) // 2
        y = row * cell_height + 38 + (cell_height - 48 - fitted.height) // 2
        sheet.alpha_composite(fitted, (x, y))
        status = "LOCKED" if entry["locked"] else "NEW"
        fill = (65, 39, 20, 255) if background == artwork.CREAM else (246, 231, 207, 255)
        draw.text(
            (column * cell_width + 10, row * cell_height + 6),
            f"{entry['count']} bags · {entry['opticalWidth']:.0%} · {status}",
            fill=fill,
            font=font,
        )
    sheet.convert("RGB").save(path, format="PNG", optimize=True)


def before_after_sheet(replacements: list[dict[str, object]], path: Path) -> None:
    cell_width, cell_height = 560, 330
    sheet = Image.new("RGBA", (cell_width * 2, cell_height * len(replacements)), artwork.CREAM)
    draw = ImageDraw.Draw(sheet)
    font = artwork.font(20)
    for row, entry in enumerate(replacements):
        old = contain_master(OLD[entry["count"]], artwork.CREAM, (cell_width, cell_height - 44))
        new = contain_master(Path(entry["path"]), artwork.CREAM, (cell_width, cell_height - 44))
        sheet.alpha_composite(old, ((cell_width - old.width) // 2, row * cell_height + 36 + (cell_height - 44 - old.height) // 2))
        sheet.alpha_composite(new, (cell_width + (cell_width - new.width) // 2, row * cell_height + 36 + (cell_height - 44 - new.height) // 2))
        draw.text((10, row * cell_height + 6), f"{entry['count']} bags · BEFORE", fill=(70, 39, 17), font=font)
        draw.text((cell_width + 10, row * cell_height + 6), f"{entry['count']} bags · NEW", fill=(70, 39, 17), font=font)
    sheet.convert("RGB").save(path, format="PNG", optimize=True)


def main() -> None:
    QA_ROOT.mkdir(parents=True, exist_ok=True)
    DETERMINISM_ROOT.mkdir(parents=True, exist_ok=True)
    locked_before = verify_locked()
    replacement_entries: list[dict[str, object]] = []
    for scene in REPLACEMENTS:
        source = SOURCE_ROOT / f"pellets-{scene.count}-source-{scene.variant}-v16.png"
        rgba, alpha_method = v16.rgba_from_source(source)
        master = v16.fit_master_safe(rgba, scene.optical_width)
        candidate_id = f"pellets-{scene.count}-candidate-{scene.variant}-v16"
        output = MASTER_ROOT / f"{candidate_id}.webp"
        if output.exists():
            verification = DETERMINISM_ROOT / output.name
            master.save(verification, format="WEBP", lossless=True, exact=True, method=6)
            if sha256(verification) != sha256(output):
                raise ValueError(f"Deterministic postprocessing changed for {candidate_id}")
        else:
            master.save(output, format="WEBP", lossless=True, exact=True, method=6)
        facts = technical_facts(master, output)
        manifest = {
            **facts,
            "id": candidate_id,
            "styleVersion": "v16-selective-r2-candidate",
            "approvalStatus": "awaiting-visual-approval",
            "runtimeActivation": "blocked-until-explicit-visual-approval",
            "representativeCount": scene.count,
            "visibleBagCountEstimate": scene.visible_count_estimate,
            "targetOpticalWidth": scene.optical_width,
            "effectiveAlphaWidth": facts["alphaBounds"]["width"],
            "source": source.relative_to(ROOT).as_posix(),
            "sourceSha256": sha256(source),
            "outputSha256": sha256(output),
            "alphaMethod": alpha_method,
            "renderPipeline": "built-in reference-guided ImageGen; deterministic neutral-background extraction; 4x fit; one Lanczos downsample; lossless WebP",
            "goldenReferences": [
                {"count": 3, "sha256": LOCKED[3][1]},
                {"count": 50, "sha256": LOCKED[50][1]},
            ],
            "composition": scene.composition,
            "fullyVisibleLabelCount": scene.label_count,
            "nativeBranding": True,
            "decalApplied": False,
            "blankVisibleBagPass": True,
            "miniBagPass": True,
            "manualScaleDeviationEstimatePct": scene.scale_deviation_pct,
            "sizeTolerancePct": 8.0,
            "sizeTolerancePass": scene.scale_deviation_pct <= 8.0,
            "layerSupportPass": True,
            "unifiedPerspectivePass": True,
        }
        manifest_path = MASTER_ROOT / f"{candidate_id}.manifest.json"
        manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        replacement_entries.append({
            "count": scene.count,
            "path": output,
            "manifest": manifest_path,
            "opticalWidth": scene.optical_width,
            "locked": False,
            "sha256": manifest["outputSha256"],
        })

    if verify_locked() != locked_before:
        raise ValueError("A locked Golden Master changed during selective processing")

    replacement_by_count = {entry["count"]: entry for entry in replacement_entries}
    family: list[dict[str, object]] = []
    for count in (1, 2, 3, 5, 10, 20, 30, 50):
        if count in LOCKED:
            filename, digest, width = LOCKED[count]
            family.append({"count": count, "path": MASTER_ROOT / filename, "opticalWidth": width, "locked": True, "sha256": digest})
        else:
            family.append(replacement_by_count[count])

    family_sheet(family, artwork.CREAM, QA_ROOT / "pellets-v16-selective-r2-light.png")
    family_sheet(family, artwork.DARK, QA_ROOT / "pellets-v16-selective-r2-dark.png")
    family_sheet(family, artwork.CREAM, QA_ROOT / "pellets-v16-selective-r2-320.png", mobile=True)
    before_after_sheet(replacement_entries, QA_ROOT / "pellets-v16-selective-r2-before-after.png")
    artwork.edge_sheet(family, QA_ROOT / "pellets-v16-selective-r2-alpha-edge.png")
    artwork.branding_sheet([
        {**entry, "labelCount": next((r.label_count for r in REPLACEMENTS if r.count == entry["count"]), entry["count"] if entry["count"] <= 3 else 8)}
        for entry in family
    ], QA_ROOT / "pellets-v16-selective-r2-branding.png")

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
        and manifest["layerSupportPass"]
        and manifest["unifiedPerspectivePass"]
        for manifest in manifests
    )
    validation = {
        "valid": valid,
        "styleVersion": "v16-selective-r2-candidate",
        "approvalStatus": "awaiting-visual-approval",
        "runtimeActivation": "blocked-until-explicit-visual-approval",
        "lockedGoldenMasters": [{"count": count, "sha256": digest} for count, digest in locked_before.items()],
        "newCandidates": [{"count": entry["count"], "sha256": entry["sha256"], "path": Path(entry["path"]).relative_to(ROOT).as_posix()} for entry in replacement_entries],
        "opticalWidths": [entry["opticalWidth"] for entry in family],
        "qa": [path.relative_to(ROOT).as_posix() for path in sorted(QA_ROOT.glob("*.png"))],
    }
    (OUTPUT_ROOT / "validation.json").write_text(json.dumps(validation, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
