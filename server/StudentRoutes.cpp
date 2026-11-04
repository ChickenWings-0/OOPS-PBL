// StudentRoutes.cpp
// Route handlers for students. Each handler reads the request, calls the core,
// and sends the answer. All rules stay in AttendanceSystem.

#include "ApiServer.h"
#include "JsonMapper.h"
#include "httplib.h"

using namespace std;
using httplib::Request;
using httplib::Response;
using nlohmann::json;

// GET /api/students?q=&sort=&order=. C++ searches and sorts, not the browser.
void ApiServer::handleListStudents(const Request& req, Response& res) {
    lock_guard<mutex> guard(dataLock);

    if (requireLogin(req, res) == -1) {
        return;
    }

    int matches[MAX_STUDENTS];
    int count = app.listStudents(req.get_param_value("q"), req.get_param_value("sort"),
                                 req.get_param_value("order") != "desc", matches);

    json rows = json::array();
    for (int i = 0; i < count; i++) {
        rows.push_back(JsonMapper::studentRow(app.getStudent(matches[i])));
    }

    json out;
    out["ok"] = true;
    out["total"] = count;
    out["allStudents"] = Student::getCount();
    out["students"] = rows;
    sendJson(res, 200, out);
}

// GET /api/students/{id}. Finds one student by internal ID.
void ApiServer::handleGetStudent(const Request& req, Response& res) {
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

    json out;
    out["ok"] = true;
    out["student"] = JsonMapper::studentRow(app.getStudent(index));
    sendJson(res, 200, out);
}

// POST /api/students. The same addStudent that the terminal calls.
void ApiServer::handleAddStudent(const Request& req, Response& res) {
    lock_guard<mutex> guard(dataLock);

    if (requireLogin(req, res) == -1) {
        return;
    }

    json body;
    if (!readBody(req, res, body)) {
        return;
    }

    json::const_iterator confirmed = body.find("confirmed");
    bool isConfirmed = confirmed != body.end() && confirmed->is_boolean() && confirmed->get<bool>();

    sendResult(res, app.addStudent(textField(body, "rollNo"), textField(body, "name"),
                                   textField(body, "className"), isConfirmed), 201);
}

// PUT /api/students/{id}. An empty field is an error here: the terminal's
// "press Enter to keep" has no meaning in a form that shows the current value.
void ApiServer::handleUpdateStudent(const Request& req, Response& res) {
    lock_guard<mutex> guard(dataLock);

    if (requireLogin(req, res) == -1) {
        return;
    }

    json body;
    if (!readBody(req, res, body)) {
        return;
    }

    sendResult(res, app.updateStudent(app.findStudent(pathId(req)), textField(body, "rollNo"),
                                      textField(body, "name"), textField(body, "className")));
}

// DELETE /api/students/{id}. Also deletes the student's attendance.
void ApiServer::handleDeleteStudent(const Request& req, Response& res) {
    lock_guard<mutex> guard(dataLock);

    if (requireLogin(req, res) == -1) {
        return;
    }

    sendResult(res, app.deleteStudent(app.findStudent(pathId(req))));
}
