"""Extend the existing timber artwork with exact 21–30 piece stacks.

Existing 1–20 masters are retained. Each job uses the same projection and
five-piece layers, including the approved clean plank texture.
"""
import hashlib
import json
from concurrent.futures import ProcessPoolExecutor
from dataclasses import replace
from pathlib import Path

import artwork_v11 as renderer
from compose_timber_dynamic_v35 import DEFAULT_CONFIG, configured_geometry, exact_layout, save_webp

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/images/illustrations/timber-v40"
MAX_PIECES = 30


def render(job):
    family, count = job
    config = json.loads(DEFAULT_CONFIG.read_text(encoding="utf-8"))
    settings = config["families"][family]
    path = OUTPUT / f"{settings['assetPrefix']}-{count}-master-v40.webp"
    manifest = path.with_suffix(".manifest.json")
    if path.exists() and manifest.exists():
        return path.name
    geometry = configured_geometry(family, settings)
    if family == "plank":
        geometry = replace(geometry, top_texture_lanes=4)
        renderer.refined_plank_top_texture = lambda: renderer.canonical_texture_faces()[0]["top"]
    renderer.SEAM_PX = float(settings["seamWidth"])
    renderer.SEAM = str(settings["seamColor"])
    layout = exact_layout(count, config["piecesPerLayer"], geometry)
    image, metadata = renderer.render_stack(layout, geometry)
    save_webp(image, path, config["webp"])
    metadata.update({
        "styleVersion": "v40",
        "piecesPerLayer": config["piecesPerLayer"],
        "levelCount": layout.rows,
        "outputSha256": hashlib.sha256(path.read_bytes()).hexdigest(),
    })
    renderer.write_json(manifest, metadata)
    return path.name


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    config = json.loads(DEFAULT_CONFIG.read_text(encoding="utf-8"))
    jobs = [(family, count) for count in range(21, MAX_PIECES + 1) for family in config["families"]]
    with ProcessPoolExecutor(max_workers=6) as pool:
        for index, name in enumerate(pool.map(render, jobs), 1):
            print(f"{index}/{len(jobs)} {name}", flush=True)
