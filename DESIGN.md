# DESIGN: Attendance Management System

This document says exactly how the program is built. [PLAN.md](PLAN.md) explains what and why.

Access specifier symbols: `-` private, `#` protected, `+` public. "static" marks static members.

---

## 1. Limits (`include/Config.h`)

| Constant | Value | Meaning |
|----------|-------|---------|
| `MAX_STUDENTS` | 100 | Size of the student array |
| `MAX_SUBJECTS` | 20 | Size of the subject array |
| `MAX_TEACHERS` | 10 | Size of the teacher array |
| `MAX_RECORDS` | 300 | Attendance records each student can hold |

---

## 2. Classes

### 2.1 `Date`

Stores and checks a calendar date.

| Access | Member | Purpose |
|--------|--------|---------|
| - | `int day, month, year` | The date |
| + | `Date()` | Default date 01-01-2000 |
| + | `Date(int d, int m, int y)` | Sets the date |
| + | `getDay()`, `getMonth()`, `getYear()` | Getters |
| + | `bool isValid() const` | Checks the range, days in the month, and leap years |
| + | `string toString() const` | Returns `DD-MM-YYYY` |
| + | `bool equals(const Date&) const` | Same date? |
| + | `bool isAfter(const Date&) const` | Later than the other date? |
| + | `bool isInMonth(int m, int y) const` | In this month and year? |
| + static | `Date today()` | Today's date, using `<ctime>` |
| + static | `bool isLeapYear(int y)` | Leap year check |
| + static | `bool parse(const string&, Date&)` | Converts `DD-MM-YYYY` text to a `Date`. Returns false if invalid. |

### 2.2 `AttendanceRecord`

One mark: one student's status in one subject on one date.

| Access | Member | Purpose |
|--------|--------|---------|
| - | `string subjectCode` | For example `CS201A` |
| - | `Date date` | The date of the class |
| - | `char status` | `P` or `A` |
| + | `AttendanceRecord()` | Default constructor, needed for the array |
| + | `AttendanceRecord(code, date, status)` | Parameterised constructor |
| + | `getSubjectCode()`, `getDate()`, `getStatus()` | Getters |
| + | `void setStatus(char)` | Used when correcting a mark |
| + | `bool isPresent() const` | True if status is `P` |
| + | `bool matches(code, date) const` | Is this the record for that subject and date? |

### 2.3 `Person` (base class)

| Access | Member | Purpose |
|--------|--------|---------|
| # | `int id` | Roll number for a student, ID for a teacher |
| # | `string name` | Full name |
| + | `Person()`, `Person(int, const string&)` | Constructors |
| + | `virtual ~Person()` | Virtual destructor, standard for a base class |
| + | `getId()`, `getName()`, `setName()` | Accessors |
| + | `virtual void display() const` | Prints details. Overridden by derived classes. |

### 2.4 `Student : public Person`

| Access | Member | Purpose |
|--------|--------|---------|
| - | `string className` | For example `AIML-A` |
| - | `AttendanceRecord records[MAX_RECORDS]` | This student's attendance array |
| - | `int recordCount` | Slots of `records` in use |
| - static | `int totalStudents` | Number of real students, and the used size of the array |
| - static | `int nextRollNo` | Next roll number, starts at 101 |
| + static | `const int DEFAULTER_LIMIT = 75` | Minimum required percentage |
| + | `Student()`, `Student(roll, name, className)` | Constructors |
| + | `getRollNo()`, `getClassName()`, `setClassName()` | Accessors |
| + | `void display() const override` | Prints roll number, name, class |
| + | `bool addRecord(const AttendanceRecord&)` | Adds a mark. False if the array is full. |
| + | `bool hasRecord(code, date) const` | Already marked? |
| + | `bool updateRecord(code, date, newStatus)` | Corrects a mark. False if not found. |
| + | `getRecordCount()`, `getRecord(int) const` | Read access for saving to file |
| + | `int countTotal(code) const`, `int countPresent(code) const` | Counts for one subject |
| + | `int countTotal() const`, `int countPresent() const` | Overloads: all subjects |
| + | `int countTotal(m, y) const`, `int countPresent(m, y) const` | Overloads: one month |
| + | `double getPercentage(code) const`, `double getPercentage() const` | Overloads: subject, overall |
| + | `string toFileLine() const` | Returns `roll\|name\|class` |
| + static | `int getTotalStudents()` | Reads the count |
| + static | `int generateRollNo()` | Returns `nextRollNo++` |
| + static | `void studentAdded()`, `void studentRemoved()` | Changes the count |
| + static | `void noteLoadedRollNo(int)` | While loading, keeps `nextRollNo` above the highest roll number found |
| + static | `double calcPercentage(int present, int total)` | `present * 100.0 / total`, or 0 if `total` is 0 |

