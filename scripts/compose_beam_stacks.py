#!/usr/bin/env python3
"""Build reference-textured, clean-corner DIPISTAV beam candidates for v11.

This is the canonical beam entry point.  Rendering lives in ``artwork_v11`` so
beams, planks, and rigid homepage icons share the same Unit Tile texture,
polygon masks, contours, camera, layer order, and adaptive-fit policy.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from artwork_v11 import assert_family_contract, compose_family, contact_sheet, write_json


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, default=Path("tmp/artwork-v11"))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    results = compose_family("beam", args.output_dir)
    assert_family_contract(results, "beam")
    contact_sheet(
        results,
        args.output_dir / "contact-sheets" / "beams-v11-light.png",
        "DIPISTAV v11 - beams - reference texture / clean corners",
        "#F4EFE5",
    )
    contact_sheet(
        results,
        args.output_dir / "contact-sheets" / "beams-v11-dark.png",
        "DIPISTAV v11 - beams - dark edge QA",
        "#3B352F",
    )
    contact_sheet(
        results,
        args.output_dir / "contact-sheets" / "beams-v11-320.png",
        "DIPISTAV v11 - beams - 320px QA",
        "#F4EFE5",
        cell_size=(320, 220),
        columns=4,
    )
    index = {
        "family": "beam",
        "styleVersion": "v11",
        "approvalStatus": "awaiting-approval",
        "texturePolicy": "canonical-19-45-37-reference",
        "cornerCleanup": "no-corner-discoloration-no-dirty-corner-shading-no-ao",
        "entries": [
            {
                "image": Path(result["image"]).as_posix(),
                "manifest": Path(result["manifest"]).as_posix(),
                "representativeCount": result["representativeCount"],
                "outputSha256": result["outputSha256"],
            }
            for result in results
        ],
    }
    write_json(args.output_dir / "beam-v11-index.json", index)
    print(json.dumps(index, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
