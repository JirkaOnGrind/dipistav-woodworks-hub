from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_ROOT = ROOT / "tmp/pellets-v15"
SOURCE_ROOT = OUTPUT_ROOT / "source"
MASTER_ROOT = OUTPUT_ROOT / "candidates/masters"
QA_ROOT = OUTPUT_ROOT / "candidates/qa"
REFERENCE = ROOT / "public/images/illustrations/configurator-v3/pelety-pytel-v3.webp"
CANVAS = (1536, 1024)
WORK_SCALE = 4
SAFE_INSET = 0.07
CONTOUR_RESERVE = 8
CREAM = (248, 241, 229, 255)
DARK = (55, 49, 44, 255)


@dataclass(frozen=True)
class Scene:
    count: int
    family: str
    optical_width: float
    selected: str
    variants: tuple[str, ...]
    fully_visible_labels: dict[str, int]
    reviews: dict[str, str]
    prompt: str


SCENES = (
    Scene(1, "bag", 0.40, "b", ("a", "b"), {"a": 1, "b": 1}, {"a": "pass", "b": "selected: softer granular deformation and native print"}, "One standing, slightly leaning heavy sack with a soft bulging base."),
    Scene(2, "bag", 0.52, "a", ("a", "b"), {"a": 2, "b": 2}, {"a": "selected: balanced shoulder support and two exact labels", "b": "pass"}, "Two standing sacks leaning their shoulders against one another."),
    Scene(3, "bag", 0.60, "b", ("a", "b"), {"a": 3, "b": 3}, {"a": "pass", "b": "selected: compact 2 + 1 cross-bond with no upright bag"}, "Two lying sacks below and one lying crosswise over their seam."),
    Scene(5, "bag", 0.68, "b", ("a", "b"), {"a": 5, "b": 5}, {"a": "pass", "b": "selected: clearest 3 + 2 support and soft contact deformation"}, "Three lying sacks below in depth and two crosswise above."),
    Scene(10, "bag", 0.76, "d", ("a", "b", "c", "d"), {"a": 4, "b": 2, "c": 6, "d": 5}, {"a": "rejected: apparent count exceeds ten", "b": "rejected: height safe-fit prevents target optical width", "c": "pass: exact low 4 + 4 + 2 bond but visually rigid", "d": "selected: wide countable 4 + 4 + 2 with softer gravity deformation"}, "Exactly ten lying sacks in a supported 4 + 4 + 2 cross-bond."),
    Scene(20, "bag", 0.80, "d", ("a", "b", "c", "d"), {"a": 5, "b": 15, "c": 15, "d": 9}, {"a": "rejected: height safe-fit prevents target optical width", "b": "rejected: flattened tiled-wall silhouette", "c": "pass: wide supported bond but too regular", "d": "selected: wide low supported block with softer contact deformation"}, "Exactly twenty lying sacks in a deep supported 7 + 7 + 6 bond."),
    Scene(30, "set", 0.83, "d", ("a", "b", "c", "d"), {"a": 5, "b": 9, "c": 12, "d": 9}, {"a": "rejected: height safe-fit prevents target optical width", "b": "rejected: broad but visually flat raster", "c": "rejected: low but wall-like", "d": "selected: broad three-row depth with stable staggered layers"}, "Thirty lying sacks in three interlocked ten-sack strata."),
    Scene(50, "set", 0.85, "f", ("a", "b", "c", "d", "e", "f"), {"a": 8, "b": 10, "c": 10, "d": 0, "e": 15, "f": 20}, {"a": "rejected: height safe-fit prevents target optical width", "b": "rejected: height safe-fit prevents target optical width", "c": "rejected: wide but rigid tiled block", "d": "rejected: pseudo-text on visible faces", "e": "pass: wide natural mound", "f": "selected: widest natural gravity-settled mound with readable native print"}, "Fifty lying sacks in four to five broad alternating supported layers."),
)

INVALID_TEXT = {(50, "d")}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def remove_neutral_checkerboard(rgb: np.ndarray) -> np.ndarray:
    values = rgb.astype(np.float32)
    maximum = values.max(axis=2)
    minimum = values.min(axis=2)
    chroma = maximum - minimum
    luminance = values.mean(axis=2)
    chroma_alpha = np.clip((chroma - 3.0) / 35.0, 0.0, 1.0)
    dark_alpha = np.clip((225.0 - luminance) / 70.0, 0.0, 1.0)
    alpha = np.maximum(chroma_alpha, dark_alpha)
    alpha[(chroma < 18.0) & (minimum > 205.0)] = 0.0
    return np.rint(alpha * 255.0).astype(np.uint8)


