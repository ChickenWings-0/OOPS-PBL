// dashboard.js
// The dashboard page. Every number here was calculated by C++ and arrives
// from GET /api/dashboard. This file only places it on the page.

// One cell of the tally at the top of the page.
function tallyCell(label, value, valueClass, foot, link) {
  return h("article", { class: "tally-cell" },
    h("div", { class: "label" }, label),
    h("div", { class: `tally-value ${valueClass}` }, String(value)),
    h("div", { class: "tally-foot" }, h("span", null, foot), link || null));
}

// Today's cell: the percentage, or a way to go and mark attendance.
function todayCell(cards) {
  if (cards.todayMarked) {
    return tallyCell("Today", cards.todayPercentText, "", `${cards.todayPresent} of ${cards.todayTotal} marks`);
  }
  const foot = cards.anyMarks
    ? `Last ${cards.lastMarkedPercentText}, ${cards.lastMarkedLabel}`
    : "Nothing recorded";
  return tallyCell("Today", "Not marked", "is-text", foot,
    h("a", { class: "link-btn", href: "#/mark" }, "Mark now"));
}

// The students closest to trouble, as rows of the register.
function attentionTable(rows) {
  return UI.table([
    { label: "Student", cell: (row) => UI.person(row.studentId, row.name, row.rollNo) },
    { label: "Class", key: "className", tight: true, hideNarrow: true },
    { label: "Subject", cell: (row) => h("span", { class: "mono" }, row.subject), tight: true },
    { label: "Recent marks", cell: (row) => UI.marks(row.marks), hideNarrow: true },
    { label: "Attended", cell: (row) => `${row.present}/${row.total}`, num: true, tight: true, hideNarrow: true },
    { label: "Attendance", cell: (row) => UI.stamp("bad", row.percentText), num: true, tight: true },
  ], rows);
}

// Loading placeholders in the same shape as the page, so nothing jumps.
function dashboardSkeleton() {
  return [
    h("div", { class: "skeleton skeleton-tally" }),
    h("div", { class: "split" },
      h("div", { class: "skeleton skeleton-sheet" }), h("div", { class: "skeleton skeleton-sheet" })),
  ];
}

// Draws the dashboard into root. isCurrent() turns false if the user has
// moved to another page before the reply arrives.
Pages.dashboard = async function (root, isCurrent) {
  const page = h("div", { class: "stack" }, ...dashboardSkeleton());
  root.replaceChildren(page);

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

  const { cards, trend, subjects, attention, limit } = data;

  const tally = h("section", { class: "tally", "aria-label": "Summary" },
    tallyCell("Students", cards.students, "", `${cards.classes} ${cards.classes === 1 ? "class" : "classes"}`,
      h("a", { class: "link-btn", href: "#/students" }, "View")),
    tallyCell("Subjects", cards.subjects, "", `${cards.overallPercentText} overall`,
      h("a", { class: "link-btn", href: "#/subjects" }, "View")),
    todayCell(cards),
    tallyCell("Defaulters", cards.defaulterStudents, cards.defaulterStudents > 0 ? "is-bad" : "",
      `${cards.defaulterEntries} below ${limit}%`,
      h("a", { class: "link-btn", href: "#/defaulters" }, "View")));

  if (trend.length === 0) {
    page.replaceChildren(tally,
      h("section", { class: "sheet" },
        UI.empty("No attendance yet", "Charts and reports appear here once the first class has been marked.",
          h("a", { class: "btn btn-primary", href: "#/mark" }, "Mark attendance"))));
    return;
  }

  const trendSheet = UI.chartOrTable("Attendance by day", "Share of students present on each day with marks",
    (canvas) => Charts.trend(canvas, trend, limit),
    () => UI.table([
      { label: "Date", cell: (row) => h("span", { class: "mono" }, row.date) },
      { label: "Present", key: "present", num: true },
      { label: "Marks", key: "total", num: true },
      { label: "Attendance", key: "percentText", num: true },
    ], trend));

  const subjectSheet = UI.chartOrTable("Attendance by subject", "All marks so far",
    (canvas) => Charts.percentBars(canvas, subjects, limit,
      (row) => row.code,
      (row) => `${row.code}, ${row.name} (${row.className})`,
      (row) => `${row.present} of ${row.total} marks`),
    () => UI.table([
      { label: "Code", cell: (row) => h("span", { class: "mono" }, row.code) },
      { label: "Class", key: "className" },
      { label: "Present", key: "present", num: true },
      { label: "Marks", key: "total", num: true },
      { label: "Attendance", key: "percentText", num: true },
    ], subjects));

  const attentionBody = attention.length > 0
    ? attentionTable(attention)
    : UI.empty("Nobody is below the minimum", `Every student is at ${limit}% or above in every subject.`);

  page.replaceChildren(tally,
    h("div", { class: "split" }, trendSheet.element, subjectSheet.element),
    UI.sheet("Needs attention", `Lowest attendance first, below ${limit}% in a subject`,
      h("a", { class: "link-btn", href: "#/defaulters" }, "All defaulters"), attentionBody));

  trendSheet.showChart();
  subjectSheet.showChart();
};
