// monthly.js
// The Monthly report page: one class in one month.

Pages.monthly = async function (root, isCurrent) {
  root.replaceChildren(UI.skeleton(["span-12", "is-short"], ["span-12", "is-tall"]));

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
    root.replaceChildren(UI.emptyTile("No classes yet", "Classes appear here once students or subjects have been added."));
    return;
  }

  let chosen = classes[0];
  const classPills = UI.pills("Class", classes.map((name) => [name, name]), chosen, (name) => {
    chosen = name;
    load();
  });
  const monthField = UI.datePill("Month", "month", "month", App.lastMarked.month);
  const monthInput = monthField.querySelector("input");
  const results = h("div", { class: "stack" });
  let latestLoad = 0;   // only the newest request may draw

  async function load() {
    latestLoad += 1;
    const thisLoad = latestLoad;
    Charts.clear();
    results.replaceChildren(UI.skeleton(["span-12", "is-tall"], ["span-12"]));

    let data;
    try {
      const query = new URLSearchParams({ class: chosen, month: monthInput.value }).toString();
      data = await Api.get(`/api/reports/monthly?${query}`);
    } catch (error) {
      if (isCurrent() && thisLoad === latestLoad) {
        results.replaceChildren(UI.emptyTile("Cannot show this month", error.message));
      }
      return;
    }
    if (!isCurrent() || thisLoad !== latestLoad) {
      return;
    }

    if (!data.anyRecords) {
      results.replaceChildren(UI.emptyTile("No attendance in this month", `${data.className} has no marks in ${data.monthName}.`));
      return;
    }

    const heading = `${data.className}, ${data.monthName}`;

    function table() {
      return UI.table([
        { label: "Student", lead: true, cell: (row) => UI.person(row.id, row.name, row.rollNo, row.initials) },
        { label: "Held", key: "held", num: true, tight: true, half: true },
        { label: "Present", key: "present", num: true, tight: true, half: true },
        {
          label: "Attendance", num: true, tight: true, corner: true,
          cell: (row) => (row.status === "none" ? row.percentText
            : UI.badge(row.status === "low" ? "bad" : "good", row.percentText)),
        },
      ], data.students);
    }

    const chart = UI.chartOrTable("Attendance by student", heading,
      (canvas) => Charts.percentBars(canvas, data.students, data.limit,
        (row) => row.name,
        (row) => `${row.name} (${row.rollNo})`,
        (row) => `${row.present} of ${row.held} classes`),
      () => table(), true);

    results.replaceChildren(chart.element, UI.tile("Monthly register", heading, null, table()));
    chart.showChart();
  }

  monthInput.addEventListener("change", load);

  root.replaceChildren(h("div", { class: "stack" },
    h("div", { class: "mark-controls" }, classPills, monthField),
    results));
  load();
};
