# Pellet logo Phase 1 — Candidate A v18

## Reference authority

- The approved hash-locked Unit Tile is the sole authority for the emblem composition, pinecone anatomy, pine sprigs, wooden-pellet arrangement, double oval, typography, and spacing.
- The supplied master grid is layout reference for Phase 2 only. Its captions, backgrounds, generated logo variants, and printed side faces are ignored for Phase 1.

## Initial generation prompt

Use case: `logo-brand`.

Create one clean, flat, front-facing version of the exact printed emblem from the locked Unit Tile: a detailed central pinecone, pine-needle sprigs, the same wooden pellets, enclosed by the same double oval border, with the exact typography `15 kg` centered below between the same two horizontal rules. Use crisp vintage woodcut engraving linework. The background must be genuinely transparent. Do not reproduce the bag, kraft paper, texture, perspective, 3D lighting, shadows, gradients, watermark, extra text, or pseudo-text.

## Targeted correction prompt

Use case: `precise-object-edit`.

Remove the entire vignette, glow, colored field, highlight fills, shading, and texture. Retain only clean deep warm-brown linework and engraved hatch strokes on genuine transparency. Restore the complete double oval and render `15 kg` exactly once, clearly and opaquely, between two horizontal rules. Preserve one pinecone, two pine sprigs, exactly five wooden pellets, the double oval, and the centered text/rules layout. Keep the artwork flat, front-facing, sharp, centered, and isolated.

## Deterministic post-processing

The generated checker preview is converted into actual alpha with deterministic neutral-checker extraction. Every visible RGB pixel is normalized to the single ink color `#6B310B`. The isolated mark is rendered at 4× and downsampled once to the `1536 × 1024` transparent production canvas.
