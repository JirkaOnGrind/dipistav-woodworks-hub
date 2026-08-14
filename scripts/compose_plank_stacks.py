#!/usr/bin/env python3
"""Build seven reference-textured DIPISTAV plank stacks at a 1:2.403 profile."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from artwork_v11 import (
    assert_family_contract,
    compose_family,
    contact_sheet,
    geometry_contract,
    write_json,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, default=Path("tmp/composed_planks"))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    results = compose_family("plank", args.output_dir)
    assert_family_contract(results, "plank")
    ratios = geometry_contract()
    contact_sheet(
        results,
        args.output_dir / "contact-sheets" / "planks-v11-light.png",
        "DIPISTAV v11 - fosny - light",
        "#F4EFE5",
    )
    contact_sheet(
        results,
        args.output_dir / "contact-sheets" / "planks-v11-dark.png",
        "DIPISTAV v11 - fosny - dark",
        "#3B352F",
    )
    contact_sheet(
        results,
        args.output_dir / "contact-sheets" / "planks-v11-320.png",
        "DIPISTAV v11 - fosny - 320px QA",
        "#F4EFE5",
        cell_size=(320, 220),
        columns=4,
    )
    index = {
        "family": "plank",
        "styleVersion": "v11",
        "approvalStatus": "awaiting-approval",
        "texturePolicy": "canonical-19-45-37-reference",
        "edgePolicy": "dark-timber-edges-no-white-halo-no-bright-inner-fringe",
        "crossSectionContract": "height:width = 1:2.3-2.5",
        "geometryRatios": ratios,
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
    write_json(args.output_dir / "plank-v11-index.json", index)
    print(json.dumps(index, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
