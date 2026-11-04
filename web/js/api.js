// api.js
// Every request to the C++ server goes through here.
// The login token lives in sessionStorage, so it disappears when the tab closes.
//
// A free Render server sleeps after 15 quiet minutes, and takes up to a minute to
// wake. While it wakes, requests can hang or fail, so this file shows a message
// and keeps trying, instead of showing an error.

const WAKE_NOTICE_AFTER_MS = 4000;   // a slower reply than this shows the message
const WAKE_LIMIT_MS = 90000;         // give up after this long
const WAKE_POLL_MS = 3000;           // how often to ask whether the server is up
const REQUEST_LIMIT_MS = 100000;     // longest wait for one request

class ApiError extends Error {
  constructor(status, code, message, field) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

// The message shown while the server wakes up.
const WakeNotice = {
  box: null,

  show() {
    if (!WakeNotice.box) {
      WakeNotice.box = h("div", { class: "wake", id: "wake-notice", role: "status" },
        h("span", { class: "spinner" }), "Waking up the server, this can take up to a minute...");
      document.body.append(WakeNotice.box);
    }
    WakeNotice.box.hidden = false;
  },

  hide() {
    if (WakeNotice.box) {
      WakeNotice.box.hidden = true;
    }
  },
};

const Api = {
  // Called when the server says our token is no longer valid.
  onSessionEnded: null,

  running: 0,   // how many requests are in progress

  getToken() {
    return sessionStorage.getItem("token");
  },

  setToken(token) {
    sessionStorage.setItem("token", token);
  },

  clearToken() {
    sessionStorage.removeItem("token");
  },

  // Sends one request. Returns the reply, or null if the server could not answer.
  // 502, 503, and 504 come from Render's front door while the server is asleep.
  async send(method, path, body) {
    const headers = {};
    const token = Api.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    try {
      const reply = await fetch(API_BASE + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_LIMIT_MS),
      });
      return [502, 503, 504].includes(reply.status) ? null : reply;
    } catch (networkError) {
      return null;
    }
  },

  // Asks /api/health until the server answers. Returns false if it never does.
  async waitForServer() {
    WakeNotice.show();
    const deadline = Date.now() + WAKE_LIMIT_MS;

    while (Date.now() < deadline) {
      const reply = await Api.send("GET", "/api/health");
      if (reply && reply.ok) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, WAKE_POLL_MS));
    }
    return false;
  },

  // Reading can always be repeated, and so can logging in. A save cannot,
  // because the first try may have reached the server.
  safeToRepeat(method, path) {
    return method === "GET" || path === "/api/login";
  },

  // Sends a request, and waits for a sleeping server if there is one.
  async reach(method, path, body) {
    const reply = await Api.send(method, path, body);
    if (reply) {
      return reply;
    }

    const noReach = new ApiError(0, "NETWORK", "Cannot reach the server. Check your connection and try again.");

    // A page served by the C++ server itself has no separate server to wake.
    if (!API_BASE || !(await Api.waitForServer())) {
      throw noReach;
    }
    if (!Api.safeToRepeat(method, path)) {
      throw new ApiError(0, "WOKE", "The server is awake now. Please save again.");
    }

    const second = await Api.send(method, path, body);
    if (!second) {
      throw noReach;
    }
    return second;
  },

  // Sends one request. Returns the JSON reply, or throws an ApiError that
  // carries the message written by the C++ server.
  async request(method, path, body) {
    Api.running += 1;
    const notice = API_BASE ? setTimeout(WakeNotice.show, WAKE_NOTICE_AFTER_MS) : null;

    let reply;
    try {
      reply = await Api.reach(method, path, body);
    } finally {
      clearTimeout(notice);
      Api.running -= 1;
      if (Api.running === 0) {
        WakeNotice.hide();
      }
    }

    let data;
    try {
      data = await reply.json();
    } catch (parseError) {
      throw new ApiError(reply.status, "BAD_REPLY", "The server sent an unexpected reply.");
    }

    if (reply.ok) {
      return data;
    }

    // A 401 with a token means the session ended, for example after a restart.
    if (reply.status === 401 && Api.getToken() && Api.onSessionEnded) {
      Api.clearToken();
      Api.onSessionEnded();
    }
    throw new ApiError(reply.status, data.code, data.error, data.field);
  },

  // Starts waking the server while the user reads the login page.
  wake() {
    Api.request("GET", "/api/health").catch(() => {});
  },

  get(path) {
    return Api.request("GET", path);
  },

  post(path, body) {
    return Api.request("POST", path, body);
  },

  put(path, body) {
    return Api.request("PUT", path, body);
  },

  delete(path) {
    return Api.request("DELETE", path);
  },
};
