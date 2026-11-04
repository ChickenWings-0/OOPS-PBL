// AttendanceSystem.cpp
// Implementation of the AttendanceSystem class.

#include "AttendanceSystem.h"

#include <iomanip>
#include <iostream>

#include "FileManager.h"
#include "Report.h"
#include "Utils.h"

using namespace std;

// ---------- Start and finish ----------

// Loads all data. Attendance must come last, because each mark
// is attached to a student who must already be in memory.
AttendanceSystem::AttendanceSystem() : currentTeacher(-1) {
    FileManager::loadTeachers(teachers);
    FileManager::loadSubjects(subjects);
    FileManager::loadStudents(students);
    FileManager::loadAttendance(students, subjects);
}

// No memory to free, because nothing here uses new. Changes are already saved.
AttendanceSystem::~AttendanceSystem() {
    cout << "All data is saved. Goodbye!" << endl;
}

// ---------- Search helpers ----------

// Finds a student by internal ID. Returns the array index, or -1.
int AttendanceSystem::findStudent(int id) const {
    for (int i = 0; i < Student::getCount(); i++) {
        if (students[i].getId() == id) {
            return i;
        }
    }
    return -1;
}

// Overload: finds a student by roll number. Returns the array index, or -1.
int AttendanceSystem::findStudent(const string& rollNo) const {
    for (int i = 0; i < Student::getCount(); i++) {
        if (students[i].getRollNo() == rollNo) {
            return i;
        }
    }
    return -1;
}

// Finds a subject by code. Returns the array index, or -1.
int AttendanceSystem::findSubject(const string& code) const {
    for (int i = 0; i < Subject::getCount(); i++) {
        if (subjects[i].getCode() == code) {
            return i;
        }
    }
    return -1;
}

// Finds a teacher by username. Returns the array index, or -1.
int AttendanceSystem::findTeacher(const string& username) const {
    for (int i = 0; i < Teacher::getCount(); i++) {
        if (teachers[i].getUsername() == username) {
            return i;
        }
    }
    return -1;
}

// Prints one row for any Person. Because display() is virtual, the Student
// or Teacher version runs, depending on the real object passed in.
void AttendanceSystem::showPerson(const Person& person) const {
    person.display();
}

// ---------- Login and accounts ----------

// Allows three attempts. Returns true when a login succeeds.
bool AttendanceSystem::login() {
    const int MAX_ATTEMPTS = 3;

    for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        string username = readLine("Username: ");
        string password = readLine("Password: ");

        for (int i = 0; i < Teacher::getCount(); i++) {
            if (teachers[i].checkLogin(username, password)) {
                currentTeacher = i;
                cout << "\nWelcome, " << teachers[i].getName() << "!" << endl;
                return true;
            }
        }
        cout << "Wrong username or password. Attempts left: "
             << MAX_ATTEMPTS - attempt << endl;
    }

    cout << "Too many attempts. Closing the program." << endl;
    return false;
}

// Returns true if the logged-in user is the admin.
bool AttendanceSystem::isAdminLoggedIn() const {
    return currentTeacher != -1 && teachers[currentTeacher].isAdmin();
}

// Changes the logged-in user's password after checking the current one.
void AttendanceSystem::changePassword() {
    Teacher& teacher = teachers[currentTeacher];

    string current = readLine("Current password: ");
    if (!teacher.checkLogin(teacher.getUsername(), current)) {
        cout << "Wrong password." << endl;
        return;
    }

    string newPassword = readLine("New password: ");
    if (!isValidPassword(newPassword)) {
        cout << "Invalid password. Use 4 to 20 characters, with no spaces or |" << endl;
        return;
    }

    teacher.setPassword(newPassword);
    if (FileManager::saveTeachers(teachers)) {
        cout << "Password changed." << endl;
    }
}

