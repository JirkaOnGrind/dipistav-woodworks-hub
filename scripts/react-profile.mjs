import { chromium } from "playwright-core";
import fs from "node:fs/promises";
import path from "node:path";

function option(name, fallback) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

const baseUrl = option("base-url", "http://127.0.0.1:4174");
const outputPath = path.resolve(option("output", "react-profile.json"));
const browser = await chromium.launch({
  executablePath: option(
    "chrome-path",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ),
  headless: true,
});

async function dragRange(page, locator, steps = 40) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Range input is not visible");
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 2, y, { steps });
  await page.mouse.up();
}

async function profileScenario(route, action) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.goto(`${baseUrl}${route}${route.includes("?") ? "&" : "?"}react-profile=1`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    window.__reactProfileCommits = [];
  });
  await action(page);
  await page.waitForTimeout(500);
  const commits = await page.evaluate(() => window.__reactProfileCommits ?? []);
  await context.close();
  return commits;
}

try {
  const customConfigurator = await profileScenario("/", async (page) => {
    const range = page.locator("#konfigurator input[data-beam-range]").first();
    await range.scrollIntoViewIfNeeded();
    await dragRange(page, range);
  });
  const productSlider = await profileScenario("/category/tramy", async (page) => {
    await dragRange(page, page.locator('[data-quantity-selector] input[type="range"]'));
  });

  const summarize = (commits) =>
    Object.values(
      commits.reduce((summary, commit) => {
        const entry = (summary[commit.id] ??= {
          id: commit.id,
          commits: 0,
          totalActualDurationMs: 0,
          maxActualDurationMs: 0,
          maxBaseDurationMs: 0,
        });
        entry.commits += 1;
        entry.totalActualDurationMs += commit.actualDuration;
        entry.maxActualDurationMs = Math.max(entry.maxActualDurationMs, commit.actualDuration);
        entry.maxBaseDurationMs = Math.max(entry.maxBaseDurationMs, commit.baseDuration);
        return summary;
      }, {}),
    );

  const report = {
    generatedAt: new Date().toISOString(),
    profiles: { viewport: { width: 1366, height: 768 }, cpuRate: 4 },
    scenarios: {
      customConfigurator: summarize(customConfigurator),
      productSlider: summarize(productSlider),
    },
  };
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`React profile written to ${outputPath}`);
} finally {
  await browser.close();
}