### 2.5 `Teacher : public Person`

| Access | Member | Purpose |
|--------|--------|---------|
| - | `string username, password` | Login details |
| - static | `int totalTeachers` | Used size of the teacher array |
| - static | `int nextId` | Next teacher ID, starts at 1 |
| + | `Teacher()`, `Teacher(id, name, username, password)` | Constructors |
| + | `getUsername()`, `setPassword()` | Accessors. There is deliberately no `getPassword()`; `toFileLine()` is the only way the password leaves the object. |
| + | `bool checkLogin(user, pass) const` | Compares credentials |
| + | `bool isAdmin() const` | True if username is `admin` |
| + | `void display() const override` | Prints ID, name, username. Never the password. |
| + | `string toFileLine() const` | Returns `id\|name\|username\|password` |
| + static | `getTotalTeachers()`, `generateId()`, `teacherAdded()`, `noteLoadedId(int)` | Same pattern as `Student` |

### 2.6 `Subject`

| Access | Member | Purpose |
|--------|--------|---------|
| - | `string code, name, className` | For example `CS201A`, `OOPs using C++`, `AIML-A` |
| - static | `int totalSubjects` | Used size of the subject array |
| + | `Subject()`, `Subject(code, name, className)` | Constructors |
| + | `getCode()`, `getName()`, `getClassName()` | Getters |
| + | `void display() const` | Prints one row |
| + | `string toFileLine() const` | Returns `code\|name\|class` |
| + static | `getTotalSubjects()`, `subjectAdded()` | Count handling |

### 2.7 `FileManager` (all static)

All file reading and writing lives here, so a format change touches one class only.

| Access | Member | Purpose |
|--------|--------|---------|
| - static | `int splitLine(line, fields[], maxFields)` | Splits a line on `\|`, returns the number of parts |
| + static | `void loadTeachers(Teacher[])` | Reads `teachers.txt`, creates the default admin if there is none |
| + static | `void loadSubjects(Subject[])` | Reads `subjects.txt` |
| + static | `void loadStudents(Student[])` | Reads `students.txt` |
| + static | `void loadAttendance(Student[], const Subject[])` | Reads `attendance.txt` into each student's array |
| + static | `bool saveTeachers(const Teacher[])` | Rewrites the file |
| + static | `bool saveSubjects(const Subject[])` | Rewrites the file |
| + static | `bool saveStudents(const Student[])` | Rewrites the file |
| + static | `bool saveAttendance(const Student[])` | Rewrites the file |
| + static | `bool appendAttendance(int roll, const AttendanceRecord&)` | Adds one line with `ios::app` |

### 2.8 `Report` (all static)

Read-only printing. Reports never change data.

| Access | Member | Purpose |
|--------|--------|---------|
| + static | `void studentReport(const Student&, const Subject[])` | Per-subject table and overall percentage (F11) |
| + static | `void defaulterList(const Student[], const Subject[])` | F12 |
| + static | `void dailyReport(const Student[], const Subject[], const Date&)` | F13 |
| + static | `void monthlyReport(const Student[], const string& className, int m, int y)` | F14 |

### 2.9 `AttendanceSystem` (main controller)

Owns the arrays and carries out each menu action. It asks for input, validates it, updates the arrays, and calls `FileManager` to save.

