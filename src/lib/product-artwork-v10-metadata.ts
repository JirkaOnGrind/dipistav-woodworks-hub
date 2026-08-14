import type { GeneratedArtworkMetadata } from "@/lib/product-artwork-v9-metadata";

const LANDSCAPE = { width: 1536, height: 1024 } as const;
const SQUARE = { width: 1254, height: 1254 } as const;

type Bounds = GeneratedArtworkMetadata["alphaBounds"];

function metadata(
  alphaCoverage: number,
  alphaBounds: Bounds,
  canvas: GeneratedArtworkMetadata["canvas"] = LANDSCAPE,
): GeneratedArtworkMetadata {
  return {
    canvas,
    alphaBounds,
    opticalCenter: {
      x: alphaBounds.x + alphaBounds.width / 2,
      y: alphaBounds.y + alphaBounds.height / 2,
    },
    alphaCoverage,
  };
}

export const V10_ARTWORK_METADATA: Record<string, GeneratedArtworkMetadata> = {
  "beam-1-composed-master-v10": metadata(0.08948, {
    x: 0.276042,
    y: 0.290039,
    width: 0.447917,
    height: 0.419922,
  }),
  "beam-2-composed-master-v10": metadata(0.132839, {
    x: 0.233073,
    y: 0.276367,
    width: 0.533854,
    height: 0.447266,
  }),
  "beam-3-4-composed-master-v11": metadata(0.173257, {
    x: 0.233073,
    y: 0.220703,
    width: 0.533854,
    height: 0.558594,
  }),
  "beam-5-8-composed-master-v10": metadata(0.253314, {
    x: 0.190104,
    y: 0.201172,
    width: 0.619792,
    height: 0.597656,
  }),
  "beam-9-11-composed-master-v10": metadata(0.330324, {
    x: 0.190104,
    y: 0.138672,
    width: 0.619792,
    height: 0.722656,
  }),
  "beam-12-15-composed-master-v10": metadata(0.395575, {
    x: 0.146484,
    y: 0.125,
    width: 0.707031,
    height: 0.75,
  }),
  "beam-16plus-composed-master-v10": metadata(0.483444, {
    x: 0.146484,
    y: 0.0625,
    width: 0.707031,
    height: 0.875,
  }),
  "board-sorted-3-4-master-v10": metadata(0.350245, {
    x: 0.083333,
    y: 0.06543,
    width: 0.832682,
    height: 0.869141,
  }),
  "board-unsorted-narrow-1-master-v10": metadata(0.324625, {
    x: 0.065755,
    y: 0.111328,
    width: 0.86849,
    height: 0.776367,
  }),
  "board-unsorted-narrow-2-master-v10": metadata(0.334648, {
    x: 0.065755,
    y: 0.084961,
    width: 0.86849,
    height: 0.830078,
  }),
  "board-unsorted-narrow-3-4-master-v10": metadata(0.369269, {
    x: 0.094401,
    y: 0.06543,
    width: 0.811849,
    height: 0.869141,
  }),
  "board-unsorted-narrow-5-9-master-v10": metadata(0.453571, {
    x: 0.065755,
    y: 0.06543,
    width: 0.86849,
    height: 0.867188,
  }),
  "board-unsorted-narrow-10-14-master-v10": metadata(0.429721, {
    x: 0.065104,
    y: 0.116211,
    width: 0.869792,
    height: 0.766602,
  }),
  "board-unsorted-narrow-15plus-master-v10": metadata(0.422777, {
    x: 0.065755,
    y: 0.148438,
    width: 0.869141,
    height: 0.702148,
  }),
  "board-unsorted-wide-1-master-v10": metadata(0.357117, {
    x: 0.065755,
    y: 0.111328,
    width: 0.869141,
    height: 0.776367,
  }),
  "board-unsorted-wide-2-master-v10": metadata(0.420707, {
    x: 0.065755,
    y: 0.072266,
    width: 0.86849,
    height: 0.855469,
  }),
  "board-unsorted-wide-3-4-master-v10": metadata(0.393255, {
    x: 0.111979,
    y: 0.06543,
    width: 0.775391,
    height: 0.869141,
  }),
  "board-unsorted-wide-5-9-master-v10": metadata(0.459033, {
    x: 0.065755,
    y: 0.087891,
    width: 0.86849,
    height: 0.823242,
  }),
  "board-unsorted-wide-10-14-master-v10": metadata(0.427599, {
    x: 0.065755,
    y: 0.131836,
    width: 0.86849,
    height: 0.735352,
  }),
  "board-unsorted-wide-15plus-master-v10": metadata(0.414632, {
    x: 0.065104,
    y: 0.179688,
    width: 0.869141,
    height: 0.641602,
  }),
  "firewood-loose-9plus-master-v10": metadata(0.547214, {
    x: 0.09375,
    y: 0.035156,
    width: 0.808594,
    height: 0.930664,
  }),
  "firewood-pallet-1-master-v10": metadata(
    0.527258,
    {
      x: 0.113238,
      y: 0.066188,
      width: 0.773525,
      height: 0.868421,
    },
    SQUARE,
  ),
  "firewood-pallet-2-master-v10": metadata(
    0.333063,
    {
      x: 0.066188,
      y: 0.239234,
      width: 0.868421,
      height: 0.520734,
    },
    SQUARE,
  ),
  "firewood-pallet-3-4-master-v10": metadata(
    0.575641,
    {
      x: 0.065391,
      y: 0.088517,
      width: 0.869219,
      height: 0.822967,
    },
    SQUARE,
  ),
  "firewood-pallet-5-8-master-v10": metadata(
    0.495181,
    {
      x: 0.065391,
      y: 0.166667,
      width: 0.869219,
      height: 0.666667,
    },
    SQUARE,
  ),
  "firewood-pallet-9plus-master-v10": metadata(
    0.540545,
    {
      x: 0.066188,
      y: 0.140351,
      width: 0.868421,
      height: 0.719298,
    },
    SQUARE,
  ),
  "lath-1-master-v10": metadata(0.258465, {
    x: 0.065755,
    y: 0.088867,
    width: 0.86849,
    height: 0.822266,
  }),
  "lath-2-master-v10": metadata(0.296913, {
    x: 0.164062,
    y: 0.066406,
    width: 0.671875,
    height: 0.867188,
  }),
  "lath-3-4-master-v10": metadata(0.275606, {
    x: 0.209635,
    y: 0.06543,
    width: 0.580729,
    height: 0.868164,
  }),
  "lath-5-9-master-v10": metadata(0.38065, {
    x: 0.105469,
    y: 0.06543,
    width: 0.789062,
    height: 0.868164,
  }),
  "lath-10-14-master-v10": metadata(0.374887, {
    x: 0.182943,
    y: 0.066406,
    width: 0.633464,
    height: 0.867188,
  }),
  "lath-15plus-master-v10": metadata(0.433428, {
    x: 0.110026,
    y: 0.066406,
    width: 0.780599,
    height: 0.868164,
  }),
  "pallet-16-9plus-master-v10": metadata(
    0.607757,
    {
      x: 0.065391,
      y: 0.093301,
      width: 0.868421,
      height: 0.8126,
    },
    SQUARE,
  ),
  "pallet-25-9plus-master-v10": metadata(
    0.585948,
    {
      x: 0.065391,
      y: 0.070175,
      width: 0.868421,
      height: 0.858852,
    },
    SQUARE,
  ),
  "pallet-33-9plus-master-v10": metadata(
    0.578324,
    {
      x: 0.066188,
      y: 0.110845,
      width: 0.867624,
      height: 0.777512,
    },
    SQUARE,
  ),
  "pellets-bag-20plus-master-v10": metadata(0.620774, {
    x: 0.065104,
    y: 0.12207,
    width: 0.869792,
    height: 0.755859,
  }),
  "pellets-pallet-4-5-master-v10": metadata(
    0.444585,
    {
      x: 0.065391,
      y: 0.130781,
      width: 0.868421,
      height: 0.73764,
    },
    SQUARE,
  ),
  "pellets-pallet-6plus-master-v10": metadata(
    0.41579,
    {
      x: 0.066188,
      y: 0.206539,
      width: 0.868421,
      height: 0.586922,
    },
    SQUARE,
  ),
  "pellets-set-5plus-master-v10": metadata(0.563427, {
    x: 0.065755,
    y: 0.142578,
    width: 0.86849,
    height: 0.713867,
  }),
  "plank-1-master-v10": metadata(0.380912, {
    x: 0.065104,
    y: 0.069336,
    width: 0.869792,
    height: 0.861328,
  }),
  "plank-2-master-v10": metadata(0.395333, {
    x: 0.106771,
    y: 0.066406,
    width: 0.787109,
    height: 0.867188,
  }),
  "plank-3-4-master-v10": metadata(0.392635, {
    x: 0.162109,
    y: 0.06543,
    width: 0.67513,
    height: 0.869141,
  }),
  "plank-5-9-master-v10": metadata(0.519519, {
    x: 0.072266,
    y: 0.066406,
    width: 0.855469,
    height: 0.868164,
  }),
  "plank-10-14-master-v10": metadata(0.469037, {
    x: 0.065104,
    y: 0.106445,
    width: 0.869141,
    height: 0.788086,
  }),
  "plank-15plus-master-v10": metadata(0.45923, {
    x: 0.077474,
    y: 0.066406,
    width: 0.845052,
    height: 0.867188,
  }),
  "slabs-3-4-master-v10": metadata(0.323226, {
    x: 0.07487,
    y: 0.192383,
    width: 0.85026,
    height: 0.614258,
  }),
  "slabs-5plus-master-v10": metadata(0.392117, {
    x: 0.09375,
    y: 0.169922,
    width: 0.811849,
    height: 0.658203,
  }),
};
