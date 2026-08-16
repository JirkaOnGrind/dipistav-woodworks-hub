import type { GeneratedArtworkMetadata } from "@/lib/product-artwork-v9-metadata";

export type V11ArtworkMetadata = GeneratedArtworkMetadata & { outputSha256: string };

function metadata(
  alphaCoverage: number,
  alphaBounds: GeneratedArtworkMetadata["alphaBounds"],
  outputSha256: string,
): V11ArtworkMetadata {
  return {
    canvas: { width: 1536, height: 1024 },
    alphaBounds,
    opticalCenter: { x: 0.5, y: 0.5 },
    alphaCoverage,
    outputSha256,
  };
}

export const V11_ARTWORK_METADATA: Record<string, V11ArtworkMetadata> = {
  "beam-1-master-v11": metadata(
    0.327176,
    { x: 0.072266, y: 0.098633, width: 0.855469, height: 0.802734 },
    "c4739683a10e049045804348f8ace7a1710128b54e776eb1a1bb7cd082d3e361",
  ),
  "beam-2-master-v11": metadata(
    0.341604,
    { x: 0.072266, y: 0.142578, width: 0.855469, height: 0.714844 },
    "fb5886f02c1494fa1f3684a52494b110b800913f1137462a8b154822f143cb28",
  ),
  "beam-3-4-master-v11": metadata(
    0.40467,
    { x: 0.092448, y: 0.074219, width: 0.815104, height: 0.851562 },
    "ef4a75847498ae910bdf02268dffaa591a9ee48fd6340e534e0fdbd461f36818",
  ),
  "beam-5-8-master-v11": metadata(
    0.48255,
    { x: 0.072266, y: 0.086914, width: 0.855469, height: 0.826172 },
    "03db6c61463ba85787fc811c30f40207da8950a2dba6057d8d3c0fb7922f250f",
  ),
  "beam-9-11-master-v11": metadata(
    0.459149,
    { x: 0.134766, y: 0.074219, width: 0.730469, height: 0.851562 },
    "f3c6bf9081943130fbbf895f2046909516bdf9bae4783ce0327c1e42eca76e89",
  ),
  "beam-12-15-master-v11": metadata(
    0.510539,
    { x: 0.098958, y: 0.074219, width: 0.802083, height: 0.851562 },
    "638df3b51cbb6304d9b070a6df08ef4c4dd506193c68752cec5ba632219dd208",
  ),
  "beam-16plus-master-v11": metadata(
    0.458922,
    { x: 0.155599, y: 0.074219, width: 0.688802, height: 0.851562 },
    "16a781cc378b15e6076990245feda746a31a45929b36b11bff7c464d05928dbc",
  ),
  "plank-1-master-v11": metadata(
    0.386368,
    { x: 0.074219, y: 0.146484, width: 0.851562, height: 0.707031 },
    "2308911ae8788f676c0b2c5c949d36b6e35670044e057d4d0216f7e2ce244ae3",
  ),
  "plank-2-master-v11": metadata(
    0.323453,
    { x: 0.073568, y: 0.211914, width: 0.852865, height: 0.576172 },
    "f5f6930358322113ab7f00528c1dc82d1c4cb67b2b52304a2c69c6f54a62e12a",
  ),
  "plank-3-4-master-v11": metadata(
    0.383638,
    { x: 0.073568, y: 0.150391, width: 0.852865, height: 0.699219 },
    "81a58f1c002b1f863af30989d846725a8d091082264684f59dbb67a1eb5a3b6f",
  ),
  "plank-5-8-master-v11": metadata(
    0.377684,
    { x: 0.073568, y: 0.185547, width: 0.852865, height: 0.628906 },
    "94f89b8e450c92f6e04750885ce9f0f69264d4f9ee8355c0ea163d339409c6a8",
  ),
  "plank-9-11-master-v11": metadata(
    0.484341,
    { x: 0.073568, y: 0.123047, width: 0.852865, height: 0.753906 },
    "b62110e3b48fa4f9ca3891b4a8f963744f74c3bae24a09a4e7a1071c37af1e70",
  ),
  "plank-12-15-master-v11": metadata(
    0.404932,
    { x: 0.073568, y: 0.167969, width: 0.852865, height: 0.664062 },
    "5e5b06c7b5cae02cb216640df050763be929e5dd573f0c455b5b5c4b2ccdb981",
  ),
  "plank-16plus-master-v11": metadata(
    0.491551,
    { x: 0.073568, y: 0.117188, width: 0.852865, height: 0.765625 },
    "ac80779836630b3e94279fb4ec8d87525ed210b7389f64a5ebeab452287c19d2",
  ),
  "board-1-master-v11": metadata(
    0.229557,
    { x: 0.104818, y: 0.222656, width: 0.790365, height: 0.554688 },
    "a6e9afcc94e765cf836fb4d48efd8ddc292a036f4fda96ac2ac7cd375b9a95f3",
  ),
  "board-2-master-v11": metadata(
    0.25443,
    { x: 0.073568, y: 0.245117, width: 0.852865, height: 0.509766 },
    "43e2a85452e18429e01e90feabaeb2562095247bb97e9e81e3bc426ce754b33f",
  ),
  "board-3-4-master-v11": metadata(
    0.27411,
    { x: 0.073568, y: 0.226562, width: 0.852865, height: 0.546875 },
    "bc0b24fa8a96fe6972bd2a6f456b804d9a42858942de9e9a70e16cda9d845a1e",
  ),
  "board-5-8-master-v11": metadata(
    0.276947,
    { x: 0.073568, y: 0.242188, width: 0.852865, height: 0.515625 },
    "48b488e1c603561a7c17bc9f115744c9efd631a118cd43dd1eb03b609b7e6c22",
  ),
  "board-9-11-master-v11": metadata(
    0.326501,
    { x: 0.073568, y: 0.212891, width: 0.852865, height: 0.574219 },
    "ca2a44d24b35ee500fdff51876cf14981e1c33349529bd25aac0742bb55b85f2",
  ),
  "board-12-15-master-v11": metadata(
    0.283923,
    { x: 0.073568, y: 0.239258, width: 0.852865, height: 0.521484 },
    "546b1fe62f866d496e3d05299a6d8c5a189403ff4514f5857da63aa8923e4aed",
  ),
  "board-16plus-master-v11": metadata(
    0.324737,
    { x: 0.073568, y: 0.21582, width: 0.852865, height: 0.568359 },
    "e2a8e0fcaf6352ecbc84b7ee82c8cd84e55ce61bc9b9cd546d5e8649c88676fa",
  ),
  "lath-1-master-v11": metadata(
    0.160643,
    { x: 0.160156, y: 0.208008, width: 0.679688, height: 0.583984 },
    "561e89b5c4f2d8250cfd0ea9f9fe1326615c4f191616300ad59b83186fd6b624",
  ),
  "lath-2-master-v11": metadata(
    0.245491,
    { x: 0.101562, y: 0.189453, width: 0.796875, height: 0.621094 },
    "c853fca4b29a7fb63372901facdf7d31abfa780d16f44b4e9a51ab6f86cf1ef0",
  ),
  "lath-3-4-master-v11": metadata(
    0.301635,
    { x: 0.101562, y: 0.133789, width: 0.796875, height: 0.733398 },
    "14454aede3fef8cbb5c429f1caa3e671a89aedc9323dd6cf0b595efef491bb17",
  ),
  "lath-5-8-master-v11": metadata(
    0.391301,
    { x: 0.073568, y: 0.132812, width: 0.852865, height: 0.735352 },
    "0aa625ffd9c54c60a89b3291daf942a483792d70e490fd77f949120504935b1e",
  ),
  "lath-9-11-master-v11": metadata(
    0.484786,
    { x: 0.078125, y: 0.076172, width: 0.84375, height: 0.847656 },
    "d257aa1e7afcd6aea33ac47a338bb055e49775ad49c71c2c43d92c8a4d7c5332",
  ),
  "lath-12-15-master-v11": metadata(
    0.468335,
    { x: 0.073568, y: 0.104492, width: 0.852865, height: 0.791016 },
    "833434100329b47120603f832607292130c8af3be60f23d7b2b49e296824adb4",
  ),
  "lath-16plus-master-v11": metadata(
    0.498832,
    { x: 0.097656, y: 0.076172, width: 0.804688, height: 0.847656 },
    "75cbbfb627435549e7613efb80b8ec679efc343e118b079d079484637b6f6e1f",
  ),
};
