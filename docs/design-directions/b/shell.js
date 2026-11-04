// Draws the sidebar, top bar, and phone tabs for Direction B.
function drawShell(active, crumb) {
  const link = (name, label) => `<a class="${label === active ? "on" : ""}">${svg(name, 15)}${label}</a>`;
  fill("side", `
    <div class="org"><i></i><span>Attendance</span><small>${svg("chevron", 14)}</small></div>
    <div class="find">${svg("report", 14)}<span>Search</span><kbd>Ctrl K</kbd></div>
    ${link("dashboard", "Overview")}${link("clipboard", "Mark attendance")}
    <div class="group">Records</div>
    ${link("users", "Students")}${link("book", "Subjects")}${link("cap", "Teachers")}
    <div class="group">Reports</div>
    ${link("report", "Student report")}${link("alert", "Defaulters")}${link("calendar", "Daily")}${link("columns", "Monthly")}`);
  fill("bar", `<div class="crumbs">Register ${svg("chevron", 12)} <b>${crumb}</b></div>
    <div class="bar-right"><span class="live"><i></i>synced</span><span>${SAMPLE.shortDate}</span><span class="tag">NK</span></div>`);
  const tab = (name, label) => `<a class="${label === active ? "on" : ""}">${svg(name, 20)}${label}</a>`;
  fill("tabbar", tab("dashboard", "Overview") + tab("clipboard", "Mark attendance").replace("Mark attendance", "Mark") + tab("users", "Students") + tab("report", "Reports"));
}
