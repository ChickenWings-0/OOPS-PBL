// Drives the real site in Chrome and checks how it behaves.
// node behave.js <base url> <output folder>
const puppeteer = require("puppeteer-core");
const path = require("path");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const base = process.argv[2];
const out = process.argv[3];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
function check(name, ok, detail) {
  console.log((ok ? "ok   " : "FAIL ") + name + (ok ? "" : "  -> " + JSON.stringify(detail)));
  if (!ok) failed++;
}

async function newPage(browser, width, height, opts = {}) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.bringToFront();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !opts.quiet && !m.text().startsWith("Failed to load resource")) page.errors.push(m.text()); });
  if (opts.offline) {
    await page.setRequestInterception(true);
    page.on("request", (r) => (/jsdelivr|googleapis|gstatic/.test(r.url()) ? r.abort() : r.continue()));
  }
  return page;
}

async function signIn(page, user, pass) {
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[name=username]");
  await page.type("input[name=username]", user);
  await page.type("input[name=password]", pass);
  await page.click("button[type=submit]");
}

async function settle(page) {
  await page.waitForSelector(".stat");
  await page.evaluate(async () => {
    const pause = (ms) => new Promise((r) => setTimeout(r, ms));
    await pause(50);
    for (let i = 0; i < 40 && typeof Chart !== "undefined" && Charts.live.some((e) => Chart.animator.running(e.chart)); i++) await pause(100);
  });
}