| Access | Member | Purpose |
|--------|--------|---------|
| - | `Student students[MAX_STUDENTS]` | All students |
| - | `Subject subjects[MAX_SUBJECTS]` | All subjects |
| - | `Teacher teachers[MAX_TEACHERS]` | All teachers |
| - | `int currentTeacher` | Array index of the logged-in teacher, -1 if none |
| - | `int findStudent(int roll) const` | Returns the index, or -1 |
| - | `int findSubject(const string&) const` | Returns the index, or -1 |
| - | `int findTeacher(const string&) const` | Returns the index, or -1 |
| - | `void showPerson(const Person&) const` | Prints a heading, then calls virtual `display()` |
| + | `AttendanceSystem()` | Loads all files |
| + | `~AttendanceSystem()` | Prints a closing message |
| + | `bool login()` | F1 |
| + | `bool isAdminLoggedIn() const` | Controls the admin menu options |
| + | `changePassword()`, `addTeacher()`, `viewTeachers()` | F2 |
| + | `addStudent()`, `viewAllStudents()`, `updateStudent()`, `deleteStudent()` | F3, F4, F6, F7 |
| + | `searchStudent(int)`, `searchStudent(const string&)` | F5, overloaded |
| + | `addSubject()`, `viewSubjects()` | F8 |
| + | `markAttendance()`, `editAttendance()`, `viewStudentAttendance()` | F9, F10, F11 |
| + | `showDefaulters()`, `showDailyReport()`, `showMonthlyReport()` | F12, F13, F14 |

### 2.10 `Utils` (plain functions, not a class)

Shared input and validation helpers.

| Function | Purpose |
|----------|---------|
| `string readLine(prompt)` | Prints the prompt, reads a whole line, trims spaces |
| `int readInt(prompt)` | Repeats until a valid whole number is entered |
| `int readIntInRange(prompt, min, max)` | Repeats until the number is in range |
| `bool readYesNo(prompt)` | Accepts Y or N |
| `Date readDate(prompt)` | Repeats until valid and not in the future. Enter means today. |
| `string trim(text)`, `string toUpper(text)` | Text cleaning |
| `bool parseInt(text, int&)` | Safe text-to-number. Returns false instead of crashing. |
| `bool isValidName(text)`, `isValidCode(text)`, `isValidClassName(text)`, `isValidUsername(text)`, `isValidPassword(text)` | Rules from section 8 |

---

## 3. Class relationships

```
                        +----------------------------+
                        |           Person           |
                        |----------------------------|
                        | # id : int                 |
                        | # name : string            |
                        |----------------------------|
                        | + display() : virtual      |
                        +-------------^--------------+
                                      |  is-a (public inheritance)
                 +--------------------+--------------------+
                 |                                         |
   +-------------+---------------+           +-------------+-------------+
   |           Student           |           |          Teacher          |
   |-----------------------------|           |---------------------------|
   | - className                 |           | - username, password      |
   | - records[MAX_RECORDS]      |           | - static totalTeachers    |
   | - recordCount               |           | - static nextId           |
   | - static totalStudents      |           |---------------------------|
   | - static nextRollNo         |           | + checkLogin()            |
   |-----------------------------|           | + display()               |
   | + getPercentage()           |           +-------------^-------------+
   | + display()                 |                         |
   +----^-------------------+----+                         |
        |                   |                              |
        |                   | has-a (0..300)               |
        |                   v                              |
        |      +------------+-----------+                  |
        |      |    AttendanceRecord    |                  |
        |      |------------------------|                  |
        |      | - subjectCode, status  |                  |
        |      +------------+-----------+                  |
        |                   | has-a (1)                    |
        |                   v                              |
        |            +------+------+                       |
        |            |    Date     |                       |
        |            +-------------+                       |
        |                                                  |
        | has-a (0..100)                     has-a (0..10) |
   +----+--------------------------------------------------+-----+
   |                      AttendanceSystem                       |
   |-------------------------------------------------------------|
   | - students[MAX_STUDENTS]                                    |
   | - subjects[MAX_SUBJECTS] ----- has-a (0..20) ---> Subject   |
   | - teachers[MAX_TEACHERS]                                    |
   +-------+-----------------------------------------+-----------+
           | uses (static calls)                     | uses (static calls)
           v                                         v
   +---------------+                         +---------------+
   |  FileManager  |                         |    Report     |
   +---------------+                         +---------------+

   main.cpp -> creates AttendanceSystem, shows the menus, calls its functions
```

| Relationship | Meaning | Example |
|--------------|---------|---------|
| is-a | Inheritance | A `Student` is a `Person` |
| has-a | Composition | A `Student` has `AttendanceRecord` objects |
| uses | Calls functions, stores nothing | `AttendanceSystem` uses `FileManager` |

