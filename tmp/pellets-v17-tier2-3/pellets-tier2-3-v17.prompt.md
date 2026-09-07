# Pellet Tiers 2–3 v17 — production prompt record

## Tier 2

No generative prompt is used. The scene is deterministically composed from two byte-identical copies of the approved and hash-locked Unit Tile `artwork-sources/pellets/pellets-bag-unit-tile-master-v17.png`.

Geometry: two upright parallel bags, identical transform, aligned vertically, 24 px final-canvas gap, 52% target alpha width. Both locked front print faces remain visible. No generated or repainted pixels are introduced inside either unit.

## Tier 3 built-in ImageGen blank-geometry prompt

Use case: product-mockup

Asset type: blank geometry source for the definitive DIPISTAV Tier 3 pellet-bag Unit Tile module.

Input images: Image 1 is the APPROVED LOCKED BASE and the sole reference for bag anatomy, kraft-paper material, fold language, linework, palette, edge treatment, and upper-left lighting. Do not copy its emblem or text into this geometry source.

Primary request: create exactly three physically plausible 15 kg kraft-paper bags arranged as one strict interlocked module. All three bags are laid fully prone as real filled sacks, with gravity-compressed thickness, rounded stuffed corners, a visible folded closure/end anatomy, and believable contact compression. They must not look like upright bags flattened in 2D.

Exact geometry:

- Bottom layer: exactly two identical prone bags, parallel to one another, touching along a clean central longitudinal seam, equal scale and equal orientation. Their broad visible upper surfaces are the completely blank rear panels because the printed faces are turned downward.
- Top layer: exactly one prone bridge bag, physically yaw-rotated 90 degrees relative to the bottom pair, centered precisely over their shared seam, supported equally by both bottom bags. Its broad upward-facing panel must be large, clean, unobstructed, and completely blank for later deterministic decal placement.
- The result must visibly read as 2 bottom + 1 top, with crisp separations and no hidden fourth bag.

Scene/backdrop: genuinely transparent RGBA background, isolated stack only, no floor, no pallet, no cast shadow.

Style/medium: match Image 1 exactly—warm matte sand-gold kraft paper, fine natural fibers, restrained wrinkles, crisp warm-brown contours, clean 2.5D catalog illustration, not photorealistic and not glossy 3D.

Composition/framing: centered compact low stack; orthographic isometry, 40-degree azimuth and 27-degree elevation; generous transparent margins; complete silhouette, no crop.

Lighting/mood: identical restrained upper-left object lighting as Image 1; no gradients, bloom, ambient-occlusion halo, or cast shadow.

Surface masking restriction: every visible surface in this geometry source must be completely blank kraft paper. Absolutely no emblem, pinecone, pellets, branches, circles, letters, numerals, rules, labels, pseudo-text, stamps, printing, or phantom marks on any bag. Side gussets, folded closures, seams, bottoms, and edges must also remain blank.

Constraints: exactly three bags; exact 2+1 cross-bond; top bag rotated a physical 90 degrees; identical bag dimensions; no scale variation; no floating; no unsupported overhang; no intersections; no random tilt; no extra objects.

Avoid: chaotic heap, organic pile, upright bag, flattened upright silhouette, hidden fourth bag, duplicate bag fragments, logos, text, symbols, watermarks, printing of any kind, trees, pinecones, pellets, white background, checkerboard pattern, floor, pallet, cast shadow, glossy plastic, burlap, photorealism, low-poly styling, black holes, white halos, bright fringes, blur, bloom.

## Deterministic Tier 3 branding step

The approved emblem and exact `15 kg` typography are extracted from the hash-locked Unit Tile. The resulting decal is perspective-mapped to the bridge-bag PRINT_FACE polygon and hard-clipped to that polygon. The two supporting bags receive no decal layer.
