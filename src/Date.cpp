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

// Returns the date the way a browser date input expects it, like 2026-11-04.
string Date::toIso() const {
    stringstream text;
    text << setfill('0') << setw(4) << year << "-"
         << setw(2) << month << "-" << setw(2) << day;
    return text.str();
}

// Returns a short label for charts, like 04 Nov.
string Date::shortLabel() const {
    const string names[12] = {"Jan", "Feb", "Mar", "Apr", "May", "Jun",
                              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};
    stringstream text;
    text << setfill('0') << setw(2) << day << " " << names[month - 1];
    return text.str();
}

// The month names, shared by the label functions below.
static const string MONTH_NAMES[12] = {"January", "February", "March", "April", "May", "June", "July",
                                       "August", "September", "October", "November", "December"};

// Returns the month and year, like November 2026.
string Date::monthLabel() const {
    stringstream text;
    text << MONTH_NAMES[month - 1] << " " << year;
    return text.str();
}

// Returns the date for page headings, like Thu, 5 November 2026.
string Date::longLabel() const {
    const string days[7] = {"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"};

    // Sakamoto's method: works out the day of the week from the date.
    const int offsets[12] = {0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4};
    int y = month < 3 ? year - 1 : year;
    int weekday = (y + y / 4 - y / 100 + y / 400 + offsets[month - 1] + day) % 7;

    stringstream text;
    text << days[weekday] << ", " << day << " " << MONTH_NAMES[month - 1] << " " << year;
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

// Converts text like "2026-11-04" into a Date. A browser date input sends
// this format. Returns false if the format is wrong or the date is not real.
bool Date::parseIso(const string& text, Date& result) {
    stringstream input(text);
    int d, m, y;
    char dash1, dash2;

    if (!(input >> y >> dash1 >> m >> dash2 >> d)) {
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
