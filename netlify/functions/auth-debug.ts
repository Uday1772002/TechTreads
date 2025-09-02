import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  try {
    console.log("=== DEBUG AUTH FUNCTION ===");
    console.log("Method:", event.httpMethod);
    console.log("Path:", event.path);
    console.log("Headers:", JSON.stringify(event.headers, null, 2));
    console.log("Body:", event.body);
    console.log("Body length:", event.body?.length);
    console.log("Content-Type:", event.headers["content-type"]);
    console.log("==========================");

    if (
      event.httpMethod === "POST" &&
      (event.path === "/signup" || event.path.endsWith("/signup"))
    ) {
      // Try different parsing methods
      let username, password;
      const contentType = event.headers["content-type"] || "";

      console.log("Attempting to parse form data...");

      // Method 1: URLSearchParams
      try {
        const formData = new URLSearchParams(event.body || "");
        username = formData.get("username");
        password = formData.get("password");
        console.log("URLSearchParams result:", { username, password: password ? "***" : "missing" });
      } catch (e) {
        console.log("URLSearchParams failed:", e);
      }

      // Method 2: JSON parsing
      if ((!username || !password) && contentType.includes("application/json")) {
        try {
          const jsonData = JSON.parse(event.body || "{}");
          username = jsonData.username;
          password = jsonData.password;
          console.log("JSON parsing result:", { username, password: password ? "***" : "missing" });
        } catch (e) {
          console.log("JSON parsing failed:", e);
        }
      }

      // Method 3: FormData parsing (for multipart)
      if ((!username || !password) && contentType.includes("multipart/form-data")) {
        try {
          // This is a simplified multipart parser
          const body = event.body || "";
          const boundary = contentType.split("boundary=")[1];
          if (boundary) {
            const parts = body.split(`--${boundary}`);
            for (const part of parts) {
              if (part.includes('name="username"')) {
                const match = part.match(/name="username"\r?\n\r?\n([^\r\n]+)/);
                if (match) username = match[1];
              }
              if (part.includes('name="password"')) {
                const match = part.match(/name="password"\r?\n\r?\n([^\r\n]+)/);
                if (match) password = match[1];
              }
            }
            console.log("Multipart parsing result:", { username, password: password ? "***" : "missing" });
          }
        } catch (e) {
          console.log("Multipart parsing failed:", e);
        }
      }

      // Method 4: Raw string parsing
      if (!username || !password) {
        try {
          const body = event.body || "";
          const usernameMatch = body.match(/username=([^&]+)/);
          const passwordMatch = body.match(/password=([^&]+)/);
          if (usernameMatch) username = decodeURIComponent(usernameMatch[1]);
          if (passwordMatch) password = decodeURIComponent(passwordMatch[1]);
          console.log("Raw string parsing result:", { username, password: password ? "***" : "missing" });
        } catch (e) {
          console.log("Raw string parsing failed:", e);
        }
      }

      console.log("Final parsing result:", { username, password: password ? "***" : "missing" });

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          debug: true,
          method: event.httpMethod,
          path: event.path,
          contentType: event.headers["content-type"],
          body: event.body,
          bodyLength: event.body?.length,
          parsedData: { username, password: password ? "***" : "missing" },
          allHeaders: event.headers,
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
    console.error("Debug function error:", error);
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
