// ConsoleInput.h
// Functions that read from the keyboard. Only the terminal version uses these.
// Each one keeps asking until the input is valid.

#ifndef CONSOLEINPUT_H
#define CONSOLEINPUT_H

#include <string>

#include "Date.h"

std::string readLine(const std::string& prompt);
int readInt(const std::string& prompt);
int readIntInRange(const std::string& prompt, int minValue, int maxValue);
bool readYesNo(const std::string& prompt);
Date readDate(const std::string& prompt);
char readStatus(const std::string& prompt);

#endif