// Adds a new teacher account. Admin only.
void AttendanceSystem::addTeacher() {
    if (!isAdminLoggedIn()) {
        cout << "Only the admin can add teachers." << endl;
        return;
    }
    if (Teacher::getCount() >= MAX_TEACHERS) {
        cout << "Limit reached. Cannot add more teachers." << endl;
        return;
    }

    string name = readLine("Teacher name: ");
    if (!isValidName(name)) {
        cout << "Invalid name. Use 1 to 40 letters, spaces, . ' or -" << endl;
        return;
    }

    string username = readLine("Username: ");
    if (!isValidUsername(username)) {
        cout << "Invalid username. Use 3 to 20 letters or digits." << endl;
        return;
    }
    if (findTeacher(username) != -1) {
        cout << "This username already exists." << endl;
        return;
    }

    string password = readLine("Password: ");
    if (!isValidPassword(password)) {
        cout << "Invalid password. Use 4 to 20 characters, with no spaces or |" << endl;
        return;
    }

    teachers[Teacher::getCount()] = Teacher(Teacher::generateId(), name, username, password);
    Teacher::teacherAdded();

    if (FileManager::saveTeachers(teachers)) {
        cout << "Teacher added." << endl;
    }
}

// Shows every teacher. Admin only. Passwords are never shown.
void AttendanceSystem::viewTeachers() const {
    if (!isAdminLoggedIn()) {
        cout << "Only the admin can view teachers." << endl;
        return;
    }

    cout << left << setw(6) << "ID" << setw(30) << "Name" << "Username" << endl;
    cout << string(50, '-') << endl;
    for (int i = 0; i < Teacher::getCount(); i++) {
        showPerson(teachers[i]);
    }
    cout << "Total teachers: " << Teacher::getCount() << endl;
}

// ---------- Students ----------

// Prints the heading row used by every student table.
static void printStudentHeader() {
    cout << left << setw(6) << "ID" << setw(17) << "Roll No"
         << setw(30) << "Name" << "Class" << endl;
    cout << string(60, '-') << endl;
}

// Adds a new student. The user gives the roll number, name, and class,
// and the program generates the internal ID.
void AttendanceSystem::addStudent() {
    if (Student::getCount() >= MAX_STUDENTS) {
        cout << "Limit reached. Cannot add more students." << endl;
        return;
    }

    string rollNo = toUpper(readLine("Roll/enrollment number: "));
    if (!isValidRollNo(rollNo)) {
        cout << "Invalid roll number. Use 1 to 15 letters or digits." << endl;
        return;
    }
    if (findStudent(rollNo) != -1) {
        cout << "This roll number already exists." << endl;
        return;
    }

    string name = readLine("Name: ");
    if (!isValidName(name)) {
        cout << "Invalid name. Use 1 to 40 letters, spaces, . ' or -" << endl;
        return;
    }

    string className = toUpper(readLine("Class (for example AIML-A): "));
    if (!isValidClassName(className)) {
        cout << "Invalid class. Use 1 to 15 letters, digits, or hyphens." << endl;
        return;
    }

    // Two students may really share a name, so this is a warning, not an error.
    for (int i = 0; i < Student::getCount(); i++) {
        if (toUpper(students[i].getName()) == toUpper(name) &&
            students[i].getClassName() == className) {
            cout << "A student with this name is already in " << className << "." << endl;
            if (!readYesNo("Add anyway? (Y/N): ")) {
                cout << "Student not added." << endl;
                return;
            }
            break;
        }
    }

    int id = Student::generateId();
    students[Student::getCount()] = Student(id, rollNo, name, className);
    Student::studentAdded();

    if (FileManager::saveStudents(students)) {
        cout << "Student added with internal ID " << id << "." << endl;
    }
}

// Shows every student and the total count.
void AttendanceSystem::viewAllStudents() const {
    if (Student::getCount() == 0) {
        cout << "No records found." << endl;
        return;
    }

    printStudentHeader();
    for (int i = 0; i < Student::getCount(); i++) {
        showPerson(students[i]);
    }
    cout << "Total students: " << Student::getCount() << endl;
}

// Searches by internal ID.
void AttendanceSystem::searchStudent(int id) const {
    int index = findStudent(id);
    if (index == -1) {
        cout << "Student not found." << endl;
        return;
    }
    printStudentHeader();
    showPerson(students[index]);
}

// Overload: matches a roll number exactly, or any part of a name.
// Upper and lower case are treated the same.
void AttendanceSystem::searchStudent(const string& text) const {
    if (text.empty()) {
        cout << "Nothing to search for." << endl;
        return;
    }

    string searchText = toUpper(text);
    int matches = 0;

    for (int i = 0; i < Student::getCount(); i++) {
        bool rollMatches = students[i].getRollNo() == searchText;
        bool nameMatches = toUpper(students[i].getName()).find(searchText) != string::npos;

        if (rollMatches || nameMatches) {
            if (matches == 0) {
                printStudentHeader();
            }
            showPerson(students[i]);
            matches++;
        }
    }

    if (matches == 0) {
        cout << "Student not found." << endl;
    }
}

