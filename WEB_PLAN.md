# WEB_PLAN: Web Version of the Attendance Management System

This plan adds a browser interface and an online deployment. The terminal version stays and keeps working. The plan is approved, with decision D1 changed as shown in section 2.

Related: [TASKS.md](TASKS.md) section 5 has the checkpoints and tests. [VIVA.md](VIVA.md) section 10 has the new viva questions.

**The two rules**

1. **C++ does all the real work.** Validation, login checks, duplicate checks, marking, percentages, defaulters, reports, sorting, searching, and file handling all stay in C++.
2. **The frontend must look genuinely good.** It should read as a modern SaaS dashboard, in light and dark mode, on a phone and on a laptop.

---

## 1. Checks done first

### 1.1 Does g++ 6.3 support `std::thread`? No.

Tested on this laptop with a small program and with the real `httplib.h`.

| Check | Result |
|-------|--------|
| `g++ --version` on the PATH | MinGW.org GCC 6.3.0, **32-bit** (`sizeof(void*)` is 4), thread model `win32` |
| `std::thread` and `std::mutex` on g++ 6.3 | **Do not compile:** `'thread' is not a member of 'std'` |
| `httplib.h` on g++ 6.3 | **Does not compile**, same error |
| cpp-httplib on 32-bit | README: "32-bit platforms are **NOT supported**" |

### 1.2 What to install: nothing

MSYS2 is already on this laptop, with a 64-bit compiler at `C:\msys64\mingw64\bin\g++.exe`: **g++ 15.2.0**, thread model `posix`. It is not first on the PATH, which is why plain `g++` still finds 6.3.

A throwaway test server was built with it using the exact headers this plan will use:

| Test | Result |
|------|--------|
| Build with `-std=c++11 -Wall -Wextra`, httplib + nlohmann | Passes with 0 warnings, about 17 seconds |
| `GET` JSON route, `POST` with JSON body, static file | All work |
| Bad JSON body | Returns 400, no crash |
| Path traversal (`/../spike.cpp`) | Returns 404 |
| 50 parallel requests behind a `std::mutex` | Counter correct (53 after 3 other hits) |
| `std::random_device` | Different values on each run |
| Exe dependencies with `-static` | Only Windows system DLLs, so it runs without MSYS2 on the PATH |
| Current project on g++ 15.2 | Builds with 0 warnings, and the defaulter list matches |

One flag is required on Windows: `-D_WIN32_WINNT=0x0A00`. Without it, httplib stops with "doesn't support Windows 8 or lower", because MinGW's default target is older than Windows 10.

cpp-httplib's README says MinGW and MSYS2 are "neither supported nor tested". The test above shows it works here, but this is only the local development setup. The deployed server runs on Linux, which is supported.

**Teammates without MSYS2:** install it from <https://www.msys2.org>, open the MSYS2 terminal, and run `pacman -S --needed mingw-w64-x86_64-gcc`.

### 1.3 New build commands

**Terminal version.** It works with either compiler, because the core uses no threads. Only the file list changes.

```
g++ -std=c++11 -Wall -Wextra -Iinclude -Iconsole main.cpp console/*.cpp src/*.cpp -o attendance.exe
.\attendance.exe
```

**Web server** (PowerShell, from the project folder). The first line picks the 64-bit compiler for this window only.

```
$env:Path = "C:\msys64\mingw64\bin;" + $env:Path
g++ -std=c++11 -Wall -Wextra -D_WIN32_WINNT=0x0A00 -Iinclude -Iserver -Ithird_party server/*.cpp src/*.cpp -static -lws2_32 -o attendance_server.exe
.\attendance_server.exe
```

Then open <http://localhost:8080>. A full build should take about a minute and a half, since five files include the large headers. This is an estimate from the 17-second test.

### 1.4 Deployment facts (Render docs, read 04-11-2026)

| Fact | What the docs say |
|------|-------------------|
| Files | "Free web services have an ephemeral filesystem". Local changes are lost on **redeploy, restart, or spin-down**. |
| Persistent disk | "Free web services _cannot_" attach one. Paid only. |
| Spin-down | After 15 minutes with no traffic. |
| Cold start | "about one minute" on the next request. |
| Hours | 750 free instance hours per workspace per month. |
| Binding | Must bind to `0.0.0.0`. `PORT` defaults to 10000. |
| Docker | Render builds from a repo Dockerfile. **Free-tier Docker is not stated on the current pages read.** Older docs suggest it works, so this is the first thing to confirm at checkpoint W11. |

**Not testable on this laptop:** Docker is not installed and WSL is not set up, so the Dockerfile's first real test is Render's own build log.

---

## 2. Decisions

All approved. D1 was changed during review.

