// AttendanceRoutes.cpp
// Route handlers for subjects, classes, and marking attendance.

#include "ApiServer.h"
#include "JsonMapper.h"
#include "Utils.h"
#include "httplib.h"

using namespace std;
using httplib::Request;
using httplib::Response;
using nlohmann::json;

// GET /api/subjects. Lists every subject.
void ApiServer::handleListSubjects(const Request& req, Response& res) {
    lock_guard<mutex> guard(dataLock);

    if (requireLogin(req, res) == -1) {
        return;
    }

    json rows = json::array();
    for (int i = 0; i < Subject::getCount(); i++) {
        rows.push_back(JsonMapper::subjectRow(app.getSubject(i)));
    }

    json out;
    out["ok"] = true;
    out["total"] = Subject::getCount();
    out["subjects"] = rows;
    sendJson(res, 200, out);
}

// POST /api/subjects. Adds a subject for one class.
void ApiServer::handleAddSubject(const Request& req, Response& res) {
    lock_guard<mutex> guard(dataLock);

    if (requireLogin(req, res) == -1) {
        return;
    }

    json body;
    if (!readBody(req, res, body)) {
        return;
    }

    sendResult(res, app.addSubject(textField(body, "code"), textField(body, "name"),
                                   textField(body, "className")), 201);
}

// GET /api/classes. Every class name, for the dropdowns.
void ApiServer::handleListClasses(const Request& req, Response& res) {
    lock_guard<mutex> guard(dataLock);

    if (requireLogin(req, res) == -1) {
        return;
    }

    string classes[MAX_CLASSES];
    int count = app.listClasses(classes);

    json names = json::array();
    for (int i = 0; i < count; i++) {
        names.push_back(classes[i]);
    }

    json out;
    out["ok"] = true;
    out["classes"] = names;
    sendJson(res, 200, out);
}

// GET /api/attendance/sheet?subject=&date=. The class list for one session,
// with any marks that already exist.
void ApiServer::handleAttendanceSheet(const Request& req, Response& res) {
    lock_guard<mutex> guard(dataLock);

    if (requireLogin(req, res) == -1) {
        return;
    }

    string code = toUpper(trim(req.get_param_value("subject")));
    Date date = dateFrom(req.get_param_value("date"));

    Result check = app.checkSubjectExists(code);
    if (!check.isOk()) {
        sendResult(res, check);
        return;
    }
    check = checkClassDate(date);
    if (!check.isOk()) {
        sendResult(res, check);
        return;
    }

    const Subject& subject = app.getSubject(app.findSubject(code));
    json rows = json::array();
    bool alreadyMarked = false;

    for (int i = 0; i < Student::getCount(); i++) {
        const Student& student = app.getStudent(i);
        if (student.getClassName() != subject.getClassName()) {
            continue;
        }

        char status = student.getStatus(code, date);
        if (status != '-') {
            alreadyMarked = true;
        }

        json row = JsonMapper::studentRow(student);
        row["status"] = string(1, status);
        rows.push_back(row);
    }

    json out;
    out["ok"] = true;
    out["subject"] = JsonMapper::subjectRow(subject);
    out["date"] = date.toString();
    out["dateIso"] = date.toIso();
    out["alreadyMarked"] = alreadyMarked;
    out["students"] = rows;
    sendJson(res, 200, out);
}

// POST /api/attendance. Saves a whole session. C++ checks every mark and
// counts the totals. A count shown by the browser is never used.
void ApiServer::handleMarkAttendance(const Request& req, Response& res) {
    lock_guard<mutex> guard(dataLock);

    if (requireLogin(req, res) == -1) {
        return;
    }

    json body;
    if (!readBody(req, res, body)) {
        return;
    }

    // marks[] is indexed like the student array, and a student with no mark
    // keeps '-', which the core rejects.
    char marks[MAX_STUDENTS];
    for (int i = 0; i < MAX_STUDENTS; i++) {
        marks[i] = '-';
    }

    json::const_iterator list = body.find("marks");
    if (list != body.end() && list->is_array()) {
        for (json::const_iterator mark = list->begin(); mark != list->end(); ++mark) {
            if (!mark->is_object()) {
                continue;
            }
            int index = app.findStudent(numberField(*mark, "studentId"));
            string status = toUpper(textField(*mark, "status"));
            if (index != -1 && status.length() == 1) {
                marks[index] = status[0];
            }
        }
    }

    int presentCount;
    int absentCount;
    Result result = app.markAttendance(textField(body, "subject"), dateFrom(textField(body, "date")),
                                       marks, presentCount, absentCount);
    if (!result.isOk()) {
        sendResult(res, result);
        return;
    }

    json out;
    out["ok"] = true;
    out["message"] = result.getMessage();
    out["present"] = presentCount;
    out["absent"] = absentCount;
    sendJson(res, 201, out);
}

// PUT /api/attendance. Corrects one existing mark.
void ApiServer::handleEditAttendance(const Request& req, Response& res) {
    lock_guard<mutex> guard(dataLock);

    if (requireLogin(req, res) == -1) {
        return;
    }

    json body;
    if (!readBody(req, res, body)) {
        return;
    }

    string status = toUpper(textField(body, "status"));
    sendResult(res, app.editAttendance(app.findStudent(numberField(body, "studentId")),
                                       textField(body, "subject"), dateFrom(textField(body, "date")),
                                       status.length() == 1 ? status[0] : '-'));
}
