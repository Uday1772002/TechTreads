import type { Handler } from "@netlify/functions";
import postgres from "postgres";

// Database setup
const queryClient = postgres(process.env["DATABASE_URL"]!, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: process.env.NODE_ENV === "production" ? "require" : false,
});

export const handler: Handler = async (event) => {
  try {
    console.log("Auth function called:", event.path, event.httpMethod);

    if (
      event.httpMethod === "POST" &&
      (event.path === "/signup" || event.path.endsWith("/signup"))
    ) {
      // Parse form data - handle both URLSearchParams and JSON
      let username, password;
      
      if (event.headers["content-type"]?.includes("application/x-www-form-urlencoded")) {
        const body = new URLSearchParams(event.body || "");
        username = body.get("username");
        password = body.get("password");
      } else {
        // Handle JSON or other formats
        try {
          const body = JSON.parse(event.body || "{}");
          username = body.username;
          password = body.password;
        } catch {
          // Fallback to URLSearchParams
          const body = new URLSearchParams(event.body || "");
          username = body.get("username");
          password = body.get("password");
        }
      }

      console.log("Signup attempt:", {
        username,
        password: password ? "***" : "missing",
        contentType: event.headers["content-type"],
        body: event.body,
        bodyLength: event.body?.length,
      });

      if (!username || !password) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            success: false,
            error: "Username and password are required",
            isFormError: true,
          }),
        };
      }

      if (username.length < 3 || username.length > 31) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            success: false,
            error: "Username must be between 3 and 31 characters",
            isFormError: true,
          }),
        };
      }

      if (password.length < 3) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            success: false,
            error: "Password must be at least 3 characters",
            isFormError: true,
          }),
        };
      }

      // Test database connection
      await queryClient`SELECT 1`;

      // For now, just return success (we'll add actual user creation later)
      return {
        statusCode: 201,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          success: true,
          message: "User created (test mode)",
        }),
      };
    }

    return {
      statusCode: 404,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: false,
        error: "Not found",
      }),
    };
  } catch (error) {
    console.error("Auth function error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};
