from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
CANVAS = (1536, 1024)
RENDER_SCALE = 4
SAFE_INSET = 0.07
CONTOUR_RESERVE = 8
CREAM = "#F7F0E3"
DARK = "#302B27"
GOLDEN = (
    ROOT
    / "public/images/illustrations/configurator-v12/"
    "firewood-loose-16plus-master-v12.webp"
)
GOLDEN_SHA256 = "993a4d12bbb2f0f511d74ab70d2d1738f88492f640602e8cfeb4805a919c3a9f"

POSITIVE_PROMPT = (
    "Artisan architectural woodcut engraving of a loose pile of authentic split firewood, "
    "matching exactly the style, line weight, and color palette of reference image "
    "16-plus-approved. Precise triangular wedge logs, quarter-split timber with visible wood "
    "grain and growth rings on warm honey-gold cleaved faces. Natural rough brown bark on "
    "curved outer edges. Clean ink hatching lines, soft ambient illumination, no crushed "
    "blacks. Perfectly isolated on transparent background, professional master catalog quality."
)

NEGATIVE_PROMPT = (
    "crushed black shadows, pitch black edges, muddy textures, oversaturated dark brown, "
    "burned wood, charcoal, round logs, cylindrical ends, pebble shapes, smooth plastic, "
    "low poly, 3D render, cartoon vector, inconsistent line weight, noisy background, "
    "halo artifacts, harsh black outlines."
)

SCENES = (
    {
        "band": "1-2",
        "quantityBand": {"min": 1, "max": 2},
        "representativeCount": 1,
        "targetAlphaWidth": 0.62,
        "selected": "b",
        "modifier": (
            "Small compact low pile with a clear center crest and a modest number of large, "
            "thick quarter-split and naturally wedge-split pieces; reduce piece count and "
            "footprint, never log scale."
        ),
        "reviews": {
            "a": "rejected: required lightness and chroma corrections exceed the hard limits",
            "b": "selected: compact full-size split pieces and clean Golden-Master color correction",
        },
    },
    {
        "band": "3-4",
        "quantityBand": {"min": 3, "max": 4},
        "representativeCount": 3,
        "targetAlphaWidth": 0.70,
        "selected": "b",
        "modifier": (
            "Medium utility heap of roughly thirty substantial pieces, visibly broader than "
            "1-2 but far smaller than a trailer load; irregular footprint and distinct crest, "
            "never a round bun or pebble heap."
        ),
        "reviews": {
            "a": "rejected: quantity and silhouette are too close to the 16-plus Golden Master",
            "b": "selected: correct medium footprint, readable logs and non-spherical crest",
        },
    },
    {
        "band": "5-8",
        "quantityBand": {"min": 5, "max": 8},
        "representativeCount": 6,
        "targetAlphaWidth": 0.76,
        "selected": "b",
        "modifier": (
            "Wide trailer-dumped heap with a broader and deeper footprint, moderate natural "
            "summit and full-size readable logs; visibly larger than 3-4 and smaller than a "
            "truck load."
        ),
        "reviews": {
            "a": "rejected: footprint increase over the selected 3-4 state is too modest",
            "b": "selected: broad trailer-load footprint with consistent log thickness",
        },
    },
    {
        "band": "9-15",
        "quantityBand": {"min": 9, "max": 15},
        "representativeCount": 12,
        "targetAlphaWidth": 0.82,
        "selected": "a",
        "modifier": (
            "Large broad truck-dumped elliptical mound with a centered crest and long sloped "
            "sides; preserve foreground-log thickness throughout and keep rough brown bark on "
            "every perimeter piece."
        ),
        "reviews": {
            "a": "selected: broad truck-load silhouette, stable log scale and closest raw palette match",
            "b": "rejected: too dense and too close to the Golden Master mass; raw amber exceeds correction gate",
        },
    },
)

