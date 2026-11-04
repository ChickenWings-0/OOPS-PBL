// Person.cpp
// Implementation of the Person base class.

#include "Person.h"

#include <iostream>

using namespace std;

// Default constructor: an empty person with ID 0.
Person::Person() : id(0), name("") {}

// Parameterised constructor.
Person::Person(int personId, const string& personName) : id(personId), name(personName) {}

// Nothing to clean up, because this class does not use new.
Person::~Person() {}

// Getters and setter for the ID and name.
int Person::getId() const { return id; }
string Person::getName() const { return name; }
void Person::setName(const string& newName) { name = newName; }

// Basic version, replaced by Student and Teacher.
void Person::display() const {
    cout << id << "  " << name << endl;
}
