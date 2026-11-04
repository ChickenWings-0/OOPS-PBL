# api_test.py
# Tests the web server through real HTTP requests, the way a browser or curl would.
#
#   python tests/api_test.py attendance_server.exe [attendance.exe]
#
# The server runs in a temporary folder with a copy of tests/fixture_data, so the
# real data/ folder is never touched. Expected report numbers are worked out here,
# directly from attendance.txt, so they do not depend on the C++ code being tested.

import datetime
import http.client
import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import time

TESTS = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(TESTS)
PORT = 18765

results = []


def check(name, passed, detail=""):
    results.append(passed)
    print(("ok   " if passed else "FAIL ") + name + ("" if passed else "   -> " + str(detail)))


def call(method, path, body=None, token=None, raw=None, extra=None):
    """Sends one request and returns (status, parsed JSON or text, headers)."""
    connection = http.client.HTTPConnection("127.0.0.1", PORT, timeout=10)
    headers = dict(extra or {})
    if token:
        headers["Authorization"] = "Bearer " + token
    data = raw if raw is not None else (json.dumps(body) if body is not None else None)
    if data is not None:
        headers["Content-Type"] = "application/json"
    connection.request(method, path, body=data, headers=headers)
    reply = connection.getresponse()
    text = reply.read().decode("utf-8", "replace")
    found = dict(reply.getheaders())
    connection.close()
    try:
        return reply.status, json.loads(text), found
    except ValueError:
        return reply.status, text, found


def login(username, password):
    status, body, _ = call("POST", "/api/login", {"username": username, "password": password})
    return body.get("token") if status == 200 else None


def expected_numbers(data_folder):
    """Works out dashboard numbers directly from the text files."""
    rows = [line.strip().split("|") for line in open(os.path.join(data_folder, "attendance.txt")) if line.strip()]
    days, subjects, marks = {}, {}, {}
    for student, code, date, status in rows:
        for table, key in ((days, date), (subjects, code), (marks, (student, code))):
            table.setdefault(key, [0, 0])
            table[key][1] += 1
            table[key][0] += status == "P"
    low = [key for key, (present, total) in marks.items() if present * 100.0 / total < 75]
    return days, subjects, low


def test_login_and_sessions():
    status, body, _ = call("GET", "/api/health")
    check("W01 health needs no token", status == 200 and body == {"status": "ok"}, (status, body))

    status, body, _ = call("POST", "/api/login", {"username": "admin", "password": "admin123"})
    check("W02 correct login gives a token", status == 200 and len(body.get("token", "")) == 32, body)
    check("W02 login returns the user", body.get("user", {}).get("isAdmin") is True, body)
    admin = body.get("token")

    status, body, _ = call("POST", "/api/login", {"username": "admin", "password": "wrong"})
    check("W02 wrong password is 401 with the C++ message",
          status == 401 and body.get("error") == "Wrong username or password.", (status, body))

    status, _, _ = call("GET", "/api/dashboard")
    check("W03 no token is 401", status == 401, status)
    status, _, _ = call("GET", "/api/dashboard", token="0" * 32)
    check("W03 made-up token is 401", status == 401, status)
    status, body, _ = call("GET", "/api/me", token=admin)
    check("W03 real token works", status == 200 and body["user"]["username"] == "admin", (status, body))

    second = login("admin", "admin123")
    status, _, _ = call("POST", "/api/logout", token=second)
    check("W04 logout works", status == 200, status)
    status, _, _ = call("GET", "/api/me", token=second)
    check("W04 old token is 401 after logout", status == 401, status)
    status, _, _ = call("GET", "/api/me", token=admin)
    check("W04 another session stays logged in", status == 200, status)

    teacher = login("teacher1", "pass123")
    status, body, _ = call("GET", "/api/teachers", token=teacher)
    check("W05 teacher gets 403 on the admin route",
          status == 403 and body.get("error") == "Only the admin can view teachers.", (status, body))
    status, body, _ = call("POST", "/api/teachers", {"name": "X Y", "username": "xyz1", "password": "goodpass"},
                           token=teacher)
    check("W05 teacher cannot add a teacher", status == 403, (status, body))
    status, body, _ = call("GET", "/api/teachers", token=admin)
    check("W05 admin can list teachers", status == 200 and body.get("total") == 2, (status, body))
    return admin, teacher


def test_lockout():
    for attempt in (1, 2):
        status, _, _ = call("POST", "/api/login", {"username": "teacher1", "password": "bad"})
        check("W06 wrong login %d is 401" % attempt, status == 401, status)
    status, body, _ = call("POST", "/api/login", {"username": "teacher1", "password": "bad"})
    check("W06 third wrong login locks (429)", status == 429 and body.get("code") == "LOCKED", (status, body))
    status, body, _ = call("POST", "/api/login", {"username": "teacher1", "password": "pass123"})
    check("W06 correct password is refused while locked", status == 429, (status, body))
    check("W06 another account still works", login("admin", "admin123") is not None)
    print("     waiting 31 seconds for the lock to end...")
    time.sleep(31)
    check("W06 login works after the wait", login("teacher1", "pass123") is not None)


