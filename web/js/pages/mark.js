// mark.js
// The Mark attendance page: a wall of student tiles to tap.
//
// UI-only exception to the "no logic in JavaScript" rule: the live counter
// below counts ticked tiles, so a teacher sees the running totals without
// waiting for the network. It is display only. It is never sent or saved, and
// the totals shown after Save are the ones counted by C++.
//
// The keyboard shortcuts only press the same tiles and the same Save button.

// One student's tile. The checkbox inside covers the whole tile, and a ticked
// checkbox means present.
function studentTile(student, onChange) {
  const box = h("input", {
    class: "kid-box",
    type: "checkbox",
    "data-student": student.id,
    "aria-label": `${student.name} present`,
    disabled: student.locked,
    onChange,
  });
  box.checked = student.status !== "A";

  const yes = icon("check", 18);
  const no = icon("close", 18);
  yes.classList.add("is-yes");
  no.classList.add("is-no");

  return h("label", { class: student.locked ? "kid is-locked" : "kid" },
    box,
    UI.face(student.initials, student.id),
    h("div", { class: "kid-text" },
      h("div", { class: "kid-name" }, student.name),
      h("div", { class: "kid-roll" }, student.locked ? "Joined after this class" : student.rollNo)),
    h("div", { class: "kid-mark" }, yes, no));
}

// Replays the small pop on a number that has just changed.
function bump(element, text) {
  if (element.textContent !== text) {
    element.textContent = text;
    element.classList.remove("bump");
    void element.offsetWidth;   // reading this makes the browser restart the animation
    element.classList.add("bump");
  }
}

