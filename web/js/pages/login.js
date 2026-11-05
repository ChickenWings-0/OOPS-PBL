// login.js
// The login page. The browser only sends what was typed: C++ checks it,
// and any error shown here is the server's own message.

const Pages = {};

// The logo: a tick in a gradient circle, with the name beside it.
function brand() {
  return h("div", { class: "brand" },
    h("div", { class: "dock-logo" }, icon("check", 24)),
    h("div", { class: "brand-text" },
      h("div", { class: "brand-name" }, "Attendance"),
      h("div", { class: "brand-tag" }, "Management System")));
}

// A button that switches between light and dark mode. withLabel adds a word
// beside the icon, for the phone's More sheet.
function themeButton(className, size, withLabel) {
  const button = h("button", { class: className, type: "button", "aria-label": "Switch theme" });
  const show = () => {
    const isDark = Theme.current() === "dark";
    button.replaceChildren(icon(isDark ? "sun" : "moon", size), withLabel ? (isDark ? "Light mode" : "Dark mode") : "");
    if (!withLabel) {
      button.append(h("span", { class: "dock-tip" }, isDark ? "Light mode" : "Dark mode"));
    }
  };

  button.addEventListener("click", () => {
    Theme.toggle();
    show();
  });
  show();
  return button;
}

// The artwork on the right of the login page. It is decoration only, so it is
// hidden from screen readers, and none of it is real data.
function loginArt() {
  const row = (initials, tone, away) => h("div", { class: "art-row" },
    h("span", { class: `face tone-${tone}` }, initials),
    h("div", { class: "art-line" }),
    h("div", { class: away ? "art-tick is-away" : "art-tick" }, icon(away ? "close" : "check", 15)));

  return h("aside", { class: "login-art", "aria-hidden": "true" },
    h("div", { class: "art-orbit" }),
    h("div", { class: "art-card art-roster" }, row("AS", 0), row("DV", 1), row("KM", 2, true), row("AI", 3)),
    h("div", { class: "art-card art-ring" }, UI.ring(92, "92%", "ok")),
    h("div", { class: "art-card art-saved" },
      h("div", { class: "art-tick" }, icon("check", 15)), "Attendance saved"),
    h("h2", null, "Every class, accounted for."),
    h("p", null, "One tap for each student. The C++ server does all the counting."));
}

// Draws the login page. notice is an optional message, such as "session ended".
Pages.login = function (root, notice, onLoggedIn) {
  const submit = h("button", { class: "btn btn-glow btn-wide", type: "submit" }, "Sign in");

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
      h("section", { class: "login-panel" },
        h("div", { class: "login-top" }, brand(), themeButton("icon-btn", 19)),
        h("div", { class: "login-card" },
          h("h1", { class: "login-title" }, "Welcome back"),
          h("p", { class: "login-subtitle" }, "Sign in to mark today's classes and see how everyone is doing."),
          form),
        h("p", { class: "login-foot" }, "For teachers and the administrator.")),
      loginArt()));

  if (notice) {
    UI.showError(form, { message: notice });
  }
  form.elements.username.focus();
};
