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

// Creates part of an SVG drawing. These need their own namespace.
function svgPart(tag, attributes, ...children) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  element.append(...children);
  return element;
}

const RING_RADIUS = 36;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const COUNT_UP_MS = 700;
let ringsDrawn = 0;   // gives every ring's gradient its own id

const UI = {
  wantsMotion() {
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  },

  // Shows a short message that fades away by itself.
  toast(message, type = "good") {
    const box = h("div", { class: `toast is-${type}` },
      h("span", { class: "toast-mark" }, icon(type === "good" ? "check" : "close", 15)),
      h("span", null, message));
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

  // A date or month picker as a floating pill.
  datePill(label, name, type, value) {
    const field = UI.field(label, name, { type, value });
    field.classList.add("date-pill");
    return field;
  },

  // A search box. onSearch runs after a short pause in typing, so each key
  // press is not a request.
  search(id, label, placeholder, onSearch) {
    let timer = null;
    const input = h("input", {
      class: "input", id, type: "search", placeholder, autocomplete: "off", "aria-label": label,
      onInput: () => {
        clearTimeout(timer);
        timer = setTimeout(() => onSearch(input.value), 200);
      },
    });
    return h("div", { class: "search toolbar-grow" }, icon("search", 19), input);
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

  // Turns a button's spinner on or off while a request is running. The button's
  // own contents come back afterwards, including any icon or key hint.
  setBusy(button, busy) {
    button.disabled = busy;
    if (busy) {
      button.savedContent = [...button.childNodes];
      const label = button.savedContent.find((part) => part.nodeType === Node.TEXT_NODE);
      button.replaceChildren(h("span", { class: "spinner" }), label.textContent);
    } else {
      button.replaceChildren(...button.savedContent);
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

  // A tile with a title. actions is an optional element on the right.
  tile(title, note, actions, ...body) {
    return h("section", { class: "tile" },
      h("div", { class: "tile-head" },
        h("div", null,
          h("h2", { class: "tile-title" }, title),
          note ? h("p", { class: "tile-note" }, note) : null),
        actions || null),
      ...body);
  },

  // A message for a tile with nothing to show.
  empty(title, text, action) {
    return h("div", { class: "empty" },
      h("div", { class: "empty-mark" }, icon("clipboard", 28)),
      h("h3", { class: "empty-title" }, title),
      h("p", { class: "empty-text" }, text),
      action || null);
  },

  // The same message, in a tile of its own.
  emptyTile(title, text, action) {
    return h("section", { class: "tile" }, UI.empty(title, text, action));
  },

  // Grey shimmering tiles in the shape of the page, shown while it loads.
  // Each size is "", "is-short", or "is-tall", and span is a width in the grid.
  skeleton(...tiles) {
    return h("div", { class: "bento", "aria-busy": "true", "aria-label": "Loading" },
      ...tiles.map(([span, size]) => h("div", { class: `tile skeleton ${span} ${size || ""}` })));
  },

  // Shown when a page could not load, with a way to try again.
  loadError(error, retry) {
    return UI.emptyTile("Could not load this page", error.message,
      h("button", { class: "btn btn-secondary", type: "button", onClick: retry }, "Try again"));
  },

  // A status label. kind is "good", "bad", or "none".
  badge(kind, text) {
    return h("span", { class: `badge is-${kind}` }, text);
  },

  // Register cells from a string like "PPAP", oldest first.
  marks(text) {
    const cells = [...text].map((mark) =>
      h("span", { class: mark === "A" ? "mark is-absent" : "mark" }, mark));
    return h("span", { class: "marks", role: "img", "aria-label": `Recent marks: ${text}` }, ...cells);
  },

  // An avatar. The initials come from C++, and the id only picks a colour.
  face(initials, id) {
    return h("span", { class: `face tone-${id % 5}`, "aria-hidden": "true" }, initials);
  },

  // A student's avatar, name, and roll number, linked to their report.
  person(id, name, rollNo, initials) {
    return h("div", { class: "person" },
      UI.face(initials, id),
      h("div", { class: "person-text" },
        h("a", { class: "person-name", href: `#/report/${id}` }, name),
        h("span", { class: "person-roll" }, rollNo)));
  },

  // Shows C++ text like 83.33% with the decimals smaller. Nothing is rounded
  // here, so what is shown is exactly what the server worked out. Only a
  // whole number loses its ".00", as in 80%.
  percent(text) {
    const [whole, decimals] = text.replace("%", "").split(".");
    const rest = decimals && decimals !== "00" ? `.${decimals}%` : "%";
    return [h("span", { class: "percent-whole" }, whole), h("span", { class: "percent-rest" }, rest)];
  },

  // Runs a number up to its final value. The animation only changes what is
  // on screen for a moment: it always ends on the value C++ sent.
  countUp(element, value) {
    element.textContent = String(value);
    if (value === 0 || !UI.wantsMotion()) {
      return element;
    }

    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / COUNT_UP_MS, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = String(progress === 1 ? value : Math.round(value * eased));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
    return element;
  },

  // A progress ring. status comes from C++: "ok", "low", or "none".
  ring(percent, percentText, status) {
    ringsDrawn += 1;
    const id = `ring-gradient-${ringsDrawn}`;
    const arc = svgPart("circle", {
      class: "ring-arc", cx: 42, cy: 42, r: RING_RADIUS,
      stroke: `url(#${id})`, "stroke-dasharray": `0 ${RING_LENGTH}`,
    });
    const filled = status === "none" ? 0 : RING_LENGTH * percent / 100;

    const drawing = svgPart("svg", { viewBox: "0 0 84 84", "aria-hidden": "true" },
      svgPart("defs", {},
        svgPart("linearGradient", { id, x1: 0, y1: 0, x2: 1, y2: 1 },
          svgPart("stop", { class: "ring-stop-a", offset: 0 }),
          svgPart("stop", { class: "ring-stop-b", offset: 0.55 }),
          svgPart("stop", { class: "ring-stop-c", offset: 1 }))),
      svgPart("circle", { class: "ring-track", cx: 42, cy: 42, r: RING_RADIUS }),
      arc);

    // Starting at zero lets the CSS transition sweep the ring round.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      arc.setAttribute("stroke-dasharray", `${filled} ${RING_LENGTH}`);
    }));

    const value = status === "none" ? ["-"] : UI.percent(percentText);
    return h("div", { class: `ring is-${status}`, role: "img", "aria-label": `${percentText} attendance` },
      drawing, h("div", { class: "ring-value" }, h("span", null, ...value)));
  },

  // A row of pills where one is chosen. Each choice is [value, text, smaller text].
  pills(label, choices, selected, onChoose) {
    const group = h("div", { class: "pills", role: "group", "aria-label": label });

    const choose = (value) => {
      group.querySelectorAll(".pill").forEach((pill) => {
        pill.setAttribute("aria-pressed", String(pill.dataset.value === value));
      });
      onChoose(value);
    };

    for (const [value, text, small] of choices) {
      group.append(h("button", {
        class: "pill", type: "button", "data-value": value,
        "aria-pressed": String(value === selected),
        onClick: () => choose(value),
      }, text, small ? h("small", null, small) : null));
    }
    return group;
  },

  // A table. Each column is { label, key or cell, num, tight, and a phone layout }.
  // On a phone every row becomes a small card. The lead column is its heading
  // and the corner column sits opposite it. Other cells show their label, half
  // cells share a line, and hidePhone cells are left out.
  table(columns, rows) {
    const className = (column) => [column.num ? "num" : "", column.tight ? "tight" : "",
      column.lead ? "lead" : "", column.corner ? "corner" : "", column.half ? "half" : "",
      column.hidePhone ? "hide-phone" : ""].join(" ").trim() || null;

    const heading = columns.map((column) => h("th", { class: className(column) }, column.label));
    const body = rows.map((row) =>
      h("tr", null, ...columns.map((column) =>
        h("td", { class: className(column), "data-label": column.lead || column.corner ? null : column.label },
          column.cell ? column.cell(row) : String(row[column.key])))));

    return h("div", { class: "table-wrap" },
      h("table", { class: "table" },
        h("thead", null, h("tr", null, ...heading)),
        h("tbody", null, ...body)));
  },

  // Swaps a tile between a chart and a table of the same server numbers.
  // draw() draws the chart on a new canvas. Without internet Chart.js is
  // missing, so the chart area explains why and the table still works.
  chartOrTable(title, note, draw, table, tall) {
    const body = h("div", { class: "tile-body" });
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
      element: UI.tile(title, note, h("div", { class: "mini-pills" }, chartButton, tableButton), body),
      showChart: () => show(true),
    };
  },
};
