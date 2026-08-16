#!/usr/bin/env python3
"""Build sorted and mixed-width DIPISTAV board-stack candidates for v11."""

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
    parser.add_argument("--output-dir", type=Path, default=Path("tmp/composed_boards"))
    parser.add_argument("--sorted-prefix", default="board")
    parser.add_argument("--unsorted-narrow-prefix", default="board-unsorted-narrow")
    parser.add_argument("--unsorted-wide-prefix", default="board-unsorted-wide")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    families = (
        ("board", args.sorted_prefix, "tříděná prkna"),
        ("board-unsorted-narrow", args.unsorted_narrow_prefix, "netříděná 8/10/12/14 cm"),
        ("board-unsorted-wide", args.unsorted_wide_prefix, "netříděná 16/18/20 cm"),
    )
    family_results: dict[str, list[dict[str, object]]] = {}
    for family, prefix, _ in families:
        results = compose_family(family, args.output_dir, prefix)
        assert_family_contract(results, family)
        family_results[family] = results
    ratios = geometry_contract()
    for family, prefix, title in families:
        for suffix, background, cell_size in (
            ("light", "#F4EFE5", (480, 320)),
            ("dark", "#3B352F", (480, 320)),
            ("320", "#F4EFE5", (320, 220)),
        ):
            contact_sheet(
                family_results[family],
                args.output_dir / "contact-sheets" / f"{prefix}-v11-{suffix}.png",
                f"DIPISTAV v11 - {title} - {suffix}",
                background,
                cell_size=cell_size,
                columns=4,
            )
    index = {
        "families": [family for family, _, _ in families],
        "styleVersion": "v11",
        "approvalStatus": "awaiting-approval",
        "texturePolicy": "canonical-19-45-37-reference",
        "edgePolicy": "dark-timber-edges-no-white-halo-no-bright-inner-fringe",
        "antiCloning": "deterministic-inset-source-sampling",
        "crossSectionContract": "height:width = 1:4.5-5.0",
        "geometryRatios": ratios,
        "entries": [
            {
                "image": Path(result["image"]).as_posix(),
                "manifest": Path(result["manifest"]).as_posix(),
                "representativeCount": result["representativeCount"],
                "outputSha256": result["outputSha256"],
            }
            for results in family_results.values()
            for result in results
        ],
    }
    write_json(args.output_dir / "board-v11-index.json", index)
    print(json.dumps(index, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
