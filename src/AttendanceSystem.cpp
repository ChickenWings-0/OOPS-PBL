// AttendanceSystem.cpp
// Implementation of the AttendanceSystem class.
// Text may arrive from a keyboard or a browser, so every action cleans it first.

#include "AttendanceSystem.h"

#include <sstream>

#include "FileManager.h"
#include "Utils.h"

using namespace std;

// Turns the outcome of a save into a Result. FileManager has already
// logged which file failed.
static Result saveResult(bool saved, const string& message) {
    if (saved) {
        return Result(RESULT_OK, message);
    }
    return Result(RESULT_SAVE_FAILED, "Could not save the data file.");
}

// ---------- Start ----------

// Loads all data. Attendance must come last, because each mark
// is attached to a student who must already be in memory.
AttendanceSystem::AttendanceSystem() {
    FileManager::loadTeachers(teachers);
    FileManager::loadSubjects(subjects);
    FileManager::loadStudents(students);
    FileManager::loadAttendance(students, subjects);
}

// ---------- Read-only access ----------

// Give the arrays and single objects to the user interfaces, read-only.
const Student* AttendanceSystem::getStudents() const { return students; }
const Subject* AttendanceSystem::getSubjects() const { return subjects; }
const Student& AttendanceSystem::getStudent(int index) const { return students[index]; }
const Subject& AttendanceSystem::getSubject(int index) const { return subjects[index]; }
const Teacher& AttendanceSystem::getTeacher(int index) const { return teachers[index]; }

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

// Matches a roll number exactly, or any part of a name.
// Upper and lower case are treated the same.
int AttendanceSystem::findMatchingStudents(const string& text, int results[]) const {
    string searchText = toUpper(trim(text));
    int matches = 0;

    for (int i = 0; i < Student::getCount(); i++) {
        bool rollMatches = students[i].getRollNo() == searchText;
        bool nameMatches = toUpper(students[i].getName()).find(searchText) != string::npos;

        if (rollMatches || nameMatches) {
            results[matches] = i;
            matches++;
        }
    }
    return matches;
}

// ---------- Login and accounts ----------

// Returns the index of the teacher with these details, or -1.
int AttendanceSystem::checkLogin(const string& username, const string& password) const {
    for (int i = 0; i < Teacher::getCount(); i++) {
        if (teachers[i].checkLogin(username, password)) {
            return i;
        }
    }
    return -1;
}

// Returns true if this teacher is the admin.
bool AttendanceSystem::isAdmin(int teacher) const {
    return teacher >= 0 && teacher < Teacher::getCount() && teachers[teacher].isAdmin();
}

// Checks a teacher's current password before it may be changed.
Result AttendanceSystem::checkCurrentPassword(int teacher, const string& password) const {
    if (!teachers[teacher].checkLogin(teachers[teacher].getUsername(), password)) {
        return Result(RESULT_INVALID, "Wrong password.", "currentPassword");
    }
    return Result(RESULT_OK);
}

// Checks the rules for a new password.
Result AttendanceSystem::checkNewPassword(const string& password, const string& field) const {
    if (!isValidPassword(password)) {
        return Result(RESULT_INVALID, "Invalid password. Use 4 to 20 characters, with no spaces or |",
                      field);
    }
    return Result(RESULT_OK);
}

// Changes a teacher's password after checking the current one.
Result AttendanceSystem::changePassword(int teacher, const string& current,
                                        const string& newPassword) {
    Result check = checkCurrentPassword(teacher, current);
    if (!check.isOk()) {
        return check;
    }
    check = checkNewPassword(newPassword, "newPassword");
    if (!check.isOk()) {
        return check;
    }

    teachers[teacher].setPassword(newPassword);
    return saveResult(FileManager::saveTeachers(teachers), "Password changed.");
}

// Replaces every password. The deployed server uses this for its secret
// demo password, because the sample passwords are public on GitHub.
Result AttendanceSystem::setAllPasswords(const string& password) {
    Result check = checkNewPassword(password);
    if (!check.isOk()) {
        return check;
    }

    for (int i = 0; i < Teacher::getCount(); i++) {
        teachers[i].setPassword(password);
    }
    return saveResult(FileManager::saveTeachers(teachers), "All passwords replaced.");
}

// ---------- Teachers ----------

// Only the admin may add teachers, and the array must have room.
Result AttendanceSystem::canAddTeacher(int actor) const {
    if (!isAdmin(actor)) {
        return Result(RESULT_FORBIDDEN, "Only the admin can add teachers.");
    }
    if (Teacher::getCount() >= MAX_TEACHERS) {
        return Result(RESULT_LIMIT, "Limit reached. Cannot add more teachers.");
    }
    return Result(RESULT_OK);
}

