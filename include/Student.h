// Student.h
// A student. Inherits the internal ID and name from Person.

#ifndef STUDENT_H
#define STUDENT_H

#include <string>

#include "AttendanceRecord.h"
#include "Config.h"
#include "Person.h"

class Student : public Person {
private:
    std::string rollNo;       // real roll/enrollment number, kept as text
    std::string className;    // for example AIML-A

    AttendanceRecord records[MAX_RECORDS];   // this student's attendance array
    int recordCount;                         // slots of records in use

    static int totalStudents; // number of real students, shared by the class
    static int nextId;        // next internal ID to give out

public:
    static const int DEFAULTER_LIMIT = 75;   // minimum required percentage

    Student();
    Student(int studentId, const std::string& roll, const std::string& studentName,
            const std::string& studentClass);

    std::string getRollNo() const;
    void setRollNo(const std::string& newRollNo);
    std::string getClassName() const;
    void setClassName(const std::string& newClassName);

    void display() const override;        // prints one table row
    std::string toFileLine() const;       // returns id|rollNo|name|className

    // Working with this student's attendance array
    bool addRecord(const AttendanceRecord& record);
    bool hasRecord(const std::string& code, const Date& date) const;
    char getStatus(const std::string& code, const Date& date) const;
    bool updateRecord(const std::string& code, const Date& date, char newStatus);
    int getRecordCount() const;
    const AttendanceRecord& getRecord(int index) const;

    // Overloaded counts: one subject, all subjects, or one month
    int countTotal(const std::string& code) const;
    int countPresent(const std::string& code) const;
    int countTotal() const;
    int countPresent() const;
    int countTotal(int month, int year) const;
    int countPresent(int month, int year) const;

    // Overloaded percentages: one subject, or all subjects
    double getPercentage(const std::string& code) const;
    double getPercentage() const;

    // Static functions: called on the class, no object needed.
    static int getCount();
    static int generateId();
    static void studentAdded();
    static void studentRemoved();
    static void noteLoadedId(int loadedId);
    static double calcPercentage(int present, int total);
};

#endif