def test_files_are_private(admin):
    for path in ("/data/teachers.txt", "/../data/teachers.txt", "/%2e%2e/data/teachers.txt",
                 "/web/../data/teachers.txt", "/..%2fdata%2fteachers.txt"):
        status, body, _ = call("GET", path)
        check("W07 not served: " + path, status in (400, 404) and "admin123" not in str(body), (status, body))

    for method, path in (("GET", "/api/me"), ("GET", "/api/teachers"), ("GET", "/api/dashboard")):
        _, body, _ = call(method, path, token=admin)
        text = json.dumps(body)
        check("W07 no password in " + path, "admin123" not in text and "password" not in text.lower(), text[:200])


def test_bad_requests(admin):
    status, body, _ = call("POST", "/api/login", raw="{broken")
    check("W08 broken JSON is 400", status == 400 and body.get("ok") is False, (status, body))
    status, body, _ = call("POST", "/api/login", raw="[1,2,3]")
    check("W08 JSON that is not an object is 400", status == 400, (status, body))
    status, body, _ = call("POST", "/api/login", {"username": 5, "password": ["x"]})
    check("W08 wrong field types are refused, not a crash", status == 401, (status, body))
    status, body, _ = call("POST", "/api/account/password", raw="x" * 70000, token=admin)
    check("W08 oversized body is refused", status == 413, (status, str(body)[:100]))
    status, body, _ = call("GET", "/api/nothing-here")
    check("W08 unknown API address is JSON 404", status == 404 and body.get("ok") is False, (status, body))
    status, _, _ = call("GET", "/api/health")
    check("W08 server is still running", status == 200, status)


def test_password_change(admin):
    status, body, _ = call("POST", "/api/account/password",
                           {"currentPassword": "wrong", "newPassword": "newpass1"}, token=admin)
    check("password: wrong current", status == 400 and body.get("field") == "currentPassword", (status, body))
    status, body, _ = call("POST", "/api/account/password",
                           {"currentPassword": "admin123", "newPassword": "a b"}, token=admin)
    check("password: invalid new", status == 400 and body.get("field") == "newPassword", (status, body))
    status, body, _ = call("POST", "/api/account/password",
                           {"currentPassword": "admin123", "newPassword": "newpass1"}, token=admin)
    check("password: changed", status == 200 and body.get("message") == "Password changed.", (status, body))
    check("password: new one logs in", login("admin", "newpass1") is not None)
    call("POST", "/api/account/password", {"currentPassword": "newpass1", "newPassword": "admin123"}, token=admin)


def test_dashboard(admin, data_folder):
    days, subjects, low = expected_numbers(data_folder)
    status, body, _ = call("GET", "/api/dashboard", token=admin)
    check("dashboard responds", status == 200, status)
    cards = body["cards"]

    check("W50 ten students, four subjects", cards["students"] == 10 and cards["subjects"] == 4, cards)
    check("W50 defaulters", cards["defaulterEntries"] == len(low) and
          cards["defaulterStudents"] == len({student for student, _ in low}), (cards, low))

    def date_key(text):
        return text[6:], text[3:5], text[:2]

    ordered = sorted(days, key=date_key)
    check("trend has every marked day, oldest first", [row["date"] for row in body["trend"]] == ordered,
          body["trend"])
    for row in body["trend"]:
        present, total = days[row["date"]]
        check("trend " + row["date"], row["present"] == present and row["total"] == total and
              abs(row["percent"] - present * 100.0 / total) < 0.006, row)

    for row in body["subjects"]:
        present, total = subjects[row["code"]]
        check("subject " + row["code"], row["present"] == present and row["total"] == total and
              abs(row["percent"] - present * 100.0 / total) < 0.006 and row["status"] == "ok", row)

    check("W51 last marked day is reported", cards["todayMarked"] is False and
          cards["lastMarkedDate"] == ordered[-1], cards)
    check("percent text has two decimals", cards["lastMarkedPercentText"] == "80.00%", cards)
    check("last marked day has a short label", cards["lastMarkedLabel"] == "03 Nov", cards)


def test_security_headers():
    _, _, headers = call("GET", "/")
    check("security headers on pages", headers.get("X-Content-Type-Options") == "nosniff" and
          "Content-Security-Policy" in headers, headers)
    _, _, headers = call("GET", "/api/health")
    check("API replies are not cached", headers.get("Cache-Control") == "no-store", headers)


def start_server(exe, change_data=None, settings=None):
    """Starts a server on a fresh copy of the data. Returns (process, folder)."""
    folder = tempfile.mkdtemp(prefix="api_test_")
    data_folder = os.path.join(folder, "data")
    shutil.copytree(os.path.join(TESTS, "fixture_data"), data_folder)
    shutil.copytree(os.path.join(ROOT, "web"), os.path.join(folder, "web"))
    if change_data:
        change_data(data_folder)

    environment = dict(os.environ, PORT=str(PORT), HOST="127.0.0.1")
    environment.pop("DEMO_PASSWORD", None)
    environment.update(settings or {})
    server = subprocess.Popen([exe], cwd=folder, env=environment, stdout=subprocess.DEVNULL)

    for _ in range(50):
        try:
            call("GET", "/api/health")
            break
        except OSError:
            time.sleep(0.1)
    return server, folder


