---
name: dipistav-artwork
description: Create, edit, compose, map, validate, or approve deterministic DIPISTAV product illustrations, Unit Tiles, quantity bands, manifests, alpha QA, runtime registries, and hash locks.
---

# DIPISTAV Artwork

Use this file as the sole canonical artwork specification. Ignore archived documents.

## Output contract

- Render on a `1536 × 1024` transparent RGBA canvas.
- Render geometry at `4×`, downsample once with Lanczos, then derive the final inner contour.
- Keep every non-transparent pixel inside a `7%` inset plus an `8 px` contour reserve.
- Keep all four canvas corners fully transparent.
- Save masters as lossless WebP. Save QA sheets as PNG.
- Use deterministic seeds, ordering, geometry, texture sampling, and filenames.
- Keep approved assets and their hashes byte-identical. Write corrections under new versioned filenames.

## Camera and geometry

Use orthographic isometry, `40°` azimuth, `27°` elevation, and upper-left lighting.

| Family | Column vector | Row-down vector | Back/depth vector | Cross-section target |
| --- | ---: | ---: | ---: | ---: |
| Beam | `(135, -28)` | `(0, 130)` | `(-560, -275)` | `1:1` |
| Plank | `(280, -58)` | `(0, 119)` | `(-372, -183)` | `1:2.4` |
| Board | `(225, -47)` | `(0, 48)` | `(-380, -187)` | `1:4.8` |
| Lath | `(90, -19)` | `(0, 67)` | `(-430, -211)` | `1:1.35` |

Use one Unit Tile per family and these quantity bands:

- `1` → one unit
- `2` → `2 × 1`
- `3–4` → centered `2 + 1`
- `5–8` → `3 × 2`
- `9–11` → `3 × 3`
- `12–15` → `4 × 3`
- `16+` → `4 × 4`

For unsorted boards, visibly mix member widths while preserving each row's total footprint:

- `board-unsorted-narrow`: `8, 10, 12, 14 cm`
- `board-unsorted-wide`: `16, 18, 20 cm`

## Canonical palette

| Role | Color |
| --- | --- |
| Outer contour / edge | `#501801` |
| Separation seam | `#501801` |
| Grain line | `#804015` |
| Side shadow | `#965622` |
| Side face | `#C5813B` |
| Top base | `#F0A242` |
| Top face | `#F4A847` |
| End grain | `#EEA847` |

Use final-canvas line weights: outer `4 px`, edge `3 px`, seam `4 px`, rings `1.5 px`, grain `1.25 px`.

## Texture and anti-artifact rules

- Transfer texture only from the canonical Unit Tile source.
- Keep texture crisp and continuous to each edge.
- Map dense canonical Unit Tile texture lanes onto large top faces; never add procedural top-face grain lines.
- Draw every internal piece boundary last as a crisp `3.5–4 px` `#501801` seam.
- Clean corner pixels with a hard mask and flat face color; never use fades or blends.
- Reject white halos, bright inner fringes, alpha wedges, semi-transparent corners, dirty corners, blur, bloom, ambient occlusion, gradients, cast shadows, black holes, extra objects, text, logos, and watermarks.
- Never repair a halo by recoloring pale pixels globally.

## Auto-fit

Given raw alpha bounds `L, T, R, B`, compute:

```text
usableW = 1536 × (1 - 2 × 0.07) - 2 × 8
usableH = 1024 × (1 - 2 × 0.07) - 2 × 8
scale   = min(2, usableW / (R - L), usableH / (B - T))
tx      = 1536 / 2 - scale × (L + R) / 2
ty      = 1024 / 2 - scale × (T + B) / 2
```

Apply the same transform to every face and seam in the stack.

## Workflow

1. Inspect the current mapping, source Unit Tile, manifests, and approved hashes.
2. Render new candidates outside active runtime paths.
3. Validate dimensions, alpha bounds, corner transparency, family ratios, counts, seams, deterministic SHA-256 output, and source hashes.
4. Build light, dark, and `320 px` QA sheets.
5. Present exact candidates for explicit visual approval.
6. Only after approval, copy candidates to runtime paths, update registries, lock hashes, and run tests/build/browser QA.

Do not activate a generated or edited asset based only on technical validation. Visual approval is required.
