from __future__ import annotations

import hashlib
import json
import os
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
WORK_ROOT = ROOT / "tmp" / "pellets-v18-phase2-blank-stacks"
TIER3_CANDIDATE_ROOT = WORK_ROOT / "state-03" / "candidates" / "masters"
TIER3_CANDIDATE_PNG = TIER3_CANDIDATE_ROOT / "pellets-blank-03-master-candidate-e-v18.png"
TIER3_CANDIDATE_WEBP = TIER3_CANDIDATE_ROOT / "pellets-blank-03-master-candidate-e-v18.webp"
TIER3_CANDIDATE_MANIFEST = TIER3_CANDIDATE_ROOT / "pellets-blank-03-master-candidate-e-v18.manifest.json"
LOCKED_ROOT = ROOT / "artwork-sources" / "pellets"
LOCKED_TIER3_PNG = LOCKED_ROOT / "pellets-blank-03-master-v18.png"
LOCKED_TIER3_WEBP = LOCKED_ROOT / "pellets-blank-03-master-v18.webp"
LOCKED_TIER3_LOCK = LOCKED_ROOT / "pellets-blank-03-master-v18.lock.json"

VERIFY_RUN = os.environ.get("DIPISTAV_VERIFY_RUN") == "1"
CANVAS = (2048, 1536)
Z_STEP = 128
SAFE_INSET = 0.07

sys.path.insert(0, str(ROOT / "scripts"))
from artwork_v11 import save_webp  # noqa: E402
from pellet_artwork_v15 import alpha_bbox, composite  # noqa: E402


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def checkerboard(size: tuple[int, int], cell: int = 32) -> Image.Image:
    image = Image.new("RGBA", size, (238, 238, 238, 255))
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(207, 207, 207, 255))
    return image


