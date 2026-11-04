// dashboard.js
// The dashboard page. Every number here was calculated by C++ and arrives
// from GET /api/dashboard. This file only places it on the page.

// One stat card. The value can be a number, or a short text like "Not marked".
// A percentage from the server is text too, but it should look like a number.
function statCard(label, value, detail, iconName, isBad) {
  const isText = typeof value === "string" && !value.endsWith("%");
  return h("article", { class: "card stat" },
    h("div", { class: isBad ? "stat-icon is-bad" : "stat-icon" }, icon(iconName, 20)),
    h("div", { class: "stat-label" }, label),
    h("div", { class: isText ? "stat-value is-text" : "stat-value" }, String(value)),
    h("div", { class: "stat-detail" }, detail));
}

// The card for today's attendance, or the last marked day if today has no marks.
function todayCard(cards) {
  if (cards.todayMarked) {
    return statCard("Today", cards.todayPercentText,
      `${cards.todayPresent} of ${cards.todayTotal} marks`, "clipboard");
  }
  if (cards.anyMarks) {
    return statCard("Today", "Not marked",
      `Last: ${cards.lastMarkedPercentText}, ${cards.lastMarkedLabel}`, "clipboard");
  }
  return statCard("Today", "Not marked", "No attendance yet", "clipboard");
}

// A card that shows a chart, with a button to see the same numbers as a table.
function chartCard(title, subtitle, drawChart, tableColumns, rows) {
  const body = h("div", { class: "card-body" });
  const chartButton = h("button", { type: "button", "aria-label": "Show chart", "aria-pressed": "true" }, icon("line", 16));
  const tableButton = h("button", { type: "button", "aria-label": "Show table", "aria-pressed": "false" }, icon("table", 16));

  // Without internet Chart.js is missing, so the chart area explains why.
  const showChart = () => {
    chartButton.setAttribute("aria-pressed", "true");
    tableButton.setAttribute("aria-pressed", "false");

    if (!Charts.available()) {
      body.replaceChildren(h("div", { class: "chart-note" }, "Charts need an internet connection. Use the table button to see the numbers."));
      return;
    }
    const canvas = h("canvas", { role: "img", "aria-label": `${title}. ${subtitle}` });
    body.replaceChildren(h("div", { class: "chart-box" }, canvas));
    drawChart(canvas);
  };

  const showTable = () => {
    chartButton.setAttribute("aria-pressed", "false");
    tableButton.setAttribute("aria-pressed", "true");
    body.replaceChildren(UI.table(tableColumns, rows));
  };

  chartButton.addEventListener("click", showChart);
  tableButton.addEventListener("click", showTable);

  const card = h("article", { class: "card" },
    h("div", { class: "card-header" },
      h("div", null,
        h("h2", { class: "card-title" }, title),
        h("p", { class: "card-subtitle" }, subtitle)),
      h("div", { class: "segmented" }, chartButton, tableButton)),
    body);

  return { card, showChart };
}

// Loading placeholders in the same shape as the page, so nothing jumps.
function dashboardSkeleton() {
  const stat = () => h("div", { class: "skeleton skeleton-stat" });
  const chart = () => h("div", { class: "skeleton skeleton-chart" });
  return [
    h("section", { class: "stat-grid" }, stat(), stat(), stat(), stat()),
    h("section", { class: "chart-grid" }, chart(), chart()),
  ];
}

// Draws the dashboard into root. isCurrent() turns false if the user has
// moved to another page before the reply arrives.
Pages.dashboard = async function (root, isCurrent) {
  root.replaceChildren(...dashboardSkeleton());

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

  const { cards, trend, subjects, limit } = data;

  const stats = h("section", { class: "stat-grid", "aria-label": "Summary" },
    statCard("Students", cards.students, "In all classes", "users"),
    statCard("Subjects", cards.subjects, "In all classes", "book"),
    todayCard(cards),
    statCard("Defaulters", cards.defaulterStudents,
      `Below ${limit}% · ${cards.defaulterEntries} entries`, "alert", true));

  if (trend.length === 0) {
    root.replaceChildren(stats,
      h("section", { class: "card section-gap" },
        UI.empty("clipboard", "No attendance yet",
          "Charts will appear here once attendance has been marked.")));
    return;
  }

  const trendCard = chartCard("Attendance trend", "Percentage present on each marked day",
    (canvas) => Charts.trend(canvas, trend, limit),
    [["Date", "date"], ["Present", "present", true], ["Marks", "total", true], ["Attendance", "percentText", true]],
    trend);

  const subjectCard = chartCard("Attendance by subject", "All marks so far, for each subject",
    (canvas) => Charts.subjects(canvas, subjects, limit),
    [["Code", "code"], ["Class", "className"], ["Present", "present", true], ["Marks", "total", true], ["Attendance", "percentText", true]],
    subjects);

  root.replaceChildren(stats, h("section", { class: "chart-grid" }, trendCard.card, subjectCard.card));
  trendCard.showChart();
  subjectCard.showChart();
};
