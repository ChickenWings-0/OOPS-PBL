# api_test.py
# Tests the web server through real HTTP requests, the way a browser or curl would.
#
#   python tests/api_test.py attendance_server.exe
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
import time

TESTS = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(TESTS)
PORT = 18765

results = []


def check(name, passed, detail=""):
    results.append(passed)
    print(("ok   " if passed else "FAIL ") + name + ("" if passed else "   -> " + str(detail)))


def call(method, path, body=None, token=None, raw=None):
    """Sends one request and returns (status, parsed JSON or text, headers)."""
    connection = http.client.HTTPConnection("127.0.0.1", PORT, timeout=10)
    headers = {}
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
    check("W01 health needs no token", status == 200 and body == {"ok": True}, (status, body))

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
        test_lockout()
    finally:
        stop_server(server, folder)

    test_long_history(exe)
    test_empty_data(exe)
    test_demo_password(exe)

    print("Passed %d of %d checks." % (sum(results), len(results)))
    return 0 if all(results) else 1


if __name__ == "__main__":
    sys.exit(main())