def stop_server(server, folder):
    server.terminate()
    server.wait(timeout=10)
    shutil.rmtree(folder, ignore_errors=True)


def twenty_marked_days(data_folder):
    """Replaces attendance with one mark a day for the last 20 days, today included."""
    today = datetime.date.today()
    with open(os.path.join(data_folder, "attendance.txt"), "w") as file:
        for back in range(19, -1, -1):
            day = today - datetime.timedelta(days=back)
            file.write("1|CS201A|%s|%s\n" % (day.strftime("%d-%m-%Y"), "A" if back == 0 else "P"))


def no_attendance(data_folder):
    os.remove(os.path.join(data_folder, "attendance.txt"))


def no_data(data_folder):
    for name in ("attendance.txt", "students.txt", "subjects.txt"):
        os.remove(os.path.join(data_folder, name))


def test_long_history(exe):
    server, folder = start_server(exe, twenty_marked_days)
    try:
        _, body, _ = call("GET", "/api/dashboard", token=login("admin", "admin123"))
        today = datetime.date.today()
        wanted = [(today - datetime.timedelta(days=back)).strftime("%d-%m-%Y") for back in range(13, -1, -1)]
        check("trend keeps only the latest 14 days, oldest first",
              [row["date"] for row in body["trend"]] == wanted, body["trend"])
        cards = body["cards"]
        check("W51 today is recognised when marked", cards["todayMarked"] is True and
              cards["todayTotal"] == 1 and cards["todayPresent"] == 0 and
              cards["todayPercentText"] == "0.00%", cards)
    finally:
        stop_server(server, folder)


def test_empty_data(exe):
    server, folder = start_server(exe, no_attendance)
    try:
        status, body, _ = call("GET", "/api/dashboard", token=login("admin", "admin123"))
        check("no attendance: no crash, empty trend", status == 200 and body["trend"] == [] and
              body["cards"]["anyMarks"] is False, (status, body))
        check("no attendance: subjects show none", all(row["status"] == "none" for row in body["subjects"]),
              body["subjects"])
    finally:
        stop_server(server, folder)

    server, folder = start_server(exe, no_data)
    try:
        status, body, _ = call("GET", "/api/dashboard", token=login("admin", "admin123"))
        check("no data at all: no crash", status == 200 and body["cards"]["students"] == 0 and
              body["subjects"] == [], (status, body))
    finally:
        stop_server(server, folder)


def test_cors(exe):
    site = "https://my-site.vercel.app"
    settings = {"ALLOWED_ORIGIN": " " + site + "/ , http://127.0.0.1:3000"}
    server, folder = start_server(exe, settings=settings)
    try:
        status, body, headers = call("OPTIONS", "/api/login", extra={
            "Origin": site, "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type"})
        check("W70 preflight from an allowed site is answered", status == 204, (status, headers))
        check("W70 preflight names the origin, never a star", headers.get("Access-Control-Allow-Origin") == site, headers)
        check("W70 preflight allows the methods", "DELETE" in headers.get("Access-Control-Allow-Methods", ""), headers)
        check("W70 preflight allows both headers", "Authorization" in headers.get("Access-Control-Allow-Headers", "") and
              "Content-Type" in headers.get("Access-Control-Allow-Headers", ""), headers)

        status, body, headers = call("POST", "/api/login", {"username": "admin", "password": "admin123"}, extra={"Origin": site})
        check("W71 login works cross-origin", status == 200 and headers.get("Access-Control-Allow-Origin") == site, (status, headers))
        check("W71 no cookie is used", "Set-Cookie" not in headers and "Access-Control-Allow-Credentials" not in headers, headers)
        token = body["token"]
        status, body, headers = call("GET", "/api/dashboard", token=token, extra={"Origin": site})
        check("W71 the token works cross-origin", status == 200 and headers.get("Access-Control-Allow-Origin") == site, (status, headers))

        for label, reply in (
                ("wrong password", call("POST", "/api/login", {"username": "admin", "password": "x"}, extra={"Origin": site})),
                ("no token", call("GET", "/api/me", extra={"Origin": site})),
                ("bad JSON", call("POST", "/api/login", raw="{oops", extra={"Origin": site})),
                ("duplicate", call("POST", "/api/subjects", {"code": "CS201A", "name": "X", "className": "A"}, token=token, extra={"Origin": site})),
                ("unknown address", call("GET", "/api/nothing", extra={"Origin": site})),
                ("oversized body", call("POST", "/api/login", raw="x" * 70000, extra={"Origin": site}))):
            check("W72 the browser can read this error: " + label,
                  reply[0] >= 400 and reply[2].get("Access-Control-Allow-Origin") == site, reply[:2])

        status, _, headers = call("GET", "/api/health", extra={"Origin": "http://127.0.0.1:3000"})
        check("W73 the second origin in the list works", headers.get("Access-Control-Allow-Origin") == "http://127.0.0.1:3000", headers)

        for origin in ("https://evil.example.com", site + ".evil.com", "http://my-site.vercel.app", "null"):
            status, _, headers = call("OPTIONS", "/api/login", extra={"Origin": origin, "Access-Control-Request-Method": "POST"})
            check("W73 preflight gives nothing to " + origin, "Access-Control-Allow-Origin" not in headers and
                  "Access-Control-Allow-Methods" not in headers, headers)
            status, _, headers = call("GET", "/api/health", extra={"Origin": origin})
            check("W73 no CORS header for " + origin, "Access-Control-Allow-Origin" not in headers, headers)

        status, _, headers = call("GET", "/api/health")
        check("W73 same-site requests still work, and vary on Origin", status == 200 and headers.get("Vary") == "Origin", headers)
    finally:
        stop_server(server, folder)

    server, folder = start_server(exe)
    try:
        _, _, headers = call("GET", "/api/health", extra={"Origin": site})
        check("W73 with no ALLOWED_ORIGIN, no site is allowed", "Access-Control-Allow-Origin" not in headers, headers)
    finally:
        stop_server(server, folder)


