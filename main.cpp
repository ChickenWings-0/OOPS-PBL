// main.cpp
// Program entry point and menus.
// The menus only show options and call AttendanceSystem. All logic lives there.

#include <iostream>

#include "AttendanceSystem.h"
#include "Utils.h"

using namespace std;

// Student Management submenu.
void studentMenu(AttendanceSystem& app) {
    while (true) {
        cout << "\n--- Student Management ---\n"
             << "1. Add student\n"
             << "2. View all students\n"
             << "3. Search by internal ID\n"
             << "4. Search by roll no / name\n"
             << "5. Update student\n"
             << "6. Delete student\n"
             << "0. Back\n";

        switch (readIntInRange("Enter choice: ", 0, 6)) {
            case 1: app.addStudent(); break;
            case 2: app.viewAllStudents(); break;
            case 3: app.searchStudent(readInt("Enter internal ID: ")); break;
            case 4: app.searchStudent(readLine("Enter roll number or name: ")); break;
            case 5: app.updateStudent(); break;
            case 6: app.deleteStudent(); break;
            case 0: return;
        }
    }
}

// Subject Management submenu.
void subjectMenu(AttendanceSystem& app) {
    while (true) {
        cout << "\n--- Subject Management ---\n"
             << "1. Add subject\n"
             << "2. View subjects\n"
             << "0. Back\n";

        switch (readIntInRange("Enter choice: ", 0, 2)) {
            case 1: app.addSubject(); break;
            case 2: app.viewSubjects(); break;
            case 0: return;
        }
    }
}

// Attendance submenu.
void attendanceMenu(AttendanceSystem& app) {
    while (true) {
        cout << "\n--- Attendance ---\n"
             << "1. Mark attendance\n"
             << "2. Correct a mark\n"
             << "3. View student attendance\n"
             << "0. Back\n";

        switch (readIntInRange("Enter choice: ", 0, 3)) {
            case 1: app.markAttendance(); break;
            case 2: app.editAttendance(); break;
            case 3: app.viewStudentAttendance(); break;
            case 0: return;
        }
    }
}

// Reports submenu.
void reportMenu(AttendanceSystem& app) {
    while (true) {
        cout << "\n--- Reports ---\n"
             << "1. Defaulter list\n"
             << "2. Daily report\n"
             << "3. Monthly report\n"
             << "0. Back\n";

        switch (readIntInRange("Enter choice: ", 0, 3)) {
            case 1: app.showDefaulters(); break;
            case 2: app.showDailyReport(); break;
            case 3: app.showMonthlyReport(); break;
            case 0: return;
        }
    }
}

// Account submenu. Options 2 and 3 exist for the admin only.
void accountMenu(AttendanceSystem& app) {
    bool admin = app.isAdminLoggedIn();

    while (true) {
        cout << "\n--- Account ---\n"
             << "1. Change my password\n";
        if (admin) {
            cout << "2. Add teacher\n"
                 << "3. View teachers\n";
        }
        cout << "0. Back\n";

        switch (readIntInRange("Enter choice: ", 0, admin ? 3 : 1)) {
            case 1: app.changePassword(); break;
            case 2: app.addTeacher(); break;
            case 3: app.viewTeachers(); break;
            case 0: return;
        }
    }
}

// Main menu loop. Returns when the user chooses Exit.
void mainMenu(AttendanceSystem& app) {
    while (true) {
        cout << "\n========== MAIN MENU ==========\n"
             << "1. Student Management\n"
             << "2. Subject Management\n"
             << "3. Attendance\n"
             << "4. Reports\n"
             << "5. Account\n"
             << "0. Exit\n";

        switch (readIntInRange("Enter choice: ", 0, 5)) {
            case 1: studentMenu(app); break;
            case 2: subjectMenu(app); break;
            case 3: attendanceMenu(app); break;
            case 4: reportMenu(app); break;
            case 5: accountMenu(app); break;
            case 0: return;
        }
    }
}

// Program entry point: shows the title, loads the data, and starts the login.
int main() {
    cout << "======================================\n"
         << "    ATTENDANCE MANAGEMENT SYSTEM\n"
         << "======================================\n";

    // static: all the arrays together are about 1.2 MB, which is too much
    // to keep on the stack. The constructor loads the data files.
    static AttendanceSystem app;

    if (app.login()) {
        mainMenu(app);
    }
    return 0;
}
