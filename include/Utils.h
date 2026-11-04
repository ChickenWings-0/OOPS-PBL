// Utils.h
// Shared helper functions for reading input and checking text.
// These are plain functions, not a class, because they keep no data.

#ifndef UTILS_H
#define UTILS_H

#include <string>

#include "Date.h"

// Text helpers
std::string trim(const std::string& text);
std::string toUpper(const std::string& text);
bool parseInt(const std::string& text, int& value);

// Input helpers: each one keeps asking until the input is valid
std::string readLine(const std::string& prompt);
int readInt(const std::string& prompt);
int readIntInRange(const std::string& prompt, int minValue, int maxValue);
bool readYesNo(const std::string& prompt);
Date readDate(const std::string& prompt);
char readStatus(const std::string& prompt);

// Validation rules (see DESIGN.md section 8)
bool isValidRollNo(const std::string& text);
bool isValidName(const std::string& text);
bool isValidCode(const std::string& text);
bool isValidSubjectName(const std::string& text);
bool isValidClassName(const std::string& text);
bool isValidUsername(const std::string& text);
bool isValidPassword(const std::string& text);

#endif
