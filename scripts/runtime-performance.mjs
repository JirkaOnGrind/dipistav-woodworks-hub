import { chromium } from "playwright-core";
import fs from "node:fs/promises";
import path from "node:path";

const ROUTES = [
  ["home", "/"],
  ["tramy", "/category/tramy"],
  ["pelety", "/category/pelety"],
  ["stipane", "/category/stipane-drevo"],
  ["doprava", "/doprava"],
  ["onas", "/o-nas"],
];

const PROFILES = {
  desktop: { viewport: { width: 1366, height: 768 }, cpuRate: 4 },
  mobile: { viewport: { width: 390, height: 844 }, cpuRate: 6, isMobile: true, hasTouch: true },
};

function option(name, fallback) {
  const prefix = `--${name}=`;
  return (
    process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length) ?? fallback
  );
}

const baseUrl = option("base-url", "http://127.0.0.1:4173");
const outputPath = path.resolve(option("output", "runtime-performance.json"));
const chromePath = option(
  "chrome-path",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
);

async function installObservers(page) {
  await page.addInitScript(() => {
    const state = {
      longTasks: [],
      events: [],
      layoutShifts: [],
      frames: [],
      mutationCount: 0,
      listenerCounts: {},
      probing: false,
    };

    for (const type of ["longtask", "event", "layout-shift"]) {
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (type === "longtask")
              state.longTasks.push({ startTime: entry.startTime, duration: entry.duration });
            if (type === "event") {
              state.events.push({
                name: entry.name,
                startTime: entry.startTime,
                duration: entry.duration,
              });
            }
            if (type === "layout-shift" && !entry.hadRecentInput) {
              state.layoutShifts.push({ startTime: entry.startTime, value: entry.value });
            }
          }
        }).observe({ type, buffered: true, durationThreshold: type === "event" ? 16 : undefined });
      } catch {
        // Some entry types are browser-version dependent.
      }
    }

    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (["pointermove", "mousemove", "touchmove", "resize", "scroll", "input"].includes(type)) {
        const passive = typeof options === "object" ? options?.passive : false;
        const key = `${type}:${passive ? "passive" : "active"}`;
        state.listenerCounts[key] = (state.listenerCounts[key] ?? 0) + 1;
      }
      return originalAddEventListener.call(this, type, listener, options);
    };

    new MutationObserver((records) => {
      state.mutationCount += records.length;
    }).observe(document, { attributes: true, childList: true, characterData: true, subtree: true });

    const frame = (timestamp) => {
      if (state.probing) state.frames.push(timestamp);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);

    window.__runtimeAudit = {
      start() {
        state.longTasks.length = 0;
        state.events.length = 0;
        state.layoutShifts.length = 0;
        state.frames.length = 0;
        state.mutationCount = 0;
        state.probing = true;
      },
      stop() {
        state.probing = false;
        const gaps = state.frames
          .slice(1)
          .map((timestamp, index) => timestamp - state.frames[index]);
        const sorted = [...gaps].sort((a, b) => a - b);
        const duration = state.frames.at(-1) - state.frames[0] || 0;
        return {
          durationMs: duration,
          frameCount: state.frames.length,
          averageFps: duration > 0 ? ((state.frames.length - 1) * 1000) / duration : null,
          p95FrameMs: sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : null,
          framesOver33ms: gaps.filter((gap) => gap > 33.4).length,
          longTasks: [...state.longTasks],
          maxLongTaskMs: Math.max(0, ...state.longTasks.map((task) => task.duration)),
          eventCount: state.events.length,
          maxEventMs: Math.max(0, ...state.events.map((event) => event.duration)),
          layoutShift: state.layoutShifts.reduce((sum, entry) => sum + entry.value, 0),
          mutationCount: state.mutationCount,
          listenerCounts: { ...state.listenerCounts },
        };
      },
    };
  });
}

async function performanceMetrics(cdp) {
  const { metrics } = await cdp.send("Performance.getMetrics");
  return Object.fromEntries(metrics.map(({ name, value }) => [name, value]));
}

function metricDelta(before, after) {
  const names = [
    "TaskDuration",
    "ScriptDuration",
    "LayoutDuration",
    "RecalcStyleDuration",
    "LayoutCount",
    "RecalcStyleCount",
    "JSHeapUsedSize",
  ];
  return Object.fromEntries(names.map((name) => [name, (after[name] ?? 0) - (before[name] ?? 0)]));
}