def test_demo_password(exe):
    server, folder = start_server(exe, settings={"DEMO_PASSWORD": "demo-secret1"})
    try:
        check("DEMO_PASSWORD: sample password stops working", login("admin", "admin123") is None)
        check("DEMO_PASSWORD: admin logs in", login("admin", "demo-secret1") is not None)
        check("DEMO_PASSWORD: teacher logs in", login("teacher1", "demo-secret1") is not None)
    finally:
        stop_server(server, folder)

    server, folder = start_server(exe, settings={"DEMO_PASSWORD": "has space"})
    try:
        check("DEMO_PASSWORD: an invalid value is ignored", login("admin", "admin123") is not None)
    finally:
        stop_server(server, folder)


# ---------- Students, subjects, teachers ----------

def file_lines(folder, name):
    with open(os.path.join(folder, "data", name)) as file:
        return [line.strip() for line in file if line.strip()]


def test_students(admin, teacher, folder):
    status, body, _ = call("POST", "/api/students", {"rollNo": "00000012345", "name": "New Student", "className": "aiml-a"}, token=teacher)
    check("W10 a teacher can add a student", status == 201 and body.get("message") == "Student added with internal ID 11.", (status, body))
    check("W10 the line is in students.txt, leading zeros kept", "11|00000012345|New Student|AIML-A" in file_lines(folder, "students.txt"),
          file_lines(folder, "students.txt")[-1])

    status, body, _ = call("POST", "/api/students", {"rollNo": "90118015625", "name": "Copy Cat", "className": "AIML-A"}, token=admin)
    check("W11 duplicate roll number is 409 on the right field", status == 409 and body.get("code") == "DUPLICATE" and body.get("field") == "rollNo", (status, body))

    for label, data, field in (("empty roll", {"name": "A B", "className": "X"}, "rollNo"),
                               ("bad roll", {"rollNo": "a b", "name": "A B", "className": "X"}, "rollNo"),
                               ("empty name", {"rollNo": "77", "className": "X"}, "name"),
                               ("| in name", {"rollNo": "77", "name": "A|B", "className": "X"}, "name"),
                               ("digit in name", {"rollNo": "77", "name": "A1", "className": "X"}, "name"),
                               ("empty class", {"rollNo": "77", "name": "A B"}, "className"),
                               ("bad class", {"rollNo": "77", "name": "A B", "className": "A B"}, "className")):
        status, body, _ = call("POST", "/api/students", data, token=admin)
        check("W12 rejected by C++: " + label, status == 400 and body.get("field") == field, (status, body))
    check("W12 nothing was added", len(file_lines(folder, "students.txt")) == 11)

    data = {"rollNo": "95018015625", "name": "diya verma", "className": "AIML-A"}
    status, body, _ = call("POST", "/api/students", data, token=admin)
    check("W13 same name asks for confirmation", status == 409 and body.get("code") == "NEEDS_CONFIRM", (status, body))
    check("W13 nothing is added until confirmed", len(file_lines(folder, "students.txt")) == 11)
    status, body, _ = call("POST", "/api/students", dict(data, confirmed=True), token=admin)
    check("W13 confirming adds the student", status == 201, (status, body))

    status, body, _ = call("GET", "/api/students?q=sha", token=admin)
    check("W14 search by part of a name", {row["name"] for row in body["students"]} == {"Aarav Sharma", "Isha Nair"}, body)
    status, body, _ = call("GET", "/api/students?q=90818015625", token=admin)
    check("W14 search by exact roll number", [row["name"] for row in body["students"]] == ["Meera Joshi"], body)
    status, body, _ = call("GET", "/api/students?q=zzz", token=admin)
    check("W14 no match is an empty list", status == 200 and body["total"] == 0 and body["allStudents"] == 12, body)

    for field, key in (("id", lambda row: row["id"]), ("rollNo", lambda row: row["rollNo"]),
                       ("name", lambda row: row["name"].upper()),
                       ("className", lambda row: (row["className"], row["name"].upper()))):
        for order in ("asc", "desc"):
            _, body, _ = call("GET", "/api/students?sort=%s&order=%s" % (field, order), token=admin)
            rows = body["students"]
            check("W15 sorted by %s %s" % (field, order),
                  [key(row) for row in rows] == sorted((key(row) for row in rows), reverse=order == "desc"), rows[:3])

    status, body, _ = call("PUT", "/api/students/1", {"rollNo": "90118015625", "name": "Aarav K Sharma", "className": "AIML-A"}, token=admin)
    check("W16 edit a name", status == 200 and "1|90118015625|Aarav K Sharma|AIML-A" in file_lines(folder, "students.txt"), (status, body))
    status, body, _ = call("PUT", "/api/students/1", {"rollNo": "90118015625", "name": "Aarav K Sharma", "className": "AIML-B"}, token=admin)
    check("W16 class change with attendance is refused", status == 400 and body.get("field") == "className", (status, body))
    status, body, _ = call("PUT", "/api/students/1", {"rollNo": "90218015625", "name": "Aarav K Sharma", "className": "AIML-A"}, token=admin)
    check("W16 someone else's roll number is refused", status == 409, (status, body))
    status, body, _ = call("PUT", "/api/students/1", {"rollNo": "90118015625", "name": "", "className": "AIML-A"}, token=admin)
    check("W16 an empty name is refused", status == 400 and body.get("field") == "name", (status, body))
    status, body, _ = call("PUT", "/api/students/999", {"rollNo": "1", "name": "A B", "className": "X"}, token=admin)
    check("W16 unknown student is 404", status == 404, (status, body))

    status, body, _ = call("GET", "/api/students/2", token=admin)
    check("get one student", status == 200 and body["student"]["name"] == "Diya Verma", (status, body))
    status, body, _ = call("GET", "/api/students/99999999999999", token=admin)
    check("an enormous ID is a clean 404", status == 404, (status, body))

    lines_before = len(file_lines(folder, "attendance.txt"))
    status, body, _ = call("DELETE", "/api/students/3", token=admin)
    check("W17 delete works", status == 200 and body.get("message") == "Student deleted.", (status, body))
    check("W17 gone from students.txt", not any(line.startswith("3|") for line in file_lines(folder, "students.txt")))
    attendance = file_lines(folder, "attendance.txt")
    check("W17 gone from attendance.txt", not any(line.startswith("3|") for line in attendance) and len(attendance) == lines_before - 10, len(attendance))
    status, _, _ = call("DELETE", "/api/students/3", token=admin)
    check("W17 deleting again is 404", status == 404, status)


