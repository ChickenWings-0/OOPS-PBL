// Utils.h
// Shared helper functions for cleaning and checking text.
// These are plain functions, not a class, because they keep no data.

#ifndef UTILS_H
#define UTILS_H

#include <string>

#include "Date.h"
#include "Result.h"

// Text helpers
std::string trim(const std::string& text);
std::string toUpper(const std::string& text);
bool parseInt(const std::string& text, int& value);

// Validation rules (see DESIGN.md section 8)
bool isValidRollNo(const std::string& text);
bool isValidName(const std::string& text);
bool isValidCode(const std::string& text);
bool isValidSubjectName(const std::string& text);
bool isValidClassName(const std::string& text);
bool isValidUsername(const std::string& text);
bool isValidPassword(const std::string& text);

// A class date must be a real date and must not be in the future
Result checkClassDate(const Date& date);

#endif
