import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { PRODUCT_CATEGORIES, getEffectiveQuantityPolicy } from "../src/lib/product-catalog";
import { resolveArtworkScene } from "../src/lib/product-artwork";
import { getPalletSourceProfile } from "../src/lib/pallet-composition";

const projectRoot = path.resolve(import.meta.dirname, "..");
const publicRoot = path.join(projectRoot, "public");
const stagingRoot = path.join(projectRoot, ".production-public");
const cacheRoot = path.join(projectRoot, ".asset-cache", "production-images-v1");
const expectedPrefix = `${projectRoot}${path.sep}`;

if (!stagingRoot.startsWith(expectedPrefix)) {
  throw new Error(`Refusing to replace staging directory outside the project: ${stagingRoot}`);
}

const staticAssets = [
  "/images/logo-dipi.webp",
  "/images/logo-dipimobil.webp",
  "/images/woodpatern.webp",
  "/images/doprava.webp",
  "/images/onas1.webp",
  "/images/onas2.webp",
  "/widgets/beam-configurator.js",
];

const assetSources = new Set(staticAssets);

for (const category of PRODUCT_CATEGORIES) {
  assetSources.add(category.imageSrc);
  for (const variant of category.variants) {
    const policy = getEffectiveQuantityPolicy(category, variant);
    const sampleQuantities = new Set([policy.min, policy.max]);
    for (let quantity = 1; quantity <= Math.ceil(policy.max); quantity += 1) {
      sampleQuantities.add(quantity);
    }

    for (const quantity of sampleQuantities) {
      const { scene } = resolveArtworkScene(category.id, variant, quantity);
      if (scene.source) assetSources.add(scene.source);
      if (scene.renderMode === "modular-pallet" && scene.palletProfile) {
        const profile = getPalletSourceProfile(scene.palletProfile);
        assetSources.add(profile.source);
        if (profile.maskSource) assetSources.add(profile.maskSource);
      }
    }
  }
}

function cleanAssetPath(source: string) {
  return source.split("?", 1)[0].replace(/^\/+/, "");
}

const categoryImagePaths = new Set(
  PRODUCT_CATEGORIES.map((category) => cleanAssetPath(category.imageSrc)),
);

function maximumWidth(relativePath: string) {
  if (relativePath.includes("logo-dipi")) return 384;
  if (relativePath.includes("homepage-v41")) return 768;
  if (/images\/(stipane-v2|pelety-v2|krajinky-v2)\.webp$/.test(relativePath)) return 768;
  if (relativePath.endsWith("woodpatern.webp")) return 1600;
  if (/images\/(doprava|onas[12])\.webp$/.test(relativePath)) return 1280;
  return 1280;
}

function responsivePath(relativePath: string, width: number) {
  const extension = path.extname(relativePath);
  return `${relativePath.slice(0, -extension.length)}.${width}w${extension}`;
}

async function writeWebp(sourcePath: string, destinationPath: string, width: number) {
  const source = await fs.readFile(sourcePath);
  const cacheKey = createHash("sha256")
    .update(source)
    .update(`width=${width};quality=82;alpha=100;effort=5;smart=1`)
    .digest("hex");
  const cachedPath = path.join(cacheRoot, `${cacheKey}.webp`);
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  if (!(await fs.stat(cachedPath).catch(() => null))) {
    await fs.mkdir(cacheRoot, { recursive: true });
    await sharp(source)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 82, alphaQuality: 100, effort: 5, smartSubsample: true })
      .toFile(cachedPath);
  }
  await fs.copyFile(cachedPath, destinationPath);
}

await fs.rm(stagingRoot, { recursive: true, force: true });
await fs.mkdir(stagingRoot, { recursive: true });

const manifest: Array<{ source: string; bytes: number; outputBytes: number }> = [];
for (const source of [...assetSources].sort()) {
  const relativePath = cleanAssetPath(source);
  const sourcePath = path.join(publicRoot, relativePath);
  const destinationPath = path.join(stagingRoot, relativePath);
  const sourceStat = await fs.stat(sourcePath).catch(() => null);
  if (!sourceStat?.isFile()) throw new Error(`Referenced public asset does not exist: ${source}`);
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });

  if (path.extname(relativePath).toLowerCase() === ".webp") {
    const width = maximumWidth(relativePath);
    await writeWebp(sourcePath, destinationPath, width);
    if (width > 640) {
      await writeWebp(sourcePath, path.join(stagingRoot, responsivePath(relativePath, 640)), 640);
    }
    if (categoryImagePaths.has(relativePath) && width > 384) {
      await writeWebp(sourcePath, path.join(stagingRoot, responsivePath(relativePath, 384)), 384);
    }
  } else {
    await fs.copyFile(sourcePath, destinationPath);
  }

  manifest.push({
    source: `/${relativePath.replaceAll(path.sep, "/")}`,
    bytes: sourceStat.size,
    outputBytes: (await fs.stat(destinationPath)).size,
  });
}

await fs.writeFile(
  path.join(stagingRoot, "asset-manifest.json"),
  `${JSON.stringify({ assets: manifest }, null, 2)}\n`,
);

const sourceBytes = manifest.reduce((sum, asset) => sum + asset.bytes, 0);
const outputBytes = manifest.reduce((sum, asset) => sum + asset.outputBytes, 0);
console.log(
  `Prepared ${manifest.length} production assets: ${(sourceBytes / 1024 / 1024).toFixed(1)} MiB -> ${(outputBytes / 1024 / 1024).toFixed(1)} MiB (primary files).`,
);
