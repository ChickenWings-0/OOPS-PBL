// monthly.js
// The Monthly report page: one class in one month.

Pages.monthly = async function (root, isCurrent) {
  let classes;
  try {
    classes = (await Api.get("/api/classes")).classes;
  } catch (error) {
    if (isCurrent()) {
      root.replaceChildren(UI.loadError(error, () => Pages.monthly(root, isCurrent)));
    }
    return;
  }
  if (!isCurrent()) {
    return;
  }
  if (classes.length === 0) {
    root.replaceChildren(h("section", { class: "sheet" },
      UI.empty("No classes yet", "Classes appear here once students or subjects have been added.")));
    return;
  }

  const classField = UI.selectField("Class", "class", classes.map((name) => [name, name]));
  const monthField = UI.field("Month", "month", { type: "month", value: App.lastMarked.month });
  const classInput = classField.querySelector("select");
  const monthInput = monthField.querySelector("input");
  const results = h("div", { class: "stack" });
  let latestLoad = 0;   // only the newest request may draw

  async function load() {
    latestLoad += 1;
    const thisLoad = latestLoad;
    Charts.clear();
    results.replaceChildren(h("section", { class: "sheet" }, UI.loading("Loading the report")));

    let data;
    try {
      const query = new URLSearchParams({ class: classInput.value, month: monthInput.value }).toString();
      data = await Api.get(`/api/reports/monthly?${query}`);
    } catch (error) {
      if (isCurrent() && thisLoad === latestLoad) {
        results.replaceChildren(h("section", { class: "sheet" }, UI.empty("Cannot show this month", error.message)));
      }
      return;
    }
    if (!isCurrent() || thisLoad !== latestLoad) {
      return;
    }

    if (!data.anyRecords) {
      results.replaceChildren(h("section", { class: "sheet" },
        UI.empty("No attendance in this month", `${data.className} has no marks in ${data.monthName}.`)));
      return;
    }

    const heading = `${data.className}, ${data.monthName}`;

    const chart = UI.chartOrTable("Attendance by student", heading,
      (canvas) => Charts.percentBars(canvas, data.students, data.limit,
        (row) => row.name,
        (row) => `${row.name} (${row.rollNo})`,
        (row) => `${row.present} of ${row.held} classes`),
      () => table(), true);

    function table() {
      return UI.table([
        { label: "Student", cell: (row) => UI.person(row.id, row.name, row.rollNo) },
        { label: "Held", key: "held", num: true, tight: true },
        { label: "Present", key: "present", num: true, tight: true },
        {
          label: "Attendance", num: true, tight: true,
          cell: (row) => (row.status === "none" ? row.percentText
            : UI.stamp(row.status === "low" ? "bad" : "good", row.percentText)),
        },
      ], data.students);
    }

    results.replaceChildren(chart.element, UI.sheet("Monthly register", heading, null, table()));
    chart.showChart();
  }

  classInput.addEventListener("change", load);
  monthInput.addEventListener("change", load);

  root.replaceChildren(h("div", { class: "stack" },
    h("div", { class: "toolbar" },
      h("div", { class: "toolbar-date" }, classField),
      h("div", { class: "toolbar-date" }, monthField)),
    results));
  load();
};
