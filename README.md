# Attendance Management System

An attendance system for a school or college, written in C++. It has two front ends that share the same core classes:

- a **terminal version**: a menu-driven console program
- a **web version**: a C++ HTTP server with a browser interface

Teachers log in, manage students and subjects, mark attendance by date and subject, and see percentages, a defaulter list, and daily and monthly reports. All data is stored in text files, so it stays between runs. All logic stays in C++, and the browser only sends requests and shows the replies.

Built for the **OOPs using C++ Lab** (PBL), 3rd Semester, B.Tech CSE (AIML).

![Dashboard](docs/screenshots/dashboard-light-desktop.png)

## Team

| Member | Module |
|--------|--------|
| Aksh Rastogi | Core system, login, menus |
| Vaibhav | Students |
| Akshay Kumar | Subjects and attendance marking |
| Srishti Gupta | File handling and validation |
| Dhruv Kataria | Reports and testing |

## Features

- Login for admin and teachers, checked against a file, with three attempts
- Add, view, search, update, and delete students
- Real roll/enrollment numbers, with duplicates rejected
- Add and view subjects for each class
- Mark attendance by subject and date, and correct a wrong mark
- Student report with percentage per subject and overall
- Defaulter list of students below 75% in a subject
- Daily and monthly attendance reports
- Every change is saved to file immediately

The web version adds:

- A dashboard with charts and a list of the students who need attention
- Search and sort, done by the C++ server
- A REST API with JSON, and login sessions with tokens
- Light mode (ruled register paper) and dark mode (blackboard), on phones and laptops

## How to compile and run

Run both programs from the project folder, because they read their files from `data/`. Do not run them at the same time, because whichever saves last would overwrite the other's changes.

### Terminal version

You need g++ with C++11 support. It uses no external libraries.

```
g++ -std=c++11 -Wall -Wextra -Iinclude -Iconsole main.cpp console/*.cpp src/*.cpp -o attendance.exe
.\attendance.exe
```

### Web version

