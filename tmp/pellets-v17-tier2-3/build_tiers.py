from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
LOCKED_ROOT = ROOT / "artwork-sources" / "pellets"
LOCKED_PNG = LOCKED_ROOT / "pellets-bag-unit-tile-master-v17.png"
LOCK_FILE = LOCKED_ROOT / "pellets-bag-unit-tile-master-v17.lock.json"
OUTPUT_ROOT = ROOT / "tmp" / "pellets-v17-tier2-3"
SOURCE_ROOT = OUTPUT_ROOT / "source"
MASTER_ROOT = OUTPUT_ROOT / "candidates" / "masters"
QA_ROOT = OUTPUT_ROOT / "candidates" / "qa"
TIER3_BLANK_SOURCE = SOURCE_ROOT / "pellets-tier3-blank-geometry-source-a-v17.png"
TIER3_BRANDED_SOURCE = SOURCE_ROOT / "pellets-tier3-branded-source-a-v17.png"
PROMPT_SPEC = OUTPUT_ROOT / "pellets-tier2-3-v17.prompt.md"

CANVAS = (1536, 1024)
WORK_SCALE = 4
SAFE_INSET = 0.07
CONTOUR_RESERVE = 8
TIER2_TARGET_WIDTH = 0.52
TIER2_GAP = 24
TIER3_TARGET_WIDTH = 0.60

DECAL_CROP = (560, 385, 875, 765)
TIER3_PRINT_FACE = ((570, 190), (1195, 310), (1000, 565), (370, 450))
TIER3_DECAL_QUAD = ((1010, 330), (900, 470), (575, 405), (675, 275))

sys.path.insert(0, str(ROOT / "scripts"))
from artwork_v11 import sanitize_antialias_alpha, save_webp  # noqa: E402
from pellet_artwork_v15 import fit_master, metadata, source_rgba  # noqa: E402


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify_locked_base() -> dict[str, object]:
    lock = json.loads(LOCK_FILE.read_text(encoding="utf-8"))
    actual = sha256(LOCKED_PNG)
    expected = lock["png"]["sha256"]
    if actual != expected:
        raise ValueError(f"Locked Unit Tile hash changed: {actual} != {expected}")
    return lock


def clean_alpha(image: Image.Image) -> Image.Image:
    image = sanitize_antialias_alpha(image.convert("RGBA"))
    pixels = np.asarray(image).copy()
    alpha = pixels[:, :, 3]
    neutral_bright_fringe = (
        (alpha > 0)
        & (alpha < 240)
        & (pixels[:, :, :3].min(axis=2) >= 225)
    )
    pixels[neutral_bright_fringe, 3] = 0
    pixels[pixels[:, :, 3] == 0, :3] = 0
    return Image.fromarray(pixels, "RGBA")


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("Artwork contains no visible pixels")
    return bounds


def compose_tier2(locked: Image.Image) -> tuple[Image.Image, dict[str, object]]:
    crop = locked.crop(alpha_bbox(locked))
    scene_width = round(CANVAS[0] * TIER2_TARGET_WIDTH)
    bag_width = (scene_width - TIER2_GAP) // 2
    scale = bag_width / crop.width
    bag_size = (bag_width, round(crop.height * scale))
    work_bag = crop.resize(
        (bag_size[0] * WORK_SCALE, bag_size[1] * WORK_SCALE), Image.Resampling.BICUBIC
    )
    work_canvas = Image.new("RGBA", (CANVAS[0] * WORK_SCALE, CANVAS[1] * WORK_SCALE))
    left = (work_canvas.width - scene_width * WORK_SCALE) // 2
    top = (work_canvas.height - bag_size[1] * WORK_SCALE) // 2
    placements = []
    for index in range(2):
        x = left + index * (bag_size[0] + TIER2_GAP) * WORK_SCALE
        work_canvas.alpha_composite(work_bag, (x, top))
        placements.append(
            {
                "bagId": f"upright-{index + 1}",
                "x": x // WORK_SCALE,
                "y": top // WORK_SCALE,
                "width": bag_size[0],
                "height": bag_size[1],
                "orientationDegrees": 0,
                "printFace": "front-visible",
            }
        )
    master = clean_alpha(work_canvas.resize(CANVAS, Image.Resampling.LANCZOS))
    return master, {"gapPixels": TIER2_GAP, "placements": placements}


