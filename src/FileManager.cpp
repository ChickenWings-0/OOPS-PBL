// FileManager.cpp
// Implementation of the FileManager class.
// File format: one record per line, with fields separated by |

#include "FileManager.h"

#include <fstream>
#include <iostream>
#include <sstream>

#include "Utils.h"

using namespace std;

// Paths are relative, so the program must be run from the project folder.
const string TEACHER_FILE = "data/teachers.txt";
const string SUBJECT_FILE = "data/subjects.txt";
const string STUDENT_FILE = "data/students.txt";
const string ATTENDANCE_FILE = "data/attendance.txt";

// Splits a line at each | into the fields array.
// Returns the number of parts found, which may be more than maxFields.
int FileManager::splitLine(const string& line, string fields[], int maxFields) {
    stringstream input(line);
    string part;
    int count = 0;

    while (getline(input, part, '|')) {
        if (count < maxFields) {
            fields[count] = trim(part);
        }
        count++;
    }
    return count;
}

// Prints a warning about a line that could not be used.
void FileManager::warn(const string& fileName, int lineNo, const string& reason) {
    cout << "Warning: " << fileName << " line " << lineNo
         << " skipped (" << reason << ")" << endl;
}

// Builds one line of attendance.txt.
string FileManager::attendanceLine(int studentId, const AttendanceRecord& record) {
    stringstream line;
    line << studentId << "|" << record.getSubjectCode() << "|"
         << record.getDate().toString() << "|" << record.getStatus();
    return line.str();
}

// Reads teachers.txt. If no teacher exists, creates the default admin
// account, so that nobody is locked out of the program.
void FileManager::loadTeachers(Teacher teachers[]) {
    ifstream file(TEACHER_FILE);

    if (file.is_open()) {
        string line;
        int lineNo = 0;

        while (getline(file, line)) {
            lineNo++;
            if (trim(line).empty()) {
                continue;
            }

            string fields[4];
            int id;
            if (splitLine(line, fields, 4) != 4) {
                warn(TEACHER_FILE, lineNo, "wrong number of fields");
                continue;
            }
            if (!parseInt(fields[0], id) || id <= 0) {
                warn(TEACHER_FILE, lineNo, "bad ID");
                continue;
            }
            if (!isValidName(fields[1]) || !isValidUsername(fields[2]) ||
                !isValidPassword(fields[3])) {
                warn(TEACHER_FILE, lineNo, "bad name, username, or password");
                continue;
            }

            bool duplicate = false;
            for (int i = 0; i < Teacher::getCount(); i++) {
                if (teachers[i].getId() == id || teachers[i].getUsername() == fields[2]) {
                    duplicate = true;
                }
            }
            if (duplicate) {
                warn(TEACHER_FILE, lineNo, "duplicate ID or username");
                continue;
            }
            if (Teacher::getCount() >= MAX_TEACHERS) {
                warn(TEACHER_FILE, lineNo, "teacher limit reached");
                continue;
            }

            teachers[Teacher::getCount()] = Teacher(id, fields[1], fields[2], fields[3]);
            Teacher::noteLoadedId(id);
            Teacher::teacherAdded();
        }
        file.close();
    }

    if (Teacher::getCount() == 0) {
        teachers[0] = Teacher(Teacher::generateId(), "Administrator", "admin", "admin123");
        Teacher::teacherAdded();
        saveTeachers(teachers);
        cout << "No teachers found. Created default login: admin / admin123" << endl;
    }
}

// Reads subjects.txt. A missing file just means there are no subjects yet.
void FileManager::loadSubjects(Subject subjects[]) {
    ifstream file(SUBJECT_FILE);
    if (!file.is_open()) {
        return;
    }

    string line;
    int lineNo = 0;

    while (getline(file, line)) {
        lineNo++;
        if (trim(line).empty()) {
            continue;
        }

        string fields[3];
        if (splitLine(line, fields, 3) != 3) {
            warn(SUBJECT_FILE, lineNo, "wrong number of fields");
            continue;
        }
        if (!isValidCode(fields[0]) || !isValidSubjectName(fields[1]) ||
            !isValidClassName(fields[2])) {
            warn(SUBJECT_FILE, lineNo, "bad code, name, or class");
            continue;
        }

        bool duplicate = false;
        for (int i = 0; i < Subject::getCount(); i++) {
            if (subjects[i].getCode() == fields[0]) {
                duplicate = true;
            }
        }
        if (duplicate) {
            warn(SUBJECT_FILE, lineNo, "duplicate subject code");
            continue;
        }
        if (Subject::getCount() >= MAX_SUBJECTS) {
            warn(SUBJECT_FILE, lineNo, "subject limit reached");
            continue;
        }

        subjects[Subject::getCount()] = Subject(fields[0], fields[1], fields[2]);
        Subject::subjectAdded();
    }
    file.close();
}

