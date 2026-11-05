// screenshots.js
// Screenshots every page in both themes, at desktop and phone width, using the
// real date from the server. Start a server on a COPY of the sample data first:
// this script saves attendance for today, so the dashboard has something to show.
//
//   node screenshots.js <url> <folder> [png or webp]

const puppeteer = require("puppeteer-core");
const path = require("path");

const [, , base, out, format = "png"] = process.argv;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const PAGES = ["dashboard", "students", "subjects", "teachers", "mark/MA201B", "report", "report/3", "defaulters", "daily", "monthly"];
const SIZES = [["desktop", 1440, 900, 1], ["phone", 390, 844, 2]];
const THEMES = ["light", "dark"];

// Saves today's attendance for some subjects through the real API.
async function markToday(token) {
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const me = await (await fetch(`${base}api/me`, { headers })).json();
  const date = me.today.dateIso;

  for (const [subject, absent] of [["CS201A", [3, 6]], ["MA201A", [3]], ["CS201B", [9]]]) {
    const query = new URLSearchParams({ subject, date }).toString();
    const sheet = await (await fetch(`${base}api/attendance/sheet?${query}`, { headers })).json();
    if (sheet.alreadyMarked) {
      continue;
    }
    const marks = sheet.students.map((s) => ({ studentId: s.id, status: absent.includes(s.id) ? "A" : "P" }));
    await fetch(`${base}api/attendance`, { method: "POST", headers, body: JSON.stringify({ subject, date, marks }) });
  }
}

// Waits for animations to end, so numbers, rings, and charts are in place.
async function settle(page) {
  await wait(1200);
  await page.evaluate(async () => {
    const pause = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 40 && typeof Chart !== "undefined" && Charts.live.some((e) => Chart.animator.running(e.chart)); i++) await pause(100);
  });
}

// Takes the picture. The window grows to the whole page first, so bars fixed
// to the screen appear at the bottom, where a user sees them.
async function shoot(page, name, size, width, height, scale) {
  const options = { path: path.join(out, `${name}.${format}`), type: format };
  if (format === "webp") {
    options.quality = 80;
  }

  const full = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewport({ width, height: Math.max(height, full), deviceScaleFactor: scale });
  await wait(900);
  await page.screenshot(options);
  await page.setViewport({ width, height, deviceScaleFactor: scale });
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--no-sandbox"] });
  const problems = [];

  for (const [mode, seeded] of [["before", false], ["after", true]]) {
    for (const theme of THEMES) {
      for (const [size, width, height, scale] of SIZES) {
        const context = await browser.createBrowserContext();
        const page = await context.newPage();
        await page.bringToFront();
        await page.setViewport({ width, height, deviceScaleFactor: scale });
        await page.evaluateOnNewDocument((t) => localStorage.setItem("theme", t), theme);
        page.on("pageerror", (e) => problems.push(`${theme}/${size}: ${e.message}`));
        page.on("console", (m) => { if (m.type() === "error" && !m.text().startsWith("Failed to load")) problems.push(`${theme}/${size}: ${m.text()}`); });

        await page.goto(base, { waitUntil: "networkidle0" });
        await page.waitForSelector("input[name=username]");
        await wait(700);
        if (seeded) {
          await shoot(page, `login-${theme}-${size}`, size, width, height, scale);
        }
        await page.type("input[name=username]", "admin");
        await page.type("input[name=password]", "admin123");
        await page.click("button[type=submit]");
        await page.waitForSelector(".head-title");

        if (!seeded) {
          await page.waitForSelector("[data-stat=today]");
          await settle(page);
          await shoot(page, `dashboard-unmarked-${theme}-${size}`, size, width, height, scale);
          await context.close();
          continue;
        }

        await markToday(await page.evaluate(() => sessionStorage.getItem("token")));
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForSelector(".head-title");

        for (const name of PAGES) {
          await page.evaluate((n) => { location.hash = "#/" + n; }, name);
          await page.waitForFunction(() => !document.querySelector(".skeleton"));
          await settle(page);

          // The mark page is shown part way through a register.
          if (name.startsWith("mark")) {
            await page.evaluate(() => {
              const boxes = document.querySelectorAll(".kid-box");
              boxes[1].click();
            });
            await wait(400);
          }

          const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          if (over > 0) problems.push(`${theme}/${size}/${name}: overflow ${over}`);
          await shoot(page, `${name.split("/").join("-").replace("-MA201B", "")}-${theme}-${size}`, size, width, height, scale);
        }
        await context.close();
      }
    }
  }

  await browser.close();
  console.log(problems.length ? problems.join("\n") : "no script errors or overflow");
})().catch((e) => { console.error("SCRIPT FAILED", e); process.exit(1); });
