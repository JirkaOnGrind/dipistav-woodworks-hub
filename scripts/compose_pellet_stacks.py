#!/usr/bin/env python3
"""Write the inactive v11 pellet composition plan; do not render assets."""

import argparse
from pathlib import Path
from fuel_artwork_v11 import write_family_plan

parser = argparse.ArgumentParser()
parser.add_argument("--plan-out", type=Path, required=True)
args = parser.parse_args()
write_family_plan(("pellets-bag", "pellets-set", "pellets-pallet"), args.plan_out)
