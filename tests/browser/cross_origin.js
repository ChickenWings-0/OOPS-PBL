// cross_origin.js
// Tests the frontend and the API on different sites, as on Vercel and Render.
//
//   node cross_origin.js <site url> <api url> <proxy url> <blocked site url>
//
// <site url> serves web/ from another port, with config.js pointing at the proxy.
// <proxy url> runs tests/cold_start_proxy.py in front of the C++ server, which
// was started with ALLOWED_ORIGIN set to <site url> only.

const puppeteer = require("puppeteer-core");

const [, , site, api, proxy, blocked] = process.argv;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let failed = 0;
let passed = 0;
function check(name, ok, detail) {
  console.log((ok ? "ok   " : "FAIL ") + name + (ok ? "" : "  -> " + JSON.stringify(detail)));
  if (ok) passed++; else failed++;
}

const text = (page, selector) => page.$eval(selector, (e) => e.textContent.trim());
const noticeShown = (page) => page.evaluate(() => {
  const box = document.getElementById("wake-notice");
  return Boolean(box) && !box.hidden;
});
const lastToast = (page) => page.$$eval(".toast", (t) => (t.length ? t[t.length - 1].textContent.trim() : ""));

async function control(path) {
  await fetch(proxy + path);
}

async function openSite(browser) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.bringToFront();
  await page.setViewport({ width: 1280, height: 800 });
  page.problems = [];
  page.on("pageerror", (e) => page.problems.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /CORS|Content Security Policy/.test(m.text())) page.problems.push(m.text());
  });
  return page;
}

