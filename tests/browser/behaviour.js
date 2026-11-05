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
  await page.waitForSelector("[data-stat]");
  await page.evaluate(async () => {
    const pause = (ms) => new Promise((r) => setTimeout(r, ms));
    await pause(900);
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
const lines = (page, selector) => page.$$eval(selector, (r) => r.map((x) => x.innerText.replace(/\s+/g, " ").trim()));
const stat = (page, name) => page.$eval(`[data-stat="${name}"]`, (c) => c.innerText.replace(/\s+/g, " "));
const choosePill = (page, value) => page.$eval(`.pill[data-value="${value}"]`, (p) => p.click());
const setDate = (page, value) => page.$eval('input[name="date"]', (e, v) => { e.value = v; e.dispatchEvent(new Event("change")); }, value);

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
  const today = await stat(page, "today");
  console.log("     today:", today);
  check("W50 ten students in two classes", /10/.test(await stat(page, "students")) && (await stat(page, "students")).includes("2 classes"), await stat(page, "students"));
  check("W50 four subjects, overall from C++", (await stat(page, "subjects")).includes("82.00% overall"), await stat(page, "subjects"));
  check("W50 four defaulter students", /Below 75% 4/.test(await stat(page, "defaulters")), await stat(page, "defaulters"));
  check("W51 today says it is not marked", today.includes("Not marked yet") && today.includes("03 Nov") && today.includes("80.00%"), today);
  check("W81 the hero counts today's classes", today.includes("0 of 4 classes marked"), today);
  check("W51 not marked offers a way to mark", (await page.$eval("[data-stat=today] a", (a) => a.getAttribute("href"))) === "#/mark");
  check("the hero has one segment per subject", (await page.$$(".hero-segments i")).length === 4);
  const attention = await lines(page, "[data-tile=attention] .line");
  check("needs attention lists the lowest first", attention[0].includes("50.00%"), attention);
  const activity = await lines(page, "[data-tile=activity] .line");
  check("W82 recent activity shows the latest classes", activity.length === 4 && activity[0].includes("CS201A marked") && activity[0].includes("03 Nov"), activity);
  check("each subject has a ring", (await page.$$(".ring")).length === 4);
  check("W83 the greeting comes from the server", (await text(page, ".head-title")).endsWith(", Administrator") && (await text(page, ".head-title")).startsWith("Good "), await text(page, ".head-title"));
  const clock = new Date();
  const longDate = clock.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  check("W85 the head shows the real date", (await text(page, ".head-kicker")).endsWith(longDate), { shown: await text(page, ".head-kicker"), longDate });
  check("token is in sessionStorage only", await page.evaluate(() => sessionStorage.getItem("token").length === 32 && localStorage.getItem("token") === null));

  const facts = await page.evaluate(() => Charts.live.map(({ chart }) => {
    const points = chart.getDatasetMeta(0).data;
    return { type: chart.config.type, area: chart.chartArea.width, spread: Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x)) };
  }));
  check("the line chart really spans its area", facts[0].spread > facts[0].area * 0.9, facts);

  // ----- Theme -----
  const before = await page.evaluate(() => ({ theme: Theme.current(), line: Charts.live[0].chart.options.scales.y.ticks.color, bg: getComputedStyle(document.body).backgroundColor }));
  await page.click('.dock [aria-label="Switch theme"]');
  await wait(600);
  const after = await page.evaluate(() => ({ theme: Theme.current(), line: Charts.live[0].chart.options.scales.y.ticks.color, bg: getComputedStyle(document.body).backgroundColor, charts: Charts.live.length }));
  check("W52 the toggle changes the theme and page colour", before.theme !== after.theme && before.bg !== after.bg, { before, after });
  check("W52 the toggle redraws charts in new colours", before.line !== after.line && after.charts === 1, { before, after });
  await page.reload({ waitUntil: "domcontentloaded" });
  await settle(page);
  check("W52 the theme stays after reload", (await page.evaluate(() => Theme.current())) === after.theme);
  check("reload stays logged in", (await page.$("[data-stat]")) !== null);
  check("W52 only the theme is in localStorage", await page.evaluate(() => Object.keys(localStorage).join() === "theme"));

  // ----- Tooltip, table view -----
  const box = await (await page.$("canvas")).boundingBox();
  await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.5);
  await wait(450);
  const tip = await page.evaluate(() => { const t = Charts.live[0].chart.tooltip; return { opacity: t.opacity, title: t.title, body: t.body.map((b) => b.lines.concat(b.after)) }; });
  check("tooltip shows server values on hover", tip.opacity > 0 && tip.title[0].endsWith("-2026") && JSON.stringify(tip.body).includes("present"), tip);
  await page.screenshot({ path: path.join(out, "hover-tooltip.png") });
  await page.mouse.move(5, 5);
  await clickButton(page, "Table", "[data-tile=trend]");
  await wait(100);
  check("table view shows every marked day", (await page.$$eval("[data-tile=trend] .table tbody tr", (r) => r.length)) === 6);
  await clickButton(page, "Chart", "[data-tile=trend]");
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
  await page.evaluate(() => [...document.querySelectorAll(".mini-pills button")].find((b) => b.textContent.startsWith("Name")).click());
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
  const bold = await page.$$eval(".subject-card b, .subject-card img", (e) => e.length);
  const subjectCards = await lines(page, ".subject-card");
  check("W58 a subject named like HTML shows as plain text", bold === 0 && subjectCards.join().includes("<b>test</b>"), subjectCards);
  check("a new subject has a ring with no percentage", subjectCards.some((c) => c.includes("No classes yet")), subjectCards);
  await page.evaluate(() => [...document.querySelectorAll(".subject-card a")][1].click());
  await page.waitForSelector(".kid");
  check("a subject card opens its own marking page", (await text(page, '.pill[aria-pressed="true"]')).startsWith("MA201A"), await text(page, '.pill[aria-pressed="true"]'));

  // ----- Marking -----
  await go(page, "mark");
  await page.waitForSelector(".kid");
  const realToday = await page.$eval('input[name="date"]', (e) => e.value);
  const pad = (n) => String(n).padStart(2, "0");
  check("W85 marking opens on the real date", realToday === `${clock.getFullYear()}-${pad(clock.getMonth() + 1)}-${pad(clock.getDate())}`, realToday);
  check("W85 today's heading", (await text(page, ".head-title")) === "Who's here today?");
  await choosePill(page, "CS201B");
  await page.waitForFunction(() => document.querySelectorAll(".kid").length === 4);
  await setDate(page, "2026-10-28");
  await wait(300);
  check("W85 another day's heading names the date", (await text(page, ".head-title")) === "Who was here on 28-10-2026?", await text(page, ".head-title"));
  check("W20 choosing a subject lists only its class", (await page.$$(".kid")).length === 4);
  check("counter starts at everyone present", (await text(page, "#present-count")) === "4" && (await text(page, "#absent-count")) === "0");

  const requests = [];
  page.on("request", (r) => { if (r.url().includes("/api/")) requests.push(r.url()); });
  const boxes = await page.$$(".kid-box");
  await boxes[1].click();
  await boxes[2].click();
  check("W21 the counter updates after each toggle", (await text(page, "#present-count")) === "2" && (await text(page, "#absent-count")) === "2");
  await wait(200);
  check("W21 toggling sends no request", requests.length === 0, requests);
  check("W21 an absent tile changes colour", (await page.$$(".kid.is-away")).length === 2);
  const barGap = await page.evaluate(() => window.innerHeight - document.querySelector(".savebar").getBoundingClientRect().bottom);
  check("W21 the save bar floats at the bottom of the screen", barGap > 10 && barGap < 40, barGap);
  await page.screenshot({ path: path.join(out, "marking.png") });

  await clickButton(page, "Mark all present");
  check("W22 mark all present sets every toggle", (await text(page, "#absent-count")) === "0");
  await boxes[0].click();
  await page.click(".savebar .btn-glow");
  await wait(500);
  check("W22 the totals after Save come from C++", (await lastToast(page)) === "Attendance saved. Present: 3, Absent: 1", await lastToast(page));
  check("W24 a marked session shows the notice", (await text(page, ".notice")).startsWith("Already marked"));
  check("W24 a marked session has no Save button", !(await page.$eval(".content", (s) => s.innerText.includes("Save attendance"))));

  const again = await page.$$(".kid-box");
  await again[0].click();
  await wait(400);
  check("W26 correcting saves straight away", (await lastToast(page)) === "Attendance corrected.", await lastToast(page));
  check("W26 the counter follows the correction", (await text(page, "#present-count")) === "4");

  await setDate(page, "2099-01-01");
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
  await choosePill(page, "CS201A");
  await wait(60);
  await choosePill(page, "MA201B");
  await wait(900);
  check("a slow old reply does not replace a newer one", (await text(page, ".wall-title")).startsWith("MA201B"), await text(page, ".wall-title"));
  page.off("request", slowDown);
  await page.setRequestInterception(false);

  // ----- Reports -----
  await go(page, "report");
  check("report page starts with a student list", (await page.$$(".pick")).length === 10);
  await page.evaluate(() => [...document.querySelectorAll(".person-name")].find((a) => a.textContent === "Diya Verma").click());
  await wait(1200);
  const subjectLines = await lines(page, ".report-subject");
  console.log("     report:", JSON.stringify(subjectLines));
  check("W30 Diya's report matches", subjectLines[0].includes("83.33%") && subjectLines[1].includes("75%") && (await text(page, ".hero-number")) === "80%", { subjectLines, overall: await text(page, ".hero-number") });
  const rings = await page.$$eval(".report-subject .ring", (f) => f.map((x) => x.className));
  check("W31 exactly 75% is not low, with the word OK", rings[1].includes("is-ok") && subjectLines[1].includes("OK"), { rings, subjectLines });
  const arc = await page.$eval(".report-subject .ring-arc", (a) => Number(a.getAttribute("stroke-dasharray").split(" ")[0]));
  check("the ring is drawn to the server's percentage", Math.abs(arc - 2 * Math.PI * 36 * 0.8333) < 1, arc);
  await go(page, "report/3");
  const low = await page.$$eval(".report-subject .ring", (f) => f.map((x) => x.classList.contains("is-low")));
  check("W31 below 75% is red, with words", low.every(Boolean) && (await text(page, ".report-subject")).includes("Below 75%"), low);

  await go(page, "defaulters");
  const defaulters = await rows(page);
  check("W33 the defaulters page has 5 entries", defaulters.length === 5 && defaulters[0].includes("50.00%"), defaulters);
  check("defaulters have red badges", (await page.$$(".table .badge.is-bad")).length === 5);
  check("recent marks are drawn as cells", (await page.$$(".mark")).length > 10);
  check("the summary names the lowest entry", (await text(page, ".summary")).includes("Lowest:"), await text(page, ".summary"));

  await go(page, "daily");
  await wait(300);
  check("W34 daily report opens on the last marked day", (await page.$eval('input[name="date"]', (e) => e.value)) === "2026-11-03");
  check("W34 daily report has present and absent badges", (await page.$$(".line .badge.is-good")).length > 0 && (await page.$$(".line .badge.is-bad")).length > 0);
  check("daily report draws its chart with a legend", await page.evaluate(() => Charts.live.length === 1 && Charts.live[0].chart.legend.options.display));
  await setDate(page, "2026-11-01");
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
  check("W19 admin sees the teachers", (await page.$$(".person-card")).length === 2);
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
  check("W19 the teacher is added", (await page.$$(".person-card")).length === 3 && (await lastToast(page)) === "Teacher added.");
  // ----- Keyboard shortcuts on a laptop -----
  // This comes after the reports, because it saves marks of its own.
  await go(page, "mark");
  await page.waitForSelector(".kid");
  await choosePill(page, "MA201B");
  await wait(150);
  await setDate(page, "2026-10-28");
  await page.waitForFunction(() => document.querySelectorAll(".kid").length === 4);
  await page.evaluate(() => document.activeElement.blur());
  const keyRequests = [];
  const countRequest = (r) => { if (r.url().includes("/api/")) keyRequests.push(r.url()); };
  page.on("request", countRequest);
  const focused = () => page.evaluate(() => [...document.querySelectorAll(".kid-box")].indexOf(document.activeElement));

  await page.keyboard.press("a");
  check("W86 A marks the first student absent", (await text(page, "#absent-count")) === "1");
  check("W86 and moves to the next tile", (await focused()) === 1, await focused());
  await page.keyboard.press("p");
  check("W86 P keeps a student present and moves on", (await text(page, "#absent-count")) === "1" && (await focused()) === 2);
  await page.keyboard.press("j");
  check("W86 J moves forward", (await focused()) === 3);
  await page.keyboard.press("k");
  check("W86 K moves back", (await focused()) === 2);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  check("W86 left and right arrows move", (await focused()) === 2);
  await page.keyboard.press("Space");
  check("W86 Space flips the tile", (await text(page, "#absent-count")) === "2");
  await page.keyboard.press("ArrowUp");
  check("W86 the up arrow stays put on the first row", (await focused()) === 2, await focused());
  await page.keyboard.press("j");
  await page.keyboard.press("ArrowUp");
  const columns = await page.evaluate(() => getComputedStyle(document.querySelector(".wall")).gridTemplateColumns.split(" ").length);
  check("W86 the up arrow moves a whole row", (await focused()) === 3 - columns, { at: await focused(), columns });
  await page.keyboard.press("ArrowDown");
  check("W86 the down arrow moves a whole row", (await focused()) === 3, await focused());
  await page.screenshot({ path: path.join(out, "marking-keyboard.png") });

  await page.focus('input[name="date"]');
  await page.keyboard.press("a");
  check("W86 typing in the date box marks nobody", (await text(page, "#absent-count")) === "2");
  check("W86 shortcuts send no request", keyRequests.length === 0, keyRequests);

  await page.keyboard.down("Control");
  await page.keyboard.press("s");
  await page.keyboard.up("Control");
  await wait(500);
  check("W86 Ctrl+S saves, with totals from C++", (await lastToast(page)) === "Attendance saved. Present: 2, Absent: 2", await lastToast(page));
  page.off("request", countRequest);

  await page.waitForSelector(".notice");
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press("p");
  await wait(400);
  check("W86 in a marked session a shortcut is a correction", (await lastToast(page)) === "Attendance corrected.", await lastToast(page));
  await page.evaluate(() => document.activeElement.blur());
  await go(page, "subjects");
  check("W86 shortcuts end when the page changes", await page.evaluate(() => App.pageKeys === null));


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
  check("W19 a teacher does not see Teachers", await page.$eval(".dock", (n) => n.textContent.includes("Students") && !n.textContent.includes("Teachers")));
  check("W83 the greeting uses the first name", (await text(page, ".head-title")).endsWith(", Neha"), await text(page, ".head-title"));
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
  await wait(800);   // this page reads the slowed /api/dashboard too
  check("W54 pages finish loading", (await page.$(".skeleton")) === null);

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
  check("W53 the dock is hidden on a phone", await page.$eval(".dock", (s) => getComputedStyle(s).display === "none"));
  check("W53 the tab bar shows five tabs", (await lines(page, ".tabbar .tab")).length === 5);
  await page.click(".tabbar .tab:last-child");
  await page.waitForSelector("dialog[open]");
  await wait(320);
  const more = await lines(page, ".more-link");
  check("W53 More lists the other pages, and the theme", more.join().includes("Defaulters") && more.join().includes("Teachers") && more.join().includes("mode"), more);
  await page.screenshot({ path: path.join(out, "phone-more.png") });
  await page.click('dialog a[data-hash="defaulters"]');
  await wait(450);
  check("W53 choosing a page closes the sheet", (await page.$("dialog")) === null && (await page.evaluate(() => location.hash)) === "#/defaulters");

  await page.click('.tabbar a[data-hash="mark"]');
  await page.waitForSelector(".savebar");
  await wait(450);
  check("W86 a phone shows no keyboard hints", await page.$eval(".key-hints", (k) => getComputedStyle(k).display === "none"));
  const gap = await page.evaluate(() => document.querySelector(".tabbar").getBoundingClientRect().top - document.querySelector(".savebar").getBoundingClientRect().bottom);
  check("W53 the save bar sits just above the tab bar", gap > 0 && gap < 30, gap);
  const tile = await page.$eval(".kid", (k) => k.getBoundingClientRect().height);
  check("W53 tiles are large tap targets", tile >= 96, tile);

  await page.setViewport({ width: 760, height: 800 });
  await wait(100);
  check("tab bar at 760 px", await page.$eval(".tabbar", (s) => getComputedStyle(s).display === "grid"));
  await page.setViewport({ width: 761, height: 800 });
  await wait(100);
  check("dock at 761 px", await page.$eval(".dock", (s) => getComputedStyle(s).display === "flex") && await page.$eval(".tabbar", (s) => getComputedStyle(s).display === "none"));

  // ----- No internet -----
  page = await newPage(browser, 1280, 800, { offline: true, quiet: true });
  await signIn(page, "admin", "admin123");
  await page.waitForSelector("[data-stat]");
  await wait(250);
  check("W59 without Chart.js the chart area explains why", (await text(page, ".chart-note")).includes("internet"));
  await clickButton(page, "Table", "[data-tile=trend]");
  await wait(100);
  // Seven days: the six sample days, and the one marked earlier in this run.
  check("W59 tables still work without internet", (await page.$$eval("[data-tile=trend] .table tbody tr", (r) => r.length)) === 7);
  await go(page, "daily");
  await wait(250);
  check("W59 the daily page works without internet", (await page.$(".chart-note")) !== null && (await page.$$(".badge")).length > 0);
  check("no script errors offline", page.errors.length === 0, page.errors);

  // ----- Marking today, with the real date -----
  page = await newPage(browser, 1440, 900);
  await signIn(page, "teacher1", "pass123");
  await settle(page);
  await go(page, "mark");
  await page.waitForSelector(".kid");
  await (await page.$$(".kid-box"))[0].click();
  await page.click(".savebar .btn-glow");
  await wait(500);
  check("W85 today's attendance saves", (await lastToast(page)) === "Attendance saved. Present: 5, Absent: 1", await lastToast(page));
  await go(page, "dashboard");
  await settle(page);
  const marked = await stat(page, "today");
  console.log("     today:", marked);
  check("W81 the hero shows today's percentage from C++", marked.includes("83.33%") && marked.includes("5 present, 1 absent today"), marked);
  // Five subjects by now, because this run added one earlier.
  check("W81 one class of all subjects is marked", marked.includes("1 of 5 classes marked") && (await page.$$(".hero-segments i:not(.is-off)")).length === 1, marked);
  check("W81 the hero offers the rest", marked.includes("Mark the rest"), marked);
  const fresh = await lines(page, "[data-tile=activity] .line");
  check("W82 the new class is first, and says Today", fresh[0].includes("CS201A marked") && fresh[0].includes("Today") && fresh[0].includes("5/6"), fresh);
  check("no script errors while marking today", page.errors.length === 0, page.errors);

  await browser.close();
  console.log(failed ? `FAILED: ${failed} of ${passed + failed}` : `ALL ${passed} BEHAVIOUR CHECKS PASSED`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("SCRIPT FAILED", e); process.exit(1); });
