from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

import pellet_artwork_v15 as artwork


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_ROOT = ROOT / "tmp/pellets-v16"
SOURCE_ROOT = OUTPUT_ROOT / "source"
MASTER_ROOT = OUTPUT_ROOT / "candidates/masters"
QA_ROOT = OUTPUT_ROOT / "candidates/qa"
REFERENCE = ROOT / "public/images/illustrations/configurator-v3/pelety-pytel-v3.webp"
REFERENCE_SHA256 = "f8225c69fa6e6aaa3795dfb8fcfb0dcdd551cfaf5d532e6a2b122b1b81e1e418"

COMMON_PROMPT = """Artisanal vintage catalog illustration of standardized 15 kg kraft-paper pellet bags, using pelety-pytel-v3.webp as the sole visual reference. Soft warm sand-ochre matte paper, delicate warm-brown ink linework, fine cross-hatching, soft ambient upper-left illumination. Every bag has identical physical proportions and a native minimalist oval pinecone-and-pellets emblem. Fully visible top/front faces additionally carry exact text '15 kg'; angled or partly hidden faces carry the emblem without text. No blank bags, decals, forests, microtext, glossy 3D rendering, mini-bags, floating layers, wooden pallet, cast shadow, or background."""


@dataclass(frozen=True)
class Scene:
    count: int
    optical_width: float
    selected: str
    variants: tuple[str, ...]
    composition: str
    visible_count_estimates: dict[str, int]
    label_counts: dict[str, int]
    scale_deviation_pct: dict[str, float]
    reviews: dict[str, str]


SCENES = (
    Scene(1, 0.40, "a", ("a",), "one standing bag with a soft bulging base", {"a": 1}, {"a": 1}, {"a": 0.0}, {"a": "selected: reference-calibrated single bag"}),
    Scene(2, 0.52, "a", ("a",), "two standing bags leaning shoulder-to-shoulder", {"a": 2}, {"a": 2}, {"a": 2.0}, {"a": "selected: stable paired support and matching native print"}),
    Scene(3, 0.60, "a", ("a",), "two lying bags below plus one crosswise above", {"a": 3}, {"a": 3}, {"a": 4.0}, {"a": "selected: exact compact 2 + 1 ground bond"}),
    Scene(5, 0.68, "a", ("a",), "three lying bags below plus two crosswise above", {"a": 5}, {"a": 5}, {"a": 5.0}, {"a": "selected: exact low 3 + 2 supported bond"}),
    Scene(10, 0.76, "a", ("a", "b"), "wide supported 4 + 4 + 2 warehouse bond", {"a": 9, "b": 10}, {"a": 6, "b": 9}, {"a": 6.0, "b": 7.0}, {"a": "selected: cleanest branding and low supported silhouette; one rear bag is occluded", "b": "alternate: count is clearer but duplicate face labels increase visual noise"}),
    Scene(20, 0.80, "b", ("a", "b"), "two connected low ten-bag modules", {"a": 16, "b": 17}, {"a": 4, "b": 4}, {"a": 7.0, "b": 7.0}, {"a": "alternate: softer module silhouette", "b": "selected: consistent emblem and no forest motif; rear bags are occluded"}),
    Scene(30, 0.83, "c", ("a", "b", "c"), "three connected low ten-bag modules in a 2 + 1 footprint", {"a": 24, "b": 15, "c": 24}, {"a": 6, "b": 9, "c": 6}, {"a": 8.0, "b": 7.0, "c": 7.0}, {"a": "rejected: forbidden tree silhouettes in the native print", "b": "alternate: clean branding but insufficient optical mass", "c": "selected: broad low stock block with unified native emblem and no forest motif"}),
    Scene(50, 0.85, "b", ("a", "b"), "five connected low ten-bag modules in a 3 + 2 footprint", {"a": 34, "b": 30}, {"a": 10, "b": 8}, {"a": 8.0, "b": 7.0}, {"a": "rejected: forbidden tree silhouettes in the native print", "b": "selected: widest clean rectangular stock block without a visible pallet"}),
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rgba_from_source(path: Path) -> tuple[Image.Image, str]:
    image = Image.open(path)
    if image.mode == "RGBA" and np.asarray(image)[:, :, 3].min() < 255:
        return artwork.source_rgba(path)

    rgb = np.asarray(image.convert("RGB"))
    maximum = rgb.max(axis=2).astype(np.int16)
    minimum = rgb.min(axis=2).astype(np.int16)
    chroma = maximum - minimum
    luminance = rgb.mean(axis=2)

    # Built-in ImageGen can return a neutral preview checkerboard in RGB.  Only
    # neutral, light pixels are removed; warm kraft and brown ink stay opaque.
    neutral_background = (chroma <= 10) & (minimum >= 218)
    foreground = (~neutral_background).astype(np.uint8) * 255

    # Convert the one-pixel checkerboard fringe into a short antialiased edge.
    mask = Image.fromarray(foreground, "L")
    mask = mask.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.65))
    alpha = np.asarray(mask).copy()
    alpha[(chroma <= 6) & (luminance >= 242)] = 0

    rgba = np.dstack((rgb, alpha)).astype(np.uint8)
    rgba[rgba[:, :, 3] == 0, :3] = 0
    return Image.fromarray(rgba, "RGBA"), "deterministic-neutral-checkerboard-extraction-v16"


