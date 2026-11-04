// Subject.cpp
// Implementation of the Subject class.

#include "Subject.h"

#include <iomanip>
#include <iostream>

using namespace std;

// Definition of the static data member.
int Subject::totalSubjects = 0;

// Default constructor: an empty subject.
Subject::Subject() : code(""), name(""), className("") {}

// Parameterised constructor.
Subject::Subject(const string& subjectCode, const string& subjectName,
                 const string& subjectClass)
    : code(subjectCode), name(subjectName), className(subjectClass) {}

// Getters: give read-only access to the private data.
string Subject::getCode() const { return code; }
string Subject::getName() const { return name; }
string Subject::getClassName() const { return className; }

// Prints the subject as one table row.
void Subject::display() const {
    cout << left << setw(12) << code << setw(42) << name << className << endl;
}

// Builds the line stored in subjects.txt.
string Subject::toFileLine() const {
    return code + "|" + name + "|" + className;
}

// Returns how many subjects exist.
int Subject::getCount() { return totalSubjects; }

// Called when a real subject is added to the array.
void Subject::subjectAdded() { totalSubjects++; }