def extract_locked_decal(locked: Image.Image) -> Image.Image:
    crop = locked.crop(DECAL_CROP).convert("RGBA")
    pixels = np.asarray(crop).copy()
    rgb = pixels[:, :, :3].astype(np.float32)
    luminance = rgb[:, :, 0] * 0.299 + rgb[:, :, 1] * 0.587 + rgb[:, :, 2] * 0.114
    ink_alpha = np.clip((195.0 - luminance) / 92.0, 0.0, 1.0)
    warm_brown = (rgb[:, :, 0] >= rgb[:, :, 1]) & (rgb[:, :, 1] >= rgb[:, :, 2])
    ink_alpha *= warm_brown
    alpha = np.rint(ink_alpha * 255.0).astype(np.uint8)
    alpha[alpha < 10] = 0
    pixels[:, :, 3] = alpha
    pixels[alpha == 0, :3] = 0
    return Image.fromarray(pixels, "RGBA")


def perspective_coefficients(
    destination: tuple[tuple[int, int], ...], source: tuple[tuple[int, int], ...]
) -> tuple[float, ...]:
    matrix = []
    vector = []
    for (x, y), (u, v) in zip(destination, source, strict=True):
        matrix.append((x, y, 1, 0, 0, 0, -u * x, -u * y))
        vector.append(u)
        matrix.append((0, 0, 0, x, y, 1, -v * x, -v * y))
        vector.append(v)
    return tuple(np.linalg.solve(np.asarray(matrix, dtype=np.float64), np.asarray(vector)))


def apply_tier3_decal(
    blank_scene: Image.Image, decal: Image.Image
) -> tuple[Image.Image, dict[str, object], Image.Image]:
    source_quad = ((0, 0), (decal.width - 1, 0), (decal.width - 1, decal.height - 1), (0, decal.height - 1))
    coefficients = perspective_coefficients(TIER3_DECAL_QUAD, source_quad)
    warped = decal.transform(
        blank_scene.size,
        Image.Transform.PERSPECTIVE,
        coefficients,
        Image.Resampling.BICUBIC,
    )

    face_mask = Image.new("L", blank_scene.size, 0)
    ImageDraw.Draw(face_mask).polygon(TIER3_PRINT_FACE, fill=255)
    warped_alpha = np.asarray(warped.getchannel("A"))
    mask_values = np.asarray(face_mask)
    outside_before_clip = int(np.count_nonzero((warped_alpha > 0) & (mask_values == 0)))
    clipped_alpha = Image.fromarray(np.minimum(warped_alpha, mask_values).astype(np.uint8), "L")
    warped.putalpha(clipped_alpha)

    branded = blank_scene.copy()
    branded.alpha_composite(warped)
    outside_after_clip = int(
        np.count_nonzero((np.asarray(warped.getchannel("A")) > 0) & (mask_values == 0))
    )

    mask_qa = blank_scene.copy()
    tint = Image.new("RGBA", blank_scene.size, (0, 160, 90, 0))
    tint.putalpha(face_mask.point(lambda value: 82 if value else 0))
    mask_qa.alpha_composite(tint)
    outline = ImageDraw.Draw(mask_qa)
    outline.line((*TIER3_PRINT_FACE, TIER3_PRINT_FACE[0]), fill=(0, 120, 70, 255), width=4)
    outline.line((*TIER3_DECAL_QUAD, TIER3_DECAL_QUAD[0]), fill=(190, 30, 35, 255), width=4)

    return (
        branded,
        {
            "printFacePolygon": TIER3_PRINT_FACE,
            "decalQuad": TIER3_DECAL_QUAD,
            "decalPixelsOutsidePrintFaceBeforeClip": outside_before_clip,
            "decalPixelsOutsidePrintFaceAfterClip": outside_after_clip,
        },
        mask_qa,
    )


def composite(image: Image.Image, color: tuple[int, int, int, int]) -> Image.Image:
    background = Image.new("RGBA", image.size, color)
    background.alpha_composite(image)
    return background


def checkerboard(size: tuple[int, int], cell: int = 24) -> Image.Image:
    image = Image.new("RGBA", size, (238, 238, 238, 255))
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(207, 207, 207, 255))
    return image


