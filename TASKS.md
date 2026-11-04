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

| Member | Enrollment No. | Module | Files | Main concepts |
|--------|----------------|--------|-------|---------------|
| Aksh Rastogi | 02518015625 | Core system, login, menus | `main.cpp`, `AttendanceSystem` (constructor, destructor, `login`, `changePassword`, `addTeacher`, `viewTeachers`, `showPerson`), `Teacher`, `Config.h` | Classes, composition, runtime polymorphism |
| Vaibhav | 01118015625 | Students | `Person`, `Student`, `AttendanceSystem` (`addStudent`, `viewAllStudents`, `searchStudent` x2, `updateStudent`, `deleteStudent`) | Inheritance, static members, overloading, arrays of objects |
| Akshay Kumar | 00618015625 | Subjects and attendance marking | `Date`, `AttendanceRecord`, `Subject`, `AttendanceSystem` (`addSubject`, `viewSubjects`, `markAttendance`, `editAttendance`) | Encapsulation, attendance array, date validation |
| Srishti Gupta | 06618015625 | File handling and validation | `FileManager`, `Utils`, sample data in `data/` | File handling, parsing, input validation |
| Dhruv Kataria | 05118015625 | Reports and testing | `Report`, `AttendanceSystem` (`viewStudentAttendance`, `showDefaulters`, `showDailyReport`, `showMonthlyReport`), `README.md`, testing checklist | Percentage logic, arrays as parameters, static functions |

---

## 2. Build checkpoints

### Checkpoint 0: Project setup
**Owner:** Aksh Rastogi

- [ ] Create `include/`, `src/`, `data/`, and `.gitignore`
- [ ] Create `include/Config.h` with the array limits
- [ ] Create a temporary `main.cpp` that prints the project title

**Test:** builds with the command in DESIGN.md and prints the title.

### Checkpoint 1: Utils and Date
**Owners:** Srishti Gupta (`Utils`), Akshay Kumar (`Date`)

- [ ] `Utils`: `readLine`, `readInt`, `readIntInRange`, `readYesNo`, `trim`, `toUpper`, `parseInt`
- [ ] `Utils`: the `isValid...` functions
- [ ] `Date`: constructors, `isValid`, `isLeapYear`, `toString`, `equals`, `isAfter`, `isInMonth`, `parse`, `today`
- [ ] `Utils`: `readDate`

**Test:** temporary `main.cpp` checks that `29-02-2024` is valid, `29-02-2026` and `31-04-2026` are invalid, and `abc` is rejected.

### Checkpoint 2: Person, Student, Teacher
**Owners:** Vaibhav (`Person`, `Student`), Aksh Rastogi (`Teacher`)

- [ ] `Person`: constructors, accessors, virtual `display`
- [ ] `Student` basics: constructors, accessors, `display`, `toFileLine`
- [ ] `Student` statics: counters, `generateRollNo`, `calcPercentage`
- [ ] `Teacher`: constructors, `checkLogin`, `isAdmin`, `display`, statics

**Test:** create `Student arr[5]` and confirm `getTotalStudents()` is still 0. Generate two roll numbers and confirm they are 101 and 102.

### Checkpoint 3: Subject, AttendanceRecord, attendance array
**Owners:** Akshay Kumar (`Subject`, `AttendanceRecord`), Vaibhav (`Student` attendance functions)

- [ ] `AttendanceRecord` class
- [ ] `Subject` class with its static counter
- [ ] `Student`: `addRecord`, `hasRecord`, `updateRecord`
- [ ] `Student`: `countTotal`, `countPresent`, `getPercentage` and their overloads

**Test:** add 4 marks with 3 present to a student and confirm `getPercentage` gives 75.00. Confirm `calcPercentage(0, 0)` gives 0.

### Checkpoint 4: File handling and sample data
**Owner:** Srishti Gupta

- [ ] `splitLine`
- [ ] Load functions for all 4 files, including the warnings from DESIGN.md
- [ ] Save functions for all 4 files, and `appendAttendance`
- [ ] Sample data files: 10 students, 4 subjects, 2 teachers, 6 days of attendance

**Test:** load everything and print the counts (10 students, 4 subjects, 2 teachers). Save, then confirm the files are unchanged. Temporarily rename a file and confirm there is no crash.

### Checkpoint 5: System skeleton, login, and menus
**Owner:** Aksh Rastogi

- [ ] `AttendanceSystem` constructor, destructor, and `find...` helpers
- [ ] `login` with 3 attempts
- [ ] Final `main.cpp` with all menus, using `static AttendanceSystem app;`
- [ ] Stubs for options not built yet ("Coming soon")

**Test:** correct login reaches the main menu. Three wrong attempts close the program. Every menu and Back option works.

### Checkpoint 6: Student management
**Owner:** Vaibhav

- [ ] `addStudent`, including the same-name warning
- [ ] `viewAllStudents`
- [ ] `searchStudent(int)` and `searchStudent(string)`
- [ ] `updateStudent`, including the class-change rule
- [ ] `deleteStudent`, including the array shift and saving both files

**Test:** T10 to T18 in the checklist below.

### Checkpoint 7: Subjects and attendance marking
**Owner:** Akshay Kumar

- [ ] `addSubject`, `viewSubjects`
- [ ] `markAttendance`, following the flow in DESIGN.md
- [ ] `editAttendance`

