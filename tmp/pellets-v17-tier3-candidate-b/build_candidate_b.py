from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
COMMON_ROOT = ROOT / "tmp" / "pellets-v17-tier2-3"
sys.path.insert(0, str(COMMON_ROOT))
import build_tiers as common  # noqa: E402


OUTPUT_ROOT = ROOT / "tmp" / "pellets-v17-tier3-candidate-b"
SOURCE_ROOT = OUTPUT_ROOT / "source"
VERIFY_RUN = os.environ.get("DIPISTAV_VERIFY_RUN") == "1"
RUN_ROOT = OUTPUT_ROOT / "determinism-verify" if VERIFY_RUN else OUTPUT_ROOT / "candidates"
MASTER_ROOT = RUN_ROOT / "masters"
QA_ROOT = RUN_ROOT / "qa"
BLANK_SOURCE = SOURCE_ROOT / "pellets-tier3-blank-soft-geometry-source-b2-v17.png"
BRANDED_SOURCE = (RUN_ROOT if VERIFY_RUN else SOURCE_ROOT) / "pellets-tier3-branded-source-b2-v17.png"
DECAL_PATH = (RUN_ROOT if VERIFY_RUN else SOURCE_ROOT) / "pellets-locked-print-decal-b2-v17.png"
PROMPT_SPEC = OUTPUT_ROOT / "pellets-tier3-candidate-b-v17.prompt.md"
LAYOUT_REFERENCE = OUTPUT_ROOT / "reference" / "tier3-layout-reference-crop.png"

LOCKED_PNG = ROOT / "artwork-sources" / "pellets" / "pellets-bag-unit-tile-master-v17.png"
LOCK_FILE = ROOT / "artwork-sources" / "pellets" / "pellets-bag-unit-tile-master-v17.lock.json"
MASTER_PNG = MASTER_ROOT / "pellets-bag-3-master-candidate-b2-v17.png"
MASTER_WEBP = MASTER_PNG.with_suffix(".webp")
MANIFEST = MASTER_PNG.with_suffix(".manifest.json")

TOP_FACE = ((658, 100), (1080, 146), (925, 413), (500, 321))
BOTTOM_LEFT_FACE = ((510, 224), (806, 260), (660, 742), (238, 675))
BOTTOM_RIGHT_FACE = ((808, 246), (1264, 296), (1128, 773), (682, 709))
BRIDGE_OCCLUSION = ((654, 92), (1086, 140), (1082, 284), (930, 510), (498, 441), (492, 320))

# Lower decals are centered within each exposed upward-facing print region. The
# bridge is a real occluder; its silhouette is subtracted before compositing.
TOP_DECAL_QUAD = ((724, 151), (944, 175), (842, 354), (612, 309))
BOTTOM_LEFT_DECAL_QUAD = ((432, 415), (616, 440), (558, 633), (352, 600))
BOTTOM_RIGHT_DECAL_QUAD = ((912, 427), (1110, 449), (1053, 650), (843, 620))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def polygon_mask(size: tuple[int, int], polygon: tuple[tuple[int, int], ...]) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).polygon(polygon, fill=255)
    return mask


def centroid(polygon: tuple[tuple[int, int], ...]) -> tuple[float, float]:
    return (
        sum(point[0] for point in polygon) / len(polygon),
        sum(point[1] for point in polygon) / len(polygon),
    )


def warp_decal(decal: Image.Image, size: tuple[int, int], quad: tuple[tuple[int, int], ...]) -> Image.Image:
    source_quad = (
        (0, 0),
        (decal.width - 1, 0),
        (decal.width - 1, decal.height - 1),
        (0, decal.height - 1),
    )
    coefficients = common.perspective_coefficients(quad, source_quad)
    return decal.transform(size, Image.Transform.PERSPECTIVE, coefficients, Image.Resampling.BICUBIC)


