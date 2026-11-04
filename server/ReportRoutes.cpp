// ReportRoutes.cpp
// Route handlers for the dashboard and the reports.

#include "ApiServer.h"
#include "JsonMapper.h"
#include "Report.h"
#include "httplib.h"

using namespace std;
using httplib::Request;
using httplib::Response;
using nlohmann::json;

const int TREND_DAYS = 14;   // how many marked days the dashboard chart shows

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

    sendJson(res, 200, JsonMapper::dashboard(Report::dashboardStats(students, subjects),
                                             trend, trendCount, lines, lineCount, subjects));
}
