# Phase 2 blank geometry — Tier 3 Candidate A v18

## Reference roles

- The approved blank upright Unit Tile is the authority for physical bag dimensions, kraft material, paper fibers, wrinkles, seams, closure anatomy, linework, camera, scale, and lighting.
- The supplied master grid is pose/layout reference only. Captions, backgrounds, quantities outside Tier 3, logos, text, and printed thickness faces are ignored.
- The approved Phase 1 logo is an exclusion reference and is never composited.

## Initial prone Unit Tile generation

Use case: `product-mockup`.

Render exactly one instance of the approved blank sack naturally rotated into a completely prone position with its broad blank panel facing upward. Preserve its physical dimensions and locked orthographic camera. Keep the rear folded closure, blank near bottom thickness, side gussets, filled center, paper tension, compression wrinkles, gravity-settled corners, warm kraft texture, upper-left lighting, and transparent isolation. No branding, text, symbols, pseudo-text, extra objects, floor, shadow, or backdrop.

## Anatomy correction

Use case: `precise-object-edit`.

Soften only the physical anatomy: gently bow the long sidewalls, make the near bottom edge slightly irregular, add tapered filled-paper corners, shallow contact compression, and restrained wrinkles where the broad panel meets the gussets. Preserve the orientation, footprint, scale, camera, closure, blank surfaces, material, lighting, and a sufficiently planar center for neat stacking.

## Deterministic Tier 3 composition

The neutral checker preview is converted into real alpha and bright neutral fringe pixels are removed. The resulting `1060 × 770 px` prone Unit Tile is not rescaled. Three byte-identical copies are placed side-by-side along the locked projected row vector `(520, 170)` on an expanded `2560 × 1536` transparent canvas. Every instance remains at 100% scale with no zoom-out or resampling.

Candidate B removes only low-chroma neutral contact-shadow and checker-fringe pixels outside the warm kraft palette. No warm bag pixels, geometry, placement, or scale values are changed.
