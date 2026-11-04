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

class ApiServer {
private:
    AttendanceSystem app;       // creating this loads the data files
    SessionManager sessions;
    std::mutex dataLock;

    void registerRoutes(httplib::Server& server);
    void applySecurityHeaders(httplib::Server& server);

    // Shared helpers for handlers
    int requireLogin(const httplib::Request& req, httplib::Response& res);
    bool readBody(const httplib::Request& req, httplib::Response& res, nlohmann::json& body);

    // Login and accounts (AuthRoutes.cpp)
    void handleHealth(const httplib::Request& req, httplib::Response& res);
    void handleLogin(const httplib::Request& req, httplib::Response& res);
    void handleLogout(const httplib::Request& req, httplib::Response& res);
    void handleMe(const httplib::Request& req, httplib::Response& res);
    void handleChangePassword(const httplib::Request& req, httplib::Response& res);
    void handleListTeachers(const httplib::Request& req, httplib::Response& res);
    void handleAddTeacher(const httplib::Request& req, httplib::Response& res);

    // Reports (ReportRoutes.cpp)
    void handleDashboard(const httplib::Request& req, httplib::Response& res);

public:
    void useDemoPassword(const std::string& password);
    bool start(const std::string& host, int port);

    // Reply helpers, shared by every route file
    static void sendJson(httplib::Response& res, int status, const nlohmann::json& body);
    static void sendError(httplib::Response& res, int status, const std::string& code,
                          const std::string& message, const std::string& field = "");
    static void sendResult(httplib::Response& res, const Result& result, int successStatus = 200);
    static std::string textField(const nlohmann::json& body, const std::string& name);
};

#endif
