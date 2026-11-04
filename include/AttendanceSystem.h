// AttendanceSystem.h
// The main controller of the core. It owns the arrays of students, subjects,
// and teachers, and carries out every action.
// It never reads input and never prints, so the terminal and the web server
// can both use it. Each action returns a Result saying what happened.

#ifndef ATTENDANCESYSTEM_H
#define ATTENDANCESYSTEM_H

#include <string>

#include "Config.h"
#include "Date.h"
#include "Result.h"
#include "Student.h"
#include "Subject.h"
#include "Teacher.h"

class AttendanceSystem {
private:
    Student students[MAX_STUDENTS];
    Subject subjects[MAX_SUBJECTS];
    Teacher teachers[MAX_TEACHERS];

public:
    AttendanceSystem();     // loads all data files

    // Read-only access for the terminal and the web server
    const Student* getStudents() const;
    const Subject* getSubjects() const;
    const Student& getStudent(int index) const;
    const Subject& getSubject(int index) const;
    const Teacher& getTeacher(int index) const;

    // Search helpers: each returns an array index, or -1 if not found
    int findStudent(int id) const;                     // by internal ID
    int findStudent(const std::string& rollNo) const;  // overload: by roll number
    int findSubject(const std::string& code) const;
    int findTeacher(const std::string& username) const;

    // Fills results[] with the index of every match and returns how many
    int findMatchingStudents(const std::string& text, int results[]) const;

    // Login and accounts. "teacher" and "actor" are indexes in the teacher array.
    int checkLogin(const std::string& username, const std::string& password) const;
    bool isAdmin(int teacher) const;
    Result checkCurrentPassword(int teacher, const std::string& password) const;
    Result checkNewPassword(const std::string& password,
                            const std::string& field = "password") const;
    Result changePassword(int teacher, const std::string& current,
                          const std::string& newPassword);
    Result setAllPasswords(const std::string& password);

    // Teachers
    Result canAddTeacher(int actor) const;
    Result canViewTeachers(int actor) const;
    Result checkNewUsername(const std::string& username) const;
    Result addTeacher(int actor, const std::string& name, const std::string& username,
                      const std::string& password);

    // Rules for one field. Full actions call these too, so a rule exists only once.
    Result checkPersonName(const std::string& name) const;
    Result checkClassName(const std::string& className) const;

    // Students
    Result canAddStudent() const;
    Result checkStudentExists(int index) const;
    Result checkNewRollNo(const std::string& rollNo) const;
    Result checkSameName(const std::string& name, const std::string& className) const;
    Result addStudent(const std::string& rollNo, const std::string& name,
                      const std::string& className, bool confirmed);

    Result checkUpdateRollNo(int index, const std::string& rollNo) const;
    Result checkUpdateName(const std::string& name) const;
    Result checkUpdateClass(int index, const std::string& className) const;
    Result updateStudent(int index, const std::string& rollNo, const std::string& name,
                         const std::string& className);
    Result deleteStudent(int index);

    // Subjects
    Result canAddSubject() const;
    Result checkSubjectExists(const std::string& code) const;
    Result checkNewCode(const std::string& code) const;
    Result checkSubjectName(const std::string& name) const;
    Result addSubject(const std::string& code, const std::string& name,
                      const std::string& className);

    // Attendance. marks[] is indexed like students[], and holds 'P' or 'A'
    // for every student of the subject's class.
    Result checkCanMark(const std::string& code, const Date& date) const;
    Result markAttendance(const std::string& code, const Date& date, const char marks[],
                          int& presentCount, int& absentCount);
    Result checkRecordExists(int index, const std::string& code, const Date& date) const;
    Result editAttendance(int index, const std::string& code, const Date& date, char status);
};

#endif
