// JsonMapper.cpp
// Implementation of the JsonMapper class.

#include "JsonMapper.h"

#include <cctype>
#include <cmath>
#include <sstream>

using namespace std;
using nlohmann::json;

// Rounds to two decimals, so 80.5555 is sent as 80.56.
double JsonMapper::rounded(double percentage) {
    return floor(percentage * 100.0 + 0.5) / 100.0;
}

// Returns up to two capital letters for the avatar: Neha Kapoor gives NK.
string JsonMapper::initials(const string& name) {
    string result;
    stringstream words(name);
    string word;
    while (words >> word && result.length() < 2) {
        result += (char)toupper((unsigned char)word[0]);
    }
    return result;
}

// The logged-in user, as the frontend needs them.
json JsonMapper::user(const Teacher& teacher) {
    json out;
    out["name"] = teacher.getName();
    out["username"] = teacher.getUsername();
    out["initials"] = initials(teacher.getName());
    out["isAdmin"] = teacher.isAdmin();
    return out;
}

// One row of the teachers table. There is no password here.
json JsonMapper::teacherRow(const Teacher& teacher) {
    json out;
    out["id"] = teacher.getId();
    out["name"] = teacher.getName();
    out["username"] = teacher.getUsername();
    out["isAdmin"] = teacher.isAdmin();
    return out;
}

// Today's date, for showing and for browser date inputs.
json JsonMapper::today() {
    Date date = Date::today();
    json out;
    out["date"] = date.toString();
    out["dateIso"] = date.toIso();
    return out;
}
