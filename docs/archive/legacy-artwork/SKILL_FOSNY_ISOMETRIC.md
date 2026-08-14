# Skill Specification: DIPISTAV Isometric Fošny

## Purpose

Generate deterministic SVG or Canvas illustrations of stacked flat wooden planks (`fošny`). A stack is assembled from congruent plank units; it is never generated as one fused image. Every unit must remain visibly flat and wide.

## 1. Design Tokens

| Token | Role | Exact value |
| --- | --- | --- |
| `wood.top.highlight` | Upper-face highlight | `#F4A847` |
| `wood.top.base` | Upper-face warm base | `#F0A242` |
| `wood.right.base` | Long right/side face | `#C5813B` |
| `wood.right.shadow` | Long-face shadow | `#965622` |
| `wood.front.endGrain` | Front end-grain face | `#EEA847` |
| `wood.border` | Exterior contour | `#501801` |
| `wood.seam` | Construction seam | `#6B310B` |
| `wood.endGrain.rings` | End-grain rings and fine grain | `#804015` |

Use fully opaque surface fills. Transparency is allowed only outside the product silhouette. Do not bake a floor shadow into the artwork.

## 2. Geometric Ratios

Let the plank width be the canonical unit `W`:

```text
Plank width:  W
Plank height: H = W / 3.5
Plank length: L = W × 4
```

The master implementation uses `W = 42`, `H = 12`, and `L = 168` model units. All units in all quantity bands use these exact dimensions. Translation and occlusion may change; scale and cross-section may not.

Reject any result whose front end-grain face approaches a square. The physical end-face ratio must remain exactly `W / H = 3.5`.

## 3. Isometric Projection Math

Use a right-handed model grid `(X, Y, Z)` where:

- `X` runs across the plank width at a canvas angle of `30°`;
- `Y` is vertical and positive upward;
- `Z` runs along the plank length toward the back at a canvas angle of `150°`.

For scale `s` and canvas origin `(oₓ, oᵧ)`, map a 3D point to SVG/Canvas coordinates as:

```text
x = oₓ + s × (X × cos 30° + Z × cos 150°)
y = oᵧ + s × (X × sin 30° − Z × sin 150° − Y)
```

Using exact angle identities:

```text
cos 30°  =  √3 / 2
sin 30°  =  1 / 2
cos 150° = −√3 / 2
sin 150° =  1 / 2
```

Therefore:

```text
x = oₓ + s × (√3 / 2) × (X − Z)
y = oᵧ + s × (0.5 × X − 0.5 × Z − Y)
```

This is an orthographic affine projection: parallel edges stay parallel and distant planks never shrink.

## 4. Grid Layouts

| Quantity | Layout | Unit origins `(X, Y, Z)` |
| ---: | --- | --- |
| 1 | `1x1` | `(0, 0, 0)` |
| 2 | `2x1` | `X = 0, W`; `Y = 0` |
| 3 | `2+1-centered` | lower: `X = 0, W`; upper: `X = W/2`, `Y = H` |
| 6 | `3x2` | `X = 0…2W`; `Y = 0…H` |
| 9 | `3x3` | `X = 0…2W`; `Y = 0…2H` |
| 12 | `4x3` | `X = 0…3W`; `Y = 0…2H` |
| 16 | `4x4` | `X = 0…3W`; `Y = 0…3H` |

All units extend from `Z = 0` to `Z = L`.

## 5. Layering and Sorting Rules

1. Build one render record per physical plank. Never merge the grid into one polygon.
2. Sort units back-to-front and bottom-to-top. For the layouts above, use the stable tuple `(layerY ascending, columnX ascending, sourceIndex ascending)`.
3. Draw lower layers first. A supported upper plank is always drawn after both supporting lower planks, so its opaque faces cover hidden lower outlines.
4. Within one plank, draw faces in this order:
   1. long right/side face;
   2. top face;
   3. front end-grain face.
5. Draw each face as `opaque fill → clipped grain → its own outline`. Do not draw a late global outline pass across the complete stack; it can place hidden lower edges over upper units.
6. Keep SVG groups isolated per unit. Do not use group opacity, multiplied alpha, semi-transparent masks, or inherited `opacity` values.
7. For `2+1-centered`, render both lower units first and the centered upper unit last. The upper unit must have `fill-opacity: 1` and an effective alpha of `255` over every face interior.

## 6. Texture Rules

- Add restrained longitudinal grain to the top and long side faces, clipped to their polygons.
- Add 3–5 nested, flattened rings to each front face. Rings follow the `3.5:1` face proportion and never escape its clipping path.
- Seed texture offsets from the stack count and unit index. Texture may vary; geometry, scale, mask, and line weight may not.
- Use `1–1.5 px` dark-brown outlines and finer `0.55–0.8 px` grain lines at the master SVG viewBox scale.

## 7. Acceptance Gate

- Exactly `1, 2, 3, 6, 9, 12, 16` physical units are present in the seven required scenes.
- Every unit has `W:H:L = 42:12:168` or an exactly proportional equivalent.
- All faces are fully opaque; only the canvas background is transparent.
- The `3 ks` scene is stable, centered, and contains no lower outline visible through the upper plank.
- Parallel edges remain parallel and unit scale is identical across all scenes.
- Labels exactly match the requested Czech reference strings.

