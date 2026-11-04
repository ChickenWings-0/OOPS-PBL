// behaviour.js
// Uses the real site in Chrome, the way a teacher would, and checks what happens.
// Start a server on a COPY of the sample data first, because these tests change it.
//
//   npm install            (once, in this folder)
//   node behaviour.js http://127.0.0.1:18800/ <folder for screenshots>

const puppeteer = require("puppeteer-core");
const path = require("path");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const base = process.argv[2];
const out = process.argv[3];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let failed = 0;
let passed = 0;
function check(name, ok, detail) {
  console.log((ok ? "ok   " : "FAIL ") + name + (ok ? "" : "  -> " + JSON.stringify(detail)));
  if (ok) passed++; else failed++;
}

async function newPage(browser, width, height, options = {}) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.bringToFront();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !options.quiet && !m.text().startsWith("Failed to load resource")) page.errors.push(m.text());
  });
  if (options.offline) {
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

// Waits for the dashboard, and for its charts to finish animating.
async function settle(page) {
  await page.waitForSelector(".tally-cell");
  await page.evaluate(async () => {
    const pause = (ms) => new Promise((r) => setTimeout(r, ms));
    await pause(50);
    for (let i = 0; i < 40 && typeof Chart !== "undefined" && Charts.live.some((e) => Chart.animator.running(e.chart)); i++) await pause(100);
  });
}

async function go(page, name) {
  await page.evaluate((n) => { location.hash = "#/" + n; }, name);
  await wait(450);
}

const text = (page, selector) => page.$eval(selector, (e) => e.textContent.trim());
const lastToast = (page) => page.$$eval(".toast", (t) => (t.length ? t[t.length - 1].textContent.trim() : ""));
const rows = (page) => page.$$eval(".table tbody tr", (r) => r.map((x) => x.innerText.replace(/\s+/g, " ").trim()));

async function clickButton(page, label, scope = "body") {
  const found = await page.evaluate((wanted, within) => {
    const button = [...document.querySelector(within).querySelectorAll("button, a")].find((b) => b.textContent.trim() === wanted);
    if (button) button.click();
    return Boolean(button);
  }, label, scope);
  if (!found) throw new Error("no button: " + label);
}

async function fill(page, name, value) {
  await page.$eval(`dialog [name="${name}"]`, (e) => { e.value = ""; });
  await page.type(`dialog [name="${name}"]`, value);
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });

  // ----- Login -----
  let page = await newPage(browser, 1280, 800, { quiet: true });
  await signIn(page, "admin", "wrong");
  await page.waitForSelector(".form-error:not([hidden])");
  check("login: the wrong password message comes from C++", (await text(page, ".form-error")) === "Wrong username or password.");
  await page.screenshot({ path: path.join(out, "login-error.png") });
  check("login: no token after a failure", (await page.evaluate(() => sessionStorage.getItem("token"))) === null);

  // ----- Dashboard -----
  page = await newPage(browser, 1280, 800);
  await signIn(page, "admin", "admin123");
  await settle(page);
  const cells = await page.$$eval(".tally-cell", (c) => c.map((x) => x.innerText.replace(/\s+/g, " ")));
  console.log("     tally:", JSON.stringify(cells));
  check("W50 ten students in two classes", cells[0].includes("10") && cells[0].includes("2 classes"), cells);
  check("W50 four subjects, overall from C++", cells[1].includes("4") && cells[1].includes("82.00% overall"), cells);
  check("W50 four defaulter students", cells[3].includes("4") && cells[3].includes("5 below 75%"), cells);
  check("W51 today shows the last marked day", cells[2].includes("Not marked") && cells[2].includes("80.00%, 03 Nov"), cells);
  check("needs attention lists the lowest first", (await rows(page))[0].includes("50.00%"), await rows(page));
  check("recent marks are drawn as cells", (await page.$$(".mark")).length > 10);
  check("token is in sessionStorage only", await page.evaluate(() => sessionStorage.getItem("token").length === 32 && localStorage.getItem("token") === null));

  const facts = await page.evaluate(() => Charts.live.map(({ chart }) => {
    const points = chart.getDatasetMeta(0).data;
    return { type: chart.config.type, area: chart.chartArea.width, spread: Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x)) };
  }));
  check("the line chart really spans its area", facts[0].spread > facts[0].area * 0.9, facts);

  // ----- Theme -----
  const before = await page.evaluate(() => ({ theme: Theme.current(), line: Charts.live[0].chart.data.datasets[0].borderColor, bg: getComputedStyle(document.body).backgroundColor }));
  await page.click('.topbar [aria-label="Switch theme"]');
  await wait(600);
  const after = await page.evaluate(() => ({ theme: Theme.current(), line: Charts.live[0].chart.data.datasets[0].borderColor, bg: getComputedStyle(document.body).backgroundColor, charts: Charts.live.length }));
  check("W52 the toggle changes the theme and page colour", before.theme !== after.theme && before.bg !== after.bg, { before, after });
  check("W52 the toggle redraws charts in new colours", before.line !== after.line && after.charts === 2, { before, after });
  await page.reload({ waitUntil: "domcontentloaded" });
  await settle(page);
  check("W52 the theme stays after reload", (await page.evaluate(() => Theme.current())) === after.theme);
  check("reload stays logged in", (await page.$(".tally-cell")) !== null);
  check("W52 only the theme is in localStorage", await page.evaluate(() => Object.keys(localStorage).join() === "theme"));

  // ----- Tooltip, table view -----
  const box = await (await page.$("canvas")).boundingBox();
  await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.5);
  await wait(450);
  const tip = await page.evaluate(() => { const t = Charts.live[0].chart.tooltip; return { opacity: t.opacity, title: t.title, body: t.body.map((b) => b.lines.concat(b.after)) }; });
  check("tooltip shows server values on hover", tip.opacity > 0 && tip.title[0].endsWith("-2026") && JSON.stringify(tip.body).includes("present"), tip);
  await page.screenshot({ path: path.join(out, "hover-tooltip.png") });
  await page.mouse.move(5, 5);
  await clickButton(page, "Table", ".split");
  await wait(100);
  check("table view shows every marked day", (await page.$$eval(".split .table tbody tr", (r) => r.length)) === 6);
  await clickButton(page, "Chart", ".split");
  await wait(200);

  // ----- Students -----
  page = await newPage(browser, 1280, 800);
  await signIn(page, "admin", "admin123");
  await settle(page);
  await go(page, "students");
  check("students page lists everyone", (await rows(page)).length === 10);
  check("first sort is by roll number", (await rows(page))[0].includes("90118015625"));

  await clickButton(page, "Name");
  await wait(250);
  check("W15 sorting by name comes from the server", (await rows(page))[0].includes("Aarav Sharma"), (await rows(page))[0]);
  await page.evaluate(() => [...document.querySelectorAll("th button")].find((b) => b.textContent.startsWith("Name")).click());
  await wait(250);
  check("W15 pressing again reverses it", (await rows(page))[0].includes("Vivaan Singh") || (await rows(page))[0].includes("Tara Bose"), (await rows(page))[0]);

  await page.type("#student-search", "sha");
  await wait(500);
  const found = await rows(page);
  check("W14 search shows matches", found.length === 2 && found.join().includes("Aarav Sharma") && found.join().includes("Isha Nair"), found);
  await page.$eval("#student-search", (e) => { e.value = ""; });
  await page.type("#student-search", "zzzz");
  await wait(500);
  check("search with no match has an empty state", (await text(page, ".empty-title")) === "No matching students");
  await go(page, "dashboard");
  await settle(page);
  await go(page, "students");

  await clickButton(page, "Add student");
  await page.waitForSelector("dialog[open]");
  check("W57 focus moves into the dialog", await page.evaluate(() => document.querySelector("dialog").contains(document.activeElement)));
  await page.click('dialog button[type="submit"]');
  await page.waitForSelector("dialog .field.has-error");
  check("W12 an empty form shows the C++ message under the field",
    (await text(page, 'dialog [data-field="rollNo"] .field-error')).startsWith("Invalid roll number"));
  await fill(page, "rollNo", "90118015625");
  await fill(page, "name", "Second Copy");
  await fill(page, "className", "AIML-A");
  await page.click('dialog button[type="submit"]');
  await wait(300);
  check("W11 a duplicate shows under the roll number field",
    (await text(page, 'dialog [data-field="rollNo"] .field-error')) === "This roll number already exists.");
  await page.screenshot({ path: path.join(out, "student-form-error.png") });

  await fill(page, "rollNo", "92018015625");
  await fill(page, "name", "Diya Verma");
  await page.click('dialog button[type="submit"]');
  await wait(300);
  check("W13 the same name asks first", (await page.$$eval("dialog[open] .modal-text", (t) => t.map((x) => x.textContent).join())).includes("already in AIML-A"));
  await clickButton(page, "Add anyway");
  await wait(500);
  check("W13 confirming adds the student", (await lastToast(page)) === "Student added with internal ID 11.", await lastToast(page));
  check("W55 saving shows a toast", (await page.$$(".toast")).length > 0);
  check("W10 the table shows the new student", (await rows(page)).length === 11);
  check("the dialogs are closed", (await page.$("dialog")) === null);

  await page.evaluate(() => [...document.querySelectorAll("tbody tr")].find((r) => r.innerText.includes("92018015625")).querySelector("button").click());
  await page.waitForSelector("dialog[open]");
  await wait(100);
  check("W16 the edit form shows the current values", (await page.$eval('dialog [name="name"]', (e) => e.value)) === "Diya Verma");
  await fill(page, "name", "Diya Second");
  await page.click('dialog button[type="submit"]');
  await wait(400);
  check("W16 editing saves", (await lastToast(page)) === "Student updated." && (await rows(page)).join().includes("Diya Second"));

  await page.evaluate(() => [...document.querySelectorAll("tbody tr")].find((r) => r.innerText.includes("92018015625")).querySelector(".is-danger").click());
  await page.waitForSelector("dialog[open]");
  check("W17 delete asks first", (await text(page, ".modal-text")).includes("cannot be undone"));
  await page.screenshot({ path: path.join(out, "delete-confirm.png") });
  await clickButton(page, "Cancel", "dialog");
  await wait(200);
  check("W17 cancel keeps the student", (await rows(page)).length === 11);
  await page.evaluate(() => [...document.querySelectorAll("tbody tr")].find((r) => r.innerText.includes("92018015625")).querySelector(".is-danger").click());
  await page.waitForSelector("dialog[open]");
  await clickButton(page, "Delete student", "dialog");
  await wait(400);
  check("W17 confirming deletes the student", (await rows(page)).length === 10 && (await lastToast(page)) === "Student deleted.");

  // ----- Subjects, and text that looks like HTML -----
  await go(page, "subjects");
  await clickButton(page, "Add subject");
  await page.waitForSelector("dialog[open]");
  await fill(page, "code", "XS1");
  await fill(page, "name", "<b>test</b><img src=x onerror=alert(1)>");
  await fill(page, "className", "AIML-B");
  await page.click('dialog button[type="submit"]');
  await wait(400);
  const bold = await page.$$eval(".table td b, .table td img", (e) => e.length);
  check("W58 a subject named like HTML shows as plain text", bold === 0 && (await rows(page)).join().includes("<b>test</b>"), await rows(page));

  // ----- Marking -----
  await go(page, "mark");
  await page.waitForSelector(".marking-row");
  const select = await page.$('select[name="subject"]');
  await select.select("CS201B");
  await page.waitForFunction(() => document.querySelectorAll(".marking-row").length === 4);
  await page.$eval('input[name="date"]', (e) => { e.value = "2026-10-28"; e.dispatchEvent(new Event("change")); });
  await wait(300);
  check("W20 choosing a subject lists only its class", (await page.$$(".marking-row")).length === 4);
  check("counter starts at everyone present", (await text(page, "#present-count")) === "4" && (await text(page, "#absent-count")) === "0");

  const requests = [];
  page.on("request", (r) => { if (r.url().includes("/api/")) requests.push(r.url()); });
  const boxes = await page.$$(".pa input");
  await boxes[1].click();
  await boxes[2].click();
  check("W21 the counter updates after each toggle", (await text(page, "#present-count")) === "2" && (await text(page, "#absent-count")) === "2");
  await wait(200);
  check("W21 toggling sends no request", requests.length === 0, requests);
  await page.screenshot({ path: path.join(out, "marking.png") });

  await clickButton(page, "Mark all present");
  check("W22 mark all present sets every toggle", (await text(page, "#absent-count")) === "0");
  await boxes[0].click();
  await clickButton(page, "Save attendance");
  await wait(500);
  check("W22 the totals after Save come from C++", (await lastToast(page)) === "Attendance saved. Present: 3, Absent: 1", await lastToast(page));
  check("W24 a marked session shows the notice", (await text(page, ".notice")).startsWith("Already marked"));
  check("W24 a marked session has no Save button", !(await page.$eval(".sheet", (s) => s.innerText.includes("Save attendance"))));

  const again = await page.$$(".pa input");
  await again[0].click();
  await wait(400);
  check("W26 correcting saves straight away", (await lastToast(page)) === "Attendance corrected.", await lastToast(page));
  check("W26 the counter follows the correction", (await text(page, "#present-count")) === "4");

  await page.$eval('input[name="date"]', (e) => { e.value = "2099-01-01"; e.dispatchEvent(new Event("change")); });
  await wait(300);
  check("W25 a future date shows the C++ message", (await text(page, ".empty-text")) === "The date cannot be in the future.");

  // A slow reply for an old choice must not replace a newer one.
  await page.setRequestInterception(true);
  const slowDown = async (r) => {
    if (r.url().includes("subject=CS201A")) await wait(600);
    r.continue();
  };
  page.on("request", slowDown);
  await page.$eval('input[name="date"]', (e) => { e.value = "2026-10-31"; });
  await select.select("CS201A");
  await wait(60);
  await select.select("MA201B");
  await wait(900);
  check("a slow old reply does not replace a newer one", (await text(page, ".sheet-title")).startsWith("MA201B"), await text(page, ".sheet-title"));
  page.off("request", slowDown);
  await page.setRequestInterception(false);

  // ----- Reports -----
  await go(page, "report");
  check("report page starts with a student list", (await rows(page)).length === 10);
  await page.evaluate(() => [...document.querySelectorAll(".person-name")].find((a) => a.textContent === "Diya Verma").click());
  await wait(450);
  const lines = await page.$$eval(".subject-row", (r) => r.map((x) => x.innerText.replace(/\s+/g, " ")));
  console.log("     report:", JSON.stringify(lines));
  check("W30 Diya's report matches", lines[0].includes("83.33%") && lines[1].includes("75.00%") && (await text(page, ".tally-value")) === "80.00%", lines);
  const colours = await page.$$eval(".meter-fill", (f) => f.map((x) => ({ good: x.classList.contains("is-good"), width: x.style.width })));
  check("W31 exactly 75% is green, with the word OK", colours[1].good && lines[1].includes("OK"), { colours, lines });
  await go(page, "report/3");
  const low = await page.$$eval(".meter-fill", (f) => f.map((x) => x.classList.contains("is-bad")));
  check("W31 below 75% is red, with words", low.every(Boolean) && (await text(page, ".subject-row")).includes("Below 75%"), low);

  await go(page, "defaulters");
  const defaulters = await rows(page);
  check("W33 the defaulters page has 5 entries", defaulters.length === 5 && defaulters[0].includes("50.00%"), defaulters);
  check("defaulters have red stamps", (await page.$$(".stamp.is-bad")).length === 5);

  await go(page, "daily");
  await wait(300);
  check("W34 daily report opens on the last marked day", (await page.$eval('input[name="date"]', (e) => e.value)) === "2026-11-03");
  check("W34 daily report has present and absent stamps", (await page.$$(".stamp.is-good")).length > 0 && (await page.$$(".stamp.is-bad")).length > 0);
  check("daily report draws its chart with a legend", await page.evaluate(() => Charts.live.length === 1 && Charts.live[0].chart.legend.options.display));
  await page.$eval('input[name="date"]', (e) => { e.value = "2026-11-01"; e.dispatchEvent(new Event("change")); });
  await wait(300);
  check("W34 a date with no data has an empty state", (await text(page, ".empty-title")) === "No attendance on this date");

  await go(page, "monthly");
  await wait(300);
  check("W35 monthly report shows the class", (await rows(page)).length >= 6, await rows(page));
  check("monthly report draws its chart", await page.evaluate(() => Charts.live.length === 1));
  await page.$eval('input[name="month"]', (e) => { e.value = "2026-01"; e.dispatchEvent(new Event("change")); });
  await wait(300);
  check("a month with no marks has an empty state", (await text(page, ".empty-title")) === "No attendance in this month");

  await go(page, "teachers");
  check("W19 admin sees the teachers", (await rows(page)).length === 2);
  check("no password on the teachers page", !(await page.$eval(".content", (c) => c.innerText)).includes("admin123"));
  await clickButton(page, "Add teacher");
  await page.waitForSelector("dialog[open]");
  await fill(page, "name", "Test Teacher");
  await fill(page, "username", "ab");
  await fill(page, "password", "goodpass");
  await page.click('dialog button[type="submit"]');
  await wait(300);
  check("add teacher shows C++ errors", (await text(page, 'dialog [data-field="username"] .field-error')).startsWith("Invalid username"));
  await fill(page, "username", "teacher9");
  await page.click('dialog button[type="submit"]');
  await wait(400);
  check("W19 the teacher is added", (await rows(page)).length === 3 && (await lastToast(page)) === "Teacher added.");
  check("no script errors in the whole session", page.errors.length === 0, page.errors);

  // ----- User menu and password -----
  await page.click(".user-button");
  check("user menu opens", await page.$eval(".user-menu", (m) => !m.hidden));
  await page.keyboard.press("Escape");
  check("Esc closes the user menu", await page.$eval(".user-menu", (m) => m.hidden));
  await page.click(".user-button");
  await clickButton(page, "Change password", ".user-menu");
  await page.waitForSelector("dialog[open]");
  await page.click('dialog button[type="submit"]');
  await page.waitForSelector("dialog .field.has-error");
  check("password dialog: the C++ error is under the right field", (await text(page, 'dialog [data-field="currentPassword"] .field-error')) === "Wrong password.");
  await page.keyboard.press("Escape");
  await wait(150);
  check("W57 Esc closes the dialog", (await page.$("dialog")) === null);

  // ----- Session expiry -----
  await page.evaluate(() => sessionStorage.setItem("token", "0".repeat(32)));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".form-error:not([hidden])");
  check("W56 an old token returns to login with a message", (await text(page, ".form-error")).includes("session has ended"), await text(page, ".form-error"));

  page = await newPage(browser, 1280, 800, { quiet: true });
  await signIn(page, "admin", "admin123");
  await settle(page);
  await page.evaluate(() => sessionStorage.setItem("token", "0".repeat(32)));
  await go(page, "students");
  await page.waitForSelector(".login-card");
  check("W56 expiry during use returns to login", (await text(page, ".form-error")).includes("session has ended"));

  // ----- Logout -----
  page = await newPage(browser, 1280, 800);
  await signIn(page, "admin", "admin123");
  await settle(page);
  const token = await page.evaluate(() => sessionStorage.getItem("token"));
  await page.click(".user-button");
  await clickButton(page, "Log out", ".user-menu");
  await page.waitForSelector("input[name=username]");
  check("logout forgets the token", (await page.evaluate(() => sessionStorage.getItem("token"))) === null);
  const status = await page.evaluate(async (t) => (await fetch("/api/me", { headers: { Authorization: "Bearer " + t } })).status, token);
  check("logout ends the session on the server", status === 401, status);

  // ----- Teacher -----
  page = await newPage(browser, 1280, 800);
  await signIn(page, "teacher1", "pass123");
  await settle(page);
  check("W19 a teacher does not see Teachers", !(await page.$eval(".nav", (n) => n.innerText.toLowerCase().includes("teachers"))));
  check("the teacher sees their own name", (await text(page, ".user-name")) === "Neha Kapoor");
  check("initials come from the server", (await text(page, ".avatar")) === "NK");
  await go(page, "teachers");
  check("a teacher who types the address sees the C++ refusal", (await text(page, ".empty-text")) === "Only the admin can view teachers.", await text(page, ".empty-text"));

  // ----- Loading state -----
  page = await newPage(browser, 1280, 800);
  await page.setRequestInterception(true);
  page.on("request", async (r) => {
    if (r.url().includes("/api/dashboard")) await wait(700);
    r.continue();
  });
  await signIn(page, "admin", "admin123");
  await page.waitForSelector(".skeleton");
  check("W54 a slow page shows a loading state", (await page.$$(".skeleton")).length >= 3);
  await settle(page);
  await go(page, "subjects");
  check("W54 pages finish loading", (await page.$(".loading-note")) === null);

  // ----- Phone width -----
  page = await newPage(browser, 360, 740);
  await signIn(page, "admin", "admin123");
  await settle(page);
  for (const name of ["dashboard", "students", "subjects", "mark", "report", "report/2", "defaulters", "daily", "monthly", "teachers"]) {
    await go(page, name);
    check(`W53 no sideways scrolling at 360 px: ${name}`, await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  }
  await go(page, "dashboard");
  await settle(page);
  check("W53 the sidebar is hidden on a phone", await page.$eval(".sidebar", (s) => getComputedStyle(s).visibility === "hidden"));
  await page.click(".topbar-menu");
  await wait(320);
  check("W53 the menu button opens the drawer", await page.$eval(".sidebar", (s) => s.getBoundingClientRect().left === 0));
  await page.screenshot({ path: path.join(out, "phone-drawer.png") });
  await page.click('a[data-hash="defaulters"]');
  await wait(320);
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
  await page.waitForSelector(".tally-cell");
  await wait(250);
  check("W59 without Chart.js the chart area explains why", (await text(page, ".chart-note")).includes("internet"));
  await clickButton(page, "Table", ".split");
  await wait(100);
  // Seven days: the six sample days, and the one marked earlier in this run.
  check("W59 tables still work without internet", (await page.$$eval(".split .table tbody tr", (r) => r.length)) === 7);
  await go(page, "daily");
  await wait(250);
  check("W59 the daily page works without internet", (await page.$(".chart-note")) !== null && (await page.$$(".stamp")).length > 0);
  check("no script errors offline", page.errors.length === 0, page.errors);

  await browser.close();
  console.log(failed ? `FAILED: ${failed} of ${passed + failed}` : `ALL ${passed} BEHAVIOUR CHECKS PASSED`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("SCRIPT FAILED", e); process.exit(1); });
