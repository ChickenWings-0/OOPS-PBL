// ReportPrinter.h
// Prints the structs that Report calculates, as tables in the terminal.
// Every function is static, because the class stores no data of its own.

#ifndef REPORTPRINTER_H
#define REPORTPRINTER_H

#include <string>

#include "Report.h"

class ReportPrinter {
public:
    static void printStudentReport(const Student& student, const Subject subjects[],
                                   const StudentReportData& data);
    static void printDefaulters(const Student students[], const Subject subjects[],
                                const DefaulterEntry entries[], int count);
    static void printDailyReport(const Student students[], const Subject subjects[],
                                 const Date& date, const DailyReportData& data);
    static void printMonthlyReport(const Student students[], const std::string& className,
                                   int month, int year, const MonthlyReportData& data);
};

#endif
