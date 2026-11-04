// Utils.cpp
// Implementation of the text and validation helpers.

#include "Utils.h"

#include <cctype>
#include <sstream>

using namespace std;

// Removes spaces, tabs, and line endings from both ends of the text.
string trim(const string& text) {
    const string blanks = " \t\r\n";
    size_t start = text.find_first_not_of(blanks);
    if (start == string::npos) {
        return "";
    }
    size_t end = text.find_last_not_of(blanks);
    return text.substr(start, end - start + 1);
}

// Returns a copy of the text in uppercase.
string toUpper(const string& text) {
    string result = text;
    for (size_t i = 0; i < result.length(); i++) {
        result[i] = toupper((unsigned char)result[i]);
    }
    return result;
}

// Converts text to a whole number. Returns false instead of crashing
// if the text is not a number, or is too large for an int.
bool parseInt(const string& text, int& value) {
    stringstream input(text);
    int number;
    if (!(input >> number)) {
        return false;
    }

    char extra;
    if (input >> extra) {      // "12abc" must not be accepted as 12
        return false;
    }

    value = number;
    return true;
}

// Returns true if every character is a letter or a digit.
static bool isAlphaNumeric(const string& text) {
    for (size_t i = 0; i < text.length(); i++) {
        if (!isalnum((unsigned char)text[i])) {
            return false;
        }
    }
    return true;
}

// Roll number: 1 to 15 letters or digits.
bool isValidRollNo(const string& text) {
    return !text.empty() && text.length() <= 15 && isAlphaNumeric(text);
}

// Person name: 1 to 40 characters, only letters, spaces, . ' and -
bool isValidName(const string& text) {
    if (text.empty() || text.length() > 40) {
        return false;
    }
    for (size_t i = 0; i < text.length(); i++) {
        char c = text[i];
        if (!isalpha((unsigned char)c) && c != ' ' && c != '.' && c != '\'' && c != '-') {
            return false;
        }
    }
    return true;
}

// Subject code: 1 to 10 letters or digits.
bool isValidCode(const string& text) {
    return !text.empty() && text.length() <= 10 && isAlphaNumeric(text);
}

// Subject name: 1 to 40 characters, and no | because it separates file fields.
bool isValidSubjectName(const string& text) {
    return !text.empty() && text.length() <= 40 && text.find('|') == string::npos;
}

// Class name: 1 to 15 letters, digits, or hyphens.
bool isValidClassName(const string& text) {
    if (text.empty() || text.length() > 15) {
        return false;
    }
    for (size_t i = 0; i < text.length(); i++) {
        if (!isalnum((unsigned char)text[i]) && text[i] != '-') {
            return false;
        }
    }
    return true;
}

// Username: 3 to 20 letters or digits.
bool isValidUsername(const string& text) {
    return text.length() >= 3 && text.length() <= 20 && isAlphaNumeric(text);
}

// Password: 4 to 20 characters, with no spaces and no |
bool isValidPassword(const string& text) {
    if (text.length() < 4 || text.length() > 20) {
        return false;
    }
    return text.find(' ') == string::npos && text.find('|') == string::npos;
}

// Returns an error if the date is not real, or is later than today.
Result checkClassDate(const Date& date) {
    if (!date.isValid()) {
        return Result(RESULT_INVALID, "Invalid date. Use DD-MM-YYYY, year 2000 or later.", "date");
    }
    if (date.isAfter(Date::today())) {
        return Result(RESULT_INVALID, "The date cannot be in the future.", "date");
    }
    return Result(RESULT_OK);
}
