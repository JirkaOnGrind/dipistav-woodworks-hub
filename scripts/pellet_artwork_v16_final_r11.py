from pathlib import Path

import pellet_artwork_v16_final_r10 as base


ROOT = Path(__file__).resolve().parents[1]
MASTER_ROOT = ROOT / "tmp/pellets-v16/candidates/masters"

base.OUTPUT_ROOT = ROOT / "tmp/pellets-v16/final-r11"
base.QA_ROOT = base.OUTPUT_ROOT / "qa"
base.DETERMINISM_ROOT = base.OUTPUT_ROOT / "determinism"
base.OUTPUT = MASTER_ROOT / "pellets-10-candidate-l-v16.webp"
base.MANIFEST = MASTER_ROOT / "pellets-10-candidate-l-v16.manifest.json"
base.CANDIDATE_ID = "pellets-10-candidate-l-v16"
base.STYLE_VERSION = "v16-final-r11-candidate"
base.QA_PREFIX = "pellets-v16-final-r11"


if __name__ == "__main__":
    base.main()
