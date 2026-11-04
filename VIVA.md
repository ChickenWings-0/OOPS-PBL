# VIVA: Preparation Guide

Short answers in simple language. Do not memorise them word for word. Understand the idea, then open the code and find where it happens. Examiners often say "show me this in your code".

Sections 1 to 9 were checked against the final terminal code. Section 10 is written from WEB_PLAN.md, before the web code exists, and must be checked again once it is built.

---

## 1. About the project

**Q1. What does your project do?**
It is a console program for a school or college. A teacher logs in, manages students and subjects, marks attendance by date and subject, and sees percentages, a defaulter list, and daily and monthly reports. Data is saved in text files, so it stays after the program closes.

**Q2. Which concepts does it use?**
The required ones are classes, arrays, static members, and file handling. We also used inheritance and function overloading.

**Q3. How many classes are there?**
Nine: `Date`, `AttendanceRecord`, `Person`, `Student`, `Teacher`, `Subject`, `FileManager`, `Report`, and `AttendanceSystem`.

**Q4. What happens when the program starts?**
`main()` creates one `AttendanceSystem` object. Its constructor loads teachers, subjects, students, and then attendance from the files. Then the login screen appears, and after a correct login the main menu runs in a loop until the user exits.

**Q5. Why does `main.cpp` contain so little logic?**
It only shows menus and calls functions of `AttendanceSystem`. Keeping the menu separate from the logic makes each part easier to read and test.

**Q6. What are the limitations of your project?**
Plain text passwords, fixed array limits, one user at a time, and one lecture per subject per date. Stating these honestly shows that you understand your own design.

---

## 2. Classes and objects

**Q7. What is the difference between a class and an object?**
A class is a blueprint, and an object is a real thing made from it. `Student` is a class. Each student in the `students` array is an object.

**Q8. What is encapsulation? Show an example.**
Keeping data private and allowing access only through functions. `Teacher::password` is private. Outside code cannot read it, and can only ask `checkLogin()` whether a login is correct.

**Q9. What is the difference between private, protected, and public?**
Private: only the class itself. Protected: the class and its derived classes. Public: everyone. `Person::name` is protected, so `Student` and `Teacher` can use it directly.

**Q10. What is a constructor? Which types do you use?**
A special function that runs automatically when an object is created. It has the same name as the class and no return type. We use a default constructor, `Student()`, and a parameterised one, `Student(id, rollNo, name, className)`.

**Q11. Why does `Student` need a default constructor?**
`Student students[100]` creates 100 objects with no arguments, so the compiler needs a constructor that takes none. Without it, the array declaration does not compile.

**Q12. What is a destructor? What do yours do?**
A function that runs automatically when an object is destroyed. It has the class name with `~` in front. Our classes do not use `new`, so there is nothing to free. `~AttendanceSystem()` only prints a closing message. File streams close automatically when they go out of scope.

**Q13. Why are some functions marked `const`?**
`const` after a function means it will not change the object. For example `getName() const`. The compiler gives an error if the function tries to change data, which prevents mistakes.

**Q14. What is composition? Where is it?**
One class containing objects of another, a "has-a" relationship. A `Student` has `AttendanceRecord` objects, and an `AttendanceRecord` has a `Date`.

**Q15. Why separate `.h` and `.cpp` files?**
The `.h` file declares what a class has, and the `.cpp` file defines how it works. Other files only need to include the header. This keeps code organised, and each class easy to find.

**Q16. What is a header guard?**
`#ifndef` / `#define` / `#endif` at the top and bottom of a header. It stops the same header from being included twice in one file, which would cause redefinition errors.

---

## 3. Arrays

**Q17. Where do you use arrays?**
`students[]`, `subjects[]`, and `teachers[]` in `AttendanceSystem`, and `records[]` in each `Student`, which is the student's attendance array. Also `marks[]` during marking, and `fields[]` while reading a file line.

