# Phase 2 blank geometry — State 1 Candidate A v18

## Reference roles

- The approved hash-locked Unit Tile is the edit target and sole authority for bag geometry, silhouette, kraft texture, folds, closure seam, gusset anatomy, contour treatment, camera, scale, and lighting.
- The approved Phase 1 logo is a locked exclusion reference: none of its pixels or content may appear in Phase 2.
- The supplied master grid is spatial-layout reference only. Its captions, backgrounds, generated branding, and printed side faces are ignored.

## Built-in ImageGen edit prompt

Use case: `precise-object-edit`.

Remove only the entire printed emblem and `15 kg` lockup from the broad front face of the approved upright bag. Reconstruct the removed area seamlessly as blank warm kraft paper using the surrounding fibers, wrinkles, tonal variation, and paper tension. Preserve the exact upright silhouette, folded top closure, stitched seam, edge seams, right gusset, bottom folds, corner volume, warm-brown contour lines, 2.5D matte illustration style, orthographic camera, upper-left lighting, centered framing, and transparent isolation. Every surface must be blank kraft paper. No branding, logo, emblem, pinecone, pellets, letters, numerals, symbols, pseudo-text, stamps, smudges, watermark, floor, cast shadow, or backdrop.

## Deterministic scale normalization

The generated neutral checker preview is converted into real alpha. The isolated bag is normalized at 4× and downsampled once to the approved Unit Tile alpha footprint: exactly `520 × 863 px` at bounds `(508, 80)–(1028, 943)` on a `1536 × 1024` transparent canvas. This footprint establishes the 100% scale anchor for all Phase 2 states; later canvases may expand, but individual bags may not shrink.

Candidate B removes only neutral bright semi-transparent checker remnants detected by the alpha validator. No opaque or warm-colored bag pixels are altered.
