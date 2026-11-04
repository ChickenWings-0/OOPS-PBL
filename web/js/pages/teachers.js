// teachers.js
// The Teachers page. Only the admin may use it, and C++ enforces that: a
// teacher who opens this address sees the server's refusal.

Pages.teachers = async function (root, isCurrent) {
  const results = h("div", null, UI.loading("Loading teachers"));
  const addButton = h("button", { class: "btn btn-primary", type: "button", onClick: openForm }, "Add teacher");

  async function load() {
    let reply;
    try {
      reply = await Api.get("/api/teachers");
    } catch (error) {
      if (isCurrent()) {
        addButton.hidden = true;
        results.replaceChildren(UI.empty("Admin only", error.message));
      }
      return;
    }
    if (!isCurrent()) {
      return;
    }

    results.replaceChildren(UI.table([
      { label: "ID", key: "id", num: true, tight: true },
      { label: "Name", key: "name" },
      { label: "Username", cell: (row) => h("span", { class: "mono" }, row.username) },
      { label: "Role", tight: true, cell: (row) => (row.isAdmin ? "Admin" : "Teacher") },
    ], reply.teachers));
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

  root.replaceChildren(h("div", { class: "stack" },
    UI.sheet("Teachers", "Passwords are never shown.", addButton, results)));
  load();
};
