// mock.js
// Shared by the three design mockups. These are static pictures of a design, so
// the numbers below are copied from the sample data. The real site gets every
// number from the C++ server.

document.documentElement.dataset.theme = new URLSearchParams(location.search).get("theme") || "light";

const SAMPLE = {
  date: "Tuesday, 3 November",
  shortDate: "Tue 3 Nov",
  today: { percent: 80, text: "80%", present: 16, total: 20, absent: 4 },
  students: 10, classes: 2, subjects: 4, overall: "82%", defaulters: 4, entries: 5, days: 6,
  trend: [["26 Oct", 80], ["27 Oct", 85], ["29 Oct", 80], ["30 Oct", 80], ["2 Nov", 85], ["3 Nov", 80]],
  subjectRows: [
    { code: "CS201A", name: "OOPs using C++", cls: "AIML-A", percent: 80.56, present: 29, total: 36 },
    { code: "MA201A", name: "Mathematics III", cls: "AIML-A", percent: 79.17, present: 19, total: 24 },
    { code: "CS201B", name: "OOPs using C++", cls: "AIML-B", percent: 87.5, present: 21, total: 24 },
    { code: "MA201B", name: "Mathematics III", cls: "AIML-B", percent: 81.25, present: 13, total: 16 },
  ],
  sessions: [
    { code: "CS201A", name: "OOPs using C++", cls: "AIML-A", present: 4, total: 6, when: "Today" },
    { code: "MA201A", name: "Mathematics III", cls: "AIML-A", present: 4, total: 6, when: "Today" },
    { code: "CS201B", name: "OOPs using C++", cls: "AIML-B", present: 4, total: 4, when: "Today" },
    { code: "MA201B", name: "Mathematics III", cls: "AIML-B", present: 4, total: 4, when: "Today" },
    { code: "CS201A", name: "OOPs using C++", cls: "AIML-A", present: 5, total: 6, when: "Yesterday" },
  ],
  attention: [
    { name: "Kabir Mehta", roll: "90318015625", code: "MA201A", percent: "50%", marks: "APPA", attended: "2/4" },
    { name: "Isha Nair", roll: "90618015625", code: "CS201A", percent: "50%", marks: "PAPAPA", attended: "3/6" },
    { name: "Vivaan Singh", roll: "90918015625", code: "MA201B", percent: "50%", marks: "AAPP", attended: "2/4" },
    { name: "Meera Joshi", roll: "90818015625", code: "CS201B", percent: "67%", marks: "APAPPP", attended: "4/6" },
  ],
  roster: [
    { name: "Aarav Sharma", roll: "90118015625", here: true },
    { name: "Diya Verma", roll: "90218015625", here: true },
    { name: "Kabir Mehta", roll: "90318015625", here: true },
    { name: "Ananya Iyer", roll: "90418015625", here: true },
    { name: "Rohan Das", roll: "90518015625", here: false },
    { name: "Isha Nair", roll: "90618015625", here: false },
  ],
};

const initialsOf = (name) => name.split(" ").map((word) => word[0]).join("");

// Fills an element with HTML. Only used for this fixed sample data.
function fill(id, html) {
  document.getElementById(id).innerHTML = html;
}

// Turns icon("name") into text, so it can sit inside the HTML strings above.
function svg(name, size = 20) {
  return icon(name, size).outerHTML;
}

const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
