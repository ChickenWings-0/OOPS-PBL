// daily.js
// The Daily report page. It opens on the latest day with marks, which comes
// from the server.

// One subject's register for the day.
function dailySubject(row) {
  return UI.sheet(`${row.code}, ${row.name}`, `${row.className} · Present ${row.present}, Absent ${row.absent}`, null,
    UI.table([
      { label: "Roll no", tight: true, cell: (person) => h("span", { class: "mono" }, person.rollNo) },
      { label: "Name", cell: (person) => h("a", { class: "person-name", href: `#/report/${person.id}` }, person.name) },
      {
        label: "Status", tight: true,
        cell: (person) => UI.stamp(person.status === "Present" ? "good" : "bad", person.status),
      },
    ], row.students));
}

Pages.daily = async function (root, isCurrent) {
  const dateField = UI.field("Date", "date", { type: "date", value: App.lastMarked.dateIso });
  const input = dateField.querySelector("input");
  const results = h("div", { class: "stack" });
  let latestLoad = 0;   // only the newest request may draw

  async function load() {
    latestLoad += 1;
    const thisLoad = latestLoad;
    Charts.clear();
    results.replaceChildren(h("section", { class: "sheet" }, UI.loading("Loading the report")));

    let data;
    try {
      const query = new URLSearchParams({ date: input.value }).toString();
      data = await Api.get(`/api/reports/daily?${query}`);
    } catch (error) {
      if (isCurrent() && thisLoad === latestLoad) {
        results.replaceChildren(h("section", { class: "sheet" }, UI.empty("Cannot show this date", error.message)));
      }
      return;
    }
    if (!isCurrent() || thisLoad !== latestLoad) {
      return;
    }

    if (data.subjects.length === 0) {
      results.replaceChildren(h("section", { class: "sheet" },
        UI.empty("No attendance on this date", `Nothing was marked on ${data.date}.`,
          h("a", { class: "btn btn-secondary", href: "#/mark" }, "Mark attendance"))));
      return;
    }

    const chart = UI.chartOrTable("Present and absent", `By subject on ${data.date}`,
      (canvas) => Charts.daily(canvas, data.subjects),
      () => UI.table([
        { label: "Code", cell: (row) => h("span", { class: "mono" }, row.code) },
        { label: "Class", key: "className" },
        { label: "Present", key: "present", num: true },
        { label: "Absent", key: "absent", num: true },
      ], data.subjects));

    results.replaceChildren(chart.element, h("div", { class: "pair" }, ...data.subjects.map(dailySubject)));
    chart.showChart();
  }

  input.addEventListener("change", load);

  root.replaceChildren(h("div", { class: "stack" },
    h("div", { class: "toolbar" }, h("div", { class: "toolbar-date" }, dateField)),
    results));
  load();
};