LAB_BINS = ((5.0, 25.0), (25.0, 55.0), (55.0, 75.0), (75.0, 95.0))
LUMA_QUANTILES = np.array((0.05, 0.25, 0.50, 0.75, 0.95))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def rgb_to_lab(rgb: np.ndarray) -> np.ndarray:
    values = rgb.astype(np.float64) / 255.0
    linear = np.where(
        values <= 0.04045,
        values / 12.92,
        ((values + 0.055) / 1.055) ** 2.4,
    )
    xyz = linear @ np.array(
        (
            (0.4124564, 0.3575761, 0.1804375),
            (0.2126729, 0.7151522, 0.0721750),
            (0.0193339, 0.1191920, 0.9503041),
        )
    ).T
    xyz /= np.array((0.95047, 1.0, 1.08883))
    delta = 6 / 29
    transformed = np.where(
        xyz > delta**3,
        np.cbrt(xyz),
        xyz / (3 * delta * delta) + 4 / 29,
    )
    return np.column_stack(
        (
            116 * transformed[:, 1] - 16,
            500 * (transformed[:, 0] - transformed[:, 1]),
            200 * (transformed[:, 1] - transformed[:, 2]),
        )
    )


def lab_to_rgb(lab: np.ndarray) -> np.ndarray:
    fy = (lab[:, 0] + 16) / 116
    fx = fy + lab[:, 1] / 500
    fz = fy - lab[:, 2] / 200
    transformed = np.column_stack((fx, fy, fz))
    delta = 6 / 29
    xyz = np.where(
        transformed > delta,
        transformed**3,
        3 * delta * delta * (transformed - 4 / 29),
    )
    xyz *= np.array((0.95047, 1.0, 1.08883))
    linear = xyz @ np.array(
        (
            (3.2404542, -1.5371385, -0.4985314),
            (-0.9692660, 1.8760108, 0.0415560),
            (0.0556434, -0.2040259, 1.0572252),
        )
    ).T
    linear = np.clip(linear, 0.0, 1.0)
    srgb = np.where(
        linear <= 0.0031308,
        12.92 * linear,
        1.055 * np.power(linear, 1 / 2.4) - 0.055,
    )
    return np.clip(np.rint(srgb * 255), 0, 255).astype(np.uint8)


def extract_alpha(image: Image.Image) -> Image.Image:
    if image.mode == "RGBA" and image.getchannel("A").getextrema()[0] == 0:
        return image.copy()

    rgb = np.asarray(image.convert("RGB"), dtype=np.uint8)
    minimum = rgb.min(axis=2)
    maximum = rgb.max(axis=2)
    neutral_background = ((maximum - minimum) <= 22) & (minimum >= 175)
    # Imagegen baked a neutral checkerboard into RGB. Its cells can be locally
    # disconnected by anti-aliased grid seams, so a corner flood-fill would
    # retain white islands inside the pile. Golden wood pixels are either
    # chromatic honey/brown or dark ink; removing the neutral bright matte
    # globally is therefore both narrower and safer than broad recoloring.
    alpha = Image.fromarray((~neutral_background * 255).astype(np.uint8), "L")
    alpha = alpha.filter(ImageFilter.MinFilter(3))

    rgba = image.convert("RGBA")
    rgba.putalpha(alpha)
    pixels = np.asarray(rgba, dtype=np.uint8).copy()
    pixels[pixels[:, :, 3] == 0, :3] = 0
    return Image.fromarray(pixels, "RGBA")


def analysis_mask(image: Image.Image) -> np.ndarray:
    alpha = image.getchannel("A").filter(ImageFilter.MinFilter(5))
    return np.asarray(alpha, dtype=np.uint8) >= 248


def color_metrics(image: Image.Image) -> dict[str, object]:
    pixels = np.asarray(image.convert("RGBA"), dtype=np.uint8)
    mask = analysis_mask(image)
    lab = rgb_to_lab(pixels[:, :, :3][mask])
    lightness = lab[:, 0]
    return {
        "labQuantiles": {
            key: round(float(value), 4)
            for key, value in zip(
                ("p05", "p25", "p50", "p75", "p95"),
                np.quantile(lightness, LUMA_QUANTILES),
            )
        },
        "darkFractions": {
            "lStarLt5": round(float(np.mean(lightness < 5)), 6),
            "lStarLt10": round(float(np.mean(lightness < 10)), 6),
            "lStarLt25": round(float(np.mean(lightness < 25)), 6),
        },
        "medianA": round(float(np.median(lab[:, 1])), 4),
        "medianB": round(float(np.median(lab[:, 2])), 4),
    }


