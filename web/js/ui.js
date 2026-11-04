// ui.js
// Small helpers that build the shared pieces of the page.
// Text is always added as text nodes, so anything sent by the server is shown
// as plain text and can never run as code.

// Creates an element. Example: h("p", { class: "note" }, "Hello", someChild)
// Keys starting with "on" become event listeners, and other keys become attributes.
function h(tag, props, ...children) {
  const element = document.createElement(tag);

  for (const [name, value] of Object.entries(props || {})) {
    if (name.startsWith("on")) {
      element.addEventListener(name.slice(2).toLowerCase(), value);
    } else if (value === true) {
      element.setAttribute(name, "");
    } else if (value !== false && value !== null && value !== undefined) {
      element.setAttribute(name, value);
    }
  }

  element.append(...children.filter((child) => child !== null && child !== undefined));
  return element;
}

const UI = {
  // Shows a short message in the corner that fades away by itself.
  toast(message, type = "good") {
    const box = h("div", { class: `toast is-${type}` }, icon(type), h("span", null, message));
    document.getElementById("toasts").append(box);
    setTimeout(() => {
      box.classList.add("is-leaving");
      setTimeout(() => box.remove(), 200);
    }, 4000);
  },

  // Opens a dialog. The browser's <dialog> keeps Tab inside it and closes on Esc.
  modal(title, body) {
    const dialog = h("dialog", { class: "modal", "aria-label": title },
      h("div", { class: "modal-head" },
        h("h2", { class: "modal-title" }, title),
        h("button", { class: "icon-btn", type: "button", "aria-label": "Close", onClick: () => dialog.close() },
          icon("close"))),
      h("div", { class: "modal-body" }, body));

    dialog.addEventListener("close", () => dialog.remove());
    document.body.append(dialog);
    dialog.showModal();
    return dialog;
  },

  // One labelled form input, with a place for its error message.
  field(label, name, type = "text", autocomplete = "off") {
    const id = `field-${name}`;
    return h("div", { class: "field", "data-field": name },
      h("label", { class: "field-label", for: id }, label),
      h("input", { class: "input", id, name, type, autocomplete }),
      h("div", { class: "field-error", id: `${id}-error` }));
  },

  // The error box at the top of a form. It starts hidden.
  formError() {
    return h("div", { class: "form-error", role: "alert", hidden: true }, icon("bad"), h("span"));
  },

  // Removes every error shown on a form.
  clearErrors(form) {
    form.querySelectorAll(".field.has-error").forEach((field) => field.classList.remove("has-error"));
    const box = form.querySelector(".form-error");
    if (box) {
      box.hidden = true;
    }
  },

  // Shows a server error under the field it is about, or at the top of the form.
  showError(form, error) {
    const field = error.field ? form.querySelector(`[data-field="${error.field}"]`) : null;
    if (field) {
      field.classList.add("has-error");
      field.querySelector(".field-error").textContent = error.message;
      field.querySelector("input, select").focus();
      return;
    }
    const box = form.querySelector(".form-error");
    box.lastElementChild.textContent = error.message;
    box.hidden = false;
  },

  // Turns a button's spinner on or off while a request is running.
  setBusy(button, busy) {
    button.disabled = busy;
    if (busy) {
      button.dataset.label = button.textContent;
      button.replaceChildren(h("span", { class: "spinner" }), button.dataset.label);
    } else {
      button.replaceChildren(button.dataset.label);
    }
  },

  // A friendly message for a page or card with nothing to show.
  empty(iconName, title, text, action) {
    return h("div", { class: "empty" },
      h("div", { class: "empty-icon" }, icon(iconName, 22)),
      h("h3", { class: "empty-title" }, title),
      h("p", { class: "empty-text" }, text),
      action || null);
  },

  // Shown when a page could not load, with a way to try again.
  loadError(error, retry) {
    return UI.empty("bad", "Could not load this page", error.message,
      h("button", { class: "btn btn-secondary", type: "button", onClick: retry }, "Try again"));
  },

  // A table built from server rows. Each column is [heading, field name, is it a number?].
  table(columns, rows) {
    const heading = columns.map(([label, , isNumber]) => h("th", { class: isNumber ? "num" : null }, label));
    const body = rows.map((row) =>
      h("tr", null, ...columns.map(([, name, isNumber]) =>
        h("td", { class: isNumber ? "num" : null }, String(row[name])))));

    return h("div", { class: "table-wrap" },
      h("table", { class: "table" },
        h("thead", null, h("tr", null, ...heading)),
        h("tbody", null, ...body)));
  },
};
