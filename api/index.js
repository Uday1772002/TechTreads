const { Hono } = require("hono");
const { cors } = require("hono/cors");
const { HTTPException } = require("hono/http-exception");
const { generateId } = require("lucia");
const bcrypt = require("bcrypt");
const { eq } = require("drizzle-orm");
const postgres = require("postgres");

// We'll need to recreate the essential parts here since require won't work with TS paths
const app = new Hono();

// Basic CORS setup
app.use("*", cors({
  origin: process.env.NODE_ENV === "production" 
    ? ["https://techtreads.netlify.app", "https://techtreads-app.netlify.app"]
    : ["http://localhost:3000", "http://localhost:3001"],
  credentials: true,
}));

// Simple health check
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Error handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({
      success: false,
      error: err.message,
    }, err.status);
  }

  return c.json({
    success: false,
    error: process.env.NODE_ENV === "production" 
      ? "Internal Server Error" 
      : err.message,
  }, 500);
});

module.exports = app.fetch;
