// ApiServer.cpp
// Starts the server, lists the routes, and holds the helpers every route uses.

#include "ApiServer.h"

#include <iostream>

#include "Utils.h"
#include "httplib.h"

using namespace std;
using httplib::Request;
using httplib::Response;
using nlohmann::json;

const size_t MAX_BODY_BYTES = 64 * 1024;   // no real request comes close to this

// ---------- Starting up ----------

// Replaces every password. Used on the public site, where the sample
// passwords would otherwise be known to anyone who reads the repository.
void ApiServer::useDemoPassword(const string& password) {
    Result result = app.setAllPasswords(password);
    if (result.isOk()) {
        cout << "Using the password from DEMO_PASSWORD for every account." << endl;
    } else {
        cout << "DEMO_PASSWORD ignored: " << result.getMessage() << endl;
    }
}

// Adds headers that tell browsers to be strict with this site. Scripts may
// only come from here and from the Chart.js CDN, which blocks injected code.
void ApiServer::applySecurityHeaders(httplib::Server& server) {
    server.set_default_headers({
        {"X-Content-Type-Options", "nosniff"},
        {"Referrer-Policy", "no-referrer"},
        {"Content-Security-Policy",
         "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; "
         "style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; "
         "img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'"}
    });
}

// Connects each URL to the member function that handles it.
void ApiServer::registerRoutes(httplib::Server& server) {
    server.Get("/api/health", [this](const Request& req, Response& res) { handleHealth(req, res); });

    server.Post("/api/login", [this](const Request& req, Response& res) { handleLogin(req, res); });
    server.Post("/api/logout", [this](const Request& req, Response& res) { handleLogout(req, res); });
    server.Get("/api/me", [this](const Request& req, Response& res) { handleMe(req, res); });
    server.Post("/api/account/password",
                [this](const Request& req, Response& res) { handleChangePassword(req, res); });

    server.Get("/api/teachers", [this](const Request& req, Response& res) { handleListTeachers(req, res); });
    server.Post("/api/teachers", [this](const Request& req, Response& res) { handleAddTeacher(req, res); });

    server.Get("/api/students", [this](const Request& req, Response& res) { handleListStudents(req, res); });
    server.Post("/api/students", [this](const Request& req, Response& res) { handleAddStudent(req, res); });
    server.Get(R"(/api/students/(\d+))",
               [this](const Request& req, Response& res) { handleGetStudent(req, res); });
    server.Put(R"(/api/students/(\d+))",
               [this](const Request& req, Response& res) { handleUpdateStudent(req, res); });
    server.Delete(R"(/api/students/(\d+))",
                  [this](const Request& req, Response& res) { handleDeleteStudent(req, res); });

    server.Get("/api/subjects", [this](const Request& req, Response& res) { handleListSubjects(req, res); });
    server.Post("/api/subjects", [this](const Request& req, Response& res) { handleAddSubject(req, res); });
    server.Get("/api/classes", [this](const Request& req, Response& res) { handleListClasses(req, res); });

    server.Get("/api/attendance/sheet",
               [this](const Request& req, Response& res) { handleAttendanceSheet(req, res); });
    server.Post("/api/attendance", [this](const Request& req, Response& res) { handleMarkAttendance(req, res); });
    server.Put("/api/attendance", [this](const Request& req, Response& res) { handleEditAttendance(req, res); });

    server.Get("/api/dashboard", [this](const Request& req, Response& res) { handleDashboard(req, res); });
    server.Get(R"(/api/reports/student/(\d+))",
               [this](const Request& req, Response& res) { handleStudentReport(req, res); });
    server.Get("/api/reports/defaulters",
               [this](const Request& req, Response& res) { handleDefaulters(req, res); });
    server.Get("/api/reports/daily", [this](const Request& req, Response& res) { handleDailyReport(req, res); });
    server.Get("/api/reports/monthly",
               [this](const Request& req, Response& res) { handleMonthlyReport(req, res); });
}

// Sets up the server and runs until the program is stopped.
bool ApiServer::start(const string& host, int port) {
    httplib::Server server;

    applySecurityHeaders(server);
    server.set_payload_max_length(MAX_BODY_BYTES);

    // Only web/ is served. The data/ folder has no URL at all.
    if (!server.set_mount_point("/", "./web")) {
        cout << "Error: the web folder was not found. Run the server from the project folder." << endl;
        return false;
    }

    registerRoutes(server);

    // Any /api/ error that a handler did not answer still gets a JSON reply.
    server.set_error_handler([](const Request& req, Response& res) {
        if (res.body.empty() && req.path.find("/api/") == 0) {
            if (res.status == 404) {
                sendError(res, 404, "NOT_FOUND", "This address does not exist.");
            } else {
                sendError(res, res.status, "INVALID", "The request could not be processed.");
            }
        }
    });

    // A bug in a handler must not stop the server for everybody else.
    server.set_exception_handler([](const Request&, Response& res, exception_ptr) {
        sendError(res, 500, "SERVER_ERROR", "Something went wrong on the server.");
    });

    cout << "Server running at http://" << (host == "0.0.0.0" ? "localhost" : host)
         << ":" << port << endl;
    cout << "Press Ctrl+C to stop." << endl;

    if (!server.listen(host, port)) {
        cout << "Error: could not use port " << port << ". Is the server already running?" << endl;
        return false;
    }
    return true;
}