def thumbnail_panel(image: Image.Image, size: int, color: tuple[int, int, int, int]) -> Image.Image:
    panel = Image.new("RGBA", (size, size), color)
    crop = image.crop(alpha_bbox(image))
    scale = min((size - 8) / crop.width, (size - 8) / crop.height)
    thumb = crop.resize(
        (max(1, round(crop.width * scale)), max(1, round(crop.height * scale))),
        Image.Resampling.LANCZOS,
    )
    panel.alpha_composite(thumb, ((size - thumb.width) // 2, (size - thumb.height) // 2))
    return panel


def save_candidate(
    tier: int,
    image: Image.Image,
    scene_data: dict[str, object],
    sources: dict[str, str],
) -> dict[str, object]:
    stem = f"pellets-bag-{tier}-master-candidate-a-v17"
    png_path = MASTER_ROOT / f"{stem}.png"
    webp_path = MASTER_ROOT / f"{stem}.webp"
    manifest_path = MASTER_ROOT / f"{stem}.manifest.json"
    png_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(png_path, format="PNG", optimize=True)
    save_webp(image, webp_path)

    technical = metadata(image)
    manifest = {
        "candidateId": stem,
        "styleVersion": "v17-candidate",
        "approvalStatus": "awaiting-visual-approval",
        "runtimeActive": False,
        "family": "pellets-bag",
        "quantity": tier,
        "representativeCount": tier,
        **technical,
        "safeInset": SAFE_INSET,
        "contourReservePixels": CONTOUR_RESERVE,
        "workScale": WORK_SCALE,
        "downsample": "single-lanczos",
        "camera": {"projection": "orthographic", "azimuthDegrees": 40, "elevationDegrees": 27},
        "lighting": "upper-left-object-lighting-no-cast-shadow",
        "lockedBase": str(LOCKED_PNG.relative_to(ROOT)).replace("\\", "/"),
        "lockedBaseSha256": sha256(LOCKED_PNG),
        "promptSpec": str(PROMPT_SPEC.relative_to(ROOT)).replace("\\", "/"),
        "promptSpecSha256": sha256(PROMPT_SPEC),
        "sources": sources,
        "scene": scene_data,
        "masterPngSha256": sha256(png_path),
        "masterWebpSha256": sha256(webp_path),
    }
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    light = composite(image, (248, 241, 229, 255))
    dark = composite(image, (55, 49, 44, 255))
    light.save(QA_ROOT / f"pellets-tier{tier}-v17-light.png")
    dark.save(QA_ROOT / f"pellets-tier{tier}-v17-dark.png")
    alpha_qa = checkerboard(image.size)
    alpha_qa.alpha_composite(image)
    alpha_qa.save(QA_ROOT / f"pellets-tier{tier}-v17-alpha.png")
    thumbnail_panel(image, 320, (248, 241, 229, 255)).save(QA_ROOT / f"pellets-tier{tier}-v17-320px.png")
    mobile = Image.new("RGBA", (160, 80), (0, 0, 0, 0))
    mobile.alpha_composite(thumbnail_panel(image, 80, (248, 241, 229, 255)), (0, 0))
    mobile.alpha_composite(thumbnail_panel(image, 80, (55, 49, 44, 255)), (80, 0))
    mobile.save(QA_ROOT / f"pellets-tier{tier}-v17-80px.png")

    return {"png": png_path, "webp": webp_path, "manifest": manifest_path, **technical}


def main() -> None:
    verify_locked_base()
    if not TIER3_BLANK_SOURCE.exists():
        raise FileNotFoundError(TIER3_BLANK_SOURCE)
    for directory in (MASTER_ROOT, QA_ROOT):
        directory.mkdir(parents=True, exist_ok=True)

    locked = Image.open(LOCKED_PNG).convert("RGBA")
    tier2, tier2_scene = compose_tier2(locked)

    blank_scene, alpha_method = source_rgba(TIER3_BLANK_SOURCE)
    decal = extract_locked_decal(locked)
    decal.save(SOURCE_ROOT / "pellets-locked-print-decal-v17.png")
    branded_scene, tier3_masking, mask_qa = apply_tier3_decal(blank_scene, decal)
    branded_scene.save(TIER3_BRANDED_SOURCE)
    mask_qa.save(QA_ROOT / "pellets-tier3-v17-surface-mask-source.png")
    tier3 = clean_alpha(fit_master(branded_scene, TIER3_TARGET_WIDTH))

    tier2_result = save_candidate(
        2,
        tier2,
        {"layout": "two-upright-parallel", "surfacePolicy": "two-front-print-faces", **tier2_scene},
        {"composition": "two-byte-locked-unit-copies"},
    )
    tier3_result = save_candidate(
        3,
        tier3,
        {
            "layout": "two-prone-parallel-supports-plus-one-perpendicular-prone-bridge",
            "surfacePolicy": "top-bridge-print-face-only; bottom-visible-rear-faces-blank",
            "bottomPrintOrientation": "downward-or-inward",
            "bridgePrintOrientation": "upward",
            "geometryAlphaMethod": alpha_method,
            **tier3_masking,
        },
        {
            "blankGeometry": str(TIER3_BLANK_SOURCE.relative_to(ROOT)).replace("\\", "/"),
            "blankGeometrySha256": sha256(TIER3_BLANK_SOURCE),
            "lockedDecal": str((SOURCE_ROOT / "pellets-locked-print-decal-v17.png").relative_to(ROOT)).replace("\\", "/"),
            "lockedDecalSha256": sha256(SOURCE_ROOT / "pellets-locked-print-decal-v17.png"),
        },
    )

    print(json.dumps({"tier2": {key: str(value) for key, value in tier2_result.items()}, "tier3": {key: str(value) for key, value in tier3_result.items()}}, indent=2))


if __name__ == "__main__":
    main()