**Q18. How do you add to an array of fixed size?**
The count tells us the next free index. We put the new object at `students[count]`, then increase the count. We check first that the array is not full.

**Q19. How do you delete a student from an array?**
Find the index, then move every later element one place left, and reduce the count by one. Arrays have no built-in delete.

**Q20. What happens when an array is full?**
We check before adding. The program shows "Limit reached" and adds nothing, so we never write past the end of the array.

**Q21. Why arrays and not `vector`?**
Arrays are a required concept in this lab, and they show clearly how storage, searching, and deleting work. The downside is the fixed limit. A `vector` would remove it, which is listed as a future improvement.

**Q22. What is the time complexity of your search?**
Linear search, O(n), because we check each student in turn. For 100 students this is instant.

**Q23. Why pass `Student` by `const` reference?**
A `Student` holds a 300-record array, so one object is about 12 KB. A reference avoids copying it, and `const` guarantees the function will not change it.

**Q24. Why is `app` declared `static` in `main()`?**
All the arrays together are about 1.2 MB. Normal local variables live on the stack, which is limited. A `static` local variable lives in static storage, so this data does not use up the stack.

---

## 4. Static members

**Q25. What is a static data member?**
A variable that belongs to the class, not to any object. There is only one copy, shared by all objects. `totalStudents` is one example.

**Q26. Why did you use static members?**
The total number of students is not a property of one student, it belongs to the whole class. The same is true for the next internal ID. If they were normal members, each object would have its own copy, and the copies would not agree.

**Q27. Why must a static data member be defined outside the class?**
Inside the class it is only declared. Memory must be given exactly once, so we write `int Student::totalStudents = 0;` in `Student.cpp`. Without it, you get a linker error.

**Q28. How is `DEFAULTER_LIMIT` different?**
It is a `static const int`, and for this type C++ allows the value to be given inside the class.

**Q29. What is a static member function?**
A function called through the class name, with no object needed: `Student::getCount()`. It has no `this` pointer, so it can only directly use static members.

**Q30. Can a static function use `name`?**
No. `name` belongs to one object, and a static function has no object to read it from.

**Q31. Why not increase the counter in the constructor?**
`Student students[100]` runs the constructor 100 times when the program starts. A counter in the constructor would say 100 before anyone was added. So we only change it when a real student is added or removed.

**Q32. How does the internal ID generator work?**
`nextId` starts at 1, and `generateId()` returns the value and then increases it. After loading from file, we make sure `nextId` is greater than the highest ID found, so numbers continue correctly between runs.

**Q33. Could an internal ID be reused?**
Yes, in one case: if the student with the highest ID is deleted and the program restarts, that ID can be given again. This is safe because deleting a student also deletes their attendance, so the new student cannot inherit old marks.

**Q34. Why are all `FileManager` and `Report` functions static?**
These classes store no data of their own, so there is nothing an object would hold. `FileManager::saveStudents(students)` is clear and needs no object.

**Q34a. `printStudentHeader()` and `percentText()` are marked `static` but are not in a class. Is that the same thing?**
No, this is a different meaning of the word. On a function outside any class, `static` means the function can only be used inside that one `.cpp` file. It keeps small private helpers hidden from the rest of the program. It has nothing to do with objects or sharing. In `main()`, `static AttendanceSystem app;` is a third meaning: a local variable that lives for the whole program.

---

## 5. File handling

**Q35. Why do we need file handling?**
Variables are in RAM and disappear when the program ends. Files are on disk, so the data stays.

**Q36. What is the difference between `ifstream`, `ofstream`, and `fstream`?**
`ifstream` reads, `ofstream` writes, and `fstream` can do both. All come from the `<fstream>` header. We use the first two, because each of our operations only reads or only writes.

**Q37. Which file modes do you use?**
Reading with `ifstream`. Writing with `ofstream`, which clears the file first. Appending with `ios::app`, which adds to the end, used when marking attendance.

**Q38. Why append for marking but rewrite for other changes?**
New attendance is only added at the end, so appending is enough, and it is faster than rewriting a file that keeps growing. Update and delete change existing lines, so the file has to be rewritten.

