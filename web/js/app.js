// app.js
// Starts the site: login, the sidebar and top bar, and moving between pages.

// Every page in the sidebar. The address after # chooses the page.
const ROUTES = [
  { hash: "dashboard", label: "Dashboard", icon: "dashboard", group: "Overview" },
  { hash: "students", label: "Students", icon: "users", group: "Manage" },
  { hash: "subjects", label: "Subjects", icon: "book", group: "Manage" },
  { hash: "mark", label: "Mark attendance", icon: "clipboard", group: "Manage" },
  { hash: "report", label: "Student report", icon: "report", group: "Reports" },
  { hash: "defaulters", label: "Defaulters", icon: "alert", group: "Reports" },
  { hash: "daily", label: "Daily report", icon: "calendar", group: "Reports" },
  { hash: "monthly", label: "Monthly report", icon: "columns", group: "Reports" },
  { hash: "teachers", label: "Teachers", icon: "cap", group: "Admin", adminOnly: true },
];

const App = {
  user: null,
  today: null,
  shell: null,
  content: null,
  title: null,
  subtitle: null,
  visit: 0,    // counts page changes, so a slow reply cannot draw over a newer page

  // Decides between the login page and the app, then starts.
  async start() {
    Api.onSessionEnded = () => App.showLogin("Your session has ended. Please sign in again.");
    window.addEventListener("hashchange", () => App.showPage());

    if (!Api.getToken()) {
      App.showLogin();
      return;
    }

    try {
      await App.loadUser();
      App.showShell();
    } catch (error) {
      if (error.status !== 401) {
        App.showLogin(error.message);
      }
    }
  },

  // Asks the server who is logged in and what today's date is.
  async loadUser() {
    const reply = await Api.get("/api/me");
    App.user = reply.user;
    App.today = reply.today;
  },

  showLogin(notice) {
    Charts.clear();
    App.shell = null;
    App.user = null;
    document.title = "Sign in · Attendance Management System";
    Pages.login(document.getElementById("app"), notice, async () => {
      try {
        await App.loadUser();
        App.showShell();
      } catch (error) {
        App.showLogin(error.message);
      }
    });
  },

  // Builds one sidebar link.
  navLink(route) {
    return h("a", { class: "nav-item", href: `#/${route.hash}`, "data-hash": route.hash, onClick: () => App.closeDrawer() },
      icon(route.icon), route.label);
  },

  // Builds the sidebar. Hiding Teachers is only for appearance: C++ decides
  // who may really see that data.
  sidebar() {
    const nav = h("nav", { class: "nav", "aria-label": "Main" });
    let group = null;

    for (const route of ROUTES) {
      if (route.adminOnly && !App.user.isAdmin) {
        continue;
      }
      if (route.group !== group) {
        group = route.group;
        nav.append(h("div", { class: "nav-label" }, group));
      }
      nav.append(App.navLink(route));
    }
    return h("aside", { class: "sidebar", id: "sidebar" }, brand(), nav);
  },

  // Builds the user button with its menu.
  userMenu() {
    const menu = h("div", { class: "user-menu", hidden: true },
      h("div", { class: "user-menu-head" },
        h("div", { class: "user-menu-name" }, App.user.name),
        h("div", { class: "user-menu-role" }, App.user.isAdmin ? "Administrator" : "Teacher")),
      h("button", { type: "button", onClick: () => App.changePassword() }, icon("key", 16), "Change password"),
      h("button", { type: "button", onClick: () => App.logout() }, icon("logout", 16), "Log out"));

    const button = h("button", { class: "user-button", type: "button", "aria-haspopup": "true", "aria-expanded": "false" },
      h("span", { class: "avatar" }, App.user.initials),
      h("span", { class: "user-name" }, App.user.name),
      icon("chevron", 16));

    const setOpen = (open) => {
      menu.hidden = !open;
      button.setAttribute("aria-expanded", String(open));
    };

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      setOpen(menu.hidden);
    });
    document.addEventListener("click", () => setOpen(false));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        App.closeDrawer();
      }
    });

    return h("div", { class: "user" }, button, menu);
  },

  // Builds the frame around every page, then shows the current page.
  showShell() {
    App.title = h("h1", { class: "topbar-title" });
    App.subtitle = h("p", { class: "topbar-subtitle" });
    App.content = h("div", { class: "content" });

    const menuButton = h("button", {
      class: "icon-btn topbar-menu", type: "button", "aria-label": "Open menu",
      "aria-controls": "sidebar", onClick: () => App.shell.classList.add("drawer-open"),
    }, icon("menu", 20));

    App.shell = h("div", { class: "shell" },
      App.sidebar(),
      h("div", { class: "backdrop", onClick: () => App.closeDrawer() }),
      h("div", { class: "main" },
        h("header", { class: "topbar" },
          menuButton,
          h("div", { class: "topbar-heading" }, App.title, App.subtitle),
          themeButton(),
          App.userMenu()),
        h("main", { class: "content-area" }, App.content)));

    document.getElementById("app").replaceChildren(App.shell);
    App.showPage();
  },

  closeDrawer() {
    if (App.shell) {
      App.shell.classList.remove("drawer-open");
    }
  },

  // Shows the page named in the address bar.
  showPage() {
    if (!App.shell) {
      return;
    }

    const hash = window.location.hash.replace("#/", "");
    const route = ROUTES.find((item) => item.hash === hash) || ROUTES[0];

    App.title.textContent = route.label;
    App.subtitle.textContent = `Today: ${App.today.date}`;
    document.title = `${route.label} · Attendance Management System`;

    App.shell.querySelectorAll(".nav-item").forEach((link) => {
      const active = link.dataset.hash === route.hash;
      link.classList.toggle("active", active);
      if (active) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    Charts.clear();
    App.visit += 1;
    const thisVisit = App.visit;
    const isCurrent = () => thisVisit === App.visit;

    if (Pages[route.hash]) {
      Pages[route.hash](App.content, isCurrent);
    } else {
      App.content.replaceChildren(h("section", { class: "card" },
        UI.empty(route.icon, `${route.label} is coming next`,
          "This page is built after the dashboard design is approved.")));
    }
  },

  // Opens the change password dialog. C++ checks both passwords.
  changePassword() {
    const submit = h("button", { class: "btn btn-primary", type: "submit" }, "Change password");
    const form = h("form", { novalidate: true },
      UI.formError(),
      UI.field("Current password", "currentPassword", "password", "current-password"),
      UI.field("New password", "newPassword", "password", "new-password"),
      h("div", { class: "modal-actions" }, submit));

    const dialog = UI.modal("Change password", form);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      UI.clearErrors(form);
      UI.setBusy(submit, true);

      try {
        const reply = await Api.post("/api/account/password", {
          currentPassword: form.elements.currentPassword.value,
          newPassword: form.elements.newPassword.value,
        });
        dialog.close();
        UI.toast(reply.message);
      } catch (error) {
        UI.showError(form, error);
        UI.setBusy(submit, false);
      }
    });
  },

  // Ends the session on the server, then returns to the login page.
  async logout() {
    try {
      await Api.post("/api/logout");
    } catch (error) {
      // The token is forgotten below, so logging out still works offline.
    }
    Api.clearToken();
    window.location.hash = "";
    App.showLogin();
  },
};

App.start();