def test_subjects_and_teachers(admin, teacher, folder):
    status, body, _ = call("POST", "/api/subjects", {"code": "ph201a", "name": "Physics", "className": "aiml-a"}, token=teacher)
    check("W18 add a subject", status == 201 and "PH201A|Physics|AIML-A" in file_lines(folder, "subjects.txt"), (status, body))
    status, body, _ = call("POST", "/api/subjects", {"code": "cs201a", "name": "Again", "className": "AIML-A"}, token=admin)
    check("W18 lowercase duplicate code is refused", status == 409 and body.get("field") == "code", (status, body))
    status, body, _ = call("POST", "/api/subjects", {"code": "ZZ1", "name": "Bad|Name", "className": "AIML-A"}, token=admin)
    check("W18 | in a name is refused", status == 400 and body.get("field") == "name", (status, body))
    status, body, _ = call("GET", "/api/subjects", token=teacher)
    check("subjects are listed", body["total"] == 5, body)
    status, body, _ = call("GET", "/api/classes", token=teacher)
    check("classes are listed in order", body["classes"] == ["AIML-A", "AIML-B"], body)

    status, body, _ = call("POST", "/api/teachers", {"name": "New Teacher", "username": "teacher2", "password": "goodpass"}, token=admin)
    check("W19 admin adds a teacher", status == 201, (status, body))
    check("W19 the new teacher can log in", login("teacher2", "goodpass") is not None)
    status, body, _ = call("POST", "/api/teachers", {"name": "Other", "username": "teacher2", "password": "goodpass"}, token=admin)
    check("W19 duplicate username is refused", status == 409 and body.get("field") == "username", (status, body))


# ---------- Attendance ----------

def session_marks(ids, absent=()):
    return [{"studentId": number, "status": "A" if number in absent else "P"} for number in ids]


