import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";

// Create a simple Hono app for the API
const app = new Hono();

// CORS setup
app.use("*", cors({
  origin: process.env.NODE_ENV === "production" 
    ? ["https://techtreads.netlify.app", "https://techtreads-app.netlify.app"]
    : ["http://localhost:3000", "http://localhost:3001"],
  credentials: true,
}));

// Health check endpoint
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Simple test endpoint for signup (basic version without database for now)
app.post("/api/auth/signup", async (c) => {
  try {
    const body = await c.req.json();
    console.log("Signup attempt:", body);
    
    // For now, just return success to test the endpoint
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

// Error handler
app.onError((err, c) => {
  console.error("API Error:", err);
  
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

// Catch all other routes
app.all("*", (c) => {
  return c.json({
    success: false,
    error: "Route not found",
  }, 404);
});

export default app.fetch;
