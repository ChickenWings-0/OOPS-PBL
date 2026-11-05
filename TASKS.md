# TASKS: Build Plan and Testing

Build order, module ownership, and the test checklist. See [DESIGN.md](DESIGN.md) for details of each class.

**Rules for every checkpoint**

1. Follow PLAN.md and DESIGN.md. If something must change, update those files first and say why.
2. The code must compile with no errors or warnings using `-Wall -Wextra`.
3. Run the checkpoint's test before ticking it off.
4. Every function gets a short comment.

---

## 1. Module ownership

The **module owner** presents that module and answers viva questions on it. Everyone should still understand the whole program at a high level.

| Member | Module | Files | Main concepts |
|--------|--------|-------|---------------|
| Aksh Rastogi | Core system, login, menus | `main.cpp`, `AttendanceSystem` (constructor, destructor, `login`, `changePassword`, `addTeacher`, `viewTeachers`, `showPerson`), `Teacher`, `Config.h` | Classes, composition, runtime polymorphism |
| Vaibhav | Students | `Person`, `Student`, `AttendanceSystem` (`addStudent`, `viewAllStudents`, `searchStudent` x2, `updateStudent`, `deleteStudent`) | Inheritance, static members, overloading, arrays of objects |
| Akshay Kumar | Subjects and attendance marking | `Date`, `AttendanceRecord`, `Subject`, `AttendanceSystem` (`addSubject`, `viewSubjects`, `markAttendance`, `editAttendance`) | Encapsulation, attendance array, date validation |
| Srishti Gupta | File handling and validation | `FileManager`, `Utils`, sample data in `data/` | File handling, parsing, input validation |
| Dhruv Kataria | Reports and testing | `Report`, `AttendanceSystem` (`viewStudentAttendance`, `showDefaulters`, `showDailyReport`, `showMonthlyReport`), `README.md`, testing checklist | Percentage logic, arrays as parameters, static functions |

---

## 2. Build checkpoints

### Checkpoint 0: Project setup
**Owner:** Aksh Rastogi

- [x] Create `include/`, `src/`, `data/`, and `.gitignore`
- [x] Create `include/Config.h` with the array limits
- [x] Create a temporary `main.cpp` that prints the project title

**Test:** builds with the command in DESIGN.md and prints the title.

### Checkpoint 1: Utils and Date
**Owners:** Srishti Gupta (`Utils`), Akshay Kumar (`Date`)

- [x] `Utils`: `readLine`, `readInt`, `readIntInRange`, `readYesNo`, `trim`, `toUpper`, `parseInt`
- [x] `Utils`: the `isValid...` functions
- [x] `Date`: constructors, `isValid`, `isLeapYear`, `toString`, `equals`, `isAfter`, `isInMonth`, `parse`, `today`
- [x] `Utils`: `readDate`

**Test:** a temporary test program checks that `29-02-2024` is valid, `29-02-2026` and `31-04-2026` are invalid, and `abc` is rejected.

### Checkpoint 2: Person, Student, Teacher
**Owners:** Vaibhav (`Person`, `Student`), Aksh Rastogi (`Teacher`)

- [x] `Person`: constructors, accessors, virtual `display`
- [x] `Student` basics: constructors, accessors, `display`, `toFileLine`
- [x] `Student` statics: `getCount`, `generateId`, `calcPercentage`
- [x] `Teacher`: constructors, `checkLogin`, `isAdmin`, `display`, statics

**Test:** create `Student arr[5]` and confirm `Student::getCount()` is still 0. Generate two internal IDs and confirm they are 1 and 2. Store the roll number `00000012345` and confirm it reads back unchanged.

### Checkpoint 3: Subject, AttendanceRecord, attendance array
**Owners:** Akshay Kumar (`Subject`, `AttendanceRecord`), Vaibhav (`Student` attendance functions)

