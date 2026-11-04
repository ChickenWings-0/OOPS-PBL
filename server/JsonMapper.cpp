// JsonMapper.cpp
// Implementation of the JsonMapper class.

#include "JsonMapper.h"

#include <cctype>
#include <cmath>
#include <sstream>

using namespace std;
using nlohmann::json;

const int RECENT_MARKS = 10;   // how many past marks a row shows

// Rounds to two decimals, so 80.5555 is sent as 80.56.
double JsonMapper::rounded(double percentage) {
    return floor(percentage * 100.0 + 0.5) / 100.0;
}

// Returns up to two capital letters for the avatar: Neha Kapoor gives NK.
string JsonMapper::initials(const string& name) {
    string result;
    stringstream words(name);
    string word;
    while (words >> word && result.length() < 2) {
        result += (char)toupper((unsigned char)word[0]);
    }
    return result;
}

// The logged-in user, as the frontend needs them.
json JsonMapper::user(const Teacher& teacher) {
    json out;
    out["name"] = teacher.getName();
    out["username"] = teacher.getUsername();
    out["initials"] = initials(teacher.getName());
    out["isAdmin"] = teacher.isAdmin();
    return out;
}

// One row of the students table.
json JsonMapper::studentRow(const Student& student) {
    json out;
    out["id"] = student.getId();
    out["rollNo"] = student.getRollNo();
    out["name"] = student.getName();
    out["className"] = student.getClassName();
    return out;
}

// One row of the subjects table.
json JsonMapper::subjectRow(const Subject& subject) {
    json out;
    out["code"] = subject.getCode();
    out["name"] = subject.getName();
    out["className"] = subject.getClassName();
    return out;
}

// One row of the teachers table. There is no password here.
json JsonMapper::teacherRow(const Teacher& teacher) {
    json out;
    out["id"] = teacher.getId();
    out["name"] = teacher.getName();
    out["username"] = teacher.getUsername();
    out["isAdmin"] = teacher.isAdmin();
    return out;
}

// Today's date, for showing and for browser date inputs.
json JsonMapper::today() {
    Date date = Date::today();
    json out;
    out["date"] = date.toString();
    out["dateIso"] = date.toIso();
    out["long"] = date.longLabel();
    out["month"] = date.toIso().substr(0, 7);
    return out;
}

// The latest day with marks, so report pages can open on a day with data.
json JsonMapper::lastMarked(bool anyMarks, const Date& date) {
    Date shown = anyMarks ? date : Date::today();
    json out;
    out["dateIso"] = shown.toIso();
    out["month"] = shown.toIso().substr(0, 7);
    return out;
}

// One student who is below the limit in one subject.
json JsonMapper::defaulterRow(const DefaulterEntry& entry, const Student students[],
                              const Subject subjects[]) {
    const Student& student = students[entry.studentIndex];
    const Subject& subject = subjects[entry.subjectIndex];

    json out;
    out["studentId"] = student.getId();
    out["rollNo"] = student.getRollNo();
    out["name"] = student.getName();
    out["className"] = student.getClassName();
    out["subject"] = subject.getCode();
    out["subjectName"] = subject.getName();
    out["present"] = entry.present;
    out["total"] = entry.total;
    out["percent"] = rounded(entry.percentage);
    out["percentText"] = Report::percentText(entry.percentage);
    out["marks"] = student.markHistory(subject.getCode(), RECENT_MARKS);
    return out;
}

// Turns one subject's figures into its status word. The frontend only
// picks a colour from this, so it never compares anything to 75.
static string statusWord(int total, bool belowLimit) {
    if (total == 0) {
        return "none";
    }
    return belowLimit ? "low" : "ok";
}

// One student's attendance in each subject, and overall.
json JsonMapper::studentReport(const Student& student, const Subject subjects[],
                               const StudentReportData& data) {
    json rows = json::array();
    for (int i = 0; i < data.lineCount; i++) {
        const SubjectLine& line = data.lines[i];
        const Subject& subject = subjects[line.subjectIndex];

        json row;
        row["code"] = subject.getCode();
        row["name"] = subject.getName();
        row["present"] = line.present;
        row["total"] = line.total;
        row["percent"] = rounded(line.percentage);
        row["percentText"] = Report::percentText(line.percentage);
        row["status"] = statusWord(line.total, line.belowLimit);
        row["marks"] = student.markHistory(subject.getCode(), RECENT_MARKS);
        rows.push_back(row);
    }

    json overall;
    overall["present"] = data.overallPresent;
    overall["total"] = data.overallTotal;
    overall["percent"] = rounded(data.overallPercentage);
    overall["percentText"] = Report::percentText(data.overallPercentage);

    json out;
    out["ok"] = true;
    out["student"] = studentRow(student);
    out["limit"] = (int)Student::DEFAULTER_LIMIT;
    out["subjects"] = rows;
    out["overall"] = overall;
    return out;
}