const text = (page, selector) => page.$eval(selector, (e) => e.textContent.trim());

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });

  // ----- Login errors come from C++ -----
  let page = await newPage(browser, 1280, 800, { quiet: true });
  await signIn(page, "admin", "wrong");
  await page.waitForSelector(".form-error:not([hidden])");
  check("login: wrong password shows the C++ message", (await text(page, ".form-error")) === "Wrong username or password.", await text(page, ".form-error"));
  await page.screenshot({ path: path.join(out, "login-error.png") });
  check("login: no token stored after failure", (await page.evaluate(() => sessionStorage.getItem("token"))) === null);

  // ----- Dashboard content -----
  page = await newPage(browser, 1280, 800);
  await signIn(page, "admin", "admin123");
  await settle(page);
  const stats = await page.$$eval(".stat", (cards) => cards.map((c) => c.innerText.replace(/\n+/g, " | ")));
  console.log("     cards:", JSON.stringify(stats));
  check("W50 dashboard shows 10 students", stats[0].includes("10"), stats);
  check("W50 dashboard shows 4 subjects", stats[1].includes("4"), stats);
  check("W50 dashboard shows 4 defaulter students", stats[3].includes("4") && stats[3].includes("5 entries"), stats);
  check("W51 today's card shows the last marked day", stats[2].includes("Not marked") && stats[2].includes("80.00%, 03 Nov"), stats);
  check("token kept in sessionStorage only", await page.evaluate(() => sessionStorage.getItem("token").length === 32 && localStorage.getItem("token") === null));
  check("admin sees Teachers in the sidebar", await page.$eval(".nav", (n) => n.innerText.includes("Teachers")));

  // ----- Theme -----
  const before = await page.evaluate(() => ({ theme: Theme.current(), line: Charts.live[0].chart.data.datasets[0].borderColor, bg: getComputedStyle(document.body).backgroundColor }));
  const toggle = await page.$('.topbar [aria-label="Switch theme"]');
  await toggle.click();
  await wait(700);
  const after = await page.evaluate(() => ({ theme: Theme.current(), line: Charts.live[0].chart.data.datasets[0].borderColor, bg: getComputedStyle(document.body).backgroundColor, charts: Charts.live.length }));
  check("W52 toggle changes the theme and page colour", before.theme !== after.theme && before.bg !== after.bg, { before, after });
  check("W52 toggle redraws charts in the new colours", before.line !== after.line && after.charts === 2, { before, after });
  await page.reload({ waitUntil: "domcontentloaded" });
  await settle(page);
  check("W52 theme stays after reload", (await page.evaluate(() => Theme.current())) === after.theme);
  check("reload stays logged in", (await page.$(".stat")) !== null);
  check("W52 only the theme is in localStorage", await page.evaluate(() => Object.keys(localStorage).join() === "theme"));

  // ----- Tooltip, table view -----
  const box = await (await page.$("canvas")).boundingBox();
  await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.5);
  await wait(500);
  const tip = await page.evaluate(() => { const t = Charts.live[0].chart.tooltip; return { opacity: t.opacity, title: t.title, body: t.body.map((b) => b.lines.concat(b.after)) }; });
  console.log("     tooltip:", JSON.stringify(tip));
  check("tooltip shows server values on hover", tip.opacity > 0 && tip.title[0].endsWith("-2026") && JSON.stringify(tip.body).includes("present"), tip);
  await page.screenshot({ path: path.join(out, "hover-tooltip.png") });
  await page.mouse.move(5, 5);

  await page.click('[aria-label="Show table"]');
  const rows = await page.$$eval(".table tbody tr", (r) => r.map((x) => x.innerText.replace(/\s+/g, " ")));
  console.log("     first table row:", rows[0]);
  check("table view shows every marked day", rows.length === 6 && rows[0].includes("26-10-2026") && rows[0].includes("80.00%"), rows);
  await page.screenshot({ path: path.join(out, "table-view.png") });
  await page.click('[aria-label="Show chart"]');
  await wait(200);
  check("back to the chart", (await page.$("canvas")) !== null);

  // ----- Other pages, user menu, password dialog -----
  await page.click('a[data-hash="students"]');
  await wait(150);
  check("other pages show a clear placeholder", (await text(page, ".empty-title")) === "Students is coming next", await text(page, ".empty-title"));
  check("leaving the page removes its charts", await page.evaluate(() => Charts.live.length === 0));
  check("sidebar highlights the page", (await text(page, ".nav-item.active")) === "Students");
  check("page title follows", (await text(page, ".topbar-title")) === "Students");
  await page.click('a[data-hash="dashboard"]');
  await settle(page);

  await page.click(".user-button");
  check("user menu opens", await page.$eval(".user-menu", (m) => !m.hidden));
  await page.keyboard.press("Escape");
  check("Esc closes the user menu", await page.$eval(".user-menu", (m) => m.hidden));
  await page.click(".user-button");
  await page.evaluate(() => [...document.querySelectorAll(".user-menu button")].find((b) => b.textContent.includes("Change")).click());
  await page.waitForSelector("dialog[open]");
  check("W57 focus moves into the dialog", await page.evaluate(() => document.querySelector("dialog").contains(document.activeElement)));
  await page.click('dialog button[type="submit"]');
  await page.waitForSelector("dialog .field.has-error");
  check("password dialog: C++ error under the right field",
    (await text(page, 'dialog [data-field="currentPassword"] .field-error')) === "Wrong password.");
  await page.screenshot({ path: path.join(out, "password-dialog.png") });
  await page.keyboard.press("Escape");
  await wait(100);
  check("Esc closes the dialog", (await page.$("dialog")) === null);
  check("no script errors on the admin session", page.errors.length === 0, page.errors);

  // ----- Session expiry -----
  await page.evaluate(() => sessionStorage.setItem("token", "0".repeat(32)));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".form-error:not([hidden])");
  check("W56 an old token returns to login with a message", (await text(page, ".form-error")).includes("session has ended"), await text(page, ".form-error"));

  // ----- Logout -----
  page = await newPage(browser, 1280, 800);
  await signIn(page, "admin", "admin123");
  await settle(page);
  const token = await page.evaluate(() => sessionStorage.getItem("token"));
  await page.click(".user-button");
  await page.evaluate(() => [...document.querySelectorAll(".user-menu button")].find((b) => b.textContent.includes("Log out")).click());
  await page.waitForSelector("input[name=username]");
  check("logout forgets the token", (await page.evaluate(() => sessionStorage.getItem("token"))) === null);
  const stillWorks = await page.evaluate(async (t) => (await fetch("/api/me", { headers: { Authorization: "Bearer " + t } })).status, token);
  check("logout ends the session on the server", stillWorks === 401, stillWorks);

  // ----- Teacher -----
  page = await newPage(browser, 1280, 800);
  await signIn(page, "teacher1", "pass123");
  await settle(page);
  check("teacher does not see Teachers", !(await page.$eval(".nav", (n) => n.innerText.includes("Teachers"))));
  check("teacher sees their own name", (await text(page, ".user-name")) === "Neha Kapoor", await text(page, ".user-name"));
  check("avatar initials come from the server", (await text(page, ".avatar")) === "NK", await text(page, ".avatar"));

  // ----- Phone width -----
  page = await newPage(browser, 360, 740);
  await signIn(page, "admin", "admin123");
  await settle(page);
  check("W53 no sideways scrolling at 360 px", await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  const hidden = await page.$eval(".sidebar", (s) => s.getBoundingClientRect().right <= 0 || getComputedStyle(s).visibility === "hidden");
  check("W53 sidebar is hidden on a phone", hidden);
  await page.click(".topbar-menu");
  await wait(350);
  check("W53 menu button opens the drawer", await page.$eval(".sidebar", (s) => s.getBoundingClientRect().left === 0));
  await page.screenshot({ path: path.join(out, "phone-drawer.png") });
  await page.click('a[data-hash="defaulters"]');
  await wait(350);
  check("W53 choosing a page closes the drawer", await page.$eval(".shell", (s) => !s.classList.contains("drawer-open")));
  await page.setViewport({ width: 899, height: 800 });
  await wait(100);
  check("drawer mode at 899 px", await page.$eval(".sidebar", (s) => getComputedStyle(s).position === "fixed"));
  await page.setViewport({ width: 900, height: 800 });
  await wait(100);
  check("full sidebar at 900 px", await page.$eval(".sidebar", (s) => getComputedStyle(s).position === "sticky"));

  // ----- No internet -----
  page = await newPage(browser, 1280, 800, { offline: true, quiet: true });
  await signIn(page, "admin", "admin123");
  await page.waitForSelector(".stat");
  await wait(200);
  check("W59 without Chart.js the chart area explains why", (await text(page, ".chart-note")).includes("internet"), await text(page, ".chart-note"));
  await page.click('[aria-label="Show table"]');
  check("W59 tables still work without internet", (await page.$$(".table tbody tr")).length === 6);
  await page.screenshot({ path: path.join(out, "offline.png") });
  check("no script errors offline", page.errors.length === 0, page.errors);

  await browser.close();
  console.log(failed ? `FAILED: ${failed}` : "ALL BEHAVIOUR CHECKS PASSED");
})().catch((e) => { console.error("SCRIPT FAILED", e); process.exit(1); });