async function measure(page, cdp, name, action) {
  await page.evaluate(() => window.__runtimeAudit.start());
  const before = await performanceMetrics(cdp);
  const started = performance.now();
  await action();
  await page.waitForTimeout(500);
  const elapsedMs = performance.now() - started;
  const after = await performanceMetrics(cdp);
  const observer = await page.evaluate(() => window.__runtimeAudit.stop());
  return { name, elapsedMs, ...observer, browserMetrics: metricDelta(before, after) };
}

async function dragRange(page, locator, steps = 40) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Range input is not visible");
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 2, y, { steps });
  await page.mouse.up();
}

async function interactionAudit(browser, profileName, errors) {
  const profile = PROFILES[profileName];
  const context = await browser.newContext(profile);
  const page = await context.newPage();
  await installObservers(page);
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type()))
      errors.push(`${profileName}: ${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`${profileName}: pageerror: ${error.message}`));
  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable");
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpuRate });
  const results = [];

  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  const customConfigurator = page.locator("#konfigurator");
  await customConfigurator.scrollIntoViewIfNeeded();
  const customRange = page.locator("#konfigurator input[data-beam-range]").first();
  if (await customRange.isVisible()) {
    results.push(
      await measure(page, cdp, "custom-configurator-slider", () => dragRange(page, customRange)),
    );
  } else {
    results.push({ name: "custom-configurator-slider", skipped: "range hidden at this viewport" });
  }
  results.push(
    await measure(page, cdp, "scroll", () =>
      page.evaluate(async () => {
        for (let step = 0; step <= 20; step += 1) {
          window.scrollTo(0, (document.documentElement.scrollHeight * step) / 20);
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
      }),
    ),
  );

  await page.goto(`${baseUrl}/category/tramy`, { waitUntil: "networkidle" });
  const quantityRange = page.locator('[data-quantity-selector] input[type="range"]');
  results.push(
    await measure(page, cdp, "product-quantity-slider", () => dragRange(page, quantityRange)),
  );
  const select = page.locator("[data-product-configurator] select").first();
  if ((await select.count()) > 0) {
    const values = await select
      .locator("option:not([disabled])")
      .evaluateAll((options) => options.map((option) => option.value));
    if (values.length > 1) {
      results.push(
        await measure(page, cdp, "product-dropdown", () => select.selectOption(values[1])),
      );
    }
  }

  if (profileName === "desktop") {
    await page.getByRole("radio", { name: "Galerie" }).click();
    results.push(
      await measure(page, cdp, "gallery-lightbox", async () => {
        await page.locator("[data-product-gallery] > button").click();
        await page.locator("[data-gallery-modal]").waitFor({ state: "visible" });
        await page.getByRole("button", { name: "Další fotografie" }).click();
        await page.getByRole("button", { name: "Zavřít zvětšenou fotografii" }).click();
      }),
    );
  }

  results.push(
    await measure(page, cdp, "cart-open", async () => {
      await page
        .getByRole("button", { name: /Přidat|Vložit/ })
        .last()
        .click();
      await page.getByRole("heading", { name: "Košík a poptávka" }).waitFor({ state: "visible" });
    }),
  );

  await context.close();
  return results;
}

async function routeNetworkAudit(browser, profileName, errors) {
  const context = await browser.newContext(PROFILES[profileName]);
  const page = await context.newPage();
  await installObservers(page);
  page.on("pageerror", (error) => errors.push(`${profileName}: pageerror: ${error.message}`));
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: PROFILES[profileName].cpuRate });
  const results = [];

  for (const [name, route] of ROUTES) {
    await cdp.send("Network.clearBrowserCache");
    await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    const cold = await page.evaluate(() => {
      const resources = performance.getEntriesByType("resource");
      return {
        requests: resources.length + 1,
        transferBytes: resources.reduce((sum, resource) => sum + resource.transferSize, 0),
        encodedBytes: resources.reduce((sum, resource) => sum + resource.encodedBodySize, 0),
      };
    });
    await page.reload({ waitUntil: "networkidle" });
    const repeat = await page.evaluate(() => {
      const resources = performance.getEntriesByType("resource");
      return {
        requests: resources.length + 1,
        transferBytes: resources.reduce((sum, resource) => sum + resource.transferSize, 0),
        encodedBytes: resources.reduce((sum, resource) => sum + resource.encodedBodySize, 0),
      };
    });
    results.push({ name, route, cold, repeat });
  }

  await context.close();
  return results;
}

const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const errors = [];
try {
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    profiles: PROFILES,
    network: {},
    interactions: {},
    errors,
  };
  for (const profileName of Object.keys(PROFILES)) {
    report.network[profileName] = await routeNetworkAudit(browser, profileName, errors);
    report.interactions[profileName] = await interactionAudit(browser, profileName, errors);
  }
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Runtime report written to ${outputPath}`);
} finally {
  await browser.close();
}
