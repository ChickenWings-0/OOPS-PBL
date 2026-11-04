// login.js
// The login page. The browser only sends what was typed: C++ checks it,
// and any error shown here is the server's own message.

const Pages = {};

// The logo: two cells from a register page, with the name beside them.
function brand() {
  return h("div", { class: "brand" },
    h("div", { class: "brand-cells", "aria-hidden": "true" }, h("span", null, "P"), h("span", null, "A")),
    h("div", null,
      h("div", { class: "brand-name" }, "Attendance"),
      h("div", { class: "brand-tag" }, "Management System")));
}

// A button that switches between light and dark mode.
function themeButton() {
  const button = h("button", { class: "icon-btn", type: "button", "aria-label": "Switch theme" });
  const showIcon = () => button.replaceChildren(icon(Theme.current() === "dark" ? "sun" : "moon", 19));

  button.addEventListener("click", () => {
    Theme.toggle();
    showIcon();
  });
  showIcon();
  return button;
}

// Draws the login page. notice is an optional message, such as "session ended".
Pages.login = function (root, notice, onLoggedIn) {
  const submit = h("button", { class: "btn btn-primary", type: "submit" }, "Sign in");

  const form = h("form", { class: "login-form", novalidate: true },
    UI.formError(),
    UI.field("Username", "username", { autocomplete: "username" }),
    UI.field("Password", "password", { type: "password", autocomplete: "current-password" }),
    submit);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    UI.clearErrors(form);
    UI.setBusy(submit, true);

    try {
      const reply = await Api.post("/api/login", {
        username: form.elements.username.value,
        password: form.elements.password.value,
      });
      Api.setToken(reply.token);
      onLoggedIn();
    } catch (error) {
      UI.showError(form, error);
      UI.setBusy(submit, false);
    }
  });

  root.replaceChildren(
    h("main", { class: "login" },
      h("div", { class: "login-theme" }, themeButton()),
      h("section", { class: "login-card" },
        h("div", { class: "login-head" },
          brand(),
          h("h1", { class: "login-title" }, "Sign in to the register"),
          h("p", { class: "login-subtitle" }, "For teachers and the administrator.")),
        form)));

  if (notice) {
    UI.showError(form, { message: notice });
  }
  form.elements.username.focus();
};