**Q39. How do you update or delete a record in a text file?**
Lines have different lengths, so one line cannot be replaced in place. We change the data in the array, and then write the whole array back to the file.

**Q40. Why text files and not binary?**
Text files can be opened in Notepad, which makes checking and the demo easy. Also, a `std::string` usually keeps its characters in separate memory, so writing the raw object to a binary file would not save the actual text. Binary would need fixed `char` arrays.

**Q41. What does a line in `attendance.txt` mean?**
`1|CS201A|26-10-2026|P` means the student with internal ID 1 was present in CS201A on 26 October 2026.

**Q42. Why use `|` as the separator?**
A name can contain spaces, so a space does not work. `|` never appears in normal data, and we reject any input containing it.

**Q43. How do you read one line into its fields?**
`getline()` reads the full line. `splitLine()` then separates it at each `|` into the `fields[]` array, and the numbers are converted from text.

**Q44. What if a file is missing?**
We check whether the file opened. If not, we treat it as empty and continue. The file is created at the next save. If `teachers.txt` is missing, a default admin is created so no one is locked out.

**Q45. What if a line is damaged?**
It is skipped, and a warning gives the file and line number. The remaining data still loads.

**Q46. Why must students load before attendance?**
Each attendance line goes into one student's `records[]` array, so that student must already exist in memory.

**Q47. When is data saved?**
Immediately after every change, not only at exit. So closing the window loses nothing.

---

## 6. Attendance logic

**Q48. How is attendance percentage calculated?**

```
percentage = present * 100.0 / total
```

Here `total` means classes held for that student. For example, 18 present out of 24 gives 75.00%.

**Q49. Why `100.0` and not `100`?**
With two integers, `/` drops the decimal part. `18 / 24 * 100` gives 0, because `18 / 24` is 0 in integer division. Using `100.0` makes the calculation use decimals.

**Q50. What if no classes have been held?**
`total` is 0, and dividing by zero must be avoided. `calcPercentage()` returns 0, and the screens show "No classes yet" instead of a misleading 0%.

**Q51. Who is a defaulter?**
A student below 75% in a subject. It is checked per subject, so a student can appear more than once. Exactly 75% is not a defaulter, because we use `<`, not `<=`. So 18/24 passes and 17/24 (70.83%) is a defaulter.

**Q52. How do you stop attendance being marked twice?**
Before marking, we check `hasRecord(code, date)` for the students of that class. If it is already there, marking is refused, and the user is told to use "Correct a mark".

**Q53. Why collect answers in `marks[]` first?**
So a session is stored only after every answer is entered. If it stops halfway, no half-marked session is saved.

**Q54. How does the daily report work?**
For the chosen date, it goes through each subject and asks every student for their status with `getStatus(code, date)`. A student with no mark returns `-`, so subjects not held that day are skipped. It then lists present and absent students.

**Q55. How does the monthly report work?**
For the chosen class, month, and year, it calls `countTotal(m, y)` and `countPresent(m, y)` for each student, which count only records inside that month.

**Q56. How do you validate a date?**
`Date::isValid()` checks the month is 1 to 12, and the day is within that month's limit. February has 29 days in a leap year. A year is a leap year if it divides by 4 and not by 100, or if it divides by 400. Future dates are also rejected.

**Q57. What happens to attendance when a student is deleted?**
It is deleted too, because records are stored inside the `Student` object. We then rewrite both `students.txt` and `attendance.txt`.

---

## 7. Inheritance and overloading

**Q58. What is inheritance? Where is it used?**
A class gets the members of another class. `Student` and `Teacher` inherit `id`, `name`, and `display()` from `Person`, so that code is not written twice.

**Q59. Which type of inheritance is this?**
Hierarchical inheritance: one base class with two derived classes. It is public inheritance, so public members of `Person` stay public in `Student`.