def test_attendance(admin, folder):
    a_class = [1, 2, 3, 4, 5, 6]

    status, body, _ = call("GET", "/api/attendance/sheet?subject=CS201A&date=2026-10-28", token=admin)
    check("W20 the sheet lists only that class", status == 200 and [row["id"] for row in body["students"]] == a_class, body)
    check("W20 a new session is not marked", body["alreadyMarked"] is False and all(row["status"] == "-" for row in body["students"]), body)

    before = len(file_lines(folder, "attendance.txt"))
    data = {"subject": "CS201A", "date": "2026-10-28", "marks": session_marks(a_class[:5])}
    status, body, _ = call("POST", "/api/attendance", data, token=admin)
    check("W24 a session with a student missing is refused", status == 400, (status, body))
    check("W24 and stores nothing", len(file_lines(folder, "attendance.txt")) == before)

    data = {"subject": "CS201A", "date": "2026-10-28", "marks": session_marks(a_class, absent=[2, 5])}
    status, body, _ = call("POST", "/api/attendance", data, token=admin)
    check("W23 saving works, and C++ counts the totals", status == 201 and body["present"] == 4 and body["absent"] == 2 and
          body["message"] == "Attendance saved. Present: 4, Absent: 2", (status, body))
    lines = file_lines(folder, "attendance.txt")
    check("W23 the lines are added to attendance.txt", len(lines) == before + 6 and "2|CS201A|28-10-2026|A" in lines[-6:], lines[-6:])

    status, body, _ = call("POST", "/api/attendance", data, token=admin)
    check("W24 a repeat POST is 409", status == 409 and "already marked" in body["error"], (status, body))
    status, body, _ = call("GET", "/api/attendance/sheet?subject=CS201A&date=2026-10-28", token=admin)
    check("W24 the sheet now says already marked", body["alreadyMarked"] is True and body["students"][1]["status"] == "A", body)

    tomorrow = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()
    for label, date, wanted in (("future date", tomorrow, "The date cannot be in the future."),
                                ("impossible date", "2026-02-30", "Invalid date. Use DD-MM-YYYY, year 2000 or later."),
                                ("no date", "", "Invalid date. Use DD-MM-YYYY, year 2000 or later.")):
        status, body, _ = call("POST", "/api/attendance", {"subject": "CS201A", "date": date, "marks": session_marks(a_class)}, token=admin)
        check("W25 POST refuses " + label, status == 400 and body.get("error") == wanted, (status, body))
        status, body, _ = call("GET", "/api/attendance/sheet?subject=CS201A&date=" + date, token=admin)
        check("W25 sheet refuses " + label, status == 400 and body.get("error") == wanted, (status, body))

    status, body, _ = call("POST", "/api/attendance", {"subject": "NOPE", "date": "2026-10-28", "marks": []}, token=admin)
    check("unknown subject is 404", status == 404, (status, body))
    status, body, _ = call("POST", "/api/attendance", {"subject": "CS201B", "date": "2026-10-28", "marks": "not a list"}, token=admin)
    check("marks that are not a list are refused", status == 400, (status, body))
    status, body, _ = call("POST", "/api/attendance", {"subject": "CS201B", "date": "2026-10-28",
                                                       "marks": [{"studentId": 7, "status": "X"}, 5, {"studentId": "8"}]}, token=admin)
    check("broken marks are refused, not a crash", status == 400, (status, body))

    _, before_report, _ = call("GET", "/api/reports/student/2", token=admin)
    status, body, _ = call("PUT", "/api/attendance", {"studentId": 2, "subject": "cs201a", "date": "2026-10-28", "status": "P"}, token=admin)
    check("W26 correct a mark", status == 200 and body.get("message") == "Attendance corrected.", (status, body))
    check("W26 the file changes", "2|CS201A|28-10-2026|P" in file_lines(folder, "attendance.txt"))
    _, after_report, _ = call("GET", "/api/reports/student/2", token=admin)
    check("W26 the percentage goes up", after_report["overall"]["percent"] > before_report["overall"]["percent"], (before_report["overall"], after_report["overall"]))
    status, body, _ = call("PUT", "/api/attendance", {"studentId": 2, "subject": "CS201A", "date": "2026-10-31", "status": "P"}, token=admin)
    check("W26 correcting a missing mark is 404", status == 404 and body.get("error") == "No attendance record found.", (status, body))
    status, body, _ = call("PUT", "/api/attendance", {"studentId": 2, "subject": "CS201A", "date": "2026-10-28", "status": "Z"}, token=admin)
    check("W26 a bad status is refused", status == 400, (status, body))