// Only the admin may see the list of teachers.
Result AttendanceSystem::canViewTeachers(int actor) const {
    if (!isAdmin(actor)) {
        return Result(RESULT_FORBIDDEN, "Only the admin can view teachers.");
    }
    return Result(RESULT_OK);
}

// Checks a new username: valid, and not already in use.
Result AttendanceSystem::checkNewUsername(const string& username) const {
    string clean = trim(username);
    if (!isValidUsername(clean)) {
        return Result(RESULT_INVALID, "Invalid username. Use 3 to 20 letters or digits.", "username");
    }
    if (findTeacher(clean) != -1) {
        return Result(RESULT_DUPLICATE, "This username already exists.", "username");
    }
    return Result(RESULT_OK);
}

// Adds a new teacher account. Admin only.
Result AttendanceSystem::addTeacher(int actor, const string& name, const string& username,
                                    const string& password) {
    Result check = canAddTeacher(actor);
    if (!check.isOk()) {
        return check;
    }
    check = checkPersonName(name);
    if (!check.isOk()) {
        return check;
    }
    check = checkNewUsername(username);
    if (!check.isOk()) {
        return check;
    }
    check = checkNewPassword(password);
    if (!check.isOk()) {
        return check;
    }

    teachers[Teacher::getCount()] = Teacher(Teacher::generateId(), trim(name), trim(username), password);
    Teacher::teacherAdded();

    return saveResult(FileManager::saveTeachers(teachers), "Teacher added.");
}

// ---------- Rules shared by several actions ----------

// Checks the name of a student or a teacher.
Result AttendanceSystem::checkPersonName(const string& name) const {
    if (!isValidName(trim(name))) {
        return Result(RESULT_INVALID, "Invalid name. Use 1 to 40 letters, spaces, . ' or -", "name");
    }
    return Result(RESULT_OK);
}

// Checks a class name.
Result AttendanceSystem::checkClassName(const string& className) const {
    if (!isValidClassName(toUpper(trim(className)))) {
        return Result(RESULT_INVALID, "Invalid class. Use 1 to 15 letters, digits, or hyphens.",
                      "className");
    }
    return Result(RESULT_OK);
}

// ---------- Students ----------

// The student array must have room.
Result AttendanceSystem::canAddStudent() const {
    if (Student::getCount() >= MAX_STUDENTS) {
        return Result(RESULT_LIMIT, "Limit reached. Cannot add more students.");
    }
    return Result(RESULT_OK);
}

// Turns a failed search into a message.
Result AttendanceSystem::checkStudentExists(int index) const {
    if (index < 0 || index >= Student::getCount()) {
        return Result(RESULT_NOT_FOUND, "Student not found.");
    }
    return Result(RESULT_OK);
}

// Checks a new roll number: valid, and not already in use.
Result AttendanceSystem::checkNewRollNo(const string& rollNo) const {
    string clean = toUpper(trim(rollNo));
    if (!isValidRollNo(clean)) {
        return Result(RESULT_INVALID, "Invalid roll number. Use 1 to 15 letters or digits.", "rollNo");
    }
    if (findStudent(clean) != -1) {
        return Result(RESULT_DUPLICATE, "This roll number already exists.", "rollNo");
    }
    return Result(RESULT_OK);
}

// Two students may really share a name, so this asks for confirmation
// instead of refusing.
Result AttendanceSystem::checkSameName(const string& name, const string& className) const {
    string cleanName = toUpper(trim(name));
    string cleanClass = toUpper(trim(className));

    for (int i = 0; i < Student::getCount(); i++) {
        if (toUpper(students[i].getName()) == cleanName &&
            students[i].getClassName() == cleanClass) {
            return Result(RESULT_NEEDS_CONFIRM,
                          "A student with this name is already in " + cleanClass + ".");
        }
    }
    return Result(RESULT_OK);
}

// Adds a new student. The caller gives the roll number, name, and class,
// and the program generates the internal ID. "confirmed" means the user has
// agreed to add a second student with the same name.
Result AttendanceSystem::addStudent(const string& rollNo, const string& name,
                                    const string& className, bool confirmed) {
    Result check = canAddStudent();
    if (!check.isOk()) {
        return check;
    }
    check = checkNewRollNo(rollNo);
    if (!check.isOk()) {
        return check;
    }
    check = checkPersonName(name);
    if (!check.isOk()) {
        return check;
    }
    check = checkClassName(className);
    if (!check.isOk()) {
        return check;
    }
    if (!confirmed) {
        check = checkSameName(name, className);
        if (!check.isOk()) {
            return check;
        }
    }

    int id = Student::generateId();
    students[Student::getCount()] = Student(id, toUpper(trim(rollNo)), trim(name),
                                            toUpper(trim(className)));
    Student::studentAdded();

    stringstream message;
    message << "Student added with internal ID " << id << ".";
    return saveResult(FileManager::saveStudents(students), message.str());
}