- [x] `AttendanceRecord` class
- [x] `Subject` class with its static counter
- [x] `Student`: `addRecord`, `hasRecord`, `updateRecord`
- [x] `Student`: `countTotal`, `countPresent`, `getPercentage` and their overloads

**Test:** add 4 marks with 3 present to a student and confirm `getPercentage` gives 75.00. Confirm `calcPercentage(0, 0)` gives 0.

### Checkpoint 4: File handling and sample data
**Owner:** Srishti Gupta

- [x] `splitLine`
- [x] Load functions for all 4 files, including the warnings from DESIGN.md
- [x] Save functions for all 4 files, and `appendAttendance`
- [x] Sample data files: 10 students, 4 subjects, 2 teachers, 6 days of attendance

**Test:** load everything and print the counts (10 students, 4 subjects, 2 teachers). Save, then confirm the files are unchanged. Temporarily rename a file and confirm there is no crash.

### Checkpoint 5: System skeleton, login, and menus
**Owner:** Aksh Rastogi

- [x] `AttendanceSystem` constructor, destructor, and `find...` helpers
- [x] `login` with 3 attempts
- [x] Final `main.cpp` with all menus, using `static AttendanceSystem app;`
- [x] Stubs for options not built yet ("Coming soon")

**Test:** correct login reaches the main menu. Three wrong attempts close the program. Every menu and Back option works.

### Checkpoint 6: Student management
**Owner:** Vaibhav

- [x] `addStudent`, including the duplicate roll number check and the same-name warning
- [x] `viewAllStudents`
- [x] `searchStudent(int)` and `searchStudent(string)`
- [x] `updateStudent`, including the duplicate roll number check and the class-change rule
- [x] `deleteStudent`, including the array shift and saving both files

**Test:** T10 to T19 in the checklist below.

### Checkpoint 7: Subjects and attendance marking
**Owner:** Akshay Kumar

- [x] `addSubject`, `viewSubjects`
- [x] `markAttendance`, following the flow in DESIGN.md
- [x] `editAttendance`

**Test:** T20 to T29.

### Checkpoint 8: Reports
**Owner:** Dhruv Kataria

- [x] `studentReport` and `viewStudentAttendance`
- [x] `defaulterList` and `showDefaulters`
- [x] `dailyReport` and `showDailyReport`
- [x] `monthlyReport` and `showMonthlyReport`

**Test:** T30 to T38, checking the percentages by hand against `attendance.txt`.

### Checkpoint 9: Account management
**Owner:** Aksh Rastogi

- [x] `changePassword`
- [x] `addTeacher`, `viewTeachers`, and `showPerson`
- [x] Show admin options to `admin` only

**Test:** T40 to T44.

### Checkpoint 10: Final testing and documentation
**Owners:** Dhruv Kataria (`README.md`, full test run), all members (review)

- [x] Run the complete testing checklist below
- [x] Reset `data/` to the clean sample data
- [x] Write `README.md`: description, features, exact build and run commands, sample output, concepts used
- [x] Clean build from scratch with no warnings
- [x] Confirm VIVA.md matches the final code

---

## 3. Testing checklist

Sample logins: `admin` / `admin123` and `teacher1` / `pass123`.

### Startup and login

- [x] **T01** Correct login (`admin`, `admin123`): main menu appears
- [x] **T02** Wrong password three times: "Too many attempts", program closes
- [x] **T03** Teacher login (`teacher1`): works, and admin options are hidden
- [x] **T04** Letters at a menu (`abc`): error message, no crash
- [x] **T05** Out-of-range menu choice (`99`): error message, menu repeats
- [x] **T06** Delete `teachers.txt` and run: default admin is created and login works

### Students