def source_rgba(path: Path) -> tuple[Image.Image, str]:
    image = Image.open(path)
    if image.mode == "RGBA":
        rgba = image.copy()
        alpha_method = "preserved-generated-alpha"
    else:
        rgb = np.asarray(image.convert("RGB"))
        alpha = remove_neutral_checkerboard(rgb)
        rgba_array = np.dstack((rgb, alpha))
        rgba = Image.fromarray(rgba_array, "RGBA")
        alpha_method = "deterministic-neutral-checkerboard-extraction"
    array = np.asarray(rgba).copy()
    array[array[:, :, 3] < 4, 3] = 0
    array[array[:, :, 3] == 0, :3] = 0
    return Image.fromarray(array, "RGBA"), alpha_method


def alpha_bbox(image: Image.Image, threshold: int = 4) -> tuple[int, int, int, int]:
    alpha = np.asarray(image)[:, :, 3]
    ys, xs = np.where(alpha >= threshold)
    if not len(xs):
        raise ValueError("Image has no non-transparent pixels")
    return int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)


def fit_master(image: Image.Image, target_width: float) -> Image.Image:
    left, top, right, bottom = alpha_bbox(image)
    crop = image.crop((left, top, right, bottom))
    usable_width = CANVAS[0] * (1 - 2 * SAFE_INSET) - 2 * CONTOUR_RESERVE
    usable_height = CANVAS[1] * (1 - 2 * SAFE_INSET) - 2 * CONTOUR_RESERVE
    final_width = min(target_width * CANVAS[0], usable_width)
    scale = min(final_width / crop.width, usable_height / crop.height)
    final_size = (max(1, round(crop.width * scale)), max(1, round(crop.height * scale)))
    work_size = (final_size[0] * WORK_SCALE, final_size[1] * WORK_SCALE)
    work_crop = crop.resize(work_size, Image.Resampling.BICUBIC)
    work_canvas = Image.new("RGBA", (CANVAS[0] * WORK_SCALE, CANVAS[1] * WORK_SCALE))
    position = ((work_canvas.width - work_size[0]) // 2, (work_canvas.height - work_size[1]) // 2)
    work_canvas.alpha_composite(work_crop, position)
    master = work_canvas.resize(CANVAS, Image.Resampling.LANCZOS)
    array = np.asarray(master).copy()
    array[array[:, :, 3] < 2, 3] = 0
    array[array[:, :, 3] == 0, :3] = 0
    return Image.fromarray(array, "RGBA")


def metadata(image: Image.Image) -> dict[str, object]:
    left, top, right, bottom = alpha_bbox(image)
    alpha = np.asarray(image)[:, :, 3]
    return {
        "canvas": {"width": CANVAS[0], "height": CANVAS[1]},
        "alphaBoundsPixels": {"left": left, "top": top, "right": right, "bottom": bottom},
        "alphaBounds": {
            "x": round(left / CANVAS[0], 6),
            "y": round(top / CANVAS[1], 6),
            "width": round((right - left) / CANVAS[0], 6),
            "height": round((bottom - top) / CANVAS[1], 6),
        },
        "opticalCenter": {"x": 0.5, "y": 0.5},
        "alphaCoverage": round(float((alpha > 0).mean()), 6),
        "cornersTransparent": all(alpha[y, x] == 0 for x, y in ((0, 0), (CANVAS[0] - 1, 0), (0, CANVAS[1] - 1), (CANVAS[0] - 1, CANVAS[1] - 1))),
        "transparentRgbClean": bool(np.all(np.asarray(image)[:, :, :3][alpha == 0] == 0)),
    }


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for name in ("C:/Windows/Fonts/georgia.ttf", "C:/Windows/Fonts/arial.ttf"):
        if Path(name).exists():
            return ImageFont.truetype(name, size)
    return ImageFont.load_default()


def contain(image: Image.Image, box: tuple[int, int], padding: int = 24) -> Image.Image:
    available = (box[0] - padding * 2, box[1] - padding * 2)
    scale = min(available[0] / image.width, available[1] / image.height)
    size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    return image.resize(size, Image.Resampling.LANCZOS)


def composite(image: Image.Image, background: tuple[int, int, int, int]) -> Image.Image:
    layer = Image.new("RGBA", image.size, background)
    layer.alpha_composite(image)
    return layer


def candidate_sheet(entries: list[dict[str, object]], background: tuple[int, int, int, int], path: Path) -> None:
    cell = (480, 340)
    rows = (len(entries) + 3) // 4
    sheet = Image.new("RGBA", (cell[0] * 4, cell[1] * rows), background)
    draw = ImageDraw.Draw(sheet)
    title_font = font(18)
    for index, entry in enumerate(entries):
        row, column = divmod(index, 4)
        image = Image.open(entry["path"]).convert("RGBA")
        fitted = contain(image, (cell[0], cell[1] - 42))
        position = (column * cell[0] + (cell[0] - fitted.width) // 2, row * cell[1] + 30 + (cell[1] - 42 - fitted.height) // 2)
        panel = Image.new("RGBA", image.size, background)
        panel.alpha_composite(image)
        fitted = contain(panel, (cell[0], cell[1] - 42))
        sheet.alpha_composite(fitted, position)
        label = f"{entry['id']} — {entry['review']}"
        draw.text((column * cell[0] + 12, row * cell[1] + 7), label, fill=(65, 39, 20, 255) if background == CREAM else (246, 231, 207, 255), font=title_font)
    sheet.convert("RGB").save(path, format="PNG", optimize=True)


def selected_sheet(entries: list[dict[str, object]], background: tuple[int, int, int, int], path: Path, mobile: bool = False) -> None:
    cell_width = 320 if mobile else 420
    cell_height = 260 if mobile else 320
    columns = 2 if mobile else 4
    rows = (len(entries) + columns - 1) // columns
    sheet = Image.new("RGBA", (cell_width * columns, cell_height * rows), background)
    draw = ImageDraw.Draw(sheet)
    label_font = font(17 if mobile else 20)
    for index, entry in enumerate(entries):
        row, column = divmod(index, columns)
        image = composite(Image.open(entry["path"]).convert("RGBA"), background)
        fitted = contain(image, (cell_width, cell_height - 36), 18)
        x = column * cell_width + (cell_width - fitted.width) // 2
        y = row * cell_height + 28 + (cell_height - 36 - fitted.height) // 2
        sheet.alpha_composite(fitted, (x, y))
        draw.text((column * cell_width + 10, row * cell_height + 5), f"{entry['count']} bags · {entry['opticalWidth']:.0%}", fill=(65, 39, 20, 255) if background == CREAM else (246, 231, 207, 255), font=label_font)
    sheet.convert("RGB").save(path, format="PNG", optimize=True)


def edge_sheet(entries: list[dict[str, object]], path: Path) -> None:
    cell = (420, 260)
    sheet = Image.new("RGB", (cell[0] * 4, cell[1] * 2), (118, 118, 118))
    for index, entry in enumerate(entries):
        image = Image.open(entry["path"]).convert("RGBA")
        checker = Image.new("RGBA", image.size, (235, 235, 235, 255))
        draw = ImageDraw.Draw(checker)
        step = 64
        for y in range(0, image.height, step):
            for x in range(0, image.width, step):
                if (x // step + y // step) % 2:
                    draw.rectangle((x, y, x + step, y + step), fill=(88, 88, 88, 255))
        checker.alpha_composite(image)
        fitted = contain(checker, cell, 10).convert("RGB")
        row, column = divmod(index, 4)
        sheet.paste(fitted, (column * cell[0] + (cell[0] - fitted.width) // 2, row * cell[1] + (cell[1] - fitted.height) // 2))
    sheet.save(path, format="PNG", optimize=True)


def branding_sheet(entries: list[dict[str, object]], path: Path) -> None:
    cell = (480, 300)
    sheet = Image.new("RGB", (cell[0] * 4, cell[1] * 2), CREAM[:3])
    draw = ImageDraw.Draw(sheet)
    label_font = font(18)
    for index, entry in enumerate(entries):
        image = Image.open(entry["path"]).convert("RGBA")
        left, top, right, bottom = alpha_bbox(image)
        crop_top = top + (bottom - top) // 3
        crop = composite(image.crop((left, crop_top, right, bottom)), CREAM)
        fitted = contain(crop, (cell[0], cell[1] - 28), 8).convert("RGB")
        row, column = divmod(index, 4)
        sheet.paste(fitted, (column * cell[0] + (cell[0] - fitted.width) // 2, row * cell[1] + 28 + (cell[1] - 28 - fitted.height) // 2))
        draw.text((column * cell[0] + 8, row * cell[1] + 4), f"{entry['count']} bags · {entry['labelCount']} visible 15 kg labels", fill=(70, 39, 17), font=label_font)
    sheet.save(path, format="PNG", optimize=True)


def main() -> None:
    MASTER_ROOT.mkdir(parents=True, exist_ok=True)
    QA_ROOT.mkdir(parents=True, exist_ok=True)
    reference_hash = sha256(REFERENCE)
    if reference_hash != "f8225c69fa6e6aaa3795dfb8fcfb0dcdd551cfaf5d532e6a2b122b1b81e1e418":
        raise ValueError("Canonical pellet-bag reference hash changed")

    entries: list[dict[str, object]] = []
    selected_entries: list[dict[str, object]] = []
    for scene in SCENES:
        for variant in scene.variants:
            source = SOURCE_ROOT / f"pellets-{scene.count}-source-{variant}-v15.png"
            if not source.exists():
                raise FileNotFoundError(source)
            rgba, alpha_method = source_rgba(source)
            master = fit_master(rgba, scene.optical_width)
            candidate_id = f"pellets-{scene.count}-candidate-{variant}-v15"
            output = MASTER_ROOT / f"{candidate_id}.webp"
            master.save(output, format="WEBP", lossless=True, exact=True, method=6)
            facts = metadata(master)
            selected = variant == scene.selected
            manifest = {
                **facts,
                "id": candidate_id,
                "styleVersion": "v15-candidate",
                "approvalStatus": "awaiting-visual-approval",
                "runtimeActivation": "blocked-until-explicit-visual-approval",
                "family": "pellets-bag" if scene.family == "bag" else "pellets-set",
                "representativeCount": scene.count,
                "targetAlphaWidth": scene.optical_width,
                "selectedForQa": selected,
                "reference": "public/images/illustrations/configurator-v3/pelety-pytel-v3.webp",
                "referenceSha256": reference_hash,
                "source": source.relative_to(ROOT).as_posix(),
                "sourceSha256": sha256(source),
                "outputSha256": sha256(output),
                "alphaMethod": alpha_method,
                "renderPipeline": "built-in-reference-guided-imagegen; 4x compositing; one Lanczos downsample; lossless WebP",
                "prompt": scene.prompt,
                "nativeBranding": True,
                "decalApplied": False,
                "fullyVisibleLabelCount": scene.fully_visible_labels[variant],
                "exactLabelText": "15 kg",
                "exactLabelPass": (scene.count, variant) not in INVALID_TEXT,
                "layerSupportPass": True,
                "compositionPass": "rejected" not in scene.reviews[variant],
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
                "labelCount": scene.fully_visible_labels[variant],
                "sha256": manifest["outputSha256"],
            }
            entries.append(entry)
            if selected:
                selected_entries.append(entry)

    candidate_sheet(entries, CREAM, QA_ROOT / "pellets-v15-candidates-r2-light.png")
    candidate_sheet(entries, DARK, QA_ROOT / "pellets-v15-candidates-r2-dark.png")
    selected_sheet(selected_entries, CREAM, QA_ROOT / "pellets-v15-selected-r2-light.png")
    selected_sheet(selected_entries, DARK, QA_ROOT / "pellets-v15-selected-r2-dark.png")
    selected_sheet(selected_entries, CREAM, QA_ROOT / "pellets-v15-selected-r2-320.png", mobile=True)
    edge_sheet(selected_entries, QA_ROOT / "pellets-v15-r2-alpha-edge.png")
    branding_sheet(selected_entries, QA_ROOT / "pellets-v15-r2-branding.png")

    validation = {
        "valid": all(json.loads(Path(entry["manifest"]).read_text(encoding="utf-8"))["cornersTransparent"] for entry in entries),
        "styleVersion": "v15-candidate",
        "approvalStatus": "awaiting-visual-approval",
        "runtimeActivation": "blocked-until-explicit-visual-approval",
        "referenceSha256": reference_hash,
        "distinctScenes": [scene.count for scene in SCENES],
        "selected": [{"id": entry["id"], "sha256": entry["sha256"], "review": entry["review"]} for entry in selected_entries],
        "runtimeSharingAfterApproval": {"pellets-set-1": "pellets-10", "pellets-set-2": "pellets-20"},
        "qa": [path.relative_to(ROOT).as_posix() for path in sorted(QA_ROOT.glob("*r2*.png"))],
    }
    (OUTPUT_ROOT / "candidates/validation.json").write_text(json.dumps(validation, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
