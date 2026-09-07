// Deterministic SVG composition, using the existing illustration without resampling.
// Edit bundle_configs.json, then run: node scripts/compose_slab_bundles.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(readFileSync(resolve(root, "scripts/bundle_configs.json"), "utf8"));
const source = readFileSync(resolve(root, `public${config.source_asset}`)).toString("base64");
const round = (n) => Number(n.toFixed(4));

for (const [count, scene] of Object.entries(config.bundle_configs)) {
  const { origin, offset, unit_size: unit, canvas, safe_inset: inset } = scene.css_metadata;
  if (scene.positioning_grid.length !== Number(count)) throw new Error(`Wrong count: ${count}`);
  const placements = scene.positioning_grid
    .map((placement) => {
      const [row, column, layer] = placement.grid;
      return {
        ...placement,
        z_index: scene.css_metadata.z_index[placement.id],
        left:
          origin.left +
          row * offset.row.left +
          column * offset.column.left +
          layer * offset.layer.left +
          placement.offset.left,
        top:
          origin.top +
          row * offset.row.top +
          column * offset.column.top +
          layer * offset.layer.top +
          placement.offset.top,
      };
    })
    .sort((a, b) => a.z_index - b.z_index);
  const bounds = config.source_bounds;
  const left = Math.min(...placements.map((p) => p.left + bounds.x));
  const top = Math.min(...placements.map((p) => p.top + bounds.y));
  const right = Math.max(...placements.map((p) => p.left + bounds.x + bounds.width));
  const bottom = Math.max(...placements.map((p) => p.top + bounds.y + bounds.height));
  const scale = Math.min(
    (canvas.width * (1 - 2 * inset)) / (right - left),
    (canvas.height * (1 - 2 * inset)) / (bottom - top),
  );
  const x = (canvas.width - (right - left) * scale) / 2 - left * scale;
  const y = (canvas.height - (bottom - top) * scale) / 2 - top * scale;
  const uses = placements
    .map(
      (p) =>
        `    <use href="#bundle" data-bundle="${p.id}" data-grid="${p.grid.join(",")}" data-z-index="${p.z_index}" style="--bundle-left:${round(p.left)}px;--bundle-top:${round(p.top)}px;transform:translate(var(--bundle-left),var(--bundle-top))"/>`,
    )
    .join("\n");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">
  <title>Krajinky — ${count} balíků</title>
  <defs><image id="bundle" width="${unit.width}" height="${unit.height}" href="data:image/webp;base64,${source}"/></defs>
  <g transform="translate(${round(x)} ${round(y)}) scale(${round(scale)})">
${uses}
  </g>
</svg>
`;
  const output = resolve(root, `public${scene.asset_url}`);
  if (process.argv.includes("--check")) {
    if (readFileSync(output, "utf8") !== svg) throw new Error(`Stale asset: ${scene.asset_url}`);
  } else {
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, svg);
  }
  console.log(`${count} bundles → ${scene.asset_url}`);
}
