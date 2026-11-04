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
  const results = h("div", null, UI.loading("Loading students"));
  const count = h("span", null);
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

  // Changes the sort. Pressing the same heading again reverses the order.
  function sortBy(field) {
    state.order = state.sort === field && state.order === "asc" ? "desc" : "asc";
    state.sort = field;
    load();
  }

  function table(rows) {
    return UI.table([
      { label: "ID", key: "id", sort: "id", num: true, tight: true, hideNarrow: true },
      { label: "Roll no", sort: "rollNo", tight: true, hideNarrow: true, cell: (row) => h("span", { class: "mono" }, row.rollNo) },
      { label: "Name", sort: "name", firstNarrow: true, cell: (row) => h("a", { class: "person-name", href: `#/report/${row.id}` }, row.name) },
      { label: "Class", key: "className", sort: "className", tight: true },
      {
        label: "Actions", tight: true,
        cell: (row) => h("div", { class: "row-actions" },
          h("button", { class: "link-btn", type: "button", onClick: () => openForm(row) }, "Edit"),
          h("button", { class: "link-btn is-danger", type: "button", onClick: () => remove(row) }, "Delete")),
      },
    ], rows, state, sortBy);
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
    return h("button", { class: "btn btn-primary", type: "button", onClick: () => openForm() }, "Add student");
  }

  // Waits for a short pause in typing, so each key press is not a request.
  let timer = null;
  const search = h("input", {
    class: "input", id: "student-search", type: "search", placeholder: "Name or roll number", autocomplete: "off",
    onInput: () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        state.q = search.value;
        load();
      }, 200);
    },
  });

  root.replaceChildren(h("div", { class: "stack" },
    h("div", { class: "toolbar" },
      h("div", { class: "field toolbar-grow" }, h("label", { class: "label", for: "student-search" }, "Search"), search),
      addButton()),
    UI.sheet("Student register", null, h("span", { class: "sheet-note mono" }, count), results)));

  load();
};
