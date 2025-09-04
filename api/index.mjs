import { Hono } from "hono";
import { cors } from "hono/cors";
import { handle } from "hono/vercel";

// Create a simple Hono app for the API
const app = new Hono().basePath("/api");

// CORS setup
app.use(
  "*",
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? [
            "https://techtreads.netlify.app",
            "https://techtreads-app.netlify.app",
          ]
        : ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  }),
);

// Health check endpoint
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Simple test endpoint for signup
app.post("/auth/signup", async (c) => {
  try {
    const body = await c.req.json();
    console.log("Signup attempt:", body);
    
    return c.json({
      success: true,
      message: "Signup endpoint working - database not connected yet",
    }, 201);
  } catch (error) {
    console.error("Signup error:", error);
    return c.json({
      success: false,
      error: "Signup failed",
    }, 500);
  }
});

// Catch all routes
app.all("*", (c) => {
  return c.json({
    success: false,
    error: "Route not found",
    path: c.req.url,
  }, 404);
});

export default handle(app);
