// Takes real screenshots of the running site and checks for page problems.
// node shoot.js <base url> <output folder>
const puppeteer = require("puppeteer-core");
const path = require("path");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const base = process.argv[2];
const out = process.argv[3];

const SIZES = [
  { name: "desktop", width: 1440, height: 900, scale: 1 },
  { name: "phone", width: 390, height: 844, scale: 2 },
];

// Measures what the charts really drew, after their animation has finished.
async function chartFacts(page) {
  return page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 40 && Charts.live.some((e) => Chart.animator.running(e.chart)); i++) await wait(100);
    return Charts.live.map(({ chart }) => {
      const points = chart.getDatasetMeta(0).data;
      return {
        type: chart.config.type,
        stillRunning: Chart.animator.running(chart),
        area: chart.chartArea.right - chart.chartArea.left,
        spread: Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x)),
        barWidths: chart.config.type === "bar" ? points.map((p) => Math.round(p.x - p.base)) : [],
      };
    });
  });
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
  const problems = [];

  for (const theme of ["light", "dark"]) {
    for (const size of SIZES) {
      const tag = `${theme}/${size.name}`;
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      await page.bringToFront();
      await page.setViewport({ width: size.width, height: size.height, deviceScaleFactor: size.scale, isMobile: size.name === "phone", hasTouch: size.name === "phone" });
      await page.evaluateOnNewDocument((t) => localStorage.setItem("theme", t), theme);

      page.on("console", (m) => { if (["error", "warning"].includes(m.type())) problems.push(`${tag} console: ${m.text()}`); });
      page.on("pageerror", (e) => problems.push(`${tag} pageerror: ${e.message}`));
      page.on("requestfailed", (r) => problems.push(`${tag} failed: ${r.url()}`));

      await page.goto(base, { waitUntil: "networkidle0" });
      await page.waitForSelector("input[name=username]");
      await new Promise((r) => setTimeout(r, 300));
      await page.screenshot({ path: path.join(out, `login-${theme}-${size.name}.png`) });

      await page.type("input[name=username]", "admin");
      await page.type("input[name=password]", "admin123");
      await page.click("button[type=submit]");
      await page.waitForSelector("canvas", { timeout: 15000 });

      const facts = await chartFacts(page);
      console.log(tag, JSON.stringify(facts));
      if (facts.length !== 2) problems.push(`${tag} expected 2 charts, found ${facts.length}`);
      for (const f of facts) {
        if (f.stillRunning) problems.push(`${tag} ${f.type} animation never finished`);
        if (f.type === "line" && f.spread < f.area * 0.9) problems.push(`${tag} line points bunched: ${f.spread} of ${f.area}`);
        if (f.type === "bar" && f.barWidths.some((w) => w < f.area * 0.5)) problems.push(`${tag} bars too short: ${f.barWidths}`);
      }

      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        menuShown: getComputedStyle(document.querySelector(".topbar-menu")).display !== "none",
        statHeights: [...document.querySelectorAll(".stat")].map((e) => Math.round(e.getBoundingClientRect().height)),
        iconSizes: [...document.querySelectorAll(".stat-icon")].map((e) => { const r = e.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; }),
      }));
      console.log(tag, JSON.stringify(layout));
      if (layout.overflow > 0) problems.push(`${tag} sideways overflow ${layout.overflow}px`);
      if (layout.menuShown !== (size.name === "phone")) problems.push(`${tag} menu button wrong: ${layout.menuShown}`);
      if (new Set(layout.iconSizes).size !== 1) problems.push(`${tag} icons differ: ${layout.iconSizes}`);

      await page.screenshot({ path: path.join(out, `dashboard-${theme}-${size.name}.png`), fullPage: true });
      await context.close();
    }
  }

  await browser.close();
  console.log(problems.length ? "PROBLEMS:\n" + problems.join("\n") : "ALL CHECKS PASSED");
})().catch((e) => { console.error("SCRIPT FAILED", e); process.exit(1); });