// Who was present and absent in each subject held on one date.
json JsonMapper::dailyReport(const Student students[], const Subject subjects[],
                             const Date& date, const DailyReportData& data) {
    json rows = json::array();
    for (int i = 0; i < data.lineCount; i++) {
        const Subject& subject = subjects[data.lines[i].subjectIndex];

        json people = json::array();
        for (int j = 0; j < Student::getCount(); j++) {
            char status = students[j].getStatus(subject.getCode(), date);
            if (status != '-') {
                json person = studentRow(students[j]);
                person["status"] = status == 'P' ? "Present" : "Absent";
                people.push_back(person);
            }
        }

        json row = subjectRow(subject);
        row["present"] = data.lines[i].present;
        row["absent"] = data.lines[i].absent;
        row["students"] = people;
        rows.push_back(row);
    }

    json out;
    out["ok"] = true;
    out["date"] = date.toString();
    out["dateIso"] = date.toIso();
    out["subjects"] = rows;
    return out;
}

// Classes held, present count, and percentage for each student of one class.
json JsonMapper::monthlyReport(const Student students[], const string& className,
                               int month, int year, const MonthlyReportData& data) {
    json rows = json::array();
    for (int i = 0; i < data.lineCount; i++) {
        const MonthlyLine& line = data.lines[i];
        json row = studentRow(students[line.studentIndex]);
        row["held"] = line.held;
        row["present"] = line.present;
        row["percent"] = rounded(line.percentage);
        row["percentText"] = line.held > 0 ? Report::percentText(line.percentage) : "No classes yet";
        row["status"] = statusWord(line.held, Report::isBelowLimit(line.percentage));
        rows.push_back(row);
    }

    json out;
    out["ok"] = true;
    out["className"] = className;
    out["month"] = month;
    out["year"] = year;
    out["monthName"] = Date(1, month, year).monthLabel();
    out["limit"] = (int)Student::DEFAULTER_LIMIT;
    out["anyRecords"] = data.anyRecords;
    out["students"] = rows;
    return out;
}

// Everything the dashboard page shows.
json JsonMapper::dashboard(const DashboardData& data, const TrendPoint trend[], int trendCount,
                           const SubjectLine lines[], int lineCount, const Subject subjects[],
                           int classCount) {
    json cards;
    cards["students"] = data.studentCount;
    cards["subjects"] = data.subjectCount;
    cards["classes"] = classCount;
    cards["overallPresent"] = data.overallPresent;
    cards["overallTotal"] = data.overallTotal;
    cards["overallPercentText"] = Report::percentText(data.overallPercentage);
    cards["todayMarked"] = data.todayMarked;
    cards["todayPercentText"] = Report::percentText(data.todayPercentage);
    cards["todayPresent"] = data.todayPresent;
    cards["todayTotal"] = data.todayTotal;
    cards["anyMarks"] = data.anyMarks;
    cards["lastMarkedDate"] = data.anyMarks ? data.lastMarkedDate.toString() : "";
    cards["lastMarkedLabel"] = data.anyMarks ? data.lastMarkedDate.shortLabel() : "";
    cards["lastMarkedPercentText"] = Report::percentText(data.lastMarkedPercentage);
    cards["defaulterStudents"] = data.defaulterStudents;
    cards["defaulterEntries"] = data.defaulterEntries;

    json trendRows = json::array();
    for (int i = 0; i < trendCount; i++) {
        json row;
        row["date"] = trend[i].date.toString();
        row["label"] = trend[i].date.shortLabel();
        row["present"] = trend[i].present;
        row["total"] = trend[i].total;
        row["percent"] = rounded(trend[i].percentage);
        row["percentText"] = Report::percentText(trend[i].percentage);
        trendRows.push_back(row);
    }

    json subjectRows = json::array();
    for (int i = 0; i < lineCount; i++) {
        const Subject& subject = subjects[lines[i].subjectIndex];
        json row;
        row["code"] = subject.getCode();
        row["name"] = subject.getName();
        row["className"] = subject.getClassName();
        row["present"] = lines[i].present;
        row["total"] = lines[i].total;
        row["percent"] = rounded(lines[i].percentage);
        row["percentText"] = Report::percentText(lines[i].percentage);
        row["status"] = statusWord(lines[i].total, lines[i].belowLimit);
        subjectRows.push_back(row);
    }

    json out;
    out["ok"] = true;
    out["today"] = Date::today().toString();
    out["limit"] = (int)Student::DEFAULTER_LIMIT;
    out["cards"] = cards;
    out["trend"] = trendRows;
    out["subjects"] = subjectRows;
    return out;
}
