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
    const box = h("div", { class: `toast is-${type}` }, h("span", null, message));
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

  // Asks a yes or no question. Returns a promise of true or false.
  confirm(title, text, yesLabel, isDanger) {
    return new Promise((resolve) => {
      let answer = false;
      const yes = h("button", { class: isDanger ? "btn btn-danger" : "btn btn-primary", type: "button" }, yesLabel);
      const no = h("button", { class: "btn btn-secondary", type: "button" }, "Cancel");
      const dialog = UI.modal(title, h("div", null,
        h("p", { class: "modal-text" }, text),
        h("div", { class: "modal-actions" }, no, yes)));

      no.addEventListener("click", () => dialog.close());
      yes.addEventListener("click", () => {
        answer = true;
        dialog.close();
      });
      dialog.addEventListener("close", () => resolve(answer));
      no.focus();
    });
  },

  // One labelled form input, with a place for its error message.
  // listId links the input to a <datalist> of suggestions.
  field(label, name, options = {}) {
    const id = `field-${name}`;
    return h("div", { class: "field", "data-field": name },
      h("label", { class: "label", for: id }, label),
      h("input", {
        class: "input", id, name,
        type: options.type || "text",
        autocomplete: options.autocomplete || "off",
        value: options.value,
        list: options.listId,
        placeholder: options.placeholder,
      }),
      h("div", { class: "field-error" }));
  },

  // A labelled dropdown. Each choice is [value, text].
  selectField(label, name, choices, selected) {
    const id = `field-${name}`;
    const options = choices.map(([value, text]) => h("option", { value, selected: value === selected }, text));
    return h("div", { class: "field", "data-field": name },
      h("label", { class: "label", for: id }, label),
      h("select", { class: "input", id, name }, ...options),
      h("div", { class: "field-error" }));
  },

  // The error box at the top of a form. It starts hidden.
  formError() {
    return h("div", { class: "form-error", role: "alert", hidden: true }, h("span"));
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

  // A dialog with a form. send() talks to the server and returns its reply.
  // A NEEDS_CONFIRM error asks the question, then sends again with confirmed set.
  formModal(title, submitLabel, fields, send, onDone) {
    const submit = h("button", { class: "btn btn-primary", type: "submit" }, submitLabel);
    const cancel = h("button", { class: "btn btn-secondary", type: "button" }, "Cancel");
    const form = h("form", { novalidate: true }, UI.formError(), ...fields,
      h("div", { class: "modal-actions" }, cancel, submit));
    const dialog = UI.modal(title, form);
    cancel.addEventListener("click", () => dialog.close());

    const trySend = async (confirmed) => {
      UI.clearErrors(form);
      UI.setBusy(submit, true);
      try {
        const reply = await send(form.elements, confirmed);
        dialog.close();
        UI.toast(reply.message);
        onDone();
      } catch (error) {
        UI.setBusy(submit, false);
        if (error.code === "NEEDS_CONFIRM") {
          if (await UI.confirm("Are you sure?", `${error.message} Add this student anyway?`, "Add anyway")) {
            trySend(true);
          }
          return;
        }
        UI.showError(form, error);
      }
    };

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      trySend(false);
    });
    const first = form.querySelector("input, select");
    if (first) {
      first.focus();
    }
  },

  // A section of the register. actions is an optional element on the right.
  sheet(title, note, actions, ...body) {
    return h("section", { class: "sheet" },
      h("div", { class: "sheet-head" },
        h("div", null,
          h("h2", { class: "sheet-title" }, title),
          note ? h("p", { class: "sheet-note" }, note) : null),
        actions || null),
      ...body);
  },

  // A message for a sheet with nothing to show.
  empty(title, text, action) {
    return h("div", { class: "empty" },
      h("h3", { class: "empty-title" }, title),
      h("p", { class: "empty-text" }, text),
      action || null);
  },

  // Shown while a request is running.
  loading(text = "Loading") {
    return h("div", { class: "loading-note" }, h("span", { class: "spinner" }), text);
  },

  // Shown when a page could not load, with a way to try again.
  loadError(error, retry) {
    return h("section", { class: "sheet" }, UI.empty("Could not load this page", error.message,
      h("button", { class: "btn btn-secondary", type: "button", onClick: retry }, "Try again")));
  },

  // A status label. kind is "good", "bad", or "none".
  stamp(kind, text) {
    return h("span", { class: `stamp is-${kind}` }, text);
  },

  // Register cells from a string like "PPAP", oldest first.
  marks(text) {
    const cells = [...text].map((mark) =>
      h("span", { class: mark === "A" ? "mark is-absent" : "mark" }, mark));
    return h("span", { class: "marks", role: "img", "aria-label": `Recent marks: ${text}` }, ...cells);
  },

  // A student's name and roll number, linked to their report.
  person(id, name, rollNo) {
    return h("div", null,
      h("a", { class: "person-name", href: `#/report/${id}` }, name),
      h("span", { class: "person-roll" }, rollNo));
  },

  // A register table. Each column is { label, key or cell, num, tight, hideNarrow }.
  // A column with a sort name gets a heading button. The sorting itself is done by
  // C++: onSort only asks for it. sortState says which column is sorted now.
  table(columns, rows, sortState, onSort) {
    const className = (column) => [column.num ? "num" : "", column.tight ? "tight" : "",
      column.hideNarrow ? "hide-narrow" : ""].join(" ").trim() || null;

    const heading = columns.map((column) => {
      if (!column.sort) {
        return h("th", { class: className(column) }, column.label);
      }
      const sorted = sortState.sort === column.sort;
      const direction = sortState.order === "asc" ? "ascending" : "descending";
      return h("th", { class: className(column), "aria-sort": sorted ? direction : null },
        h("button", { type: "button", onClick: () => onSort(column.sort) },
          column.label, sorted ? (sortState.order === "asc" ? " ↑" : " ↓") : ""));
    });
    const body = rows.map((row) =>
      h("tr", null, ...columns.map((column) =>
        h("td", { class: className(column) }, column.cell ? column.cell(row) : String(row[column.key])))));

    return h("div", { class: "table-wrap" },
      h("table", { class: "table" },
        h("thead", null, h("tr", null, ...heading)),
        h("tbody", null, ...body)));
  },

  // Swaps a sheet between a chart and a table of the same server numbers.
  // draw() draws the chart on a new canvas. Without internet Chart.js is
  // missing, so the chart area explains why and the table still works.
  chartOrTable(title, note, draw, table, tall) {
    const body = h("div", { class: "sheet-body" });
    const chartButton = h("button", { type: "button", "aria-pressed": "true" }, "Chart");
    const tableButton = h("button", { type: "button", "aria-pressed": "false" }, "Table");

    const show = (wantChart) => {
      chartButton.setAttribute("aria-pressed", String(wantChart));
      tableButton.setAttribute("aria-pressed", String(!wantChart));

      if (!wantChart) {
        body.replaceChildren(table());
      } else if (!Charts.available()) {
        body.replaceChildren(h("div", { class: "chart-note" }, "Charts need an internet connection. Choose Table to see the numbers."));
      } else {
        const canvas = h("canvas", { role: "img", "aria-label": `${title}. ${note}` });
        body.replaceChildren(h("div", { class: tall ? "chart-box is-tall" : "chart-box" }, canvas));
        draw(canvas);
      }
    };

    chartButton.addEventListener("click", () => show(true));
    tableButton.addEventListener("click", () => show(false));

    return {
      element: UI.sheet(title, note, h("div", { class: "switch" }, chartButton, tableButton), body),
      showChart: () => show(true),
    };
  },
};
