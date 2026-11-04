// mark.js
// The Mark attendance page, laid out like a page of the register.
//
// UI-only exception to the "no logic in JavaScript" rule: the live counter
// below counts ticked checkboxes, so a teacher sees the running totals without
// waiting for the network. It is display only. It is never sent or saved, and
// the totals shown after Save are the ones counted by C++.

// One student's row. A ticked checkbox means present.
function markingRow(student, position, onChange) {
  const box = h("input", {
    type: "checkbox",
    "data-student": student.id,
    "aria-label": `${student.name} present`,
    disabled: student.locked,
    onChange,
  });
  box.checked = student.status !== "A";

  return h("div", { class: "marking-row" },
    h("span", { class: "marking-number" }, String(position)),
    h("div", null,
      h("span", { class: "person-name" }, student.name),
      h("span", { class: "person-roll" }, student.rollNo)),
    h("label", { class: student.locked ? "pa is-disabled" : "pa" },
      box,
      h("span", { class: "pa-cell pa-p" }, "P"),
      h("span", { class: "pa-cell pa-a" }, "A")));
}

// Draws the Mark attendance page.
Pages.mark = async function (root, isCurrent) {
  let subjects;
  try {
    subjects = (await Api.get("/api/subjects")).subjects;
  } catch (error) {
    if (isCurrent()) {
      root.replaceChildren(UI.loadError(error, () => Pages.mark(root, isCurrent)));
    }
    return;
  }
  if (!isCurrent()) {
    return;
  }
  if (subjects.length === 0) {
    root.replaceChildren(h("section", { class: "sheet" },
      UI.empty("No subjects yet", "Add a subject before marking attendance.",
        h("a", { class: "btn btn-primary", href: "#/subjects" }, "Go to Subjects"))));
    return;
  }

  const dateField = UI.field("Date", "date", { type: "date", value: App.today.dateIso });
  const subjectField = UI.selectField("Subject", "subject",
    subjects.map((row) => [row.code, `${row.code}, ${row.name} (${row.className})`]));
  const sheet = h("div", null);
  let latestLoad = 0;   // only the newest request may draw

  // Loads the class list for the chosen subject and date.
  async function loadSheet() {
    latestLoad += 1;
    const thisLoad = latestLoad;
    const subject = subjectField.querySelector("select").value;
    const date = dateField.querySelector("input").value;
    sheet.replaceChildren(h("section", { class: "sheet" }, UI.loading("Loading the class list")));

    try {
      const query = new URLSearchParams({ subject, date }).toString();
      const reply = await Api.get(`/api/attendance/sheet?${query}`);
      if (isCurrent() && thisLoad === latestLoad) {
        showSheet(reply);
      }
    } catch (error) {
      if (isCurrent() && thisLoad === latestLoad) {
        sheet.replaceChildren(h("section", { class: "sheet" }, UI.empty("Cannot show this date", error.message)));
      }
    }
  }

  // Draws the register page for one session.
  function showSheet(reply) {
    if (reply.students.length === 0) {
      sheet.replaceChildren(h("section", { class: "sheet" },
        UI.empty("No students in this class", `Add students to ${reply.subject.className} first.`,
          h("a", { class: "btn btn-primary", href: "#/students" }, "Go to Students"))));
      return;
    }

    const presentValue = h("div", { class: "counter-value", id: "present-count" });
    const absentValue = h("div", { class: "counter-value is-absent", id: "absent-count" });

    // The UI-only counter: see the note at the top of this file.
    const updateCounter = () => {
      const boxes = [...sheet.querySelectorAll("input[type=checkbox]:not(:disabled)")];
      const ticked = boxes.filter((box) => box.checked).length;
      presentValue.textContent = String(ticked);
      absentValue.textContent = String(boxes.length - ticked);
    };

    // In a marked session each change is a correction, saved straight away.
    const correct = async (event) => {
      const box = event.target;
      updateCounter();
      try {
        const answer = await Api.put("/api/attendance", {
          studentId: Number(box.dataset.student),
          subject: reply.subject.code,
          date: reply.dateIso,
          status: box.checked ? "P" : "A",
        });
        UI.toast(answer.message);
      } catch (error) {
        box.checked = !box.checked;
        updateCounter();
        UI.toast(error.message, "bad");
      }
    };

    // A student who joined after this session has no mark to correct.
    const students = reply.students.map((student) => ({
      ...student,
      locked: reply.alreadyMarked && student.status === "-",
    }));

    const rows = students.map((student, index) =>
      markingRow(student, index + 1, reply.alreadyMarked ? correct : updateCounter));

    const saveButton = h("button", { class: "btn btn-primary", type: "button" }, "Save attendance");
    const allButton = h("button", {
      class: "btn btn-secondary", type: "button",
      onClick: () => {
        sheet.querySelectorAll("input[type=checkbox]").forEach((box) => {
          box.checked = true;
        });
        updateCounter();
      },
    }, "Mark all present");

    // Sends every mark to C++, which validates, counts, and saves them.
    saveButton.addEventListener("click", async () => {
      const marks = [...sheet.querySelectorAll("input[type=checkbox]")].map((box) => ({
        studentId: Number(box.dataset.student),
        status: box.checked ? "P" : "A",
      }));

      UI.setBusy(saveButton, true);
      try {
        const answer = await Api.post("/api/attendance", { subject: reply.subject.code, date: reply.dateIso, marks });
        UI.toast(answer.message);
        loadSheet();
        App.loadUser();   // the reports should now open on this new date
      } catch (error) {
        UI.setBusy(saveButton, false);
        UI.toast(error.message, "bad");
      }
    });

    const title = `${reply.subject.code}, ${reply.subject.name}`;
    const note = `${reply.subject.className} · ${reply.date}`;

    sheet.replaceChildren(h("section", { class: "sheet" },
      h("div", { class: "sheet-head" },
        h("div", null, h("h2", { class: "sheet-title" }, title), h("p", { class: "sheet-note mono" }, note))),
      reply.alreadyMarked
        ? h("div", { class: "notice" }, "Already marked. Change a mark to correct it, and it saves straight away.")
        : null,
      ...rows,
      h("div", { class: "marking-foot" },
        h("div", { class: "counter", "aria-live": "polite" },
          h("div", null, h("div", { class: "label" }, "Present"), presentValue),
          h("div", null, h("div", { class: "label" }, "Absent"), absentValue)),
        reply.alreadyMarked ? null : h("div", { class: "marking-actions" }, allButton, saveButton))));

    updateCounter();
  }

  dateField.querySelector("input").addEventListener("change", loadSheet);
  subjectField.querySelector("select").addEventListener("change", loadSheet);

  root.replaceChildren(h("div", { class: "stack" },
    h("div", { class: "toolbar" },
      h("div", { class: "toolbar-date" }, dateField),
      h("div", { class: "toolbar-grow" }, subjectField)),
    sheet));

  loadSheet();
};