- [x] **T10** Add a student with an 11-digit enrollment number: the internal ID is one above the highest, and the line appears in `students.txt`
- [x] **T11** Add with an empty name, or with `|` in the name: rejected
- [x] **T12** Add the same name in the same class: warning, Y/N asked
- [x] **T13** View all: table and total count are correct
- [x] **T14** Search ID `1`: found. Search ID `999`: "Student not found". Search by an exact roll number: found.
- [x] **T15** Search name `sha` (lowercase, partial): all matching students shown
- [x] **T16** Update the name of a student, press Enter for roll number and class: name changes, the rest stays
- [x] **T17** Change the class of a student who has attendance: rejected
- [x] **T18** Delete a student and answer Y: student is gone from both `students.txt` and `attendance.txt`, and the count drops by 1. Answering N changes nothing.
- [x] **T19** Add a roll number that already exists: rejected. Add `00000012345`: the leading zeros are kept in the file. Correct a student's roll number: their attendance stays attached.

### Subjects and attendance

- [x] **T20** Add a new subject: it appears in the list and in `subjects.txt`
- [x] **T21** Add a duplicate code, including in lowercase (`cs201a`): rejected
- [x] **T22** Mark attendance for a new date: only that class's students are listed, and lines are added to `attendance.txt`
- [x] **T23** Mark the same subject and date again: rejected
- [x] **T24** Enter `x` as a status: asked again. Lowercase `p` is accepted.
- [x] **T25** Date `30-02-2026`: rejected
- [x] **T26** A future date: rejected
- [x] **T27** Press Enter at the date prompt: today's date is used
- [x] **T28** Unknown subject code: "Subject not found"
- [x] **T29** Correct a mark from A to P: the student's percentage goes up and the file line changes. Correcting a mark that does not exist gives "No attendance record found".

### Reports

- [x] **T30** Student attendance: per-subject numbers match a hand count from `attendance.txt`
- [x] **T31** 5 of 6 present shows 83.33%
- [x] **T32** Student with no marks: "No classes yet", no crash
- [x] **T33** Defaulter list: students below 75% are listed
- [x] **T34** Sample student at exactly 3 of 4 (75.00%) in a subject: **not** listed as a defaulter for that subject
- [x] **T35** Daily report on a date with data: correct present and absent lists
- [x] **T36** Daily report on a date with no data: "No records found"
- [x] **T37** Monthly report: October and November 2026 give different, correct numbers
- [x] **T38** Student report shows an overall row: 5 of 6 and 3 of 4 give 8 of 10, 80.00%

### Account

- [x] **T40** Change password, restart, log in with the new password: works
- [x] **T41** Password with a space, or shorter than 4 characters: rejected
- [x] **T42** Admin adds a teacher: the new teacher can log in
- [x] **T43** Add a duplicate username: rejected
- [x] **T44** View teachers: passwords are not shown

### Persistence and file errors

- [x] **T50** Add a student, mark attendance, exit, restart: all data is still there
- [x] **T51** Add a student after restart: internal ID continues correctly, no duplicate
- [x] **T52** Delete `attendance.txt`: program starts, all students show "No classes yet"
- [x] **T53** Add a damaged line to `students.txt`: warning with the line number, other students load
- [x] **T54** Add an attendance line for student ID `999`: skipped with a warning
- [x] **T55** Close the window straight after a change, without using Exit: the change is saved

---

## 4. Demo order for the viva (about 5 minutes)

1. Build with the `g++` command and run.
2. Log in as `admin`.
3. View students, then add one (point out the duplicate check and the automatic internal ID).
4. Search by part of a name, then by internal ID.
5. Mark attendance for today.
6. View one student's attendance.
7. Show the defaulter list.
8. Show the monthly report for October, then November.
9. Exit, open `data/attendance.txt` in Notepad, and show the new lines.
10. Restart and show that the data is still there.

---

## 5. Web version

Plan: [WEB_PLAN.md](WEB_PLAN.md). The terminal version must keep working at every checkpoint.

**Extra rules for the web checkpoints**

