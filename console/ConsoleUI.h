// ConsoleUI.h
// The terminal version of the user interface. Each function asks for input,
// calls the core, and prints the result. All rules stay in AttendanceSystem.

#ifndef CONSOLEUI_H
#define CONSOLEUI_H

#include <string>

#include "AttendanceSystem.h"
#include "Person.h"
#include "Result.h"

class ConsoleUI {
private:
    AttendanceSystem app;   // composition: the terminal owns the core
    int currentTeacher;     // array index of the logged-in teacher, -1 if none

    void showPerson(const Person& person) const;   // runtime polymorphism
    void show(const Result& result) const;
    bool passes(const Result& result) const;
    int askForStudent();

public:
    ConsoleUI();            // creating app loads all data files
    ~ConsoleUI();           // prints a closing message

    // Login and accounts
    bool login();
    bool isAdminLoggedIn() const;
    void changePassword();
    void addTeacher();
    void viewTeachers() const;

    // Students
    void addStudent();
    void viewAllStudents() const;
    void searchStudent(int id) const;                  // by internal ID
    void searchStudent(const std::string& text) const; // overload: by roll number or name
    void updateStudent();
    void deleteStudent();

    // Subjects
    void addSubject();
    void viewSubjects() const;

    // Attendance
    void markAttendance();
    void editAttendance();
    void viewStudentAttendance();

    // Reports
    void showDefaulters() const;
    void showDailyReport() const;
    void showMonthlyReport() const;
};

#endif
