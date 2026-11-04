// shoot.js
// Screenshots the three mockups. Run a static server at the project root first.
//   node shoot.js http://127.0.0.1:18850/docs/design-directions/ <output folder>
const path = require("path");
const puppeteer = require(process.env.PUPPETEER_PATH || "puppeteer-core");

const [, , base, out] = process.argv;

(async () => {
  const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--no-sandbox"] });
  const problems = [];

  for (const direction of ["a", "b", "c"]) {
    for (const name of ["dashboard", "mark"]) {
      for (const theme of ["light", "dark"]) {
        for (const [size, width, height, scale] of [["desktop", 1440, 900, 1], ["phone", 390, 844, 2]]) {
          const page = await browser.newPage();
          await page.bringToFront();
          await page.setViewport({ width, height, deviceScaleFactor: scale });
          page.on("pageerror", (e) => problems.push(`${direction}/${name}: ${e.message}`));
          await page.goto(`${base}${direction}/${name}.html?theme=${theme}`, { waitUntil: "networkidle0" });
          await page.evaluate(() => document.fonts.ready);
          await new Promise((r) => setTimeout(r, 250));
          const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          if (over > 0) problems.push(`${direction}/${name}/${theme}/${size}: overflow ${over}`);
          // Grow the window to the whole page, so bars fixed to the bottom of the
          // screen appear at the bottom of the picture, where a user sees them.
          if (size === "phone") {
            const full = await page.evaluate(() => document.documentElement.scrollHeight);
            await page.setViewport({ width, height: Math.max(height, full), deviceScaleFactor: scale });
            await new Promise((r) => setTimeout(r, 250));
          }
          await page.screenshot({ path: path.join(out, `${direction}-${name}-${theme}-${size}.webp`), type: "webp", quality: 82 });
          await page.close();
        }
      }
    }
  }

  await browser.close();
  console.log(problems.length ? problems.join("\n") : "no script errors or overflow");
})().catch((e) => { console.error("SCRIPT FAILED", e); process.exit(1); });
