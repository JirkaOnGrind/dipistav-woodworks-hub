# Phase 2 blank geometry — Tier 3 Candidate C v18

## Correction objective

Candidate B was rejected because its prone bags appeared deflated and their alpha silhouettes overlapped. Candidate C corrects both failures independently: heavy 15 kg mass is rebuilt in the prone Unit Tile, and row placement is determined by collision testing with an enforced micro-gap.

## Built-in ImageGen anatomy edit

Use case: `precise-object-edit`.

Image 1 is the prone edit target and controls orientation, camera, and projected broad-face dimensions. Image 2 is the approved upright Unit Tile and controls filled mass, kraft thickness, gusset depth, bottom construction, texture, folds, linework, and lighting. Image 3 is a supporting depth reference only.

Increase only physical filled volume so the sack reads as a completely full, heavy 15 kg pellet bag: strongly convex but naturally settled load surface, substantial side-gusset depth, thick folded bottom closure, substantial rear rolled closure, paper tension, compression creases, rounded filled shoulders, and gravity-settled corners. Preserve the locked orthographic camera, projected length/width, 1:1 scale, blank kraft surfaces, and transparency. No branding, text, symbols, shadow, background, or extra object.

## Scale normalization and separation

The heavy source is uniformly normalized to the previously established `1060 px` prone projected width, producing a `1060 × 836 px` unit whose additional height represents restored physical depth. This unit is then locked for composition.

Three byte-identical unit copies are placed along the original isometric row direction. A deterministic alpha-collision search increases the row vector until both conditions pass:

- zero overlapping alpha pixels between adjacent bags;
- zero overlap after each silhouette is expanded by 4 px, guaranteeing a visible minimum 8 px micro-gap.

The canvas expands to preserve 100% instance scale. No Tier 3 instance is resized or zoomed out.
