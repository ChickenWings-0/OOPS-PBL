// Teacher.cpp
// Implementation of the Teacher class.

#include "Teacher.h"

#include <iomanip>
#include <iostream>
#include <sstream>

using namespace std;

// Definitions of the static data members.
int Teacher::totalTeachers = 0;
int Teacher::nextId = 1;

// Default constructor: required for the array of teachers.
Teacher::Teacher() : Person(), username(""), password("") {}

// Parameterised constructor. Calls the Person constructor first.
Teacher::Teacher(int teacherId, const string& teacherName,
                 const string& user, const string& pass)
    : Person(teacherId, teacherName), username(user), password(pass) {}

// Getter for the username and setter for the password.
// There is deliberately no getter for the password.
string Teacher::getUsername() const { return username; }
void Teacher::setPassword(const string& newPassword) { password = newPassword; }

// Returns true if both the username and the password match.
bool Teacher::checkLogin(const string& user, const string& pass) const {
    return username == user && password == pass;
}

// The account named admin has extra options.
bool Teacher::isAdmin() const {
    return username == "admin";
}

// Overrides Person::display(). The password is never shown.
void Teacher::display() const {
    cout << left << setw(6) << id << setw(30) << name << username << endl;
}

// Builds the line stored in teachers.txt.
string Teacher::toFileLine() const {
    stringstream line;
    line << id << "|" << name << "|" << username << "|" << password;
    return line.str();
}

// Returns how many teachers exist.
int Teacher::getCount() { return totalTeachers; }

// Returns a new teacher ID, then moves on to the next one.
int Teacher::generateId() { return nextId++; }

// Called when a real teacher is added to the array.
void Teacher::teacherAdded() { totalTeachers++; }

// While loading from file, keeps nextId above the highest ID found.
void Teacher::noteLoadedId(int loadedId) {
    if (loadedId >= nextId) {
        nextId = loadedId + 1;
    }
}
