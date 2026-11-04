# Attendance Management System

A menu-driven console application in C++ for managing student attendance in a school or college. Teachers log in, manage students and subjects, mark attendance by date and subject, and view percentages, a defaulter list, and daily and monthly reports. All data is stored in text files, so it stays between runs.

Built for the **OOPs using C++ Lab** (PBL), 3rd Semester, B.Tech CSE (AIML).

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

## How to compile and run

You need g++ with C++11 support. The terminal version uses no external libraries.

Open a terminal in the project folder and run:

```
g++ -std=c++11 -Wall -Wextra -Iinclude -Iconsole main.cpp console/*.cpp src/*.cpp -o attendance.exe
.\attendance.exe
```

Run the program from the project folder, because it reads its files from `data/`.

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

## Concepts used

| Concept | Where |
|---------|-------|
| Classes and objects | `Date`, `AttendanceRecord`, `Person`, `Student`, `Teacher`, `Subject`, `FileManager`, `Report`, `AttendanceSystem`, `Result`, `ConsoleUI`, `ReportPrinter` |
| Encapsulation | Private data with getters and setters. `Teacher::password` is only compared inside `checkLogin()`. |
| Arrays | `students[]`, `subjects[]`, and `teachers[]` in `AttendanceSystem`, and each student's `records[]` attendance array |
| Static members | `totalStudents`, `nextId`, `getCount()`, `generateId()`, `calcPercentage()`, `DEFAULTER_LIMIT` |
| File handling | `ifstream` to read, `ofstream` to rewrite, and `ios::app` to append |
| Inheritance | `Person` -> `Student` and `Teacher` |
| Function overloading | `searchStudent(int)` and `searchStudent(string)`, and `countPresent()` in three forms |
| Runtime polymorphism | Virtual `display()`, called through `showPerson(const Person&)` |

## Project structure

```
main.cpp       Terminal entry and menus
console/       Terminal prompts and printing
include/       Core header files, one per class
src/           Core source files, one per class
tests/         Recorded terminal output and its test runner
data/          students.txt, subjects.txt, teachers.txt, attendance.txt
```

## Data files

Plain text, one record per line, fields separated by `|`.

| File | Format |
|------|--------|
| `students.txt` | `id\|rollNo\|name\|className` |
| `subjects.txt` | `code\|name\|className` |
| `teachers.txt` | `id\|name\|username\|password` |
| `attendance.txt` | `studentId\|subjectCode\|DD-MM-YYYY\|status` |

## Limitations

- Passwords are stored as plain text.
- Fixed limits: 100 students, 20 subjects, 10 teachers, and 300 attendance records per student.
- One lecture per subject per date, and one user at a time.

## Documentation

- [PLAN.md](PLAN.md): objectives, scope, and where each concept is used
- [DESIGN.md](DESIGN.md): classes, file formats, menu flow, and validation rules
- [TASKS.md](TASKS.md): build checkpoints, module ownership, and test checklist
- [VIVA.md](VIVA.md): viva questions and answers