| # | Issue | Decision |
|---|-------|-------------|
| D1 | **"Live count" conflicts with "no calculations in JS".** Counting toggles is a calculation. | **UI-only exception.** JS counts the ticked checkboxes to show a live Present/Absent counter. It is display only: nothing is sent or stored from it. When Save is pressed, C++ validates, calculates, and saves the final attendance, and the saved totals shown come from C++. |
| D2 | **JSON by hand or a library?** | **nlohmann/json for both reading and writing.** See section 5. |
| D3 | **Your page list has no Subjects page, and no way to correct a mark or change a password.** "Every feature" needs them. | Add a small **Subjects** page, correct a mark on the **Mark attendance** page, and **change password** in the top bar menu. |
| D4 | **The theme choice must be remembered, but JS may only store the token.** | Allow one exception: `theme` in `localStorage`. It is a display preference, not project data. |
| D5 | **Passwords are plain text, the repo is public, and `admin123` is in it.** Anyone could log in to the live site and delete things or change the password just before your viva. | Add a `DEMO_PASSWORD` secret on Render that replaces all passwords at startup. Keep plain text in the file, and state it as a limitation. Hashing needs SHA-256 code and a new file format, so it is listed as future work. |
| D6 | **Only fictional data goes online.** There are no hashed passwords and no persistence. | Never enter real student data on the deployed site. |
| D7 | **Free hosting resets data** after 15 idle minutes. | Accept it, and let the sample data restore itself (section 10). The viva demo runs locally, with the live link as a bonus. |

---

## 3. Architecture

```
  BROWSER (client)                        C++ SERVER (attendance_server)
 +----------------------+                +---------------------------------------------+
 |  index.html + CSS    |                |  cpp-httplib     receives HTTP, thread pool |
 |  JavaScript          |   HTTP + JSON  |      |                                      |
 |   - fetch() requests | -------------> |  ApiServer       token check, admin check,  |
 |   - shows the reply  | <------------- |      |           mutex lock, JSON in and out|
 |   - holds the token  |                |      v                                      |
 |                      |                |  CORE CLASSES (same code as the terminal)   |
 |  No logic, no maths, |                |  AttendanceSystem  Report  Student  Teacher |
 |  no data storage     |                |  Subject  Date  AttendanceRecord  Utils     |
 +----------------------+                |      |                                      |
                                         |  FileManager    ifstream / ofstream         |
  TERMINAL (attendance.exe)              +------|--------------------------------------+
 +----------------------+                       v
 |  main.cpp, ConsoleUI | ---- also calls ---> CORE CLASSES ---> data/*.txt
 +----------------------+                                        (same text files)
```

**Layer rules**

| Layer | Knows about | Must not know about |
|-------|-------------|---------------------|
| Core (`include/`, `src/`) | Rules, arrays, files | `cin`, HTTP, JSON, threads |
| Console (`main.cpp`, `console/`) | Prompts and printing | File formats and rules |
| Server (`server/`) | HTTP, JSON, tokens, the mutex | Rules. It only calls the core. |
| Frontend (`web/`) | HTML, CSS, display | Rules, maths, files |

**One button click, end to end (Add student)**

1. The user clicks **Save** in the modal. `students.js` calls `api.post("/api/students", {...})`.
2. `fetch()` sends `POST /api/students` with the token in the `Authorization` header and JSON in the body.
3. cpp-httplib receives it on a worker thread and calls `ApiServer::handleAddStudent(req, res)`.
4. The handler locks the mutex, checks the token, and reads the JSON.
5. It calls `app.addStudent(rollNo, name, className, confirmed)`, the **same member function the terminal uses**.
6. `addStudent` validates, checks for duplicates, stores the student, and calls `FileManager::saveStudents`, which writes with `ofstream`.
7. It returns a `Result`. The handler turns that into `201` with JSON, or `409` with the error message.
8. `students.js` shows a toast and reloads the table, or shows the error under the right field.

---

## 4. Separating the core from the UI

Today, `AttendanceSystem` and `Report` mix logic with `cin` and `cout`, so a server cannot call them. This is the largest change in the project, and it must not change how the terminal behaves.

### 4.1 What moves where

| Now | After |
|-----|-------|
| `AttendanceSystem::addStudent()` prompts, checks, saves | `Result addStudent(rollNo, name, className, confirmed)` checks and saves. `ConsoleUI::addStudent()` prompts and prints the result. The same split applies to every action. |
| `Report::studentReport()` calculates and prints | `Report` calculates and fills a struct. `console/ReportPrinter` prints it, and the server turns it into JSON. |
| `Utils` has input and validation | Validators stay in `Utils`. `readLine`, `readInt`, `readDate`, and the like move to `console/ConsoleInput`. |
| `currentTeacher` lives in `AttendanceSystem` | It moves to `ConsoleUI`. The server has many users, so core functions take the acting teacher as a parameter. |
| `login()` loops and prompts | `int checkLogin(username, password)` returns the teacher's index or -1. The three-attempt loop stays in `ConsoleUI`. |

`Person::display()` stays virtual and keeps using `cout`. It is the one display function left in the core, kept on purpose so runtime polymorphism still works through `showPerson(const Person&)`. The server never calls it.

