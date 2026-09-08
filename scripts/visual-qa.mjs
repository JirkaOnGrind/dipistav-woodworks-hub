import { chromium } from "playwright-core";
import fs from "node:fs/promises";
import path from "node:path";

const categories = [
  "tramy",
  "fosny",
  "prkna",
  "late",
  "stipane-drevo",
  "pelety",
  "krajinky",
  "drivi-na-paletach",
];
const viewports = [
  { name: "desktop-1366", width: 1366, height: 768 },
  { name: "desktop-1024", width: 1024, height: 600 },
];

function option(name, fallback) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

const baseUrl = option("base-url", "http://127.0.0.1:4173");
const outputPath = path.resolve(option("output", "visual-qa.json"));
const screenshotDir = path.resolve(
  option("screenshots", path.join(path.dirname(outputPath), "qa")),
);
const browser = await chromium.launch({
  executablePath: option(
    "chrome-path",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ),
  headless: true,
});
const results = [];
const errors = [];

try {
  await fs.mkdir(screenshotDir, { recursive: true });
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`${viewport.name}: ${message.text()}`);
    });
    page.on("pageerror", (error) => errors.push(`${viewport.name}: ${error.message}`));
    page.on("response", (response) => {
      if (response.status() >= 400) {
        errors.push(`${viewport.name}: HTTP ${response.status()} ${response.url()}`);
      }
    });

    for (const category of categories) {
      const route = `/category/${category}`;
      await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
      await page.reload({ waitUntil: "networkidle" });
      const layout = await page.evaluate(() => ({
        scrollHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
        headingVisible: Boolean(document.querySelector("h1")?.getBoundingClientRect().height),
        configuratorBottom:
          document.querySelector("[data-product-configurator]")?.getBoundingClientRect().bottom ??
          0,
        actionBottom:
          document.querySelector(".product-detail-actions")?.getBoundingClientRect().bottom ?? 0,
      }));
      const disabledOptions = await page
        .locator("[data-product-configurator] option:disabled")
        .allTextContents();
      const modes = page.locator('[data-product-configurator] [role="group"] button');
      const modeCount = await modes.count();
      for (let index = 0; index < modeCount; index += 1) {
        await modes.nth(index).click();
        if ((await modes.nth(index).getAttribute("aria-pressed")) !== "true") {
          errors.push(`${viewport.name}: mode ${index} did not activate on ${route}`);
        }
      }
      const screenshot = path.join(screenshotDir, `${viewport.name}-${category}.png`);
      await page.screenshot({ path: screenshot, fullPage: false });
      results.push({ viewport, route, ...layout, disabledOptions, screenshot });
    }
    await context.close();
  }

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(baseUrl, { waitUntil: "networkidle" });
  await mobilePage.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
  });
  await mobilePage.waitForTimeout(500);
  const homepageCategoryImages = await mobilePage
    .locator("[data-category-image]")
    .evaluateAll((images) =>
      images.map((image) => ({
        src: new URL(image.currentSrc || image.src).pathname,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
      })),
    );
  if (
    homepageCategoryImages.length !== 8 ||
    homepageCategoryImages.some((image) => image.naturalWidth === 0 || image.naturalHeight === 0)
  ) {
    errors.push("mobile-390: not all eight lazy homepage category images loaded after scrolling");
  }
  const homepageScreenshot = path.join(screenshotDir, "mobile-390-homepage-scrolled.png");
  await mobilePage.screenshot({ path: homepageScreenshot, fullPage: true });
  results.push({
    viewport: { name: "mobile-390", width: 390, height: 844 },
    route: "/",
    homepageCategoryImages,
    screenshot: homepageScreenshot,
  });

  await mobilePage.goto(`${baseUrl}/category/tramy`, { waitUntil: "networkidle" });
  const mobileScroll = await mobilePage.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
  }));
  const mobileScreenshot = path.join(screenshotDir, "mobile-390-tramy.png");
  await mobilePage.screenshot({ path: mobileScreenshot, fullPage: false });
  results.push({
    viewport: { name: "mobile-390", width: 390, height: 844 },
    route: "/category/tramy",
    ...mobileScroll,
    screenshot: mobileScreenshot,
  });
  await mobileContext.close();

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(
    outputPath,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), results, errors }, null, 2)}\n`,
  );
  console.log(`Visual QA written to ${outputPath}`);
  if (errors.length) process.exitCode = 1;
} finally {
  await browser.close();
}
