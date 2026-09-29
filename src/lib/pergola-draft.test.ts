import { describe, expect, it } from "vitest";
import { DEFAULT_PERGOLA } from "@/lib/pergola";
import {
  clearPergolaDraft,
  PERGOLA_DRAFT_SCHEMA_VERSION,
  PERGOLA_DRAFT_STORAGE_KEY,
  readPergolaDraft,
  writePergolaDraft,
} from "@/lib/pergola-draft";

function createStorage(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(PERGOLA_DRAFT_STORAGE_KEY, initial);

  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("pergola draft persistence", () => {
  it("round-trips the complete configuration with a schema version", () => {
    const storage = createStorage();
    const config = {
      ...DEFAULT_PERGOLA,
      width: 5.4,
      wood: "ebenholzRc780" as const,
      delivery: true,
      postalCode: "11042",
      assembly: true,
    };

    writePergolaDraft(storage, config);

    expect(JSON.parse(storage.values.get(PERGOLA_DRAFT_STORAGE_KEY) ?? "")).toEqual({
      version: PERGOLA_DRAFT_SCHEMA_VERSION,
      config,
    });
    expect(readPergolaDraft(storage)).toEqual(config);
  });

  it("migrates a version-one draft to the existing freestanding model", () => {
    const { model: _model, ...legacyConfig } = DEFAULT_PERGOLA;
    const storage = createStorage(JSON.stringify({ version: 1, config: legacyConfig }));

    expect(readPergolaDraft(storage)).toEqual(DEFAULT_PERGOLA);
  });

  it("migrates version-two model identifiers to URL-safe model keys", () => {
    const storage = createStorage(
      JSON.stringify({
        version: 2,
        config: { ...DEFAULT_PERGOLA, model: "wallMounted" },
      }),
    );

    expect(readPergolaDraft(storage)).toEqual({ ...DEFAULT_PERGOLA, model: "wall-pent" });
  });

  it.each([
    "{broken-json",
    JSON.stringify({ version: PERGOLA_DRAFT_SCHEMA_VERSION + 1, config: DEFAULT_PERGOLA }),
    JSON.stringify({
      version: PERGOLA_DRAFT_SCHEMA_VERSION,
      config: { ...DEFAULT_PERGOLA, width: 999 },
    }),
    JSON.stringify({
      version: PERGOLA_DRAFT_SCHEMA_VERSION,
      config: { ...DEFAULT_PERGOLA, wood: "unknown-finish" },
    }),
  ])("silently purges an invalid stored payload", (payload) => {
    const storage = createStorage(payload);

    expect(readPergolaDraft(storage)).toBeNull();
    expect(storage.values.has(PERGOLA_DRAFT_STORAGE_KEY)).toBe(false);
  });

  it("clears a saved draft after completion", () => {
    const storage = createStorage();
    writePergolaDraft(storage, DEFAULT_PERGOLA);

    clearPergolaDraft(storage);

    expect(storage.values.has(PERGOLA_DRAFT_STORAGE_KEY)).toBe(false);
  });
});
