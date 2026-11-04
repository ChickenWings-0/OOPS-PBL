// SessionManager.h
// Remembers who is logged in, because HTTP itself remembers nothing between
// requests. A login creates a random token. The browser sends that token with
// each request, and the token is looked up here.
// Also counts wrong passwords, so a username is locked after too many tries.

#ifndef SESSIONMANAGER_H
#define SESSIONMANAGER_H

#include <ctime>
#include <string>

#include "Config.h"

const int MAX_SESSIONS = 50;                  // size of the session array
const int SESSION_SECONDS = 8 * 60 * 60;      // a login lasts 8 hours
const int MAX_LOGIN_FAILURES = 3;             // same as the terminal version
const int LOCK_SECONDS = 30;                  // wait after too many failures

// One logged-in user.
class Session {
private:
    std::string token;
    int teacher;          // index in the teacher array
    time_t expiresAt;

public:
    Session();
    Session(const std::string& newToken, int teacherIndex, time_t expiryTime);

    std::string getToken() const;
    int getTeacher() const;
    time_t getExpiresAt() const;
};

class SessionManager {
private:
    Session sessions[MAX_SESSIONS];
    int sessionCount;

    // Failed logins, indexed like the teacher array
    int failures[MAX_TEACHERS];
    time_t lockedUntil[MAX_TEACHERS];

    std::string newToken() const;
    void removeAt(int index);
    void removeExpired();

public:
    SessionManager();

    std::string create(int teacher);                  // returns the new token
    int findTeacher(const std::string& token);        // teacher index, or -1
    void remove(const std::string& token);

    int secondsLocked(int teacher);                   // 0 if not locked
    void loginFailed(int teacher);
    void loginWorked(int teacher);
};

#endif