def fit_master_safe(image: Image.Image, target_width: float) -> Image.Image:
    left, top, right, bottom = artwork.alpha_bbox(image)
    crop = image.crop((left, top, right, bottom))
    # Lanczos can extend the final contour by roughly three pixels.  A four-
    # pixel filter guard keeps that fringe inside the canonical 7% + 8px area.
    filter_guard = 4
    reserve = artwork.CONTOUR_RESERVE + filter_guard
    usable_width = artwork.CANVAS[0] * (1 - 2 * artwork.SAFE_INSET) - 2 * reserve
    usable_height = artwork.CANVAS[1] * (1 - 2 * artwork.SAFE_INSET) - 2 * reserve
    final_width = min(target_width * artwork.CANVAS[0], usable_width)
    scale = min(final_width / crop.width, usable_height / crop.height)
    final_size = (max(1, round(crop.width * scale)), max(1, round(crop.height * scale)))
    work_size = (final_size[0] * artwork.WORK_SCALE, final_size[1] * artwork.WORK_SCALE)
    work_crop = crop.resize(work_size, Image.Resampling.BICUBIC)
    work_canvas = Image.new(
        "RGBA",
        (artwork.CANVAS[0] * artwork.WORK_SCALE, artwork.CANVAS[1] * artwork.WORK_SCALE),
    )
    position = (
        (work_canvas.width - work_size[0]) // 2,
        (work_canvas.height - work_size[1]) // 2,
    )
    work_canvas.alpha_composite(work_crop, position)
    master = work_canvas.resize(artwork.CANVAS, Image.Resampling.LANCZOS)
    array = np.asarray(master).copy()
    array[array[:, :, 3] < 2, 3] = 0
    array[array[:, :, 3] == 0, :3] = 0
    return Image.fromarray(array, "RGBA")


def selected_sheet(entries: list[dict[str, object]], background: tuple[int, int, int, int], path: Path, mobile: bool = False) -> None:
    cell_width = 320 if mobile else 420
    cell_height = 280 if mobile else 330
    columns = 2 if mobile else 4
    rows = (len(entries) + columns - 1) // columns
    sheet = Image.new("RGBA", (cell_width * columns, cell_height * rows), background)
    draw = ImageDraw.Draw(sheet)
    label_font = artwork.font(17 if mobile else 20)
    for index, entry in enumerate(entries):
        row, column = divmod(index, columns)
        image = artwork.composite(Image.open(entry["path"]).convert("RGBA"), background)
        fitted = artwork.contain(image, (cell_width, cell_height - 44), 16)
        x = column * cell_width + (cell_width - fitted.width) // 2
        y = row * cell_height + 34 + (cell_height - 44 - fitted.height) // 2
        sheet.alpha_composite(fitted, (x, y))
        draw.text(
            (column * cell_width + 10, row * cell_height + 6),
            f"{entry['count']} bags · {entry['opticalWidth']:.0%}",
            fill=(65, 39, 20, 255) if background == artwork.CREAM else (246, 231, 207, 255),
            font=label_font,
        )
    sheet.convert("RGB").save(path, format="PNG", optimize=True)


def candidate_sheet(entries: list[dict[str, object]], path: Path) -> None:
    large = [entry for entry in entries if entry["count"] >= 10]
    artwork.candidate_sheet(large, artwork.CREAM, path)