1. All logic stays in C++. JavaScript only sends requests and shows replies, as listed in WEB_PLAN.md section 7. The one UI-only exception is the live counter on the Mark attendance page.
2. The core (`include/`, `src/`) must not use `cin`, HTTP, JSON, or threads, and must keep compiling on g++ 6.3.
3. Tests run on copies of `data/`, so the sample data in Git stays clean.
4. Update DESIGN.md and README.md whenever the design or commands change.

### 5.1 Web module ownership

Each member keeps the same area as in section 1, now from the browser down to the C++ code.

| Member | Web module | Files | Main concepts |
|--------|------------|-------|---------------|
| Aksh Rastogi | Server core, login, app shell | `server_main.cpp`, `ApiServer`, `AuthRoutes.cpp`, `SessionManager`, `Result`, `ConsoleUI`, `index.html`, `api.js`, `app.js`, `login.js`, `teachers.js` | Client-server, HTTP, sessions, threads and the mutex |
| Vaibhav | Students | `StudentRoutes.cpp`, `listStudents` and sorting, `students.js` | REST CRUD, status codes, selection sort |
| Akshay Kumar | Subjects and attendance | `AttendanceRoutes.cpp`, `Date::parseIso`, `Date::toIso`, `subjects.js`, `mark.js` | Request bodies, duplicate protection, date handling |
| Srishti Gupta | Data, JSON, design system, deployment | `JsonMapper`, `ConsoleInput`, `FileManager`, `web/css/`, `ui.js`, `icons.js`, `Dockerfile` | JSON, file handling on a server, Docker, ephemeral storage |
| Dhruv Kataria | Reports and testing | `Report`, `ReportPrinter`, `ReportRoutes.cpp`, `charts.js`, `dashboard.js`, `report.js`, `defaulters.js`, `daily.js`, `monthly.js`, `tests/` | Separating calculation from display, charts, testing |

### 5.2 Web checkpoints

#### Checkpoint W0: Setup and safety net
**Owners:** Aksh Rastogi, Dhruv Kataria

- [x] Update DESIGN.md and PLAN.md with the core split and new features
- [x] Add `third_party/`: `httplib.h` v0.64.0 and `json.hpp` v3.12.0, with licences
- [x] Record golden terminal output for every menu, **before any refactor**
- [x] Add `.gitignore` and `.dockerignore` entries

**Test:** `attendance.exe` still builds, and two golden runs match each other.

#### Checkpoint W1: Split Utils and add Result
**Owners:** Srishti Gupta (`ConsoleInput`), Aksh Rastogi (`Result`)

- [x] Move console input functions from `Utils` to `console/ConsoleInput`
- [x] Add the `Result` class and `ResultCode`
- [x] Add `Date::parseIso` and `Date::toIso`

**Test:** golden output matches. `Date` tests pass for `2026-11-03`, `2026-02-30`, and `abc`.

#### Checkpoint W2: Split AttendanceSystem and Report
**Owners:** Aksh Rastogi (`ConsoleUI`), Vaibhav and Akshay Kumar (their functions), Dhruv Kataria (`Report`, `ReportPrinter`)

- [x] Move all prompts and printing from `AttendanceSystem` to `ConsoleUI`
- [x] Every core action takes parameters and returns `Result`
- [x] Move `currentTeacher` out of the core, and pass the acting teacher as a parameter
- [x] `Report` fills structs, and `ReportPrinter` prints them
- [x] No `cin` remains in the core, and `cout` remains only in `display()` and `FileManager` messages

**Test:** golden output matches **byte for byte** on g++ 6.3 and g++ 15.2. The 45 recorded scenarios cover the checklist in section 3, including restarts.

#### Checkpoint W3: Server skeleton and login
**Owners:** Aksh Rastogi, Srishti Gupta (`JsonMapper`)

- [x] `server_main.cpp`, `ApiServer`, `PORT`, `HOST`, `DEMO_PASSWORD`
- [x] Serve `web/`, and `GET /api/health`
- [x] `SessionManager`: create, find, remove, expire, and login lockout
- [x] `/api/login`, `/api/logout`, `/api/me`, `/api/account/password`
- [x] The mutex, `requireLogin`, `readBody`, `sendResult`
- [x] `/api/teachers`, so the admin check can be tested

