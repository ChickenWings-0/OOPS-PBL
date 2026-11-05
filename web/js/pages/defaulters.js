// defaulters.js
// The Defaulters page. C++ decides who is below the limit and sorts the list.

Pages.defaulters = async function (root, isCurrent) {
  root.replaceChildren(UI.skeleton(["span-12", "is-short"], ["span-12", "is-tall"]));

  let data;
  try {
    data = await Api.get("/api/reports/defaulters");
  } catch (error) {
    if (isCurrent()) {
      root.replaceChildren(UI.loadError(error, () => Pages.defaulters(root, isCurrent)));
    }
    return;
  }
  if (!isCurrent()) {
    return;
  }

  if (data.total === 0) {
    root.replaceChildren(UI.emptyTile("No defaulters", `Every student is at ${data.limit}% or above in every subject with classes.`));
    return;
  }

  const lowest = data.entries[0];

  const summary = h("section", { class: "tile stat is-alert summary" },
    UI.countUp(h("div", { class: "tile-big" }), data.total),
    h("div", { class: "summary-lowest" },
      h("div", { class: "stat-label" }, data.total === 1 ? "entry below the minimum" : "entries below the minimum"),
      h("div", { class: "tile-note" }, `Lowest: ${lowest.name} at ${lowest.percentText} in ${lowest.subject}`)));

  root.replaceChildren(h("div", { class: "stack" },
    summary,
    UI.tile("Lowest first", `Below ${data.limit}% in a subject. A student appears once for each subject.`, null,
      UI.table([
        { label: "Student", lead: true, cell: (row) => UI.person(row.studentId, row.name, row.rollNo, row.initials) },
        { label: "Class", key: "className", tight: true, hidePhone: true },
        { label: "Subject", key: "subject", tight: true },
        { label: "Recent marks", cell: (row) => UI.marks(row.marks) },
        { label: "Attended", num: true, tight: true, hidePhone: true, cell: (row) => `${row.present}/${row.total}` },
        { label: "Attendance", num: true, tight: true, corner: true, cell: (row) => UI.badge("bad", row.percentText) },
      ], data.entries))));
};
