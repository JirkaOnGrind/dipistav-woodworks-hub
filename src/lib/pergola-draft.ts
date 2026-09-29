import {
  PERGOLA_LIMITS,
  PERGOLA_MODELS,
  ROOF_COLORS,
  WOOD_PAINTS,
  type PergolaConfig,
} from "@/lib/pergola";

export const PERGOLA_DRAFT_STORAGE_KEY = "dipistav-pergola-config";
export const PERGOLA_DRAFT_SCHEMA_VERSION = 3;
export const PERGOLA_DRAFT_SAVE_DELAY_MS = 500;

const VERSION_TWO_MODELS = {
  freestanding: "freestanding-pent",
  wallMounted: "wall-pent",
  freestandingSpace: "gable-freestanding",
} as const;

type PergolaDraftPayload = {
  version: typeof PERGOLA_DRAFT_SCHEMA_VERSION;
  config: PergolaConfig;
};

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDimension(value: unknown, limits: (typeof PERGOLA_LIMITS)[keyof typeof PERGOLA_LIMITS]) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= limits.min &&
    value <= limits.max
  );
}

function isPergolaConfig(value: unknown): value is PergolaConfig {
  if (!isRecord(value)) return false;

  return (
    typeof value.model === "string" &&
    Object.hasOwn(PERGOLA_MODELS, value.model) &&
    isDimension(value.width, PERGOLA_LIMITS.width) &&
    isDimension(value.depth, PERGOLA_LIMITS.depth) &&
    isDimension(value.height, PERGOLA_LIMITS.height) &&
    typeof value.wood === "string" &&
    Object.hasOwn(WOOD_PAINTS, value.wood) &&
    typeof value.roof === "string" &&
    Object.hasOwn(ROOF_COLORS, value.roof) &&
    typeof value.delivery === "boolean" &&
    typeof value.postalCode === "string" &&
    /^\d{0,5}$/.test(value.postalCode) &&
    typeof value.anchors === "boolean" &&
    typeof value.assembly === "boolean" &&
    typeof value.hardware === "boolean" &&
    typeof value.roofing === "boolean"
  );
}

function purgeInvalidDraft(storage: DraftStorage) {
  try {
    storage.removeItem(PERGOLA_DRAFT_STORAGE_KEY);
  } catch {
    // Storage may be unavailable in privacy mode; defaults remain usable.
  }
}

export function readPergolaDraft(storage: DraftStorage): PergolaConfig | null {
  try {
    const serialized = storage.getItem(PERGOLA_DRAFT_STORAGE_KEY);
    if (serialized === null) return null;

    const payload = JSON.parse(serialized) as unknown;
    if (!isRecord(payload) || !isRecord(payload.config)) {
      purgeInvalidDraft(storage);
      return null;
    }

    let config: Record<string, unknown> = payload.config;
    if (payload.version === 1 && !("model" in config)) {
      config = { ...config, model: "freestanding-pent" };
    } else if (
      payload.version === 2 &&
      typeof config.model === "string" &&
      Object.hasOwn(VERSION_TWO_MODELS, config.model)
    ) {
      config = {
        ...config,
        model: VERSION_TWO_MODELS[config.model as keyof typeof VERSION_TWO_MODELS],
      };
    }
    if (![1, 2, PERGOLA_DRAFT_SCHEMA_VERSION].includes(payload.version as number)) {
      purgeInvalidDraft(storage);
      return null;
    }
    if (!isPergolaConfig(config)) {
      purgeInvalidDraft(storage);
      return null;
    }

    return { ...config };
  } catch {
    purgeInvalidDraft(storage);
    return null;
  }
}

export function writePergolaDraft(storage: DraftStorage, config: PergolaConfig) {
  const payload: PergolaDraftPayload = {
    version: PERGOLA_DRAFT_SCHEMA_VERSION,
    config,
  };

  try {
    storage.setItem(PERGOLA_DRAFT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Configuration still works when storage is full or unavailable.
  }
}

export function clearPergolaDraft(storage: DraftStorage) {
  try {
    storage.removeItem(PERGOLA_DRAFT_STORAGE_KEY);
  } catch {
    // Clearing is best-effort when storage is unavailable.
  }
}
