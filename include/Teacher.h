// Teacher.h
// A teacher or admin who can log in. Inherits the ID and name from Person.

#ifndef TEACHER_H
#define TEACHER_H

#include <string>

#include "Person.h"

class Teacher : public Person {
private:
    std::string username;
    std::string password;     // private: only compared inside checkLogin()

    static int totalTeachers; // used size of the teacher array
    static int nextId;        // next teacher ID to give out

public:
    Teacher();
    Teacher(int teacherId, const std::string& teacherName,
            const std::string& user, const std::string& pass);

    std::string getUsername() const;
    void setPassword(const std::string& newPassword);

    bool checkLogin(const std::string& user, const std::string& pass) const;
    bool isAdmin() const;

    void display() const override;     // prints one table row, never the password
    std::string toFileLine() const;    // returns id|name|username|password

    static int getCount();
    static int generateId();
    static void teacherAdded();
    static void noteLoadedId(int loadedId);
};

#endif
