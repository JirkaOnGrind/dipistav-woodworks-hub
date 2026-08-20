from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
CURRENT_DIR = ROOT / "public/images/illustrations/configurator-v11"
CANDIDATE_DIR = ROOT / "tmp/artwork-v11-topgrain-smooth-v7/plank-topgrain-smooth-v7"
OUTPUT_DIR = ROOT / "tmp/artwork-v11-topgrain-smooth-v7/qa"
BACKGROUND = (244, 239, 229, 255)
LABEL_COLOR = (42, 36, 31, 255)


def load_composited(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    background = Image.new("RGBA", image.size, BACKGROUND)
    background.alpha_composite(image)
    return background.convert("RGB")


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (
        Path("C:/Windows/Fonts/arialbd.ttf"),
        Path("C:/Windows/Fonts/arial.ttf"),
    ):
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def labeled_pair(
    current: Image.Image,
    candidate: Image.Image,
    crop: tuple[int, int, int, int],
    output: Path,
) -> None:
    panels = [current.crop(crop), candidate.crop(crop)]
    labels = ["AKTIVNÍ V6", "KANDIDÁT V7 — VYHLAZENÍ"]
    gap = 24
    label_height = 58
    width = panels[0].width * 2 + gap
    height = panels[0].height + label_height
    sheet = Image.new("RGB", (width, height), BACKGROUND[:3])
    draw = ImageDraw.Draw(sheet)
    label_font = font(24)

    for index, (panel, label) in enumerate(zip(panels, labels, strict=True)):
        x = index * (panel.width + gap)
        sheet.paste(panel, (x, label_height))
        draw.text((x + 8, 15), label, fill=LABEL_COLOR[:3], font=label_font)

    sheet.save(output, quality=96)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    current = load_composited(CURRENT_DIR / "plank-family-match-v6-1-master-v11.webp")
    candidate = load_composited(CANDIDATE_DIR / "plank-topgrain-smooth-v7-1-master-v11.webp")

    # A native-resolution crop isolates the same upper-face grain in both files.
    labeled_pair(
        current,
        candidate,
        (330, 155, 1170, 465),
        OUTPUT_DIR / "plank-topgrain-current-vs-v7-100pct.png",
    )

    # The full object verifies that the refinement did not alter composition.
    labeled_pair(
        current,
        candidate,
        (80, 120, 1460, 900),
        OUTPUT_DIR / "plank-full-current-vs-v7.png",
    )


if __name__ == "__main__":
    main()
