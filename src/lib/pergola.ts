import type { CatalogCartInput } from "@/lib/cart";

export const WOOD_PAINTS = {
  ral1004Stain: {
    label: "RAL 1004 lazura",
    code: "RAL 1004",
    color: "#e2b007",
    category: "stains",
  },
  ral3020Stain: {
    label: "RAL 3020 lazura",
    code: "RAL 3020",
    color: "#cc0605",
    category: "stains",
  },
  ral6005Stain: {
    label: "RAL 6005 lazura",
    code: "RAL 6005",
    color: "#0f4336",
    category: "stains",
  },
  kieferRc270: {
    label: "Kiefer RC-270",
    code: "RC-270",
    color: "#c58b4b",
    category: "stains",
  },
  pinieLarcheRc260: {
    label: "Pinie/Lärche RC-260",
    code: "RC-260",
    color: "#aa6c3e",
    category: "stains",
  },
  teakRc545: {
    label: "Teak RC-545",
    code: "RC-545",
    color: "#81502f",
    category: "stains",
  },
  eicheRustikalRc360: {
    label: "Eiche Rustikal RC-360",
    code: "RC-360",
    color: "#8a5837",
    category: "stains",
  },
  nussbaumRc660: {
    label: "Nussbaum RC-660",
    code: "RC-660",
    color: "#5e3c2a",
    category: "stains",
  },
  ft21082: { label: "FT 21082", code: "FT 21082", color: "#8c735b", category: "stains" },
  ft37911: { label: "FT 37911", code: "FT 37911", color: "#655047", category: "stains" },
  ft30241: { label: "FT 30241", code: "FT 30241", color: "#9b5e3f", category: "stains" },
  kastanieRc555: {
    label: "Kastanie RC-555",
    code: "RC-555",
    color: "#70432f",
    category: "stains",
  },
  mahagoniRc565: {
    label: "Mahagoni RC-565",
    code: "RC-565",
    color: "#6b2f2a",
    category: "stains",
  },
  ft30240: { label: "FT 30240", code: "FT 30240", color: "#7b3f32", category: "stains" },
  ft30243: { label: "FT 30243", code: "FT 30243", color: "#4f2926", category: "stains" },
  ral6005Opaque: {
    label: "RAL 6005 krycí",
    code: "RAL 6005",
    color: "#0f4336",
    category: "opaque",
  },
  ncsS2040R80B: {
    label: "NCS S2040 R80B krycí",
    code: "NCS S2040 R80B",
    color: "#a2779c",
    category: "opaque",
  },
  ral1023Opaque: {
    label: "RAL 1023 krycí",
    code: "RAL 1023",
    color: "#f3a505",
    category: "opaque",
  },
  ral9016Opaque: {
    label: "RAL 9016 krycí",
    code: "RAL 9016",
    color: "#f6f6f6",
    category: "opaque",
  },
  ral7004Opaque: {
    label: "RAL 7004 krycí",
    code: "RAL 7004",
    color: "#969992",
    category: "opaque",
  },
  silbergrauRc970: {
    label: "Silbergrau RC-970",
    code: "RC-970",
    color: "#a6a9a3",
    category: "opaque",
  },
  ft31835: { label: "FT 31835", code: "FT 31835", color: "#3b584c", category: "opaque" },
  ft31727: { label: "FT 31727", code: "FT 31727", color: "#6e7a5d", category: "opaque" },
  ft31721: { label: "FT 31721", code: "FT 31721", color: "#4f5f54", category: "opaque" },
  ft37728: { label: "FT 37728", code: "FT 37728", color: "#746667", category: "opaque" },
  ft20925: { label: "FT 20925", code: "FT 20925", color: "#d1b28f", category: "opaque" },
  ft21073: { label: "FT 21073", code: "FT 21073", color: "#a99578", category: "opaque" },
  palisanderRc720: {
    label: "Palisander RC-720",
    code: "RC-720",
    color: "#44302d",
    category: "opaque",
  },
  ft20923: { label: "FT 20923", code: "FT 20923", color: "#c1a078", category: "opaque" },
  ebenholzRc780: {
    label: "Ebenholz RC-780",
    code: "RC-780",
    color: "#242120",
    category: "opaque",
  },
} as const;
export const ROOF_COLORS = {
  ral3005: { label: "RAL 3005", code: "RAL 3005", color: "#5e2028" },
  ral3009: { label: "RAL 3009", code: "RAL 3009", color: "#642424" },
  ral3011: { label: "RAL 3011", code: "RAL 3011", color: "#781f19" },
  ral5010: { label: "RAL 5010", code: "RAL 5010", color: "#004f7c" },
  ral6020: { label: "RAL 6020", code: "RAL 6020", color: "#37422f" },
  ral6029: { label: "RAL 6029", code: "RAL 6029", color: "#007243" },
  ral7016: { label: "RAL 7016", code: "RAL 7016", color: "#383e42" },
  ral7024: { label: "RAL 7024", code: "RAL 7024", color: "#45494e" },
  ral8004: { label: "RAL 8004", code: "RAL 8004", color: "#8f4e35" },
  ral8017: { label: "RAL 8017", code: "RAL 8017", color: "#44322d" },
  ral8019: { label: "RAL 8019", code: "RAL 8019", color: "#3f3a3a" },
  ral9005: { label: "RAL 9005", code: "RAL 9005", color: "#0a0a0d" },
  ral9006: { label: "RAL 9006", code: "RAL 9006", color: "#a5a5a0" },
  ral9007: { label: "RAL 9007", code: "RAL 9007", color: "#8f8f88" },
  ral9010: { label: "RAL 9010", code: "RAL 9010", color: "#f4f4ed" },
} as const;

