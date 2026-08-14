---
name: dipistav-artwork
description: Create, edit, compose, map, validate, or approve DIPISTAV v11 product illustrations and homepage icons. Use for timber, pellets, firewood, bags, pallets, slabs, Unit Tiles, quantity bands, manifests, alpha-edge QA, runtime artwork registries, and Golden Master hash locks.
---

# DIPISTAV Artwork v11

Treat this file as the sole normative artwork specification. Treat files under
`docs/archive/legacy-artwork/` as history only. Never overwrite a hash-locked asset.

## Visual DNA

- Use a transparent `1536×1024` master, `4×` supersampling, one Lanczos downsample, and a `7%`
  safe inset with an `8 px` contour reserve.
- Use orthographic 3/4 axonometry at azimuth `40°`, elevation `27°`; cut ends point right/down.
- Preserve parallel edges, congruent repeated units, upper-left light, and physical support.
- Use `#501801` outer/visible edges at `4/3 px`, `#6B310B` contact seams at `3 px`, `#804015`
  rings/grain at `1.5/1.25 px`; render them at `16/12/12/6/5 px` at `4×`.
- Use `#F4A847` top, `#F0A242` honey base, `#EEA847` cut end, `#C5813B` side, and optional
  fully clipped `#965622` hard shade no wider than `1.5 px`.
- Use `Obrázek Codex 12. 8. 2026 19_45_37.png` as the visual reference and
  `artwork-sources/beams/beam-unit-tile-master-v1-4x.png` as the timber texture source.
- Preserve warm saturation, dense end grain, engraved longitudinal grain, and clean face color at
  every corner. Never introduce a second texture style.

Never use blur, multiply AO, gray ramps, gradients, group opacity, translucent interiors, baked
shadows, glows, white edge highlights, or differently tinted corners. Rebuild geometry, alpha, outer
contours, and junctions deterministically over opaque face-color bases. Keep any texture inside inset
face masks.

Reject `dirty gray edge bleed`, `blurred seams`, `gradient contact shadows`, `corner discoloration`,
`dirty corner shading`, `white edge halo`, `bright inner stroke fringe`, `alpha matting artifacts`,
`fused boards`, `missing separation seams`, `thin matchsticks`, and `elongated diagonal strips`.

## AI contract

Use the image-generation skill only for one Unit Tile, texture repair, approved print, or genuinely
non-repeating subject. Label inputs as edit target, style reference, or geometry guide. AI must not
choose quantity, topology, spacing, scale, seams, masks, layer order, or stack geometry.

Append this negative prompt verbatim:

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

Pellet bags are the only branding exception: preserve the approved tree artwork and `15 kg` from
`public/images/illustrations/configurator-v3/pelety-pytel-v3.webp`; allow no other words or logos.

## Rigid timber

| Family  | Front profile `height:width` | Runtime variants                                               |
| ------- | ---------------------------- | -------------------------------------------------------------- |
| Beams   | `1:1`                        | `beam`                                                         |
| Planks  | `1:2.3–2.5`                  | `plank`                                                        |
| Boards  | `1:4.5–5.0`                  | `board-sorted`, `board-unsorted-narrow`, `board-unsorted-wide` |
| Battens | `1:1.25–1.5`                 | `lath`                                                         |

- Compose stacks from one canonical Unit Tile through `scripts/artwork_v11.py` and the family entry
  points `compose_beam_stacks.py`, `compose_plank_stacks.py`, `compose_board_stacks.py`, and
  `compose_batten_stacks.py`.
- Use seven bands `1/2/3–4/5–8/9–11/12–15/16+`, counts `1/2/3/6/9/12/16`, and layouts
  `1×1`, `2×1`, centered `2+1`, `3×2`, `3×3`, `4×3`, `4×4`.
- Paint back-to-front and bottom-to-top. Keep all units congruent inside a scene. Permit only seeded
  inset texture-sampling offsets; never shift geometry or vary hue, saturation, brightness, or AO.
- Use isotropic `adaptive-bounds` fit independently per scene, capped at `2.0`.
- Use plank vectors `column=(280,-58)`, `rowDown=(0,119)`, `back=(-372,-183)`; projected profile
  is `1:2.403` and compact depth is `1.450×` projected width.
