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
      // Parse form data - try multiple approaches
      let username, password;

      // First try URLSearchParams (most common for form data)
      try {
        const body = new URLSearchParams(event.body || "");
        username = body.get("username");
        password = body.get("password");
        if (username && password) {
          console.log("Parsed with URLSearchParams");
        }
      } catch (e) {
        console.log("URLSearchParams failed:", e);
      }

      // If that didn't work, try JSON
      if (!username || !password) {
        try {
          const body = JSON.parse(event.body || "{}");
          username = body.username;
          password = body.password;
          if (username && password) {
            console.log("Parsed with JSON");
          }
        } catch (e) {
          console.log("JSON parsing failed:", e);
        }
      }

      // If still no data, try to parse as multipart form data
      if (!username || !password) {
        try {
          // Simple multipart parsing
          const body = event.body || "";
          const usernameMatch = body.match(
            /name="username"\r?\n\r?\n([^\r\n]+)/,
          );
          const passwordMatch = body.match(
            /name="password"\r?\n\r?\n([^\r\n]+)/,
          );
          if (usernameMatch) username = usernameMatch[1];
          if (passwordMatch) password = passwordMatch[1];
          if (username && password) {
            console.log("Parsed with multipart");
          }
        } catch (e) {
          console.log("Multipart parsing failed:", e);
        }
      }
      
      // If still no data, try to parse as FormData (for Hono client)
      if (!username || !password) {
        try {
          // Handle FormData format that Hono client might send
          const body = event.body || "";
          const usernameMatch = body.match(/username=([^&]+)/);
          const passwordMatch = body.match(/password=([^&]+)/);
          if (usernameMatch) username = decodeURIComponent(usernameMatch[1]);
          if (passwordMatch) password = decodeURIComponent(passwordMatch[1]);
          if (username && password) {
            console.log("Parsed with FormData regex");
          }
        } catch (e) {
          console.log("FormData regex parsing failed:", e);
        }
      }

      console.log("Signup attempt:", {
        username,
        password: password ? "***" : "missing",
        contentType: event.headers["content-type"],
        body: event.body,
        bodyLength: event.body?.length,
        allHeaders: event.headers,
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