export const PERGOLA_MODELS = {
  "freestanding-pent": {
    label: "Samostatně stojící",
    description: "Čtyřsloupová pergola pro volné umístění.",
    cartTitle: "Samostatně stojící pergola s pultovou střechou",
  },
  "wall-pent": {
    label: "Ke zdi",
    description: "Pergola kotvená ke stěně se dvěma předními sloupy.",
    cartTitle: "Pergola ke zdi s pultovou střechou",
  },
  "gable-freestanding": {
    label: "Do prostoru",
    description: "Samostatná čtyřsloupová pergola s hřebenem.",
    cartTitle: "Pergola do prostoru se sedlovou střechou",
  },
} as const;

export type PergolaModel = keyof typeof PERGOLA_MODELS;

export function isPergolaModel(value: unknown): value is PergolaModel {
  return typeof value === "string" && Object.hasOwn(PERGOLA_MODELS, value);
}

export type PergolaConfig = {
  model: PergolaModel;
  width: number;
  depth: number;
  height: number;
  wood: keyof typeof WOOD_PAINTS;
  roof: keyof typeof ROOF_COLORS;
  delivery: boolean;
  postalCode: string;
  anchors: boolean;
  assembly: boolean;
  hardware: boolean;
  roofing: boolean;
};
export const DEFAULT_PERGOLA: PergolaConfig = {
  model: "freestanding-pent",
  width: 4,
  depth: 4,
  height: 2.5,
  wood: "kieferRc270",
  roof: "ral7016",
  delivery: false,
  postalCode: "11000",
  anchors: false,
  assembly: false,
  hardware: false,
  roofing: true,
};
export const DELIVERY_ZIP_MULTIPLIER = 35;
export const PERGOLA_ADDONS = [
  { key: "delivery", label: "Doprava", rate: "Cena dle PSČ" },
  { key: "anchors", label: "Kotvící ocelové patky", rate: "600 Kč / sloup" },
  { key: "assembly", label: "Montáž konstrukce", rate: "850 Kč/m²" },
  { key: "hardware", label: "Spojovací materiál", rate: "1 200 Kč" },
  { key: "roofing", label: "Zastřešení včetně montáže", rate: "950 Kč/m²" },
] as const;