### 4.2 The `Result` class

Every core action returns this, so the terminal and the web show the same messages.

```cpp
enum ResultCode { RESULT_OK, RESULT_INVALID, RESULT_NOT_FOUND, RESULT_DUPLICATE,
                  RESULT_NEEDS_CONFIRM, RESULT_LIMIT, RESULT_FORBIDDEN, RESULT_SAVE_FAILED };

class Result {
private:
    ResultCode code;
    std::string message;   // for example "This roll number already exists."
    std::string field;     // which form field it is about, for example "rollNo"
public:
    // constructor and getters
};
```

### 4.3 Keeping the terminal identical

- The terminal rejects a bad roll number before asking for the name. Small public check functions such as `checkNewRollNo()` keep that order. `addStudent` calls the same functions, so the rules exist only once.
- The same-name warning becomes `RESULT_NEEDS_CONFIRM`. The terminal asks Y/N, the web shows a dialog, and each retries with `confirmed = true`.
- **Proof:** before any refactor, scripted runs of every menu are saved as golden output. After the split, the output must match **byte for byte**, on g++ 6.3 and g++ 15.2.

### 4.4 New core features

These are new C++ code, because JavaScript may not do them.

| Feature | Where | Notes |
|---------|-------|-------|
| Sorting | `AttendanceSystem::listStudents` | Selection sort over an `int order[]` of indexes. Real data never moves. Sort by name, roll number, class, or ID. |
| Dashboard numbers | `Report::dashboardStats` | Totals, today's %, and defaulter counts. |
| Attendance trend | `Report::dailyTrend` | The last 14 days **that have marks**, so the chart stays filled as sample data ages. |
| Per-subject % | `Report::subjectSummary` | Present and total for each subject. |
| Class list | `AttendanceSystem::listClasses` | Fills the class dropdowns. |
| ISO dates | `Date::parseIso`, `Date::toIso` | `<input type="date">` gives `2026-11-03`. C++ converts it, not JS. |

Arrays stay, with no `vector`. Results use fixed arrays inside structs. `DefaulterEntry` holds array indexes rather than strings, so the largest list (100 x 20 = 2000 entries) is about 48 KB and safe on a thread's stack.

---

## 5. Server design

### 5.1 Why cpp-httplib

It is one header, so nothing needs installing. Pinned to **v0.64.0**, stored in `third_party/` with its MIT licence. Docker builds use that copy, so the build does not depend on a download.

### 5.2 JSON: why nlohmann/json and not by hand

| | By hand | nlohmann/json (chosen) |
|---|---------|-----------------------|
| Writing JSON | Possible, about 60 lines, escaping must be right | `out["name"] = student.getName();` |
| Reading JSON | Needs a hand-written parser for nested arrays such as `marks` | `json::parse(req.body, nullptr, false)` |
| Risk on a public server | Bugs in a parser exposed to the internet | Well-tested library |
| Viva | Shows string handling | Reads like a `map`, so easy to explain |

Writing by hand is reasonable. **Reading** by hand is the problem, because any stranger can send the server broken input. A hand-written parser would be more code than the rest of the server, and it teaches nothing about OOP. Using one library for both directions keeps it simple.

Pinned to **v3.12.0**, MIT licence, in `third_party/`. Only `server/` includes it, so the core and terminal build stay free of external libraries.

### 5.3 Classes

| Class | File | Job |
|-------|------|-----|
| `ApiServer` | `server/ApiServer.h/.cpp` | Registers routes, serves `web/`, and has shared helpers: `requireLogin`, `readBody`, `sendResult` |
| Route handlers | `server/AuthRoutes.cpp`, `StudentRoutes.cpp`, `AttendanceRoutes.cpp`, `ReportRoutes.cpp` | `ApiServer` member functions, one per endpoint, split by module |
| `SessionManager` | `server/SessionManager.h/.cpp` | Fixed array of `Session` objects: create, find, remove, expire. Also counts failed logins. |
| `JsonMapper` | `server/JsonMapper.h/.cpp` | Turns core objects and report structs into JSON. This is why passwords can never leak: it has no password to read. |

A typical handler, so the shape stays readable:

```cpp
// POST /api/students
void ApiServer::handleAddStudent(const Request& req, Response& res) {
    lock_guard<mutex> guard(dataLock);       // one request at a time touches the data
    if (!requireLogin(req, res)) return;

    json body;
    if (!readBody(req, res, body)) return;

    Result result = app.addStudent(body.value("rollNo", ""), body.value("name", ""),
                                   body.value("className", ""),
                                   body.value("confirmed", false));
    sendResult(res, result, 201);
}
```

### 5.4 Sessions and security