---

## 4. Memory note

Each `Student` carries its own 300-record array, so one object is about 12 KB and all 100 students are about **1.2 MB** (measured with a mock-up of this layout on g++ 6.3). Two rules follow:

1. `main()` declares `static AttendanceSystem app;`, so this data lives in static storage and not on the limited stack. A plain local variable did still run in testing, but it would use a large share of the stack and could overflow if the limits were raised.
2. Pass `Student` by `const` reference, never by value, to avoid copying 12 KB per call.

---

## 5. File formats

All files are in `data/`. They are plain text, with one record per line and fields separated by `|`. There is no header line. Blank lines are ignored.

`|` is the separator because it never appears in a normal name, while a comma or space can. Input containing `|` is rejected, so it can never break the format.

### `data/students.txt`

```
rollNo|name|className
101|Aarav Sharma|AIML-A
102|Diya Verma|AIML-A
```

### `data/subjects.txt`

```
code|name|className
CS201A|OOPs using C++|AIML-A
MA201A|Mathematics III|AIML-A
```

### `data/teachers.txt`

```
id|name|username|password
1|Administrator|admin|admin123
2|Neha Kapoor|teacher1|pass123
```

### `data/attendance.txt`

One line per student, per subject, per date. Status is `P` or `A`.

```
rollNo|subjectCode|DD-MM-YYYY|status
101|CS201A|26-10-2026|P
102|CS201A|26-10-2026|A
```

### Load order

The order matters: `teachers` -> `subjects` -> `students` -> `attendance`. Attendance must come last, because each line is attached to a student who must already be loaded and is checked against the subject list.

### Save policy

| Action | File operation |
|--------|----------------|
| Add, update, or delete a student | Rewrite `students.txt` |
| Delete a student | Also rewrite `attendance.txt` |
| Add a subject | Rewrite `subjects.txt` |
| Add a teacher or change a password | Rewrite `teachers.txt` |
| Mark attendance | Append to `attendance.txt` |
| Correct a mark | Rewrite `attendance.txt` |

Changes are saved immediately, so closing the window loses nothing.

### Sample data (created while building)

10 fictional students (`AIML-A`: 101 to 106, `AIML-B`: 107 to 110), 4 subjects (2 per class), 2 teachers, and 6 days of attendance across late October and early November 2026, so the monthly report shows different results for each month. In each class, one subject meets on all 6 days and the other on 4 of them, as real timetables do. This lets the data include 5 of 6 (83.33%), a student at exactly 3 of 4 (75.00%, not a defaulter), and at least two students below 75%, so the defaulter list has output in the demo.

---

## 6. Menu flow

```
                     START
                       |
                       v
          AttendanceSystem() loads files
                       |
                       v
                 +-----------+   3 failed attempts
                 |   LOGIN   |----------------------> EXIT
                 +-----+-----+
                       | success
                       v
   +---------------------------------------------+
   |                 MAIN MENU                   |
   |  1. Student Management                      |
   |  2. Subject Management                      |
   |  3. Attendance                              |
   |  4. Reports                                 |
   |  5. Account                                 |
   |  0. Exit                                    |
   +---------------------------------------------+

   1. STUDENT MANAGEMENT        2. SUBJECT MANAGEMENT
      1. Add student               1. Add subject
      2. View all students         2. View subjects
      3. Search by roll no         0. Back
      4. Search by name
      5. Update student         3. ATTENDANCE
      6. Delete student            1. Mark attendance
      0. Back                      2. Correct a mark
                                   3. View student attendance
   4. REPORTS                      0. Back
      1. Defaulter list
      2. Daily report           5. ACCOUNT
      3. Monthly report            1. Change my password
      0. Back                      2. Add teacher    (admin only)
                                   3. View teachers  (admin only)
                                   0. Back
```

### Mark attendance flow

```
Enter subject code ---- not found ----> show error, return
        |
Enter date (Enter = today) ---- invalid or future ----> ask again
        |
Any student in that class? ---- no ----> show message, return
        |
Already marked for this subject and date? ---- yes ----> show message, return
        |
Any student's records array full? ---- yes ----> show message, return
        |
For each student in the class: ask P or A, store in marks[]
        |
All answers collected: add a record to each student, append to file
        |
Show summary: present count, absent count
```

