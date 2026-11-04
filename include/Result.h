// Result.h
// The answer from every core action: did it work, and what should the user see?
// The core never prints, so the terminal and the web server both show this message.

#ifndef RESULT_H
#define RESULT_H

#include <string>

// What kind of answer this is. The web server turns each one into a status code.
enum ResultCode {
    RESULT_OK,
    RESULT_INVALID,        // the input breaks a rule
    RESULT_NOT_FOUND,      // no such student, subject, or record
    RESULT_DUPLICATE,      // it already exists
    RESULT_NEEDS_CONFIRM,  // allowed, but the user must confirm first
    RESULT_LIMIT,          // an array is full
    RESULT_FORBIDDEN,      // only the admin can do this
    RESULT_SAVE_FAILED     // a file could not be written
};

class Result {
private:
    ResultCode code;
    std::string message;   // for example "This roll number already exists."
    std::string field;     // the form field it is about, for example "rollNo"

public:
    Result(ResultCode resultCode, const std::string& text = "",
           const std::string& fieldName = "");

    bool isOk() const;
    ResultCode getCode() const;
    std::string getMessage() const;
    std::string getField() const;
};

#endif