| Topic | Plan |
|-------|------|
| Token | 128 random bits from `std::random_device`, as 32 hex characters |
| Sending it | `Authorization: Bearer <token>` on each request |
| Storing it | `sessionStorage` in the browser, cleared when the tab closes |
| Expiry | 8 hours, stored with the session. A restart clears all sessions. |
| Admin routes | The core's `canViewTeachers()` and `canAddTeacher()` check the session's teacher. Hiding the menu item is only cosmetic. |
| Wrong logins | Three failures for a username lock it for 30 seconds, matching the terminal's three attempts |
| Files | Only `web/` is served, so `data/teachers.txt` has no URL |
| XSS | JS inserts server text with `textContent`, never `innerHTML`. Subject names may contain `<`, so this matters. |
| Body size | Limited to 64 KB |
| HTTPS | Provided by Render, so passwords are encrypted in transit |
| Local binding | `127.0.0.1` by default, `0.0.0.0` only in Docker through `HOST` |

### 5.5 Threads and the mutex

cpp-httplib handles requests on several threads, but the arrays, static counters, and files are shared. Without protection, two "add student" requests could take the same internal ID or the same array slot. A single `std::mutex` in `ApiServer` lets one request at a time touch the data. For a class-sized app that is fast enough, and it is simple to explain.

A one-thread pool was rejected, because a browser's kept-open connection could hold the only thread and block everyone else.

The mutex is in the server, not the core, so the core still compiles on g++ 6.3.

**Known limit:** the server loads files once at startup, so do not run the terminal and server together on the same `data/`. Whichever saves last would overwrite the other's changes.

### 5.6 Settings

| Variable | Default | Meaning |
|----------|---------|---------|
| `PORT` | `8080` | Port to listen on. Render sets 10000. |
| `HOST` | `127.0.0.1` | Address to bind to |
| `DEMO_PASSWORD` | not set | If set, replaces every account's password at startup (D5) |
| `TZ` | system | `Asia/Kolkata` in Docker, see section 10 |

---

## 6. REST API

Everything except `/api/login` and `/api/health` needs a token. Dates come back as `DD-MM-YYYY` for showing and `dateIso` for form inputs. Percentages come back twice: `percent` is the number for charts, and `percentText` such as `80.00%` is what the page shows, so JS never formats a number. The examples below leave out `percentText` to stay short.

**Every error has this shape**, and the message comes straight from the core `Result`:

```json
{ "ok": false, "code": "DUPLICATE", "error": "This roll number already exists.", "field": "rollNo" }
```

| HTTP | `code` | Meaning |
|------|--------|---------|
| 200 / 201 | | Success / created |
| 400 | `INVALID` | Bad input or bad JSON |
| 401 | `UNAUTHORIZED` | Missing or expired token, or wrong login |
| 403 | `FORBIDDEN` | Not admin |
| 404 | `NOT_FOUND` | No such student, subject, or record |
| 409 | `DUPLICATE`, `NEEDS_CONFIRM`, `LIMIT` | Conflicts with existing data |
| 429 | `LOCKED` | Too many wrong logins |
| 500 | `SAVE_FAILED` | File could not be written |

### 6.1 Endpoint list

| Method | Path | Auth | Core call |
|--------|------|------|-----------|
| GET | `/api/health` | none | none (Render health check) |
| POST | `/api/login` | none | `checkLogin` |
| POST | `/api/logout` | login | `SessionManager::remove` |
| GET | `/api/me` | login | current user and today's date |
| POST | `/api/account/password` | login | `changePassword` |
| GET | `/api/dashboard` | login | `Report::dashboardStats`, `dailyTrend`, `subjectSummary` |
| GET | `/api/students?q=&sort=&order=` | login | `listStudents` (search and sort) |
| GET | `/api/students/{id}` | login | `findStudent(int)` |
| POST | `/api/students` | login | `addStudent` |
| PUT | `/api/students/{id}` | login | `updateStudent` |
| DELETE | `/api/students/{id}` | login | `deleteStudent` |
| GET | `/api/subjects` | login | subject list |
| POST | `/api/subjects` | login | `addSubject` |
| GET | `/api/classes` | login | `listClasses` |
| GET | `/api/teachers` | admin | teacher list, no passwords |
| POST | `/api/teachers` | admin | `addTeacher` |
| GET | `/api/attendance/sheet?subject=&date=` | login | class list and any existing marks |
| POST | `/api/attendance` | login | `markAttendance` |
| PUT | `/api/attendance` | login | `editAttendance` (correct one mark) |
| GET | `/api/reports/student/{id}` | login | `Report::studentReport` |
| GET | `/api/reports/defaulters` | login | `Report::defaulterList` |
| GET | `/api/reports/daily?date=` | login | `Report::dailyReport` |
| GET | `/api/reports/monthly?class=&month=` | login | `Report::monthlyReport` |

### 6.2 Examples

The numbers below are from the real sample data.

**Login**

```
POST /api/login
{ "username": "admin", "password": "admin123" }

200 { "ok": true, "token": "9f2c41d07ab34e6e8c15d2f3a7b09e41",
      "user": { "name": "Administrator", "username": "admin", "isAdmin": true } }

401 { "ok": false, "code": "UNAUTHORIZED", "error": "Wrong username or password." }
```

