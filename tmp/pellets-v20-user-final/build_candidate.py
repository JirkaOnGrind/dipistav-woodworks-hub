from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
OUTPUT_ROOT = ROOT / "tmp" / "pellets-v20-user-final"
MASTER_ROOT = OUTPUT_ROOT / "candidates" / "masters"
QA_ROOT = OUTPUT_ROOT / "candidates" / "qa"
SOURCE = ROOT / "FINAL3.webp"
CANDIDATE_ID = "pellets-bag-3-candidate-a-v20"
CANVAS = (1536, 1024)
WORK_SCALE = 4
SAFE_INSET = 0.07
CONTOUR_RESERVE = 8


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def alpha_bounds(image: Image.Image) -> tuple[int, int, int, int]:
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("Artwork has no visible pixels")
    return bounds


def remove_exterior_neutral_halo(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = list(rgba.get_flattened_data())
    exterior_candidates = Image.new("L", rgba.size, 0)
    exterior_candidates.putdata(
        [
            255
            if pixel[3] == 0
            or (max(pixel[:3]) - min(pixel[:3]) < 12 and sum(pixel[:3]) / 3 >= 180)
            else 0
            for pixel in pixels
        ]
    )
    for point in (
        (0, 0),
        (rgba.width - 1, 0),
        (0, rgba.height - 1),
        (rgba.width - 1, rgba.height - 1),
    ):
        ImageDraw.floodfill(exterior_candidates, point, 128, thresh=0)

    cleaned_pixels = []
    connected = exterior_candidates.get_flattened_data()
    for pixel, exterior in zip(pixels, connected, strict=True):
        if exterior == 128 or pixel[3] == 0:
            cleaned_pixels.append((0, 0, 0, 0))
        else:
            cleaned_pixels.append(pixel)
    cleaned = Image.new("RGBA", rgba.size, (0, 0, 0, 0))
    cleaned.putdata(cleaned_pixels)
    return cleaned


def auto_fit(image: Image.Image) -> Image.Image:
    crop = image.crop(alpha_bounds(image))
    usable_width = CANVAS[0] * (1 - 2 * SAFE_INSET) - 2 * CONTOUR_RESERVE
    usable_height = CANVAS[1] * (1 - 2 * SAFE_INSET) - 2 * CONTOUR_RESERVE
    scale = min(2.0, (usable_width - 2) / crop.width, (usable_height - 2) / crop.height)
    final_size = (max(1, int(crop.width * scale)), max(1, int(crop.height * scale)))
    work_size = (final_size[0] * WORK_SCALE, final_size[1] * WORK_SCALE)
    work_crop = crop.resize(work_size, Image.Resampling.BICUBIC)
    work_canvas = Image.new(
        "RGBA", (CANVAS[0] * WORK_SCALE, CANVAS[1] * WORK_SCALE), (0, 0, 0, 0)
    )
    position = (
        (work_canvas.width - work_size[0]) // 2,
        (work_canvas.height - work_size[1]) // 2,
    )
    work_canvas.alpha_composite(work_crop, position)
    master = work_canvas.resize(CANVAS, Image.Resampling.LANCZOS)
    alpha = master.getchannel("A").point(
        lambda value: 0 if value < 8 else 255 if value > 247 else value
    )
    master.putalpha(alpha)

    output = []
    for pixel in master.get_flattened_data():
        is_neutral_bright_edge = (
            pixel[3] > 0
            and max(pixel[:3]) - min(pixel[:3]) < 12
            and sum(pixel[:3]) / 3 >= 180
        )
        output.append((0, 0, 0, 0) if pixel[3] == 0 or is_neutral_bright_edge else pixel)
    master.putdata(output)
    return master


def metadata(image: Image.Image) -> dict[str, object]:
    left, top, right, bottom = alpha_bounds(image)
    pixels = list(image.get_flattened_data())
    alpha_values = [pixel[3] for pixel in pixels]
    minimum_x = round(CANVAS[0] * SAFE_INSET + CONTOUR_RESERVE)
    minimum_y = round(CANVAS[1] * SAFE_INSET + CONTOUR_RESERVE)
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
        "cornersTransparent": all(
            image.getpixel(point)[3] == 0
            for point in ((0, 0), (CANVAS[0] - 1, 0), (0, CANVAS[1] - 1), (CANVAS[0] - 1, CANVAS[1] - 1))
        ),
        "transparentRgbClean": all(
            pixel[:3] == (0, 0, 0) for pixel in pixels if pixel[3] == 0
        ),
        "neutralBrightVisiblePixels": sum(
            1
            for pixel in pixels
            if pixel[3] > 0
            and max(pixel[:3]) - min(pixel[:3]) < 12
            and sum(pixel[:3]) / 3 >= 180
        ),
        "safeInsetPass": (
            left >= minimum_x
            and top >= minimum_y
            and right <= CANVAS[0] - minimum_x
            and bottom <= CANVAS[1] - minimum_y
        ),
    }


