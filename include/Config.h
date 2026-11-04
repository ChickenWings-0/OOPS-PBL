// Config.h
// Size limits for all the fixed-size arrays in the project.
// Changing a limit here changes it everywhere.

#ifndef CONFIG_H
#define CONFIG_H

const int MAX_STUDENTS = 100;   // size of the student array
const int MAX_SUBJECTS = 20;    // size of the subject array
const int MAX_TEACHERS = 10;    // size of the teacher array
const int MAX_RECORDS  = 300;   // attendance records each student can hold

// Longest possible defaulter list: every student in every subject.
const int MAX_DEFAULTER_ENTRIES = MAX_STUDENTS * MAX_SUBJECTS;

// Most class names that can exist: one for each student and subject.
const int MAX_CLASSES = MAX_STUDENTS + MAX_SUBJECTS;

#endif