**Dashboard**

Today is 04-11-2026, so nothing is marked yet and the card falls back to the last marked day. `status` is decided in C++, so JS only picks a colour.

```
GET /api/dashboard

200 {
  "ok": true,
  "today": "04-11-2026",
  "limit": 75,
  "cards": {
    "students": 10,
    "subjects": 4,
    "todayMarked": false,
    "todayPresent": 0,
    "todayTotal": 0,
    "todayPercentText": "0.00%",
    "anyMarks": true,
    "lastMarkedDate": "03-11-2026",
    "lastMarkedLabel": "03 Nov",
    "lastMarkedPercentText": "80.00%",
    "defaulterStudents": 4,
    "defaulterEntries": 5
  },
  "trend": [
    { "date": "26-10-2026", "label": "26 Oct", "present": 8, "total": 10, "percent": 80.0, "percentText": "80.00%" },
    { "date": "27-10-2026", "label": "27 Oct", "present": 17, "total": 20, "percent": 85.0, "percentText": "85.00%" }
  ],
  "subjects": [
    { "code": "CS201A", "name": "OOPs using C++", "className": "AIML-A",
      "present": 29, "total": 36, "percent": 80.56, "percentText": "80.56%", "status": "ok" }
  ]
}
```

**Search and sort students**

```
GET /api/students?q=diya&sort=name&order=asc

200 { "ok": true, "total": 1,
      "students": [ { "id": 2, "rollNo": "90218015625", "name": "Diya Verma", "className": "AIML-A" } ] }
```

**Add a student**

```
POST /api/students
{ "rollNo": "90118015625", "name": "New Student", "className": "AIML-A" }

409 { "ok": false, "code": "DUPLICATE", "error": "This roll number already exists.", "field": "rollNo" }
```

Same name in the same class: the frontend shows a dialog, then sends the request again with `"confirmed": true`.

```
409 { "ok": false, "code": "NEEDS_CONFIRM", "error": "A student with this name is already in AIML-A." }
```

Success:

```
201 { "ok": true, "message": "Student added with internal ID 11.",
      "student": { "id": 11, "rollNo": "92018015625", "name": "New Student", "className": "AIML-A" } }
```

**Delete a student**

```
DELETE /api/students/11

200 { "ok": true, "message": "Student deleted." }
```

**Mark attendance**

The sheet says whether the session is already marked. If it is, the page switches to correcting marks.

```
GET /api/attendance/sheet?subject=CS201A&date=2026-11-03

200 { "ok": true, "subject": "CS201A", "className": "AIML-A", "date": "03-11-2026",
      "alreadyMarked": true,
      "students": [ { "id": 1, "rollNo": "90118015625", "name": "Aarav Sharma", "status": "P" },
                    { "id": 5, "rollNo": "90518015625", "name": "Rohan Das", "status": "A" } ] }
```

Saving. The live counter on the page is not part of this request, and the `present` and `absent` in the reply are counted by C++:

```
POST /api/attendance
{ "subject": "CS201A", "date": "2026-11-04",
  "marks": [ { "studentId": 1, "status": "P" }, { "studentId": 2, "status": "A" } ] }

201 { "ok": true, "message": "Attendance saved. Present: 1, Absent: 1", "present": 1, "absent": 1 }

409 { "ok": false, "code": "DUPLICATE",
      "error": "Attendance for CS201A on 04-11-2026 is already marked. Use Correct a mark to change it." }
```

Correcting one mark:

```
PUT /api/attendance
{ "studentId": 5, "subject": "CS201A", "date": "2026-11-03", "status": "P" }

200 { "ok": true, "message": "Attendance corrected." }
```

**Student report**

```
GET /api/reports/student/2

200 { "ok": true,
      "student": { "id": 2, "rollNo": "90218015625", "name": "Diya Verma", "className": "AIML-A" },
      "limit": 75,
      "subjects": [
        { "code": "CS201A", "name": "OOPs using C++", "present": 5, "total": 6, "percent": 83.33, "status": "ok" },
        { "code": "MA201A", "name": "Mathematics III", "present": 3, "total": 4, "percent": 75.00, "status": "ok" }
      ],
      "overall": { "present": 8, "total": 10, "percent": 80.00 } }
```

`status` is `ok`, `low`, or `none` (no classes yet).

**Defaulters**

```
GET /api/reports/defaulters

200 { "ok": true, "limit": 75, "total": 5, "entries": [
        { "rollNo": "90318015625", "name": "Kabir Mehta", "className": "AIML-A",
          "subject": "CS201A", "present": 4, "total": 6, "percent": 66.67 },
        { "rollNo": "90318015625", "name": "Kabir Mehta", "className": "AIML-A",
          "subject": "MA201A", "present": 2, "total": 4, "percent": 50.00 } ] }
```

