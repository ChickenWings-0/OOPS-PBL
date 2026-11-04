// Date.cpp
// Implementation of the Date class.

#include "Date.h"

#include <ctime>
#include <iomanip>
#include <sstream>

using namespace std;

// Default constructor: needed so Date can be a member of other classes.
Date::Date() : day(1), month(1), year(2000) {}

// Parameterised constructor.
Date::Date(int d, int m, int y) : day(d), month(m), year(y) {}

// Getters: give read-only access to the private data.
int Date::getDay() const { return day; }
int Date::getMonth() const { return month; }
int Date::getYear() const { return year; }

// Checks the year, the month, and the number of days in that month.
bool Date::isValid() const {
    if (year < 2000 || month < 1 || month > 12) {
        return false;
    }

    int daysInMonth[12] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    int maxDay = daysInMonth[month - 1];
    if (month == 2 && isLeapYear(year)) {
        maxDay = 29;
    }

    return day >= 1 && day <= maxDay;
}

// Returns the date as text, with leading zeros, like 04-11-2026.
string Date::toString() const {
    stringstream text;
    text << setfill('0') << setw(2) << day << "-"
         << setw(2) << month << "-" << setw(4) << year;
    return text.str();
}

// Returns true if both dates are the same day.
bool Date::equals(const Date& other) const {
    return day == other.day && month == other.month && year == other.year;
}

// Returns true if this date comes after the other date.
bool Date::isAfter(const Date& other) const {
    if (year != other.year) {
        return year > other.year;
    }
    if (month != other.month) {
        return month > other.month;
    }
    return day > other.day;
}

// Returns true if this date falls in the given month and year.
bool Date::isInMonth(int m, int y) const {
    return month == m && year == y;
}

// Returns today's date from the computer's clock.
Date Date::today() {
    time_t now = time(0);
    tm* local = localtime(&now);
    // tm_mon counts from 0, and tm_year counts from 1900.
    return Date(local->tm_mday, local->tm_mon + 1, local->tm_year + 1900);
}

// Leap year: divisible by 4 but not by 100, or divisible by 400.
bool Date::isLeapYear(int y) {
    return (y % 4 == 0 && y % 100 != 0) || (y % 400 == 0);
}

// Converts text like "04-11-2026" into a Date.
// Returns false if the format is wrong or the date is not real.
bool Date::parse(const string& text, Date& result) {
    stringstream input(text);
    int d, m, y;
    char dash1, dash2;

    if (!(input >> d >> dash1 >> m >> dash2 >> y)) {
        return false;
    }
    if (dash1 != '-' || dash2 != '-') {
        return false;
    }

    char extra;
    if (input >> extra) {      // anything left over means bad format
        return false;
    }

    Date parsed(d, m, y);
    if (!parsed.isValid()) {
        return false;
    }

    result = parsed;
    return true;
}
