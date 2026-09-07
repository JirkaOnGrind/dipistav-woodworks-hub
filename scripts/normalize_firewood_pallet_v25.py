from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


CANVAS_SIZE = (1254, 1254)


def extract_checkerboard(image: Image.Image) -> Image.Image:
    rgb = np.asarray(image.convert("RGB"))
    neutral_bright = (rgb.max(axis=2) - rgb.min(axis=2) <= 20) & (rgb.min(axis=2) >= 180)
    candidate = Image.fromarray((neutral_bright * 255).astype(np.uint8), mode="L").copy()
    ImageDraw.floodfill(candidate, (0, 0), 128)
    background = np.asarray(candidate) == 128

    rgba = np.dstack((rgb, np.where(background, 0, 255).astype(np.uint8)))
    return Image.fromarray(rgba, mode="RGBA")


def normalize(input_path: Path, output_path: Path, bounds: tuple[int, int, int, int]) -> None:
    extracted = extract_checkerboard(Image.open(input_path))
    source_bounds = extracted.getbbox()
    if source_bounds is None:
        raise ValueError(f"No foreground found in {input_path}")

    left, top, right, bottom = bounds
    target_size = (right - left, bottom - top)
    subject = extracted.crop(source_bounds).resize(target_size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0))
    canvas.alpha_composite(subject, (left, top))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output_path, format="WEBP", lossless=True, method=6)
    print(f"{output_path}: {canvas.size}, alpha={canvas.getbbox()}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--bounds", nargs=4, type=int, required=True, metavar=("L", "T", "R", "B"))
    args = parser.parse_args()
    normalize(args.input, args.output, tuple(args.bounds))


if __name__ == "__main__":
    main()