// ---------- Helpers for handlers ----------

// Finds out who is calling, from the "Authorization: Bearer <token>" header.
// Returns the teacher's index. If nobody is logged in, sends 401 and returns -1.
int ApiServer::requireLogin(const Request& req, Response& res) {
    const string prefix = "Bearer ";
    string header = req.get_header_value("Authorization");

    int teacher = -1;
    if (header.find(prefix) == 0) {
        teacher = sessions.findTeacher(header.substr(prefix.length()));
    }

    if (teacher == -1) {
        sendError(res, 401, "UNAUTHORIZED", "Please log in.");
    }
    return teacher;
}

// Reads the JSON body. If it is not a JSON object, sends 400 and returns false.
// Passing false means a bad body gives an empty value instead of an exception.
bool ApiServer::readBody(const Request& req, Response& res, json& body) {
    body = json::parse(req.body, nullptr, false);
    if (body.is_discarded() || !body.is_object()) {
        sendError(res, 400, "INVALID", "The request body must be valid JSON.");
        return false;
    }
    return true;
}

// Returns a text field from a JSON object, or "" if it is missing or is not
// text. The core then rejects it with a normal message.
string ApiServer::textField(const json& body, const string& name) {
    json::const_iterator value = body.find(name);
    if (value != body.end() && value->is_string()) {
        return value->get<string>();
    }
    return "";
}

// Returns the number in an address like /api/students/2, or -1.
int ApiServer::pathId(const Request& req) const {
    int id;
    if (req.matches.size() < 2 || !parseInt(req.matches[1].str(), id)) {
        return -1;
    }
    return id;
}

// Returns a whole number from a JSON object, or -1 if it is missing or is not
// a number that fits in an int.
int ApiServer::numberField(const json& body, const string& name) {
    json::const_iterator value = body.find(name);
    if (value != body.end() && value->is_number_integer()) {
        long long number = value->get<long long>();
        if (number >= 0 && number <= 2147483647) {
            return (int)number;
        }
    }
    return -1;
}

// Reads a date in either YYYY-MM-DD, as browsers send it, or DD-MM-YYYY.
// Bad text gives a date that is not real, which the core then rejects.
Date ApiServer::dateFrom(const string& text) {
    Date date(0, 0, 0);
    if (!Date::parseIso(text, date)) {
        Date::parse(text, date);
    }
    return date;
}

// ---------- Sending replies ----------

// Sends any JSON reply. API replies must never be cached by the browser.
void ApiServer::sendJson(Response& res, int status, const json& body) {
    res.status = status;
    res.set_header("Cache-Control", "no-store");
    res.set_content(body.dump(-1, ' ', false, json::error_handler_t::replace), "application/json");
}

// Sends an error in the shape every API error uses.
void ApiServer::sendError(Response& res, int status, const string& code,
                          const string& message, const string& field) {
    json out;
    out["ok"] = false;
    out["code"] = code;
    out["error"] = message;
    if (!field.empty()) {
        out["field"] = field;
    }
    sendJson(res, status, out);
}

// Turns the Result from a core action into an HTTP reply.
void ApiServer::sendResult(Response& res, const Result& result, int successStatus) {
    switch (result.getCode()) {
        case RESULT_OK: {
            json out;
            out["ok"] = true;
            out["message"] = result.getMessage();
            sendJson(res, successStatus, out);
            break;
        }
        case RESULT_INVALID:
            sendError(res, 400, "INVALID", result.getMessage(), result.getField());
            break;
        case RESULT_NOT_FOUND:
            sendError(res, 404, "NOT_FOUND", result.getMessage(), result.getField());
            break;
        case RESULT_DUPLICATE:
            sendError(res, 409, "DUPLICATE", result.getMessage(), result.getField());
            break;
        case RESULT_NEEDS_CONFIRM:
            sendError(res, 409, "NEEDS_CONFIRM", result.getMessage(), result.getField());
            break;
        case RESULT_LIMIT:
            sendError(res, 409, "LIMIT", result.getMessage(), result.getField());
            break;
        case RESULT_FORBIDDEN:
            sendError(res, 403, "FORBIDDEN", result.getMessage(), result.getField());
            break;
        case RESULT_SAVE_FAILED:
            sendError(res, 500, "SAVE_FAILED", result.getMessage(), result.getField());
            break;
    }
}