// Checks a changed roll number. The student may keep their own number.
Result AttendanceSystem::checkUpdateRollNo(int index, const string& rollNo) const {
    string clean = toUpper(trim(rollNo));
    if (!isValidRollNo(clean)) {
        return Result(RESULT_INVALID, "Invalid roll number. Nothing was changed.", "rollNo");
    }
    int owner = findStudent(clean);
    if (owner != -1 && owner != index) {
        return Result(RESULT_DUPLICATE, "This roll number already exists. Nothing was changed.", "rollNo");
    }
    return Result(RESULT_OK);
}

// Checks a changed name.
Result AttendanceSystem::checkUpdateName(const string& name) const {
    if (!isValidName(trim(name))) {
        return Result(RESULT_INVALID, "Invalid name. Nothing was changed.", "name");
    }
    return Result(RESULT_OK);
}

// Checks a changed class. Existing marks belong to the old class's subjects,
// so a student with attendance cannot move.
Result AttendanceSystem::checkUpdateClass(int index, const string& className) const {
    string clean = toUpper(trim(className));
    if (!isValidClassName(clean)) {
        return Result(RESULT_INVALID, "Invalid class. Nothing was changed.", "className");
    }
    if (clean != students[index].getClassName() && students[index].getRecordCount() > 0) {
        return Result(RESULT_INVALID,
                      "Cannot change the class of a student who has attendance. Nothing was changed.",
                      "className");
    }
    return Result(RESULT_OK);
}

// Changes a student's roll number, name, or class.
// Everything is checked first, so a bad entry changes nothing.
Result AttendanceSystem::updateStudent(int index, const string& rollNo, const string& name,
                                       const string& className) {
    Result check = checkStudentExists(index);
    if (!check.isOk()) {
        return check;
    }
    check = checkUpdateRollNo(index, rollNo);
    if (!check.isOk()) {
        return check;
    }
    check = checkUpdateName(name);
    if (!check.isOk()) {
        return check;
    }
    check = checkUpdateClass(index, className);
    if (!check.isOk()) {
        return check;
    }

    students[index].setRollNo(toUpper(trim(rollNo)));
    students[index].setName(trim(name));
    students[index].setClassName(toUpper(trim(className)));

    return saveResult(FileManager::saveStudents(students), "Student updated.");
}

// Deletes a student and their attendance.
Result AttendanceSystem::deleteStudent(int index) {
    Result check = checkStudentExists(index);
    if (!check.isOk()) {
        return check;
    }

    // Move every later student one place left to fill the gap.
    int count = Student::getCount();
    for (int i = index; i < count - 1; i++) {
        students[i] = students[i + 1];
    }
    students[count - 1] = Student();   // clear the slot that is now unused
    Student::studentRemoved();

    // Attendance is stored inside each Student, so both files must be rewritten.
    bool saved = FileManager::saveStudents(students) && FileManager::saveAttendance(students);
    return saveResult(saved, "Student deleted.");
}

// ---------- Subjects ----------

// The subject array must have room.
Result AttendanceSystem::canAddSubject() const {
    if (Subject::getCount() >= MAX_SUBJECTS) {
        return Result(RESULT_LIMIT, "Limit reached. Cannot add more subjects.");
    }
    return Result(RESULT_OK);
}

// Turns a failed subject search into a message.
Result AttendanceSystem::checkSubjectExists(const string& code) const {
    if (findSubject(toUpper(trim(code))) == -1) {
        return Result(RESULT_NOT_FOUND, "Subject not found.", "subject");
    }
    return Result(RESULT_OK);
}

// Checks a new subject code: valid, and not already in use.
Result AttendanceSystem::checkNewCode(const string& code) const {
    string clean = toUpper(trim(code));
    if (!isValidCode(clean)) {
        return Result(RESULT_INVALID, "Invalid code. Use 1 to 10 letters or digits.", "code");
    }
    if (findSubject(clean) != -1) {
        return Result(RESULT_DUPLICATE, "This subject code already exists.", "code");
    }
    return Result(RESULT_OK);
}

