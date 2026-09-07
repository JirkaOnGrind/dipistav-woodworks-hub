#!/usr/bin/env python3
"""Normalize and validate whole-pile AI firewood candidates without log compositing."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image

from artwork_v11 import (
    CANVAS,
    CONTOUR_RESERVE,
    SAFE_INSET,
    SUPER_SAMPLE,
    alpha_metadata,
    contact_sheet,
    sanitize_antialias_alpha,
    save_webp,
    sha256,
    write_json,
)


PROMPT_SPEC = Path(__file__).with_name("firewood_full_pile_prompt_v4.json")
PREFIX = "firewood-loose-full-pile-v4"


def _canonicalize_whole_pile(source: Image.Image, display_scale: float) -> Image.Image:
    source = source.convert("RGBA")
    if source.size != CANVAS:
        raise AssertionError(f"Unexpected whole-pile source canvas: {source.size}")
    cleaned_pixels = [
        (0, 0, 0, 0)
        if not alpha or (green > 160 and green > red * 1.2 and green > blue * 1.2)
        else (red, green, blue, alpha)
        for red, green, blue, alpha in source.get_flattened_data()
    ]
    source.putdata(cleaned_pixels)
    bounds = source.getchannel("A").getbbox()
    if bounds is None:
        raise AssertionError("Whole-pile source has no visible artwork")
    cutout = source.crop(bounds)
    usable_width = CANVAS[0] * (1 - 2 * SAFE_INSET) - 2 * CONTOUR_RESERVE - 2
    usable_height = CANVAS[1] * (1 - 2 * SAFE_INSET) - 2 * CONTOUR_RESERVE - 2
    scale = min(2, usable_width / cutout.width, usable_height / cutout.height) * display_scale
    size_4x = (
        round(cutout.width * scale * SUPER_SAMPLE),
        round(cutout.height * scale * SUPER_SAMPLE),
    )
    cutout_4x = cutout.resize(size_4x, Image.Resampling.LANCZOS)
    canvas_4x = Image.new(
        "RGBA",
        (CANVAS[0] * SUPER_SAMPLE, CANVAS[1] * SUPER_SAMPLE),
        (0, 0, 0, 0),
    )
    origin = (
        (canvas_4x.width - cutout_4x.width) // 2,
        (canvas_4x.height - cutout_4x.height) // 2,
    )
    canvas_4x.alpha_composite(cutout_4x, origin)
    final = canvas_4x.resize(CANVAS, Image.Resampling.LANCZOS)
    final.putdata(
        [
            (0, 0, 0, 0)
            if green > 160 and green > red * 1.2 and green > blue * 1.2
            else (red, green, blue, alpha)
            for red, green, blue, alpha in final.get_flattened_data()
        ]
    )
    return sanitize_antialias_alpha(final)


def _assert_master(image: Image.Image, label: str) -> None:
    if image.size != CANVAS:
        raise AssertionError(f"Unexpected master canvas for {label}: {image.size}")
    corners = ((0, 0), (CANVAS[0] - 1, 0), (0, CANVAS[1] - 1), (CANVAS[0] - 1, CANVAS[1] - 1))
    if any(image.getpixel(corner)[3] != 0 for corner in corners):
        raise AssertionError(f"Opaque corner in {label}")
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise AssertionError(f"Empty master for {label}")
    inset_x = CANVAS[0] * SAFE_INSET + CONTOUR_RESERVE
    inset_y = CANVAS[1] * SAFE_INSET + CONTOUR_RESERVE
    if bounds[0] < inset_x or bounds[2] > CANVAS[0] - inset_x:
        raise AssertionError(f"Horizontal safe inset violated for {label}: {bounds}")
    if bounds[1] < inset_y or bounds[3] > CANVAS[1] - inset_y:
        raise AssertionError(f"Vertical safe inset violated for {label}: {bounds}")
    chroma_pixels = sum(
        1
        for red, green, blue, alpha in image.get_flattened_data()
        if alpha > 32 and green > 160 and green > red * 1.2 and green > blue * 1.2
    )
    if chroma_pixels:
        raise AssertionError(f"Chroma residue in {label}: {chroma_pixels} pixels")


def render(output_dir: Path) -> dict[str, object]:
    specification = json.loads(PROMPT_SPEC.read_text(encoding="utf-8"))
    reference_path = Path(specification["soleStyleReference"])
    if sha256(reference_path) != specification["soleStyleReferenceSha256"]:
        raise AssertionError("Approved stipane-v2.webp hash changed")

    entries: list[dict[str, object]] = [
        {
            "image": reference_path,
            "manifest": "",
            "label": "1-2 prm - approved stipane-v2",
        }
    ]
    candidates: list[dict[str, object]] = []
    for state in specification["states"][1:]:
        source_path = Path(state["source"])
        if sha256(source_path) != state["sourceSha256"]:
            raise AssertionError(f"Generated whole-pile source hash changed: {source_path}")
        image = _canonicalize_whole_pile(Image.open(source_path), float(state["displayScale"]))
        _assert_master(image, state["band"])
        filename = f"{PREFIX}-{state['band']}-master-v12.webp"
        image_path = output_dir / "masters" / filename
        save_webp(image, image_path)
        metadata = alpha_metadata(image)
        metadata.update(
            {
                "styleVersion": "v12",
                "approvalStatus": "awaiting-visual-approval",
                "runtimeActivation": "blocked-until-explicit-visual-approval",
                "quantityBand": state["band"],
                "displayScale": state["displayScale"],
                "renderTechnique": "reference-guided-whole-pile-imagegen",
                "wholePileSource": source_path.as_posix(),
                "wholePileSourceSha256": state["sourceSha256"],
                "soleStyleReference": reference_path.as_posix(),
                "soleStyleReferenceSha256": specification["soleStyleReferenceSha256"],
                "promptSpec": PROMPT_SPEC.as_posix(),
                "promptSpecSha256": sha256(PROMPT_SPEC),
                "outputSha256": sha256(image_path),
            }
        )
        manifest_path = image_path.with_suffix(".manifest.json")
        write_json(manifest_path, metadata)
        entry = {
            "image": image_path,
            "manifest": manifest_path,
            "label": f"{state['band']} prm",
        }
        entries.append(entry)
        candidates.append(
            {
                "image": image_path.as_posix(),
                "manifest": manifest_path.as_posix(),
                "outputSha256": metadata["outputSha256"],
                "alphaBoundsPixels": metadata["alphaBoundsPixels"],
                "alphaCoverage": metadata["alphaCoverage"],
            }
        )

    alpha_widths = [
        int(candidate["alphaBoundsPixels"]["right"])
        - int(candidate["alphaBoundsPixels"]["left"])
        for candidate in candidates
    ]
    alpha_coverages = [float(candidate["alphaCoverage"]) for candidate in candidates]
    if any(current <= previous for previous, current in zip(alpha_widths, alpha_widths[1:])):
        raise AssertionError(f"Whole-pile footprint is not strictly increasing: {alpha_widths}")
    if any(
        current <= previous
        for previous, current in zip(alpha_coverages, alpha_coverages[1:])
    ):
        raise AssertionError(f"Whole-pile visible mass is not strictly increasing: {alpha_coverages}")

    qa_dir = output_dir / "qa"
    contact_sheet(
        entries,
        qa_dir / f"{PREFIX}-light.png",
        "Volne drevo - whole-pile AI - light",
        "#F8F1E5",
        presentation_shadow=True,
    )
    contact_sheet(
        entries,
        qa_dir / f"{PREFIX}-dark.png",
        "Volne drevo - whole-pile AI - dark",
        "#3B352F",
        presentation_shadow=True,
    )
    contact_sheet(
        entries,
        qa_dir / f"{PREFIX}-320.png",
        "Volne drevo - whole-pile AI - 320 px",
        "#F8F1E5",
        cell_size=(320, 220),
        columns=3,
        presentation_shadow=True,
    )
    result = {
        "valid": True,
        "approvalStatus": "awaiting-visual-approval",
        "runtimeActivation": "blocked-until-explicit-visual-approval",
        "renderTechnique": "reference-guided-whole-pile-imagegen",
        "reference": {
            "image": reference_path.as_posix(),
            "sha256": specification["soleStyleReferenceSha256"],
        },
        "promptSpecSha256": sha256(PROMPT_SPEC),
        "candidates": candidates,
    }
    write_json(output_dir / "validation.json", result)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, required=True)
    arguments = parser.parse_args()
    render(arguments.output_dir)
    print("Whole-pile AI candidates are valid and remain blocked until visual approval.")
