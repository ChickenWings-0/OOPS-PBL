// Report.cpp
// Implementation of the Report class.

#include "Report.h"

#include <iomanip>
#include <iostream>
#include <sstream>

using namespace std;

// Turns a percentage into text with two decimals, like 83.33%
static string percentText(double percentage) {
    stringstream text;
    text << fixed << setprecision(2) << percentage << "%";
    return text.str();
}

// Shows one student's attendance in each subject of their class,
// followed by an overall row covering all subjects.
void Report::studentReport(const Student& student, const Subject subjects[]) {
    cout << "\nName    : " << student.getName() << endl;
    cout << "Roll No : " << student.getRollNo() << endl;
    cout << "Class   : " << student.getClassName() << endl << endl;

    cout << left << setw(12) << "Code" << setw(42) << "Subject" << setw(9) << "Present"
         << setw(7) << "Total" << setw(16) << "Percentage" << "Status" << endl;
    cout << string(96, '-') << endl;

    int subjectsShown = 0;
    for (int i = 0; i < Subject::getCount(); i++) {
        if (subjects[i].getClassName() != student.getClassName()) {
            continue;
        }
        subjectsShown++;

        string code = subjects[i].getCode();
        int total = student.countTotal(code);
        cout << left << setw(12) << code << setw(42) << subjects[i].getName()
             << setw(9) << student.countPresent(code) << setw(7) << total;

        if (total == 0) {
            cout << "No classes yet" << endl;
            continue;
        }

        double percentage = student.getPercentage(code);
        cout << setw(16) << percentText(percentage);
        if (percentage < Student::DEFAULTER_LIMIT) {
            cout << "Below " << Student::DEFAULTER_LIMIT << "%";
        } else {
            cout << "OK";
        }
        cout << endl;
    }

    if (subjectsShown == 0) {
        cout << "No subjects found for this class." << endl;
        return;
    }

    // Overall is for information only. Defaulters are decided per subject.
    cout << string(96, '-') << endl;
    int overallTotal = student.countTotal();
    cout << left << setw(54) << "Overall" << setw(9) << student.countPresent()
         << setw(7) << overallTotal;
    if (overallTotal == 0) {
        cout << "No classes yet" << endl;
    } else {
        cout << percentText(student.getPercentage()) << endl;
    }
}

// Lists every student and subject where attendance is below the limit.
// Exactly 75% passes, and a subject with no classes held yet is ignored.
void Report::defaulterList(const Student students[], const Subject subjects[]) {
    int entries = 0;

    for (int i = 0; i < Student::getCount(); i++) {
        for (int j = 0; j < Subject::getCount(); j++) {
            if (subjects[j].getClassName() != students[i].getClassName()) {
                continue;
            }

            string code = subjects[j].getCode();
            int total = students[i].countTotal(code);
            if (total == 0 || students[i].getPercentage(code) >= Student::DEFAULTER_LIMIT) {
                continue;
            }

            if (entries == 0) {
                cout << "\nStudents below " << Student::DEFAULTER_LIMIT
                     << "% in a subject\n" << endl;
                cout << left << setw(17) << "Roll No" << setw(30) << "Name"
                     << setw(10) << "Class" << setw(12) << "Subject"
                     << setw(10) << "Attended" << "Percentage" << endl;
                cout << string(89, '-') << endl;
            }

            stringstream attended;
            attended << students[i].countPresent(code) << "/" << total;
            cout << left << setw(17) << students[i].getRollNo()
                 << setw(30) << students[i].getName()
                 << setw(10) << students[i].getClassName() << setw(12) << code
                 << setw(10) << attended.str()
                 << percentText(students[i].getPercentage(code)) << endl;
            entries++;
        }
    }

    if (entries == 0) {
        cout << "No defaulters found." << endl;
    } else {
        cout << "Total entries: " << entries << endl;
    }
}


// Shows who was present and absent in each subject on one date.
void Report::dailyReport(const Student students[], const Subject subjects[], const Date& date) {
    int subjectsShown = 0;

    for (int i = 0; i < Subject::getCount(); i++) {
        string code = subjects[i].getCode();

        // First count the marks, to see if this subject was held on this date.
        int present = 0;
        int absent = 0;
        for (int j = 0; j < Student::getCount(); j++) {
            char status = students[j].getStatus(code, date);
            if (status == 'P') {
                present++;
            } else if (status == 'A') {
                absent++;
            }
        }
        if (present + absent == 0) {
            continue;
        }

        if (subjectsShown == 0) {
            cout << "\nDaily report for " << date.toString() << endl;
        }
        subjectsShown++;

        cout << "\n" << code << " - " << subjects[i].getName()
             << " (" << subjects[i].getClassName() << ")" << endl;
        cout << left << setw(17) << "Roll No" << setw(30) << "Name" << "Status" << endl;
        cout << string(55, '-') << endl;

        // Then list each student who has a mark.
        for (int j = 0; j < Student::getCount(); j++) {
            char status = students[j].getStatus(code, date);
            if (status != '-') {
                cout << left << setw(17) << students[j].getRollNo()
                     << setw(30) << students[j].getName()
                     << (status == 'P' ? "Present" : "Absent") << endl;
            }
        }
        cout << "Present: " << present << ", Absent: " << absent << endl;
    }

    if (subjectsShown == 0) {
        cout << "No records found." << endl;
    }
}

// Shows classes held, present count, and percentage for each student
// of one class in one month, across all subjects.
void Report::monthlyReport(const Student students[], const string& className,
                           int month, int year) {
    // First check that this class has at least one record in this month.
    bool anyRecords = false;
    for (int i = 0; i < Student::getCount(); i++) {
        if (students[i].getClassName() == className &&
            students[i].countTotal(month, year) > 0) {
            anyRecords = true;
        }
    }
    if (!anyRecords) {
        cout << "No records found." << endl;
        return;
    }

    cout << "\nMonthly report for " << className << ", month "
         << month << " of " << year << "\n" << endl;
    cout << left << setw(17) << "Roll No" << setw(30) << "Name"
         << setw(7) << "Held" << setw(9) << "Present" << "Percentage" << endl;
    cout << string(73, '-') << endl;

    for (int i = 0; i < Student::getCount(); i++) {
        if (students[i].getClassName() != className) {
            continue;
        }

        int total = students[i].countTotal(month, year);
        int present = students[i].countPresent(month, year);

        cout << left << setw(17) << students[i].getRollNo()
             << setw(30) << students[i].getName()
             << setw(7) << total << setw(9) << present;
        if (total == 0) {
            cout << "No classes yet" << endl;
        } else {
            cout << percentText(Student::calcPercentage(present, total)) << endl;
        }
    }
}