async function login(page) {
  await page.waitForSelector("input[name=username]");
  await page.type("input[name=username]", "admin");
  await page.type("input[name=password]", "admin123");
  await page.click("button[type=submit]");
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--no-sandbox"] });

  // ----- Normal use across two sites -----
  let page = await openSite(browser);
  const calls = [];
  page.on("request", (r) => { if (r.url().includes("/api/")) calls.push(`${r.method()} ${r.url()}`); });
  await page.goto(site, { waitUntil: "networkidle0" });

  check("W74 the page and the API are different origins", new URL(site).origin !== new URL(proxy).origin);
  check("W74 API_BASE points at the API", (await page.evaluate(() => API_BASE)) === proxy.replace(/\/$/, ""), await page.evaluate(() => API_BASE));

  await login(page);
  await page.waitForSelector(".tally-cell");
  await wait(600);
  check("W74 login and the dashboard work cross-origin", (await text(page, ".tally-cell")).includes("10"));
  check("W74 every API call goes to API_BASE", calls.length > 2 && calls.every((c) => c.includes(new URL(proxy).host)), calls.slice(0, 4));
  check("W74 the token is in sessionStorage, and no cookie is set", await page.evaluate(() => sessionStorage.getItem("token").length === 32 && document.cookie === ""));

  await page.evaluate(() => { location.hash = "#/students"; });
  await wait(500);
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent === "Add student").click());
  await page.waitForSelector("dialog[open]");
  await page.type('dialog [name="rollNo"]', "90118015625");
  await page.type('dialog [name="name"]', "Cross Origin");
  await page.type('dialog [name="className"]', "AIML-A");
  await page.click('dialog button[type="submit"]');
  await wait(400);
  check("W75 C++ error messages reach the page", (await text(page, 'dialog [data-field="rollNo"] .field-error')) === "This roll number already exists.");
  await page.$eval('dialog [name="rollNo"]', (e) => { e.value = ""; });
  await page.type('dialog [name="rollNo"]', "98018015625");
  await page.click('dialog button[type="submit"]');
  await wait(500);
  check("W75 POST works cross-origin", (await lastToast(page)) === "Student added with internal ID 11.", await lastToast(page));

  await page.evaluate(() => [...document.querySelectorAll("tbody tr")].find((r) => r.innerText.includes("98018015625")).querySelector("button").click());
  await page.waitForSelector("dialog[open]");
  await wait(100);
  await page.$eval('dialog [name="name"]', (e) => { e.value = ""; });
  await page.type('dialog [name="name"]', "Cross Edited");
  await page.click('dialog button[type="submit"]');
  await wait(500);
  check("W75 PUT works cross-origin", (await lastToast(page)) === "Student updated.", await lastToast(page));

  await page.evaluate(() => [...document.querySelectorAll("tbody tr")].find((r) => r.innerText.includes("98018015625")).querySelector(".is-danger").click());
  await page.waitForSelector("dialog[open]");
  await page.evaluate(() => [...document.querySelectorAll("dialog button")].find((b) => b.textContent === "Delete student").click());
  await wait(500);
  check("W75 DELETE works cross-origin", (await lastToast(page)) === "Student deleted.", await lastToast(page));
  check("W75 no CORS or CSP problems in the console", page.problems.length === 0, page.problems);

  // ----- A site that is not allowed -----
  const stranger = await openSite(browser);
  await stranger.goto(blocked, { waitUntil: "domcontentloaded" });
  const outcome = await stranger.evaluate(async (url) => {
    try {
      const reply = await fetch(url + "/api/health");
      return "read " + reply.status;
    } catch (error) {
      return "blocked";
    }
  }, api.replace(/\/$/, ""));
  check("W76 the browser blocks a site that is not allowed", outcome === "blocked", outcome);

  // ----- Cold start: asleep when the page opens -----
  page = await openSite(browser);
  await control("/__sleep?seconds=11");
  await page.goto(site, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[name=username]");
  await wait(1500);
  check("W77 a sleeping server shows the waking message", await noticeShown(page));
  check("W77 with the agreed words", (await text(page, "#wake-notice")) === "Waking up the server, this can take up to a minute...", await text(page, "#wake-notice"));
  check("W77 and no error", (await page.$(".form-error:not([hidden])")) === null);
  await page.screenshot({ path: process.env.SHOT_DIR + "/waking-up.png" });
  await login(page);
  await page.waitForSelector(".tally-cell", { timeout: 30000 });
  check("W77 login retries by itself after waking", (await text(page, ".tally-cell")).includes("10"));
  await wait(400);
  check("W77 the message goes away", !(await noticeShown(page)));

  // ----- Cold start: the host holds the request instead of failing it -----
  await page.evaluate(() => { location.hash = "#/subjects"; });
  await wait(500);
  await control("/__hold?seconds=6");
  await page.evaluate(() => { location.hash = "#/defaulters"; });
  await wait(4600);
  check("W78 a slow reply shows the message after a few seconds", await noticeShown(page));
  await wait(2600);
  check("W78 the page then loads", (await page.$$(".stamp.is-bad")).length === 5);
  check("W78 the message goes away", !(await noticeShown(page)));

  // ----- Cold start: a read while asleep -----
  await control("/__sleep?seconds=6");
  await page.evaluate(() => { location.hash = "#/subjects"; });
  await wait(1200);
  check("W79 a read waits for the server", await noticeShown(page));
  await wait(9000);
  check("W79 and retries by itself", (await page.$$(".table tbody tr")).length === 4, await page.$$eval(".table tbody tr", (r) => r.length));

  // ----- Cold start: a save while asleep -----
  await page.evaluate(() => { location.hash = "#/students"; });
  await wait(600);
  const rowsBefore = await page.$$eval(".table tbody tr", (r) => r.length);
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent === "Add student").click());
  await page.waitForSelector("dialog[open]");
  await page.type('dialog [name="rollNo"]', "98118015625");
  await page.type('dialog [name="name"]', "Saved While Asleep");
  await page.type('dialog [name="className"]', "AIML-A");
  await control("/__sleep?seconds=5");
  await page.click('dialog button[type="submit"]');
  await wait(9000);
  check("W80 a save is not repeated by itself", (await text(page, ".form-error")) === "The server is awake now. Please save again.", await page.$eval(".modal-body", (e) => e.innerText));
  await page.click('dialog button[type="submit"]');
  await wait(600);
  check("W80 saving again adds exactly one student", (await page.$$eval(".table tbody tr", (r) => r.length)) === rowsBefore + 1, await lastToast(page));

  await browser.close();
  console.log(failed ? `FAILED: ${failed} of ${passed + failed}` : `ALL ${passed} CROSS-ORIGIN CHECKS PASSED`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("SCRIPT FAILED", e); process.exit(1); });
