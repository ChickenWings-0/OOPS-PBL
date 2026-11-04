# run_golden.py
# Checks that the terminal program still behaves exactly as recorded.
#
# Record once, before a refactor:  python tests/run_golden.py attendance.exe --record
# Check any time after that:       python tests/run_golden.py attendance.exe
#
# Every scenario runs in a temporary folder with a fresh copy of tests/fixture_data,
# so the real data/ folder is never touched. The result compared is everything the
# program printed, followed by the exact contents of the data files it left behind.

import datetime
import os
import shutil
import stat
import subprocess
import sys
import tempfile

from golden_scenarios import SCENARIOS

TESTS = os.path.dirname(os.path.abspath(__file__))
FIXTURE = os.path.join(TESTS, "fixture_data")
GOLDEN = os.path.join(TESTS, "golden")
DATA_FILES = ["teachers.txt", "subjects.txt", "students.txt", "attendance.txt"]


def add_lines(path, lines):
    with open(path, "a", newline="") as file:
        file.write("".join(line + "\n" for line in lines))


def setup_data(setup, data):
    """Changes the fresh data folder to suit one scenario."""
    if setup == "no_teachers":
        os.remove(os.path.join(data, "teachers.txt"))
    elif setup == "no_attendance":
        os.remove(os.path.join(data, "attendance.txt"))
    elif setup == "no_data":
        for name in ("subjects.txt", "students.txt", "attendance.txt"):
            os.remove(os.path.join(data, name))
    elif setup == "damaged":
        add_lines(os.path.join(data, "students.txt"), [
            "not a student line", "abc|92018015625|Bad Id|AIML-A", "1|92118015625|Same Id|AIML-A",
            "20|90118015625|Same Roll|AIML-A", "21|bad roll|Bad Roll|AIML-A", "", "22|923|Bad1|AIML-A"])
        add_lines(os.path.join(data, "subjects.txt"), [
            "only|two", "CS201A|Duplicate|AIML-A", "BAD CODE|Name|AIML-A"])
        add_lines(os.path.join(data, "teachers.txt"), [
            "1|Same Id|sameid|goodpass", "x|Bad Id|badid|goodpass", "9|Short|ab|goodpass", "wrong"])
        add_lines(os.path.join(data, "attendance.txt"), [
            "999|CS201A|03-11-2026|P", "1|NOPE|03-11-2026|P", "1|CS201A|30-02-2026|P",
            "1|CS201A|02-11-2026|X", "1|CS201A|03-11-2026|P", "only|three|fields"])
    elif setup == "read_only":
        for name in DATA_FILES:
            os.chmod(os.path.join(data, name), stat.S_IREAD)
    elif setup == "full_students":
        add_lines(os.path.join(data, "students.txt"),
                  ["%d|8%010d|Filler Student|FILLER" % (i, i) for i in range(11, 101)])
    elif setup == "full_subjects":
        add_lines(os.path.join(data, "subjects.txt"),
                  ["ZZ%d|Filler Subject|FILLER" % i for i in range(5, 21)])
    elif setup == "full_teachers":
        add_lines(os.path.join(data, "teachers.txt"),
                  ["%d|Filler Teacher|filler%d|goodpass" % (i, i) for i in range(3, 11)])
    elif setup == "full_records":
        # Student 1 already has 10 records, so 290 more fills the array.
        day = datetime.date(2001, 1, 1)
        lines = []
        for _ in range(290):
            lines.append("1|CS201A|%s|P" % day.strftime("%d-%m-%Y"))
            day += datetime.timedelta(days=1)
        add_lines(os.path.join(data, "attendance.txt"), lines)
    elif setup == "over_limits":
        setup_data("full_students", data)
        setup_data("full_subjects", data)
        setup_data("full_teachers", data)
        setup_data("full_records", data)
        add_lines(os.path.join(data, "students.txt"), ["101|80000000101|One Too Many|FILLER"])
        add_lines(os.path.join(data, "subjects.txt"), ["ZZ21|One Too Many|FILLER"])
        add_lines(os.path.join(data, "teachers.txt"), ["11|One Too Many|filler11|goodpass"])
        add_lines(os.path.join(data, "attendance.txt"), ["1|CS201A|01-01-2002|P"])
    elif setup != "none":
        raise ValueError("unknown setup: " + setup)


def run_scenario(exe, setup, lines):
    """Runs one scenario and returns the bytes to compare."""
    folder = tempfile.mkdtemp(prefix="golden_")
    data = os.path.join(folder, "data")
    try:
        shutil.copytree(FIXTURE, data)
        setup_data(setup, data)

        typed = "".join(line + "\n" for line in lines).encode()
        run = subprocess.run([exe], cwd=folder, input=typed, stdout=subprocess.PIPE,
                             stderr=subprocess.STDOUT, timeout=30)

        result = run.stdout + ("\n[exit code %d]\n" % run.returncode).encode()
        for name in DATA_FILES:
            path = os.path.join(data, name)
            result += ("\n===== %s =====\n" % name).encode()
            if os.path.exists(path):
                with open(path, "rb") as file:
                    result += file.read()
            else:
                result += b"(file does not exist)\n"

        # The date changes every day, so it is replaced before comparing.
        today = datetime.date.today().strftime("%d-%m-%Y").encode()
        return result.replace(today, b"<TODAY>")
    finally:
        for name in DATA_FILES:
            path = os.path.join(data, name)
            if os.path.exists(path):
                os.chmod(path, stat.S_IWRITE | stat.S_IREAD)
        shutil.rmtree(folder, ignore_errors=True)


def main():
    if len(sys.argv) < 2:
        print("Usage: python tests/run_golden.py <path to attendance.exe> [--record]")
        return 2

    exe = os.path.abspath(sys.argv[1])
    record = "--record" in sys.argv
    os.makedirs(GOLDEN, exist_ok=True)

    failed = []
    for name, (setup, lines) in SCENARIOS.items():
        actual = run_scenario(exe, setup, lines)
        path = os.path.join(GOLDEN, name + ".txt")

        if record:
            with open(path, "wb") as file:
                file.write(actual)
            continue

        with open(path, "rb") as file:
            expected = file.read()
        if actual != expected:
            failed.append(name)
            with open(os.path.join(tempfile.gettempdir(), "golden_actual_" + name + ".txt"), "wb") as file:
                file.write(actual)

    if record:
        print("Recorded %d scenarios." % len(SCENARIOS))
        return 0
    print("Passed %d of %d scenarios." % (len(SCENARIOS) - len(failed), len(SCENARIOS)))
    for name in failed:
        print("  DIFFERENT:", name)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
