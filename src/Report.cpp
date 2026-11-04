// Report.cpp
// Implementation of the Report class.

#include "Report.h"

#include <iomanip>
#include <sstream>

using namespace std;

// Exactly 75% passes, so only a lower value counts.
bool Report::isBelowLimit(double percentage) {
    return percentage < Student::DEFAULTER_LIMIT;
}

// Turns a percentage into text with two decimals, like 83.33%
string Report::percentText(double percentage) {
    stringstream text;
    text << fixed << setprecision(2) << percentage << "%";
    return text.str();
}

// Works out one student's attendance in each subject of their class,
// and an overall figure covering all subjects.
StudentReportData Report::studentReport(const Student& student, const Subject subjects[]) {
    StudentReportData data;
    data.lineCount = 0;

    for (int i = 0; i < Subject::getCount(); i++) {
        if (subjects[i].getClassName() != student.getClassName()) {
            continue;
        }

        string code = subjects[i].getCode();
        SubjectLine& line = data.lines[data.lineCount];
        line.subjectIndex = i;
        line.present = student.countPresent(code);
        line.total = student.countTotal(code);
        line.percentage = student.getPercentage(code);
        line.belowLimit = line.total > 0 && isBelowLimit(line.percentage);
        data.lineCount++;
    }

    // Overall is for information only. Defaulters are decided per subject.
    data.overallPresent = student.countPresent();
    data.overallTotal = student.countTotal();
    data.overallPercentage = student.getPercentage();
    return data;
}

// Finds every student and subject where attendance is below the limit.
// Exactly 75% passes, and a subject with no classes held yet is ignored.
// Fills entries[] and returns how many were found.
int Report::defaulterList(const Student students[], const Subject subjects[],
                          DefaulterEntry entries[]) {
    int count = 0;

    for (int i = 0; i < Student::getCount(); i++) {
        for (int j = 0; j < Subject::getCount(); j++) {
            if (subjects[j].getClassName() != students[i].getClassName()) {
                continue;
            }

            string code = subjects[j].getCode();
            int total = students[i].countTotal(code);
            if (total == 0 || !isBelowLimit(students[i].getPercentage(code))) {
                continue;
            }

            entries[count].studentIndex = i;
            entries[count].subjectIndex = j;
            entries[count].present = students[i].countPresent(code);
            entries[count].total = total;
            entries[count].percentage = students[i].getPercentage(code);
            count++;
        }
    }
    return count;
}

// Counts who was present and absent in each subject held on one date.
DailyReportData Report::dailyReport(const Student students[], const Subject subjects[],
                                    const Date& date) {
    DailyReportData data;
    data.lineCount = 0;

    for (int i = 0; i < Subject::getCount(); i++) {
        string code = subjects[i].getCode();

        int present = 0;
        int absent = 0;
        for (int j = 0; j < Student::getCount(); j++) {
            char status = students[j].getStatus(code, date);
            if (status == 'P') {
                present++;
            } else if (status == 'A') {
                absent++;
            }
        }

        // No marks means this subject was not held on this date.
        if (present + absent == 0) {
            continue;
        }

        data.lines[data.lineCount].subjectIndex = i;
        data.lines[data.lineCount].present = present;
        data.lines[data.lineCount].absent = absent;
        data.lineCount++;
    }
    return data;
}

// Works out classes held, present count, and percentage for each student
// of one class in one month, across all subjects.
MonthlyReportData Report::monthlyReport(const Student students[], const string& className,
                                        int month, int year) {
    MonthlyReportData data;
    data.lineCount = 0;
    data.anyRecords = false;

    for (int i = 0; i < Student::getCount(); i++) {
        if (students[i].getClassName() != className) {
            continue;
        }

        MonthlyLine& line = data.lines[data.lineCount];
        line.studentIndex = i;
        line.held = students[i].countTotal(month, year);
        line.present = students[i].countPresent(month, year);
        line.percentage = Student::calcPercentage(line.present, line.held);
        data.lineCount++;

        if (line.held > 0) {
            data.anyRecords = true;
        }
    }
    return data;
}