**Q60. How does the derived class constructor call the base constructor?**
With an initialiser list: `Student(...) : Person(id, name)`. The base part is built first.

**Q61. In what order do constructors and destructors run?**
Constructors: base first, then derived. Destructors: derived first, then base.

**Q62. What is function overloading? Show an example.**
Same function name, different parameters. `searchStudent(int)` searches by internal ID, and `searchStudent(string)` searches by roll number or name. The compiler picks the right one from the argument type. This is compile-time polymorphism.

**Q63. What is the difference between overloading and overriding?**
Overloading: same name, different parameters, usually in one class, decided at compile time. Overriding: a derived class gives its own version of a virtual function with the same signature, decided at run time. `searchStudent` is overloaded. `display()` is overridden.

**Q64. What is runtime polymorphism? Where is it in your project?**
One function call behaves differently depending on the real type of the object, and the choice is made while the program runs.

```cpp
void AttendanceSystem::showPerson(const Person& person) const {
    person.display();   // Student or Teacher version, chosen at run time
}
```

`showPerson()` only knows it has a `Person`, but it can receive a `Student` or a `Teacher`. Because `display()` is `virtual`, C++ looks at the actual object and runs its version. Without `virtual`, the compiler would look only at the `Person&` type, and `Person::display()` would always run. It needs a base class reference or pointer. Calling `display()` directly on a `Student` object does not need polymorphism.

**Q65. Why is the `Person` destructor virtual?**
If a derived object is deleted through a base pointer, a virtual destructor ensures the derived destructor runs too. We do not delete through base pointers here, so it is not strictly needed. It is good practice for any class with virtual functions.

---

## 8. Build and tools

**Q66. Explain your compile command.**

```
g++ -std=c++11 -Wall -Wextra -Iinclude main.cpp src/*.cpp -o attendance.exe
```

`-std=c++11` selects the language version. `-Wall -Wextra` turn on warnings. `-Iinclude` tells the compiler where headers are. `src/*.cpp` compiles all source files. `-o` names the output.

**Q67. Why read input with `getline` and not `cin >>`?**
`cin >>` leaves the newline behind, and the next `getline` then reads an empty line. Also, typing letters where a number is expected breaks `cin`. Reading everything as a line and converting it ourselves avoids both problems.

**Q68. How is the password checked? Is it secure?**
`checkLogin()` compares what was typed with the stored values. It is not secure, because passwords are plain text in `teachers.txt`. A real system would store only a hash. We kept it simple because security is not the focus of this project.

---

## 9. Roll numbers and internal IDs

**Q69. Why is the roll number a `string` and not an `int`?**
An `int` here holds at most 2,147,483,647, so an 11-digit enrollment number does not fit. A number type would also drop leading zeros, turning `00000012345` into `618015625`. We never do arithmetic on it, so it is really a label, not a number.

**Q70. If the user enters the roll number, why have an internal ID too?**
The ID is a fixed key that the program controls. `attendance.txt` stores the ID, so a mistyped roll number can be corrected in one place without changing any attendance lines. It also gives the static `nextId` a real job.

**Q71. How do you reject a duplicate roll number?**
`findStudent(const string&)` loops through the array comparing roll numbers. If it returns an index other than -1, the number already exists and we refuse it. Input is converted to uppercase first, so `ab12` and `AB12` count as the same number.

**Q72. Why not overload `searchStudent` for roll number and name separately?**
Both would take one `string`, so the two functions would have the same signature. The compiler cannot tell them apart and gives an error, because overloads must differ in their parameters. So one `string` version handles both, and the `int` version searches by ID.

---

## 10. Web version

These answers describe the plan in WEB_PLAN.md. File and function names may change slightly during the build.

### Client-server architecture

**Q73. What is client-server architecture? Where is it in your project?**
A client asks for something and a server answers. In our project, the browser is the client and `attendance_server` is the server. The browser only shows the page. The server holds the data and makes every decision.

