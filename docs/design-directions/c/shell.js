// Draws the pill navigation and the mascot for Direction C.
const MASCOT = `<svg class="mascot" viewBox="0 0 120 120" aria-hidden="true">
  <rect x="24" y="20" width="72" height="88" rx="16" fill="#fff"/>
  <rect x="24" y="92" width="72" height="16" rx="8" fill="#d6e8f8"/>
  <rect x="42" y="10" width="36" height="20" rx="9" fill="#ffc42e"/>
  <circle cx="47" cy="56" r="6.5" fill="#1f3247"/><circle cx="73" cy="56" r="6.5" fill="#1f3247"/>
  <circle cx="49" cy="54" r="2.2" fill="#fff"/><circle cx="75" cy="54" r="2.2" fill="#fff"/>
  <path d="M48 72q12 12 24 0" fill="none" stroke="#1f3247" stroke-width="5" stroke-linecap="round"/>
  <circle cx="37" cy="68" r="5.5" fill="#ff9dab"/><circle cx="83" cy="68" r="5.5" fill="#ff9dab"/>
  <path d="M100 42l5 10 11 1-8 8 2 11-10-5-10 5 2-11-8-8 11-1z" fill="#ffc42e"/>
</svg>`;

function drawTop(active) {
  const pill = (name, label) => `<a class="${label === active ? "on" : ""}"><i>${svg(name, 19)}</i>${label}</a>`;
  fill("top", `<div class="logo"><span class="round grape">${svg("check", 22)}</span>Attendance</div>
    <nav class="pills">${pill("dashboard", "Home")}${pill("clipboard", "Mark")}${pill("users", "Students")}${pill("book", "Subjects")}${pill("report", "Reports")}</nav>
    <div class="me"><span class="round grape">NK</span></div>`);
  const tab = (name, label) => `<a class="${label === active ? "on" : ""}">${svg(name, 22)}</a>`;
  fill("bottom", tab("dashboard", "Home") + tab("clipboard", "Mark") + tab("users", "Students") + tab("book", "Subjects") + tab("report", "Reports"));
}
