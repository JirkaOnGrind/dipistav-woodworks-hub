#!/usr/bin/env python3
"""Build deterministic DIPISTAV beam geometry guides and manifests."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image, ImageDraw

CANVAS = (1536, 1024)
OUTLINE = "#501801"
SEAM = "#6B310B"
TOP = "#F4A847"
SIDE = "#C5813B"
END = "#EEA847"


def translate(points, delta):
    dx, dy = delta
    return [(x + dx, y + dy) for x, y in points]


def prism(front, back_offset=(-560, -275)):
    back = translate(front, back_offset)
    return {
        "front": front,
        "top": [back[0], back[1], front[1], front[0]],
        "side": [back[0], front[0], front[3], back[3]],
    }


def beam_three():
    base = [(760, 675), (1020, 620), (1020, 820), (760, 875)]
    return {
        "scene": "beam-3-4",
        "representativeCount": 3,
        "layout": "2+1",
        "prisms": [
            prism(base),
            prism(translate(base, (260, -55))),
            prism(translate(base, (130, -255))),
        ],
        "topSeams": [],
        "expectedTopSeamCount": 0,
    }


def beam_sixteen():
    origin = (780, 400)
    column = (135, -28)
    row = (0, 130)
    front_faces = []
    for row_index in range(4):
        for column_index in range(4):
            x = origin[0] + column_index * column[0] + row_index * row[0]
            y = origin[1] + column_index * column[1] + row_index * row[1]
            front_faces.append([(x, y), (x + 135, y - 28), (x + 135, y + 102), (x, y + 130)])
    top_row = front_faces[:4]
    back_offset = (-560, -275)
    seams = []
    for index in range(1, 4):
        front_point = top_row[index][0]
        seams.append([translate([front_point], back_offset)[0], front_point])
    return {
        "scene": "beam-16plus",
        "representativeCount": 16,
        "layout": "4x4",
        "prisms": [prism(face, back_offset) for face in front_faces],
        "topSeams": seams,
        "expectedTopSeamCount": 3,
    }


SCENES = {"beam-3-4": beam_three, "beam-16plus": beam_sixteen}


def polygon_svg(points, fill, width):
    coords = " ".join(f"{x},{y}" for x, y in points)
    return f'<polygon points="{escape(coords)}" fill="{fill}" stroke="{OUTLINE}" stroke-width="{width}" />'


def write_svg(scene, output):
    elements = []
    for item in scene["prisms"]:
        elements.append(polygon_svg(item["side"], SIDE, 5))
        elements.append(polygon_svg(item["top"], TOP, 5))
    for item in scene["prisms"]:
        elements.append(polygon_svg(item["front"], END, 5))
    for start, end in scene["topSeams"]:
        elements.append(
            f'<line x1="{start[0]}" y1="{start[1]}" x2="{end[0]}" y2="{end[1]}" stroke="{SEAM}" stroke-width="4" />'
        )
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{CANVAS[0]}" height="{CANVAS[1]}" '
        f'viewBox="0 0 {CANVAS[0]} {CANVAS[1]}">'
        + "".join(elements)
        + "</svg>"
    )
    output.write_text(svg, encoding="utf-8")


def write_png(scene, output):
    image = Image.new("RGBA", CANVAS, (255, 255, 255, 255))
    draw = ImageDraw.Draw(image)
    for item in scene["prisms"]:
        draw.polygon(item["side"], fill=SIDE, outline=OUTLINE, width=5)
        draw.polygon(item["top"], fill=TOP, outline=OUTLINE, width=5)
    for item in scene["prisms"]:
        draw.polygon(item["front"], fill=END, outline=OUTLINE, width=5)
    for start, end in scene["topSeams"]:
        draw.line([start, end], fill=SEAM, width=4)
    image.save(output)


def write_manifest(scene, output):
    front_faces = [item["front"] for item in scene["prisms"]]
    payload = {
        "scene": scene["scene"],
        "canvas": {"width": CANVAS[0], "height": CANVAS[1]},
        "representativeCount": scene["representativeCount"],
        "layout": scene["layout"],
        "frontFaces": front_faces,
        "topSeams": scene["topSeams"],
        "expectedTopSeamCount": scene["expectedTopSeamCount"],
        "equalCrossSectionTolerancePx": 2,
        "approvalStatus": "candidate",
    }
    output.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--scene", choices=SCENES, required=True)
    parser.add_argument("--svg-out", type=Path)
    parser.add_argument("--png-out", type=Path)
    parser.add_argument("--manifest-out", type=Path)
    args = parser.parse_args()
    if not any((args.svg_out, args.png_out, args.manifest_out)):
        parser.error("request at least one output")
    scene = SCENES[args.scene]()
    for output in (args.svg_out, args.png_out, args.manifest_out):
        if output:
            output.parent.mkdir(parents=True, exist_ok=True)
    if args.svg_out:
        write_svg(scene, args.svg_out)
    if args.png_out:
        write_png(scene, args.png_out)
    if args.manifest_out:
        write_manifest(scene, args.manifest_out)


if __name__ == "__main__":
    main()
