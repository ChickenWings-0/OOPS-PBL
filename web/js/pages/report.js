// report.js
// The Student report page. Without a student chosen it shows a wall of students.
// The percentages and the status words all come from C++.

// One subject's ring, with its name, counts, and status in words.
function subjectRing(row, limit) {
  const hasClasses = row.status !== "none";

  return h("article", { class: "report-subject" },
    UI.ring(row.percent, row.percentText, row.status),
    h("div", { class: "report-subject-name" }, row.name),
    h("div", { class: "report-subject-sub" },
      hasClasses ? `${row.code} · ${row.present} of ${row.total} classes` : row.code),
    hasClasses
      ? UI.badge(row.status === "low" ? "bad" : "good", row.status === "low" ? `Below ${limit}%` : "OK")
      : UI.badge("none", "No classes yet"));
}

// One tile for each student, to choose whose report to open.
function studentChoice(row) {
  return h("a", { class: "tile pick", href: `#/report/${row.id}` },
    UI.face(row.initials, row.id),
    h("div", { class: "person-text" },
      h("span", { class: "person-name" }, row.name),
      h("span", { class: "person-roll" }, `${row.rollNo} · ${row.className}`)),
    icon("arrow", 19));
}

// The wall shown before a student is chosen.
function studentPicker(root, isCurrent) {
  const results = h("div", null, UI.skeleton(["span-4", "is-short"], ["span-4", "is-short"], ["span-4", "is-short"]));

  async function load(text) {
    try {
      const query = new URLSearchParams({ q: text, sort: "rollNo" }).toString();
      const reply = await Api.get(`/api/students?${query}`);
      if (!isCurrent()) {
        return;
      }
      if (reply.allStudents === 0) {
        results.replaceChildren(UI.emptyTile("No students yet", "Add students to see their reports here.",
          h("a", { class: "btn btn-primary", href: "#/students" }, "Go to Students")));
        return;
      }
      if (reply.total === 0) {
        results.replaceChildren(UI.emptyTile("No matching students", "Search by part of a name, or by a full roll number."));
        return;
      }
      results.replaceChildren(h("div", { class: "pick-grid" }, ...reply.students.map(studentChoice)));
    } catch (error) {
      if (isCurrent()) {
        results.replaceChildren(UI.emptyTile("Could not load students", error.message));
      }
    }
  }

  root.replaceChildren(h("div", { class: "stack" },
    h("div", { class: "toolbar" }, UI.search("report-search", "Find a student", "Find a student by name or roll number", load)),
    results));
  load("");
}

// Draws the page. id comes from an address like #/report/2.
Pages.report = async function (root, isCurrent, id) {
  if (!id) {
    studentPicker(root, isCurrent);
    return;
  }

  root.replaceChildren(UI.skeleton(["span-5", "is-tall"], ["span-7", "is-tall"], ["span-12"]));

  let data;
  try {
    data = await Api.get(`/api/reports/student/${encodeURIComponent(id)}`);
  } catch (error) {
    if (isCurrent()) {
      root.replaceChildren(UI.emptyTile("No report to show", error.message,
        h("a", { class: "btn btn-secondary", href: "#/report" }, "Choose a student")));
    }
    return;
  }
  if (!isCurrent()) {
    return;
  }

  const { student, subjects, overall, limit } = data;
  const hasClasses = overall.total > 0;

  const [whole, rest] = UI.percent(overall.percentText);
  if (hasClasses) {
    UI.countUp(whole, Number(whole.textContent));
  }

  const hero = h("article", { class: "tile hero span-5", "data-tile": "overall" },
    h("div", { class: "report-person" },
      h("span", { class: "face", "aria-hidden": "true" }, student.initials),
      h("div", null,
        h("h2", { class: "report-name" }, student.name),
        h("p", { class: "report-meta hero-pill" }, `${student.rollNo} · ${student.className}`))),
    h("div", null,
      hasClasses
        ? h("div", { class: "hero-number" }, whole, rest)
        : h("div", { class: "hero-words" }, "No classes yet"),
      h("div", { class: "hero-sub" }, hasClasses ? `Overall, ${overall.present} of ${overall.total} classes` : "Overall")));

  const rings = UI.tile("By subject", `The minimum in each subject is ${limit}%`, null,
    subjects.length > 0
      ? h("div", { class: "report-rings" }, ...subjects.map((row) => subjectRing(row, limit)))
      : UI.empty("No subjects for this class", `Add a subject for ${student.className} to see attendance here.`));
  rings.classList.add("span-7");

  const tiles = [hero, rings];

  if (hasClasses) {
    const history = UI.tile("Recent marks", "Latest classes in each subject, oldest first", null,
      UI.table([
        { label: "Subject", lead: true, tight: true, key: "code" },
        { label: "Marks", corner: true, cell: (row) => (row.marks.length > 0 ? UI.marks(row.marks) : "No classes yet") },
      ], subjects));
    history.classList.add("span-12");
    tiles.push(history);
  }

  root.replaceChildren(h("div", { class: "stack" },
    h("div", null, h("a", { class: "back-link", href: "#/report" }, icon("arrow", 17), "All students")),
    h("div", { class: "bento" }, ...tiles)));
  App.setHead("Student report", `${student.className} · ${App.today.long}`);
};