**Test:** W01 to W08.

#### Checkpoint W4: Dashboard data
**Owner:** Dhruv Kataria

- [x] `Report::dashboardStats`, `dailyTrend`, `subjectSummary`
- [x] `GET /api/dashboard`

**Test:** matches WEB_PLAN.md section 6.2, and an independent calculation from `attendance.txt`.

#### Checkpoint W5: Design system, shell, login, dashboard
**Owners:** Srishti Gupta (CSS, components), Aksh Rastogi (shell, login page), Dhruv Kataria (dashboard, charts)

- [x] `tokens.css` and the core components
- [x] Light and dark themes with the toggle
- [x] Navigation and page head (rebuilt as a dock and phone tab bar in W14)
- [x] Login page
- [x] Dashboard page (rebuilt as a bento grid in W14)
- [x] Screenshots at desktop and phone width, in both themes (in `docs/screenshots/`)
- [x] Browser checks in `tests/browser/`

**Test:** W50 to W53.

**DESIGN APPROVAL GATE. Stop here and show the dashboard. No other page is built until the design is approved.**

#### Checkpoint W6: Students, subjects, teachers
**Owners:** Vaibhav (students), Akshay Kumar (subjects), Aksh Rastogi (teachers)

- [x] `listStudents` with search and selection sort, and `listClasses`
- [x] Student, subject, and class API routes
- [x] Students page: table, search, sort, modals, confirm delete
- [x] Subjects page
- [x] Teachers page, admin only

**Test:** W10 to W19.

#### Checkpoint W7: Mark attendance
**Owner:** Akshay Kumar

- [x] `/api/attendance/sheet`, `POST`, and `PUT`
- [x] Mark attendance page: pickers, toggles, Mark all present, live counter (JS, display only), Save
- [x] Already-marked banner and correcting marks

**Test:** W20 to W27.

#### Checkpoint W8: Reports
**Owner:** Dhruv Kataria

- [x] Student, defaulter, daily, and monthly API routes
- [x] Student report page with progress bars and overall %
- [x] Defaulters page
- [x] Daily and monthly pages with tables and charts

**Test:** W30 to W36.

#### Checkpoint W9: Polish and rule audit
**Owners:** Srishti Gupta (polish), all members (audit)

- [x] Toasts, spinners, empty states, and focus states on every page
- [x] Field errors from server responses on every form
- [x] Check every page at phone width, in both themes
- [x] Audit `web/js/` against WEB_PLAN.md section 7
- [x] Check that no `innerHTML` receives server data

**Test:** W54 to W59.

#### Checkpoint W10: Full local test
**Owner:** Dhruv Kataria

- [x] Add the `tests/` API script, run against a copy of `data/`
- [x] Run all W tests and all T tests
- [x] Clean builds of both programs with no warnings

**Test:** W40 to W43, then every box in sections 3 and 5.3 up to W59 ticked. Automated tests are in `tests/`: terminal 45 of 45, API 216 of 216, browser 100 of 100.

#### Checkpoint W11: Deployment
**Owner:** Srishti Gupta

- [ ] Confirm Render's free tier accepts Docker, on the first deploy (needs a Render account)
- [x] `Dockerfile`, `.dockerignore`, and `render.yaml`
- [x] Confirm `data/` is the clean sample data
- [ ] Create the Render service and set `DEMO_PASSWORD` and `ALLOWED_ORIGIN`
- [ ] Create the Vercel project
- [x] Deploy on Render: the Docker build succeeded and `/api/health` answers

**Test:** W60 to W66.

#### Checkpoint W13: Split hosting
**Owners:** Aksh Rastogi (CORS), Srishti Gupta (deployment files)