- Keep boards clean-edged and bark-free. Keep battens rectangular, never square beams or thin boards.

## Fuels architecture

Keep fuels v11 staged and unmapped until Unit Tiles and full QA grids receive explicit approval.
Share canvas, camera, palette, fit, alpha rules, painter order, and reject gates with timber.

Add fuel accents only from this palette: bark `#3D1E0B/#6B3A1F/#965622`, kraft/canvas
`#F6D28C/#E8B765/#C5813B`, construction ink `#6B310B`.

| Family              | Bands                   | Rendered representative                  |
| ------------------- | ----------------------- | ---------------------------------------- |
| Pellet bag          | `1/2/3–4/5–9/10–19/20+` | `1/2/4/7/15/20` bags                     |
| Ten-bag set         | `1/2/3–4/5+`            | `10/20/30/50` bags                       |
| Pellet pallet       | `1/2/3/4–5/6+`          | `1/2/3/4/6` pallets                      |
| Loose firewood      | `1/2/3–4/5–8/9+`        | `12/18/24/36/48` visible splits          |
| Big Bag             | `1/2/3–4/5–8/9+`        | `1/2/4/5/9` bags; 12 visible splits each |
| Palletized firewood | `1/2/3–4/5–8/9+`        | `1/2/4/6/9` pallets                      |
| Slab bundles        | `1/2/3–4/5+`            | `1/2/4/5` bundles                        |

- Build a pellet pallet from one canonical 15 kg bag, 40 rendered bags in eight five-bag layers,
  one unbranded pallet, and one wrap module. Record the commercial equivalent as 65 bags / 975 kg.
- Render wrap only as sparse warm contour/fold lines. Do not use a translucent fill or white glint.
- Use three firewood tiles: half-round split, quarter wedge, irregular triangular split. Put bark only
  on the outer rounded edge; reject round logs and peeled blocks.
- Share the 1.6 prm master between `firewood-pallet` and `pallet-16`. Parameterize 25 cm and 33 cm
  pallets by log length and cut-face density without CSS distortion.
- Build 2/3/4 m slab bundles from three irregular slab tiles, two straps, and length-specific geometry.
- Use a fully opaque warm canvas module for Big Bags and a separate unbranded pallet module.
- Derive future fuel homepage icons from loose 1 prm, one 15 kg bag, one 3 m bundle, and one
  33 cm / 1 prm pallet only after those masters are approved.

Every fuel manifest must record `representativeSellingUnits`, exact `renderedModuleCounts`, optional
`containedUnitEquivalent`, `compositionBasis` (`exact`, `aggregate-volume`, or `optical-density`),
camera, seed, painter order, Unit Tile hashes, canvas, alpha bounds, optical center, and fit data.

## Homepage icons

- Derive icons from approved family masters, never from a separate icon prompt.
- Timber representatives are beam `2+1`, plank `3×2`, board `3×2`, and lath `3×3`.
- Copy approved master bytes without re-encoding. Use transparent output without baked or CSS image
  shadow; card-level UI shadow is allowed.
- Inspect the complete row at `144 px`, `176 px`, and `320 px` on light and dark backgrounds.

## Promotion and validation

1. Record family, band, layout, counts, seams, source hashes, seed, camera, canvas, alpha/fit metadata,
   and approval state in a manifest.
2. Stage candidates outside runtime directories and validate with:

   ```powershell
   python scripts/validate_artwork.py <candidate.webp> --manifest <manifest.json> --safe-inset 0.07
   ```

3. Inspect alpha edges at 100% and 200%, light/dark backgrounds, 320 px, exact counts, support,
   palette, seams, cloned texture, corners, and halos.
4. Require explicit visual approval. Automated validation is preflight only.
5. After approval, copy only the exact transparent WebP into a versioned runtime directory. Verify
   its SHA-256 against the manifest, append its hash lock, activate the registry, and run application
   tests plus desktop/mobile browser QA.
6. Keep old approved assets byte-identical. Corrections always receive new versioned filenames.