// Checks a subject name.
Result AttendanceSystem::checkSubjectName(const string& name) const {
    if (!isValidSubjectName(trim(name))) {
        return Result(RESULT_INVALID, "Invalid name. Use 1 to 40 characters, without |", "name");
    }
    return Result(RESULT_OK);
}

// Adds a new subject for one class. Subject codes must be unique.
Result AttendanceSystem::addSubject(const string& code, const string& name,
                                    const string& className) {
    Result check = canAddSubject();
    if (!check.isOk()) {
        return check;
    }
    check = checkNewCode(code);
    if (!check.isOk()) {
        return check;
    }
    check = checkSubjectName(name);
    if (!check.isOk()) {
        return check;
    }
    check = checkClassName(className);
    if (!check.isOk()) {
        return check;
    }

    subjects[Subject::getCount()] = Subject(toUpper(trim(code)), trim(name),
                                            toUpper(trim(className)));
    Subject::subjectAdded();

    return saveResult(FileManager::saveSubjects(subjects), "Subject added.");
}

// ---------- Attendance ----------

// Checks everything that could stop a marking session, before any mark is
// stored, so a session can never be left half finished.
Result AttendanceSystem::checkCanMark(const string& code, const Date& date) const {
    Result check = checkSubjectExists(code);
    if (!check.isOk()) {
        return check;
    }
    check = checkClassDate(date);
    if (!check.isOk()) {
        return check;
    }

    const Subject& subject = subjects[findSubject(toUpper(trim(code)))];
    int classSize = 0;

    for (int i = 0; i < Student::getCount(); i++) {
        if (students[i].getClassName() != subject.getClassName()) {
            continue;
        }
        classSize++;

        if (students[i].hasRecord(subject.getCode(), date)) {
            return Result(RESULT_DUPLICATE, "Attendance for " + subject.getCode() + " on " +
                          date.toString() + " is already marked. Use Correct a mark to change it.");
        }
        if (students[i].getRecordCount() >= MAX_RECORDS) {
            return Result(RESULT_LIMIT, "Limit reached for " + students[i].getName() +
                          ". Attendance was not marked.");
        }
    }

    if (classSize == 0) {
        return Result(RESULT_NOT_FOUND, "No students found in class " + subject.getClassName() + ".");
    }
    return Result(RESULT_OK);
}

// Marks one subject on one date for every student of that subject's class.
// All marks are checked first, so a session is stored only once it is complete.
Result AttendanceSystem::markAttendance(const string& code, const Date& date, const char marks[],
                                        int& presentCount, int& absentCount) {
    presentCount = 0;
    absentCount = 0;

    Result check = checkCanMark(code, date);
    if (!check.isOk()) {
        return check;
    }

    const Subject& subject = subjects[findSubject(toUpper(trim(code)))];

    for (int i = 0; i < Student::getCount(); i++) {
        if (students[i].getClassName() == subject.getClassName() &&
            marks[i] != 'P' && marks[i] != 'A') {
            return Result(RESULT_INVALID, "Every student must be marked P or A.");
        }
    }

    // All answers are in, so add a record to each student and save it.
    bool saved = true;
    for (int i = 0; i < Student::getCount(); i++) {
        if (students[i].getClassName() != subject.getClassName()) {
            continue;
        }

        AttendanceRecord record(subject.getCode(), date, marks[i]);
        students[i].addRecord(record);
        if (!FileManager::appendAttendance(students[i].getId(), record)) {
            saved = false;
        }
        if (record.isPresent()) {
            presentCount++;
        } else {
            absentCount++;
        }
    }

    stringstream message;
    message << "Attendance saved. Present: " << presentCount << ", Absent: " << absentCount;
    return saveResult(saved, message.str());
}

// Checks that a mark exists before it is corrected.
Result AttendanceSystem::checkRecordExists(int index, const string& code, const Date& date) const {
    if (!students[index].hasRecord(toUpper(trim(code)), date)) {
        return Result(RESULT_NOT_FOUND, "No attendance record found.");
    }
    return Result(RESULT_OK);
}

// Corrects one existing mark.
Result AttendanceSystem::editAttendance(int index, const string& code, const Date& date,
                                        char status) {
    Result check = checkStudentExists(index);
    if (!check.isOk()) {
        return check;
    }
    check = checkSubjectExists(code);
    if (!check.isOk()) {
        return check;
    }
    check = checkRecordExists(index, code, date);
    if (!check.isOk()) {
        return check;
    }
    if (status != 'P' && status != 'A') {
        return Result(RESULT_INVALID, "Please enter P or A.", "status");
    }

    students[index].updateRecord(toUpper(trim(code)), date, status);
    return saveResult(FileManager::saveAttendance(students), "Attendance corrected.");
}
