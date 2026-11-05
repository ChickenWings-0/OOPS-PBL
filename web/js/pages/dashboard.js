// dashboard.js
// The dashboard page. Every number here was calculated by C++ and arrives
// from GET /api/dashboard. This file only places it on the page.

// One small number tile, which is also a link to its page.
function statTile(name, label, value, note, href) {
  return h("a", { class: "tile stat span-2", href, "data-stat": name },
    h("div", { class: "stat-label" }, label),
    UI.countUp(h("div", { class: "tile-big" }), value),
    h("div", { class: "tile-note" }, note));
}

// The red tile: who is below the minimum, with their avatars.
function alertTile(cards, attention, limit) {
  // A student can appear once for each subject, but needs only one avatar.
  const seen = new Set();
  const faces = attention.filter((row) => !seen.has(row.studentId) && seen.add(row.studentId))
    .map((row) => UI.face(row.initials, row.studentId));

  const entries = cards.defaulterEntries === 1 ? "1 subject entry" : `${cards.defaulterEntries} subject entries`;
  return h("a", { class: "tile stat span-3 is-alert", href: "#/defaulters", "data-stat": "defaulters" },
    h("div", { class: "stat-label" }, `Below ${limit}%`),
    UI.countUp(h("div", { class: "tile-big" }), cards.defaulterStudents),
    faces.length > 0 ? h("div", { class: "faces" }, ...faces) : h("div", { class: "tile-note" }, entries));
}

// The hero: today's attendance, or a way to go and mark it.
function heroTile(cards) {
  const segments = Array.from({ length: cards.todayClassesTotal }, (unused, index) =>
    h("i", { class: index < cards.todayClassesMarked ? null : "is-off" }));

  const top = h("div", { class: "hero-top" },
    h("span", { class: "hero-pill" }, "Today at a glance"),
    h("span", { class: "hero-pill" }, cards.todayClassesTotal > 0
      ? `${cards.todayClassesMarked} of ${cards.todayClassesTotal} classes marked`
      : "No subjects yet"));

  if (!cards.todayMarked) {
    const lastTime = cards.anyMarks
      ? `Last marked ${cards.lastMarkedLabel}, with ${cards.lastMarkedPercentText} present.`
      : "Nothing has been recorded yet.";

    return h("article", { class: "tile hero span-5 rows-2", "data-stat": "today" }, top,
      h("div", null,
        h("div", { class: "hero-words" }, "Not marked yet"),
        h("div", { class: "hero-sub" }, lastTime),
        h("a", { class: "hero-action", href: "#/mark" }, "Mark attendance", icon("arrow", 18)),
        h("div", { class: "hero-segments" }, ...segments)));
  }

  const [whole, rest] = UI.percent(cards.todayPercentText);
  UI.countUp(whole, Number(whole.textContent));

  return h("article", { class: "tile hero span-5 rows-2", "data-stat": "today" }, top,
    h("div", null,
      h("div", { class: "hero-number" }, whole, rest),
      h("div", { class: "hero-sub" }, `${cards.todayPresent} present, ${cards.todayAbsent} absent today`),
      cards.todayClassesMarked < cards.todayClassesTotal
        ? h("a", { class: "hero-action", href: "#/mark" }, "Mark the rest", icon("arrow", 18))
        : null,
      h("div", { class: "hero-segments" }, ...segments)));
}

// One ring for each subject, across all marks so far.
function ringsTile(subjects) {
  const rings = subjects.map((row) => h("div", null,
    UI.ring(row.percent, row.percentText, row.status),
    h("div", { class: "ring-code" }, row.code),
    h("div", { class: "ring-class" }, row.status === "low" ? "Low attendance" : row.className)));

  const tile = UI.tile("By subject", null, null, h("div", { class: "ring-grid" }, ...rings));
  tile.classList.add("span-5", "tile-fill");
  return tile;
}

// The latest classes that were marked. C++ picks them and counts them.
function activityTile(recent) {
  const lines = recent.map((row) => h("div", { class: "line" },
    h("div", { class: "chip" }, icon("check", 18)),
    h("div", { class: "line-main" },
      h("div", { class: "line-title" }, `${row.code} marked`),
      h("div", { class: "line-sub" }, `${row.when} · ${row.name}, ${row.className}`)),
    h("div", { class: "line-count", "aria-label": `${row.present} of ${row.total} present` }, `${row.present}/${row.total}`)));

  const tile = UI.tile("Recent activity", null, null, ...lines);
  tile.classList.add("span-4");
  tile.dataset.tile = "activity";
  return tile;
}

// The students closest to trouble, lowest first.
function attentionTile(rows, limit) {
  const lines = rows.slice(0, 4).map((row) => h("a", { class: "line", href: `#/report/${row.studentId}` },
    h("div", { class: "line-main" },
      h("div", { class: "line-title" }, row.name),
      h("div", { class: "line-sub" }, row.subject)),
    UI.badge("bad", row.percentText)));

  const body = lines.length > 0 ? lines : [h("p", { class: "tile-note" }, `Everyone is at ${limit}% or above.`)];
  const tile = UI.tile("Needs attention", null,
    h("a", { class: "link-btn", href: "#/defaulters" }, "All"), ...body);
  tile.classList.add("span-3");
  tile.dataset.tile = "attention";
  return tile;
}

// Draws the dashboard into root. isCurrent() turns false if the user has
// moved to another page before the reply arrives.
Pages.dashboard = async function (root, isCurrent) {
  root.replaceChildren(UI.skeleton(["span-5 rows-2", "is-tall"], ["span-2"], ["span-2"], ["span-3"], ["span-7"],
    ["span-5"], ["span-4"], ["span-3"]));

  let data;
  try {
    data = await Api.get("/api/dashboard");
  } catch (error) {
    if (isCurrent()) {
      root.replaceChildren(UI.loadError(error, () => Pages.dashboard(root, isCurrent)));
    }
    return;
  }
  if (!isCurrent()) {
    return;
  }

  const { cards, trend, subjects, attention, recent, limit } = data;
  const classes = `${cards.classes} ${cards.classes === 1 ? "class" : "classes"}`;

  const top = [
    heroTile(cards),
    statTile("students", "Students", cards.students, classes, "#/students"),
    statTile("subjects", "Subjects", cards.subjects, `${cards.overallPercentText} overall`, "#/subjects"),
    alertTile(cards, attention, limit),
  ];

  if (trend.length === 0) {
    const noMarks = UI.emptyTile("No attendance yet", "Charts and reports appear here once the first class has been marked.");
    noMarks.classList.add("span-7");
    root.replaceChildren(h("div", { class: "bento" }, ...top, noMarks));
    return;
  }

  const trendTile = UI.chartOrTable("Attendance by day", "Share of students present on each marked day",
    (canvas) => Charts.trend(canvas, trend, limit),
    () => UI.table([
      { label: "Date", key: "date", lead: true },
      { label: "Present", key: "present", num: true },
      { label: "Marks", key: "total", num: true },
      { label: "Attendance", key: "percentText", num: true },
    ], trend));
  trendTile.element.classList.add("span-7");
  trendTile.element.dataset.tile = "trend";

  root.replaceChildren(h("div", { class: "bento" }, ...top, trendTile.element,
    ringsTile(subjects), activityTile(recent), attentionTile(attention, limit)));

  trendTile.showChart();
};