**Test:** T20 to T29.

### Checkpoint 8: Reports
**Owner:** Dhruv Kataria

- [ ] `studentReport` and `viewStudentAttendance`
- [ ] `defaulterList` and `showDefaulters`
- [ ] `dailyReport` and `showDailyReport`
- [ ] `monthlyReport` and `showMonthlyReport`

**Test:** T30 to T37, checking the percentages by hand against `attendance.txt`.

### Checkpoint 9: Account management
**Owner:** Aksh Rastogi

- [ ] `changePassword`
- [ ] `addTeacher`, `viewTeachers`, and `showPerson`
- [ ] Show admin options to `admin` only

**Test:** T40 to T44.

### Checkpoint 10: Final testing and documentation
**Owners:** Dhruv Kataria (`README.md`, full test run), all members (review)

- [ ] Run the complete testing checklist below
- [ ] Reset `data/` to the clean sample data
- [ ] Write `README.md`: description, features, exact build and run commands, sample output, concepts used
- [ ] Clean build from scratch with no warnings
- [ ] Confirm VIVA.md matches the final code

---

## 3. Testing checklist

Sample logins: `admin` / `admin123` and `teacher1` / `pass123`.

### Startup and login

- [ ] **T01** Correct login (`admin`, `admin123`): main menu appears
- [ ] **T02** Wrong password three times: "Too many attempts", program closes
- [ ] **T03** Teacher login (`teacher1`): works, and admin options are hidden
- [ ] **T04** Letters at a menu (`abc`): error message, no crash
- [ ] **T05** Out-of-range menu choice (`99`): error message, menu repeats
- [ ] **T06** Delete `teachers.txt` and run: default admin is created and login works

### Students

- [ ] **T10** Add a student: roll number is one above the highest, and the line appears in `students.txt`
- [ ] **T11** Add with an empty name, or with `|` in the name: rejected
- [ ] **T12** Add the same name in the same class: warning, Y/N asked
- [ ] **T13** View all: table and total count are correct
- [ ] **T14** Search roll `101`: found. Search roll `999`: "Student not found"
- [ ] **T15** Search name `sha` (lowercase, partial): all matching students shown
- [ ] **T16** Update the name of a student, press Enter for class: name changes, class stays
- [ ] **T17** Change the class of a student who has attendance: rejected
- [ ] **T18** Delete a student and answer Y: student is gone from both `students.txt` and `attendance.txt`, and the count drops by 1. Answering N changes nothing.

### Subjects and attendance

- [ ] **T20** Add a new subject: it appears in the list and in `subjects.txt`
- [ ] **T21** Add a duplicate code, including in lowercase (`cs201a`): rejected
- [ ] **T22** Mark attendance for a new date: only that class's students are listed, and lines are added to `attendance.txt`
- [ ] **T23** Mark the same subject and date again: rejected
- [ ] **T24** Enter `x` as a status: asked again. Lowercase `p` is accepted.
- [ ] **T25** Date `30-02-2026`: rejected
- [ ] **T26** A future date: rejected
- [ ] **T27** Press Enter at the date prompt: today's date is used
- [ ] **T28** Unknown subject code: "Subject not found"
- [ ] **T29** Correct a mark from A to P: the student's percentage goes up and the file line changes. Correcting a mark that does not exist gives "No attendance record found".

### Reports

- [ ] **T30** Student attendance: per-subject numbers match a hand count from `attendance.txt`
- [ ] **T31** 5 of 6 present shows 83.33%
- [ ] **T32** Student with no marks: "No classes yet", no crash
- [ ] **T33** Defaulter list: students below 75% are listed
- [ ] **T34** Sample student at exactly 3 of 4 (75.00%) in a subject: **not** listed as a defaulter for that subject
- [ ] **T35** Daily report on a date with data: correct present and absent lists
- [ ] **T36** Daily report on a date with no data: "No records found"
- [ ] **T37** Monthly report: October and November 2026 give different, correct numbers

### Account

- [ ] **T40** Change password, restart, log in with the new password: works
- [ ] **T41** Password with a space, or shorter than 4 characters: rejected
- [ ] **T42** Admin adds a teacher: the new teacher can log in
- [ ] **T43** Add a duplicate username: rejected
- [ ] **T44** View teachers: passwords are not shown

### Persistence and file errors

- [ ] **T50** Add a student, mark attendance, exit, restart: all data is still there
- [ ] **T51** Add a student after restart: roll number continues correctly, no duplicate
- [ ] **T52** Delete `attendance.txt`: program starts, all students show "No classes yet"
- [ ] **T53** Add a damaged line to `students.txt`: warning with the line number, other students load
- [ ] **T54** Add an attendance line for roll `999`: skipped with a warning
- [ ] **T55** Close the window straight after a change, without using Exit: the change is saved

---

## 4. Demo order for the viva (about 5 minutes)

1. Build with the `g++` command and run.
2. Log in as `admin`.
3. View students, then add one (point out the automatic roll number).
4. Search by name, then by roll number.
5. Mark attendance for today.
6. View one student's attendance.
7. Show the defaulter list.
8. Show the monthly report for October, then November.
9. Exit, open `data/attendance.txt` in Notepad, and show the new lines.
10. Restart and show that the data is still there.
