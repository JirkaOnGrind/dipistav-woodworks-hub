#!/usr/bin/env python3
"""Derive the four approved timber homepage icons without re-rendering."""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

from artwork_v11 import contact_sheet, sha256, write_json


ICON_SOURCES = (
    (
        "tramy",
        Path("tmp/artwork-v11-occlusion-v3/beam-occlusion-v3/beam-occlusion-v3-3-4-master-v11.webp"),
        Path("tmp/artwork-v11-occlusion-v3/beam-occlusion-v3/beam-occlusion-v3-3-4-master-v11.manifest.json"),
        "tramy-icon-occlusion-v3-master-v11.webp",
        "2+1",
    ),
    (
        "fosny",
        Path("tmp/artwork-v11-final-calibration/plank-family-match-v6/plank-family-match-v6-5-8-master-v11.webp"),
        Path("tmp/artwork-v11-final-calibration/plank-family-match-v6/plank-family-match-v6-5-8-master-v11.manifest.json"),
        "fosny-icon-family-match-v6-master-v11.webp",
        "3x2",
    ),
    (
        "prkna",
        Path("tmp/artwork-v11-occlusion-v3/board-occlusion-v3/board-occlusion-v3-5-8-master-v11.webp"),
        Path("tmp/artwork-v11-occlusion-v3/board-occlusion-v3/board-occlusion-v3-5-8-master-v11.manifest.json"),
        "prkna-icon-occlusion-v3-master-v11.webp",
        "3x2",
    ),
    (
        "late",
        Path("tmp/composed_battens/lath/lath-9-11-master-v11.webp"),
        Path("tmp/composed_battens/lath/lath-9-11-master-v11.manifest.json"),
        "late-icon-production-v2-master-v11.webp",
        "3x3",
    ),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, default=Path("tmp/artwork-v11"))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    icon_dir = args.output_dir / "homepage"
    icon_dir.mkdir(parents=True, exist_ok=True)
    entries: list[dict[str, object]] = []

    for category_id, source, source_manifest, filename, composition in ICON_SOURCES:
        if not source.exists() or not source_manifest.exists():
            raise FileNotFoundError(f"Missing approved source for {category_id}: {source}")
        source_data = json.loads(source_manifest.read_text(encoding="utf-8"))
        source_hash = sha256(source)
        if source_hash != source_data["outputSha256"]:
            raise ValueError(f"Approved source hash mismatch: {source}")

        output_path = icon_dir / filename
        shutil.copyfile(source, output_path)
        output_hash = sha256(output_path)
        if output_hash != source_hash:
            raise ValueError(f"Byte-preserving icon copy failed: {output_path}")

        metadata = {
            **source_data,
            "categoryId": category_id,
            "composition": composition,
            "approvalStatus": "approved",
            "sourceMaster": source.as_posix(),
            "sourceMasterSha256": source_hash,
            "outputSha256": output_hash,
            "plannedRuntimePath": f"/images/illustrations/homepage-v11/{filename}",
        }
        manifest = output_path.with_suffix(".manifest.json")
        write_json(manifest, metadata)
        entries.append({"image": output_path, "manifest": manifest, **metadata})

    for size, cell in ((144, (384, 250)), (176, (440, 290)), (320, (320, 220))):
        contact_sheet(
            entries,
            args.output_dir / "contact-sheets" / f"homepage-timber-v11-{size}.png",
            f"DIPISTAV v11 - approved timber homepage icons - {size}px",
            "#F4EFE5",
            cell_size=cell,
            columns=4,
        )

    index = {
        "styleVersion": "v11",
        "approvalStatus": "approved",
        "scope": "timber-only",
        "entries": [
            {
                "image": Path(entry["image"]).as_posix(),
                "manifest": Path(entry["manifest"]).as_posix(),
                "plannedRuntimePath": entry["plannedRuntimePath"],
                "outputSha256": entry["outputSha256"],
            }
            for entry in entries
        ],
    }
    write_json(args.output_dir / "homepage-timber-v11-index.json", index)
    print(json.dumps(index, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
