// ApiServer.h
// The web server. It receives HTTP requests, calls the same core classes as
// the terminal version, and answers with JSON. It makes no decisions itself.
//
// cpp-httplib handles requests on several threads, but the arrays, static
// counters, and files are shared. Each handler therefore locks dataLock first,
// so only one request at a time can touch the data.

#ifndef APISERVER_H
#define APISERVER_H

#include <mutex>
#include <string>

#include "AttendanceSystem.h"
#include "Date.h"
#include "Result.h"
#include "SessionManager.h"
#include "json.hpp"

// Declared here and included only in the .cpp files, because httplib.h is
// large and slows down every file that includes it.
namespace httplib {
class Server;
struct Request;
struct Response;
}

const int MAX_ALLOWED_ORIGINS = 10;   // sites that may call this API from a browser

class ApiServer {
private:
    AttendanceSystem app;       // creating this loads the data files
    SessionManager sessions;
    std::mutex dataLock;

    std::string allowedOrigins[MAX_ALLOWED_ORIGINS];
    int originCount;

    void registerRoutes(httplib::Server& server);
    void applySecurityHeaders(httplib::Server& server);
    void applyCors(httplib::Server& server);
    bool isAllowedOrigin(const std::string& origin) const;

    // Shared helpers for handlers
    int requireLogin(const httplib::Request& req, httplib::Response& res);
    bool readBody(const httplib::Request& req, httplib::Response& res, nlohmann::json& body);
    int pathId(const httplib::Request& req) const;

    // Login and accounts (AuthRoutes.cpp)
    void handleHealth(const httplib::Request& req, httplib::Response& res);
    void handleLogin(const httplib::Request& req, httplib::Response& res);
    void handleLogout(const httplib::Request& req, httplib::Response& res);
    void handleMe(const httplib::Request& req, httplib::Response& res);
    void handleChangePassword(const httplib::Request& req, httplib::Response& res);
    void handleListTeachers(const httplib::Request& req, httplib::Response& res);
    void handleAddTeacher(const httplib::Request& req, httplib::Response& res);

    // Students (StudentRoutes.cpp)
    void handleListStudents(const httplib::Request& req, httplib::Response& res);
    void handleGetStudent(const httplib::Request& req, httplib::Response& res);
    void handleAddStudent(const httplib::Request& req, httplib::Response& res);
    void handleUpdateStudent(const httplib::Request& req, httplib::Response& res);
    void handleDeleteStudent(const httplib::Request& req, httplib::Response& res);

    // Subjects and attendance (AttendanceRoutes.cpp)
    void handleListSubjects(const httplib::Request& req, httplib::Response& res);
    void handleAddSubject(const httplib::Request& req, httplib::Response& res);
    void handleListClasses(const httplib::Request& req, httplib::Response& res);
    void handleAttendanceSheet(const httplib::Request& req, httplib::Response& res);
    void handleMarkAttendance(const httplib::Request& req, httplib::Response& res);
    void handleEditAttendance(const httplib::Request& req, httplib::Response& res);

    // Reports (ReportRoutes.cpp)
    void handleDashboard(const httplib::Request& req, httplib::Response& res);
    void handleStudentReport(const httplib::Request& req, httplib::Response& res);
    void handleDefaulters(const httplib::Request& req, httplib::Response& res);
    void handleDailyReport(const httplib::Request& req, httplib::Response& res);
    void handleMonthlyReport(const httplib::Request& req, httplib::Response& res);

public:
    ApiServer();

    void allowOrigins(const std::string& list);
    void useDemoPassword(const std::string& password);
    bool start(const std::string& host, int port);

    // Reply helpers, shared by every route file
    static void sendJson(httplib::Response& res, int status, const nlohmann::json& body);
    static void sendError(httplib::Response& res, int status, const std::string& code,
                          const std::string& message, const std::string& field = "");
    static void sendResult(httplib::Response& res, const Result& result, int successStatus = 200);
    static std::string textField(const nlohmann::json& body, const std::string& name);
    static int numberField(const nlohmann::json& body, const std::string& name);
    static Date dateFrom(const std::string& text);
};

#endif
