"""Re-render plank top grain with the canonical crisp timber texture.

Only texture sampling changes; v35 projection, layout, contours and alpha stay fixed.
The original approved v35 assets remain available for geometry comparison.
"""
import hashlib
import json
from dataclasses import replace
from pathlib import Path

from PIL import Image, ImageChops

import artwork_v11 as renderer
from compose_timber_dynamic_v35 import DEFAULT_CONFIG, configured_geometry, exact_layout, save_webp

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/images/illustrations/plank-v38"


def main():
    config = json.loads(DEFAULT_CONFIG.read_text(encoding="utf-8"))
    # Broad planks need the same fine grain density as the other broad timber.
    geometry = replace(configured_geometry("plank", config["families"]["plank"]), top_texture_lanes=4)
    renderer.refined_plank_top_texture = lambda: renderer.canonical_texture_faces()[0]["top"]
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for count in range(1, 21):
        layout = exact_layout(count, config["piecesPerLayer"], geometry)
        image, metadata = renderer.render_stack(layout, geometry)
        original_path = ROOT / f"public/images/illustrations/timber-dynamic-v35/plank-{count}-master-v35.webp"
        with Image.open(original_path) as original:
            if ImageChops.difference(image.getchannel("A"), original.getchannel("A")).getbbox():
                raise ValueError(f"Plank {count}: the texture update must preserve the original silhouette")
        path = OUTPUT / f"plank-{count}-master-v38.webp"
        save_webp(image, path, config["webp"])
        metadata.update({
            "styleVersion": "v38",
            "topFaceTexturePolicy": "canonical-unit-tile-multi-lane-no-procedural-grain",
            "outputSha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        })
        renderer.write_json(path.with_suffix(".manifest.json"), metadata)
        print(f"Rendered plank {count}/20", flush=True)


if __name__ == "__main__":
    main()
