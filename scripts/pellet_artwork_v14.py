#!/usr/bin/env python3
"""Build inactive v14 pellet bag/set master candidates and QA sheets."""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw

from artwork_v11 import CANVAS, alpha_metadata, contact_sheet, save_webp, sha256, write_json


SOURCE_ROOT = Path("tmp/pellets-v14/source")
CANONICAL_BAG = Path("public/images/illustrations/configurator-v3/pelety-pytel-v3.webp")
SAFE_INSET = 0.07
CONTOUR_RESERVE = 8
RENDER_SCALE = 4


def placement(cx: int, cy: int, width: int, height: int, rotation: float = 0) -> dict[str, float]:
    return {"cx": cx, "cy": cy, "width": width, "height": height, "rotation": rotation}


SCENES = {
    "pellets-bag-1-master-v14": {
        "source": "pellets-1-blank-source-v14.png",
        "band": {"min": 1, "max": 1},
        "representativeCount": 1,
        "targetAlphaWidth": 0.40,
        "placements": [placement(620, 650, 500, 820)],
    },
    "pellets-bag-2-master-v14": {
        "source": "pellets-2-blank-source-v14.png",
        "band": {"min": 2, "max": 2},
        "representativeCount": 2,
        "targetAlphaWidth": 0.52,
        "placements": [placement(520, 525, 350, 560, 1), placement(1010, 535, 350, 560, -3)],
    },
    "pellets-bag-3-4-master-v14": {
        "source": "pellets-3-blank-source-v14.png",
        "band": {"min": 3, "max": 4},
        "representativeCount": 3,
        "targetAlphaWidth": 0.60,
        "placements": [
            placement(770, 300, 300, 490),
            placement(485, 710, 320, 185, -2),
            placement(1015, 720, 320, 185, 2),
        ],
    },
    "pellets-bag-5-9-master-v14": {
        "source": "pellets-5-blank-source-v14.png",
        "band": {"min": 5, "max": 9},
        "representativeCount": 5,
        "targetAlphaWidth": 0.68,
        "placements": [
            placement(1110, 305, 260, 430, -2),
            placement(735, 405, 300, 180),
            placement(345, 745, 285, 165, -1),
            placement(760, 770, 285, 165),
            placement(1180, 770, 285, 165, 1),
        ],
    },
    "pellets-bag-10-19-master-v14": {
        "source": "pellets-10-blank-source-v14.png",
        "band": {"min": 10, "max": 19},
        "representativeCount": 10,
        "targetAlphaWidth": 0.76,
        "placements": [
            placement(760, 235, 225, 350),
            placement(525, 425, 225, 130),
            placement(990, 425, 225, 130),
            placement(525, 610, 225, 130),
            placement(990, 610, 225, 130),
            placement(525, 790, 240, 135),
            placement(990, 790, 240, 135),
            placement(255, 690, 185, 315, -8),
            placement(1285, 690, 185, 315, 8),
        ],
    },
    "pellets-bag-20plus-master-v14": {
        "source": "pellets-20-blank-source-v14.png",
        "band": {"min": 20},
        "representativeCount": 20,
        "targetAlphaWidth": 0.80,
        "placements": [
            *[placement(x, 225, 190, 108) for x in (610, 915)],
            *[placement(x, 390, 190, 108) for x in (330, 610, 900, 1190)],
            *[placement(x, 565, 185, 104) for x in (210, 475, 745, 1015, 1280)],
            *[placement(x, 760, 180, 102) for x in (145, 390, 635, 880, 1125, 1370)],
        ],
    },
    "pellets-set-1-master-v14": {
        "aliasOf": "pellets-bag-10-19-master-v14",
        "band": {"min": 1, "max": 1},
        "representativeCount": 10,
        "targetAlphaWidth": 0.76,
    },
    "pellets-set-2-master-v14": {
        "aliasOf": "pellets-bag-20plus-master-v14",
        "band": {"min": 2, "max": 2},
        "representativeCount": 20,
        "targetAlphaWidth": 0.80,
    },
    "pellets-set-3-4-master-v14": {
        "source": "pellets-30-blank-source-v14.png",
        "band": {"min": 3, "max": 4},
        "representativeCount": 30,
        "targetAlphaWidth": 0.83,
        "placements": [
            *[placement(x, 210, 145, 82) for x in (690, 980)],
            *[placement(x, 330, 140, 80) for x in (350, 650, 900, 1150)],
            *[placement(x, 450, 138, 78) for x in (250, 500, 760, 1020, 1280)],
            *[placement(x, 570, 135, 77) for x in (120, 360, 600, 840, 1080, 1320)],
            *[placement(x, 690, 132, 75) for x in (100, 320, 540, 760, 980, 1200, 1420)],
            *[placement(x, 800, 130, 74) for x in (430, 650, 870, 1090)],
        ],
    },
    "pellets-set-5plus-master-v14": {
        "source": "pellets-50-blank-source-v14.png",
        "band": {"min": 5},
        "representativeCount": 50,
        "targetAlphaWidth": 0.85,
        "placements": [
            placement(760, 220, 118, 68),
            *[placement(x, 295, 116, 66) for x in (560, 850, 1100)],
            *[placement(x, 370, 114, 65) for x in (350, 600, 850, 1100, 1300)],
            *[placement(x, 445, 112, 64) for x in (240, 470, 700, 930, 1160, 1390)],
            *[placement(x, 520, 110, 63) for x in (140, 360, 580, 800, 1020, 1240, 1450)],
            *[placement(x, 600, 108, 62) for x in (100, 300, 500, 700, 900, 1100, 1300, 1480)],
            *[placement(x, 680, 106, 61) for x in (100, 300, 500, 700, 900, 1100, 1300, 1480)],
            *[placement(x, 760, 104, 60) for x in (180, 400, 620, 840, 1060, 1280, 1450)],
        ],
    },
}


