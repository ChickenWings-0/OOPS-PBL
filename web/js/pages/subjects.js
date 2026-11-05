// subjects.js
// The Subjects page. Each subject belongs to one class. The attendance in each
// ring comes from the dashboard reply, which C++ already works out per subject.

// One subject's card, with a shortcut to mark its attendance.
function subjectCard(row) {
  const counts = row.total > 0 ? `${row.present} of ${row.total} marks present` : "No classes yet";

  return h("article", { class: "tile tile-lift subject-card" },
    UI.ring(row.percent, row.percentText, row.status),
    h("div", null,
      h("div", { class: "subject-code" }, row.code),
      h("h2", { class: "subject-name" }, row.name),
      h("div", { class: "subject-meta" }, `${row.className} · ${counts}`),
      h("a", { class: "link-btn", href: `#/mark/${encodeURIComponent(row.code)}` }, "Mark attendance", icon("arrow", 15))));
}

Pages.subjects = async function (root, isCurrent) {
  const results = h("div", null, UI.skeleton(["span-4"], ["span-4"], ["span-4"]));

  function addButton() {
    return h("button", { class: "btn btn-primary", type: "button", onClick: openForm }, icon("plus", 18), "Add subject");
  }

  async function load() {
    let reply;
    try {
      reply = await Api.get("/api/dashboard");
    } catch (error) {
      if (isCurrent()) {
        results.replaceChildren(UI.emptyTile("Could not load subjects", error.message));
      }
      return;
    }
    if (!isCurrent()) {
      return;
    }

    if (reply.subjects.length === 0) {
      results.replaceChildren(UI.emptyTile("No subjects yet", "Add a subject before marking attendance.", addButton()));
      return;
    }
    results.replaceChildren(h("div", { class: "subject-grid" }, ...reply.subjects.map(subjectCard)));
  }

  async function openForm() {
    let classes = [];
    try {
      classes = (await Api.get("/api/classes")).classes;
    } catch (error) {
      // The form still works: the suggestions are only a convenience.
    }

    UI.formModal("Add subject", "Add subject", [
      UI.field("Subject code", "code", { placeholder: "For example CS201A" }),
      UI.field("Subject name", "name"),
      UI.field("Class", "className", { listId: "class-list", placeholder: "For example AIML-A" }),
      h("datalist", { id: "class-list" }, ...classes.map((name) => h("option", { value: name }))),
    ], (fields) => Api.post("/api/subjects", {
      code: fields.code.value,
      name: fields.name.value,
      className: fields.className.value,
    }), load);
  }

  root.replaceChildren(h("div", { class: "stack" },
    h("div", { class: "wall-head" },
      h("p", { class: "wall-note" }, "Two sections studying one subject are entered twice, with different codes."),
      addButton()),
    results));
  load();
};