// Reads students.txt. A missing file just means there are no students yet.
void FileManager::loadStudents(Student students[]) {
    ifstream file(STUDENT_FILE);
    if (!file.is_open()) {
        return;
    }

    string line;
    int lineNo = 0;

    while (getline(file, line)) {
        lineNo++;
        if (trim(line).empty()) {
            continue;
        }

        string fields[4];
        int id;
        if (splitLine(line, fields, 4) != 4) {
            warn(STUDENT_FILE, lineNo, "wrong number of fields");
            continue;
        }
        if (!parseInt(fields[0], id) || id <= 0) {
            warn(STUDENT_FILE, lineNo, "bad ID");
            continue;
        }
        if (!isValidRollNo(fields[1]) || !isValidName(fields[2]) ||
            !isValidClassName(fields[3])) {
            warn(STUDENT_FILE, lineNo, "bad roll number, name, or class");
            continue;
        }

        bool duplicate = false;
        for (int i = 0; i < Student::getCount(); i++) {
            if (students[i].getId() == id || students[i].getRollNo() == fields[1]) {
                duplicate = true;
            }
        }
        if (duplicate) {
            warn(STUDENT_FILE, lineNo, "duplicate ID or roll number");
            continue;
        }
        if (Student::getCount() >= MAX_STUDENTS) {
            warn(STUDENT_FILE, lineNo, "student limit reached");
            continue;
        }

        students[Student::getCount()] = Student(id, fields[1], fields[2], fields[3]);
        Student::noteLoadedId(id);
        Student::studentAdded();
    }
    file.close();
}

// Reads attendance.txt and gives each mark to the correct student.
// Students and subjects must already be loaded.
void FileManager::loadAttendance(Student students[], const Subject subjects[]) {
    ifstream file(ATTENDANCE_FILE);
    if (!file.is_open()) {
        return;
    }

    string line;
    int lineNo = 0;

    while (getline(file, line)) {
        lineNo++;
        if (trim(line).empty()) {
            continue;
        }

        string fields[4];
        int id;
        Date date;
        if (splitLine(line, fields, 4) != 4) {
            warn(ATTENDANCE_FILE, lineNo, "wrong number of fields");
            continue;
        }
        if (!parseInt(fields[0], id) || !Date::parse(fields[2], date)) {
            warn(ATTENDANCE_FILE, lineNo, "bad ID or date");
            continue;
        }
        if (fields[3] != "P" && fields[3] != "A") {
            warn(ATTENDANCE_FILE, lineNo, "status must be P or A");
            continue;
        }

        int studentIndex = -1;
        for (int i = 0; i < Student::getCount(); i++) {
            if (students[i].getId() == id) {
                studentIndex = i;
            }
        }
        if (studentIndex == -1) {
            warn(ATTENDANCE_FILE, lineNo, "unknown student");
            continue;
        }

        bool subjectFound = false;
        for (int i = 0; i < Subject::getCount(); i++) {
            if (subjects[i].getCode() == fields[1]) {
                subjectFound = true;
            }
        }
        if (!subjectFound) {
            warn(ATTENDANCE_FILE, lineNo, "unknown subject");
            continue;
        }

        if (students[studentIndex].hasRecord(fields[1], date)) {
            warn(ATTENDANCE_FILE, lineNo, "duplicate mark");
            continue;
        }
        if (!students[studentIndex].addRecord(AttendanceRecord(fields[1], date, fields[3][0]))) {
            warn(ATTENDANCE_FILE, lineNo, "student's record limit reached");
        }
    }
    file.close();
}

// Rewrites teachers.txt from the array.
bool FileManager::saveTeachers(const Teacher teachers[]) {
    ofstream file(TEACHER_FILE);
    if (!file.is_open()) {
        cout << "Error: could not save " << TEACHER_FILE << endl;
        return false;
    }
    for (int i = 0; i < Teacher::getCount(); i++) {
        file << teachers[i].toFileLine() << "\n";
    }
    file.close();
    return true;
}

// Rewrites subjects.txt from the array.
bool FileManager::saveSubjects(const Subject subjects[]) {
    ofstream file(SUBJECT_FILE);
    if (!file.is_open()) {
        cout << "Error: could not save " << SUBJECT_FILE << endl;
        return false;
    }
    for (int i = 0; i < Subject::getCount(); i++) {
        file << subjects[i].toFileLine() << "\n";
    }
    file.close();
    return true;
}

// Rewrites students.txt from the array.
bool FileManager::saveStudents(const Student students[]) {
    ofstream file(STUDENT_FILE);
    if (!file.is_open()) {
        cout << "Error: could not save " << STUDENT_FILE << endl;
        return false;
    }
    for (int i = 0; i < Student::getCount(); i++) {
        file << students[i].toFileLine() << "\n";
    }
    file.close();
    return true;
}

// Rewrites attendance.txt from every student's records array.
bool FileManager::saveAttendance(const Student students[]) {
    ofstream file(ATTENDANCE_FILE);
    if (!file.is_open()) {
        cout << "Error: could not save " << ATTENDANCE_FILE << endl;
        return false;
    }
    for (int i = 0; i < Student::getCount(); i++) {
        for (int j = 0; j < students[i].getRecordCount(); j++) {
            file << attendanceLine(students[i].getId(), students[i].getRecord(j)) << "\n";
        }
    }
    file.close();
    return true;
}

// Adds one mark to the end of attendance.txt, keeping what is already there.
bool FileManager::appendAttendance(int studentId, const AttendanceRecord& record) {
    ofstream file(ATTENDANCE_FILE, ios::app);
    if (!file.is_open()) {
        cout << "Error: could not save " << ATTENDANCE_FILE << endl;
        return false;
    }
    file << attendanceLine(studentId, record) << "\n";
    file.close();
    return true;
}
