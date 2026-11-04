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

// Puts the lowest attendance first, with a selection sort. The web pages use
// this, because the students in most danger should be seen first.
void Report::sortByPercentage(DefaulterEntry entries[], int count) {
    for (int i = 0; i < count - 1; i++) {
        int lowest = i;
        for (int j = i + 1; j < count; j++) {
            if (entries[j].percentage < entries[lowest].percentage) {
                lowest = j;
            }
        }
        DefaulterEntry temp = entries[i];
        entries[i] = entries[lowest];
        entries[lowest] = temp;
    }
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

// Finds where a day belongs in points[], which is kept oldest first, and adds
// it if it is new. When the array is full, the oldest day is dropped.
// Returns the day's index, or -1 if it is older than every day being kept.
static int placeForDay(TrendPoint points[], int& count, int maxPoints, const Date& date) {
    int place = 0;
    while (place < count && date.isAfter(points[place].date)) {
        place++;
    }
    if (place < count && points[place].date.equals(date)) {
        return place;
    }

    if (count == maxPoints) {
        if (place == 0) {
            return -1;
        }
        for (int i = 0; i < place - 1; i++) {      // drop the oldest day
            points[i] = points[i + 1];
        }
        place--;
    } else {
        for (int i = count; i > place; i--) {      // make a gap for the new day
            points[i] = points[i - 1];
        }
        count++;
    }

    points[place].date = date;
    points[place].present = 0;
    points[place].total = 0;
    return place;
}

// Works out attendance for the latest days that have marks, oldest first.
// Only marked days count, so a chart stays filled over weekends and holidays.
// Fills points[] and returns how many days were found.
int Report::dailyTrend(const Student students[], TrendPoint points[], int maxPoints) {
    int count = 0;

    for (int i = 0; i < Student::getCount(); i++) {
        for (int j = 0; j < students[i].getRecordCount(); j++) {
            const AttendanceRecord& record = students[i].getRecord(j);

            int place = placeForDay(points, count, maxPoints, record.getDate());
            if (place == -1) {
                continue;
            }
            points[place].total++;
            if (record.isPresent()) {
                points[place].present++;
            }
        }
    }

    for (int i = 0; i < count; i++) {
        points[i].percentage = Student::calcPercentage(points[i].present, points[i].total);
    }
    return count;
}

// Works out attendance in each subject, across all of its students.
// Fills lines[] and returns how many subjects there are.
int Report::subjectSummary(const Student students[], const Subject subjects[],
                           SubjectLine lines[]) {
    for (int i = 0; i < Subject::getCount(); i++) {
        string code = subjects[i].getCode();

        int present = 0;
        int total = 0;
        for (int j = 0; j < Student::getCount(); j++) {
            present += students[j].countPresent(code);
            total += students[j].countTotal(code);
        }

        lines[i].subjectIndex = i;
        lines[i].present = present;
        lines[i].total = total;
        lines[i].percentage = Student::calcPercentage(present, total);
        lines[i].belowLimit = total > 0 && isBelowLimit(lines[i].percentage);
    }
    return Subject::getCount();
}

// Works out the headline numbers for the dashboard.
DashboardData Report::dashboardStats(const Student students[], const Subject subjects[]) {
    DashboardData data;
    data.studentCount = Student::getCount();
    data.subjectCount = Subject::getCount();

    // The latest marked day tells us about both "today" and "last marked".
    TrendPoint latest;
    data.anyMarks = dailyTrend(students, &latest, 1) > 0;
    data.todayMarked = data.anyMarks && latest.date.equals(Date::today());
    data.todayPresent = data.todayMarked ? latest.present : 0;
    data.todayTotal = data.todayMarked ? latest.total : 0;
    data.todayPercentage = data.todayMarked ? latest.percentage : 0.0;
    data.lastMarkedDate = data.anyMarks ? latest.date : Date();
    data.lastMarkedPercentage = data.anyMarks ? latest.percentage : 0.0;

    data.overallPresent = 0;
    data.overallTotal = 0;
    for (int i = 0; i < Student::getCount(); i++) {
        data.overallPresent += students[i].countPresent();
        data.overallTotal += students[i].countTotal();
    }
    data.overallPercentage = Student::calcPercentage(data.overallPresent, data.overallTotal);

    DefaulterEntry entries[MAX_DEFAULTER_ENTRIES];
    data.defaulterEntries = defaulterList(students, subjects, entries);

    // Entries are grouped by student, so a new student starts when the index changes.
    data.defaulterStudents = 0;
    for (int i = 0; i < data.defaulterEntries; i++) {
        if (i == 0 || entries[i].studentIndex != entries[i - 1].studentIndex) {
            data.defaulterStudents++;
        }
    }
    return data;
}