export const PERGOLA_LIMITS = {
  width: { min: 4, max: 6 },
  depth: { min: 4, max: 6 },
  height: { min: 2, max: 4 },
} as const;

export const BASE_RATE_PER_SQM = 2450;
export const ASSEMBLY_RATE_PER_SQM = 850;
export const ROOF_RATE_PER_SQM = 950;
export const PAINT_RATE_PER_SQM = 290;
export const ANCHOR_RATE_PER_POST = 600;

// Illustrative parameters are isolated by model so business rates can be changed
// without touching geometry, controls or quote composition.
export const GABLE_ROOF_PITCH_DEGREES = 20;

export const PERGOLA_MODEL_PRICING: Record<
  PergolaModel,
  {
    structureRatePerSqm: number;
    referencePostCount: number;
    postAdjustment: number;
    fixedAdjustment: number;
    roofingAreaMultiplier: number;
  }
> = {
  "freestanding-pent": {
    structureRatePerSqm: BASE_RATE_PER_SQM,
    referencePostCount: 4,
    postAdjustment: 1800,
    fixedAdjustment: 0,
    roofingAreaMultiplier: 1,
  },
  "wall-pent": {
    structureRatePerSqm: BASE_RATE_PER_SQM,
    referencePostCount: 4,
    postAdjustment: 1800,
    fixedAdjustment: 1400,
    roofingAreaMultiplier: 1,
  },
  "gable-freestanding": {
    structureRatePerSqm: BASE_RATE_PER_SQM,
    referencePostCount: 4,
    postAdjustment: 1800,
    fixedAdjustment: 2800,
    roofingAreaMultiplier: 1 / Math.cos((GABLE_ROOF_PITCH_DEGREES * Math.PI) / 180),
  },
};

export function clampDimension(value: number, min: number, max: number) {
  return Number.isFinite(value) ? Math.round(Math.min(max, Math.max(min, value)) * 10) / 10 : min;
}

export function isValidPostalCode(value: string) {
  return /^\d{5}$/.test(value);
}

export function deliveryCostForPostalCode(value: string) {
  return isValidPostalCode(value) ? (Number(value) % 100) * DELIVERY_ZIP_MULTIPLIER : 0;
}

export function quotePergola(config: PergolaConfig) {
  const area = config.width * config.depth;
  const materials = pergolaMaterials(config);
  const pricing = PERGOLA_MODEL_PRICING[config.model];
  const structure = Math.max(
    0,
    Math.round(
      area * pricing.structureRatePerSqm +
        (materials.postCount - pricing.referencePostCount) * pricing.postAdjustment +
        pricing.fixedAdjustment,
    ),
  );
  const paint = Math.round(area * PAINT_RATE_PER_SQM);
  const addons = {
    delivery: config.delivery ? deliveryCostForPostalCode(config.postalCode) : 0,
    anchors: config.anchors ? materials.postCount * ANCHOR_RATE_PER_POST : 0,
    assembly: config.assembly ? Math.round(area * ASSEMBLY_RATE_PER_SQM) : 0,
    hardware: config.hardware ? 1200 : 0,
    roofing: config.roofing
      ? Math.round(area * pricing.roofingAreaMultiplier * ROOF_RATE_PER_SQM)
      : 0,
  };
  return {
    area,
    materials,
    structure,
    paint,
    addons,
    total: structure + paint + Object.values(addons).reduce((a, b) => a + b, 0),
  };
}

export type PergolaQuote = ReturnType<typeof quotePergola>;

export type PergolaPart = {
  kind: "post" | "beam" | "ridge" | "rafter" | "roof" | "anchor" | "wall";
  size: [number, number, number];
  position: [number, number, number];
  rotationX?: number;
};

export function gableRidgeHeight(config: Pick<PergolaConfig, "depth" | "height">) {
  const pitch = (GABLE_ROOF_PITCH_DEGREES * Math.PI) / 180;
  return config.height + (config.depth / 2) * Math.tan(pitch);
}

function slopedLengthForProjectedSpan(projectedSpan: number, thickness: number, angle: number) {
  return (projectedSpan - thickness * Math.abs(Math.sin(angle))) / Math.cos(angle);
}

