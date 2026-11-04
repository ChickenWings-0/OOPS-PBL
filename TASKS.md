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

**Test:** create `Student arr[5]` and confirm `Student::getCount()` is still 0. Generate two internal IDs and confirm they are 1 and 2. Store the roll number `00618015625` and confirm it reads back unchanged.

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
- [x] **T19** Add a roll number that already exists: rejected. Add `00618015625`: the leading zeros are kept in the file. Correct a student's roll number: their attendance stays attached.

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
