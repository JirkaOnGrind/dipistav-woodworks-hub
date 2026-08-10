# DIPISTAV illustration system

This guide defines the product-illustration language used across the DIPISTAV shop. Client photographs are private production references only; they are not published or committed.

## Visual signature

- Three-quarter isometric view with the cut ends generally facing the lower-right corner.
- Dark chocolate-brown contour and engraving lines; honey and amber fills for the wood.
- Controlled cross-hatching on shaded planes, bark and gaps. Keep broad faces calmer so the product remains readable on a mobile card.
- Growth rings are visible on important cut ends, but never so dense that they become visual noise.
- One clear silhouette, centered with generous breathing room. No environment, people, tools, text, logo, watermark or baked shadow.
- Final delivery is a square transparent WebP for category illustrations. Beam quantity variants use a transparent 1820:1024 canvas.

## Product truth

- **Trámy:** square structural beams; clean parallel stack and clearly square ends.
- **Fošny:** eight thick, broad boards in four orderly layers.
- **Prkna:** thinner boards in a regular drying stack with narrow spacers.
- **Střešní latě:** identical rectangular battens aligned in parallel rows; never scattered.
- **Štípané dřevo:** loose compact mound of believable wedge and half-round split logs, with some bark.
- **Pelety:** preserve the approved compact engraved pellet mound as the style anchor.
- **Krajinky:** a long strapped bale of irregular bark-edged sawmill slab offcuts; never a neat crate of uniform sticks.
- **Dříví na paletách:** split logs packed into an open slatted wooden frame on a pallet.

## Dynamic composition

- Quantity is represented symbolically as one to five selling units: 1, 2, 3–4, 5–8 and 9+ pieces. The exact ordered quantity remains visible in the UI.
- Length changes the horizontal extent by at most ±10%; profile or package changes overall scale by at most ±8%.
- Transitions use a short spring-like rearrangement without layout shifts. The CSS stage owns all shadows so assets remain reusable.
- Beam previews use six stable quantity thresholds: 1, 2, 3–4, 5–10, 11–15 and 16+. The 5–10 range deliberately keeps one topology so the illustration never switches while still showing the same six-beam bundle.

## Prompt template

Use the client photograph as the product-truth reference, the current DIPISTAV asset as a composition reference and the approved pellet/beam artwork as the style reference.

> DIPISTAV comic-engraving product illustration of [exact product and count/arrangement], three-quarter isometric view, dark chocolate-brown contour, honey-amber spruce, visible end grain and controlled cross-hatching, simple mobile-readable silhouette, isolated on flat chroma green #00ff00, no ground plane, shadow, gradient, text, logo, watermark, people or tools.

Generate in `stylized-concept` mode, remove the chroma background with a soft alpha matte and despill, then export as versioned WebP. Never overwrite or delete the previous production asset.

## Golden-master approval gate

Do not expand a new illustration pass across the catalog until both composition families are approved:

1. `golden-masters/beam-bundle-6-seams-master-v2.webp` locks the technical timber topology. It shows exactly six complete beams in a 3 × 2 bundle, six readable end faces and continuous separation seams on every visible plane.
2. `golden-masters/bigbag-pile-9-master-v1.webp` locks the organic high-quantity language. It must show exactly nine complete firewood bags as one stable 4–3–2 pile, with readable mass and depth rather than a repeated icon grid.

For all follow-up variants, preserve the approved camera, contour weight, honey/cream palette, transparent padding and product scale. Only change the product-specific geometry and the symbolic quantity composition. Reject any fused surfaces, partial pieces, duplicated handles, disappearing seams, mechanically repeated grids or smaller-looking 16+ state.
