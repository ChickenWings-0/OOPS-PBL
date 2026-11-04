// AuthRoutes.cpp
// Route handlers for health, login, accounts, and teachers.

#include <sstream>

#include "ApiServer.h"
#include "JsonMapper.h"
#include "Utils.h"
#include "httplib.h"

using namespace std;
using httplib::Request;
using httplib::Response;
using nlohmann::json;

// GET /api/health. Render calls this to check that the server is alive.
// It touches no shared data, so it needs no lock.
void ApiServer::handleHealth(const Request&, Response& res) {
    json out;
    out["ok"] = true;
    sendJson(res, 200, out);
}

// POST /api/login. Checks the details and creates a session.
void ApiServer::handleLogin(const Request& req, Response& res) {
    lock_guard<mutex> guard(dataLock);

    json body;
    if (!readBody(req, res, body)) {
        return;
    }
    string username = trim(textField(body, "username"));
    string password = trim(textField(body, "password"));

    // A locked username is refused even if the password is right.
    int known = app.findTeacher(username);
    if (known != -1 && sessions.secondsLocked(known) > 0) {
        stringstream message;
        message << "Too many attempts. Try again in " << sessions.secondsLocked(known) << " seconds.";
        sendError(res, 429, "LOCKED", message.str());
        return;
    }

    int teacher = app.checkLogin(username, password);
    if (teacher == -1) {
        if (known != -1) {
            sessions.loginFailed(known);
            if (sessions.secondsLocked(known) > 0) {
                stringstream message;
                message << "Too many attempts. Try again in " << sessions.secondsLocked(known)
                        << " seconds.";
                sendError(res, 429, "LOCKED", message.str());
                return;
            }
        }
        sendError(res, 401, "UNAUTHORIZED", "Wrong username or password.");
        return;
    }

    sessions.loginWorked(teacher);

    json out;
    out["ok"] = true;
    out["token"] = sessions.create(teacher);
    out["user"] = JsonMapper::user(app.getTeacher(teacher));
    sendJson(res, 200, out);
}

// POST /api/logout. Ends the session, so the token stops working.
void ApiServer::handleLogout(const Request& req, Response& res) {
    lock_guard<mutex> guard(dataLock);

    if (requireLogin(req, res) == -1) {
        return;
    }

    string header = req.get_header_value("Authorization");
    sessions.remove(header.substr(string("Bearer ").length()));

    json out;
    out["ok"] = true;
    sendJson(res, 200, out);
}

// GET /api/me. Tells the frontend who is logged in and what today's date is.
void ApiServer::handleMe(const Request& req, Response& res) {
    lock_guard<mutex> guard(dataLock);

    int teacher = requireLogin(req, res);
    if (teacher == -1) {
        return;
    }

    json out;
    out["ok"] = true;
    out["user"] = JsonMapper::user(app.getTeacher(teacher));
    out["today"] = JsonMapper::today();
    sendJson(res, 200, out);
}

// POST /api/account/password. Changes the caller's own password.
void ApiServer::handleChangePassword(const Request& req, Response& res) {
    lock_guard<mutex> guard(dataLock);

    int teacher = requireLogin(req, res);
    if (teacher == -1) {
        return;
    }

    json body;
    if (!readBody(req, res, body)) {
        return;
    }

    sendResult(res, app.changePassword(teacher, textField(body, "currentPassword"),
                                       textField(body, "newPassword")));
}

// GET /api/teachers. Admin only: the core decides, not the browser.
void ApiServer::handleListTeachers(const Request& req, Response& res) {
    lock_guard<mutex> guard(dataLock);

    int teacher = requireLogin(req, res);
    if (teacher == -1) {
        return;
    }

    Result allowed = app.canViewTeachers(teacher);
    if (!allowed.isOk()) {
        sendResult(res, allowed);
        return;
    }

    json rows = json::array();
    for (int i = 0; i < Teacher::getCount(); i++) {
        rows.push_back(JsonMapper::teacherRow(app.getTeacher(i)));
    }

    json out;
    out["ok"] = true;
    out["total"] = Teacher::getCount();
    out["teachers"] = rows;
    sendJson(res, 200, out);
}

// POST /api/teachers. Admin only, checked inside addTeacher.
void ApiServer::handleAddTeacher(const Request& req, Response& res) {
    lock_guard<mutex> guard(dataLock);

    int teacher = requireLogin(req, res);
    if (teacher == -1) {
        return;
    }

    json body;
    if (!readBody(req, res, body)) {
        return;
    }

    sendResult(res, app.addTeacher(teacher, textField(body, "name"), textField(body, "username"),
                                   textField(body, "password")), 201);
}