// Changes a student's roll number, name, or class.
// Everything is checked first, so a bad entry changes nothing.
void AttendanceSystem::updateStudent() {
    int index = findStudent(toUpper(readLine("Roll number of the student: ")));
    if (index == -1) {
        cout << "Student not found." << endl;
        return;
    }

    printStudentHeader();
    showPerson(students[index]);
    cout << "Press Enter to keep the current value." << endl;

    string newRollNo = toUpper(readLine("New roll number: "));
    if (newRollNo.empty()) {
        newRollNo = students[index].getRollNo();
    }
    if (!isValidRollNo(newRollNo)) {
        cout << "Invalid roll number. Nothing was changed." << endl;
        return;
    }
    int owner = findStudent(newRollNo);
    if (owner != -1 && owner != index) {
        cout << "This roll number already exists. Nothing was changed." << endl;
        return;
    }

    string newName = readLine("New name: ");
    if (newName.empty()) {
        newName = students[index].getName();
    }
    if (!isValidName(newName)) {
        cout << "Invalid name. Nothing was changed." << endl;
        return;
    }

    string newClass = toUpper(readLine("New class: "));
    if (newClass.empty()) {
        newClass = students[index].getClassName();
    }
    if (!isValidClassName(newClass)) {
        cout << "Invalid class. Nothing was changed." << endl;
        return;
    }
    // Existing marks belong to the old class's subjects.
    if (newClass != students[index].getClassName() && students[index].getRecordCount() > 0) {
        cout << "Cannot change the class of a student who has attendance. "
             << "Nothing was changed." << endl;
        return;
    }

    students[index].setRollNo(newRollNo);
    students[index].setName(newName);
    students[index].setClassName(newClass);

    if (FileManager::saveStudents(students)) {
        cout << "Student updated." << endl;
    }
}

// Deletes a student and their attendance, after asking for confirmation.
void AttendanceSystem::deleteStudent() {
    int index = findStudent(toUpper(readLine("Roll number of the student: ")));
    if (index == -1) {
        cout << "Student not found." << endl;
        return;
    }

    printStudentHeader();
    showPerson(students[index]);
    if (!readYesNo("Delete this student and their attendance? (Y/N): ")) {
        cout << "Nothing was deleted." << endl;
        return;
    }

    // Move every later student one place left to fill the gap.
    int count = Student::getCount();
    for (int i = index; i < count - 1; i++) {
        students[i] = students[i + 1];
    }
    students[count - 1] = Student();   // clear the slot that is now unused
    Student::studentRemoved();

    // Attendance is stored inside each Student, so both files must be rewritten.
    if (FileManager::saveStudents(students) && FileManager::saveAttendance(students)) {
        cout << "Student deleted." << endl;
    }
}

// ---------- Subjects ----------

// Adds a new subject for one class. Subject codes must be unique.
void AttendanceSystem::addSubject() {
    if (Subject::getCount() >= MAX_SUBJECTS) {
        cout << "Limit reached. Cannot add more subjects." << endl;
        return;
    }

    string code = toUpper(readLine("Subject code: "));
    if (!isValidCode(code)) {
        cout << "Invalid code. Use 1 to 10 letters or digits." << endl;
        return;
    }
    if (findSubject(code) != -1) {
        cout << "This subject code already exists." << endl;
        return;
    }

    string name = readLine("Subject name: ");
    if (!isValidSubjectName(name)) {
        cout << "Invalid name. Use 1 to 40 characters, without |" << endl;
        return;
    }

    string className = toUpper(readLine("Class (for example AIML-A): "));
    if (!isValidClassName(className)) {
        cout << "Invalid class. Use 1 to 15 letters, digits, or hyphens." << endl;
        return;
    }

    subjects[Subject::getCount()] = Subject(code, name, className);
    Subject::subjectAdded();

    if (FileManager::saveSubjects(subjects)) {
        cout << "Subject added." << endl;
    }
}

// Shows every subject and the total count.
void AttendanceSystem::viewSubjects() const {
    if (Subject::getCount() == 0) {
        cout << "No records found." << endl;
        return;
    }

    cout << left << setw(12) << "Code" << setw(42) << "Subject" << "Class" << endl;
    cout << string(60, '-') << endl;
    for (int i = 0; i < Subject::getCount(); i++) {
        subjects[i].display();
    }
    cout << "Total subjects: " << Subject::getCount() << endl;
}

