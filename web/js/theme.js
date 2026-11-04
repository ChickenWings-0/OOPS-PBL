// theme.js
// Light and dark mode. This is the only thing the site keeps in localStorage,
// because it is a display preference and not project data.

const Theme = {
  // Uses the saved choice, or else the computer's own setting.
  start() {
    let saved = null;
    try {
      saved = localStorage.getItem("theme");
    } catch (error) {
      // Storage can be blocked. The site still works, it just will not remember.
    }
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = saved || (prefersDark ? "dark" : "light");
  },

  current() {
    return document.documentElement.dataset.theme;
  },

  // Switches theme, remembers it, and tells the charts to redraw.
  toggle() {
    const next = Theme.current() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch (error) {
      // See above.
    }
    window.dispatchEvent(new Event("themechange"));
  },
};

Theme.start();
