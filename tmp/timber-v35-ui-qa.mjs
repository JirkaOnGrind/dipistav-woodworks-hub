import { chromium } from "file:///C:/Users/Utrh/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs";

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") {
    consoleErrors.push(`${message.text()} ${message.location().url}`.trim());
  }
});
page.on("pageerror", (error) => consoleErrors.push(error.message));

async function setExactQuantity(label, quantity) {
  const slider = page.getByRole("slider", { name: label, exact: true });
  let current = Number(await slider.getAttribute("aria-valuenow"));
  if (current === 1 && quantity > 1) {
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: `Zvýšit: ${label}` }).click();
    await page.waitForFunction(
      ({ accessibleName, expected }) =>
        document
          .querySelector(`input[type="range"][aria-label="${accessibleName}"]`)
          ?.getAttribute("aria-valuenow") === String(expected),
      { accessibleName: label, expected: 2 },
    );
    current = 2;
  }
  if (current !== quantity) {
    const input = page.getByRole("textbox", { name: `${label} přesně` });
    await input.fill(String(quantity));
    await input.press("Enter");
    await page.waitForFunction(
      ({ accessibleName, expected }) =>
        document
          .querySelector(`input[type="range"][aria-label="${accessibleName}"]`)
          ?.getAttribute("aria-valuenow") === String(expected),
      { accessibleName: label, expected: quantity },
    );
  }
  await page.waitForTimeout(350);
}

async function assertMaster(expectedSource) {
  await page.waitForFunction(
    (needle) => {
      const image = document.querySelector(
        '[data-artwork-visual-layer][data-layer-state="current"] [data-product-artwork] img',
      );
      return image instanceof HTMLImageElement && image.src.includes(needle) && image.complete && image.naturalWidth > 0;
    },
    expectedSource,
    { timeout: 30000 },
  );
  const current = page.locator('[data-artwork-visual-layer][data-layer-state="current"]');
  const artwork = current.locator("[data-product-artwork]");
  await artwork.waitFor({ state: "visible" });
  if ((await artwork.getAttribute("data-artwork-render-mode")) !== "master") {
    throw new Error("Timber is not rendered as one master artwork");
  }
  const images = artwork.locator("img");
  if ((await images.count()) !== 1) throw new Error("Timber master must contain exactly one img");
  const src = await images.getAttribute("src");
  if (!src?.includes(expectedSource)) throw new Error(`Expected ${expectedSource}, received ${src}`);
}

await page.goto("http://127.0.0.1:8081/category/tramy", { waitUntil: "networkidle" });
await setExactQuantity("Počet kusů", 6);
await assertMaster("beam-6-master-v35.webp");
await page.screenshot({ path: "tmp/qa/timber-v35-beam-6-desktop.png", fullPage: true });
await setExactQuantity("Počet kusů", 20);
await assertMaster("beam-20-master-v35.webp");
await page.screenshot({ path: "tmp/qa/timber-v35-beam-20-desktop.png", fullPage: true });

await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "tmp/qa/timber-v35-beam-20-mobile.png", fullPage: true });

await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto("http://127.0.0.1:8081/category/prkna", { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Netříděná" }).click();
await setExactQuantity("Objem netříděných prken", 3);
await assertMaster("board-unsorted-narrow-15-master-v35.webp");
const range = page.getByRole("slider", { name: "Objem netříděných prken" });
if ((await range.getAttribute("aria-valuetext")) !== "3 m³") {
  throw new Error("Unsorted board slider is not expressed in m³");
}
await page.screenshot({ path: "tmp/qa/timber-v35-unsorted-3m3-desktop.png", fullPage: true });

await browser.close();
if (consoleErrors.length) throw new Error(`Browser console errors:\n${consoleErrors.join("\n")}`);
console.log("UI QA passed: beam 6, beam 20 desktop/mobile, unsorted boards 3 m³ -> 15 pieces");
