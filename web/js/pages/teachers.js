// teachers.js
// The Teachers page. Only the admin may use it, and C++ enforces that: a
// teacher who opens this address sees the server's refusal.

function teacherCard(row) {
  return h("article", { class: "tile tile-lift person-card" },
    UI.face(row.initials, row.id),
    h("div", { class: "person-text" },
      h("div", { class: "person-name" }, row.name),
      h("span", { class: "person-roll" }, row.username)),
    UI.badge(row.isAdmin ? "good" : "none", row.isAdmin ? "Admin" : "Teacher"));
}

Pages.teachers = async function (root, isCurrent) {
  const results = h("div", null, UI.skeleton(["span-4", "is-short"], ["span-4", "is-short"]));
  const addButton = h("button", { class: "btn btn-primary", type: "button", onClick: openForm }, icon("plus", 18), "Add teacher");
  const head = h("div", { class: "wall-head" },
    h("p", { class: "wall-note" }, "Passwords are never shown."), addButton);

  async function load() {
    let reply;
    try {
      reply = await Api.get("/api/teachers");
    } catch (error) {
      if (isCurrent()) {
        head.hidden = true;
        results.replaceChildren(UI.emptyTile("Admin only", error.message));
      }
      return;
    }
    if (!isCurrent()) {
      return;
    }

    results.replaceChildren(h("div", { class: "card-grid" }, ...reply.teachers.map(teacherCard)));
  }

  function openForm() {
    UI.formModal("Add teacher", "Add teacher", [
      UI.field("Full name", "name"),
      UI.field("Username", "username"),
      UI.field("Password", "password", { type: "password", autocomplete: "new-password" }),
    ], (fields) => Api.post("/api/teachers", {
      name: fields.name.value,
      username: fields.username.value,
      password: fields.password.value,
    }), load);
  }

  root.replaceChildren(h("div", { class: "stack" }, head, results));
  load();
};
