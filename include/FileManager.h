// FileManager.h
// All reading and writing of data files happens in this class.
// Every function is static, because the class stores no data of its own.

#ifndef FILEMANAGER_H
#define FILEMANAGER_H

#include <string>

#include "AttendanceRecord.h"
#include "Student.h"
#include "Subject.h"
#include "Teacher.h"

class FileManager {
private:
    static int splitLine(const std::string& line, std::string fields[], int maxFields);
    static void warn(const std::string& fileName, int lineNo, const std::string& reason);
    static std::string attendanceLine(int studentId, const AttendanceRecord& record);

public:
    // Loading. Call in this order: teachers, subjects, students, attendance.
    static void loadTeachers(Teacher teachers[]);
    static void loadSubjects(Subject subjects[]);
    static void loadStudents(Student students[]);
    static void loadAttendance(Student students[], const Subject subjects[]);

    // Saving. These rewrite the whole file and return false on failure.
    static bool saveTeachers(const Teacher teachers[]);
    static bool saveSubjects(const Subject subjects[]);
    static bool saveStudents(const Student students[]);
    static bool saveAttendance(const Student students[]);

    // Adds one line to the end of attendance.txt.
    static bool appendAttendance(int studentId, const AttendanceRecord& record);
};

#endif
