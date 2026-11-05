// students.js
// The Students page. C++ searches, sorts, and validates. This file only sends
// what was typed and shows the reply.

// The add and edit form fields. student is empty when adding.
function studentFields(student, classes) {
  return [
    UI.field("Roll / enrollment number", "rollNo", { value: student.rollNo }),
    UI.field("Full name", "name", { value: student.name }),
    UI.field("Class", "className", { value: student.className, listId: "class-list", placeholder: "For example AIML-A" }),
    h("datalist", { id: "class-list" }, ...classes.map((name) => h("option", { value: name }))),
  ];
}

// Draws the Students page.
Pages.students = async function (root, isCurrent) {
  const state = { q: "", sort: "rollNo", order: "asc" };
  const results = h("div", null);
  const count = h("span", { class: "tile-note" });
  const sortChoices = [["rollNo", "Roll no"], ["name", "Name"], ["className", "Class"], ["id", "ID"]];
  const sortRow = h("div", { class: "mini-pills", role: "group", "aria-label": "Sort by" });
  let latestLoad = 0;   // only the newest request may draw

  // Asks the server for the current search and sort, and redraws the table.
  async function load() {
    latestLoad += 1;
    const thisLoad = latestLoad;
    const query = new URLSearchParams(state).toString();
    let reply;
    try {
      reply = await Api.get(`/api/students?${query}`);
    } catch (error) {
      if (isCurrent() && thisLoad === latestLoad) {
        results.replaceChildren(UI.empty("Could not load students", error.message));
      }
      return;
    }
    if (!isCurrent() || thisLoad !== latestLoad) {
      return;
    }

    count.textContent = `${reply.total} of ${reply.allStudents}`;

    if (reply.allStudents === 0) {
      results.replaceChildren(UI.empty("No students yet", "Add the first student to start the register.", addButton()));
    } else if (reply.total === 0) {
      results.replaceChildren(UI.empty("No matching students", "Search by part of a name, or by a full roll number."));
    } else {
      results.replaceChildren(table(reply.students));
    }
  }

  // Shows which way each sort button points now.
  function showSort() {
    sortRow.replaceChildren(...sortChoices.map(([field, label]) => {
      const active = state.sort === field;
      const arrow = state.order === "asc" ? " ↑" : " ↓";
      return h("button", { type: "button", "aria-pressed": String(active), onClick: () => sortBy(field) },
        label, active ? arrow : "");
    }));
  }

  // Changes the sort. Pressing the same button again reverses the order.
  function sortBy(field) {
    state.order = state.sort === field && state.order === "asc" ? "desc" : "asc";
    state.sort = field;
    showSort();
    load();
  }

  function table(rows) {
    return UI.table([
      { label: "Student", lead: true, cell: (row) => UI.person(row.id, row.name, row.rollNo, row.initials) },
      { label: "Class", tight: true, cell: (row) => UI.badge("none", row.className) },
      { label: "ID", key: "id", num: true, tight: true, hidePhone: true },
      {
        label: "Actions", tight: true, corner: true,
        cell: (row) => h("div", { class: "row-actions" },
          h("button", { class: "icon-btn", type: "button", "aria-label": `Edit ${row.name}`, onClick: () => openForm(row) }, icon("edit", 17)),
          h("button", { class: "icon-btn is-danger", type: "button", "aria-label": `Delete ${row.name}`, onClick: () => remove(row) }, icon("trash", 17))),
      },
    ], rows);
  }

  // Opens the add form, or the edit form when a student is given.
  async function openForm(student) {
    let classes = [];
    try {
      classes = (await Api.get("/api/classes")).classes;
    } catch (error) {
      // The form still works: the suggestions are only a convenience.
    }

    const editing = student !== undefined;
    UI.formModal(editing ? "Edit student" : "Add student", editing ? "Save changes" : "Add student",
      studentFields(student || {}, classes),
      (fields, confirmed) => {
        const body = {
          rollNo: fields.rollNo.value,
          name: fields.name.value,
          className: fields.className.value,
        };
        return editing ? Api.put(`/api/students/${student.id}`, body)
          : Api.post("/api/students", { ...body, confirmed });
      },
      load);
  }

  // Deletes a student, after asking.
  async function remove(student) {
    const sure = await UI.confirm("Delete student",
      `Delete ${student.name} (${student.rollNo}) and all their attendance? This cannot be undone.`,
      "Delete student", true);
    if (!sure) {
      return;
    }
    try {
      const reply = await Api.delete(`/api/students/${student.id}`);
      UI.toast(reply.message);
      load();
    } catch (error) {
      UI.toast(error.message, "bad");
    }
  }

  function addButton() {
    return h("button", { class: "btn btn-primary", type: "button", onClick: () => openForm() }, icon("plus", 18), "Add student");
  }

  const search = UI.search("student-search", "Search students", "Search by name or roll number", (text) => {
    state.q = text;
    load();
  });

  results.replaceChildren(UI.skeleton(["span-12", "is-tall"]));
  showSort();

  root.replaceChildren(h("div", { class: "stack" },
    h("div", { class: "toolbar" }, search, addButton()),
    UI.tile("Everyone", null,
      h("div", { class: "sort-row" }, count, h("span", { class: "sort-label" }, "Sort"), sortRow), results)));

  load();
};
