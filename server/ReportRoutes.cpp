// ReportRoutes.cpp
// Route handlers for the dashboard and the reports.

#include "ApiServer.h"
#include "JsonMapper.h"
#include "Report.h"
#include "Utils.h"
#include "httplib.h"

using namespace std;
using httplib::Request;
using httplib::Response;
using nlohmann::json;

const int TREND_DAYS = 14;        // how many marked days the dashboard chart shows
const int ATTENTION_ROWS = 6;     // how many low attendance rows the dashboard shows

// GET /api/dashboard. Every number on the dashboard is calculated here in C++.
void ApiServer::handleDashboard(const Request& req, Response& res) {
    lock_guard<mutex> guard(dataLock);

    if (requireLogin(req, res) == -1) {
        return;
    }

    const Student* students = app.getStudents();
    const Subject* subjects = app.getSubjects();

    TrendPoint trend[TREND_DAYS];
    int trendCount = Report::dailyTrend(students, trend, TREND_DAYS);

    SubjectLine lines[MAX_SUBJECTS];
    int lineCount = Report::subjectSummary(students, subjects, lines);

    string classes[MAX_CLASSES];
    int classCount = app.listClasses(classes);

    json out = JsonMapper::dashboard(Report::dashboardStats(students, subjects), trend, trendCount,
                                     lines, lineCount, subjects, classCount);

    // The students in most danger, lowest attendance first.
    DefaulterEntry entries[MAX_DEFAULTER_ENTRIES];
    int count = Report::defaulterList(students, subjects, entries);
    Report::sortByPercentage(entries, count);

    json attention = json::array();
    for (int i = 0; i < count && i < ATTENTION_ROWS; i++) {
        attention.push_back(JsonMapper::defaulterRow(entries[i], students, subjects));
    }
    out["attention"] = attention;

    SessionLine recent[MAX_RECENT_SESSIONS];
    int recentCount = Report::recentSessions(students, subjects, recent);
    out["recent"] = JsonMapper::recentSessions(recent, recentCount, subjects);

    sendJson(res, 200, out);
}

// GET /api/reports/student/{id}. One student's attendance.
void ApiServer::handleStudentReport(const Request& req, Response& res) {
    lock_guard<mutex> guard(dataLock);

    if (requireLogin(req, res) == -1) {
        return;
    }

    int index = app.findStudent(pathId(req));
    Result found = app.checkStudentExists(index);
    if (!found.isOk()) {
        sendResult(res, found);
        return;
    }

    const Student& student = app.getStudent(index);
    sendJson(res, 200, JsonMapper::studentReport(student, app.getSubjects(),
                                                 Report::studentReport(student, app.getSubjects())));
}

// GET /api/reports/defaulters. Everyone below the limit, lowest first.
void ApiServer::handleDefaulters(const Request& req, Response& res) {
    lock_guard<mutex> guard(dataLock);

    if (requireLogin(req, res) == -1) {
        return;
    }

    const Student* students = app.getStudents();
    const Subject* subjects = app.getSubjects();

    DefaulterEntry entries[MAX_DEFAULTER_ENTRIES];
    int count = Report::defaulterList(students, subjects, entries);
    Report::sortByPercentage(entries, count);

    json rows = json::array();
    for (int i = 0; i < count; i++) {
        rows.push_back(JsonMapper::defaulterRow(entries[i], students, subjects));
    }

    json out;
    out["ok"] = true;
    out["limit"] = (int)Student::DEFAULTER_LIMIT;
    out["total"] = count;
    out["entries"] = rows;
    sendJson(res, 200, out);
}

// GET /api/reports/daily?date=. Who was present and absent on one date.
void ApiServer::handleDailyReport(const Request& req, Response& res) {
    lock_guard<mutex> guard(dataLock);

    if (requireLogin(req, res) == -1) {
        return;
    }

    Date date = dateFrom(req.get_param_value("date"));
    Result check = checkClassDate(date);
    if (!check.isOk()) {
        sendResult(res, check);
        return;
    }

    const Student* students = app.getStudents();
    const Subject* subjects = app.getSubjects();
    sendJson(res, 200, JsonMapper::dailyReport(students, subjects, date,
                                               Report::dailyReport(students, subjects, date)));
}

// GET /api/reports/monthly?class=&month=YYYY-MM. One class in one month.
void ApiServer::handleMonthlyReport(const Request& req, Response& res) {
    lock_guard<mutex> guard(dataLock);

    if (requireLogin(req, res) == -1) {
        return;
    }

    // Reading the first day of the month checks both the month and the year.
    Date firstDay;
    if (!Date::parseIso(req.get_param_value("month") + "-01", firstDay)) {
        sendResult(res, Result(RESULT_INVALID, "Please choose a month.", "month"));
        return;
    }

    string className = toUpper(trim(req.get_param_value("class")));
    int month = firstDay.getMonth();
    int year = firstDay.getYear();

    sendJson(res, 200, JsonMapper::monthlyReport(app.getStudents(), className, month, year,
                                                 Report::monthlyReport(app.getStudents(), className,
                                                                       month, year)));
}