function gablePergolaParts(config: PergolaConfig): PergolaPart[] {
  const { width, depth, height } = config;
  const post = 0.16;
  const span = depth - post;
  const pitch = (GABLE_ROOF_PITCH_DEGREES * Math.PI) / 180;
  const ridgeRise = (depth / 2) * Math.tan(pitch);
  const projectedHalfSpan = depth / 2 + 0.2;
  const halfRafterLength = projectedHalfSpan / Math.cos(pitch);
  const halfRoofLength = projectedHalfSpan / Math.cos(pitch);
  const rafterCenter = projectedHalfSpan / 2 - (0.16 * Math.sin(pitch)) / 2;
  const roofCenter = projectedHalfSpan / 2 - (0.045 * Math.sin(pitch)) / 2;
  const eaveTop = height + 0.22;
  const parts: PergolaPart[] = [];

  for (const side of [-1, 1]) {
    const z = (side * span) / 2;
    for (const xSide of [-1, 1]) {
      const x = (xSide * (width - post)) / 2;
      parts.push({ kind: "post", size: [post, height, post], position: [x, height / 2, z] });
      if (config.anchors)
        parts.push({ kind: "anchor", size: [0.22, 0.16, 0.22], position: [x, 0.08, z] });
    }
    parts.push({
      kind: "beam",
      size: [width + 0.2, 0.22, post],
      position: [0, height + 0.11, z],
    });
  }

  parts.push({
    kind: "ridge",
    size: [width + 0.2, 0.18, 0.14],
    position: [0, eaveTop + ridgeRise, 0],
  });

  const count = Math.ceil((width - post) / 0.6) + 1;
  for (let i = 0; i < count; i++) {
    const x = -(width - post) / 2 + (i * (width - post)) / (count - 1);
    for (const side of [-1, 1]) {
      parts.push({
        kind: "rafter",
        size: [0.08, 0.16, halfRafterLength],
        position: [
          x,
          eaveTop + ridgeRise - rafterCenter * Math.tan(pitch) + 0.06,
          side * rafterCenter,
        ],
        rotationX: side === 1 ? pitch : -pitch,
      });
    }
  }

  if (config.roofing) {
    for (const side of [-1, 1]) {
      parts.push({
        kind: "roof",
        size: [width + 0.4, 0.045, halfRoofLength],
        position: [0, eaveTop + ridgeRise - roofCenter * Math.tan(pitch) + 0.17, side * roofCenter],
        rotationX: side === 1 ? pitch : -pitch,
      });
    }
  }

  return parts;
}

