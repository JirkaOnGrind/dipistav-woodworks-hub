#!/usr/bin/env python3
"""Validate inactive loose-firewood candidates and optional deterministic rerender."""

import argparse
from pathlib import Path

from fuel_artwork_v11 import (
    render_loose_firewood_candidates,
    validate_loose_firewood_candidates,
)


parser = argparse.ArgumentParser()
parser.add_argument("--candidate-dir", type=Path, required=True)
parser.add_argument("--determinism-dir", type=Path)
parser.add_argument("--unit-tile-source", type=Path)
args = parser.parse_args()

primary = validate_loose_firewood_candidates(args.candidate_dir)
if args.determinism_dir:
    if not args.unit_tile_source:
        parser.error("--unit-tile-source is required with --determinism-dir")
    rerendered = render_loose_firewood_candidates(
        args.determinism_dir,
        args.unit_tile_source,
    )
    secondary = validate_loose_firewood_candidates(args.determinism_dir)
    primary_hashes = [candidate["sha256"] for candidate in primary["candidates"]]
    secondary_hashes = [candidate["sha256"] for candidate in secondary["candidates"]]
    if primary_hashes != secondary_hashes:
        raise AssertionError("Loose-firewood rendering is not deterministic")
    if len(rerendered) != len(primary_hashes):
        raise AssertionError("Determinism rerender candidate count mismatch")

print("Loose-firewood candidates are valid and remain blocked until visual approval.")