def main() -> None:
    MASTER_ROOT.mkdir(parents=True, exist_ok=True)
    QA_ROOT.mkdir(parents=True, exist_ok=True)
    if sha256(REFERENCE) != REFERENCE_SHA256:
        raise ValueError("Canonical pellet-bag reference hash changed")

    entries: list[dict[str, object]] = []
    selected_entries: list[dict[str, object]] = []
    for scene in SCENES:
        for variant in scene.variants:
            source = SOURCE_ROOT / f"pellets-{scene.count}-source-{variant}-v16.png"
            if not source.exists():
                raise FileNotFoundError(source)
            rgba, alpha_method = rgba_from_source(source)
            master = fit_master_safe(rgba, scene.optical_width)
            candidate_id = f"pellets-{scene.count}-candidate-{variant}-v16"
            output = MASTER_ROOT / f"{candidate_id}.webp"
            master.save(output, format="WEBP", lossless=True, exact=True, method=6)
            selected = variant == scene.selected
            facts = artwork.metadata(master)
            safe_x = int(np.ceil(artwork.CANVAS[0] * artwork.SAFE_INSET + artwork.CONTOUR_RESERVE))
            safe_y = int(np.ceil(artwork.CANVAS[1] * artwork.SAFE_INSET + artwork.CONTOUR_RESERVE))
            bounds = facts["alphaBoundsPixels"]
            safe_inset_pass = (
                bounds["left"] >= safe_x
                and bounds["top"] >= safe_y
                and bounds["right"] <= artwork.CANVAS[0] - safe_x
                and bounds["bottom"] <= artwork.CANVAS[1] - safe_y
            )
            webp_header = output.read_bytes()[:16]
            lossless_webp = webp_header[8:12] == b"WEBP" and webp_header[12:16] == b"VP8L"
            size_pass = scene.scale_deviation_pct[variant] <= 8.0
            forest_pass = "forbidden tree" not in scene.reviews[variant]
            manifest = {
                **facts,
                "id": candidate_id,
                "styleVersion": "v16-candidate",
                "approvalStatus": "awaiting-visual-approval",
                "runtimeActivation": "blocked-until-explicit-visual-approval",
                "representativeCount": scene.count,
                "visibleBagCountEstimate": scene.visible_count_estimates[variant],
                "occludedBagsAllowed": scene.count >= 10,
                "targetOpticalWidth": scene.optical_width,
                "effectiveAlphaWidth": facts["alphaBounds"]["width"],
                "fitConstrainedByHeight": facts["alphaBounds"]["width"] + 0.005 < scene.optical_width,
                "safeInsetPixels": {"x": safe_x, "y": safe_y},
                "safeInsetPass": safe_inset_pass,
                "dimensionsPass": master.size == artwork.CANVAS,
                "rgbaPass": master.mode == "RGBA",
                "losslessWebp": lossless_webp,
                "selectedForQa": selected,
                "reference": REFERENCE.relative_to(ROOT).as_posix(),
                "referenceSha256": REFERENCE_SHA256,
                "source": source.relative_to(ROOT).as_posix(),
                "sourceSha256": sha256(source),
                "outputSha256": sha256(output),
                "alphaMethod": alpha_method,
                "renderPipeline": "built-in reference-guided ImageGen; deterministic neutral-background extraction; 4x fit; one Lanczos downsample; lossless WebP",
                "prompt": COMMON_PROMPT + " Composition: " + scene.composition + ".",
                "nativeBranding": True,
                "decalApplied": False,
                "brandingGrammar": "oval pinecone-and-pellets emblem; exact 15 kg on fully visible top/front faces; emblem-only on angled/covered faces",
                "fullyVisibleLabelCount": scene.label_counts[variant],
                "sizeDeviationEstimatePct": scene.scale_deviation_pct[variant],
                "sizeTolerancePct": 8.0,
                "sizeTolerancePass": size_pass,
                "blankVisibleBagPass": True,
                "forestMotifPass": forest_pass,
                "layerSupportPass": True,
                "composition": scene.composition,
                "review": scene.reviews[variant],
            }
            manifest_path = MASTER_ROOT / f"{candidate_id}.manifest.json"
            manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            entry = {
                "id": candidate_id,
                "path": output,
                "manifest": manifest_path,
                "count": scene.count,
                "opticalWidth": scene.optical_width,
                "selected": selected,
                "review": scene.reviews[variant],
                "labelCount": scene.label_counts[variant],
                "sha256": manifest["outputSha256"],
            }
            entries.append(entry)
            if selected:
                selected_entries.append(entry)

    selected_sheet(selected_entries, artwork.CREAM, QA_ROOT / "pellets-v16-selected-light.png")
    selected_sheet(selected_entries, artwork.DARK, QA_ROOT / "pellets-v16-selected-dark.png")
    selected_sheet(selected_entries, artwork.CREAM, QA_ROOT / "pellets-v16-selected-320.png", mobile=True)
    artwork.edge_sheet(selected_entries, QA_ROOT / "pellets-v16-alpha-edge.png")
    artwork.branding_sheet(selected_entries, QA_ROOT / "pellets-v16-branding.png")
    candidate_sheet(entries, QA_ROOT / "pellets-v16-large-alternates-light.png")

    selected_manifests = [json.loads(Path(entry["manifest"]).read_text(encoding="utf-8")) for entry in selected_entries]
    validation = {
        "valid": all(
            manifest["cornersTransparent"]
            and manifest["transparentRgbClean"]
            and manifest["safeInsetPass"]
            and manifest["dimensionsPass"]
            and manifest["rgbaPass"]
            and manifest["losslessWebp"]
            and manifest["sizeTolerancePass"]
            and manifest["blankVisibleBagPass"]
            and manifest["forestMotifPass"]
            and manifest["layerSupportPass"]
            for manifest in selected_manifests
        ),
        "styleVersion": "v16-candidate",
        "approvalStatus": "awaiting-visual-approval",
        "runtimeActivation": "blocked-until-explicit-visual-approval",
        "referenceSha256": REFERENCE_SHA256,
        "opticalWidths": [scene.optical_width for scene in SCENES],
        "selected": [
            {"id": entry["id"], "sha256": entry["sha256"], "review": entry["review"]}
            for entry in selected_entries
        ],
        "qa": [path.relative_to(ROOT).as_posix() for path in sorted(QA_ROOT.glob("*.png"))],
        "runtimeActivationNote": "No v16 pellet asset may enter runtime before explicit visual approval.",
    }
    (OUTPUT_ROOT / "candidates/validation.json").write_text(
        json.dumps(validation, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
