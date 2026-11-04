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
