// subjects.js
// The Subjects page. Each subject belongs to one class.

Pages.subjects = async function (root, isCurrent) {
  const results = h("div", null, UI.loading("Loading subjects"));

  function addButton() {
    return h("button", { class: "btn btn-primary", type: "button", onClick: openForm }, "Add subject");
  }

  async function load() {
    let reply;
    try {
      reply = await Api.get("/api/subjects");
    } catch (error) {
      if (isCurrent()) {
        results.replaceChildren(UI.empty("Could not load subjects", error.message));
      }
      return;
    }
    if (!isCurrent()) {
      return;
    }

    if (reply.total === 0) {
      results.replaceChildren(UI.empty("No subjects yet", "Add a subject before marking attendance.", addButton()));
      return;
    }
    results.replaceChildren(UI.table([
      { label: "Code", tight: true, cell: (row) => h("span", { class: "mono" }, row.code) },
      { label: "Subject", key: "name" },
      { label: "Class", key: "className", tight: true },
    ], reply.subjects));
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
    UI.sheet("Subjects", "Two sections studying one subject are entered twice, with different codes.", addButton(), results)));
  load();
};
