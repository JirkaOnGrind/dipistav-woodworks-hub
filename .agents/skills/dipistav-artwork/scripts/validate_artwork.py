#!/usr/bin/env python3
"""Validate objective DIPISTAV artwork production gates."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from PIL import Image

PALETTE = [
    (0x50, 0x18, 0x01),
    (0x6B, 0x31, 0x0B),
    (0x80, 0x40, 0x15),
    (0x96, 0x56, 0x22),
    (0xC5, 0x81, 0x3B),
    (0xF0, 0xA2, 0x42),
    (0xF4, 0xA8, 0x47),
    (0xEE, 0xA8, 0x47),
]


def flattened(image):
    getter = getattr(image, "get_flattened_data", None)
    return getter() if getter else image.getdata()


def distance(left, right):
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(left, right)))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--json-out", type=Path)
    parser.add_argument("--safe-inset", type=float, default=0.059)
    args = parser.parse_args()

    image = Image.open(args.input).convert("RGBA")
    width, height = image.size
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    errors = []
    warnings = []

    if image.size != (1536, 1024):
        errors.append(f"canvas must be 1536x1024, got {width}x{height}")
    corners = [image.getpixel(point)[3] for point in ((0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1))]
    if any(corners):
        errors.append("all four canvas corners must be fully transparent")
    if not bbox:
        errors.append("alpha channel contains no subject")
        bbox = (0, 0, 0, 0)
    minimum_x = args.safe_inset * width
    minimum_y = args.safe_inset * height
    margins = (bbox[0], bbox[1], width - bbox[2], height - bbox[3])
    if margins[0] < minimum_x or margins[2] < minimum_x:
        errors.append(f"horizontal safe inset failed: margins={margins[0]},{margins[2]}")
    if margins[1] < minimum_y or margins[3] < minimum_y:
        errors.append(f"vertical safe inset failed: margins={margins[1]},{margins[3]}")

    opaque = []
    green_edge = 0
    bright_edge = 0
    for red, green, blue, opacity in flattened(image):
        if opacity >= 240:
            opaque.append((red, green, blue))
        elif opacity and green > red * 1.35 and green > blue * 1.35:
            green_edge += 1
        elif opacity and min(red, green, blue) >= 225:
            bright_edge += 1
    if green_edge:
        errors.append(f"green-dominant semi-transparent edge pixels: {green_edge}")
    if bright_edge:
        errors.append(f"white/bright semi-transparent edge pixels: {bright_edge}")
    stride = max(1, len(opaque) // 50000)
    sample = opaque[::stride]
    palette_ratio = (
        sum(min(distance(pixel, anchor) for anchor in PALETTE) <= 72 for pixel in sample) / len(sample)
        if sample
        else 0
    )
    if palette_ratio < 0.72:
        warnings.append(f"palette proximity is low: {palette_ratio:.3f}")

    manifest_data = None
    if args.manifest:
        manifest_data = json.loads(args.manifest.read_text(encoding="utf-8"))
        expected = manifest_data["canvas"]
        if (expected["width"], expected["height"]) != image.size:
            errors.append("manifest canvas does not match artwork canvas")
        if manifest_data.get("styleVersion") == "v11":
            if manifest_data.get("edgePolicy") != "dark-timber-edges-no-white-halo-no-bright-inner-fringe":
                errors.append("v11 manifest is missing the anti-halo edge policy")
            if manifest_data.get("textureCoverage") != "full-face-to-contour":
                errors.append("v11 manifest does not guarantee full texture coverage to contour")
        else:
            if len(manifest_data["frontFaces"]) != manifest_data["representativeCount"]:
                errors.append("manifest front-face count does not equal representativeCount")
            if len(manifest_data["topSeams"]) != manifest_data["expectedTopSeamCount"]:
                errors.append("manifest seam count does not equal expectedTopSeamCount")
            face_edges = []
            for face in manifest_data["frontFaces"]:
                face_edges.append((distance(face[0], face[1]), distance(face[0], face[3])))
            if face_edges:
                reference = face_edges[0]
                tolerance = manifest_data.get("equalCrossSectionTolerancePx", 2)
                for edge in face_edges[1:]:
                    if abs(edge[0] - reference[0]) > tolerance or abs(edge[1] - reference[1]) > tolerance:
                        errors.append("manifest contains non-congruent projected cross-sections")
                        break

    report = {
        "input": str(args.input),
        "canvas": {"width": width, "height": height},
        "alphaBoundsPixels": {"left": bbox[0], "top": bbox[1], "right": bbox[2], "bottom": bbox[3]},
        "alphaBoundsNormalized": {
            "x": round(bbox[0] / width, 6),
            "y": round(bbox[1] / height, 6),
            "width": round((bbox[2] - bbox[0]) / width, 6),
            "height": round((bbox[3] - bbox[1]) / height, 6),
        },
        "alphaCoverage": round(sum(1 for value in flattened(alpha) if value) / (width * height), 6),
        "paletteProximity": round(palette_ratio, 6),
        "whiteOrBrightEdgePixels": bright_edge,
        "errors": errors,
        "warnings": warnings,
        "status": "pass" if not errors else "fail",
    }
    encoded = json.dumps(report, indent=2)
    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(encoded, encoding="utf-8")
    print(encoded)
    raise SystemExit(0 if not errors else 1)


if __name__ == "__main__":
    main()
