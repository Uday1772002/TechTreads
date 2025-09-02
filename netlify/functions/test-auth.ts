import { Handler } from "@netlify/functions";

export const handler: Handler = async (event, context) => {
  try {
    console.log("Event:", JSON.stringify(event, null, 2));
    console.log("Context:", JSON.stringify(context, null, 2));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
      },
      body: JSON.stringify({
        success: true,
        message: "Test function working",
        method: event.httpMethod,
        path: event.path,
        headers: event.headers,
        body: event.body,
        isBase64Encoded: event.isBase64Encoded,
      }),
    };
  } catch (error) {
    console.error("Test function error:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: false,
        error: "Test function failed",
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};
