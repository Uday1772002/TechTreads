import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  try {
    console.log("Auth function called:", event.path, event.httpMethod);

    if (
      event.httpMethod === "POST" &&
      (event.path === "/signup" || event.path.endsWith("/signup"))
    ) {
      // Parse form data
      const formData = new URLSearchParams(event.body || "");
      const username = formData.get("username");
      const password = formData.get("password");

      console.log("Signup attempt:", {
        username,
        password: password ? "***" : "missing",
        body: event.body,
        contentType: event.headers["content-type"],
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

      // For now, just return success (we'll add database later)
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
      body: JSON.stringify({ success: false, error: "Not found" }),
    };
  } catch (error) {
    console.error("Function error:", error);
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
