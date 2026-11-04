// AttendanceSystem.h
// The main controller. It owns the arrays of students, subjects, and teachers,
// and carries out every menu action.

#ifndef ATTENDANCESYSTEM_H
#define ATTENDANCESYSTEM_H

#include <string>

#include "Config.h"
#include "Person.h"
#include "Student.h"
#include "Subject.h"
#include "Teacher.h"

class AttendanceSystem {
private:
    Student students[MAX_STUDENTS];
    Subject subjects[MAX_SUBJECTS];
    Teacher teachers[MAX_TEACHERS];
    int currentTeacher;     // array index of the logged-in teacher, -1 if none

    // Search helpers: each returns an array index, or -1 if not found
    int findStudent(int id) const;                     // by internal ID
    int findStudent(const std::string& rollNo) const;  // overload: by roll number
    int findSubject(const std::string& code) const;
    int findTeacher(const std::string& username) const;

    void showPerson(const Person& person) const;       // runtime polymorphism

public:
    AttendanceSystem();     // loads all data files
    ~AttendanceSystem();    // prints a closing message

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
    void viewStudentAttendance() const;

    // Reports
    void showDefaulters() const;
    void showDailyReport() const;
    void showMonthlyReport() const;
};

#endif
