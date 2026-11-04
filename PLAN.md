# PLAN: Attendance Management System

**Course:** OOPs using C++ Lab (PBL), 3rd Semester, B.Tech CSE (AIML)
**Topic:** School/College Attendance Management System
**Status:** Planning. Coding starts only after the plan is approved.

| Team member   | Enrollment No. |
|---------------|----------------|
| Aksh Rastogi  | 02518015625    |
| Vaibhav       | 01118015625    |
| Akshay Kumar  | 00618015625    |
| Srishti Gupta | 06618015625    |
| Dhruv Kataria | 05118015625    |

Related documents: [DESIGN.md](DESIGN.md) (how it is built), [TASKS.md](TASKS.md) (build order, module owners, tests), [VIVA.md](VIVA.md) (viva preparation).

---

## 1. Project overview

Many schools and colleges still track attendance in paper registers. Calculating a student's percentage, or finding everyone below 75%, then means adding up pages by hand.

This project is a **menu-driven console application in C++**. A teacher logs in, manages students and subjects, marks attendance by date and subject, and gets percentages, a defaulter list, and daily and monthly reports. All data is stored in text files, so it is still there the next time the program runs.

## 2. Objectives

1. Apply the four required concepts in a real program: **classes, arrays, static members, and file handling**.
2. Replace manual attendance calculation with automatic percentages and reports.
3. Keep data permanently using files, without a database.
4. Write clean, modular code (one `.h` and one `.cpp` per class) that every team member can explain.

## 3. Scope

### In scope

- Console (text menu) application for one user at a time
- Login for an admin and for teachers, checked against a file
- Add, view, search, update, and delete students
- Add and view subjects
- Mark attendance per subject per date, and correct a wrong mark
- Attendance percentage per subject and overall
- Defaulter list, daily report, and monthly report
- Saving and loading all data using text files

### Out of scope