- [x] `/api/health` returns `{"status":"ok"}`
- [x] CORS in C++, from `ALLOWED_ORIGIN`
- [x] `web/js/config.js` and `API_BASE`
- [x] `vercel.json`
- [x] Cold-start message and automatic retry

**Test:** W70 to W80.

#### Checkpoint W14: Redesign
**Owners:** Srishti Gupta (CSS, components), Aksh Rastogi (dock, tab bar, login page), Vaibhav (Students), Akshay Kumar (Subjects, Mark attendance, keyboard shortcuts), Dhruv Kataria (`Report::recentSessions`, dashboard, reports, charts)

- [x] Three design directions as mockups, in `docs/design-directions/`
- [x] Direction A chosen, with direction B's keyboard shortcuts
- [x] C++ fields for recent activity, classes marked today, the greeting, and avatars
- [x] Every page rebuilt, keeping the API, `config.js`, and the cold-start message
- [x] Browser tests updated, and new screenshots in `docs/screenshots/`

**Test:** every suite again, and W81 to W87. Terminal 45 of 45, API 253 of 253, browser 148 of 148, cross-origin 23 of 23.

#### Checkpoint W12: Documentation
**Owners:** Dhruv Kataria (`README.md`), all members (review)

- [x] README: web features, build commands, live link, screenshots
- [x] DESIGN.md matches the final structure
- [x] Update VIVA.md: Q6, Q68, and the new section 10, against the final code
- [x] Update the module guide with real file names

### 5.3 Web testing checklist

#### Server and login

- [x] **W01** `GET /api/health` returns 200 with no token
- [x] **W02** Correct login returns a token. Wrong password returns 401 and the C++ message.
- [x] **W03** A route with no token, or a made-up token, returns 401
- [x] **W04** After logout, the old token returns 401
- [x] **W05** Teacher token on an admin route returns 403, with `curl`, not only the browser
- [x] **W06** Three wrong logins lock that username for 30 seconds (429)
- [x] **W07** `/data/teachers.txt` and `/../data/teachers.txt` are not served, and no API reply contains a password
- [x] **W08** Broken JSON and an oversized body return an error, and the server keeps running

#### Students, subjects, teachers

- [x] **W10** Add a student in the browser: the line appears in `data/students.txt`, and the terminal shows them after restart
- [x] **W11** Duplicate roll number: 409, with the message under the roll number field
- [x] **W12** Empty or invalid fields: messages come from C++, with browser validation off
- [x] **W13** Same name in the same class: dialog appears, and confirming adds the student
- [x] **W14** Search by part of a name, and by exact roll number
- [x] **W15** Sorting by each column comes from the server, in both directions
- [x] **W16** Edit a student. Changing the class of a student with attendance is rejected.
- [x] **W17** Delete asks first, and removes the student from both files
- [x] **W18** Add a subject. A lowercase duplicate code is rejected.
- [x] **W19** Admin adds a teacher, who can then log in. A teacher does not see this page.

#### Attendance

- [x] **W20** Choosing a subject lists only that class
- [x] **W21** Live counter updates after each toggle, sends no request, and is not part of the saved data
- [x] **W22** Mark all present sets every toggle and updates the counter, and the totals after Save come from C++
- [x] **W23** Saving adds lines to `attendance.txt` with `ios::app`
- [x] **W24** A session already marked shows the banner, and a repeat `POST` returns 409
- [x] **W25** Future date and invalid date are rejected by C++, including with `curl`
- [x] **W26** Correct a mark from A to P: the file and the percentage change
- [x] **W27** Two browsers save the same subject and date together: one succeeds, one gets 409, and no duplicate lines exist

#### Reports

- [x] **W30** Student report shows 83.33%, 75.00%, and overall 80.00% for Diya Verma
- [x] **W31** Bars are green at exactly 75.00% and red below, with an icon and words
- [x] **W32** Student with no marks shows "No classes yet"
- [x] **W33** Defaulters page shows the same 5 entries as the terminal
- [x] **W34** Daily report on 03-11-2026 matches the terminal. A date with no data shows an empty state.
- [x] **W35** Monthly report for October and November matches the terminal
- [x] **W36** Every report matches an independent calculation from `attendance.txt`

