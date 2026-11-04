// Date.h
// Stores one calendar date and checks that it is a real date.

#ifndef DATE_H
#define DATE_H

#include <string>

class Date {
private:
    int day;
    int month;
    int year;

public:
    Date();                          // default date: 01-01-2000
    Date(int d, int m, int y);       // date with given values

    int getDay() const;
    int getMonth() const;
    int getYear() const;

    bool isValid() const;                       // is this a real calendar date?
    std::string toString() const;               // returns "DD-MM-YYYY"
    std::string toIso() const;                  // returns "YYYY-MM-DD"
    std::string shortLabel() const;             // returns "26 Oct"
    std::string longLabel() const;              // returns "Thu, 5 November 2026"
    std::string monthLabel() const;             // returns "November 2026"
    bool equals(const Date& other) const;       // same date?
    bool isAfter(const Date& other) const;      // later than the other date?
    bool isInMonth(int m, int y) const;         // in this month and year?

    // Static functions: useful before any Date object exists.
    static Date today();
    static bool isLeapYear(int y);
    static bool parse(const std::string& text, Date& result);
    static bool parseIso(const std::string& text, Date& result);
};

#endif
