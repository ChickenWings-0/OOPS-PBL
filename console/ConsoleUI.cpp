// ConsoleUI.cpp
// Implementation of the ConsoleUI class.

#include "ConsoleUI.h"

#include <iomanip>
#include <iostream>

#include "ConsoleInput.h"
#include "Report.h"
#include "ReportPrinter.h"
#include "Utils.h"

using namespace std;

// ---------- Start and finish ----------

// No one is logged in at the start. The app member loads the data files.
ConsoleUI::ConsoleUI() : currentTeacher(-1) {}

// No memory to free, because nothing here uses new. Changes are already saved.
ConsoleUI::~ConsoleUI() {
    cout << "All data is saved. Goodbye!" << endl;
}

// ---------- Helpers ----------

// Prints one row for any Person. Because display() is virtual, the Student
// or Teacher version runs, depending on the real object passed in.
void ConsoleUI::showPerson(const Person& person) const {
    person.display();
}

// Prints the message of a result. A failed save has already been reported
// by FileManager, with the file's name.
void ConsoleUI::show(const Result& result) const {
    if (result.getCode() != RESULT_SAVE_FAILED) {
        cout << result.getMessage() << endl;
    }
}

// Returns true if the check passed. Otherwise prints why it failed.
bool ConsoleUI::passes(const Result& result) const {
    if (result.isOk()) {
        return true;
    }
    show(result);
    return false;
}

// Asks for a roll number. Returns the student's index,
// or -1 after printing that the student was not found.
int ConsoleUI::askForStudent() {
    int index = app.findStudent(toUpper(readLine("Roll number of the student: ")));
    passes(app.checkStudentExists(index));
    return index;
}

// ---------- Login and accounts ----------

// Allows three attempts. Returns true when a login succeeds.
bool ConsoleUI::login() {
    const int MAX_ATTEMPTS = 3;

    for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        string username = readLine("Username: ");
        string password = readLine("Password: ");

        currentTeacher = app.checkLogin(username, password);
        if (currentTeacher != -1) {
            cout << "\nWelcome, " << app.getTeacher(currentTeacher).getName() << "!" << endl;
            return true;
        }
        cout << "Wrong username or password. Attempts left: "
             << MAX_ATTEMPTS - attempt << endl;
    }

    cout << "Too many attempts. Closing the program." << endl;
    return false;
}

// Returns true if the logged-in user is the admin.
bool ConsoleUI::isAdminLoggedIn() const {
    return app.isAdmin(currentTeacher);
}

// Changes the logged-in user's password after checking the current one.
void ConsoleUI::changePassword() {
    string current = readLine("Current password: ");
    if (!passes(app.checkCurrentPassword(currentTeacher, current))) {
        return;
    }

    string newPassword = readLine("New password: ");
    show(app.changePassword(currentTeacher, current, newPassword));
}

// Adds a new teacher account. Admin only.
void ConsoleUI::addTeacher() {
    if (!passes(app.canAddTeacher(currentTeacher))) {
        return;
    }

    string name = readLine("Teacher name: ");
    if (!passes(app.checkPersonName(name))) {
        return;
    }

    string username = readLine("Username: ");
    if (!passes(app.checkNewUsername(username))) {
        return;
    }

    string password = readLine("Password: ");
    show(app.addTeacher(currentTeacher, name, username, password));
}