def save_webp(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="WEBP", lossless=True, method=6, exact=True)


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    path = Path("C:/Windows/Fonts/arial.ttf")
    return ImageFont.truetype(path, size) if path.exists() else ImageFont.load_default()


def qa_panel(master: Image.Image, background: tuple[int, int, int, int], size: tuple[int, int]) -> Image.Image:
    panel = Image.new("RGBA", size, background)
    crop = master.crop(alpha_bounds(master))
    title_height = max(28, round(size[1] * 0.08))
    available = (size[0] - 24, size[1] - title_height - 20)
    scale = min(available[0] / crop.width, available[1] / crop.height)
    fitted = crop.resize(
        (max(1, round(crop.width * scale)), max(1, round(crop.height * scale))),
        Image.Resampling.LANCZOS,
    )
    panel.alpha_composite(
        fitted,
        ((size[0] - fitted.width) // 2, title_height + (size[1] - title_height - fitted.height) // 2),
    )
    label_color = (65, 39, 20, 255) if sum(background[:3]) > 400 else (246, 231, 207, 255)
    ImageDraw.Draw(panel).text(
        (12, 8), "3 pytle", fill=label_color, font=font(max(15, round(title_height * 0.52)))
    )
    return panel


def checkerboard(size: tuple[int, int], cell: int = 32) -> Image.Image:
    image = Image.new("RGBA", size, (238, 238, 238, 255))
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(207, 207, 207, 255))
    return image


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(SOURCE)
    MASTER_ROOT.mkdir(parents=True, exist_ok=True)
    QA_ROOT.mkdir(parents=True, exist_ok=True)

    source = Image.open(SOURCE).convert("RGBA")
    master = auto_fit(remove_exterior_neutral_halo(source))
    master_png = MASTER_ROOT / f"{CANDIDATE_ID}.png"
    master_webp = MASTER_ROOT / f"{CANDIDATE_ID}.webp"
    master.save(master_png, format="PNG", optimize=True)
    save_webp(master, master_webp)

    technical = metadata(master)
    if not all(
        (
            technical["cornersTransparent"],
            technical["transparentRgbClean"],
            technical["safeInsetPass"],
        )
    ):
        raise ValueError(f"Technical validation failed: {technical}")
    if technical["neutralBrightVisiblePixels"] != 0:
        raise ValueError(f"Neutral halo validation failed: {technical}")

    qa_panel(master, (248, 241, 229, 255), CANVAS).convert("RGB").save(
        QA_ROOT / "pellets-bag-3-v20-light.png", optimize=True
    )
    qa_panel(master, (55, 49, 44, 255), CANVAS).convert("RGB").save(
        QA_ROOT / "pellets-bag-3-v20-dark.png", optimize=True
    )
    qa_panel(master, (248, 241, 229, 255), (320, 320)).convert("RGB").save(
        QA_ROOT / "pellets-bag-3-v20-320px.png", optimize=True
    )
    alpha_qa = checkerboard(CANVAS)
    alpha_qa.alpha_composite(master)
    alpha_qa.convert("RGB").save(QA_ROOT / "pellets-bag-3-v20-alpha.png", optimize=True)

    manifest = {
        "candidateId": CANDIDATE_ID,
        "quantity": 3,
        "quantityBand": {"min": 3, "max": 4},
        "representativeCount": 3,
        "approvalStatus": "awaiting-visual-approval",
        "runtimeActive": False,
        "source": SOURCE.relative_to(ROOT).as_posix(),
        "sourceSha256": sha256(SOURCE),
        "alphaMethod": "preserved-source-alpha+connected-exterior-neutral-halo-removal",
        "workScale": WORK_SCALE,
        "downsample": "single-lanczos",
        "safeInset": SAFE_INSET,
        "contourReservePixels": CONTOUR_RESERVE,
        **technical,
        "masterPng": master_png.relative_to(ROOT).as_posix(),
        "masterPngSha256": sha256(master_png),
        "masterWebp": master_webp.relative_to(ROOT).as_posix(),
        "masterWebpSha256": sha256(master_webp),
        "masterWebpBytes": master_webp.stat().st_size,
        "qa": [path.relative_to(ROOT).as_posix() for path in sorted(QA_ROOT.glob("*.png"))],
    }
    (MASTER_ROOT / f"{CANDIDATE_ID}.manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (OUTPUT_ROOT / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(json.dumps(manifest, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