The server needs `std::thread`, so it needs a 64-bit compiler. MinGW g++ 6.3 cannot build it. Install [MSYS2](https://www.msys2.org), then run `pacman -S --needed mingw-w64-x86_64-gcc` in the MSYS2 terminal.

In PowerShell, from the project folder:

```
$env:Path = "C:\msys64\mingw64\bin;" + $env:Path
g++ -std=c++11 -Wall -Wextra -D_WIN32_WINNT=0x0A00 -Iinclude -Iserver -Ithird_party server/*.cpp src/*.cpp -static -lws2_32 -o attendance_server.exe
.\attendance_server.exe
```

Then open <http://localhost:8080>. The build takes a minute or two. The charts and fonts load from the internet. Without it, the tables still work.

**Sample logins**

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Admin (can also add and view teachers) |
| `teacher1` | `pass123` | Teacher |

The sample data contains 10 fictional students in two classes, 4 subjects, and 6 days of attendance from 26-10-2026 to 03-11-2026.

## Sample output

Logging in:

```
======================================
    ATTENDANCE MANAGEMENT SYSTEM
======================================
Username: admin
Password: admin123

Welcome, Administrator!

========== MAIN MENU ==========
1. Student Management
2. Subject Management
3. Attendance
4. Reports
5. Account
0. Exit
Enter choice:
```

Student attendance (Attendance > View student attendance, roll number `90218015625`):

```
Name    : Diya Verma
Roll No : 90218015625
Class   : AIML-A

Code        Subject                                   Present  Total  Percentage      Status
------------------------------------------------------------------------------------------------
CS201A      OOPs using C++                            5        6      83.33%          OK
MA201A      Mathematics III                           3        4      75.00%          OK
------------------------------------------------------------------------------------------------
Overall                                               8        10     80.00%
```

Defaulter list (Reports > Defaulter list):

```
Students below 75% in a subject

Roll No          Name                          Class     Subject     Attended  Percentage
-----------------------------------------------------------------------------------------
90318015625      Kabir Mehta                   AIML-A    CS201A      4/6       66.67%
90318015625      Kabir Mehta                   AIML-A    MA201A      2/4       50.00%
90618015625      Isha Nair                     AIML-A    CS201A      3/6       50.00%
90818015625      Meera Joshi                   AIML-B    CS201B      4/6       66.67%
90918015625      Vivaan Singh                  AIML-B    MA201B      2/4       50.00%
Total entries: 5
```

## Screenshots

| Light | Dark |
|-------|------|
| ![Students](docs/screenshots/students-light-desktop.png) | ![Monthly report](docs/screenshots/monthly-dark-desktop.png) |
| ![Mark attendance](docs/screenshots/mark-light-desktop.png) | ![Dashboard](docs/screenshots/dashboard-dark-desktop.png) |

## Concepts used

| Concept | Where |
|---------|-------|
| Classes and objects | The core: `Date`, `AttendanceRecord`, `Person`, `Student`, `Teacher`, `Subject`, `FileManager`, `Report`, `AttendanceSystem`, `Result`. The terminal: `ConsoleUI`, `ReportPrinter`. The server: `ApiServer`, `JsonMapper`, `SessionManager`, `Session`. |
| Encapsulation | Private data with getters and setters. `Teacher::password` is only compared inside `checkLogin()`. |
| Arrays | `students[]`, `subjects[]`, and `teachers[]` in `AttendanceSystem`, each student's `records[]` attendance array, and `sessions[]` in `SessionManager` |
| Static members | `totalStudents`, `nextId`, `getCount()`, `generateId()`, `calcPercentage()`, `DEFAULTER_LIMIT` |
| File handling | `ifstream` to read, `ofstream` to rewrite, and `ios::app` to append |
| Inheritance | `Person` -> `Student` and `Teacher` |
| Function overloading | `searchStudent(int)` and `searchStudent(string)`, and `countPresent()` in three forms |
| Runtime polymorphism | Virtual `display()`, called through `showPerson(const Person&)` |
| Sorting | Selection sort in `listStudents()` and `sortByPercentage()`, and insertion sort in `markHistory()` |
| Client-server, REST, JSON | The browser sends HTTP requests to `ApiServer`, which answers with JSON |
| Threads | The server handles requests on several threads, and a `std::mutex` protects the shared data |

## Project structure

```
main.cpp       Terminal entry and menus
console/       Terminal prompts and printing
include/       Core header files, one per class
src/           Core source files, one per class
server/        Web server: routes, sessions, and JSON
web/           The browser pages: HTML, CSS, and JavaScript
third_party/   cpp-httplib and nlohmann/json, with their licences
data/          students.txt, subjects.txt, teachers.txt, attendance.txt
tests/         Automated tests for the terminal, the API, and the browser
Dockerfile     Builds the server for deployment
render.yaml    Settings for Render
```

## Data files

Plain text, one record per line, fields separated by `|`.

| File | Format |
|------|--------|
| `students.txt` | `id\|rollNo\|name\|className` |
| `subjects.txt` | `code\|name\|className` |
| `teachers.txt` | `id\|name\|username\|password` |
| `attendance.txt` | `studentId\|subjectCode\|DD-MM-YYYY\|status` |

## Testing

```
python tests/run_golden.py attendance.exe
python tests/api_test.py attendance_server.exe attendance.exe
```

`run_golden.py` compares the terminal program against recorded sessions. `api_test.py` sends real HTTP requests, and works out the expected report numbers directly from the data files. `tests/browser/` drives the site in Chrome. Every test runs on a copy of the data.

## Deployment

The `Dockerfile` and `render.yaml` deploy the server on Render. See [WEB_PLAN.md](WEB_PLAN.md) section 10. A free service loses its changes whenever it restarts or sleeps, and then starts again from the sample data, so only fictional data should go online.

## Limitations

- Passwords are stored as plain text, so the deployed site uses a secret `DEMO_PASSWORD`.
- Fixed limits: 100 students, 20 subjects, 10 teachers, and 300 attendance records per student.
- One lecture per subject per date.
- The terminal version is for one user at a time. The server handles requests one at a time behind a mutex.
- The server keeps all sessions in memory, so a restart logs everyone out.

## Documentation

- [PLAN.md](PLAN.md): objectives, scope, and where each concept is used
- [DESIGN.md](DESIGN.md): classes, file formats, menu flow, and validation rules
- [TASKS.md](TASKS.md): build checkpoints, module ownership, and test checklist
- [VIVA.md](VIVA.md): viva questions and answers
- [WEB_PLAN.md](WEB_PLAN.md): the web version's architecture, API, design system, and deployment
