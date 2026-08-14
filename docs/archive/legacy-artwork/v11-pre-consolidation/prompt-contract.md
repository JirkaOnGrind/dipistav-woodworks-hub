# Prompt contract

## Edit template

```text
Use case: precise-object-edit
Asset type: DIPISTAV e-shop configurator product illustration
Input images: identify the edit target, style reference, and geometry guide explicitly.
Primary request: describe one structural change and the exact unit/seam count.
Style/medium: DIPISTAV hand-engraved comic illustration, spruce or the declared material, orthographic 3/4 axonometry, azimuth 40 degrees, elevation 27 degrees.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background without shadow, gradient, floor, texture, or reflection.
Constraints: change only the requested geometry; keep silhouette, camera, palette, line weight, material texture, margins, and unrelated regions unchanged.
Avoid: use the mandatory negative prompt below.
```

## Mandatory negative prompt

```text
no perspective drift, no perspective convergence, no depth-based scaling, no fisheye,
no cube distortion, no miniature units, no melted wood, no peeled texture,
no organic distortion, no blurry end grain, no malformed cut faces,
no detached bark, no fused boards, no missing separation seams,
no changing unit count, no floating items, no unsupported cantilever,
no repeated cloned grain, no repeated icon grid, no collage seams, no photorealism,
no environment, no floor, no baked shadow, no glow,
no dirty gray edge bleed, no blurred seams, no gradient contact shadows,
no corner discoloration, no dirty corner shading, no differently tinted corners,
no white edge halo, no bright inner stroke fringe, no alpha matting artifacts,
no thin matchsticks, no elongated diagonal strips,
no text, logo, people, tools or watermark
```

Pellet bags are the only branding exception: allow the approved tree mark and `15 kg` only.

## Geometry lock

- State the exact physical count at least twice.
- State the expected row/column arrangement and seam count.
- Require one canonical projected unit and translation-only placement of identical units.
- Require grain and shading to stop at every construction seam.
- During iteration, repeat every invariant and request only one change.

## Palette lock

Use the palette and Golden Masters in `ARTWORK_STYLEGUIDE.md`; do not improvise new anchors. Antialiasing and engraved texture may create intermediate colors, but dominant clusters must remain near the declared anchors.