def place_decal(
    canvas: Image.Image,
    decal: Image.Image,
    face: tuple[tuple[int, int], ...],
    quad: tuple[tuple[int, int], ...],
    occlusion: Image.Image | None,
) -> dict[str, object]:
    warped = warp_decal(decal, canvas.size, quad)
    face_mask = polygon_mask(canvas.size, face)
    visible_mask = np.asarray(face_mask).copy()
    if occlusion is not None:
        visible_mask = np.minimum(visible_mask, 255 - np.asarray(occlusion))

    warped_alpha = np.asarray(warped.getchannel("A"))
    outside_before = int(np.count_nonzero((warped_alpha > 0) & (np.asarray(face_mask) == 0)))
    clipped_alpha = np.minimum(warped_alpha, visible_mask).astype(np.uint8)
    warped.putalpha(Image.fromarray(clipped_alpha, "L"))
    outside_after = int(np.count_nonzero((clipped_alpha > 0) & (np.asarray(face_mask) == 0)))
    canvas.alpha_composite(warped)

    face_center = centroid(face)
    decal_center = centroid(quad)
    return {
        "facePolygon": face,
        "decalQuad": quad,
        "faceCenter": {"x": round(face_center[0], 3), "y": round(face_center[1], 3)},
        "decalCenter": {"x": round(decal_center[0], 3), "y": round(decal_center[1], 3)},
        "centerOffsetPixels": {
            "x": round(decal_center[0] - face_center[0], 3),
            "y": round(decal_center[1] - face_center[1], 3),
        },
        "decalPixelsOutsidePrintFaceBeforeClip": outside_before,
        "decalPixelsOutsidePrintFaceAfterClip": outside_after,
        "visibleDecalPixels": int(np.count_nonzero(clipped_alpha)),
    }


def mask_qa(scene: Image.Image) -> Image.Image:
    qa = scene.copy()
    draw = ImageDraw.Draw(qa, "RGBA")
    for face in (BOTTOM_LEFT_FACE, BOTTOM_RIGHT_FACE, TOP_FACE):
        draw.polygon(face, fill=(0, 155, 85, 48), outline=(0, 125, 65, 255), width=4)
    draw.polygon(BRIDGE_OCCLUSION, fill=(25, 80, 200, 42), outline=(25, 80, 200, 255), width=4)
    for quad in (BOTTOM_LEFT_DECAL_QUAD, BOTTOM_RIGHT_DECAL_QUAD, TOP_DECAL_QUAD):
        draw.line((*quad, quad[0]), fill=(195, 30, 35, 255), width=4)
    return qa


def save_qa(master: Image.Image) -> None:
    QA_ROOT.mkdir(parents=True, exist_ok=True)
    common.composite(master, (248, 241, 229, 255)).save(QA_ROOT / "pellets-tier3-candidate-b2-v17-light.png")
    common.composite(master, (55, 49, 44, 255)).save(QA_ROOT / "pellets-tier3-candidate-b2-v17-dark.png")
    common.thumbnail_panel(master, 320, (248, 241, 229, 255)).save(
        QA_ROOT / "pellets-tier3-candidate-b2-v17-320px.png"
    )
    mobile = Image.new("RGBA", (160, 80), (0, 0, 0, 0))
    mobile.alpha_composite(common.thumbnail_panel(master, 80, (248, 241, 229, 255)), (0, 0))
    mobile.alpha_composite(common.thumbnail_panel(master, 80, (55, 49, 44, 255)), (80, 0))
    mobile.save(QA_ROOT / "pellets-tier3-candidate-b2-v17-80px.png")
    alpha_qa = common.checkerboard(master.size)
    alpha_qa.alpha_composite(master)
    alpha_qa.save(QA_ROOT / "pellets-tier3-candidate-b2-v17-alpha.png")


