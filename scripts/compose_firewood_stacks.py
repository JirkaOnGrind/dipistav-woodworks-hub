#!/usr/bin/env python3
"""Write fuel plans and optionally render inactive loose-firewood candidates."""

import argparse
from pathlib import Path
from fuel_artwork_v11 import render_loose_firewood_candidates, write_family_plan

parser = argparse.ArgumentParser()
parser.add_argument("--plan-out", type=Path, required=True)
parser.add_argument("--candidate-output-dir", type=Path)
parser.add_argument("--unit-tile-source", type=Path)
args = parser.parse_args()
write_family_plan(("firewood-loose", "firewood-bigbag"), args.plan_out)
if args.candidate_output_dir:
    if not args.unit_tile_source:
        parser.error("--unit-tile-source is required with --candidate-output-dir")
    render_loose_firewood_candidates(args.candidate_output_dir, args.unit_tile_source)