**Q74. What is HTTP? What is in a request and a response?**
HTTP is the set of rules that browsers and servers use to talk. A request has a method (`POST`), a path (`/api/students`), headers (such as the token), and sometimes a body. A response has a status code (`201`), headers, and a body. HTTP is stateless, which means the server does not remember one request when the next arrives.

**Q75. What does cpp-httplib do for you, and what do you still write?**
It handles sockets, reads the HTTP text, and manages the worker threads. We give it a path and a function to call. Everything that happens inside that function is our code: checking the token, calling the core classes, and building the reply.

**Q76. What do `localhost`, a port, and `0.0.0.0` mean?**
`localhost` (`127.0.0.1`) means this same computer. A port is a number that says which program on the computer should receive the message. Binding to `127.0.0.1` accepts connections only from this laptop. Binding to `0.0.0.0` accepts them from any network, which Render requires so its traffic can reach our server.

### REST APIs

**Q77. What is a REST API?**
It is a way of designing a server around resources, where the URL names the thing and the HTTP method says what to do with it. `GET /api/students` lists students, `POST` adds one, `PUT /api/students/2` updates student 2, and `DELETE /api/students/2` removes them.

**Q78. What is the difference between GET, POST, PUT, and DELETE?**
`GET` reads and changes nothing. `POST` creates something new. `PUT` updates something that exists. `DELETE` removes it. Sending the same `GET` many times is always safe. Sending the same `POST` twice could create two records, which is why our duplicate checks stay in C++.

**Q79. Which status codes do you use, and why do they matter?**
`200` OK, `201` created, `400` bad input, `401` not logged in, `403` logged in but not allowed, `404` not found, `409` conflict such as a duplicate, `429` too many login attempts, and `500` a server failure such as a file that cannot be written. The code tells the JavaScript what kind of reply it got, before it reads the body.

**Q80. What is the difference between 401 and 403?**
`401` means we do not know who you are, so you must log in. `403` means we know who you are, but you are not allowed. A teacher who opens the teachers list gets `403`.

### JSON

**Q81. What is JSON? Why use it?**
JSON is a text format for data, built from name and value pairs, lists, numbers, strings, and true or false. For example, `{ "name": "Diya Verma", "percent": 83.33 }`. Almost every language can read it, including JavaScript, so a C++ server and a browser can share data easily.

**Q82. Why did you use the nlohmann/json library and not write JSON by hand?**
Writing JSON by hand is easy, but reading it is not. A server must handle nested lists, escaped quotes, and deliberately broken input from anyone on the internet. A hand-written parser would be more code than the server itself, and any bug in it would be exposed online. nlohmann/json is one header and well tested, and it works much like a `map`.

**Q83. Your data files use `|`, and your API uses JSON. Why two formats?**
They do different jobs. The `|` files are our storage format, handled by `fstream`. JSON is only the format for messages between the browser and the server. `JsonMapper` converts objects to JSON when a reply is sent, and nothing is stored as JSON.

### From a button click to a C++ member function

**Q84. Walk me through what happens when a user clicks Save on the Add Student form.**
1. The click runs a JavaScript function in `students.js`.
2. It calls `fetch()`, which sends `POST /api/students` with the token in a header and the form values as JSON.
3. cpp-httplib receives the request on a worker thread and matches the path to `ApiServer::handleAddStudent`.
4. The handler locks the mutex, checks the token with `requireLogin`, and reads the JSON.
5. It calls `app.addStudent(...)`, a member function of `AttendanceSystem`.
6. `addStudent` validates the input, rejects a duplicate roll number, adds the object to the `students[]` array, and calls `FileManager::saveStudents`.
7. `saveStudents` rewrites `data/students.txt` using `ofstream`.
8. `addStudent` returns a `Result`, and `sendResult` turns it into `201` with JSON.
9. The JavaScript receives the reply, shows a toast, and reloads the table.

**Q85. Which of those steps contain your project's logic?**
Only the C++ ones, mainly steps 5 to 7. The same `addStudent` runs in the terminal version.

