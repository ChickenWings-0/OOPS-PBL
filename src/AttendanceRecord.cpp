// AttendanceRecord.cpp
// Implementation of the AttendanceRecord class.

#include "AttendanceRecord.h"

using namespace std;

// Default constructor: an empty record, marked absent.
AttendanceRecord::AttendanceRecord() : subjectCode(""), date(), status('A') {}

// Parameterised constructor.
AttendanceRecord::AttendanceRecord(const string& code, const Date& classDate, char markStatus)
    : subjectCode(code), date(classDate), status(markStatus) {}

// Getters: give read-only access to the private data.
string AttendanceRecord::getSubjectCode() const { return subjectCode; }
Date AttendanceRecord::getDate() const { return date; }
char AttendanceRecord::getStatus() const { return status; }

// Used when correcting a wrong mark.
void AttendanceRecord::setStatus(char newStatus) { status = newStatus; }

// Returns true if the student was present.
bool AttendanceRecord::isPresent() const {
    return status == 'P';
}

// Returns true if this is the record for that subject and date.
bool AttendanceRecord::matches(const string& code, const Date& classDate) const {
    return subjectCode == code && date.equals(classDate);
}
