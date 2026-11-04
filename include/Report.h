// Report.h
// Calculates attendance reports. Reports only read data and never change it.
// Nothing here prints. Each report is returned as a plain struct, which
// ReportPrinter shows in the terminal and JsonMapper sends to the browser, so
// the two can never disagree.
// Structs store array indexes instead of copying names, which keeps them small.
// Every function is static, because the class stores no data of its own.

#ifndef REPORT_H
#define REPORT_H

#include <string>

#include "Config.h"
#include "Date.h"
#include "Student.h"
#include "Subject.h"

// One student's attendance in one subject.
struct SubjectLine {
    int subjectIndex;
    int present;
    int total;
    double percentage;
    bool belowLimit;
};

// One student's report: a line per subject of their class, then overall.
struct StudentReportData {
    SubjectLine lines[MAX_SUBJECTS];
    int lineCount;
    int overallPresent;
    int overallTotal;
    double overallPercentage;
};

// One student who is below the limit in one subject.
struct DefaulterEntry {
    int studentIndex;
    int subjectIndex;
    int present;
    int total;
    double percentage;
};

// One subject that was held on the chosen date.
struct DailySubject {
    int subjectIndex;
    int present;
    int absent;
};

struct DailyReportData {
    DailySubject lines[MAX_SUBJECTS];
    int lineCount;
};

// One student of the class in the chosen month.
struct MonthlyLine {
    int studentIndex;
    int held;
    int present;
    double percentage;
};

struct MonthlyReportData {
    MonthlyLine lines[MAX_STUDENTS];
    int lineCount;
    bool anyRecords;      // false if the class has no marks in this month
};

class Report {
public:
    static bool isBelowLimit(double percentage);
    static std::string percentText(double percentage);    // like 83.33%

    static StudentReportData studentReport(const Student& student, const Subject subjects[]);
    static int defaulterList(const Student students[], const Subject subjects[],
                             DefaulterEntry entries[]);
    static DailyReportData dailyReport(const Student students[], const Subject subjects[],
                                       const Date& date);
    static MonthlyReportData monthlyReport(const Student students[], const std::string& className,
                                           int month, int year);
};

#endif
