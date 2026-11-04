// server_main.cpp
// Entry point of the web server. Reads its settings and starts ApiServer.
//
// Settings come from environment variables, so the same program runs on a
// laptop and on the hosting service:
//   PORT            port to listen on, default 8080
//   HOST            address to bind to, default 127.0.0.1 (this computer only)
//   ALLOWED_ORIGIN  sites that may call the API from a browser, comma-separated
//   DEMO_PASSWORD   if set, replaces every account's password at startup

#include <cstdlib>
#include <iostream>
#include <string>

#include "ApiServer.h"
#include "Utils.h"

using namespace std;

// Returns an environment variable, or the default if it is not set.
static string setting(const char* name, const string& defaultValue) {
    const char* value = getenv(name);
    return value != 0 ? string(value) : defaultValue;
}

// Program entry point.
int main() {
    int port;
    if (!parseInt(setting("PORT", "8080"), port)) {
        cout << "Error: PORT must be a number." << endl;
        return 1;
    }
    string host = setting("HOST", "127.0.0.1");

    // static: like the terminal version, this is too large for the stack.
    // Creating it loads the data files.
    static ApiServer server;

    server.allowOrigins(setting("ALLOWED_ORIGIN", ""));

    string demoPassword = setting("DEMO_PASSWORD", "");
    if (!demoPassword.empty()) {
        server.useDemoPassword(demoPassword);
    }

    return server.start(host, port) ? 0 : 1;
}
