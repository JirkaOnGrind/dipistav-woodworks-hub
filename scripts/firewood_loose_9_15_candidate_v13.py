#!/usr/bin/env python3
"""Build and validate the inactive whole-pile 9–15 prm firewood candidate."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

from artwork_v11 import CANVAS, alpha_metadata, contact_sheet, save_webp, sha256, write_json
from firewood_full_pile_v4 import _assert_master, _canonicalize_whole_pile


SPEC_PATH = Path(__file__).with_name("firewood_loose_9_15_prompt_v13.json")
RUNTIME_ROOT = Path("public/images/illustrations/configurator-v12")
TARGETS = (
    ("1–2 prm", RUNTIME_ROOT / "firewood-loose-1-2-master-v12.webp", 0.62),
    ("3–4 prm", RUNTIME_ROOT / "firewood-loose-3-4-master-v12.webp", 0.70),
    ("5–8 prm", RUNTIME_ROOT / "firewood-loose-5-8-master-v12.webp", 0.76),
    ("9–15 prm candidate v13", None, 0.82),
    ("16+ prm", RUNTIME_ROOT / "firewood-loose-16plus-master-v12.webp", 0.86),
)


def _remove_chroma_fringe(image: Image.Image) -> Image.Image:
    cleaned = image.convert("RGBA")
    for _ in range(3):
        alpha = cleaned.getchannel("A")
        visible = alpha.point(lambda value: 255 if value else 0)
        interior = visible.filter(ImageFilter.MinFilter(3))
        boundary = ImageChops.subtract(visible, interior)
        cleaned.putdata(
            [
                (0, 0, 0, 0)
                if boundary_value
                and pixel_alpha
                and green > blue * 1.15
                and green > red * 0.72
                else (red, green, blue, pixel_alpha)
                for (red, green, blue, pixel_alpha), boundary_value in zip(
                    cleaned.get_flattened_data(),
                    boundary.get_flattened_data(),
                )
            ]
        )
    alpha = cleaned.getchannel("A")
    visible = alpha.point(lambda value: 255 if value else 0)
    boundary = ImageChops.subtract(visible, visible.filter(ImageFilter.MinFilter(3)))
    residue = sum(
        1
        for (red, green, blue, pixel_alpha), boundary_value in zip(
            cleaned.get_flattened_data(),
            boundary.get_flattened_data(),
        )
        if boundary_value
        and pixel_alpha
        and green > blue * 1.15
        and green > red * 1.01
    )
    if residue:
        raise AssertionError(f"Green chroma fringe remains: {residue} pixels")
    return cleaned


def _target_width_preview(source_path: Path, target_width: float) -> Image.Image:
    source = Image.open(source_path).convert("RGBA")
    bounds = source.getchannel("A").getbbox()
    if bounds is None:
        raise AssertionError(f"Empty QA source: {source_path}")
    cutout = source.crop(bounds)
    scale = target_width * CANVAS[0] / cutout.width
    size = (round(cutout.width * scale), round(cutout.height * scale))
    if size[0] > round(CANVAS[0] * 0.86) or size[1] > round(CANVAS[1] * 0.86):
        raise AssertionError(f"Target preview exceeds safe region: {source_path}, {size}")
    preview = cutout.resize(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    canvas.alpha_composite(
        preview,
        ((CANVAS[0] - size[0]) // 2, (CANVAS[1] - size[1]) // 2),
    )
    return canvas


def render(output_dir: Path) -> dict[str, object]:
    specification = json.loads(SPEC_PATH.read_text(encoding="utf-8"))
    style_reference = Path(specification["styleReference"]["path"])
    composition_reference = Path(specification["compositionReference"]["path"])
    chroma_source = Path(specification["selectedChromaSource"]["path"])
    for path, expected_hash in (
        (style_reference, specification["styleReference"]["sha256"]),
        (composition_reference, specification["compositionReference"]["sha256"]),
        (chroma_source, specification["selectedChromaSource"]["sha256"]),
    ):
        if sha256(path) != expected_hash:
            raise AssertionError(f"Locked v13 input changed: {path}")

    candidate = _remove_chroma_fringe(
        _canonicalize_whole_pile(
            Image.open(chroma_source),
            float(specification["canonicalDisplayScale"]),
        )
    )
    _assert_master(candidate, "9-15-v13")
    master_path = output_dir / "masters" / "firewood-loose-9-15-master-v13.webp"
    save_webp(candidate, master_path)
    metadata = alpha_metadata(candidate)
    metadata.update(
        {
            "styleVersion": "v13-candidate",
            "approvalStatus": "awaiting-visual-approval",
            "runtimeActivation": "blocked-until-explicit-visual-approval",
            "quantityBand": {"min": 9, "max": 15},
            "targetAlphaWidth": specification["targetAlphaWidth"],
            "renderTechnique": specification["renderTechnique"],
            "styleReference": specification["styleReference"],
            "compositionReference": specification["compositionReference"],
            "selectedChromaSource": specification["selectedChromaSource"],
            "promptSpec": SPEC_PATH.as_posix(),
            "promptSpecSha256": sha256(SPEC_PATH),
            "outputSha256": sha256(master_path),
        }
    )
    manifest_path = master_path.with_suffix(".manifest.json")
    write_json(manifest_path, metadata)

    qa_scene_dir = output_dir / "qa" / "scenes"
    entries: list[dict[str, object]] = []
    for label, source, target_width in TARGETS:
        source_path = master_path if source is None else source
        preview_path = qa_scene_dir / f"{len(entries) + 1}-{source_path.stem}-target.png"
        preview_path.parent.mkdir(parents=True, exist_ok=True)
        _target_width_preview(source_path, target_width).save(preview_path)
        entries.append({"image": preview_path, "label": label})

    qa_dir = output_dir / "qa"
    for suffix, background, cell_size, columns in (
        ("light", "#F8F1E5", (480, 320), 3),
        ("dark", "#3B352F", (480, 320), 3),
        ("320", "#F8F1E5", (320, 220), 3),
    ):
        contact_sheet(
            entries,
            qa_dir / f"firewood-loose-9-15-v13-{suffix}.png",
            f"Volne drevo 9-15 v13 candidate - optical sequence - {suffix}",
            background,
            cell_size=cell_size,
            columns=columns,
            presentation_shadow=True,
        )

    result = {
        "valid": True,
        "approvalStatus": "awaiting-visual-approval",
        "runtimeActivation": "blocked-until-explicit-visual-approval",
        "candidate": {
            "image": master_path.as_posix(),
            "manifest": manifest_path.as_posix(),
            "sha256": metadata["outputSha256"],
            "alphaBoundsPixels": metadata["alphaBoundsPixels"],
            "alphaCoverage": metadata["alphaCoverage"],
        },
        "qa": [
            (qa_dir / f"firewood-loose-9-15-v13-{suffix}.png").as_posix()
            for suffix in ("light", "dark", "320")
        ],
    }
    write_json(output_dir / "validation.json", result)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("tmp/firewood-loose-9-15-v13"),
    )
    arguments = parser.parse_args()
    print(json.dumps(render(arguments.output_dir), indent=2))