def normalize_color(
    image: Image.Image,
    golden_image: Image.Image,
) -> tuple[Image.Image, dict[str, object]]:
    candidate = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    golden = np.asarray(golden_image.convert("RGBA"), dtype=np.uint8)
    candidate_mask = analysis_mask(image)
    golden_mask = analysis_mask(golden_image)
    candidate_lab_sample = rgb_to_lab(candidate[:, :, :3][candidate_mask])
    golden_lab_sample = rgb_to_lab(golden[:, :, :3][golden_mask])

    source_quantiles = np.quantile(candidate_lab_sample[:, 0], LUMA_QUANTILES)
    target_quantiles = np.quantile(golden_lab_sample[:, 0], LUMA_QUANTILES)
    lightness_shifts = target_quantiles - source_quantiles
    maximum_lightness_shift = float(np.max(np.abs(lightness_shifts)))

    chroma_shifts: list[tuple[float, float]] = []
    for lower, upper in LAB_BINS:
        source_chroma = np.hypot(candidate_lab_sample[:, 1], candidate_lab_sample[:, 2])
        target_chroma = np.hypot(golden_lab_sample[:, 1], golden_lab_sample[:, 2])
        source_bin = (
            (candidate_lab_sample[:, 0] >= lower)
            & (candidate_lab_sample[:, 0] < upper)
            & (source_chroma >= 10)
        )
        target_bin = (
            (golden_lab_sample[:, 0] >= lower)
            & (golden_lab_sample[:, 0] < upper)
            & (target_chroma >= 10)
        )
        if not np.any(source_bin) or not np.any(target_bin):
            raise AssertionError(f"Missing Lab material bin {lower}-{upper}")
        chroma_shifts.append(
            (
                float(np.median(golden_lab_sample[target_bin, 1]) - np.median(candidate_lab_sample[source_bin, 1])),
                float(np.median(golden_lab_sample[target_bin, 2]) - np.median(candidate_lab_sample[source_bin, 2])),
            )
        )
    maximum_chroma_shift = max(abs(value) for pair in chroma_shifts for value in pair)

    correction_allowed = maximum_lightness_shift <= 8.0 + 1e-6 and maximum_chroma_shift <= 6.0 + 1e-6
    if not correction_allowed:
        return image.copy(), {
            "applied": False,
            "correctionAllowed": False,
            "maximumLightnessShift": round(maximum_lightness_shift, 4),
            "maximumChromaShift": round(maximum_chroma_shift, 4),
            "lightnessShifts": [round(float(value), 4) for value in lightness_shifts],
            "chromaShifts": [[round(a, 4), round(b, 4)] for a, b in chroma_shifts],
        }

    visible = candidate[:, :, 3] > 0
    visible_lab = rgb_to_lab(candidate[:, :, :3][visible])
    original_lightness = visible_lab[:, 0].copy()
    visible_lab[:, 0] = np.interp(
        visible_lab[:, 0],
        np.concatenate(([0.0], source_quantiles, [100.0])),
        np.concatenate(([0.0], target_quantiles, [100.0])),
    )
    bin_centers = np.array(tuple((lower + upper) / 2 for lower, upper in LAB_BINS))
    shift_a = np.array(tuple(pair[0] for pair in chroma_shifts))
    shift_b = np.array(tuple(pair[1] for pair in chroma_shifts))
    visible_lab[:, 1] += np.interp(original_lightness, bin_centers, shift_a, left=0.0, right=0.0)
    visible_lab[:, 2] += np.interp(original_lightness, bin_centers, shift_b, left=0.0, right=0.0)
    candidate[:, :, :3][visible] = lab_to_rgb(visible_lab)
    candidate[candidate[:, :, 3] == 0, :3] = 0
    return Image.fromarray(candidate, "RGBA"), {
        "applied": True,
        "correctionAllowed": True,
        "maximumLightnessShift": round(maximum_lightness_shift, 4),
        "maximumChromaShift": round(maximum_chroma_shift, 4),
        "lightnessShifts": [round(float(value), 4) for value in lightness_shifts],
        "chromaShifts": [[round(a, 4), round(b, 4)] for a, b in chroma_shifts],
    }