// ---------- Attendance ----------

// Marks one subject on one date for every student of that subject's class.
void AttendanceSystem::markAttendance() {
    int subjectIndex = findSubject(toUpper(readLine("Subject code: ")));
    if (subjectIndex == -1) {
        cout << "Subject not found." << endl;
        return;
    }

    string code = subjects[subjectIndex].getCode();
    string className = subjects[subjectIndex].getClassName();
    Date date = readDate("Date (DD-MM-YYYY, Enter for today): ");

    // Check everything first, so nothing is stored if marking cannot finish.
    int classSize = 0;
    for (int i = 0; i < Student::getCount(); i++) {
        if (students[i].getClassName() != className) {
            continue;
        }
        classSize++;

        if (students[i].hasRecord(code, date)) {
            cout << "Attendance for " << code << " on " << date.toString()
                 << " is already marked. Use Correct a mark to change it." << endl;
            return;
        }
        if (students[i].getRecordCount() >= MAX_RECORDS) {
            cout << "Limit reached for " << students[i].getName()
                 << ". Attendance was not marked." << endl;
            return;
        }
    }
    if (classSize == 0) {
        cout << "No students found in class " << className << "." << endl;
        return;
    }

    // Collect every answer first. A session is stored only once it is complete.
    cout << "Marking " << code << " for " << className
         << " on " << date.toString() << endl;
    char marks[MAX_STUDENTS];
    for (int i = 0; i < Student::getCount(); i++) {
        if (students[i].getClassName() == className) {
            marks[i] = readStatus(students[i].getRollNo() + "  " +
                                  students[i].getName() + " (P/A): ");
        }
    }

    // All answers are in, so add a record to each student and save it.
    int presentCount = 0;
    bool saved = true;
    for (int i = 0; i < Student::getCount(); i++) {
        if (students[i].getClassName() != className) {
            continue;
        }

        AttendanceRecord record(code, date, marks[i]);
        students[i].addRecord(record);
        if (!FileManager::appendAttendance(students[i].getId(), record)) {
            saved = false;
        }
        if (record.isPresent()) {
            presentCount++;
        }
    }

    if (saved) {
        cout << "Attendance saved. Present: " << presentCount
             << ", Absent: " << classSize - presentCount << endl;
    }
}

// Corrects one existing mark.
void AttendanceSystem::editAttendance() {
    int studentIndex = findStudent(toUpper(readLine("Roll number of the student: ")));
    if (studentIndex == -1) {
        cout << "Student not found." << endl;
        return;
    }

    string code = toUpper(readLine("Subject code: "));
    if (findSubject(code) == -1) {
        cout << "Subject not found." << endl;
        return;
    }

    Date date = readDate("Date (DD-MM-YYYY, Enter for today): ");
    if (!students[studentIndex].hasRecord(code, date)) {
        cout << "No attendance record found." << endl;
        return;
    }

    cout << "Current status: " << students[studentIndex].getStatus(code, date) << endl;
    char newStatus = readStatus("New status (P/A): ");
    students[studentIndex].updateRecord(code, date, newStatus);

    if (FileManager::saveAttendance(students)) {
        cout << "Attendance corrected." << endl;
    }
}
// Shows one student's attendance, per subject and overall.
void AttendanceSystem::viewStudentAttendance() const {
    int index = findStudent(toUpper(readLine("Roll number of the student: ")));
    if (index == -1) {
        cout << "Student not found." << endl;
        return;
    }
    Report::studentReport(students[index], subjects);
}

// ---------- Reports ----------

// Shows the defaulter list.
void AttendanceSystem::showDefaulters() const {
    Report::defaulterList(students, subjects);
}

// Asks for a date and shows that day's report.
void AttendanceSystem::showDailyReport() const {
    Date date = readDate("Date (DD-MM-YYYY, Enter for today): ");
    Report::dailyReport(students, subjects, date);
}

// Asks for a class, month, and year, and shows that month's report.
void AttendanceSystem::showMonthlyReport() const {
    string className = toUpper(readLine("Class (for example AIML-A): "));
    int month = readIntInRange("Month (1-12): ", 1, 12);
    int year = readIntInRange("Year: ", 2000, Date::today().getYear());
    Report::monthlyReport(students, className, month, year);
}
