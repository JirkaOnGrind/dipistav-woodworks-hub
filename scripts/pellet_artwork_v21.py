from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_ROOT = ROOT / "public" / "images" / "illustrations" / "configurator-v21"
TARGETS = ((768, 120_000), (1536, 300_000))
PADDING = 4

SOURCES = (
    (1, ROOT / "FINAL1.webp"),
    (2, ROOT / "FINAL2.webp"),
    (3, ROOT / "FINAL3.webp"),
    (6, ROOT / "FINAL6.webp"),
    (9, ROOT / "FINAL9.webp"),
    (12, ROOT / "FINAL12.webp"),
    (15, ROOT / "FINAL15.webp"),
    (21, ROOT / "FINAL21.webp"),
    (24, ROOT / "FINAL24.webp"),
    (28, ROOT / "FINAL28.webp"),
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def corner_backgrounds(image: Image.Image) -> tuple[tuple[int, int, int], ...]:
    rgba = image.convert("RGBA")
    sample_size = max(8, min(rgba.size) // 64)
    boxes = (
        (0, 0, sample_size, sample_size),
        (rgba.width - sample_size, 0, rgba.width, sample_size),
        (0, rgba.height - sample_size, sample_size, rgba.height),
        (
            rgba.width - sample_size,
            rgba.height - sample_size,
            rgba.width,
            rgba.height,
        ),
    )
    colors: list[tuple[int, int, int]] = []
    for box in boxes:
        visible = [pixel[:3] for pixel in rgba.crop(box).get_flattened_data() if pixel[3] > 0]
        if not visible:
            continue
        channels = list(zip(*visible, strict=True))
        colors.append(tuple(sorted(channel)[len(channel) // 2] for channel in channels))
    return tuple(colors)


def is_background_like(
    pixel: tuple[int, int, int, int],
    corner_colors: tuple[tuple[int, int, int], ...],
) -> bool:
    red, green, blue, alpha = pixel
    if alpha == 0:
        return True
    maximum = max(red, green, blue)
    minimum = min(red, green, blue)
    mean = (red + green + blue) / 3
    if mean >= 176 and maximum - minimum <= 46:
        return True
    return any(
        (red - background[0]) ** 2
        + (green - background[1]) ** 2
        + (blue - background[2]) ** 2
        <= 58**2
        for background in corner_colors
    )


def clean_exterior(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = list(rgba.get_flattened_data())
    backgrounds = corner_backgrounds(rgba)
    candidates = Image.new("L", rgba.size, 0)
    candidates.putdata(
        [255 if is_background_like(pixel, backgrounds) else 0 for pixel in pixels]
    )

    for point in (
        (0, 0),
        (rgba.width - 1, 0),
        (0, rgba.height - 1),
        (rgba.width - 1, rgba.height - 1),
    ):
        if candidates.getpixel(point) == 255:
            ImageDraw.floodfill(candidates, point, 128, thresh=0)

    connected = list(candidates.get_flattened_data())
    cleaned = Image.new("RGBA", rgba.size, (0, 0, 0, 0))
    cleaned.putdata(
        [
            (0, 0, 0, 0) if exterior == 128 or pixel[3] == 0 else pixel
            for pixel, exterior in zip(pixels, connected, strict=True)
        ]
    )
    return cleaned


def tight_crop(image: Image.Image) -> Image.Image:
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("Background removal produced an empty image")
    crop = image.crop(bounds)
    padded = Image.new(
        "RGBA",
        (crop.width + PADDING * 2, crop.height + PADDING * 2),
        (0, 0, 0, 0),
    )
    padded.alpha_composite(crop, (PADDING, PADDING))
    return padded


def clear_transparent_rgb(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    visible = alpha.point(lambda value: 255 if value > 0 else 0)
    cleaned = Image.composite(rgba, Image.new("RGBA", rgba.size, (0, 0, 0, 0)), visible)
    cleaned.putalpha(alpha)
    return cleaned


def normalized_metadata(image: Image.Image) -> dict[str, object]:
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("Output image has no visible pixels")
    left, top, right, bottom = bounds
    width, height = image.size
    alpha = image.getchannel("A")
    return {
        "canvas": {"width": width, "height": height},
        "alphaBounds": {
            "x": round(left / width, 6),
            "y": round(top / height, 6),
            "width": round((right - left) / width, 6),
            "height": round((bottom - top) / height, 6),
        },
        "opticalCenter": {
            "x": round((left + right) / (2 * width), 6),
            "y": round((top + bottom) / (2 * height), 6),
        },
        "bottomAnchor": {
            "x": round((left + right) / (2 * width), 6),
            "y": round(bottom / height, 6),
        },
        "alphaCoverage": round(
            sum(alpha.histogram()[1:]) / (width * height), 6
        ),
    }


def validate(image: Image.Image, path: Path, budget: int, *, check_hidden_rgb: bool = False) -> None:
    if image.mode != "RGBA":
        raise ValueError(f"{path.name}: expected RGBA, got {image.mode}")
    alpha = image.getchannel("A")
    if alpha.getbbox() is None or alpha.getextrema()[0] != 0:
        raise ValueError(f"{path.name}: invalid transparent content")
    corners = (
        (0, 0),
        (image.width - 1, 0),
        (0, image.height - 1),
        (image.width - 1, image.height - 1),
    )
    if any(alpha.getpixel(point) != 0 for point in corners):
        raise ValueError(f"{path.name}: corners are not transparent")
    if check_hidden_rgb and any(
        pixel[:3] != (0, 0, 0)
        for pixel in image.get_flattened_data()
        if pixel[3] == 0
    ):
        raise ValueError(f"{path.name}: hidden RGB data remains under transparent pixels")


def save_derivative(image: Image.Image, quantity: int, width: int, budget: int) -> dict[str, object]:
    height = max(1, round(image.height * width / image.width))
    resized = clear_transparent_rgb(
        image.resize((width, height), Image.Resampling.LANCZOS)
    )
    output = OUTPUT_ROOT / f"pellets-{quantity}-v21-{width}.webp"
    pending = output.with_suffix(".pending.webp")
    quality = 90
    while True:
        resized.save(
            pending,
            format="WEBP",
            quality=quality,
            alpha_quality=quality,
            method=6,
            exact=True,
        )
        if pending.stat().st_size <= budget or quality == 86:
            break
        quality -= 1
    validate(Image.open(pending).convert("RGBA"), pending, budget)
    pending.replace(output)
    return {
        "width": width,
        "height": height,
        "source": f"/images/illustrations/configurator-v21/{output.name}",
        "bytes": output.stat().st_size,
        "budget": budget,
        "budgetPass": output.stat().st_size <= budget,
        "quality": quality,
        "sha256": sha256(output),
        **normalized_metadata(resized),
    }


def process(quantity: int, source: Path) -> dict[str, object]:
    if not source.exists():
        raise FileNotFoundError(source)
    original = Image.open(source)
    cleaned = tight_crop(clean_exterior(original))
    derivatives = [
        save_derivative(cleaned, quantity, width, budget)
        for width, budget in TARGETS
    ]
    return {
        "quantity": quantity,
        "source": source.name,
        "sourceSha256": sha256(source),
        "sourceCanvas": {"width": original.width, "height": original.height},
        "cropCanvas": {"width": cleaned.width, "height": cleaned.height},
        "derivatives": derivatives,
    }


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    entries = [process(quantity, source) for quantity, source in SOURCES]
    manifest = {
        "version": 21,
        "backgroundRemoval": "exterior-connected-neutral-segmentation",
        "cropPadding": PADDING,
        "entries": entries,
    }
    manifest_path = OUTPUT_ROOT / "manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(manifest, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