**Daily report**

```
GET /api/reports/daily?date=2026-11-03

200 { "ok": true, "date": "03-11-2026", "subjects": [
        { "code": "CS201A", "name": "OOPs using C++", "className": "AIML-A", "present": 4, "absent": 2,
          "students": [ { "rollNo": "90118015625", "name": "Aarav Sharma", "status": "Present" },
                        { "rollNo": "90518015625", "name": "Rohan Das", "status": "Absent" } ] } ] }
```

**Monthly report**

```
GET /api/reports/monthly?class=AIML-A&month=2026-11

200 { "ok": true, "className": "AIML-A", "month": 11, "year": 2026, "students": [
        { "rollNo": "90118015625", "name": "Aarav Sharma", "held": 4, "present": 4, "percent": 100.00 },
        { "rollNo": "90218015625", "name": "Diya Verma", "held": 4, "present": 3, "percent": 75.00 },
        { "rollNo": "90318015625", "name": "Kabir Mehta", "held": 4, "present": 2, "percent": 50.00 } ] }
```

**Admin route used by a teacher**

```
GET /api/teachers   (logged in as teacher1)

403 { "ok": false, "code": "FORBIDDEN", "error": "Only the admin can view teachers." }
```

---

## 7. What JavaScript may do

| Allowed | Not allowed |
|---------|-------------|
| Send requests and show replies | Any arithmetic on data, including percentages and report totals |
| Open modals, toggle the sidebar and theme | Comparing a value to 75. C++ sends `status`. |
| Hold unsaved Present/Absent toggles on the page | Filtering or sorting rows. Search goes to the server. |
| Hold the token in `sessionStorage` | Validation, including HTML `required` or `pattern` (forms use `novalidate`) |
| Store the theme choice (D4) | Reformatting dates |
| Pass server numbers to Chart.js | Storing any project data |
| Count ticked checkboxes for the live counter (D1, UI-only exception) | Sending that count to the server, or using it for anything else |

Because forms have no browser validation, every message a user sees comes from C++.

---

## 8. Pages

The app is one `index.html`. Hash routes such as `#/students` swap the content area, with no page reloads.

**Shell (every page after login)**

```
+-----------+-----------------------------------------------------+
| LOGO      |  [=] Page title              [sun/moon]  (AR) Admin v|
|           +-----------------------------------------------------+
| Dashboard |                                                     |
| Students  |   Content area: cards on the page background        |
| Subjects  |                                                     |
| Mark      |                                                     |
| Report    |                                                     |
| Defaulters|                                                     |
| Daily     |                                                     |
| Monthly   |                                                     |
| Teachers* |                                * admin only         |
+-----------+-----------------------------------------------------+
```

Sidebar: 240 px with inline SVG icons, and the active item is tinted with the accent. Below 900 px it becomes a slide-in drawer opened by the menu button, over a dimmed backdrop. The user menu holds Change password and Log out.

| Page | Layout | Details |
|------|--------|---------|
| **Login** | Centered 400 px card on a soft accent gradient | Logo, two fields, button with spinner. Errors appear inside the card. Lockout shows the C++ message. |
| **Dashboard** | Row of 4 stat cards, then 2 charts side by side (stacked on mobile) | Details below |
| **Students** | Search box, Add button, table in a card | Search as you type, with a short pause, through the server. Clickable column headers sort through the server. Add and edit in a modal, delete through a confirm dialog. Empty state: "No students yet". |
| **Subjects** | Table and Add button | Same pattern. Shown because of D3. |
| **Mark attendance** | Filter bar (date, subject), then student list | Each row has a Present/Absent toggle (a checkbox styled as a switch). Sticky footer: live counter (JS, display only), "Mark all present", Save. After Save, the toast shows the totals from C++. If already marked, a banner says so and each change saves as a correction. |
| **Student report** | Student search, header card, one card of bars | Name, roll number, class, large overall %. One progress bar per subject, with `5 of 6` and the % beside it. Green at 75% or above, red below, each with an icon and the words "OK" or "Below 75%". Grey "No classes yet" for `none`. |
| **Defaulters** | Summary line and table | Red badge with the % in each row. Empty state: "No defaulters". |
| **Daily report** | Date picker, stacked bar chart, then a table per subject | Chart shows present and absent per subject |
| **Monthly report** | Class and month pickers, bar chart, then table | Chart shows each student's %, with the 75% line |
| **Teachers** | Table and Add button | Admin only. A teacher who opens this URL sees "Only the admin can view teachers." from the server. |

**Dashboard detail**

```
+--------------+ +--------------+ +--------------+ +--------------+
| Students     | | Subjects     | | Today        | | Defaulters   |
| 10           | | 4            | | Not marked   | | 4            |
| In all ...   | | In all ...   | | Last: 80.00% | | Below 75%    |
+--------------+ +--------------+ +--------------+ +--------------+
+---------------------------------+ +----------------------------+
| Attendance trend                | | Attendance by subject      |
| Line, % per marked day          | | Horizontal bars, by code   |
| Y axis 0 to 100, 75% line       | | 75% line                   |
+---------------------------------+ +----------------------------+
```

