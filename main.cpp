// main.cpp
// Program entry point and menus.
// The menus only show options and call ConsoleUI, which calls the core.

#include <iostream>

#include "ConsoleInput.h"
#include "ConsoleUI.h"

using namespace std;

// Student Management submenu.
void studentMenu(ConsoleUI& ui) {
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
            case 1: ui.addStudent(); break;
            case 2: ui.viewAllStudents(); break;
            case 3: ui.searchStudent(readInt("Enter internal ID: ")); break;
            case 4: ui.searchStudent(readLine("Enter roll number or name: ")); break;
            case 5: ui.updateStudent(); break;
            case 6: ui.deleteStudent(); break;
            case 0: return;
        }
    }
}

// Subject Management submenu.
void subjectMenu(ConsoleUI& ui) {
    while (true) {
        cout << "\n--- Subject Management ---\n"
             << "1. Add subject\n"
             << "2. View subjects\n"
             << "0. Back\n";

        switch (readIntInRange("Enter choice: ", 0, 2)) {
            case 1: ui.addSubject(); break;
            case 2: ui.viewSubjects(); break;
            case 0: return;
        }
    }
}

// Attendance submenu.
void attendanceMenu(ConsoleUI& ui) {
    while (true) {
        cout << "\n--- Attendance ---\n"
             << "1. Mark attendance\n"
             << "2. Correct a mark\n"
             << "3. View student attendance\n"
             << "0. Back\n";

        switch (readIntInRange("Enter choice: ", 0, 3)) {
            case 1: ui.markAttendance(); break;
            case 2: ui.editAttendance(); break;
            case 3: ui.viewStudentAttendance(); break;
            case 0: return;
        }
    }
}

// Reports submenu.
void reportMenu(ConsoleUI& ui) {
    while (true) {
        cout << "\n--- Reports ---\n"
             << "1. Defaulter list\n"
             << "2. Daily report\n"
             << "3. Monthly report\n"
             << "0. Back\n";

        switch (readIntInRange("Enter choice: ", 0, 3)) {
            case 1: ui.showDefaulters(); break;
            case 2: ui.showDailyReport(); break;
            case 3: ui.showMonthlyReport(); break;
            case 0: return;
        }
    }
}

// Account submenu. Options 2 and 3 exist for the admin only.
void accountMenu(ConsoleUI& ui) {
    bool admin = ui.isAdminLoggedIn();

    while (true) {
        cout << "\n--- Account ---\n"
             << "1. Change my password\n";
        if (admin) {
            cout << "2. Add teacher\n"
                 << "3. View teachers\n";
        }
        cout << "0. Back\n";

        switch (readIntInRange("Enter choice: ", 0, admin ? 3 : 1)) {
            case 1: ui.changePassword(); break;
            case 2: ui.addTeacher(); break;
            case 3: ui.viewTeachers(); break;
            case 0: return;
        }
    }
}

// Main menu loop. Returns when the user chooses Exit.
void mainMenu(ConsoleUI& ui) {
    while (true) {
        cout << "\n========== MAIN MENU ==========\n"
             << "1. Student Management\n"
             << "2. Subject Management\n"
             << "3. Attendance\n"
             << "4. Reports\n"
             << "5. Account\n"
             << "0. Exit\n";

        switch (readIntInRange("Enter choice: ", 0, 5)) {
            case 1: studentMenu(ui); break;
            case 2: subjectMenu(ui); break;
            case 3: attendanceMenu(ui); break;
            case 4: reportMenu(ui); break;
            case 5: accountMenu(ui); break;
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
    // to keep on the stack. Creating it loads the data files.
    static ConsoleUI ui;

    if (ui.login()) {
        mainMenu(ui);
    }
    return 0;
}