- Graphical interface, web, or mobile version
- Databases and networking
- Encrypted passwords (stored as plain text, see section 8)
- More than one person using the program at the same time
- More than one lecture of the same subject on the same date
- Deleting a subject (students' attendance depends on subjects, so subjects are add-only)
- Biometric or automatic attendance

## 4. Feature list

| ID  | Feature | What it does |
|-----|---------|--------------|
| F1  | Login | Username and password checked against `teachers.txt`. Three wrong attempts close the program. |
| F2  | Account management | Any user can change their own password. Only `admin` can add and view teachers. |
| F3  | Add student | Roll number is generated automatically. The user enters name and class. |
| F4  | View students | Table of all students, plus the total count. |
| F5  | Search student | By roll number (exact), or by name (partial, ignoring upper/lower case). |
| F6  | Update student | Change name or class. Press Enter to keep the old value. |
| F7  | Delete student | Asks for confirmation. Also removes that student's attendance. |
| F8  | Add/view subjects | Each subject has a unique code, a name, and the class it is taught to. |
| F9  | Mark attendance | Choose a subject and date, then mark P or A for each student of that class. |
| F10 | Correct attendance | Change one existing mark (roll number + subject + date). |
| F11 | Student attendance | Present, total, and percentage for each subject, plus overall. |
| F12 | Defaulter list | Every student and subject where attendance is below 75%. |
| F13 | Daily report | For one date: who was present and absent in each subject. |
| F14 | Monthly report | For one class and month: classes held, present, and percentage per student. |
| F15 | Persistence | Data loads at startup. Every change is saved to file immediately. |

### Decisions worth reviewing

These rules were not specified in the project brief, so they are design choices. Please check that they match what your faculty expects.

- **"Class" is a text label** (for example `AIML-A`) stored on students and subjects. Adding a subject for a new label effectively creates that class, so no separate class list is needed.
- **Each subject belongs to one class.** Marking attendance only needs the subject, because the subject already tells the program which students to list. If two sections study the same subject, it is entered twice with different codes (`CS201A`, `CS201B`).
- **Defaulters are checked subject-wise.** A student appears once for each subject below 75%. Exactly 75.00% is **not** a defaulter. A subject with no classes held yet is ignored.
- **Roll numbers are generated** by the program, starting at 101. This shows a static member doing useful work and makes duplicate roll numbers impossible.
- **A student's class cannot be changed once they have attendance**, because their marks belong to the old class's subjects.

## 5. Where and why each required concept is used

### 5.1 Classes and objects

**Where:** nine classes: `Date`, `AttendanceRecord`, `Person`, `Student`, `Teacher`, `Subject`, `FileManager`, `Report`, `AttendanceSystem`.

**Why:** each class models one real thing and keeps its data and related functions together.

| Idea | Where it appears | Why |
|------|------------------|-----|
| Encapsulation | `Teacher::password` is private and is only compared inside `checkLogin()`. `Student::records` is private and only changes through `addRecord()`. | Other code cannot put an object into a wrong state. |
| Constructors | `Student()` and `Student(roll, name, class)`. `AttendanceSystem()` loads all files. | Objects start in a valid state. The default constructor is required because arrays of objects need it. |
| Destructors | `~AttendanceSystem()` prints a closing message. `~Person()` is virtual. | Our classes do not use `new`, so nothing needs freeing. File streams close themselves when they go out of scope, and this is the honest viva answer. |
| Member functions | `Student::getPercentage()`, `Date::isValid()`, `Subject::display()` | Each object answers questions about its own data. |

### 5.2 Arrays

| Array | Where | Why |
|-------|-------|-----|
| `Student students[MAX_STUDENTS]` | `AttendanceSystem` | Fixed-size array of objects holding all students in memory. |
| `Subject subjects[MAX_SUBJECTS]` | `AttendanceSystem` | Fixed-size array of objects. |
| `Teacher teachers[MAX_TEACHERS]` | `AttendanceSystem` | Fixed-size array of objects. |
| `AttendanceRecord records[MAX_RECORDS]` | `Student` | The attendance array of each student. Each student carries their own history. |
| `char marks[MAX_STUDENTS]` | `markAttendance()` | Holds P/A answers temporarily, so a session is stored only after all answers are entered. |
| `string fields[...]` | `FileManager` | Holds the separate parts of one line from a file. |

Searching uses a loop over the array. Deleting shifts later elements one place left. When an array is full, the program shows a message and refuses the new entry.

### 5.3 Static members

| Static member | Class | Why it must be static |
|---------------|-------|-----------------------|
| `totalStudents`, `totalSubjects`, `totalTeachers` | `Student`, `Subject`, `Teacher` | The count belongs to the whole class, not to one object. It is also the number of array slots in use, so every loop depends on it. |
| `nextRollNo`, `nextId` | `Student`, `Teacher` | Generates the next ID. One shared value is needed so two students can never get the same number. |
| `DEFAULTER_LIMIT` (= 75) | `Student` | A constant shared by all students, stored once. |
| `getTotalStudents()`, `generateRollNo()` | `Student` | Can be called without an object, as `Student::getTotalStudents()`. |
| `calcPercentage(present, total)` | `Student` | Pure calculation that needs no object data. |
| `Date::today()`, `Date::parse()`, `Date::isLeapYear()` | `Date` | Useful before any `Date` object exists. |
| All `FileManager` and `Report` functions | `FileManager`, `Report` | These classes hold no per-object data, so creating objects of them would serve no purpose. |

**Important design point:** the counter is **not** increased in the constructor. `Student students[100]` runs the constructor 100 times at startup, so a constructor-based counter would report 100 students before any were added. The count changes only when a real record is added or removed.

### 5.4 File handling

| Operation | How | Where |
|-----------|-----|-------|
| Read | `ifstream` + `getline()`, splitting on `\|` | `FileManager::load...()` at startup |
| Write | `ofstream` (default mode replaces the file) | `FileManager::save...()` |
| Append | `ofstream` with `ios::app` | `FileManager::appendAttendance()` when marking |
| Update | Change the object in the array, then rewrite the file | After F2, F6, F10 |
| Delete | Remove from the array, then rewrite the file | After F7 |

**Why text files:** they can be opened in Notepad during the demo, and they work directly with `std::string`.

**Why rewrite on update and delete:** a text file has lines of different lengths, so one line cannot be replaced in place. The files are small, so rewriting is simple and fast.

**About `fstream`:** `<fstream>` is the header we include. We use its two specialised classes, `ifstream` and `ofstream`, because each file operation here either reads or writes, never both at once.

## 6. Extra OOP concepts

| Concept | Status | Where |
|---------|--------|-------|
| Inheritance | **Included** | `Person` -> `Student`, `Person` -> `Teacher`. Shared `id`, `name`, and `display()`. |
| Function overloading | **Included** | `searchStudent(int)` and `searchStudent(string)`. `countPresent(code)`, `countPresent()`, and `countPresent(month, year)`. Overloaded constructors. |
| Runtime polymorphism | Comes with inheritance | `display()` is `virtual`. `showPerson(const Person&)` works for both students and teachers. |
| Composition | Comes with the design | `Student` has `AttendanceRecord` objects, and `AttendanceRecord` has a `Date`. |
| Operator overloading | Not used | Not needed. |
| Friend functions | Not used | Getters are enough. |

## 7. Tools and constraints

- **OS:** Windows 11
- **Compiler:** g++ 6.3.0 (MinGW), using `-std=c++11`
- **Build:** one `g++` command (`make` is not installed and is not needed)
- **Libraries:** standard C++ only
- **Containers:** plain arrays with `std::string`. No `vector` or other STL containers.
- **Files:** text format

## 8. Known limitations

Stating these openly in the viva is better than being caught out by them.

1. Passwords are stored as plain text, and are visible while typing. A real system would store a hash.
2. Arrays have fixed limits: 100 students, 20 subjects, 10 teachers, and 300 attendance records per student.
3. Only one lecture per subject per date can be recorded.
4. A student added later will not have attendance for sessions marked before they joined.
5. A class label typed differently (`AIML-A` and `AIML A`) counts as a different class.
6. If a line in a data file is damaged, it is skipped with a warning, and will be lost the next time that file is rewritten.
7. The program must be run from the project folder, because data paths are relative (`data/students.txt`).

## 9. Possible future improvements

Password hashing, a database instead of text files, exporting reports to CSV, a GUI, dynamic arrays or `vector` to remove the size limits, and a separate class list.