Each chart card has a Chart/Table switch. The table shows the same server numbers, for colour-blind readers and for use without internet.

**Polish on every page:** hover and focus states, 150 ms transitions, toasts for success and error, skeleton or spinner while loading, empty states, confirm dialogs before delete, field errors under the right input using `field` from the server, and a "Session expired" return to login on a 401.

---

## 9. Design system

All values are CSS variables in `web/css/tokens.css`. Colours below were checked: text contrast measured, chart colours run through a colour-blindness validator.

### 9.1 Colours

One accent: **indigo**.

| Token | Light | Dark |
|-------|-------|------|
| `--bg-page` | `#f6f7f9` | `#0f1115` |
| `--bg-surface` | `#ffffff` | `#171a21` |
| `--border` | `#e5e7eb` | `#2a2f3a` |
| `--text` | `#111827` | `#f3f4f6` |
| `--text-secondary` | `#4b5563` | `#c1c6d0` |
| `--text-muted` | `#6b7280` | `#9aa1ad` |
| `--accent` | `#4f46e5` | `#818cf8` |
| `--accent-hover` | `#4338ca` | `#a5b4fc` |
| `--accent-soft` | `#eef2ff` | `#1e2140` |
| `--on-accent` (button text) | `#ffffff` | `#0f1115` |
| `--good-text` / `--good-bg` | `#166534` / `#dcfce7` | `#86efac` / `#14321f` |
| `--bad-text` / `--bad-bg` | `#b91c1c` / `#fee2e2` | `#fca5a5` / `#3f1a1c` |
| `--good-bar` / `--bad-bar` | `#15803d` / `#dc2626` | `#22c55e` / `#f87171` |
| `--track` (bar background) | `#e5e7eb` | `#2a2f3a` |
| `--chart-1` / `--chart-2` | `#4f46e5` / `#eb6834` | `#7a84f6` / `#d95926` |

**Measured contrast:** body text at least 15.8:1, muted text at least 4.5:1, button text at least 6.2:1, badge text at least 5.3:1, progress bars at least 3.9:1 on their track. Text needs 4.5:1 and bars need 3:1.

**Chart colours:** the pair passes every check in both themes, including colour-blind separation (worst pair 31.4 light, 29.0 dark, where the target is at least 8). Dark mode has its own chart indigo, because `#818cf8` failed the lightness limit for marks.

Green and red are reserved for attendance status and are never used as chart series. Status always has an icon and words, so colour-blind users are not relying on red versus green.

### 9.2 Type, spacing, shape

| Group | Values |
|-------|--------|
| Font | Inter (Google Fonts), weights 400, 500, 600, 700, with a system font fallback |
| Sizes | 12, 13, 14 (body), 16, 20, 24, 32 px. Table number columns use tabular figures. |
| Spacing | 4, 8, 12, 16, 24, 32, 48 px |
| Radius | 6 (inputs, buttons), 10 (cards), 14 (modals), 999 (badges) |
| Shadow | `sm` for cards, `md` for dropdowns, `lg` for modals, softer in dark mode |
| Motion | 150 ms ease-out, turned off under `prefers-reduced-motion` |

### 9.3 Components

Button (primary, secondary, ghost, danger), input, select, stat card, card, table, badge, progress bar, segmented toggle, modal, confirm dialog, toast, spinner and skeleton, empty state, sidebar item, user menu.

Keyboard: visible focus ring, Esc closes modals, Tab stays inside an open modal.

### 9.4 Charts

Chart.js **4.6.1** from jsDelivr, pinned, with an integrity hash:

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.6.1/dist/chart.umd.min.js"
        integrity="sha384-Emf5ZVIUiarAdhkgtqK+5/Z5qIvM6QoVrS+qAVtfyZVuD5lIHrac0me485+Antp0"
        crossorigin="anonymous"></script>