def auto_fit(image: Image.Image) -> Image.Image:
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise AssertionError("Candidate has no alpha content")
    cutout = image.crop(bounds)
    # Two extra source pixels absorb the final Lanczos support lobe while still
    # honoring the canonical 7% + 8 px contour reserve.
    usable_width = math.floor(CANVAS[0] * (1 - 2 * SAFE_INSET) - 2 * CONTOUR_RESERVE) - 2
    usable_height = math.floor(CANVAS[1] * (1 - 2 * SAFE_INSET) - 2 * CONTOUR_RESERVE) - 2
    scale = min(2.0, usable_width / cutout.width, usable_height / cutout.height)
    final_size = (round(cutout.width * scale), round(cutout.height * scale))

    large_cutout = cutout.resize(
        (final_size[0] * RENDER_SCALE, final_size[1] * RENDER_SCALE),
        Image.Resampling.LANCZOS,
    )
    large_canvas = Image.new(
        "RGBA",
        (CANVAS[0] * RENDER_SCALE, CANVAS[1] * RENDER_SCALE),
        (0, 0, 0, 0),
    )
    large_canvas.alpha_composite(
        large_cutout,
        (
            (large_canvas.width - large_cutout.width) // 2,
            (large_canvas.height - large_cutout.height) // 2,
        ),
    )
    result = large_canvas.resize(CANVAS, Image.Resampling.LANCZOS)
    alpha = result.getchannel("A").point(lambda value: 0 if value < 8 else 255 if value > 247 else value)
    result.putalpha(alpha)
    pixels = np.asarray(result, dtype=np.uint8).copy()
    pixels[pixels[:, :, 3] == 0, :3] = 0
    return Image.fromarray(pixels, "RGBA")


def alpha_metadata(image: Image.Image) -> dict[str, object]:
    alpha = image.getchannel("A")
    bounds = alpha.getbbox()
    if bounds is None:
        raise AssertionError("Empty alpha")
    left, top, right, bottom = bounds
    alpha_values = np.asarray(alpha, dtype=np.uint8)
    return {
        "canvas": {"width": image.width, "height": image.height},
        "alphaBoundsPixels": {"left": left, "top": top, "right": right, "bottom": bottom},
        "alphaBounds": {
            "x": round(left / image.width, 6),
            "y": round(top / image.height, 6),
            "width": round((right - left) / image.width, 6),
            "height": round((bottom - top) / image.height, 6),
        },
        "opticalCenter": {
            "x": round((left + right) / (2 * image.width), 6),
            "y": round((top + bottom) / (2 * image.height), 6),
        },
        "alphaCoverage": round(float(np.mean(alpha_values > 0)), 6),
        "margins": {
            "left": left,
            "top": top,
            "right": image.width - right,
            "bottom": image.height - bottom,
        },
    }


def edge_metrics(image: Image.Image) -> dict[str, object]:
    pixels = np.asarray(image.convert("RGBA"), dtype=np.uint8)
    alpha = pixels[:, :, 3]
    rgb = pixels[:, :, :3]
    semitransparent = (alpha > 0) & (alpha < 248)
    edge_rgb = rgb[semitransparent]
    bright_neutral = (
        (edge_rgb.min(axis=1) > 180)
        & ((edge_rgb.max(axis=1) - edge_rgb.min(axis=1)) < 25)
        if len(edge_rgb)
        else np.array([], dtype=bool)
    )
    transparent_rgb = rgb[alpha == 0]
    return {
        "semiTransparentPixels": int(np.sum(semitransparent)),
        "brightNeutralFraction": round(float(np.mean(bright_neutral)) if len(bright_neutral) else 0.0, 8),
        "transparentRgbNonzeroFraction": round(
            float(np.mean(np.any(transparent_rgb != 0, axis=1))) if len(transparent_rgb) else 0.0,
            8,
        ),
    }