def test_races(admin, folder):
    b_class = [7, 8, 9, 10]
    data = {"subject": "CS201B", "date": "2026-10-28", "marks": session_marks(b_class)}
    before = len(file_lines(folder, "attendance.txt"))
    replies = []

    def send():
        replies.append(call("POST", "/api/attendance", data, token=admin)[0])

    threads = [threading.Thread(target=send) for _ in range(8)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    check("W27 eight teachers at once: exactly one succeeds", sorted(replies) == [201] + [409] * 7, replies)
    lines = file_lines(folder, "attendance.txt")
    check("W27 no duplicate lines", len(lines) == before + 4 and len(set(lines)) == len(lines), len(lines))

    answers = []

    def add(number):
        answers.append(call("POST", "/api/students", {"rollNo": "7%05d" % number, "name": "Parallel Student", "className": "RACE", "confirmed": True}, token=admin))

    threads = [threading.Thread(target=add, args=(number,)) for number in range(50)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    worked = [reply for reply in answers if reply[0] == 201]
    check("W43 all 50 parallel adds succeed", len(worked) == 50, [reply[:2] for reply in answers if reply[0] != 201][:3])
    students = [line.split("|") for line in file_lines(folder, "students.txt")]
    ids = [row[0] for row in students]
    rolls = [row[1] for row in students if row[3] == "RACE"]
    check("W43 no duplicate internal IDs", len(ids) == len(set(ids)), ids)
    check("W43 no lost lines", len(rolls) == 50 and len(set(rolls)) == 50, len(rolls))


# ---------- Reports, against numbers worked out here ----------

def attendance_rows(data_folder):
    with open(os.path.join(data_folder, "attendance.txt")) as file:
        return [line.strip().split("|") for line in file if line.strip()]


def table_rows(data_folder, name):
    with open(os.path.join(data_folder, name)) as file:
        return [line.strip().split("|") for line in file if line.strip()]


def test_reports(admin, data_folder):
    rows = attendance_rows(data_folder)
    students = table_rows(data_folder, "students.txt")
    subjects = table_rows(data_folder, "subjects.txt")
    golden = os.path.join(TESTS, "golden")

    _, body, _ = call("GET", "/api/reports/student/2", token=admin)
    lines = {row["code"]: row for row in body["subjects"]}
    check("W30 Diya Verma: 83.33%", lines["CS201A"]["percentText"] == "83.33%" and lines["CS201A"]["status"] == "ok", lines)
    check("W31 exactly 75.00% is not low", lines["MA201A"]["percentText"] == "75.00%" and lines["MA201A"]["status"] == "ok", lines)
    check("W30 overall 80.00%", body["overall"]["percentText"] == "80.00%" and body["overall"]["present"] == 8, body["overall"])

    _, body, _ = call("GET", "/api/reports/student/3", token=admin)
    check("W31 below 75% is low", {row["status"] for row in body["subjects"]} == {"low"}, body["subjects"])

    status, body, _ = call("GET", "/api/reports/student/999", token=admin)
    check("unknown student report is 404", status == 404, (status, body))

    for student_id, roll, name, class_name in students:
        _, body, _ = call("GET", "/api/reports/student/" + student_id, token=admin)
        mine = [row for row in rows if row[0] == student_id]
        check("W36 overall for " + name, body["overall"]["total"] == len(mine) and
              body["overall"]["present"] == sum(row[3] == "P" for row in mine), body["overall"])
        for line in body["subjects"]:
            marks = [row for row in mine if row[1] == line["code"]]
            present = sum(row[3] == "P" for row in marks)
            ordered = sorted(marks, key=lambda row: (row[2][6:], row[2][3:5], row[2][:2]))
            check("W36 %s in %s" % (name, line["code"]),
                  line["total"] == len(marks) and line["present"] == present and
                  abs(line["percent"] - present * 100.0 / len(marks)) < 0.006 and
                  line["marks"] == "".join(row[3] for row in ordered), line)

    _, body, _ = call("GET", "/api/reports/defaulters", token=admin)
    wanted = {}
    for student_id, roll, name, class_name in students:
        for code, subject_name, subject_class in subjects:
            marks = [row for row in rows if row[0] == student_id and row[1] == code]
            if marks and sum(row[3] == "P" for row in marks) * 100.0 / len(marks) < 75:
                wanted[(roll, code)] = sum(row[3] == "P" for row in marks), len(marks)
    found = {(row["rollNo"], row["subject"]): (row["present"], row["total"]) for row in body["entries"]}
    check("W33 five defaulter entries, matching the file", found == wanted and body["total"] == 5, (found, wanted))
    percents = [row["percent"] for row in body["entries"]]
    check("W33 lowest attendance first", percents == sorted(percents), percents)
    terminal = open(os.path.join(golden, "report_defaulters.txt"), encoding="latin1").read()
    check("W33 the terminal shows the same entries", all(
        row["rollNo"] in terminal and "%d/%d" % (row["present"], row["total"]) in terminal and row["percentText"] in terminal
        for row in body["entries"]), body["entries"])

    _, body, _ = call("GET", "/api/reports/daily?date=2026-11-03", token=admin)
    for line in body["subjects"]:
        marks = [row for row in rows if row[1] == line["code"] and row[2] == "03-11-2026"]
        check("W34 daily " + line["code"], line["present"] == sum(row[3] == "P" for row in marks) and
              line["absent"] == sum(row[3] == "A" for row in marks) and len(line["students"]) == len(marks), line)
    terminal = open(os.path.join(golden, "report_daily.txt"), encoding="latin1").read()
    check("W34 the terminal shows the same totals", all(
        "Present: %d, Absent: %d" % (line["present"], line["absent"]) in terminal for line in body["subjects"]))
    _, body, _ = call("GET", "/api/reports/daily?date=2026-11-01", token=admin)
    check("W34 a date with no data is empty", body["subjects"] == [], body)
    status, body, _ = call("GET", "/api/reports/daily?date=2099-01-01", token=admin)
    check("a future daily report is refused", status == 400, (status, body))

    terminal = open(os.path.join(golden, "report_monthly.txt"), encoding="latin1").read()
    for month, part in (("2026-10", "-10-2026"), ("2026-11", "-11-2026")):
        _, body, _ = call("GET", "/api/reports/monthly?class=aiml-a&month=" + month, token=admin)
        check("W35 month header " + month, body["className"] == "AIML-A" and body["anyRecords"] is True and len(body["students"]) == 6, body)
        for line in body["students"]:
            marks = [row for row in rows if row[0] == str(line["id"]) and row[2].endswith(part)]
            present = sum(row[3] == "P" for row in marks)
            check("W35 %s %s" % (month, line["name"]), line["held"] == len(marks) and line["present"] == present and
                  abs(line["percent"] - present * 100.0 / len(marks)) < 0.006, line)
            check("W35 terminal has %s %s" % (month, line["percentText"]), line["percentText"] in terminal)
    _, body, _ = call("GET", "/api/reports/monthly?class=AIML-A&month=2026-01", token=admin)
    check("a month with no marks is empty", body["anyRecords"] is False, body)
    status, body, _ = call("GET", "/api/reports/monthly?class=AIML-A&month=nonsense", token=admin)
    check("a bad month is refused", status == 400 and body.get("field") == "month", (status, body))


def test_student_with_no_marks(admin):
    call("POST", "/api/students", {"rollNo": "96018015625", "name": "No Marks", "className": "AIML-A"}, token=admin)
    _, listing, _ = call("GET", "/api/students?q=No Marks".replace(" ", "%20"), token=admin)
    number = listing["students"][0]["id"]
    _, body, _ = call("GET", "/api/reports/student/%d" % number, token=admin)
    check("W32 no marks: status none, no crash", {row["status"] for row in body["subjects"]} == {"none"} and body["overall"]["total"] == 0, body)
    _, body, _ = call("GET", "/api/reports/monthly?class=AIML-A&month=2026-11", token=admin)
    row = [line for line in body["students"] if line["id"] == number][0]
    check("W32 monthly shows No classes yet", row["percentText"] == "No classes yet" and row["status"] == "none", row)


def test_restart(exe, terminal):
    server, folder = start_server(exe)
    admin = login("admin", "admin123")
    call("POST", "/api/students", {"rollNo": "97018015625", "name": "Kept Student", "className": "AIML-B"}, token=admin)
    call("POST", "/api/attendance", {"subject": "MA201B", "date": "2026-10-28",
                                     "marks": session_marks([7, 8, 9, 10, 11], absent=[11])}, token=admin)
    server.terminate()
    server.wait(timeout=10)

    environment = dict(os.environ, PORT=str(PORT), HOST="127.0.0.1")
    environment.pop("DEMO_PASSWORD", None)
    server = subprocess.Popen([exe], cwd=folder, env=environment, stdout=subprocess.DEVNULL)
    for _ in range(50):
        try:
            call("GET", "/api/health")
            break
        except OSError:
            time.sleep(0.1)
    try:
        admin = login("admin", "admin123")
        check("W42 a new token is needed after a restart", admin is not None)
        _, body, _ = call("GET", "/api/students?q=Kept%20Student", token=admin)
        check("W42 the student survives a restart", body["total"] == 1 and body["students"][0]["id"] == 11, body)
        _, body, _ = call("GET", "/api/reports/student/11", token=admin)
        check("W42 their attendance survives a restart", body["overall"]["total"] == 1 and body["overall"]["present"] == 0, body["overall"])
    finally:
        server.terminate()
        server.wait(timeout=10)

    if terminal:
        typed = b"admin\nadmin123\n1\n2\n0\n3\n3\n97018015625\n0\n0\n"
        run = subprocess.run([terminal], cwd=folder, input=typed, stdout=subprocess.PIPE, timeout=30)
        text = run.stdout.decode("latin1")
        check("W10 the terminal sees the student added in the browser", "Kept Student" in text, text[-300:])
        check("W10 and their attendance", "0.00%" in text, text[-300:])
    shutil.rmtree(folder, ignore_errors=True)


def main():
    if len(sys.argv) < 2:
        print("Usage: python tests/api_test.py <path to attendance_server.exe>")
        return 2

    exe = os.path.abspath(sys.argv[1])
    server, folder = start_server(exe)
    try:
        admin, _teacher = test_login_and_sessions()
        test_files_are_private(admin)
        test_bad_requests(admin)
        test_password_change(admin)
        test_dashboard(admin, os.path.join(folder, "data"))
        test_security_headers()
        test_reports(admin, os.path.join(folder, "data"))
        test_student_with_no_marks(admin)
        test_lockout()
    finally:
        stop_server(server, folder)

    server, folder = start_server(exe)
    try:
        admin = login("admin", "admin123")
        teacher = login("teacher1", "pass123")
        test_students(admin, teacher, folder)
        test_subjects_and_teachers(admin, teacher, folder)
    finally:
        stop_server(server, folder)

    server, folder = start_server(exe)
    try:
        admin = login("admin", "admin123")
        test_attendance(admin, folder)
        test_races(admin, folder)
    finally:
        stop_server(server, folder)

    test_restart(exe, os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else None)
    test_long_history(exe)
    test_empty_data(exe)
    test_demo_password(exe)
    test_cors(exe)

    print("Passed %d of %d checks." % (sum(results), len(results)))
    return 0 if all(results) else 1


if __name__ == "__main__":
    sys.exit(main())
