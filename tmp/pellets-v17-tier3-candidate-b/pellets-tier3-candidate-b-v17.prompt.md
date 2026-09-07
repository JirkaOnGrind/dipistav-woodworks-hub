# Pellet Tier 3 Candidate B v17 — production prompt record

## Reference roles

- Image 1: approved hash-locked Unit Tile; sole authority for bag anatomy, kraft texture, linework, palette, and lighting.
- Image 2: cropped three-bag spatial-layout reference only. Its captions, background, generated logos, and printing on front thickness faces are explicitly ignored.

## Built-in ImageGen blank-geometry prompt

Use case: product-mockup

Asset type: blank soft-bag geometry source for DIPISTAV Tier 3 Candidate B.

Primary request: generate exactly three authentic soft filled 15 kg kraft-paper sacks arranged as a compact interlocked 2+1 module. This output is blank geometry for deterministic branding later, so every surface must contain kraft paper only.

Physical anatomy requirements:

- Each prone sack must visibly be the same kind of real paper sack as the approved Unit Tile rotated into a lying position, not a mattress, cushion, rigid brick, box, slab, or flattened upright drawing.
- Preserve a recognizable folded/rolled closure seam at one short end of every bag, folded gusset anatomy, tapered or softly sloped shoulders near the closure, gently bulging center volume, irregular gravity-settled lower corners, paper creases, small compression wrinkles, and soft contact deformation.
- Keep the bags full and dimensional with curved paper tension between seams. Avoid perfectly straight rectangular sides and uniform foam-like thickness.

Exact spatial geometry:

- Bottom layer: exactly two equal prone bags side-by-side and parallel, long axes running into depth, touching softly at the central seam. Their broad PRINT_FACE planes are oriented upward toward the camera.
- Top layer: exactly one equal prone bridge bag spanning both supports, laterally centered and slightly rearward as in the supplied spatial reference so the front portions of both bottom upward faces remain visible. Its broad PRINT_FACE plane is oriented upward.
- The top bag must visibly compress the two lower bags at contact without intersecting them. No hidden fourth bag and no unsupported floating.

Scene/backdrop: genuinely transparent RGBA; isolated stack only; no floor, pallet, cast shadow, backdrop, or checkerboard pattern.

Style/medium: match the approved Unit Tile exactly—refined 2.5D matte catalog illustration, warm sand-gold kraft paper, crisp warm-brown contours, fine natural fibers and woodcut-like paper shading. Not photorealistic and not glossy CGI.

Composition/framing: centered compact low stack, orthographic isometry at 40-degree azimuth and 27-degree elevation, complete silhouette, generous transparent margins.

Lighting: identical restrained upper-left object lighting; no gradients, bloom, ambient-occlusion halo, or external shadow.

Surface restriction for this blank geometry source: all three broad upward panels, all front/bottom thickness faces, every side gusset, every rolled closure, seam, bottom edge, and rear surface must be completely blank kraft paper. ZERO logos, pinecones, pellets, branches, circles, lines, letters, numerals, pseudo-text, stamps, smudges, phantom graphics, or watermarks anywhere.

Constraints: exactly 3 bags; soft bag anatomy; two parallel bottom supports plus one centered bridge; identical bag dimensions; all three broad print planes facing upward; no extra objects.

Avoid: mattresses, cushions, boxes, rigid rectangular blocks, uniform slabs, sharp cuboids, flat tiled wall, upright bags, chaotic heap, missing closure seams, missing gussets, extra bags, logo, text, symbols, edge printing, side printing, glossy plastic, burlap, photorealism, low-poly render, floor, shadow, background, white halo, bright fringe, blur, bloom.

## Deterministic branding

The single decal bitmap extracted from the approved locked Unit Tile is reused for all three bags. Each instance is perspective-mapped to its centered broad-face quad and clipped by an independent PRINT_FACE visibility mask. Bottom decal portions hidden by the bridge are removed by the bridge occlusion mask. No decal layer is composited onto seams, gussets, front thickness, side thickness, closures, or bottom edges.

## Targeted geometry correction (source B2)

Use case: precise-object-edit.

- Image 1 is the blank soft-geometry source B and is the only edit target.
- Image 2 is the approved locked Unit Tile and remains the anatomy, material, palette, linework, and lighting authority.
- Image 3 is the three-bag spatial reference and is used for layout only; ignore all captions and all printing shown on thickness faces.

Move only the upper bridge bag moderately rearward in image space (up/back), keeping it centered across the two supports. Expose substantially more of both lower upward-facing broad panels so each can receive a clear centered print decal. Preserve the lower bags unchanged. Preserve the bridge bag's scale, longitudinal orientation, soft filled volume, rolled closure, gusset structure, folds, paper wrinkles, contact compression, and upper-left lighting. Keep exactly three bags and keep every surface blank kraft paper. Do not add any emblem, letters, numerals, pseudo-text, stains, edge graphics, floor, cast shadow, pallet, background, or extra object. Return a genuinely isolated transparent-background asset.
