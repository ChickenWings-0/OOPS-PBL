// JsonMapper.h
// Turns core objects and report structs into JSON for the browser.
// Only values that a getter gives out can reach JSON, and Teacher has no
// password getter, so a password can never appear in a reply.
// Every function is static, because the class stores no data of its own.

#ifndef JSONMAPPER_H
#define JSONMAPPER_H

#include <string>

#include "Date.h"
#include "Report.h"
#include "Result.h"
#include "Student.h"
#include "Subject.h"
#include "Teacher.h"
#include "json.hpp"

class JsonMapper {
public:
    static double rounded(double percentage);          // two decimals, for charts
    static std::string initials(const std::string& name);

    static std::string greeting(const std::string& name);

    static nlohmann::json user(const Teacher& teacher);
    static nlohmann::json studentRow(const Student& student);
    static nlohmann::json subjectRow(const Subject& subject);
    static nlohmann::json teacherRow(const Teacher& teacher);
    static nlohmann::json today();
    static nlohmann::json lastMarked(bool anyMarks, const Date& date);
    static nlohmann::json defaulterRow(const DefaulterEntry& entry, const Student students[],
                                       const Subject subjects[]);

    static nlohmann::json studentReport(const Student& student, const Subject subjects[],
                                        const StudentReportData& data);
    static nlohmann::json dailyReport(const Student students[], const Subject subjects[],
                                      const Date& date, const DailyReportData& data);
    static nlohmann::json monthlyReport(const Student students[], const std::string& className,
                                        int month, int year, const MonthlyReportData& data);

    static nlohmann::json recentSessions(const SessionLine lines[], int count,
                                         const Subject subjects[]);
    static nlohmann::json dashboard(const DashboardData& data, const TrendPoint trend[],
                                    int trendCount, const SubjectLine lines[], int lineCount,
                                    const Subject subjects[], int classCount);
};

#endif
