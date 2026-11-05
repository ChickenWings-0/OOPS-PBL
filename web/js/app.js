// app.js
// Starts the site: login, the dock and tab bar, and moving between pages.

// Every page. The address after # chooses the page. tab puts a page on the
// phone's tab bar, and the rest are under More.
const ROUTES = [
  { hash: "dashboard", label: "Dashboard", icon: "dashboard", tab: "Home" },
  { hash: "students", label: "Students", icon: "users", tab: "Students" },
  { hash: "subjects", label: "Subjects", icon: "book" },
  { hash: "mark", label: "Mark attendance", icon: "clipboard", tab: "Mark" },
  { hash: "report", label: "Student report", icon: "report", tab: "Reports" },
  { hash: "defaulters", label: "Defaulters", icon: "alert" },
  { hash: "daily", label: "Daily report", icon: "calendar" },
  { hash: "monthly", label: "Monthly report", icon: "columns" },
  { hash: "teachers", label: "Teachers", icon: "cap", adminOnly: true },
];

const App = {
  user: null,
  today: null,
  lastMarked: null,
  shell: null,
  content: null,
  title: null,
  kicker: null,
  menu: null,      // the open or closed user menu
  pageKeys: null,  // keyboard shortcuts of the current page, if it has any
  visit: 0,        // counts page changes, so a slow reply cannot draw over a newer page

  // Decides between the login page and the app, then starts.
  async start() {
    Api.onSessionEnded = () => App.showLogin("Your session has ended. Please sign in again.");
    window.addEventListener("hashchange", () => App.showPage());
    document.addEventListener("keydown", (event) => App.onKey(event));
    document.addEventListener("click", () => App.closeMenu());

    if (!Api.getToken()) {
      App.showLogin();
      Api.wake();
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
    App.lastMarked = reply.lastMarked;
  },

  showLogin(notice) {
    Charts.clear();
    App.shell = null;
    App.user = null;
    App.pageKeys = null;
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

  // The pages this person sees. Hiding Teachers is only for appearance: C++
  // decides who may really see that data.
  routes() {
    return ROUTES.filter((route) => !route.adminOnly || App.user.isAdmin);
  },

  // Builds the floating dock for wide screens.
  dock() {
    const links = App.routes().map((route) =>
      h("a", { class: "dock-link nav-item", href: `#/${route.hash}`, "data-hash": route.hash, "aria-label": route.label },
        icon(route.icon, 22), h("span", { class: "dock-tip" }, route.label)));

    return h("nav", { class: "dock", "aria-label": "Main" },
      h("a", { class: "dock-logo", href: "#/dashboard", "aria-label": "Attendance Management System home" }, icon("check", 24)),
      ...links,
      h("div", { class: "dock-gap" }),
      themeButton("dock-link", 22));
  },

  // Builds the tab bar for phones. The middle tab is Mark attendance.
  tabbar() {
    const tabs = App.routes().filter((route) => route.tab).map((route) =>
      h("a", {
        class: route.hash === "mark" ? "tab tab-main nav-item" : "tab nav-item",
        href: `#/${route.hash}`, "data-hash": route.hash,
      }, icon(route.icon, route.hash === "mark" ? 25 : 21), h("span", null, route.tab)));

    return h("nav", { class: "tabbar", "aria-label": "Main" }, ...tabs,
      h("button", { class: "tab", type: "button", onClick: () => App.openMore() }, icon("more", 21), h("span", null, "More")));
  },

  // The rest of the pages on a phone, in a sheet that slides up.
  openMore() {
    const others = App.routes().filter((route) => !route.tab);
    const links = others.map((route) =>
      h("a", {
        class: "more-link", href: `#/${route.hash}`, "data-hash": route.hash,
        onClick: () => dialog.close(),
      }, icon(route.icon, 20), route.label));

    const dialog = UI.modal("More", h("div", { class: "more-grid" }, ...links, themeButton("more-link", 20, true)));
  },

  // Builds the user button with its menu.
  userMenu() {
    App.menu = h("div", { class: "user-menu", hidden: true },
      h("div", { class: "user-menu-head" },
        h("div", { class: "user-menu-name" }, App.user.name),
        h("div", { class: "label" }, App.user.isAdmin ? "Admin" : "Teacher")),
      h("button", { type: "button", onClick: () => App.changePassword() }, icon("key", 17), "Change password"),
      h("button", { type: "button", onClick: () => App.logout() }, icon("logout", 17), "Log out"));

    const button = h("button", {
      class: "user-button", type: "button", "aria-haspopup": "true", "aria-expanded": "false",
      "aria-label": `Account menu for ${App.user.name}`,
    },
    h("span", { class: "user-name" }, App.user.name),
    h("span", { class: "avatar" }, App.user.initials));

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      App.menu.hidden = !App.menu.hidden;
      button.setAttribute("aria-expanded", String(!App.menu.hidden));
    });

    return h("div", { class: "user" }, button, App.menu);
  },

  closeMenu() {
    if (App.menu) {
      App.menu.hidden = true;
      App.menu.previousElementSibling.setAttribute("aria-expanded", "false");
    }
  },

  // Esc closes the menu, and the current page may have shortcuts of its own.
  onKey(event) {
    if (event.key === "Escape") {
      App.closeMenu();
    }
    if (App.pageKeys) {
      App.pageKeys(event);
    }
  },

  // Sets the big title at the top of the page, and the small line above it.
  setHead(title, kicker) {
    App.title.textContent = title;
    App.kicker.textContent = kicker || App.today.long;
  },

  // Builds the frame around every page, then shows the current page.
  showShell() {
    App.kicker = h("div", { class: "head-kicker" });
    App.title = h("h1", { class: "head-title" });
    App.content = h("main", { class: "content" });

    App.shell = h("div", { class: "shell" },
      App.dock(),
      h("div", { class: "page" },
        h("header", { class: "head" },
          h("div", { class: "head-text" }, App.kicker, App.title),
          App.userMenu()),
        App.content),
      App.tabbar());

    document.getElementById("app").replaceChildren(App.shell);
    App.showPage();
  },

  // Shows the page named in the address bar.
  showPage() {
    if (!App.shell) {
      return;
    }

    // The address looks like #/report/2: a page name, then an optional value.
    const [hash, value] = window.location.hash.replace("#/", "").split("/");
    const route = ROUTES.find((item) => item.hash === hash) || ROUTES[0];

    App.setHead(route.hash === "dashboard" ? App.user.greeting : route.label);
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
    App.pageKeys = null;
    App.visit += 1;
    const thisVisit = App.visit;
    const isCurrent = () => thisVisit === App.visit;

    window.scrollTo(0, 0);
    if (Pages[route.hash]) {
      Pages[route.hash](App.content, isCurrent, value);
    } else {
      App.content.replaceChildren(UI.emptyTile("Page not found", "Choose a page from the menu."));
    }
  },

  // Opens the change password dialog. C++ checks both passwords.
  changePassword() {
    UI.formModal("Change password", "Change password", [
      UI.field("Current password", "currentPassword", { type: "password", autocomplete: "current-password" }),
      UI.field("New password", "newPassword", { type: "password", autocomplete: "new-password" }),
    ], (fields) => Api.post("/api/account/password", {
      currentPassword: fields.currentPassword.value,
      newPassword: fields.newPassword.value,
    }), () => {});
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