def validate_master(
    image: Image.Image,
    metrics: dict[str, object],
    edges: dict[str, object],
) -> list[str]:
    failures: list[str] = []
    if image.mode != "RGBA" or image.size != CANVAS:
        failures.append(f"invalid-canvas:{image.mode}:{image.size}")
    alpha = image.getchannel("A")
    corners = ((0, 0), (CANVAS[0] - 1, 0), (0, CANVAS[1] - 1), (CANVAS[0] - 1, CANVAS[1] - 1))
    if any(alpha.getpixel(point) != 0 for point in corners):
        failures.append("non-transparent-corner")
    bounds = alpha.getbbox()
    if bounds is None:
        failures.append("empty-alpha")
    else:
        left, top, right, bottom = bounds
        minimum_x = round(CANVAS[0] * SAFE_INSET) + CONTOUR_RESERVE
        minimum_y = round(CANVAS[1] * SAFE_INSET) + CONTOUR_RESERVE
        if min(left, CANVAS[0] - right) < minimum_x or min(top, CANVAS[1] - bottom) < minimum_y:
            failures.append(f"unsafe-alpha-bounds:{bounds}")
    values = metrics
    dark = values["darkFractions"]
    if dark["lStarLt5"] > 0.06:
        failures.append("crushed-black-lt5")
    if dark["lStarLt10"] > 0.13:
        failures.append("crushed-black-lt10")
    if dark["lStarLt25"] > 0.30:
        failures.append("crushed-shadow-lt25")
    if abs(values["labQuantiles"]["p50"] - 48.4) > 3.0:
        failures.append("median-lightness-mismatch")
    if abs(values["medianA"] - 14.7) > 4.0:
        failures.append("median-a-mismatch")
    if abs(values["medianB"] - 43.5) > 5.0:
        failures.append("median-b-mismatch")
    if edges["brightNeutralFraction"] > 0.002:
        failures.append("bright-neutral-alpha-halo")
    if edges["transparentRgbNonzeroFraction"] != 0:
        failures.append("nonzero-rgb-behind-transparent-alpha")
    return failures


def save_webp(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="WEBP", lossless=True, method=6, exact=True)


