from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
OUTPUT_ROOT = ROOT / "tmp" / "pellets-v18-phase1-logo"
SOURCE = OUTPUT_ROOT / "source" / "pellets-logo-phase1-source-a-v18.png"
PROMPT = OUTPUT_ROOT / "pellets-logo-phase1-candidate-a-v18.prompt.md"
MASTER_ROOT = OUTPUT_ROOT / "candidates" / "masters"
QA_ROOT = OUTPUT_ROOT / "candidates" / "qa"
MASTER_PNG = MASTER_ROOT / "pellets-logo-flat-master-candidate-b-v18.png"
MASTER_WEBP = MASTER_ROOT / "pellets-logo-flat-master-candidate-b-v18.webp"
MANIFEST = MASTER_ROOT / "pellets-logo-flat-master-candidate-b-v18.manifest.json"
LOCKED_UNIT = ROOT / "artwork-sources" / "pellets" / "pellets-bag-unit-tile-master-v17.png"
LOCK_FILE = ROOT / "artwork-sources" / "pellets" / "pellets-bag-unit-tile-master-v17.lock.json"
INK = (0x6B, 0x31, 0x0B)

sys.path.insert(0, str(ROOT / "scripts"))
from artwork_v11 import save_webp  # noqa: E402
from pellet_artwork_v15 import (  # noqa: E402
    composite,
    fit_master,
    metadata,
    source_rgba,
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify_locked_unit() -> str:
    lock = json.loads(LOCK_FILE.read_text(encoding="utf-8"))
    expected = lock["png"]["sha256"]
    actual = sha256(LOCKED_UNIT)
    if actual != expected:
        raise ValueError(f"Locked Unit Tile changed: {actual} != {expected}")
    return actual


def single_ink_logo(source: Image.Image) -> Image.Image:
    pixels = np.asarray(source.convert("RGBA")).copy()
    alpha = pixels[:, :, 3]
    pixels[:, :, 0] = INK[0]
    pixels[:, :, 1] = INK[1]
    pixels[:, :, 2] = INK[2]
    pixels[alpha == 0, :3] = 0
    return Image.fromarray(pixels, "RGBA")


def checkerboard(size: tuple[int, int], cell: int = 24) -> Image.Image:
    image = Image.new("RGBA", size, (238, 238, 238, 255))
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(207, 207, 207, 255))
    return image


def thumbnail_panel(image: Image.Image, size: int, background: tuple[int, int, int, int]) -> Image.Image:
    panel = Image.new("RGBA", (size, size), background)
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("Logo has no visible pixels")
    crop = image.crop(bounds)
    scale = min((size - 8) / crop.width, (size - 8) / crop.height)
    resized = crop.resize(
        (max(1, round(crop.width * scale)), max(1, round(crop.height * scale))),
        Image.Resampling.LANCZOS,
    )
    panel.alpha_composite(resized, ((size - resized.width) // 2, (size - resized.height) // 2))
    return panel


def save_qa(master: Image.Image) -> None:
    QA_ROOT.mkdir(parents=True, exist_ok=True)
    composite(master, (255, 255, 255, 255)).save(
        QA_ROOT / "pellets-logo-flat-candidate-b-v18-white.png", optimize=True
    )
    composite(master, (248, 241, 229, 255)).save(
        QA_ROOT / "pellets-logo-flat-candidate-b-v18-cream.png", optimize=True
    )
    composite(master, (55, 49, 44, 255)).save(
        QA_ROOT / "pellets-logo-flat-candidate-b-v18-dark.png", optimize=True
    )
    alpha = checkerboard(master.size)
    alpha.alpha_composite(master)
    alpha.save(QA_ROOT / "pellets-logo-flat-candidate-b-v18-alpha.png", optimize=True)
    thumbnail_panel(master, 320, (255, 255, 255, 255)).save(
        QA_ROOT / "pellets-logo-flat-candidate-b-v18-320px.png", optimize=True
    )
    thumbnail_panel(master, 80, (255, 255, 255, 255)).save(
        QA_ROOT / "pellets-logo-flat-candidate-b-v18-80px.png", optimize=True
    )


def main() -> None:
    for required in (SOURCE, PROMPT, LOCKED_UNIT, LOCK_FILE):
        if not required.exists():
            raise FileNotFoundError(required)
    MASTER_ROOT.mkdir(parents=True, exist_ok=True)
    locked_hash = verify_locked_unit()
    extracted, alpha_method = source_rgba(SOURCE)
    flat = single_ink_logo(extracted)
    master = single_ink_logo(fit_master(flat, target_width=0.56))
    master.save(MASTER_PNG, format="PNG", optimize=True)
    save_webp(master, MASTER_WEBP)
    save_qa(master)

    manifest = {
        "candidateId": "pellets-logo-flat-master-candidate-b-v18",
        "assetRole": "phase-1-flat-branding",
        "approvalStatus": "awaiting-visual-approval",
        "runtimeActive": False,
        **metadata(master),
        "style": "single-color-vintage-woodcut-engraving",
        "inkColor": "#6B310B",
        "background": "transparent-rgba",
        "textVerbatim": "15 kg",
        "paperTexturePresent": False,
        "threeDimensionalEffectsPresent": False,
        "source": str(SOURCE.relative_to(ROOT)).replace("\\", "/"),
        "sourceSha256": sha256(SOURCE),
        "sourceAlphaMethod": alpha_method,
        "lockedUnitTile": str(LOCKED_UNIT.relative_to(ROOT)).replace("\\", "/"),
        "lockedUnitTileSha256": locked_hash,
        "promptSpec": str(PROMPT.relative_to(ROOT)).replace("\\", "/"),
        "promptSpecSha256": sha256(PROMPT),
        "masterPngSha256": sha256(MASTER_PNG),
        "masterWebpSha256": sha256(MASTER_WEBP),
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
