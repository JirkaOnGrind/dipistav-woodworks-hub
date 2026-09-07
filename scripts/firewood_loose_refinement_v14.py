from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
CANVAS = (1536, 1024)
RENDER_SCALE = 4
SAFE_INSET = 0.07
CONTOUR_RESERVE = 8
CREAM = "#F7F0E3"
DARK = "#302B27"

CANONICAL_STYLE = ROOT / "public/images/illustrations/configurator-v12/firewood-loose-1-2-master-v12.webp"
APPROVED_FIVE = ROOT / "public/images/illustrations/configurator-v12/firewood-loose-5-8-master-v12.webp"

SCENES = (
    {
        "id": "firewood-loose-3-4-master-v14",
        "source": ROOT / "tmp/firewood-loose-refinement-v14/source/firewood-loose-3-4-source-v14.png",
        "quantityBand": {"min": 3, "max": 4},
        "representativeCount": 3,
        "targetAlphaWidth": 0.66,
    },
    {
        "id": "firewood-loose-9-15-master-v14",
        "source": ROOT / "tmp/firewood-loose-refinement-v14/source/firewood-loose-9-15-source-v14.png",
        "quantityBand": {"min": 9, "max": 15},
        "representativeCount": 9,
        "targetAlphaWidth": 0.82,
    },
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def checkerboard_cutout(image: Image.Image) -> Image.Image:
    if image.mode == "RGBA" and image.getchannel("A").getextrema()[0] == 0:
        return image.copy()
    rgb = image.convert("RGB")
    background = Image.new("L", rgb.size)
    background.putdata(
        [
            255 if max(pixel) - min(pixel) <= 18 and min(pixel) >= 190 else 0
            for pixel in rgb.get_flattened_data()
        ]
    )
    ImageDraw.floodfill(background, (0, 0), 128, thresh=0)
    alpha = background.point(lambda value: 0 if value == 128 else 255)
    rgba = rgb.convert("RGBA")
    rgba.putalpha(alpha)
    return rgba


def remove_neutral_edge_halo(image: Image.Image, passes: int = 6) -> Image.Image:
    result = image.copy()
    pixels = result.load()
    for _ in range(passes):
        alpha = result.getchannel("A")
        boundary = ImageChops.subtract(alpha, alpha.filter(ImageFilter.MinFilter(3)))
        boundary_pixels = boundary.load()
        removals: list[tuple[int, int]] = []
        for y in range(result.height):
            for x in range(result.width):
                if boundary_pixels[x, y] == 0:
                    continue
                red, green, blue, _ = pixels[x, y]
                if min(red, green, blue) >= 120 and max(red, green, blue) - min(red, green, blue) <= 100:
                    removals.append((x, y))
        if not removals:
            break
        for x, y in removals:
            red, green, blue, _ = pixels[x, y]
            pixels[x, y] = (red, green, blue, 0)
    return result


def normalize_master(image: Image.Image) -> Image.Image:
    rgba = checkerboard_cutout(image)
    bounds = rgba.getchannel("A").getbbox()
    if bounds is None:
        raise AssertionError("Generated source has no visible artwork")
    cutout = rgba.crop(bounds)
    downsample_reserve = CONTOUR_RESERVE + 4
    usable_width = CANVAS[0] * (1 - 2 * SAFE_INSET) - 2 * downsample_reserve
    usable_height = CANVAS[1] * (1 - 2 * SAFE_INSET) - 2 * downsample_reserve
    scale = min(2, usable_width / cutout.width, usable_height / cutout.height)
    final_size = (round(cutout.width * scale), round(cutout.height * scale))
    large = cutout.resize(
        (final_size[0] * RENDER_SCALE, final_size[1] * RENDER_SCALE),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new(
        "RGBA",
        (CANVAS[0] * RENDER_SCALE, CANVAS[1] * RENDER_SCALE),
        (0, 0, 0, 0),
    )
    canvas.alpha_composite(
        large,
        ((canvas.width - large.width) // 2, (canvas.height - large.height) // 2),
    )
    result = remove_neutral_edge_halo(canvas.resize(CANVAS, Image.Resampling.LANCZOS))
    alpha = result.getchannel("A").filter(ImageFilter.MinFilter(5))
    alpha = alpha.point(lambda value: 0 if value < 8 else 255 if value > 247 else value)
    result.putalpha(alpha)
    clean = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    clean.alpha_composite(result)
    return clean


def alpha_metadata(image: Image.Image) -> dict[str, object]:
    alpha = image.getchannel("A")
    bounds = alpha.getbbox()
    if bounds is None:
        raise AssertionError("Master has no visible artwork")
    left, top, right, bottom = bounds
    values = alpha.get_flattened_data()
    return {
        "canvas": {"width": image.width, "height": image.height},
        "alphaBoundsPixels": {"left": left, "top": top, "right": right, "bottom": bottom},
        "alphaBounds": {
            "x": round(left / image.width, 6),
            "y": round(top / image.height, 6),
            "width": round((right - left) / image.width, 6),
            "height": round((bottom - top) / image.height, 6),
        },
        "opticalCenter": {
            "x": round((left + right) / (2 * image.width), 6),
            "y": round((top + bottom) / (2 * image.height), 6),
        },
        "alphaCoverage": round(sum(value > 0 for value in values) / (image.width * image.height), 6),
        "margins": {
            "left": left,
            "top": top,
            "right": image.width - right,
            "bottom": image.height - bottom,
        },
    }


def validate_master(image: Image.Image, scene_id: str) -> None:
    if image.mode != "RGBA" or image.size != CANVAS:
        raise AssertionError(f"Invalid canvas for {scene_id}: {image.mode} {image.size}")
    alpha = image.getchannel("A")
    corners = ((0, 0), (CANVAS[0] - 1, 0), (0, CANVAS[1] - 1), (CANVAS[0] - 1, CANVAS[1] - 1))
    if any(alpha.getpixel(point) for point in corners):
        raise AssertionError(f"Non-transparent corner in {scene_id}")
    bounds = alpha.getbbox()
    if bounds is None:
        raise AssertionError(f"Empty master: {scene_id}")
    left, top, right, bottom = bounds
    minimum_x = round(CANVAS[0] * SAFE_INSET) + CONTOUR_RESERVE
    minimum_y = round(CANVAS[1] * SAFE_INSET) + CONTOUR_RESERVE
    if left < minimum_x or CANVAS[0] - right < minimum_x or top < minimum_y or CANVAS[1] - bottom < minimum_y:
        raise AssertionError(f"Unsafe alpha bounds for {scene_id}: {bounds}")


def save_master(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="WEBP", lossless=True, method=6, exact=True)


def runtime_frame(image: Image.Image, target_width: float) -> Image.Image:
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise AssertionError("Cannot preview empty image")
    cutout = image.crop(bounds)
    width = round(CANVAS[0] * target_width)
    scale = width / cutout.width
    height = round(cutout.height * scale)
    maximum_height = round(CANVAS[1] * (1 - 2 * SAFE_INSET))
    if height > maximum_height:
        scale = maximum_height / cutout.height
        width = round(cutout.width * scale)
        height = maximum_height
    resized = cutout.resize((width, height), Image.Resampling.LANCZOS)
    frame = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    frame.alpha_composite(resized, ((CANVAS[0] - width) // 2, (CANVAS[1] - height) // 2))
    return frame


def comparison_sheet(
    entries: list[dict[str, object]],
    output_path: Path,
    background: str,
    width: int,
) -> None:
    columns = 5 if width > 800 else 2
    cell_width = width // columns
    cell_height = round(cell_width * 0.78)
    rows = (len(entries) + columns - 1) // columns
    header = 56
    sheet = Image.new("RGB", (width, header + rows * cell_height), background)
    draw = ImageDraw.Draw(sheet)
    ink = "#FFF7E8" if background == DARK else "#2B160A"
    draw.text((18, 18), "Volne lozene drevo v14 - runtime optical comparison", fill=ink)
    for index, entry in enumerate(entries):
        frame = runtime_frame(Image.open(Path(entry["image"])).convert("RGBA"), float(entry["targetAlphaWidth"]))
        preview = frame.resize((cell_width, round(cell_width * CANVAS[1] / CANVAS[0])), Image.Resampling.LANCZOS)
        x = index % columns * cell_width
        y = header + index // columns * cell_height
        shadow_alpha = preview.getchannel("A").filter(ImageFilter.GaussianBlur(5))
        shadow_alpha = shadow_alpha.point(lambda value: round(value * 0.22))
        shadow = Image.new("RGBA", preview.size, (43, 22, 10, 0))
        shadow.putalpha(shadow_alpha)
        sheet.paste(shadow, (x + 4, y + 10), shadow)
        sheet.paste(preview, (x, y + 4), preview)
        draw.text(
            (x + 10, y + cell_height - 26),
            f"{entry['label']} / {round(float(entry['targetAlphaWidth']) * 100)}%",
            fill=ink,
        )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path)


def render(output_dir: Path) -> dict[str, object]:
    masters_dir = output_dir / "masters"
    qa_dir = output_dir / "qa"
    results: list[dict[str, object]] = []
    for scene in SCENES:
        image = normalize_master(Image.open(Path(scene["source"])))
        validate_master(image, str(scene["id"]))
        output_path = masters_dir / f"{scene['id']}.webp"
        save_master(image, output_path)
        metadata = alpha_metadata(image)
        manifest = {
            **metadata,
            "id": scene["id"],
            "styleVersion": "v14-candidate",
            "approvalStatus": "awaiting-visual-approval",
            "runtimeActivation": "blocked-until-explicit-visual-approval",
            "renderMode": "master",
            "renderTechnique": "reference-guided-whole-pile-edit",
            "quantityBand": scene["quantityBand"],
            "representativeCount": scene["representativeCount"],
            "targetAlphaWidth": scene["targetAlphaWidth"],
            "source": str(Path(scene["source"]).relative_to(ROOT)).replace("\\", "/"),
            "sourceSha256": sha256(Path(scene["source"])),
            "canonicalStyle": str(CANONICAL_STYLE.relative_to(ROOT)).replace("\\", "/"),
            "canonicalStyleSha256": sha256(CANONICAL_STYLE),
            "approvedFiveReference": str(APPROVED_FIVE.relative_to(ROOT)).replace("\\", "/"),
            "approvedFiveReferenceSha256": sha256(APPROVED_FIVE),
            "outputSha256": sha256(output_path),
        }
        manifest_path = masters_dir / f"{scene['id']}.manifest.json"
        write_json(manifest_path, manifest)
        results.append({"image": str(output_path), "manifest": str(manifest_path), **manifest})

    sequence = [
        {
            "label": "1-2 approved v12",
            "image": str(CANONICAL_STYLE),
            "targetAlphaWidth": 0.62,
        },
        {
            "label": "3-4 candidate v14",
            "image": results[0]["image"],
            "targetAlphaWidth": 0.66,
        },
        {
            "label": "5-8 approved v12",
            "image": str(APPROVED_FIVE),
            "targetAlphaWidth": 0.79,
        },
        {
            "label": "9-15 candidate v14",
            "image": results[1]["image"],
            "targetAlphaWidth": 0.82,
        },
        {
            "label": "16+ approved v12",
            "image": str(ROOT / "public/images/illustrations/configurator-v12/firewood-loose-16plus-master-v12.webp"),
            "targetAlphaWidth": 0.86,
        },
    ]
    comparison_sheet(sequence, qa_dir / "firewood-loose-v14-comparison-light.png", CREAM, 1800)
    comparison_sheet(sequence, qa_dir / "firewood-loose-v14-comparison-dark.png", DARK, 1800)
    comparison_sheet(sequence, qa_dir / "firewood-loose-v14-comparison-320.png", CREAM, 640)
    validation = {
        "valid": True,
        "approvalStatus": "awaiting-visual-approval",
        "runtimeActivation": "blocked-until-explicit-visual-approval",
        "opticalWidths": [0.62, 0.66, 0.79, 0.82, 0.86],
        "masters": [
            {"image": item["image"], "manifest": item["manifest"], "sha256": item["outputSha256"]}
            for item in results
        ],
        "qa": [
            str(qa_dir / "firewood-loose-v14-comparison-light.png"),
            str(qa_dir / "firewood-loose-v14-comparison-dark.png"),
            str(qa_dir / "firewood-loose-v14-comparison-320.png"),
        ],
    }
    write_json(output_dir / "validation.json", validation)
    return validation


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=ROOT / "tmp/firewood-loose-refinement-v14/candidates",
    )
    args = parser.parse_args()
    print(json.dumps(render(args.output_dir), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
