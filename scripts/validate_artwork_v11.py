#!/usr/bin/env python3
"""Preflight staged artwork-system v11 candidates without approving them."""

from __future__ import annotations

import argparse
import json
import re
import tempfile
from pathlib import Path

from PIL import Image

from artwork_v11 import (
    CANONICAL_UNIT_TILE,
    CANVAS,
    SAFE_INSET,
    assert_family_contract,
    compose_family,
    geometry_contract,
    sha256,
)


EXPECTED_COUNTS = [1, 2, 3, 6, 9, 12, 16]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, default=Path("tmp/artwork-v11"))
    parser.add_argument("--determinism", action="store_true")
    parser.add_argument(
        "--refined",
        action="store_true",
        help="Validate refined beam/plank prefixes and all three board families.",
    )
    parser.add_argument("--beam-prefix")
    parser.add_argument("--plank-prefix")
    parser.add_argument(
        "--only",
        choices=("beam", "plank"),
        help="Validate one staged timber family without requiring unrelated candidate indexes.",
    )
    return parser.parse_args()


def read_json(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def validate_manifest(path: Path) -> None:
    payload = read_json(path)
    image_path = path.with_name(path.name.replace(".manifest.json", ".webp"))
    image = Image.open(image_path).convert("RGBA")
    if image.size != CANVAS:
        raise AssertionError(f"{image_path}: expected {CANVAS}, got {image.size}")
    if payload.get("approvalStatus") != "awaiting-approval":
        raise AssertionError(f"{path}: candidate must remain awaiting-approval")
    if payload.get("styleVersion") != "v11":
        raise AssertionError(f"{path}: missing v11 style marker")
    bounds = payload.get("alphaBounds")
    if not isinstance(bounds, dict):
        raise AssertionError(f"{path}: missing alpha bounds")
    tolerance = 0.002
    if float(bounds["x"]) < SAFE_INSET - tolerance or float(bounds["y"]) < SAFE_INSET - tolerance:
        raise AssertionError(f"{path}: leading safe inset violation")
    if float(bounds["x"]) + float(bounds["width"]) > 1 - SAFE_INSET + tolerance:
        raise AssertionError(f"{path}: horizontal safe inset violation")
    if float(bounds["y"]) + float(bounds["height"]) > 1 - SAFE_INSET + tolerance:
        raise AssertionError(f"{path}: vertical safe inset violation")
    alpha = image.getchannel("A")
    if any(alpha.getpixel(point) for point in [(0, 0), (image.width - 1, 0), (0, image.height - 1), (image.width - 1, image.height - 1)]):
        raise AssertionError(f"{path}: corners are not transparent")
    if payload.get("outputSha256") != sha256(image_path):
        raise AssertionError(f"{path}: output hash does not match staged image")
    if payload.get("cornerCleanup") != "no-corner-discoloration-no-dirty-corner-shading-no-ao":
        raise AssertionError(f"{path}: clean-corner policy is missing")

    # Fully opaque, medium-value pixels may be dark brown but must not form a
    # low-saturation gray halo. Sample every fourth pixel for a deterministic,
    # inexpensive reject gate over all staged assets.
    gray_pixels = 0
    sampled_opaque = 0
    pixels = image.load()
    for y in range(0, image.height, 4):
        for x in range(0, image.width, 4):
            red, green, blue, alpha_value = pixels[x, y]
            if alpha_value < 248:
                continue
            sampled_opaque += 1
            maximum = max(red, green, blue)
            if 40 <= maximum <= 220 and maximum - min(red, green, blue) <= 10:
                gray_pixels += 1
    if sampled_opaque and gray_pixels / sampled_opaque > 0.001:
        raise AssertionError(f"{path}: low-saturation gray cluster detected")


def validate_locked_assets() -> int:
    source = Path("src/lib/approved-artwork-hashes.ts").read_text(encoding="utf-8")
    entries = re.findall(r'"(public/images/illustrations/[^\"]+)"\s*:\s*\n?\s*"([0-9a-f]{64})"', source)
    for relative_path, expected in entries:
        actual = sha256(Path(relative_path))
        if actual != expected:
            raise AssertionError(f"Hash-locked asset changed: {relative_path}")
    return len(entries)


def validate_family_index(output_dir: Path, family: str) -> list[dict[str, object]]:
    index = read_json(output_dir / f"{family}-v11-index.json")
    entries = index.get("entries")
    if not isinstance(entries, list):
        raise AssertionError(f"{family}: missing index entries")
    counts = [int(entry["representativeCount"]) for entry in entries]
    if counts != EXPECTED_COUNTS:
        raise AssertionError(f"{family}: wrong representative counts {counts}")
    for entry in entries:
        validate_manifest(Path(str(entry["manifest"])))
    return entries


def validate_board_index(output_dir: Path) -> dict[str, list[dict[str, object]]]:
    index = read_json(output_dir / "board-v11-index.json")
    entries = index.get("entries")
    if not isinstance(entries, list):
        raise AssertionError("board: missing index entries")
    grouped: dict[str, list[dict[str, object]]] = {}
    for entry in entries:
        manifest_path = Path(str(entry["manifest"]))
        validate_manifest(manifest_path)
        payload = read_json(manifest_path)
        family = str(payload["family"])
        grouped.setdefault(family, []).append(
            {**entry, **payload, "image": Path(str(entry["image"])), "manifest": manifest_path}
        )
    expected_families = {"board", "board-unsorted-narrow", "board-unsorted-wide"}
    if set(grouped) != expected_families:
        raise AssertionError(f"board: expected {expected_families}, got {set(grouped)}")
    for family, family_entries in grouped.items():
        counts = [int(entry["representativeCount"]) for entry in family_entries]
        if counts != EXPECTED_COUNTS:
            raise AssertionError(f"{family}: wrong representative counts {counts}")
        assert_family_contract(family_entries, family)
    return grouped


def validate_determinism(output_dir: Path, family: str, original_entries: list[dict[str, object]]) -> None:
    with tempfile.TemporaryDirectory(prefix=f"dipistav-{family}-v11-") as directory:
        rerendered = compose_family(family, Path(directory))
        assert_family_contract(rerendered, family)
        original_hashes = [entry["outputSha256"] for entry in original_entries]
        rerendered_hashes = [entry["outputSha256"] for entry in rerendered]
        if original_hashes != rerendered_hashes:
            raise AssertionError(f"{family}: deterministic SHA-256 check failed")


def main() -> None:
    args = parse_args()
    ratios = geometry_contract()
    renderer_source = Path("scripts/artwork_v11.py").read_text(encoding="utf-8")
    if "GaussianBlur" in renderer_source or "apply_multiply_ao" in renderer_source:
        raise AssertionError("v11 renderer contains a forbidden blur/AO path")
    canonical_texture_hash = sha256(CANONICAL_UNIT_TILE)
    beam_index = args.beam_prefix or ("beam-refined" if args.refined else "beam")
    plank_index = args.plank_prefix or ("plank-refined" if args.refined else "plank")
    beam_entries = (
        [] if args.only == "plank" else validate_family_index(args.output_dir, beam_index)
    )
    plank_entries = (
        [] if args.only == "beam" else validate_family_index(args.output_dir, plank_index)
    )
    homepage_entries: list[dict[str, object]] = []
    board_entries: dict[str, list[dict[str, object]]] = {}
    if args.refined and args.only:
        raise AssertionError("--refined cannot be combined with --only")
    if args.refined:
        board_entries = validate_board_index(args.output_dir)
    elif not args.only:
        homepage_index = read_json(args.output_dir / "homepage-v11-index.json")
        raw_homepage_entries = homepage_index.get("entries")
        if not isinstance(raw_homepage_entries, list) or len(raw_homepage_entries) != 8:
            raise AssertionError("Homepage v11 must contain exactly eight candidates")
        homepage_entries = raw_homepage_entries
        for entry in homepage_entries:
            validate_manifest(Path(str(entry["manifest"])))
    locked_count = validate_locked_assets()
    if args.determinism:
        if beam_entries:
            validate_determinism(args.output_dir, "beam", beam_entries)
        if plank_entries:
            validate_determinism(args.output_dir, "plank", plank_entries)
        for family, entries in board_entries.items():
            validate_determinism(args.output_dir, family, entries)
    print(
        json.dumps(
            {
                "status": "pass",
                "approvalStatus": "awaiting-approval",
                "beamCandidates": len(beam_entries),
                "plankCandidates": len(plank_entries),
                "boardCandidates": sum(len(entries) for entries in board_entries.values()),
                "homepageCandidates": len(homepage_entries),
                "lockedAssetsVerified": locked_count,
                "geometryRatios": ratios,
                "canonicalTextureSha256": canonical_texture_hash,
                "cornerAndGrayHaloGate": "pass",
                "determinismVerified": args.determinism,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
