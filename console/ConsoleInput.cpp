// ConsoleInput.cpp
// Implementation of the keyboard input functions.

#include "ConsoleInput.h"

#include <cstdlib>
#include <iostream>

#include "Result.h"
#include "Utils.h"

using namespace std;

// Shows the prompt and reads one full line.
// Everything is read through here, so leftover newlines are never a problem.
// If input has ended, the program closes instead of looping forever.
string readLine(const string& prompt) {
    cout << prompt;
    string line;
    if (!getline(cin, line)) {
        cout << "\nInput ended. Closing the program." << endl;
        exit(0);
    }
    return trim(line);
}

// Keeps asking until a whole number is entered.
int readInt(const string& prompt) {
    while (true) {
        int value;
        if (parseInt(readLine(prompt), value)) {
            return value;
        }
        cout << "Please enter a whole number." << endl;
    }
}

// Keeps asking until a number between minValue and maxValue is entered.
int readIntInRange(const string& prompt, int minValue, int maxValue) {
    while (true) {
        int value = readInt(prompt);
        if (value >= minValue && value <= maxValue) {
            return value;
        }
        cout << "Please enter a number from " << minValue
             << " to " << maxValue << "." << endl;
    }
}

// Keeps asking until Y or N is entered. Returns true for Y.
bool readYesNo(const string& prompt) {
    while (true) {
        string answer = toUpper(readLine(prompt));
        if (answer == "Y") {
            return true;
        }
        if (answer == "N") {
            return false;
        }
        cout << "Please enter Y or N." << endl;
    }
}

// Keeps asking until a real date that is not in the future is entered.
// Pressing Enter on its own means today.
Date readDate(const string& prompt) {
    while (true) {
        string text = readLine(prompt);
        if (text.empty()) {
            return Date::today();
        }

        Date date(0, 0, 0);          // not a real date, unless the text parses
        Date::parse(text, date);

        Result check = checkClassDate(date);
        if (check.isOk()) {
            return date;
        }
        cout << check.getMessage() << endl;
    }
}

// Keeps asking until P or A is entered, in either case.
char readStatus(const string& prompt) {
    while (true) {
        string answer = toUpper(readLine(prompt));
        if (answer == "P" || answer == "A") {
            return answer[0];
        }
        cout << "Please enter P or A." << endl;
    }
}
