import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getPalletSlots, type PalletSlot } from "../src/lib/pallet-composition.ts";

const outputDirectory = resolve("tmp/pallet-grid-qa");
mkdirSync(outputDirectory, { recursive: true });

const colors = {
  ink: "#18312a",
  ground: "#e9b867",
  groundSide: "#bb7627",
  upper: "#2f624e",
  upperSide: "#183f32",
  support: "#d86b38",
  paper: "#fbf6eb",
  grid: "#d7c9b3",
} as const;

function document(title: string, width: number, height: number, body: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" rx="24" fill="${colors.paper}"/>
  <text x="40" y="52" font-family="system-ui, sans-serif" font-size="24" font-weight="800" fill="${colors.ink}">${title}</text>
  ${body}
</svg>
`;
}

function topDown(count: number) {
  const slots = getPalletSlots(count);
  const ground = slots.filter((slot) => slot.level === 0);
  const upper = slots.filter((slot) => slot.level === 1);
  const columns = Math.max(...ground.map((slot) => slot.column)) + 1;
  const depths = Math.max(...ground.map((slot) => slot.depth)) + 1;
  const cellWidth = 128;
  const cellHeight = 92;
  const left = 62;
  const top = 92;
  const width = left * 2 + columns * cellWidth;
  const height = top + depths * cellHeight + 96;
  const upperKeys = new Set(upper.map((slot) => `${slot.column}:${slot.depth}`));
  const cells = ground
    .map((slot) => {
      const x = left + slot.column * cellWidth;
      const y = top + slot.depth * cellHeight;
      const supported = upperKeys.has(`${slot.column}:${slot.depth}`);
      return `<g>
        <rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" fill="${colors.ground}" stroke="${colors.ink}" stroke-width="3"/>
        ${supported ? `<rect x="${x + 9}" y="${y + 9}" width="${cellWidth - 18}" height="${cellHeight - 18}" rx="8" fill="${colors.upper}" stroke="#fff" stroke-width="3"/>` : ""}
        <text x="${x + cellWidth / 2}" y="${y + cellHeight / 2 + 6}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="16" font-weight="700" fill="${supported ? "#fff" : colors.ink}">(${slot.column},${slot.depth})${supported ? " ×2" : ""}</text>
      </g>`;
    })
    .join("\n");
  const legendY = top + depths * cellHeight + 38;
  return document(
    `Top-down grid — ${count} palet`,
    width,
    height,
    `${cells}
    <rect x="${left}" y="${legendY}" width="18" height="18" fill="${colors.ground}" stroke="${colors.ink}"/>
    <text x="${left + 28}" y="${legendY + 15}" font-family="system-ui, sans-serif" font-size="14" fill="${colors.ink}">spodní vrstva</text>
    <rect x="${left + 150}" y="${legendY}" width="18" height="18" fill="${colors.upper}"/>
    <text x="${left + 178}" y="${legendY + 15}" font-family="system-ui, sans-serif" font-size="14" fill="${colors.ink}">přímá horní podpora</text>`,
  );
}

function isoOrigin(slot: PalletSlot, exploded: boolean) {
  const layerLift = slot.level * (exploded ? 150 : 78);
  return {
    x: 190 + slot.column * 112 - slot.depth * 74,
    y: 250 + slot.column * 38 + slot.depth * 44 - layerLift,
  };
}

function prism(slot: PalletSlot, exploded: boolean) {
  const { x, y } = isoOrigin(slot, exploded);
  const topColor = slot.level === 0 ? colors.ground : colors.upper;
  const sideColor = slot.level === 0 ? colors.groundSide : colors.upperSide;
  const points = {
    a: `${x},${y}`,
    b: `${x + 102},${y + 34}`,
    c: `${x + 38},${y + 72}`,
    d: `${x - 64},${y + 38}`,
  };
  return `<g>
    <polygon points="${points.d} ${points.c} ${x + 38},${y + 96} ${x - 64},${y + 62}" fill="${sideColor}" stroke="${colors.ink}" stroke-width="2"/>
    <polygon points="${points.b} ${points.c} ${x + 38},${y + 96} ${x + 102},${y + 58}" fill="${sideColor}" opacity="0.78" stroke="${colors.ink}" stroke-width="2"/>
    <polygon points="${points.a} ${points.b} ${points.c} ${points.d}" fill="${topColor}" stroke="${colors.ink}" stroke-width="2"/>
    <text x="${x + 19}" y="${y + 43}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="13" font-weight="800" fill="${slot.level === 1 ? "#fff" : colors.ink}">${slot.column},${slot.depth},${slot.level}</text>
  </g>`;
}

function exploded(count: number) {
  const slots = [...getPalletSlots(count)].sort(
    (left, right) =>
      left.level - right.level || left.column - right.column || left.depth - right.depth,
  );
  const supports = slots
    .filter((slot) => slot.level === 1)
    .map((slot) => {
      const upper = isoOrigin(slot, true);
      const lower = isoOrigin({ ...slot, level: 0 }, true);
      return `<line x1="${upper.x + 19}" y1="${upper.y + 72}" x2="${lower.x + 19}" y2="${lower.y}" stroke="${colors.support}" stroke-width="3" stroke-dasharray="8 7"/>
      <circle cx="${lower.x + 19}" cy="${lower.y}" r="5" fill="${colors.support}"/>`;
    })
    .join("\n");
  const shapes = slots.map((slot) => prism(slot, true)).join("\n");
  return document(
    `Exploded support view — ${count} palet`,
    840,
    700,
    `${supports}${shapes}
    <text x="40" y="665" font-family="system-ui, sans-serif" font-size="15" fill="${colors.ink}">Přerušované osy spojují shodné buňky (i,j) obou vrstev; přesah = 0.</text>`,
  );
}

for (const count of [5, 20]) {
  writeFileSync(resolve(outputDirectory, `pallet-grid-${count}-top-down.svg`), topDown(count));
  writeFileSync(resolve(outputDirectory, `pallet-grid-${count}-exploded.svg`), exploded(count));
}

console.log(outputDirectory);