def checkerboard_cutout(image: Image.Image) -> Image.Image:
    if image.mode == "RGBA" and image.getchannel("A").getextrema()[0] == 0:
        return image.copy()
    rgb = image.convert("RGB")
    background = Image.new("L", rgb.size)
    background.putdata(
        [
            255 if max(pixel) - min(pixel) <= 12 and min(pixel) >= 205 else 0
            for pixel in rgb.get_flattened_data()
        ]
    )
    ImageDraw.floodfill(background, (0, 0), 128, thresh=0)
    alpha = background.point(lambda value: 0 if value == 128 else 255)
    rgba = rgb.convert("RGBA")
    rgba.putalpha(alpha)
    return rgba


def build_brand_decal() -> Image.Image:
    canonical = Image.open(CANONICAL_BAG).convert("RGB")
    crop = canonical.crop((325, 225, 825, 1080))
    alpha = Image.new("L", crop.size)
    alpha.putdata(
        [
            max(0, min(255, (220 - red) * 5))
            for red, _, _ in crop.get_flattened_data()
        ]
    )
    decal = Image.new("RGBA", crop.size, (80, 24, 1, 0))
    decal.putalpha(alpha)
    return decal


def apply_decal(base: Image.Image, decal: Image.Image, placements: list[dict[str, float]]) -> Image.Image:
    result = base.copy()
    silhouette = base.getchannel("A")
    for item in placements:
        width = round(item["width"])
        height = round(item["height"])
        rendered = decal.resize((width, height), Image.Resampling.LANCZOS)
        if item["rotation"]:
            rendered = rendered.rotate(item["rotation"], resample=Image.Resampling.BICUBIC, expand=True)
        x = round(item["cx"] - rendered.width / 2)
        y = round(item["cy"] - rendered.height / 2)
        result.alpha_composite(rendered, (x, y))
    result.putalpha(silhouette)
    return result


