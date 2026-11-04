// Result.cpp
// Implementation of the Result class.

#include "Result.h"

using namespace std;

// Stores the answer. The message and field are optional.
Result::Result(ResultCode resultCode, const string& text, const string& fieldName)
    : code(resultCode), message(text), field(fieldName) {}

// Returns true if the action worked.
bool Result::isOk() const { return code == RESULT_OK; }

// Getters: give read-only access to the private data.
ResultCode Result::getCode() const { return code; }
string Result::getMessage() const { return message; }
string Result::getField() const { return field; }
