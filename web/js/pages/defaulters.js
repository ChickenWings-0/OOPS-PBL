// defaulters.js
// The Defaulters page. C++ decides who is below the limit and sorts the list.

Pages.defaulters = async function (root, isCurrent) {
  root.replaceChildren(h("section", { class: "sheet" }, UI.loading("Loading the list")));

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

  const note = `Below ${data.limit}% in a subject, lowest first. A student appears once for each subject.`;

  if (data.total === 0) {
    root.replaceChildren(UI.sheet("Defaulters", note, null,
      UI.empty("No defaulters", `Every student is at ${data.limit}% or above in every subject with classes.`)));
    return;
  }

  root.replaceChildren(UI.sheet("Defaulters", note,
    h("span", { class: "sheet-note mono" }, `${data.total} ${data.total === 1 ? "entry" : "entries"}`),
    UI.table([
      { label: "Student", cell: (row) => UI.person(row.studentId, row.name, row.rollNo) },
      { label: "Class", key: "className", tight: true, hideNarrow: true },
      { label: "Subject", tight: true, cell: (row) => h("span", { class: "mono" }, row.subject) },
      { label: "Recent marks", hideNarrow: true, cell: (row) => UI.marks(row.marks) },
      { label: "Attended", num: true, tight: true, hideNarrow: true, cell: (row) => `${row.present}/${row.total}` },
      { label: "Attendance", num: true, tight: true, cell: (row) => UI.stamp("bad", row.percentText) },
    ], data.entries)));
};