**Q86. How do the terminal and the web use the same code?**
We separated the core from the UI. Core classes take normal parameters and return a `Result`. They never use `cin` or HTTP. `ConsoleUI` collects input with prompts, and `ApiServer` collects it from JSON. Both call the same function. A rule changed in one place changes in both.

**Q87. What is the `Result` class for?**
A core function can no longer print its own error, because it does not know if a terminal or a browser is listening. It returns a `Result` holding success or failure, a code, a message, and the field it is about. The terminal prints the message. The server sends it as JSON with the right status code.

**Q88. Why must validation be in C++ and not JavaScript?**
Anyone can skip the browser and send a request with `curl`, or change the JavaScript. Only the server can be trusted. In many real websites the browser also checks input for speed, but in our project C++ does it all, so the rules exist in one place.

**Q89. The live counter on the marking page changes as you click. Is that not logic in JavaScript?**
Yes, and it is the one UI-only exception to our rule. JavaScript counts the ticked checkboxes so the teacher can see the running Present and Absent numbers without waiting for the network. It is display only: the count is not sent or saved. When Save is pressed, C++ validates the marks, counts them, and saves them, and the totals in the success message come from C++. If someone changed the JavaScript, the counter on their screen could be wrong, but the saved attendance could not.

### Login and security

**Q90. HTTP is stateless. How does the server remember who is logged in?**
After a correct login, `SessionManager` creates a long random token and stores it in an array with the teacher's details and an expiry time. The browser sends that token with each request. The server looks it up to find out who is asking.

**Q91. How are admin-only routes protected?**
`requireAdmin()` runs in C++ on each admin route and checks the teacher linked to the token. Hiding the Teachers menu item is only for appearance. A teacher who calls the URL directly still gets `403`.

**Q92. Could someone download `data/teachers.txt` from the website?**
No. The server only serves files inside `web/`. The `data/` folder has no URL, and the `JsonMapper` code never reads a password.

**Q93. What is XSS, and how do you avoid it?**
Cross-site scripting is when text saved by a user runs as code in someone else's browser. A subject name could contain `<script>`. We insert server text with `textContent`, which always shows it as plain text and never runs it.

**Q94. Are passwords still plain text? Is that acceptable online?**
Yes, they are, and it would not be acceptable for a real product. A real system would store salted hashes. We reduce the risk by using fictional data only, by using HTTPS on Render, by not serving the data folder, and by setting a secret demo password on the live site.

### Threads

**Q95. What is a thread? Why does the server need more than one?**
A thread is a separate path of execution inside one program. With several threads, a slow request from one user does not stop another user's request from being accepted.

**Q96. What is a race condition? How does your mutex prevent one?**
A race condition is when two threads use shared data at the same time and the result depends on timing. Two requests could both read the same `nextId` and create two students with the same ID. `lock_guard<mutex>` lets one thread in at a time. It unlocks automatically when the function ends, even after an early `return`.

**Q97. What happens if two teachers mark the same subject and date at the same moment?**
The mutex makes the requests run one after the other. The first saves. The second finds the records in `hasRecord` and gets `409`. No duplicate lines are written.

**Q98. Why does the mutex live in the server and not the core?**
Only the server has threads. Keeping it out of the core means the terminal version needs no thread support and still builds on g++ 6.3.

### Build and deployment

**Q99. Why did you need a different compiler?**
cpp-httplib needs `std::thread`. Our MinGW g++ 6.3 is 32-bit with the `win32` thread model, so `std::thread` does not exist there, and the library does not support 32-bit. MSYS2's 64-bit g++ 15.2 uses the `posix` thread model and works.

**Q100. Explain the server compile command.**
`-std=c++11` sets the C++ standard. `-Wall -Wextra` turn on warnings. `-D_WIN32_WINNT=0x0A00` tells the Windows headers we target Windows 10. `-I` adds folders to search for headers. `-static` puts the libraries inside the `.exe`. `-lws2_32` links Winsock, the Windows networking library.

