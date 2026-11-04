// SessionManager.cpp
// Implementation of the Session and SessionManager classes.

#include "SessionManager.h"

#include <iomanip>
#include <random>
#include <sstream>

using namespace std;

// ---------- Session ----------

// Default constructor: required for the array of sessions.
Session::Session() : token(""), teacher(-1), expiresAt(0) {}

// Parameterised constructor.
Session::Session(const string& newToken, int teacherIndex, time_t expiryTime)
    : token(newToken), teacher(teacherIndex), expiresAt(expiryTime) {}

// Getters: give read-only access to the private data.
string Session::getToken() const { return token; }
int Session::getTeacher() const { return teacher; }
time_t Session::getExpiresAt() const { return expiresAt; }

// ---------- SessionManager ----------

// Starts with nobody logged in and no failed logins.
SessionManager::SessionManager() : sessionCount(0) {
    for (int i = 0; i < MAX_TEACHERS; i++) {
        failures[i] = 0;
        lockedUntil[i] = 0;
    }
}

// Builds a 128-bit random token as 32 hex characters.
// random_device asks the operating system, so tokens cannot be guessed.
string SessionManager::newToken() const {
    random_device device;
    stringstream text;
    for (int i = 0; i < 4; i++) {
        text << hex << setfill('0') << setw(8) << device();
    }
    return text.str();
}

// Removes one session by moving every later session one place left.
void SessionManager::removeAt(int index) {
    for (int i = index; i < sessionCount - 1; i++) {
        sessions[i] = sessions[i + 1];
    }
    sessionCount--;
}

// Removes every session whose time has run out.
void SessionManager::removeExpired() {
    time_t now = time(0);
    for (int i = sessionCount - 1; i >= 0; i--) {
        if (sessions[i].getExpiresAt() <= now) {
            removeAt(i);
        }
    }
}

// Creates a session and returns its token. If the array is full, the oldest
// session is ended to make room.
string SessionManager::create(int teacher) {
    removeExpired();
    if (sessionCount >= MAX_SESSIONS) {
        removeAt(0);
    }

    string token = newToken();
    sessions[sessionCount] = Session(token, teacher, time(0) + SESSION_SECONDS);
    sessionCount++;
    return token;
}

// Returns the teacher index for a token, or -1 if it is unknown or expired.
int SessionManager::findTeacher(const string& token) {
    removeExpired();
    for (int i = 0; i < sessionCount; i++) {
        if (sessions[i].getToken() == token) {
            return sessions[i].getTeacher();
        }
    }
    return -1;
}

// Logs out: removes the session with this token, if there is one.
void SessionManager::remove(const string& token) {
    for (int i = 0; i < sessionCount; i++) {
        if (sessions[i].getToken() == token) {
            removeAt(i);
            return;
        }
    }
}

// Returns how many seconds this teacher must still wait, or 0.
int SessionManager::secondsLocked(int teacher) {
    time_t now = time(0);
    if (lockedUntil[teacher] > now) {
        return (int)(lockedUntil[teacher] - now);
    }
    return 0;
}

// Counts a wrong password. Too many in a row locks the username for a while.
void SessionManager::loginFailed(int teacher) {
    failures[teacher]++;
    if (failures[teacher] >= MAX_LOGIN_FAILURES) {
        lockedUntil[teacher] = time(0) + LOCK_SECONDS;
        failures[teacher] = 0;
    }
}

// A correct password clears the count.
void SessionManager::loginWorked(int teacher) {
    failures[teacher] = 0;
    lockedUntil[teacher] = 0;
}
