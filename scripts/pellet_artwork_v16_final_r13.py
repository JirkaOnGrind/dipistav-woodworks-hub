from pathlib import Path

import pellet_artwork_v16_final_r12 as base


ROOT = Path(__file__).resolve().parents[1]
MASTER_ROOT = ROOT / "tmp/pellets-v16/candidates/masters"

base.base.OUTPUT_ROOT = ROOT / "tmp/pellets-v16/final-r13"
base.base.QA_ROOT = base.base.OUTPUT_ROOT / "qa"
base.base.DETERMINISM_ROOT = base.base.OUTPUT_ROOT / "determinism"
base.base.OUTPUT = MASTER_ROOT / "pellets-10-candidate-n-v16.webp"
base.base.MANIFEST = MASTER_ROOT / "pellets-10-candidate-n-v16.manifest.json"
base.base.CANDIDATE_ID = "pellets-10-candidate-n-v16"
base.base.STYLE_VERSION = "v16-final-r13-candidate"
base.base.QA_PREFIX = "pellets-v16-final-r13"


if __name__ == "__main__":
    base.main()
