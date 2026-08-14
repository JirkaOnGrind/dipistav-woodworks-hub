#!/usr/bin/env python3
"""Build seven warm-blended DIPISTAV batten-stack candidates for v11."""

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
    parser.add_argument("--output-dir", type=Path, default=Path("tmp/composed_battens"))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    results = compose_family("lath", args.output_dir)
    assert_family_contract(results, "lath")
    ratios = geometry_contract()
    for suffix, background, cell_size in (
        ("light", "#F4EFE5", (480, 320)),
        ("dark", "#3B352F", (480, 320)),
        ("320", "#F4EFE5", (320, 220)),
    ):
        contact_sheet(
            results,
            args.output_dir / "contact-sheets" / f"battens-v11-{suffix}.png",
            f"DIPISTAV v11 - late - {suffix}",
            background,
            cell_size=cell_size,
            columns=4,
        )
    index = {
        "family": "lath",
        "styleVersion": "v11",
        "approvalStatus": "awaiting-approval",
        "texturePolicy": "canonical-19-45-37-reference",
        "edgePolicy": "dark-timber-edges-no-white-halo-no-bright-inner-fringe",
        "antiCloning": "deterministic-inset-source-sampling",
        "crossSectionContract": "height:width = 1:1.25-1.5",
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
    write_json(args.output_dir / "lath-v11-index.json", index)
    print(json.dumps(index, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