// Shows every teacher. Admin only. Passwords are never shown.
void ConsoleUI::viewTeachers() const {
    if (!passes(app.canViewTeachers(currentTeacher))) {
        return;
    }

    cout << left << setw(6) << "ID" << setw(30) << "Name" << "Username" << endl;
    cout << string(50, '-') << endl;
    for (int i = 0; i < Teacher::getCount(); i++) {
        showPerson(app.getTeacher(i));
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

// Adds a new student. Each answer is checked straight away, so the user
// hears about a bad roll number before typing the rest.
void ConsoleUI::addStudent() {
    if (!passes(app.canAddStudent())) {
        return;
    }

    string rollNo = readLine("Roll/enrollment number: ");
    if (!passes(app.checkNewRollNo(rollNo))) {
        return;
    }

    string name = readLine("Name: ");
    if (!passes(app.checkPersonName(name))) {
        return;
    }

    string className = readLine("Class (for example AIML-A): ");
    if (!passes(app.checkClassName(className))) {
        return;
    }

    // Two students may really share a name, so this is a warning, not an error.
    Result sameName = app.checkSameName(name, className);
    if (!sameName.isOk()) {
        cout << sameName.getMessage() << endl;
        if (!readYesNo("Add anyway? (Y/N): ")) {
            cout << "Student not added." << endl;
            return;
        }
    }

    show(app.addStudent(rollNo, name, className, true));
}

// Shows every student and the total count.
void ConsoleUI::viewAllStudents() const {
    if (Student::getCount() == 0) {
        cout << "No records found." << endl;
        return;
    }

    printStudentHeader();
    for (int i = 0; i < Student::getCount(); i++) {
        showPerson(app.getStudent(i));
    }
    cout << "Total students: " << Student::getCount() << endl;
}

// Searches by internal ID.
void ConsoleUI::searchStudent(int id) const {
    int index = app.findStudent(id);
    if (!passes(app.checkStudentExists(index))) {
        return;
    }
    printStudentHeader();
    showPerson(app.getStudent(index));
}

// Overload: shows every student whose roll number or name matches.
void ConsoleUI::searchStudent(const string& text) const {
    if (text.empty()) {
        cout << "Nothing to search for." << endl;
        return;
    }

    int matches[MAX_STUDENTS];
    int count = app.findMatchingStudents(text, matches);

    if (count == 0) {
        cout << "Student not found." << endl;
        return;
    }

    printStudentHeader();
    for (int i = 0; i < count; i++) {
        showPerson(app.getStudent(matches[i]));
    }
}

// Changes a student's roll number, name, or class. Pressing Enter keeps the
// old value. Each answer is checked straight away.
void ConsoleUI::updateStudent() {
    int index = askForStudent();
    if (index == -1) {
        return;
    }

    const Student& student = app.getStudent(index);
    printStudentHeader();
    showPerson(student);
    cout << "Press Enter to keep the current value." << endl;

    string newRollNo = toUpper(readLine("New roll number: "));
    if (newRollNo.empty()) {
        newRollNo = student.getRollNo();
    }
    if (!passes(app.checkUpdateRollNo(index, newRollNo))) {
        return;
    }

    string newName = readLine("New name: ");
    if (newName.empty()) {
        newName = student.getName();
    }
    if (!passes(app.checkUpdateName(newName))) {
        return;
    }

    string newClass = toUpper(readLine("New class: "));
    if (newClass.empty()) {
        newClass = student.getClassName();
    }

    show(app.updateStudent(index, newRollNo, newName, newClass));
}

// Deletes a student and their attendance, after asking for confirmation.
void ConsoleUI::deleteStudent() {
    int index = askForStudent();
    if (index == -1) {
        return;
    }

    printStudentHeader();
    showPerson(app.getStudent(index));
    if (!readYesNo("Delete this student and their attendance? (Y/N): ")) {
        cout << "Nothing was deleted." << endl;
        return;
    }

    show(app.deleteStudent(index));
}

// ---------- Subjects ----------

// Adds a new subject for one class.
void ConsoleUI::addSubject() {
    if (!passes(app.canAddSubject())) {
        return;
    }

    string code = readLine("Subject code: ");
    if (!passes(app.checkNewCode(code))) {
        return;
    }

    string name = readLine("Subject name: ");
    if (!passes(app.checkSubjectName(name))) {
        return;
    }

    string className = readLine("Class (for example AIML-A): ");
    show(app.addSubject(code, name, className));
}

// Shows every subject and the total count.
void ConsoleUI::viewSubjects() const {
    if (Subject::getCount() == 0) {
        cout << "No records found." << endl;
        return;
    }

    cout << left << setw(12) << "Code" << setw(42) << "Subject" << "Class" << endl;
    cout << string(60, '-') << endl;
    for (int i = 0; i < Subject::getCount(); i++) {
        app.getSubject(i).display();
    }
    cout << "Total subjects: " << Subject::getCount() << endl;
}

// ---------- Attendance ----------

// Marks one subject on one date for every student of that subject's class.
void ConsoleUI::markAttendance() {
    string code = toUpper(readLine("Subject code: "));
    if (!passes(app.checkSubjectExists(code))) {
        return;
    }

    Date date = readDate("Date (DD-MM-YYYY, Enter for today): ");
    if (!passes(app.checkCanMark(code, date))) {
        return;
    }

    string className = app.getSubject(app.findSubject(code)).getClassName();
    cout << "Marking " << code << " for " << className
         << " on " << date.toString() << endl;

    // Collect every answer first. A session is stored only once it is complete.
    char marks[MAX_STUDENTS];
    for (int i = 0; i < Student::getCount(); i++) {
        const Student& student = app.getStudent(i);
        if (student.getClassName() == className) {
            marks[i] = readStatus(student.getRollNo() + "  " + student.getName() + " (P/A): ");
        }
    }

    int presentCount;
    int absentCount;
    show(app.markAttendance(code, date, marks, presentCount, absentCount));
}

// Corrects one existing mark.
void ConsoleUI::editAttendance() {
    int index = askForStudent();
    if (index == -1) {
        return;
    }

    string code = toUpper(readLine("Subject code: "));
    if (!passes(app.checkSubjectExists(code))) {
        return;
    }

    Date date = readDate("Date (DD-MM-YYYY, Enter for today): ");
    if (!passes(app.checkRecordExists(index, code, date))) {
        return;
    }

    cout << "Current status: " << app.getStudent(index).getStatus(code, date) << endl;
    char newStatus = readStatus("New status (P/A): ");
    show(app.editAttendance(index, code, date, newStatus));
}

// Shows one student's attendance, per subject and overall.
void ConsoleUI::viewStudentAttendance() {
    int index = askForStudent();
    if (index == -1) {
        return;
    }

    const Student& student = app.getStudent(index);
    ReportPrinter::printStudentReport(student, app.getSubjects(),
                                      Report::studentReport(student, app.getSubjects()));
}

// ---------- Reports ----------

// Shows the defaulter list.
void ConsoleUI::showDefaulters() const {
    static DefaulterEntry entries[MAX_DEFAULTER_ENTRIES];
    int count = Report::defaulterList(app.getStudents(), app.getSubjects(), entries);
    ReportPrinter::printDefaulters(app.getStudents(), app.getSubjects(), entries, count);
}

// Asks for a date and shows that day's report.
void ConsoleUI::showDailyReport() const {
    Date date = readDate("Date (DD-MM-YYYY, Enter for today): ");
    ReportPrinter::printDailyReport(app.getStudents(), app.getSubjects(), date,
                                    Report::dailyReport(app.getStudents(), app.getSubjects(), date));
}

// Asks for a class, month, and year, and shows that month's report.
void ConsoleUI::showMonthlyReport() const {
    string className = toUpper(readLine("Class (for example AIML-A): "));
    int month = readIntInRange("Month (1-12): ", 1, 12);
    int year = readIntInRange("Year: ", 2000, Date::today().getYear());
    ReportPrinter::printMonthlyReport(app.getStudents(), className, month, year,
                                      Report::monthlyReport(app.getStudents(), className, month, year));
}
