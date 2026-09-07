from __future__ import annotations

import hashlib
import json
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
SOURCE_INPUT = Path(
    r"C:\Users\Utrh\.codex\generated_images\01a0445e-ab1e-7a70-bb72-333b2e8f5aae\exec-86aae855-ff43-4a83-812e-df249c821a7a.png"
)
REFERENCE = ROOT / "Obrázek Codex 27. 8. 2026 13_07_51.png"
OUTPUT_ROOT = ROOT / "tmp" / "pellets-v17-unit-tile"
SOURCE_COPY = OUTPUT_ROOT / "source" / "pellets-bag-unit-tile-source-a-v17.png"
MASTER_PNG = OUTPUT_ROOT / "candidates" / "masters" / "pellets-bag-1-unit-tile-candidate-a-v17.png"
MASTER_WEBP = MASTER_PNG.with_suffix(".webp")
MANIFEST = MASTER_PNG.with_suffix(".manifest.json")
QA_ROOT = OUTPUT_ROOT / "candidates" / "qa"
PROMPT_SPEC = OUTPUT_ROOT / "pellets-unit-tile-v17.prompt.md"

sys.path.insert(0, str(ROOT / "scripts"))
from artwork_v11 import sanitize_antialias_alpha, save_webp  # noqa: E402
from pellet_artwork_v15 import fit_master, metadata, source_rgba  # noqa: E402


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def clean_alpha(image: Image.Image) -> Image.Image:
    image = sanitize_antialias_alpha(image.convert("RGBA"))
    pixels = np.asarray(image).copy()
    pixels[pixels[:, :, 3] == 0, :3] = 0
    return Image.fromarray(pixels, "RGBA")


def composite(image: Image.Image, color: tuple[int, int, int, int]) -> Image.Image:
    background = Image.new("RGBA", image.size, color)
    background.alpha_composite(image)
    return background


def thumbnail_panel(image: Image.Image, size: int, color: tuple[int, int, int, int]) -> Image.Image:
    panel = Image.new("RGBA", (size, size), color)
    alpha_bounds = image.getchannel("A").getbbox()
    if alpha_bounds is None:
        raise ValueError("Unit Tile has no visible pixels")
    crop = image.crop(alpha_bounds)
    scale = min((size - 8) / crop.width, (size - 8) / crop.height)
    thumb = crop.resize(
        (max(1, round(crop.width * scale)), max(1, round(crop.height * scale))),
        Image.Resampling.LANCZOS,
    )
    panel.alpha_composite(thumb, ((size - thumb.width) // 2, (size - thumb.height) // 2))
    return panel


def checkerboard(size: tuple[int, int], cell: int = 24) -> Image.Image:
    image = Image.new("RGBA", size, (238, 238, 238, 255))
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(207, 207, 207, 255))
    return image


def main() -> None:
    for directory in (SOURCE_COPY.parent, MASTER_PNG.parent, QA_ROOT):
        directory.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SOURCE_INPUT, SOURCE_COPY)

    source, alpha_method = source_rgba(SOURCE_COPY)
    master = clean_alpha(fit_master(source, 0.40))
    master.save(MASTER_PNG, format="PNG", optimize=True)
    save_webp(master, MASTER_WEBP)

    composite(master, (248, 241, 229, 255)).save(QA_ROOT / "pellets-unit-tile-v17-light.png")
    composite(master, (55, 49, 44, 255)).save(QA_ROOT / "pellets-unit-tile-v17-dark.png")

    checker = checkerboard(master.size)
    checker.alpha_composite(master)
    checker.save(QA_ROOT / "pellets-unit-tile-v17-alpha.png")

    mobile = Image.new("RGBA", (160, 80), (0, 0, 0, 0))
    mobile.alpha_composite(thumbnail_panel(master, 80, (248, 241, 229, 255)), (0, 0))
    mobile.alpha_composite(thumbnail_panel(master, 80, (55, 49, 44, 255)), (80, 0))
    mobile.save(QA_ROOT / "pellets-unit-tile-v17-80px.png")
    thumbnail_panel(master, 320, (248, 241, 229, 255)).save(
        QA_ROOT / "pellets-unit-tile-v17-320px.png"
    )

    technical = metadata(master)
    manifest = {
        "candidateId": "pellets-bag-1-unit-tile-candidate-a-v17",
        "styleVersion": "v17-candidate",
        "approvalStatus": "awaiting-visual-approval",
        "runtimeActive": False,
        "family": "pellets-bag",
        "quantity": 1,
        "representativeCount": 1,
        "canvas": technical["canvas"],
        "alphaBoundsPixels": technical["alphaBoundsPixels"],
        "alphaBounds": technical["alphaBounds"],
        "opticalCenter": technical["opticalCenter"],
        "alphaCoverage": technical["alphaCoverage"],
        "cornersTransparent": technical["cornersTransparent"],
        "transparentRgbClean": technical["transparentRgbClean"],
        "safeInset": 0.07,
        "contourReservePixels": 8,
        "workScale": 4,
        "downsample": "single-lanczos",
        "camera": {"projection": "orthographic", "azimuthDegrees": 40, "elevationDegrees": 27},
        "lighting": "upper-left-object-lighting-no-cast-shadow",
        "branding": {
            "printedSurface": "broad-front-face-only",
            "forbiddenSurfaces": ["right-gusset", "top-closure", "seams", "bottom", "rear"],
            "exactText": "15 kg",
            "layout": "double-circle-pinecone-needles-five-pellets-two-rules",
        },
        "alphaMethod": alpha_method + "+opaque-interior-sanitization",
        "reference": str(REFERENCE.relative_to(ROOT)).replace("\\", "/"),
        "referenceSha256": sha256(REFERENCE),
        "generatedSource": str(SOURCE_COPY.relative_to(ROOT)).replace("\\", "/"),
        "generatedSourceSha256": sha256(SOURCE_COPY),
        "promptSpec": str(PROMPT_SPEC.relative_to(ROOT)).replace("\\", "/"),
        "promptSpecSha256": sha256(PROMPT_SPEC),
        "masterPngSha256": sha256(MASTER_PNG),
        "masterWebpSha256": sha256(MASTER_WEBP),
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(json.dumps({"png": str(MASTER_PNG), "webp": str(MASTER_WEBP), "manifest": str(MANIFEST), **technical}, indent=2))


if __name__ == "__main__":
    main()