def canonicalize(image: Image.Image, target_width: float) -> Image.Image:
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise AssertionError("Empty pellet candidate")
    cutout = image.crop(bounds)
    downsample_reserve = CONTOUR_RESERVE + 4
    usable_width = CANVAS[0] * (1 - 2 * SAFE_INSET) - 2 * downsample_reserve
    usable_height = CANVAS[1] * (1 - 2 * SAFE_INSET) - 2 * downsample_reserve
    scale = min(target_width * CANVAS[0] / cutout.width, usable_width / cutout.width, usable_height / cutout.height)
    final_size = (round(cutout.width * scale), round(cutout.height * scale))
    large_size = (final_size[0] * RENDER_SCALE, final_size[1] * RENDER_SCALE)
    large = cutout.resize(large_size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS[0] * RENDER_SCALE, CANVAS[1] * RENDER_SCALE), (0, 0, 0, 0))
    canvas.alpha_composite(
        large,
        ((canvas.width - large.width) // 2, (canvas.height - large.height) // 2),
    )
    return canvas.resize(CANVAS, Image.Resampling.LANCZOS)


def validate_master(image: Image.Image, scene_id: str) -> None:
    if image.mode != "RGBA" or image.size != CANVAS:
        raise AssertionError(f"Invalid canvas for {scene_id}: {image.mode} {image.size}")
    alpha = image.getchannel("A")
    if any(alpha.getpixel(point) for point in ((0, 0), (CANVAS[0] - 1, 0), (0, CANVAS[1] - 1), (CANVAS[0] - 1, CANVAS[1] - 1))):
        raise AssertionError(f"Non-transparent corner in {scene_id}")
    bounds = alpha.getbbox()
    if bounds is None:
        raise AssertionError(f"Empty master: {scene_id}")
    left, top, right, bottom = bounds
    minimum_x = round(CANVAS[0] * SAFE_INSET) + CONTOUR_RESERVE
    minimum_y = round(CANVAS[1] * SAFE_INSET) + CONTOUR_RESERVE
    if left < minimum_x or CANVAS[0] - right < minimum_x or top < minimum_y or CANVAS[1] - bottom < minimum_y:
        raise AssertionError(f"Unsafe alpha bounds for {scene_id}: {bounds}")


def render(output_dir: Path) -> dict[str, object]:
    masters_dir = output_dir / "masters"
    qa_dir = output_dir / "qa"
    decal_dir = output_dir / "decal"
    decal_dir.mkdir(parents=True, exist_ok=True)
    decal = build_brand_decal()
    decal_path = decal_dir / "pellets-brand-decal-v14.png"
    decal.save(decal_path)

    rendered: dict[str, Path] = {}
    manifests: list[dict[str, object]] = []
    for scene_id, scene in SCENES.items():
        master_path = masters_dir / f"{scene_id}.webp"
        if "aliasOf" in scene:
            source_master = rendered[str(scene["aliasOf"])]
            master_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source_master, master_path)
            source_path = source_master
            placement_count = SCENES[str(scene["aliasOf"])]["placements"]
        else:
            source_path = SOURCE_ROOT / str(scene["source"])
            base = checkerboard_cutout(Image.open(source_path))
            branded = apply_decal(base, decal, list(scene["placements"]))
            master = canonicalize(branded, float(scene["targetAlphaWidth"]))
            validate_master(master, scene_id)
            save_webp(master, master_path)
            placement_count = scene["placements"]
        rendered[scene_id] = master_path
        master_image = Image.open(master_path).convert("RGBA")
        metadata = alpha_metadata(master_image)
        metadata.update(
            {
                "styleVersion": "v14-candidate",
                "approvalStatus": "awaiting-visual-approval",
                "runtimeActivation": "blocked-until-explicit-visual-approval",
                "quantityBand": scene["band"],
                "representativeCount": scene["representativeCount"],
                "targetAlphaWidth": scene["targetAlphaWidth"],
                "renderMode": "master",
                "renderTechnique": "reference-guided-whole-scene-plus-deterministic-brand-decal",
                "source": source_path.as_posix(),
                "sourceSha256": sha256(source_path),
                "canonicalBag": CANONICAL_BAG.as_posix(),
                "canonicalBagSha256": sha256(CANONICAL_BAG),
                "brandDecal": decal_path.as_posix(),
                "brandDecalSha256": sha256(decal_path),
                "brandPlacementCount": len(placement_count),
                "outputSha256": sha256(master_path),
            }
        )
        manifest_path = master_path.with_suffix(".manifest.json")
        write_json(manifest_path, metadata)
        manifests.append({"image": master_path, "manifest": manifest_path, "label": scene_id})

    bag_entries = [entry for entry in manifests if str(entry["label"]).startswith("pellets-bag-")]
    set_entries = [entry for entry in manifests if str(entry["label"]).startswith("pellets-set-")]
    qa_paths: list[str] = []
    for family, entries in (("pellets-bag", bag_entries), ("pellets-set", set_entries)):
        for suffix, background, cell_size, columns in (
            ("light", "#F8F1E5", (480, 320), 3),
            ("dark", "#3B352F", (480, 320), 3),
            ("320", "#F8F1E5", (320, 220), 2),
        ):
            path = qa_dir / f"{family}-v14-{suffix}.png"
            contact_sheet(
                entries,
                path,
                f"{family} v14 candidates - {suffix}",
                background,
                cell_size=cell_size,
                columns=columns,
                presentation_shadow=True,
            )
            qa_paths.append(path.as_posix())

    result = {
        "valid": True,
        "approvalStatus": "awaiting-visual-approval",
        "runtimeActivation": "blocked-until-explicit-visual-approval",
        "masters": [
            {
                "image": entry["image"].as_posix(),
                "manifest": entry["manifest"].as_posix(),
                "sha256": sha256(entry["image"]),
            }
            for entry in manifests
        ],
        "qa": qa_paths,
    }
    write_json(output_dir / "validation.json", result)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, default=Path("tmp/pellets-v14/candidates"))
    arguments = parser.parse_args()
    print(json.dumps(render(arguments.output_dir), indent=2))