def runtime_frame(image: Image.Image, target_width: float) -> tuple[Image.Image, float]:
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise AssertionError("Cannot frame empty image")
    cutout = image.crop(bounds)
    target_pixels = round(CANVAS[0] * target_width)
    scale = target_pixels / cutout.width
    maximum_height = round(CANVAS[1] * (1 - 2 * SAFE_INSET))
    if round(cutout.height * scale) > maximum_height:
        scale = maximum_height / cutout.height
    size = (round(cutout.width * scale), round(cutout.height * scale))
    resized = cutout.resize(size, Image.Resampling.LANCZOS)
    frame = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    frame.alpha_composite(resized, ((CANVAS[0] - size[0]) // 2, (CANVAS[1] - size[1]) // 2))
    return frame, size[0] / CANVAS[0]


def comparison_sheet(entries: list[dict[str, object]], path: Path, background: str, width: int) -> None:
    columns = 5 if width >= 1000 else 1
    cell_width = width // columns
    cell_height = round(cell_width * 0.76)
    header = 48
    rows = math.ceil(len(entries) / columns)
    sheet = Image.new("RGB", (width, header + rows * cell_height), background)
    draw = ImageDraw.Draw(sheet)
    ink = "#FFF7E8" if background == DARK else "#2B160A"
    draw.text((14, 16), "Volne lozene drevo v15 / Golden Master alignment", fill=ink)
    for index, entry in enumerate(entries):
        frame, effective_width = runtime_frame(Image.open(Path(entry["image"])).convert("RGBA"), float(entry["targetAlphaWidth"]))
        preview_height = round(cell_width * CANVAS[1] / CANVAS[0])
        preview = frame.resize((cell_width, preview_height), Image.Resampling.LANCZOS)
        x = index % columns * cell_width
        y = header + index // columns * cell_height
        sheet.paste(preview, (x, y), preview)
        draw.text(
            (x + 8, y + cell_height - 24),
            f"{entry['label']} / target {float(entry['targetAlphaWidth']) * 100:.0f}% / actual {effective_width * 100:.1f}%",
            fill=ink,
        )
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(path)


def edge_sheet(entries: list[dict[str, object]], path: Path) -> None:
    cell_width = 360
    cell_height = 280
    sheet = Image.new("RGB", (cell_width * len(entries), cell_height), CREAM)
    draw = ImageDraw.Draw(sheet)
    for index, entry in enumerate(entries):
        image = Image.open(Path(entry["image"])).convert("RGBA")
        alpha = np.asarray(image.getchannel("A"), dtype=np.uint8)
        bounds = image.getchannel("A").getbbox()
        if bounds is None:
            continue
        left, top, right, bottom = bounds
        left_points = np.argwhere((alpha > 0) & (np.indices(alpha.shape)[1] <= left + 8))
        bottom_points = np.argwhere((alpha > 0) & (np.indices(alpha.shape)[0] >= bottom - 9))
        right_points = np.argwhere((alpha > 0) & (np.indices(alpha.shape)[1] >= right - 9))
        centers = (
            (left + 4, int(np.median(left_points[:, 0]))),
            (int(np.median(bottom_points[:, 1])), bottom - 5),
            (right - 5, int(np.median(right_points[:, 0]))),
        )
        x0 = index * cell_width
        for crop_index, (center_x, center_y) in enumerate(centers):
            crop_box = (
                max(0, center_x - 36),
                max(0, center_y - 36),
                min(image.width, center_x + 36),
                min(image.height, center_y + 36),
            )
            crop = image.crop(crop_box).resize((112, 112), Image.Resampling.NEAREST)
            for row, background_color in enumerate((CREAM, DARK)):
                background = Image.new("RGB", crop.size, background_color)
                background.paste(crop, (0, 0), crop)
                sheet.paste(background, (x0 + crop_index * 116 + 4, 34 + row * 116))
        draw.text((x0 + 8, 10), f"{entry['label']} edge x3", fill="#2B160A")
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(path)


def render(output_dir: Path) -> dict[str, object]:
    if sha256(GOLDEN) != GOLDEN_SHA256:
        raise AssertionError("Golden Master hash mismatch")
    golden_image = Image.open(GOLDEN).convert("RGBA")
    masters_dir = output_dir / "masters"
    manifests: list[dict[str, object]] = []
    selected_entries: list[dict[str, object]] = []

    for scene in SCENES:
        selected_variant = str(scene["selected"])
        for variant in ("a", "b"):
            source = ROOT / "tmp/firewood-loose-refinement-v15/source" / f"firewood-loose-{scene['band']}-source-{variant}-v15.png"
            extracted = extract_alpha(Image.open(source))
            raw_metrics = color_metrics(extracted)
            normalized, correction = normalize_color(extracted, golden_image)
            fitted = auto_fit(normalized)
            final_metrics = color_metrics(fitted)
            final_edges = edge_metrics(fitted)
            failures = validate_master(fitted, final_metrics, final_edges)
            if not correction["correctionAllowed"]:
                failures.append("color-correction-exceeds-limit")
            candidate_id = f"firewood-loose-{scene['band']}-candidate-{variant}-v15"
            output_path = masters_dir / f"{candidate_id}.webp"
            save_webp(fitted, output_path)
            decoded = Image.open(output_path)
            if decoded.info.get("icc_profile"):
                raise AssertionError(f"Unexpected embedded ICC profile in {candidate_id}")
            if not np.array_equal(
                np.asarray(decoded.convert("RGBA"), dtype=np.uint8),
                np.asarray(fitted, dtype=np.uint8),
            ):
                raise AssertionError(f"Lossless WebP round-trip mismatch in {candidate_id}")
            metadata = alpha_metadata(fitted)
            is_selected = variant == selected_variant
            technical_pass = not failures
            if is_selected and not technical_pass:
                raise AssertionError(f"Selected {candidate_id} failed: {failures}")
            manifest = {
                **metadata,
                "id": candidate_id,
                "styleVersion": "v15-candidate",
                "approvalStatus": "awaiting-visual-approval",
                "runtimeActivation": "blocked-until-explicit-visual-approval",
                "renderMode": "master",
                "renderTechnique": "golden-master-reference-guided-whole-pile-edit",
                "quantityBand": scene["quantityBand"],
                "representativeCount": scene["representativeCount"],
                "targetAlphaWidth": scene["targetAlphaWidth"],
                "variant": variant,
                "selectedForQa": is_selected,
                "visualReview": scene["reviews"][variant],
                "technicalPass": technical_pass,
                "technicalFailures": failures,
                "source": source.relative_to(ROOT).as_posix(),
                "sourceMode": Image.open(source).mode,
                "sourceSha256": sha256(source),
                "goldenMaster": GOLDEN.relative_to(ROOT).as_posix(),
                "goldenMasterSha256": GOLDEN_SHA256,
                "colorSpace": "implicit-sRGB-no-embedded-ICC",
                "positivePrompt": POSITIVE_PROMPT,
                "bandModifier": scene["modifier"],
                "negativePrompt": NEGATIVE_PROMPT,
                "rawColorMetrics": raw_metrics,
                "colorNormalization": correction,
                "finalColorMetrics": final_metrics,
                "edgeMetrics": final_edges,
                "outputSha256": sha256(output_path),
            }
            manifest_path = masters_dir / f"{candidate_id}.manifest.json"
            write_json(manifest_path, manifest)
            manifests.append({"image": output_path.as_posix(), "manifest": manifest_path.as_posix(), **manifest})
            if is_selected:
                selected_entries.append(
                    {
                        "label": f"{scene['band']} candidate {variant.upper()} v15",
                        "image": output_path,
                        "targetAlphaWidth": scene["targetAlphaWidth"],
                    }
                )

    selected_entries.append(
        {
            "label": "16+ GOLDEN v12",
            "image": GOLDEN,
            "targetAlphaWidth": 0.86,
        }
    )
    qa_dir = output_dir / "qa"
    comparison_sheet(selected_entries, qa_dir / "firewood-loose-v15-comparison-light.png", CREAM, 1800)
    comparison_sheet(selected_entries, qa_dir / "firewood-loose-v15-comparison-dark.png", DARK, 1800)
    comparison_sheet(selected_entries, qa_dir / "firewood-loose-v15-comparison-320.png", CREAM, 320)
    edge_sheet(selected_entries, qa_dir / "firewood-loose-v15-alpha-edge.png")

    effective_widths = []
    for entry in selected_entries:
        _, effective_width = runtime_frame(Image.open(Path(entry["image"])).convert("RGBA"), float(entry["targetAlphaWidth"]))
        effective_widths.append(round(effective_width, 6))
    target_widths = [0.62, 0.70, 0.76, 0.82, 0.86]
    if any(abs(actual - target) > 0.005 for actual, target in zip(effective_widths, target_widths)):
        raise AssertionError(f"Height cap changed optical widths: {effective_widths}")
    if any(current <= previous for previous, current in zip(effective_widths, effective_widths[1:])):
        raise AssertionError(f"Optical widths are not monotonic: {effective_widths}")

    validation = {
        "valid": True,
        "styleVersion": "v15-candidate",
        "approvalStatus": "awaiting-visual-approval",
        "runtimeActivation": "blocked-until-explicit-visual-approval",
        "goldenMaster": GOLDEN.relative_to(ROOT).as_posix(),
        "goldenMasterSha256": GOLDEN_SHA256,
        "colorSpace": "implicit-sRGB-no-embedded-ICC",
        "targetAlphaWidths": target_widths,
        "effectiveAlphaWidths": effective_widths,
        "selectedCandidates": [entry["label"] for entry in selected_entries[:-1]],
        "candidates": [
            {
                "id": item["id"],
                "selectedForQa": item["selectedForQa"],
                "technicalPass": item["technicalPass"],
                "technicalFailures": item["technicalFailures"],
                "image": item["image"],
                "manifest": item["manifest"],
                "sha256": item["outputSha256"],
            }
            for item in manifests
        ],
        "qa": [
            (qa_dir / "firewood-loose-v15-comparison-light.png").as_posix(),
            (qa_dir / "firewood-loose-v15-comparison-dark.png").as_posix(),
            (qa_dir / "firewood-loose-v15-comparison-320.png").as_posix(),
            (qa_dir / "firewood-loose-v15-alpha-edge.png").as_posix(),
        ],
    }
    write_json(output_dir / "validation.json", validation)
    return validation


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=ROOT / "tmp/firewood-loose-refinement-v15/candidates",
    )
    args = parser.parse_args()
    print(json.dumps(render(args.output_dir), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
