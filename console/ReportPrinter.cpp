// ReportPrinter.cpp
// Implementation of the ReportPrinter class.

#include "ReportPrinter.h"

#include <iomanip>
#include <iostream>
#include <sstream>

using namespace std;

// Shows one student's attendance in each subject of their class,
// followed by an overall row covering all subjects.
void ReportPrinter::printStudentReport(const Student& student, const Subject subjects[],
                                       const StudentReportData& data) {
    cout << "\nName    : " << student.getName() << endl;
    cout << "Roll No : " << student.getRollNo() << endl;
    cout << "Class   : " << student.getClassName() << endl << endl;

    cout << left << setw(12) << "Code" << setw(42) << "Subject" << setw(9) << "Present"
         << setw(7) << "Total" << setw(16) << "Percentage" << "Status" << endl;
    cout << string(96, '-') << endl;

    for (int i = 0; i < data.lineCount; i++) {
        const SubjectLine& line = data.lines[i];
        const Subject& subject = subjects[line.subjectIndex];

        cout << left << setw(12) << subject.getCode() << setw(42) << subject.getName()
             << setw(9) << line.present << setw(7) << line.total;

        if (line.total == 0) {
            cout << "No classes yet" << endl;
            continue;
        }

        cout << setw(16) << Report::percentText(line.percentage);
        if (line.belowLimit) {
            cout << "Below " << Student::DEFAULTER_LIMIT << "%";
        } else {
            cout << "OK";
        }
        cout << endl;
    }

    if (data.lineCount == 0) {
        cout << "No subjects found for this class." << endl;
        return;
    }

    cout << string(96, '-') << endl;
    cout << left << setw(54) << "Overall" << setw(9) << data.overallPresent
         << setw(7) << data.overallTotal;
    if (data.overallTotal == 0) {
        cout << "No classes yet" << endl;
    } else {
        cout << Report::percentText(data.overallPercentage) << endl;
    }
}

// Shows every student and subject where attendance is below the limit.
void ReportPrinter::printDefaulters(const Student students[], const Subject subjects[],
                                    const DefaulterEntry entries[], int count) {
    if (count == 0) {
        cout << "No defaulters found." << endl;
        return;
    }

    cout << "\nStudents below " << Student::DEFAULTER_LIMIT << "% in a subject\n" << endl;
    cout << left << setw(17) << "Roll No" << setw(30) << "Name"
         << setw(10) << "Class" << setw(12) << "Subject"
         << setw(10) << "Attended" << "Percentage" << endl;
    cout << string(89, '-') << endl;

    for (int i = 0; i < count; i++) {
        const Student& student = students[entries[i].studentIndex];

        stringstream attended;
        attended << entries[i].present << "/" << entries[i].total;
        cout << left << setw(17) << student.getRollNo()
             << setw(30) << student.getName()
             << setw(10) << student.getClassName()
             << setw(12) << subjects[entries[i].subjectIndex].getCode()
             << setw(10) << attended.str()
             << Report::percentText(entries[i].percentage) << endl;
    }
    cout << "Total entries: " << count << endl;
}

// Shows who was present and absent in each subject on one date.
void ReportPrinter::printDailyReport(const Student students[], const Subject subjects[],
                                     const Date& date, const DailyReportData& data) {
    if (data.lineCount == 0) {
        cout << "No records found." << endl;
        return;
    }

    cout << "\nDaily report for " << date.toString() << endl;

    for (int i = 0; i < data.lineCount; i++) {
        const Subject& subject = subjects[data.lines[i].subjectIndex];

        cout << "\n" << subject.getCode() << " - " << subject.getName()
             << " (" << subject.getClassName() << ")" << endl;
        cout << left << setw(17) << "Roll No" << setw(30) << "Name" << "Status" << endl;
        cout << string(55, '-') << endl;

        // List each student who has a mark.
        for (int j = 0; j < Student::getCount(); j++) {
            char status = students[j].getStatus(subject.getCode(), date);
            if (status != '-') {
                cout << left << setw(17) << students[j].getRollNo()
                     << setw(30) << students[j].getName()
                     << (status == 'P' ? "Present" : "Absent") << endl;
            }
        }
        cout << "Present: " << data.lines[i].present
             << ", Absent: " << data.lines[i].absent << endl;
    }
}

// Shows classes held, present count, and percentage for each student
// of one class in one month.
void ReportPrinter::printMonthlyReport(const Student students[], const string& className,
                                       int month, int year, const MonthlyReportData& data) {
    if (!data.anyRecords) {
        cout << "No records found." << endl;
        return;
    }

    cout << "\nMonthly report for " << className << ", month "
         << month << " of " << year << "\n" << endl;
    cout << left << setw(17) << "Roll No" << setw(30) << "Name"
         << setw(7) << "Held" << setw(9) << "Present" << "Percentage" << endl;
    cout << string(73, '-') << endl;

    for (int i = 0; i < data.lineCount; i++) {
        const MonthlyLine& line = data.lines[i];
        const Student& student = students[line.studentIndex];

        cout << left << setw(17) << student.getRollNo()
             << setw(30) << student.getName()
             << setw(7) << line.held << setw(9) << line.present;
        if (line.held == 0) {
            cout << "No classes yet" << endl;
        } else {
            cout << Report::percentText(line.percentage) << endl;
        }
    }
}
