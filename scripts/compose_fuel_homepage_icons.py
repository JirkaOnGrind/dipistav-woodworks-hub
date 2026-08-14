#!/usr/bin/env python3
"""Write the blocked future fuel-homepage icon mapping; do not copy assets."""

import argparse
import json
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--plan-out", type=Path, required=True)
args = parser.parse_args()

payload = {
    "styleVersion": "v11",
    "approvalStatus": "planned",
    "runtimeActivation": "blocked-until-source-master-approval",
    "icons": [
        {"categoryId": "stipane-drevo", "sourceFamily": "firewood-loose", "sourceBand": "1"},
        {"categoryId": "pelety", "sourceFamily": "pellets-bag", "sourceBand": "1"},
        {"categoryId": "krajinky", "sourceFamily": "slabs-3m", "sourceBand": "1"},
        {"categoryId": "drivi-na-paletach", "sourceFamily": "firewood-pallet-33", "sourceBand": "1"},
    ],
}
args.plan_out.parent.mkdir(parents=True, exist_ok=True)
args.plan_out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