def thumbnail_panel(image: Image.Image, size: int, background: tuple[int, int, int, int]) -> Image.Image:
    panel = Image.new("RGBA", (size, size), background)
    crop = image.crop(alpha_bbox(image))
    scale = min((size - 8) / crop.width, (size - 8) / crop.height)
    thumb = crop.resize((round(crop.width * scale), round(crop.height * scale)), Image.Resampling.LANCZOS)
    panel.alpha_composite(thumb, ((size - thumb.width) // 2, (size - thumb.height) // 2))
    return panel


def lock_tier3() -> dict[str, object]:
    candidate_manifest = json.loads(TIER3_CANDIDATE_MANIFEST.read_text(encoding="utf-8"))
    if sha256(TIER3_CANDIDATE_PNG) != candidate_manifest["masterPngSha256"]:
        raise ValueError("Approved Tier 3 PNG no longer matches Candidate E manifest")
    if sha256(TIER3_CANDIDATE_WEBP) != candidate_manifest["masterWebpSha256"]:
        raise ValueError("Approved Tier 3 WebP no longer matches Candidate E manifest")
    LOCKED_ROOT.mkdir(parents=True, exist_ok=True)
    if LOCKED_TIER3_PNG.exists() and sha256(LOCKED_TIER3_PNG) != sha256(TIER3_CANDIDATE_PNG):
        raise ValueError("Refusing to overwrite a different locked Tier 3 PNG")
    if LOCKED_TIER3_WEBP.exists() and sha256(LOCKED_TIER3_WEBP) != sha256(TIER3_CANDIDATE_WEBP):
        raise ValueError("Refusing to overwrite a different locked Tier 3 WebP")
    shutil.copyfile(TIER3_CANDIDATE_PNG, LOCKED_TIER3_PNG)
    shutil.copyfile(TIER3_CANDIDATE_WEBP, LOCKED_TIER3_WEBP)
    lock = {
        "assetId": "pellets-blank-03-master-v18",
        "approvalStatus": "approved-and-locked",
        "approvedCandidate": "pellets-blank-03-master-candidate-e-v18",
        "runtimeActive": False,
        "quantity": 3,
        "bagCount": 3,
        "geometry": "one-coplanar-ground-layer-three-prone-bags-flush-side-by-side",
        "camera": {"projection": "orthographic", "azimuthDegrees": 40, "elevationDegrees": 27, "zoomFactor": 1.0},
        "png": {"path": str(LOCKED_TIER3_PNG.relative_to(ROOT)).replace("\\", "/"), "sha256": sha256(LOCKED_TIER3_PNG)},
        "webp": {"path": str(LOCKED_TIER3_WEBP.relative_to(ROOT)).replace("\\", "/"), "sha256": sha256(LOCKED_TIER3_WEBP)},
    }
    LOCKED_TIER3_LOCK.write_text(json.dumps(lock, indent=2) + "\n", encoding="utf-8")
    return lock


def validate(master: Image.Image, layers: int, layer: Image.Image, placements: list[tuple[int, int]]) -> dict[str, object]:
    pixels = np.asarray(master)
    alpha = pixels[:, :, 3]
    bounds = alpha_bbox(master)
    margins = (bounds[0], bounds[1], master.width - bounds[2], master.height - bounds[3])
    errors: list[str] = []
    if any(margins[i] < CANVAS[i % 2] * SAFE_INSET for i in range(4)):
        errors.append(f"safe inset failed: {margins}")
    if any(alpha[y, x] for x, y in ((0, 0), (CANVAS[0] - 1, 0), (0, CANVAS[1] - 1), (CANVAS[0] - 1, CANVAS[1] - 1))):
        errors.append("corners are not transparent")
    if any(placements[index][0] != placements[0][0] for index in range(layers)):
        errors.append("horizontal layer alignment failed")
    if any(placements[index + 1][1] - placements[index][1] != Z_STEP for index in range(layers - 1)):
        errors.append("constant Z step failed")
    bright_edge = int(np.count_nonzero((alpha > 0) & (alpha < 240) & (pixels[:, :, :3].min(axis=2) >= 225)))
    if bright_edge:
        errors.append(f"bright edge pixels: {bright_edge}")
    return {
        "status": "pass" if not errors else "fail",
        "canvas": {"width": master.width, "height": master.height},
        "alphaBoundsPixels": {"left": bounds[0], "top": bounds[1], "right": bounds[2], "bottom": bounds[3]},
        "marginsPixels": {"left": margins[0], "top": margins[1], "right": margins[2], "bottom": margins[3]},
        "layerCount": layers,
        "bagsPerLayer": 3,
        "bagCount": layers * 3,
        "layerPixelSize": {"width": layer.width, "height": layer.height},
        "layerZStepPixels": Z_STEP,
        "horizontalLayerOffsetPixels": 0,
        "instanceScalePercent": 100,
        "sourceLayerResampling": "none",
        "visibleInterlayerGapPixels": 0,
        "transparentRgbClean": bool(np.all(pixels[:, :, :3][alpha == 0] == 0)),
        "whiteOrBrightEdgePixels": bright_edge,
        "errors": errors,
    }


def save_qa(master: Image.Image, qa_root: Path, stem: str, report: dict[str, object]) -> None:
    qa_root.mkdir(parents=True, exist_ok=True)
    composite(master, (248, 241, 229, 255)).save(qa_root / f"{stem}-light.png")
    composite(master, (55, 49, 44, 255)).save(qa_root / f"{stem}-dark.png")
    alpha = checkerboard(master.size)
    alpha.alpha_composite(master)
    alpha.save(qa_root / f"{stem}-alpha.png")
    thumbnail_panel(master, 320, (248, 241, 229, 255)).save(qa_root / f"{stem}-320px.png")
    thumbnail_panel(master, 80, (248, 241, 229, 255)).save(qa_root / f"{stem}-80px.png")
    (qa_root / f"{stem}-validation.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


def build_tier(quantity: int, layers: int, lock: dict[str, object]) -> dict[str, object]:
    state_root = WORK_ROOT / f"state-{quantity:02d}"
    run_root = state_root / ("determinism-verify" if VERIFY_RUN else "candidates")
    master_root = run_root / "masters"
    qa_root = run_root / "qa"
    stem = f"pellets-blank-{quantity:02d}-master-candidate-a-v18"
    png_path = master_root / f"{stem}.png"
    webp_path = master_root / f"{stem}.webp"
    manifest_path = master_root / f"{stem}.manifest.json"

    tier3 = Image.open(LOCKED_TIER3_PNG).convert("RGBA")
    layer = tier3.crop(alpha_bbox(tier3))
    union_height = layer.height + Z_STEP * (layers - 1)
    origin = ((CANVAS[0] - layer.width) // 2, (CANVAS[1] - union_height) // 2)
    # Draw from bottom to top; the top layer owns each contact boundary.
    placements = [(origin[0], origin[1] + Z_STEP * index) for index in range(layers)]
    master = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    for position in reversed(placements):
        master.alpha_composite(layer, position)
    pixels = np.asarray(master).copy()
    pixels[pixels[:, :, 3] == 0, :3] = 0
    master = Image.fromarray(pixels, "RGBA")
    report = validate(master, layers, layer, placements)
    if report["status"] != "pass":
        raise ValueError(json.dumps(report, indent=2))

    master_root.mkdir(parents=True, exist_ok=True)
    master.save(png_path, format="PNG", optimize=True)
    save_webp(master, webp_path)
    save_qa(master, qa_root, stem.replace("-master", ""), report)
    layer_pixel_hash = hashlib.sha256(layer.tobytes()).hexdigest()
    manifest = {
        "candidateId": stem,
        "tier": quantity,
        "quantity": quantity,
        "approvalStatus": "awaiting-visual-approval",
        "runtimeActive": False,
        "brandingPolicy": "zero-branding-all-surfaces",
        "compositionMode": f"{layers}-byte-identical-locked-tier3-layers-no-resampling",
        "geometry": {"layers": layers, "bagsPerLayer": 3, "alignment": "direct-vertical-flush", "zStepPixels": Z_STEP},
        "cameraLock": {"projection": "orthographic", "azimuthDegrees": 40, "elevationDegrees": 27, "zoomFactor": 1.0},
        "scaleLock": {"instanceScalePercent": 100, "zoomOutAllowed": False, "canvasExpanded": True},
        "lockedTier3PngSha256": lock["png"]["sha256"],
        "layerPixelSha256": [layer_pixel_hash] * layers,
        "placementsTopToBottom": [{"layer": index + 1, "x": pos[0], "y": pos[1]} for index, pos in enumerate(placements)],
        "validation": report,
        "masterPngSha256": sha256(png_path),
        "masterWebpSha256": sha256(webp_path),
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest


def main() -> None:
    for required in (TIER3_CANDIDATE_PNG, TIER3_CANDIDATE_WEBP, TIER3_CANDIDATE_MANIFEST):
        if not required.exists():
            raise FileNotFoundError(required)
    lock = lock_tier3()
    result = {"tier3Lock": lock, "tier6": build_tier(6, 2, lock), "tier9": build_tier(9, 3, lock)}
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
