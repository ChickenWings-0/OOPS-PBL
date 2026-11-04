// Student.cpp
// Implementation of the Student class.

#include "Student.h"

#include <iomanip>
#include <iostream>
#include <sstream>

using namespace std;

// Static data members are declared in the class but must be defined once here.
int Student::totalStudents = 0;
int Student::nextId = 1;

// Default constructor: required for the array Student students[MAX_STUDENTS].
// The counter is NOT changed here, otherwise creating that array would
// count 100 students before any were added.
Student::Student() : Person(), rollNo(""), className(""), recordCount(0) {}

// Parameterised constructor. Calls the Person constructor first.
Student::Student(int studentId, const string& roll, const string& studentName,
                 const string& studentClass)
    : Person(studentId, studentName), rollNo(roll), className(studentClass), recordCount(0) {}

// Getters and setters for the roll number and class.
string Student::getRollNo() const { return rollNo; }
void Student::setRollNo(const string& newRollNo) { rollNo = newRollNo; }
string Student::getClassName() const { return className; }
void Student::setClassName(const string& newClassName) { className = newClassName; }

// Overrides Person::display(). Prints the student as one table row.
void Student::display() const {
    cout << left << setw(6) << id << setw(17) << rollNo
         << setw(30) << name << className << endl;
}

// Builds the line stored in students.txt.
string Student::toFileLine() const {
    stringstream line;
    line << id << "|" << rollNo << "|" << name << "|" << className;
    return line.str();
}

// Adds a mark to this student's array. Returns false if the array is full.
bool Student::addRecord(const AttendanceRecord& record) {
    if (recordCount >= MAX_RECORDS) {
        return false;
    }
    records[recordCount] = record;
    recordCount++;
    return true;
}

// Returns true if this subject and date are already marked.
bool Student::hasRecord(const string& code, const Date& date) const {
    return getStatus(code, date) != '-';
}

// Returns 'P' or 'A' for that subject and date, or '-' if there is no record.
char Student::getStatus(const string& code, const Date& date) const {
    for (int i = 0; i < recordCount; i++) {
        if (records[i].matches(code, date)) {
            return records[i].getStatus();
        }
    }
    return '-';
}

// Corrects an existing mark. Returns false if there is no such record.
bool Student::updateRecord(const string& code, const Date& date, char newStatus) {
    for (int i = 0; i < recordCount; i++) {
        if (records[i].matches(code, date)) {
            records[i].setStatus(newStatus);
            return true;
        }
    }
    return false;
}

// Returns the latest marks in one subject, oldest first, like "PPAP".
// Marks may have been entered out of order, so they are sorted by date first.
string Student::markHistory(const string& code, int maxMarks) const {
    int order[MAX_RECORDS];
    int count = 0;

    // Insertion sort of this subject's records.
    for (int i = 0; i < recordCount; i++) {
        if (records[i].getSubjectCode() != code) {
            continue;
        }
        int place = count;
        while (place > 0 && records[order[place - 1]].getDate().isAfter(records[i].getDate())) {
            order[place] = order[place - 1];
            place--;
        }
        order[place] = i;
        count++;
    }

    string marks;
    int start = count > maxMarks ? count - maxMarks : 0;
    for (int i = start; i < count; i++) {
        marks += records[order[i]].getStatus();
    }
    return marks;
}

// Returns how many records this student has.
int Student::getRecordCount() const { return recordCount; }

// Gives read-only access to one record, used when saving to file.
const AttendanceRecord& Student::getRecord(int index) const { return records[index]; }

// Number of classes held for one subject.
int Student::countTotal(const string& code) const {
    int count = 0;
    for (int i = 0; i < recordCount; i++) {
        if (records[i].getSubjectCode() == code) {
            count++;
        }
    }
    return count;
}

// Number of classes attended in one subject.
int Student::countPresent(const string& code) const {
    int count = 0;
    for (int i = 0; i < recordCount; i++) {
        if (records[i].getSubjectCode() == code && records[i].isPresent()) {
            count++;
        }
    }
    return count;
}

// Overload: number of classes held across all subjects.
int Student::countTotal() const {
    return recordCount;
}

// Overload: number of classes attended across all subjects.
int Student::countPresent() const {
    int count = 0;
    for (int i = 0; i < recordCount; i++) {
        if (records[i].isPresent()) {
            count++;
        }
    }
    return count;
}

// Overload: number of classes held in one month.
int Student::countTotal(int month, int year) const {
    int count = 0;
    for (int i = 0; i < recordCount; i++) {
        if (records[i].getDate().isInMonth(month, year)) {
            count++;
        }
    }
    return count;
}

// Overload: number of classes attended in one month.
int Student::countPresent(int month, int year) const {
    int count = 0;
    for (int i = 0; i < recordCount; i++) {
        if (records[i].getDate().isInMonth(month, year) && records[i].isPresent()) {
            count++;
        }
    }
    return count;
}

// Percentage for one subject.
double Student::getPercentage(const string& code) const {
    return calcPercentage(countPresent(code), countTotal(code));
}

// Overload: overall percentage across all subjects.
double Student::getPercentage() const {
    return calcPercentage(countPresent(), countTotal());
}

// Returns how many students exist. This is also the used size of the array.
int Student::getCount() { return totalStudents; }

// Returns a new internal ID, then moves on to the next one.
int Student::generateId() { return nextId++; }

// Called when a real student is added to the array.
void Student::studentAdded() { totalStudents++; }

// Called when a student is deleted from the array.
void Student::studentRemoved() { totalStudents--; }

// While loading from file, keeps nextId above the highest ID found,
// so new students never receive an ID that is already in use.
void Student::noteLoadedId(int loadedId) {
    if (loadedId >= nextId) {
        nextId = loadedId + 1;
    }
}

// Attendance percentage. 100.0 forces decimal division,
// and a total of 0 returns 0 instead of dividing by zero.
double Student::calcPercentage(int present, int total) {
    if (total == 0) {
        return 0.0;
    }
    return present * 100.0 / total;
}
