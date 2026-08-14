#!/usr/bin/env python3
"""Write inactive v11 loose-firewood and Big Bag plans; do not render assets."""

import argparse
from pathlib import Path
from fuel_artwork_v11 import write_family_plan

parser = argparse.ArgumentParser()
parser.add_argument("--plan-out", type=Path, required=True)
args = parser.parse_args()
write_family_plan(("firewood-loose", "firewood-bigbag"), args.plan_out)