// Builds the keyboard shortcuts for a wall of tiles: arrows or J and K move,
// P and A mark and move on, Space flips a tile, and Ctrl+S saves. These are
// for laptops, so a phone never sees them.
function wallKeys(wall, onSave) {
  const tiles = () => [...wall.querySelectorAll(".kid-box:not(:disabled)")];
  const columns = () => getComputedStyle(wall).gridTemplateColumns.split(" ").length;
  const steps = { arrowright: 1, arrowleft: -1, j: 1, k: -1 };

  const moveTo = (boxes, place) => {
    boxes[Math.max(0, Math.min(place, boxes.length - 1))].focus();
  };

  const setMark = (box, present) => {
    if (box.checked !== present) {
      box.checked = present;
      box.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  return (event) => {
    const key = event.key.toLowerCase();

    // Shortcuts never fire while a dialog is open.
    if (document.querySelector("dialog[open]")) {
      return;
    }

    if ((event.ctrlKey || event.metaKey) && key === "s") {
      event.preventDefault();
      onSave();
      return;
    }

    // Typing a date, or holding Ctrl for a browser shortcut, is left alone.
    const inForm = event.target.matches("select, input:not(.kid-box)");
    if (inForm || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const boxes = tiles();
    if (boxes.length === 0) {
      return;
    }
    const place = boxes.indexOf(document.activeElement);

    if (key === "p" || key === "a") {
      event.preventDefault();
      const current = Math.max(place, 0);
      setMark(boxes[current], key === "p");
      moveTo(boxes, current + 1);
    } else if (key in steps) {
      event.preventDefault();
      moveTo(boxes, place === -1 ? 0 : place + steps[key]);
    } else if (key === "arrowup" || key === "arrowdown") {
      event.preventDefault();
      const target = place + (key === "arrowdown" ? columns() : -columns());
      if (place === -1) {
        moveTo(boxes, 0);
      } else if (target >= 0 && target < boxes.length) {
        moveTo(boxes, target);   // on the first or last row, the tile stays put
      }
    }
  };
}

// Draws the Mark attendance page. value can name a subject, as in #/mark/CS201A.
Pages.mark = async function (root, isCurrent, value) {
  root.replaceChildren(UI.skeleton(["span-12", "is-short"], ["span-4"], ["span-4"], ["span-4"], ["span-4"], ["span-4"], ["span-4"]));

  let subjects;
  try {
    subjects = (await Api.get("/api/subjects")).subjects;
  } catch (error) {
    if (isCurrent()) {
      root.replaceChildren(UI.loadError(error, () => Pages.mark(root, isCurrent, value)));
    }
    return;
  }
  if (!isCurrent()) {
    return;
  }
  if (subjects.length === 0) {
    root.replaceChildren(UI.emptyTile("No subjects yet", "Add a subject before marking attendance.",
      h("a", { class: "btn btn-primary", href: "#/subjects" }, "Go to Subjects")));
    return;
  }

  App.setHead("Who's here today?");

  let chosen = subjects.some((row) => row.code === value) ? value : subjects[0].code;
  const dateField = UI.datePill("Date", "date", "date", App.today.dateIso);
  const dateInput = dateField.querySelector("input");
  const sheet = h("div", { class: "stack" });
  let latestLoad = 0;   // only the newest request may draw

  const pills = UI.pills("Subject",
    subjects.map((row) => [row.code, row.code, `${row.name}, ${row.className}`]), chosen,
    (code) => {
      chosen = code;
      loadSheet();
    });

  // Loads the class list for the chosen subject and date.
  async function loadSheet() {
    latestLoad += 1;
    const thisLoad = latestLoad;
    App.pageKeys = null;
    sheet.replaceChildren(UI.skeleton(["span-4"], ["span-4"], ["span-4"], ["span-4"], ["span-4"], ["span-4"]));

    try {
      const query = new URLSearchParams({ subject: chosen, date: dateInput.value }).toString();
      const reply = await Api.get(`/api/attendance/sheet?${query}`);
      if (isCurrent() && thisLoad === latestLoad) {
        showSheet(reply);
      }
    } catch (error) {
      if (isCurrent() && thisLoad === latestLoad) {
        App.setHead("Who's here today?");
        sheet.replaceChildren(UI.emptyTile("Cannot show this date", error.message));
      }
    }
  }

  // Draws the wall of tiles for one session.
  function showSheet(reply) {
    App.setHead(reply.date === App.today.date ? "Who's here today?" : `Who was here on ${reply.date}?`);

    if (reply.students.length === 0) {
      sheet.replaceChildren(UI.emptyTile("No students in this class", `Add students to ${reply.subject.className} first.`,
        h("a", { class: "btn btn-primary", href: "#/students" }, "Go to Students")));
      return;
    }

    const presentValue = h("b", { id: "present-count" });
    const absentValue = h("b", { id: "absent-count" });

    // The UI-only counter: see the note at the top of this file.
    const updateCounter = () => {
      const boxes = [...sheet.querySelectorAll(".kid-box")];
      boxes.forEach((box) => box.closest(".kid").classList.toggle("is-away", !box.checked));

      const open = boxes.filter((box) => !box.disabled);
      const ticked = open.filter((box) => box.checked).length;
      bump(presentValue, String(ticked));
      bump(absentValue, String(open.length - ticked));
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

    const wall = h("section", { class: "wall", "aria-label": "Students" },
      ...students.map((student) => studentTile(student, reply.alreadyMarked ? correct : updateCounter)));

    const saveButton = h("button", { class: "btn btn-glow", type: "button" }, "Save attendance", h("kbd", null, "Ctrl S"));
    const allButton = h("button", {
      class: "btn btn-secondary", type: "button",
      onClick: () => {
        sheet.querySelectorAll(".kid-box").forEach((box) => {
          box.checked = true;
        });
        updateCounter();
      },
    }, "Mark all present");

    // Sends every mark to C++, which validates, counts, and saves them.
    const save = async () => {
      if (saveButton.disabled) {
        return;
      }
      const marks = [...sheet.querySelectorAll(".kid-box")].map((box) => ({
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
    };
    saveButton.addEventListener("click", save);

    const keys = h("div", { class: "key-hints", "aria-hidden": "true" },
      h("kbd", null, "P"), h("kbd", null, "A"), h("span", null, "mark"),
      h("kbd", null, "↑"), h("kbd", null, "↓"), h("span", null, "move"));

    const counts = [
      h("div", { class: "savebar-count" }, presentValue, "present"),
      h("div", { class: "savebar-count" }, absentValue, "absent"),
    ];

    const bar = h("div", { class: "savebar", "aria-live": "polite" }, ...counts, keys,
      reply.alreadyMarked
        ? h("div", { class: "savebar-done" }, icon("good", 18), "Saved")
        : saveButton);

    const head = h("div", { class: "wall-head" },
      h("div", null,
        h("h2", { class: "wall-title" }, `${reply.subject.code}, ${reply.subject.name}`),
        h("p", { class: "wall-note" }, `${reply.subject.className} · ${reply.date}`)),
      reply.alreadyMarked ? null : allButton);

    if (reply.alreadyMarked) {
      const notice = h("div", { class: "notice" }, icon("good", 20),
        "Already marked. Change a mark to correct it, and it saves straight away.");
      sheet.replaceChildren(head, notice, wall, bar);
    } else {
      sheet.replaceChildren(head, wall, bar);
    }

    App.pageKeys = wallKeys(wall, reply.alreadyMarked ? () => {} : save);
    updateCounter();
  }

  dateInput.addEventListener("change", loadSheet);

  root.replaceChildren(h("div", { class: "stack is-still" },
    h("div", { class: "mark-controls" }, pills, dateField),
    sheet));

  loadSheet();
};
