// screenshots.js
// Screenshots pages in both themes at desktop and phone width.
//   node screenshots.js <url> <folder> <comma separated pages>
const puppeteer = require("puppeteer-core");
const path = require("path");
const [, , base, out, pages] = process.argv;

(async () => {
  const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--no-sandbox"] });
  const errors = [];

  for (const theme of ["light", "dark"]) {
    for (const [tag, width, height, scale] of [["desktop", 1440, 900, 1], ["phone", 390, 844, 2]]) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      await page.bringToFront();
      await page.setViewport({ width, height, deviceScaleFactor: scale });
      await page.evaluateOnNewDocument((t) => localStorage.setItem("theme", t), theme);
      page.on("pageerror", (e) => errors.push(`${theme}/${tag}: ${e.message}`));
      page.on("console", (m) => { if (m.type() === "error" && !m.text().startsWith("Failed to load")) errors.push(`${theme}/${tag}: ${m.text()}`); });

      await page.goto(base, { waitUntil: "networkidle0" });
      await page.waitForSelector("input[name=username]");
      await page.screenshot({ path: path.join(out, `login-${theme}-${tag}.png`) });
      await page.type("input[name=username]", "admin");
      await page.type("input[name=password]", "admin123");
      await page.click("button[type=submit]");
      await page.waitForSelector(".topbar-title");

      for (const name of (pages || "dashboard").split(",")) {
        await page.evaluate((n) => { location.hash = "#/" + n; }, name);
        await new Promise((r) => setTimeout(r, 500));
        await page.evaluate(async () => {
          const pause = (ms) => new Promise((r) => setTimeout(r, ms));
          for (let i = 0; i < 40 && typeof Chart !== "undefined" && Charts.live.some((e) => Chart.animator.running(e.chart)); i++) await pause(100);
        });
        const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (over > 0) errors.push(`${theme}/${tag}/${name}: overflow ${over}`);
        await page.screenshot({ path: path.join(out, `${name.replace("/", "-")}-${theme}-${tag}.png`), fullPage: true });
      }
      await context.close();
    }
  }

  await browser.close();
  console.log(errors.length ? errors.join("\n") : "no script errors or overflow");
})().catch((e) => { console.error("SCRIPT FAILED", e); process.exit(1); });
