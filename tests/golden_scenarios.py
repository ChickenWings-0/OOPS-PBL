# golden_scenarios.py
# Scripted terminal sessions used by run_golden.py.
# Each scenario is: name -> (setup name, list of lines typed by the user).
# Together they reach every menu and every message of the terminal program.

ADMIN = ["admin", "admin123"]
TEACHER = ["teacher1", "pass123"]
QUIT = ["0"]   # Exit from the main menu
RESTART = "<<restart>>"   # closes the program and starts it again on the same files

SCENARIOS = {
    # ---------- Login and menus ----------
    "login_three_failures": ("none", ["admin", "wrong", "admin", "bad", "nobody", "nothing"]),
    "login_second_try": ("none", ["admin", "wrong"] + ADMIN + QUIT),
    "login_teacher": ("none", TEACHER + ["5", "abc", "2", "1", "wrong", "0", "0"]),
    "menu_bad_input": ("none", ADMIN + ["abc", "99", "-1", "12abc", "", "1", "7", "0", "2", "9", "0",
                                        "3", "x", "0", "4", "4", "0", "5", "4", "0"] + QUIT),
    "input_ends_at_menu": ("none", ADMIN),
    "input_ends_in_prompt": ("none", ADMIN + ["1", "1", "AB12"]),
    "input_ends_at_login": ("none", ["admin"]),

    # ---------- Students ----------
    "student_add_valid": ("none", ADMIN + [
        "1", "1", "92018015625", "New Student", "aiml-a",
        "1", "00000012345", "Zero Lead", "AIML-B",
        "1", "ab12", "Lower Roll", "aiml-c", "2", "0"] + QUIT),
    "student_add_rejected": ("none", ADMIN + [
        "1",
        "1", "90118015625",
        "1", "90218015625",
        "1", "",
        "1", "bad roll",
        "1", "1234567890123456",
        "1", "AB|12",
        "1", "93018015625", "",
        "1", "93018015625", "Bad|Name",
        "1", "93018015625", "Name123",
        "1", "93018015625", "A" * 41,
        "1", "93018015625", "Good Name", "",
        "1", "93018015625", "Good Name", "BAD CLASS",
        "1", "93018015625", "Good Name", "C" * 16,
        "2", "0"] + QUIT),
    "student_same_name": ("none", ADMIN + [
        "1",
        "1", "94018015625", "diya verma", "AIML-A", "N",
        "1", "94018015625", "Diya Verma", "AIML-A", "maybe", "Y",
        "1", "95018015625", "Diya Verma", "AIML-B",
        "2", "0"] + QUIT),
    "student_search": ("none", ADMIN + [
        "1",
        "3", "1", "3", "999", "3", "abc", "3", "10",
        "4", "90218015625", "4", "sha", "4", "SHA", "4", "", "4", "zzz", "4", "a",
        "0"] + QUIT),
    "student_update": ("none", ADMIN + [
        "1",
        "5", "99999",
        "5", "90118015625", "", "Aarav K Sharma", "",
        "5", "90118015625", "96018015625", "", "",
        "5", "96018015625", "90218015625",
        "5", "96018015625", "bad roll",
        "5", "96018015625", "", "Bad1Name",
        "5", "96018015625", "", "", "BAD CLASS",
        "5", "96018015625", "", "", "AIML-B",
        "2", "0"] + QUIT),
    "student_update_class_no_marks": ("none", ADMIN + [
        "1", "1", "97018015625", "Fresh Student", "AIML-A",
        "5", "97018015625", "", "", "aiml-b", "2", "0"] + QUIT),
    "student_delete": ("none", ADMIN + [
        "1",
        "6", "99999",
        "6", "90318015625", "N",
        "6", "90318015625", "x", "Y",
        "6", "91018015625", "Y",
        "6", "90118015625", "Y",
        "2", "1", "98018015625", "After Delete", "AIML-A", "2", "0"] + QUIT),

    # ---------- Subjects ----------
    "subject_add": ("none", ADMIN + [
        "2",
        "1", "ph201a", "Physics", "aiml-a",
        "1", "cs201a",
        "1", "CS201A",
        "1", "",
        "1", "BAD CODE",
        "1", "12345678901",
        "1", "EN201A", "",
        "1", "EN201A", "Bad|Name",
        "1", "EN201A", "N" * 41,
        "1", "EN201A", "English", "",
        "1", "EN201A", "English", "BAD CLASS",
        "2", "0"] + QUIT),

    # ---------- Attendance ----------
    "mark_new_date": ("none", ADMIN + [
        "3",
        "1", "cs201a", "28-10-2026", "P", "a", "x", "p", "A", "P", "p",
        "3", "90118015625",
        "0"] + QUIT),
    "mark_rejected": ("none", ADMIN + [
        "3",
        "1", "NOPE",
        "1", "CS201A", "03-11-2026",
        "1", "CS201A", "30-02-2026", "31-12-2099", "abc", "32-01-2026", "26-10-2026",
        "0"] + QUIT),
    "mark_today_enter": ("none", ADMIN + [
        "3", "1", "CS201B", "", "P", "P", "A", "P", "1", "CS201B", "", "0"] + QUIT),
    "mark_no_students": ("none", ADMIN + [
        "2", "1", "ZZ101", "Empty Class", "NOBODY", "0",
        "3", "1", "ZZ101", "28-10-2026", "0"] + QUIT),
    "mark_interrupted": ("none", ADMIN + ["3", "1", "CS201A", "28-10-2026", "P", "A"]),
    "mark_edit": ("none", ADMIN + [
        "3",
        "2", "99999",
        "2", "90518015625", "NOPE",
        "2", "90518015625", "CS201A", "28-10-2026",
        "2", "90518015625", "CS201A", "03-11-2026", "x", "P",
        "2", "90518015625", "cs201a", "03-11-2026", "a",
        "3", "90518015625",
        "0"] + QUIT),
    "view_attendance": ("none", ADMIN + [
        "3", "3", "90218015625", "3", "90318015625", "3", "91018015625", "3", "99999", "0"] + QUIT),
    "view_attendance_no_marks": ("none", ADMIN + [
        "1", "1", "97018015625", "No Marks", "AIML-A",
        "1", "97118015625", "No Subjects", "NEWCLASS", "0",
        "3", "3", "97018015625", "3", "97118015625", "0"] + QUIT),

    # ---------- Reports ----------
    "report_defaulters": ("none", ADMIN + ["4", "1", "0"] + QUIT),
    "report_defaulters_none": ("no_attendance", ADMIN + ["4", "1", "0"] + QUIT),
    "report_daily": ("none", ADMIN + [
        "4", "2", "03-11-2026", "2", "27-10-2026", "2", "26-10-2026", "2", "01-11-2026",
        "2", "45-11-2026", "31-12-2099", "01-01-2020", "0"] + QUIT),
    "report_monthly": ("none", ADMIN + [
        "4",
        "3", "aiml-a", "10", "2026",
        "3", "AIML-A", "11", "2026",
        "3", "AIML-B", "10", "2026",
        "3", "AIML-A", "1", "2026",
        "3", "NOPE", "10", "2026",
        "3", "AIML-A", "13", "0", "11", "1999", "abc", "2026",
        "0"] + QUIT),
    "report_monthly_new_student": ("none", ADMIN + [
        "1", "1", "97018015625", "New Joiner", "AIML-A", "0",
        "4", "3", "AIML-A", "11", "2026", "0"] + QUIT),

    # ---------- Account ----------
    "account_password": ("none", ADMIN + [
        "5",
        "1", "wrong",
        "1", "admin123", "abc",
        "1", "admin123", "has space",
        "1", "admin123", "has|bar",
        "1", "admin123", "P" * 21,
        "1", "admin123", "newpass1",
        "0"] + QUIT),
    "account_teachers": ("none", ADMIN + [
        "5",
        "2", "",
        "2", "Bad1Name",
        "2", "New Teacher", "ab",
        "2", "New Teacher", "bad user",
        "2", "New Teacher", "teacher1",
        "2", "New Teacher", "teacher2", "abc",
        "2", "New Teacher", "teacher2", "goodpass",
        "3",
        "0"] + QUIT),

    # ---------- Files ----------
    "file_no_teachers": ("no_teachers", ["admin", "admin123", "5", "3", "0"] + QUIT),
    "file_no_attendance": ("no_attendance", ADMIN + ["3", "3", "90218015625", "0"] + QUIT),
    "file_empty_data": ("no_data", ADMIN + [
        "1", "2", "3", "1", "4", "abc", "0", "2", "2", "0",
        "3", "1", "CS201A", "3", "90118015625", "0",
        "4", "1", "2", "03-11-2026", "3", "AIML-A", "11", "2026", "0"] + QUIT),
    "file_damaged_lines": ("damaged", ADMIN + ["1", "2", "0", "2", "2", "0", "5", "3", "0",
                                               "3", "3", "90118015625", "0"] + QUIT),
    "file_save_fails": ("read_only", ADMIN + [
        "1", "1", "97018015625", "Save Fails", "AIML-A",
        "5", "90118015625", "", "Name Change", "",
        "6", "91018015625", "Y", "0",
        "2", "1", "ZZ101", "No Save", "AIML-A", "0",
        "3", "1", "CS201B", "28-10-2026", "P", "P", "P",
        "2", "90518015625", "CS201A", "03-11-2026", "P", "0",
        "5", "1", "admin123", "newpass1", "2", "New Teacher", "teacher2", "goodpass", "0"] + QUIT),

    # ---------- Restarting the program ----------
    "restart_new_password": ("none", ADMIN + ["5", "1", "admin123", "newpass1", "0"] + QUIT + [RESTART]
                             + ["admin", "admin123", "admin", "newpass1"] + QUIT),
    "restart_new_teacher": ("none", ADMIN + ["5", "2", "New Teacher", "teacher2", "goodpass", "0"] + QUIT
                            + [RESTART, "teacher2", "goodpass", "5", "0"] + QUIT),
    "restart_data_kept": ("none", ADMIN + [
        "1", "1", "92018015625", "New Student", "AIML-B", "0",
        "3", "1", "CS201B", "28-10-2026", "P", "A", "P", "P", "P", "0"] + QUIT + [RESTART] + ADMIN + [
        "1", "1", "92118015625", "Next Student", "AIML-B", "2", "0",
        "3", "3", "92018015625", "0", "4", "2", "28-10-2026", "0"] + QUIT),
    "restart_after_closing_early": ("none", ADMIN + ["1", "1", "92018015625", "Kept Student", "AIML-A",
                                                     RESTART] + ADMIN + ["1", "2", "0"] + QUIT),
    "restart_after_delete": ("none", ADMIN + ["1", "6", "91018015625", "Y", "0"] + QUIT + [RESTART] + ADMIN + [
        "1", "1", "92018015625", "After Restart", "AIML-A", "2", "0"] + QUIT),

    # ---------- Limits ----------
    "limit_students": ("full_students", ADMIN + ["1", "1", "2", "0"] + QUIT),
    "limit_subjects": ("full_subjects", ADMIN + ["2", "1", "2", "0"] + QUIT),
    "limit_teachers": ("full_teachers", ADMIN + ["5", "2", "3", "0"] + QUIT),
    "limit_records": ("full_records", ADMIN + ["3", "1", "CS201A", "28-10-2026", "0"] + QUIT),
    "limit_files_too_long": ("over_limits", ADMIN + ["1", "2", "0", "2", "2", "0"] + QUIT),
}