**Q101. What is Docker? What does your Dockerfile do?**
Docker packages a program with everything it needs into an image, so it runs the same way anywhere. Our Dockerfile has two stages. The first installs g++ on Linux and compiles the server. The second copies only the program, `web/`, and `data/` into a small image.

**Q102. Why does data disappear on Render's free plan? How is sample data restored?**
A free service has an ephemeral filesystem, so its files return to the original image on every restart, redeploy, or spin-down after 15 idle minutes. The free plan cannot attach a persistent disk. Our sample data is copied into the image, so every start automatically restores it. No restore code is needed.

**Q103. Why set `TZ=Asia/Kolkata` in the Dockerfile?**
Render's clock uses UTC, which is 5 hours 30 minutes behind India. `Date::today()` would give yesterday's date in the early morning, and today's attendance would be rejected as a future date.

**Q104. What are the limitations of the web version?**
Data on the free host resets, passwords are plain text, a restart ends all sessions, a single mutex lets only one request use the data at a time, and the terminal and server should not run on the same files together. Charts and the Inter font need internet access.

---

## 11. Module guide for each member

Each member should know these well and be able to open the code and walk through it. Web files are listed in TASKS.md section 5.1.

### Aksh Rastogi: Core system, login, menus

- **Module:** `main.cpp`, `AttendanceSystem` (core and login), `Teacher`, `Config.h`
- **Be ready to walk through:** program start, the login loop, how menus call `AttendanceSystem`, and how the admin check works
- **Revise:** Q4, Q5, Q12, Q14, Q24, Q64, Q66, Q68
- **Web:** the `ApiServer` handlers, login and tokens, and the mutex. Revise Q73 to Q76, Q84 to Q87, Q90, Q91, Q95 to Q100

### Vaibhav: Students

- **Module:** `Person`, `Student`, student functions in `AttendanceSystem`
- **Be ready to walk through:** adding a student from input to file, the delete shift, and both search overloads
- **Revise:** Q11, Q19, Q25 to Q33, Q58 to Q63, Q69 to Q72
- **Web:** the student routes, search and sorting on the server, and the Add Student click. Revise Q77 to Q80, Q84, Q85, Q88

### Akshay Kumar: Subjects and attendance marking

- **Module:** `Date`, `AttendanceRecord`, `Subject`, marking functions in `AttendanceSystem`
- **Be ready to walk through:** the full marking flow, duplicate checking, correcting a mark, and date validation
- **Revise:** Q8, Q14, Q17, Q52, Q53, Q56, Q57
- **Web:** the attendance routes, the live count, and two teachers marking together. Revise Q78, Q84, Q88, Q89, Q97

### Srishti Gupta: File handling and validation

- **Module:** `FileManager`, `Utils`, sample data
- **Be ready to walk through:** loading one file line by line, append versus rewrite, handling a missing file, and `readInt`
- **Revise:** Q35 to Q47, Q67
- **Web:** `JsonMapper`, why the files stay the same, the design system, and the Dockerfile. Revise Q81 to Q83, Q92, Q93, Q101 to Q103

### Dhruv Kataria: Reports and testing

- **Module:** `Report`, report functions in `AttendanceSystem`, `README.md`, testing
- **Be ready to walk through:** percentage calculation, the defaulter loop, daily and monthly reports, and a few test cases from TASKS.md
- **Revise:** Q34, Q48 to Q51, Q54, Q55
- **Web:** how `Report` fills a struct for both `ReportPrinter` and the API, the dashboard numbers, and the test approach. Revise Q79, Q85 to Q88, Q104

---

## 12. Tips for the viva

1. Run the demo on your own laptop, and test it the day before.
2. Keep the code open, so you can jump to whatever you are asked about.
3. Connect theory to your code: "Static means one shared copy. In our project, that is `totalStudents`."
4. If you do not know an answer, say so and explain what you do know.
5. Practise explaining your module aloud, without reading from this page.
