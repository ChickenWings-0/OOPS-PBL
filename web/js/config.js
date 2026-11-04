// config.js
// Where the C++ API lives.
//
// An empty API_BASE means "the same site that served this page", which is true
// when the C++ server serves the frontend itself: on a laptop, and on the Render
// URL. On Vercel the frontend and the API are on different sites.
//
// If Render gives the service a different address, change RENDER_API here.

const RENDER_API = "https://attendance-register.onrender.com";

const API_BASE = window.location.hostname.endsWith(".vercel.app") ? RENDER_API : "";
