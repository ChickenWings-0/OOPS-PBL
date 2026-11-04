// api.js
// Every request to the C++ server goes through here.
// The login token lives in sessionStorage, so it disappears when the tab closes.

class ApiError extends Error {
  constructor(status, code, message, field) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

const Api = {
  // Called when the server says our token is no longer valid.
  onSessionEnded: null,

  getToken() {
    return sessionStorage.getItem("token");
  },

  setToken(token) {
    sessionStorage.setItem("token", token);
  },

  clearToken() {
    sessionStorage.removeItem("token");
  },

  // Sends one request. Returns the JSON reply, or throws an ApiError that
  // carries the message written by the C++ server.
  async request(method, path, body) {
    const headers = {};
    const token = Api.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    let reply;
    try {
      reply = await fetch(path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (networkError) {
      throw new ApiError(0, "NETWORK", "Cannot reach the server. Check your connection and try again.");
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
    if (reply.status === 401 && token && Api.onSessionEnded) {
      Api.clearToken();
      Api.onSessionEnded();
    }
    throw new ApiError(reply.status, data.code, data.error, data.field);
  },

  get(path) {
    return Api.request("GET", path);
  },

  post(path, body) {
    return Api.request("POST", path, body);
  },
};
