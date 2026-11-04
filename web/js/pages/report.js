// report.js
// The Student report page. Without a student chosen it shows a search list.
// The percentages and the status words all come from C++.

// One subject's line: name, meter, percentage, and status in words.
function subjectLine(row, limit) {
  const hasClasses = row.status !== "none";
  const kind = row.status === "low" ? "bad" : "good";

  const meter = h("div", { class: "meter", role: "img", "aria-label": `${row.percentText} attendance` },
    hasClasses ? h("div", { class: `meter-fill is-${kind}` }) : null,
    h("div", { class: "meter-limit" }));
  if (hasClasses) {
    meter.firstChild.style.width = `${row.percent}%`;
  }
  meter.lastChild.style.left = `${limit}%`;

  return h("div", { class: "subject-row" },
    h("div", null,
      h("div", { class: "subject-name" }, row.name),
      h("div", { class: "subject-code" }, row.code),
      hasClasses ? h("div", { class: "subject-count" }, `${row.present} of ${row.total} classes`) : null),
    meter,
    h("div", { class: "subject-percent" }, hasClasses ? row.percentText : "-"),
    h("div", null, hasClasses
      ? UI.stamp(kind, row.status === "low" ? `Below ${limit}%` : "OK")
      : UI.stamp("none", "No classes yet")));
}

// The list shown before a student is chosen.
function studentPicker(root, isCurrent) {
  const results = h("div", null, UI.loading("Loading students"));

  async function load(text) {
    try {
      const query = new URLSearchParams({ q: text, sort: "rollNo" }).toString();
      const reply = await Api.get(`/api/students?${query}`);
      if (!isCurrent()) {
        return;
      }
      if (reply.total === 0) {
        results.replaceChildren(UI.empty("No matching students", "Search by part of a name, or by a full roll number."));
        return;
      }
      results.replaceChildren(UI.table([
        { label: "Student", cell: (row) => UI.person(row.id, row.name, row.rollNo) },
        { label: "Class", key: "className", tight: true },
      ], reply.students));
    } catch (error) {
      if (isCurrent()) {
        results.replaceChildren(UI.empty("Could not load students", error.message));
      }
    }
  }

  let timer = null;
  const search = h("input", {
    class: "input", id: "report-search", type: "search", placeholder: "Name or roll number", autocomplete: "off",
    onInput: () => {
      clearTimeout(timer);
      timer = setTimeout(() => load(search.value), 200);
    },
  });

  root.replaceChildren(h("div", { class: "stack" },
    h("div", { class: "toolbar" },
      h("div", { class: "field toolbar-grow" }, h("label", { class: "label", for: "report-search" }, "Find a student"), search)),
    UI.sheet("Choose a student", null, null, results)));
  load("");
}

// Draws the page. id comes from an address like #/report/2.
Pages.report = async function (root, isCurrent, id) {
  if (!id) {
    studentPicker(root, isCurrent);
    return;
  }

  root.replaceChildren(h("section", { class: "sheet" }, UI.loading("Loading the report")));

  let data;
  try {
    data = await Api.get(`/api/reports/student/${encodeURIComponent(id)}`);
  } catch (error) {
    if (isCurrent()) {
      root.replaceChildren(h("section", { class: "sheet" }, UI.empty("No report to show", error.message,
        h("a", { class: "btn btn-secondary", href: "#/report" }, "Choose a student"))));
    }
    return;
  }
  if (!isCurrent()) {
    return;
  }

  const { student, subjects, overall, limit } = data;
  const hasClasses = overall.total > 0;

  root.replaceChildren(h("div", { class: "stack" },
    h("div", null, h("a", { class: "link-btn", href: "#/report" }, "All students")),
    h("section", { class: "sheet" },
      h("div", { class: "report-head" },
        h("div", null,
          h("h2", { class: "report-name" }, student.name),
          h("p", { class: "report-meta" }, `${student.rollNo} · ${student.className}`)),
        h("div", { class: "report-overall" },
          h("div", { class: "label" }, "Overall"),
          h("div", { class: "tally-value" }, hasClasses ? overall.percentText : "-"),
          h("div", { class: "report-meta" }, hasClasses ? `${overall.present} of ${overall.total} classes` : "No classes yet"))),
      subjects.length > 0
        ? h("div", null, ...subjects.map((row) => subjectLine(row, limit)))
        : UI.empty("No subjects for this class", `Add a subject for ${student.className} to see attendance here.`)),
    hasClasses
      ? UI.sheet("Recent marks", "Latest classes in each subject, oldest first", null,
        UI.table([
          { label: "Subject", tight: true, cell: (row) => h("span", { class: "mono" }, row.code) },
          { label: "Marks", cell: (row) => (row.marks.length > 0 ? UI.marks(row.marks) : "No classes yet") },
        ], subjects))
      : null));
};
