// daily.js
// The Daily report page. It opens on the latest day with marks, which comes
// from the server.

// One subject's list for the day.
function dailySubject(row) {
  const people = row.students.map((person) => h("div", { class: "line" },
    UI.person(person.id, person.name, person.rollNo, person.initials),
    h("div", { class: "line-main" }),
    UI.badge(person.status === "Present" ? "good" : "bad", person.status)));

  const tile = UI.tile(`${row.code}, ${row.name}`, row.className,
    h("div", { class: "day-counts" },
      UI.badge("good", `${row.present} present`),
      UI.badge("bad", `${row.absent} absent`)),
    ...people);
  tile.classList.add("day-subject");
  return tile;
}

Pages.daily = async function (root, isCurrent) {
  const dateField = UI.datePill("Date", "date", "date", App.lastMarked.dateIso);
  const input = dateField.querySelector("input");
  const results = h("div", { class: "stack" });
  let latestLoad = 0;   // only the newest request may draw

  async function load() {
    latestLoad += 1;
    const thisLoad = latestLoad;
    Charts.clear();
    results.replaceChildren(UI.skeleton(["span-12"], ["span-6", "is-tall"], ["span-6", "is-tall"]));

    let data;
    try {
      const query = new URLSearchParams({ date: input.value }).toString();
      data = await Api.get(`/api/reports/daily?${query}`);
    } catch (error) {
      if (isCurrent() && thisLoad === latestLoad) {
        results.replaceChildren(UI.emptyTile("Cannot show this date", error.message));
      }
      return;
    }
    if (!isCurrent() || thisLoad !== latestLoad) {
      return;
    }

    if (data.subjects.length === 0) {
      results.replaceChildren(UI.emptyTile("No attendance on this date", `Nothing was marked on ${data.date}.`,
        h("a", { class: "btn btn-secondary", href: "#/mark" }, "Mark attendance")));
      return;
    }

    const chart = UI.chartOrTable("Present and absent", `By subject on ${data.date}`,
      (canvas) => Charts.daily(canvas, data.subjects),
      () => UI.table([
        { label: "Code", key: "code", lead: true },
        { label: "Class", key: "className" },
        { label: "Present", key: "present", num: true },
        { label: "Absent", key: "absent", num: true },
      ], data.subjects));

    results.replaceChildren(chart.element, h("div", { class: "pair" }, ...data.subjects.map(dailySubject)));
    chart.showChart();
  }

  input.addEventListener("change", load);

  root.replaceChildren(h("div", { class: "stack" },
    h("div", { class: "toolbar" }, dateField),
    results));
  load();
};