#### Terminal and persistence

- [x] **W40** Terminal golden output still matches at the end of the project
- [x] **W41** Terminal builds on g++ 6.3 and g++ 15.2 with no warnings
- [x] **W42** Changes made in the browser survive a server restart locally
- [x] **W43** 50 parallel add-student requests produce no duplicate IDs and no lost lines

#### Design and behaviour

- [x] **W50** Dashboard shows 10 students, 4 subjects, 4 defaulter students
- [x] **W51** The hero says Not marked yet and gives the last marked day when nothing is marked today
- [x] **W52** Theme toggle changes every colour and redraws charts, and stays after reload
- [x] **W53** The dock becomes a tab bar at 760 px, with no sideways scrolling at 360 px
- [x] **W54** Every page has a loading state and an empty state
- [x] **W55** Every save and delete shows a toast
- [x] **W56** An expired session returns to login with a message
- [x] **W57** Modals work with the keyboard, and focus is visible
- [x] **W58** A subject named `<b>test</b>` shows as plain text
- [x] **W59** With no internet, tables work and the chart areas show a message

#### Redesign

- [x] **W81** The hero counts today's classes from C++, and shows today's percentage once a class is marked
- [x] **W82** Recent activity lists the latest four classes, newest first, and a class marked today says Today
- [x] **W83** The greeting comes from the server's clock and uses the first name
- [x] **W84** Avatar initials come from the server
- [x] **W85** The dashboard and marking page use the real date
- [x] **W86** Keyboard shortcuts mark, move, and save, stay out of the date box, and end with the page. Phones do not show them.
- [x] **W87** A server older than the page gives a message and Try again, and never leaves the page loading forever

#### Split hosting

- [x] **W70** A preflight from an allowed site is answered, naming that origin, the methods, and both headers
- [x] **W71** Login and the token work cross-origin, with no cookies
- [x] **W72** Every kind of error reply carries the CORS header, so the browser can show C++ messages
- [x] **W73** Several origins work, and lookalike origins get nothing
- [x] **W74** With the page and the API on different ports, the page calls API_BASE, and login and the dashboard work
- [x] **W75** POST, PUT, DELETE, and error messages work cross-origin, under the real `vercel.json` headers
- [x] **W76** The browser blocks a site that is not allowed
- [x] **W77** A sleeping server shows the waking message and no error, and login then retries by itself
- [x] **W78** A request held for several seconds shows the message, then loads
- [x] **W79** A read during sleep retries by itself
- [x] **W80** A save during sleep is not repeated, and asks the user to save again

#### Deployed site

- [x] **W60** Build succeeds on Render, and the health check passes
- [ ] **W61** Login works with `DEMO_PASSWORD`, and `admin123` does not
- [ ] **W62** The site opens over HTTPS, on a laptop and on a phone
- [x] **W63** `/data/teachers.txt` is not reachable
- [ ] **W64** Marking today works at any time of day (India time zone)
- [ ] **W65** Add a student, restart the service, and confirm the sample data is back
- [ ] **W66** Cold start after 15 idle minutes loads within about a minute

### 5.4 Demo order for the web version (about 5 minutes)

1. Start `attendance_server.exe` and show the build command.
2. Log in, point out the error message from a wrong password, then show the dashboard.
3. Switch the theme, and narrow the window to show the phone layout with its tab bar.
4. Add a student, and show the duplicate error from C++.
5. Mark attendance with `P`, `A`, and `Ctrl+S`, then open `data/attendance.txt` to show the new lines. Return to the dashboard to show today's numbers.
6. Show a student report and the defaulter list.
7. Open DevTools > Network and show the JSON for one request.
8. Open the same function in `AttendanceSystem.cpp`, and show that the terminal calls it too.
9. Open the live link.