```

| Rule | Value |
|------|-------|
| Line | 2 px, markers at least 8 px with a surface-coloured ring, a soft area fill that fades downwards |
| Bars | At most 24 px thick, 4 px rounded ends, 2 px gaps in stacks |
| Grid | 1 px solid, recessive |
| Y axis | Fixed 0 to 100 for percentages, always one axis |
| Legend | Only with two or more series (daily report). Single-series charts rely on the title. |
| Tooltips | On every chart |
| Labels | Text uses text tokens, never the series colour |
| Theme | Colours are read from CSS variables and charts redraw on toggle |
| Without internet | Tables still work, and the chart area says "Charts need an internet connection" |

---

## 10. Deployment (Docker on Render)

### 10.1 Dockerfile

Two stages: one to compile, one small image to run.

```dockerfile
# Stage 1: compile on Linux
FROM debian:bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY include/ include/
COPY src/ src/
COPY server/ server/
COPY third_party/ third_party/
RUN g++ -std=c++11 -O2 -Iinclude -Iserver -Ithird_party server/*.cpp src/*.cpp \
    -pthread -o attendance_server

# Stage 2: only what is needed to run
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends tzdata \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /src/attendance_server .
COPY web/ web/
COPY data/ data/
RUN useradd -m appuser && chown -R appuser /app
USER appuser
ENV HOST=0.0.0.0 PORT=10000 TZ=Asia/Kolkata
EXPOSE 10000
CMD ["./attendance_server"]
```

**Why `TZ` matters:** Render's clock is UTC, 5:30 behind India. Without this, "today" would be yesterday until 5:30 AM, and marking today's attendance would be rejected as a future date.

### 10.2 Why data resets, and how it comes back

The container's disk is thrown away on every redeploy, restart, and spin-down. A free service spins down after 15 quiet minutes, so **any change made online disappears soon after people stop using the site**. Logged-in sessions also end.

**Restoring sample data needs no extra code.** `COPY data/ data/` puts the sample files inside the image. Every start is a fresh copy of the image, so the server always starts with the 10 students, 4 subjects, and attendance committed to Git. A restart from the Render dashboard is therefore also a "reset demo" button.

This also means `data/` in Git **is** the seed. Commit only clean sample data. Test runs must use copies.

| If you later need data to survive | Cost |
|-----------------------------------|------|
| Render paid instance with a persistent disk mounted at `/app/data` | Paid. No code change, because the files stay the same. |
| A database | Not an option here: file handling must stay visible for the viva. |

### 10.3 Deployment steps

1. Finish and test locally. Confirm `data/` is clean.
2. Commit and push to GitHub.
3. Create a free account at <https://render.com> and connect GitHub.
4. New > Web Service > choose the repository. Set **Language** to Docker and the instance type to Free. If Free is not offered for Docker, stop and decide before paying for anything.
5. Under Advanced, set **Health Check Path** to `/api/health`.
6. Add the secret `DEMO_PASSWORD`. Do not reference it in the Dockerfile, as Render warns against that for secrets.
7. Deploy, then read the build log.
8. Open the `onrender.com` link and run the deployed test list in TASKS.md.

### 10.4 Viva day

- Run the demo **locally**. It needs no internet except for fonts and charts, and has no cold start.
- Open the live link two minutes before showing it, because a cold start takes about a minute.
- Keep the terminal version ready. It proves both front ends share one core.

---

## 11. Folder structure

```
OOPS-PBL/
|-- main.cpp                Terminal entry point and menus
|-- console/                Terminal UI only
|   |-- ConsoleUI.h/.cpp        prompts, printing, currentTeacher
|   |-- ConsoleInput.h/.cpp     readLine, readInt, readDate, ...
|   `-- ReportPrinter.h/.cpp    prints report structs with setw
|-- include/  src/          CORE classes, no cin, HTTP, or JSON
|   |-- Result.h/.cpp           new
|   `-- (all existing classes)
|-- server/                 Web server only
|   |-- server_main.cpp
|   |-- ApiServer.h/.cpp
|   |-- AuthRoutes.cpp  StudentRoutes.cpp  AttendanceRoutes.cpp  ReportRoutes.cpp
|   |-- SessionManager.h/.cpp
|   `-- JsonMapper.h/.cpp
|-- third_party/            httplib.h, json.hpp, and their licences
|-- web/                    Everything the browser downloads
|   |-- index.html
|   |-- css/  tokens.css  base.css  layout.css  components.css
|   `-- js/   theme.js  api.js  ui.js  icons.js  charts.js  app.js
|       `-- pages/  login.js  dashboard.js  students.js  subjects.js  mark.js
|                   report.js  defaulters.js  daily.js  monthly.js  teachers.js
|-- data/                   The same four text files
|-- docs/screenshots/       Screenshots for review and the README
|-- tests/                  Golden terminal output, API tests, and browser tests
|-- Dockerfile
|-- .dockerignore
`-- WEB_PLAN.md and the existing documents
```

`include/` and `src/` keep their names, so the existing classes stay where the team expects them.

---

## 12. Risks

| Risk | Plan |
|------|------|
| The core split breaks the terminal | Golden output comparison, plus the full T-checklist again |
| Dockerfile untested locally | Render's build log is the first test. Keep time for fixes before the viva. |
| Render free tier does not allow Docker | Confirmed first at W11, before any other deployment work |
| Someone changes data on the live site | `DEMO_PASSWORD`, plus a restart restores everything |
| No internet at the viva | Local demo: tables work, charts and Inter need internet |
| Team must explain more code | Each owner has one route file and one or two pages. VIVA.md section 10 covers the new ideas. |

**Out of scope:** deleting subjects or teachers (the terminal cannot do this either), hashed passwords, a database, multiple lectures per subject per day, and emails or exports.
