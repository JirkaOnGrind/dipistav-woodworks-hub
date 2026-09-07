from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
OUTPUT_ROOT = ROOT / "tmp" / "pellets-v19-user-final"
MASTER_ROOT = OUTPUT_ROOT / "candidates" / "masters"
QA_ROOT = OUTPUT_ROOT / "candidates" / "qa"
CANVAS = (1536, 1024)
WORK_SCALE = 4
SAFE_INSET = 0.07
CONTOUR_RESERVE = 8

SOURCES = (
    (1, ROOT / "FINAL1.webp", "pellets-bag-1-candidate-a-v19"),
    (2, ROOT / "FINAL2.webp", "pellets-bag-2-candidate-a-v19"),
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def background_color(image: Image.Image) -> tuple[int, int, int]:
    rgb = image.convert("RGB")
    samples: list[tuple[int, int, int]] = []
    size = 32
    for left, top in ((0, 0), (rgb.width - size, 0), (0, rgb.height - size), (rgb.width - size, rgb.height - size)):
        samples.extend(rgb.crop((left, top, left + size, top + size)).get_flattened_data())
    channels = list(zip(*samples))
    return tuple(sorted(channel)[len(channel) // 2] for channel in channels)  # type: ignore[return-value]


def extract_connected_alpha(image: Image.Image) -> tuple[Image.Image, tuple[int, int, int]]:
    rgb = image.convert("RGB")
    background = background_color(rgb)
    background_layer = Image.new("RGB", rgb.size, background)
    difference = ImageChops.difference(rgb, background_layer)
    red, green, blue = difference.split()
    maximum_difference = ImageChops.lighter(ImageChops.lighter(red, green), blue)

    background_like = maximum_difference.point(lambda value: 255 if value <= 30 else 0)
    connected_background = background_like.copy()
    for point in ((0, 0), (rgb.width - 1, 0), (0, rgb.height - 1), (rgb.width - 1, rgb.height - 1)):
        ImageDraw.floodfill(connected_background, point, 128, thresh=0)
    remaining = connected_background.point(lambda value: 0 if value == 128 else 255)
    alpha = Image.new("L", rgb.size, 0)
    while (bounds := remaining.getbbox()) is not None:
        left, top, right, bottom = bounds
        pixels = remaining.load()
        seed = next(
            (x, y)
            for y in range(top, bottom)
            for x in range(left, right)
            if pixels[x, y] == 255
        )
        ImageDraw.floodfill(remaining, seed, 128, thresh=0)
        component_size = remaining.histogram()[128]
        if component_size >= 1_000:
            component = remaining.point(lambda value: 255 if value == 128 else 0)
            alpha = ImageChops.lighter(alpha, component)
        remaining = remaining.point(lambda value: 0 if value == 128 else value)

    rgba = rgb.convert("RGBA")
    rgba.putalpha(alpha)
    pixels = rgba.load()
    alpha_pixels = alpha.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            opacity = alpha_pixels[x, y]
            if opacity == 0:
                pixels[x, y] = (0, 0, 0, 0)
    return rgba, background


def alpha_bounds(image: Image.Image) -> tuple[int, int, int, int]:
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("Artwork has no visible pixels")
    return bounds


def auto_fit(image: Image.Image) -> Image.Image:
    left, top, right, bottom = alpha_bounds(image)
    crop = image.crop((left, top, right, bottom))
    usable_width = CANVAS[0] * (1 - 2 * SAFE_INSET) - 2 * CONTOUR_RESERVE
    usable_height = CANVAS[1] * (1 - 2 * SAFE_INSET) - 2 * CONTOUR_RESERVE
    # Two final-canvas pixels absorb the one-pixel Lanczos support outside the resized crop.
    scale = min(2.0, (usable_width - 2) / crop.width, (usable_height - 2) / crop.height)
    final_size = (max(1, int(crop.width * scale)), max(1, int(crop.height * scale)))
    work_size = (final_size[0] * WORK_SCALE, final_size[1] * WORK_SCALE)
    work_crop = crop.resize(work_size, Image.Resampling.BICUBIC)
    work_canvas = Image.new("RGBA", (CANVAS[0] * WORK_SCALE, CANVAS[1] * WORK_SCALE), (0, 0, 0, 0))
    position = ((work_canvas.width - work_size[0]) // 2, (work_canvas.height - work_size[1]) // 2)
    work_canvas.alpha_composite(work_crop, position)
    master = work_canvas.resize(CANVAS, Image.Resampling.LANCZOS)
    alpha = master.getchannel("A").point(lambda value: 0 if value < 8 else 255 if value > 247 else value)
    master.putalpha(alpha)
    pixels = master.load()
    for y in range(master.height):
        for x in range(master.width):
            pixel = pixels[x, y]
            if pixel[3] == 0 or (pixel[3] < 248 and sum(pixel[:3]) / 3 >= 180):
                pixels[x, y] = (0, 0, 0, 0)
    return master


def metadata(image: Image.Image) -> dict[str, object]:
    left, top, right, bottom = alpha_bounds(image)
    alpha = image.getchannel("A")
    alpha_values = list(alpha.get_flattened_data())
    pixels = list(image.get_flattened_data())
    minimum_x = round(CANVAS[0] * SAFE_INSET + CONTOUR_RESERVE)
    minimum_y = round(CANVAS[1] * SAFE_INSET + CONTOUR_RESERVE)
    safe = left >= minimum_x and top >= minimum_y and right <= CANVAS[0] - minimum_x and bottom <= CANVAS[1] - minimum_y
    return {
        "canvas": {"width": CANVAS[0], "height": CANVAS[1]},
        "alphaBoundsPixels": {"left": left, "top": top, "right": right, "bottom": bottom},
        "alphaBounds": {
            "x": round(left / CANVAS[0], 6),
            "y": round(top / CANVAS[1], 6),
            "width": round((right - left) / CANVAS[0], 6),
            "height": round((bottom - top) / CANVAS[1], 6),
        },
        "opticalCenter": {
            "x": round((left + right) / (2 * CANVAS[0]), 6),
            "y": round((top + bottom) / (2 * CANVAS[1]), 6),
        },
        "alphaCoverage": round(sum(value > 0 for value in alpha_values) / len(alpha_values), 6),
        "cornersTransparent": all(alpha.getpixel(point) == 0 for point in ((0, 0), (CANVAS[0] - 1, 0), (0, CANVAS[1] - 1), (CANVAS[0] - 1, CANVAS[1] - 1))),
        "transparentRgbClean": all(
            pixel[:3] == (0, 0, 0) for pixel in image.get_flattened_data() if pixel[3] == 0
        ),
        "brightSemiTransparentPixels": sum(
            1 for pixel in pixels if 0 < pixel[3] < 248 and sum(pixel[:3]) / 3 >= 180
        ),
        "safeInsetPass": safe,
    }


def save_webp(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="WEBP", lossless=True, method=6, exact=True)


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    path = Path("C:/Windows/Fonts/arial.ttf")
    return ImageFont.truetype(path, size) if path.exists() else ImageFont.load_default()


def qa_sheet(entries: list[dict[str, object]], background: tuple[int, int, int, int], path: Path, size: tuple[int, int]) -> None:
    sheet = Image.new("RGBA", size, background)
    draw = ImageDraw.Draw(sheet)
    panel_width = size[0] // len(entries)
    title_height = max(28, round(size[1] * 0.08))
    for index, entry in enumerate(entries):
        master = Image.open(entry["masterPng"]).convert("RGBA")
        bounds = alpha_bounds(master)
        crop = master.crop(bounds)
        available = (panel_width - 24, size[1] - title_height - 20)
        scale = min(available[0] / crop.width, available[1] / crop.height)
        fitted = crop.resize((max(1, round(crop.width * scale)), max(1, round(crop.height * scale))), Image.Resampling.LANCZOS)
        x = index * panel_width + (panel_width - fitted.width) // 2
        y = title_height + (size[1] - title_height - fitted.height) // 2
        sheet.alpha_composite(fitted, (x, y))
        label_color = (65, 39, 20, 255) if sum(background[:3]) > 400 else (246, 231, 207, 255)
        quantity_label = "1 pytel" if entry["quantity"] == 1 else "2 pytle"
        draw.text((index * panel_width + 12, 8), quantity_label, fill=label_color, font=font(max(15, round(title_height * 0.52))))
    path.parent.mkdir(parents=True, exist_ok=True)
    output = sheet.convert("RGB") if background[3] == 255 else sheet
    output.save(path, format="PNG", optimize=True)


def checker_sheet(entries: list[dict[str, object]], path: Path) -> None:
    size = (1536, 1024)
    checker = Image.new("RGBA", size, (238, 238, 238, 255))
    draw = ImageDraw.Draw(checker)
    cell = 32
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(207, 207, 207, 255))
    qa_sheet(entries, (0, 0, 0, 0), path, size)
    overlay = Image.open(path).convert("RGBA")
    checker.alpha_composite(overlay)
    checker.convert("RGB").save(path, format="PNG", optimize=True)


def main() -> None:
    MASTER_ROOT.mkdir(parents=True, exist_ok=True)
    QA_ROOT.mkdir(parents=True, exist_ok=True)
    entries: list[dict[str, object]] = []
    for quantity, source, candidate_id in SOURCES:
        extracted, detected_background = extract_connected_alpha(Image.open(source))
        master = auto_fit(extracted)
        master_png = MASTER_ROOT / f"{candidate_id}.png"
        master_webp = MASTER_ROOT / f"{candidate_id}.webp"
        master.save(master_png, format="PNG", optimize=True)
        save_webp(master, master_webp)
        technical = metadata(master)
        if not all((technical["cornersTransparent"], technical["transparentRgbClean"], technical["safeInsetPass"])) or technical["brightSemiTransparentPixels"] != 0:
            raise ValueError(f"Technical validation failed for {candidate_id}: {technical}")
        entry = {
            "candidateId": candidate_id,
            "quantity": quantity,
            "approvalStatus": "awaiting-visual-approval",
            "runtimeActive": False,
            "source": source.relative_to(ROOT).as_posix(),
            "sourceSha256": sha256(source),
            "detectedBackgroundRgb": detected_background,
            "alphaMethod": "deterministic-connected-background-extraction-with-4x-lanczos-edge",
            "workScale": WORK_SCALE,
            "downsample": "single-lanczos",
            "safeInset": SAFE_INSET,
            "contourReservePixels": CONTOUR_RESERVE,
            **technical,
            "masterPng": str(master_png),
            "masterPngSha256": sha256(master_png),
            "masterWebp": str(master_webp),
            "masterWebpSha256": sha256(master_webp),
            "masterWebpBytes": master_webp.stat().st_size,
        }
        entries.append(entry)
        manifest = master_png.with_suffix(".manifest.json")
        manifest.write_text(json.dumps(entry, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    qa_sheet(entries, (248, 241, 229, 255), QA_ROOT / "pellets-v19-light.png", (1536, 1024))
    qa_sheet(entries, (55, 49, 44, 255), QA_ROOT / "pellets-v19-dark.png", (1536, 1024))
    qa_sheet(entries, (248, 241, 229, 255), QA_ROOT / "pellets-v19-320px.png", (640, 320))
    checker_sheet(entries, QA_ROOT / "pellets-v19-alpha.png")
    summary = {
        "approvalStatus": "awaiting-visual-approval",
        "runtimeActive": False,
        "candidates": [{key: value for key, value in entry.items() if key != "masterPng"} for entry in entries],
        "qa": [path.relative_to(ROOT).as_posix() for path in sorted(QA_ROOT.glob("*.png"))],
    }
    (OUTPUT_ROOT / "manifest.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
