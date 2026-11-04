// Report.h
// Prints attendance reports. Reports only read data and never change it.
// Every function is static, because the class stores no data of its own.

#ifndef REPORT_H
#define REPORT_H

#include <string>

#include "Date.h"
#include "Student.h"
#include "Subject.h"

class Report {
public:
    static void studentReport(const Student& student, const Subject subjects[]);
    static void defaulterList(const Student students[], const Subject subjects[]);
    static void dailyReport(const Student students[], const Subject subjects[], const Date& date);
    static void monthlyReport(const Student students[], const std::string& className,
                              int month, int year);
};

#endif