Answers are held in `marks[]` first, so an interrupted session leaves no half-marked data.

---

## 7. Folder structure

```
OOPS-PBL/
|-- main.cpp                  Program entry and menus
|-- include/
|   |-- Config.h              Array size limits
|   |-- Utils.h
|   |-- Date.h
|   |-- AttendanceRecord.h
|   |-- Person.h
|   |-- Student.h
|   |-- Teacher.h
|   |-- Subject.h
|   |-- FileManager.h
|   |-- Report.h
|   `-- AttendanceSystem.h
|-- src/
|   |-- Utils.cpp
|   |-- Date.cpp
|   |-- AttendanceRecord.cpp
|   |-- Person.cpp
|   |-- Student.cpp
|   |-- Teacher.cpp
|   |-- Subject.cpp
|   |-- FileManager.cpp
|   |-- Report.cpp
|   `-- AttendanceSystem.cpp
|-- data/
|   |-- students.txt
|   |-- subjects.txt
|   |-- teachers.txt
|   `-- attendance.txt
|-- .gitignore                Ignores attendance.exe and object files
|-- README.md
|-- PLAN.md
|-- DESIGN.md
|-- TASKS.md
`-- VIVA.md
```

**Build and run** (from the project folder, tested in PowerShell with this compiler):

```
g++ -std=c++11 -Wall -Wextra -Iinclude main.cpp src/*.cpp -o attendance.exe
.\attendance.exe
```

---

## 8. Input validation and error handling

### Input rules

All input is read with `getline()`, never with `cin >>`. This avoids the problem of a leftover newline skipping the next prompt. If input ends unexpectedly, the program exits cleanly instead of looping forever.

| Field | Rule |
|-------|------|
| Menu choice | Whole number in the menu's range. Letters are rejected without crashing. |
| Student or teacher name | 1 to 40 characters. Only letters, spaces, `.`, `'`, and `-`. |
| Class name | 1 to 15 characters. Letters, digits, `-`. Converted to uppercase. |
| Subject code | 1 to 10 characters. Letters and digits only. Converted to uppercase. |
| Subject name | 1 to 40 characters. Must not contain `\|`. |
| Roll number | Must belong to an existing student. |
| Date | `DD-MM-YYYY`, a real calendar date (30-02 and 29-02 in non-leap years are rejected), year 2000 or later, and not in the future. |
| Attendance status | `P` or `A`, either case. |
| Month and year | Month 1 to 12. Year 2000 or later. |
| Username | 3 to 20 letters or digits. |
| Password | 4 to 20 characters, no spaces or `\|`. |

### Error cases

| Situation | What the program does |
|-----------|-----------------------|
| Roll number not found | "Student not found", return to the menu |
| Subject code not found | "Subject not found", return to the menu |
| Duplicate subject code | Rejected |
| Duplicate username | Rejected |
| Same name in the same class | Warning, then asks Y/N, because two students may really share a name |
| Attendance already marked (subject + date) | Rejected. The user is told to use "Correct a mark". |
| Correcting a mark that does not exist | "No attendance record found" |
| Changing the class of a student with attendance | Rejected |
| Student, subject, or teacher array full | "Limit reached", nothing added |
| Student's record array full | Session refused before any marks are stored |
| Report with no matching data | "No records found" |
| Percentage with zero classes | Shows "No classes yet". Never divides by zero. |
| Non-admin chooses an admin option | Option is not shown, and is rejected if chosen |
| 3 failed logins | "Too many attempts", program closes |

### File errors

| Situation | What the program does |
|-----------|-----------------------|
| Data file missing | Treated as empty, no crash. The file is created on the next save. |
| `teachers.txt` missing or empty | Creates `admin` / `admin123` and tells the user |
| Damaged line (wrong field count, bad number or date) | Skipped, with a warning naming the file and line number |
| Duplicate roll number while loading | Second line skipped with a warning |
| Attendance line for an unknown student or subject | Skipped with a warning |
| Duplicate attendance line (same roll, subject, date) | Skipped with a warning |
| More records in the file than the array holds | Extra lines skipped with a warning |
| File cannot be opened for saving (for example `data/` is missing) | Error message. The program keeps running. |