def main() -> None:
    common.verify_locked_base()
    for required in (BLANK_SOURCE, LOCKED_PNG, LOCK_FILE, PROMPT_SPEC, LAYOUT_REFERENCE):
        if not required.exists():
            raise FileNotFoundError(required)
    for directory in (SOURCE_ROOT, MASTER_ROOT, QA_ROOT):
        directory.mkdir(parents=True, exist_ok=True)

    locked = Image.open(LOCKED_PNG).convert("RGBA")
    decal = common.extract_locked_decal(locked)
    decal.save(DECAL_PATH)

    blank_scene, alpha_method = common.source_rgba(BLANK_SOURCE)
    branded = blank_scene.copy()
    bridge_occlusion = polygon_mask(branded.size, BRIDGE_OCCLUSION)

    placements = {
        "bottomLeft": place_decal(
            branded, decal, BOTTOM_LEFT_FACE, BOTTOM_LEFT_DECAL_QUAD, bridge_occlusion
        ),
        "bottomRight": place_decal(
            branded, decal, BOTTOM_RIGHT_FACE, BOTTOM_RIGHT_DECAL_QUAD, bridge_occlusion
        ),
        "topBridge": place_decal(branded, decal, TOP_FACE, TOP_DECAL_QUAD, None),
    }

    branded.save(BRANDED_SOURCE)
    mask_qa(blank_scene).save(QA_ROOT / "pellets-tier3-candidate-b2-v17-surface-masks.png")
    master = common.clean_alpha(common.fit_master(branded, common.TIER3_TARGET_WIDTH))
    master.save(MASTER_PNG, format="PNG", optimize=True)
    common.save_webp(master, MASTER_WEBP)
    save_qa(master)

    technical = common.metadata(master)
    decal_hash = sha256(DECAL_PATH)
    manifest = {
        "candidateId": "pellets-bag-3-master-candidate-b2-v17",
        "supersedesRejectedCandidate": "pellets-bag-3-master-candidate-a-v17",
        "styleVersion": "v17-candidate",
        "approvalStatus": "awaiting-visual-approval",
        "runtimeActive": False,
        "family": "pellets-bag",
        "quantity": 3,
        "representativeCount": 3,
        **technical,
        "safeInset": common.SAFE_INSET,
        "contourReservePixels": common.CONTOUR_RESERVE,
        "workScale": common.WORK_SCALE,
        "downsample": "single-lanczos",
        "camera": {"projection": "orthographic", "azimuthDegrees": 40, "elevationDegrees": 27},
        "lighting": "upper-left-object-lighting-no-cast-shadow",
        "layout": "three-soft-prone-bags-two-bottom-plus-one-centered-rearward-bridge",
        "printFaceOrientation": "all-three-upward",
        "forbiddenPrintSurfaces": [
            "front-thickness",
            "bottom-edge",
            "side-gussets",
            "rolled-closures",
            "seams",
            "rear-surfaces",
        ],
        "lockedBase": str(LOCKED_PNG.relative_to(ROOT)).replace("\\", "/"),
        "lockedBaseSha256": sha256(LOCKED_PNG),
        "decalSource": str(DECAL_PATH.relative_to(ROOT)).replace("\\", "/"),
        "decalSourceSha256": decal_hash,
        "decalInstanceSourceSha256": [decal_hash, decal_hash, decal_hash],
        "blankGeometrySource": str(BLANK_SOURCE.relative_to(ROOT)).replace("\\", "/"),
        "blankGeometrySourceSha256": sha256(BLANK_SOURCE),
        "geometryAlphaMethod": alpha_method,
        "layoutReference": str(LAYOUT_REFERENCE.relative_to(ROOT)).replace("\\", "/"),
        "layoutReferenceSha256": sha256(LAYOUT_REFERENCE),
        "promptSpec": str(PROMPT_SPEC.relative_to(ROOT)).replace("\\", "/"),
        "promptSpecSha256": sha256(PROMPT_SPEC),
        "placements": placements,
        "totalDecalPixelsOutsidePrintFacesAfterClip": sum(
            placement["decalPixelsOutsidePrintFaceAfterClip"] for placement in placements.values()
        ),
        "masterPngSha256": sha256(MASTER_PNG),
        "masterWebpSha256": sha256(MASTER_WEBP),
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
