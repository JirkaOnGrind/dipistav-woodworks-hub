#!/usr/bin/env python3
"""Project entry point for the DIPISTAV artwork validator."""

from __future__ import annotations

import runpy
from pathlib import Path


VALIDATOR = (
    Path(__file__).resolve().parents[1]
    / ".agents"
    / "skills"
    / "dipistav-artwork"
    / "scripts"
    / "validate_artwork.py"
)

if __name__ == "__main__":
    runpy.run_path(str(VALIDATOR), run_name="__main__")
