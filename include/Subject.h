// Subject.h
// A subject taught to one class.

#ifndef SUBJECT_H
#define SUBJECT_H

#include <string>

class Subject {
private:
    std::string code;         // unique, for example CS201A
    std::string name;         // for example OOPs using C++
    std::string className;    // the class it is taught to, for example AIML-A

    static int totalSubjects; // used size of the subject array

public:
    Subject();                // required for the array of subjects
    Subject(const std::string& subjectCode, const std::string& subjectName,
            const std::string& subjectClass);

    std::string getCode() const;
    std::string getName() const;
    std::string getClassName() const;

    void display() const;              // prints one table row
    std::string toFileLine() const;    // returns code|name|className

    static int getCount();
    static void subjectAdded();
};

#endif