export function pergolaParts(config: PergolaConfig): PergolaPart[] {
  if (config.model === "gable-freestanding") return gablePergolaParts(config);

  const { width, depth, height } = config;
  const post = 0.16;
  const span = depth - post;
  const slope = 0.06;
  const angle = Math.atan(slope);
  const parts: PergolaPart[] = [];
  const postXPositions = [-(width - post) / 2, (width - post) / 2];
  for (const side of [-1, 1]) {
    const z = (side * span) / 2;
    const postHeight = height - (side === 1 ? span * slope : 0);
    const attachesToWall = config.model === "wall-pent" && side === -1;
    if (!attachesToWall) {
      for (const x of postXPositions) {
        parts.push({
          kind: "post",
          size: [post, postHeight, post],
          position: [x, postHeight / 2, z],
        });
        if (config.anchors)
          parts.push({
            kind: "anchor",
            size: [0.22, 0.16, 0.22],
            position: [x, 0.08, z],
          });
      }
    }
    parts.push({
      kind: "beam",
      size: [width + 0.2, 0.22, post],
      position: [0, postHeight + 0.11, z],
    });
  }
  if (config.model === "wall-pent") {
    const wallHeight = height + 0.7;
    parts.push({
      kind: "wall",
      size: [width + 1.2, wallHeight, 0.12],
      position: [0, wallHeight / 2, -depth / 2 - 0.06],
    });
  }
  const count = Math.ceil((width - post) / 0.6) + 1;
  const attachesToWall = config.model === "wall-pent";
  const rearEdge = attachesToWall ? -depth / 2 : -depth / 2 - 0.2;
  const frontEdge = depth / 2 + 0.2;
  const projectedRoofSpan = frontEdge - rearEdge;
  const roofCenterZ = (rearEdge + frontEdge) / 2;
  const rafterLength = attachesToWall
    ? slopedLengthForProjectedSpan(projectedRoofSpan, 0.16, angle)
    : (depth + 0.4) / Math.cos(angle);
  const roofLength = attachesToWall
    ? slopedLengthForProjectedSpan(projectedRoofSpan, 0.045, angle)
    : rafterLength;
  const centerHeight = height - (span * slope) / 2 + 0.22;
  for (let i = 0; i < count; i++) {
    parts.push({
      kind: "rafter",
      size: [0.08, 0.16, rafterLength],
      position: [
        -(width - post) / 2 + (i * (width - post)) / (count - 1),
        centerHeight + 0.08 / Math.cos(angle) - roofCenterZ * Math.tan(angle),
        roofCenterZ,
      ],
      rotationX: angle,
    });
  }
  if (config.roofing)
    parts.push({
      kind: "roof",
      size: [width + 0.4, 0.045, roofLength],
      position: [
        0,
        centerHeight + 0.185 / Math.cos(angle) - roofCenterZ * Math.tan(angle),
        roofCenterZ,
      ],
      rotationX: angle,
    });
  return parts;
}

export function pergolaMaterials(config: PergolaConfig) {
  const parts = pergolaParts(config);
  const timberParts = parts.filter(
    ({ kind }) => kind === "post" || kind === "beam" || kind === "ridge" || kind === "rafter",
  );
  const timberVolumeM3 = timberParts.reduce((total, { size: [x, y, z] }) => total + x * y * z, 0);
  const paintableSurfaceM2 = timberParts.reduce(
    (total, { size: [x, y, z] }) => total + 2 * (x * y + x * z + y * z),
    0,
  );
  const roofingAreaM2 = parts
    .filter(({ kind }) => kind === "roof")
    .reduce((total, { size }) => total + size[0] * size[2], 0);

  return {
    postCount: parts.filter(({ kind }) => kind === "post").length,
    anchorCount: parts.filter(({ kind }) => kind === "anchor").length,
    timberVolumeM3,
    paintableSurfaceM2,
    roofingAreaM2,
  };
}

export function pergolaCartInput(config: PergolaConfig): CatalogCartInput {
  const quote = quotePergola(config);
  // A fixed field order and normalized inactive choices keep identical quotes together.
  const key = [
    config.model,
    config.width,
    config.depth,
    config.height,
    config.wood,
    config.roofing ? config.roof : "none",
    config.delivery ? config.postalCode : "none",
    config.anchors,
    config.assembly,
    config.hardware,
    config.roofing,
  ].join("-");
  return {
    productId: "pergoly",
    variantId: key,
    title: PERGOLA_MODELS[config.model].cartTitle,
    quantity: 1,
    quantityUnitLabel: "ks",
    availability: "in-stock",
    pricing: { basis: "piece", rate: quote.total, displayUnit: "ks" },
    details: [
      `Typ: ${PERGOLA_MODELS[config.model].label}`,
      `Rozměry (š × h × v): ${config.width} × ${config.depth} × ${config.height} m`,
      `Nátěr: ${WOOD_PAINTS[config.wood].label}`,
      `Střecha: ${config.roofing ? ROOF_COLORS[config.roof].label : "Bez zastřešení"}`,
      ...PERGOLA_ADDONS.filter(({ key: addon }) => config[addon]).map(
        ({ key: addon, label }) =>
          `${label}: ${addon === "delivery" ? `PSČ ${config.postalCode}, ` : ""}${quote.addons[addon]} Kč`,
      ),
      "Cena: orientační, konečnou nabídku potvrdíme",
    ],
  };
}
