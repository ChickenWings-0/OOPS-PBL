// AttendanceRecord.h
// One attendance mark: a student's status in one subject on one date.

#ifndef ATTENDANCERECORD_H
#define ATTENDANCERECORD_H

#include <string>

#include "Date.h"

class AttendanceRecord {
private:
    std::string subjectCode;   // for example CS201A
    Date date;                 // composition: a record has a Date
    char status;               // 'P' for present, 'A' for absent

public:
    AttendanceRecord();        // required for the records array in Student
    AttendanceRecord(const std::string& code, const Date& classDate, char markStatus);

    std::string getSubjectCode() const;
    Date getDate() const;
    char getStatus() const;
    void setStatus(char newStatus);

    bool isPresent() const;
    bool matches(const std::string& code, const Date& classDate) const;
};

#endif
