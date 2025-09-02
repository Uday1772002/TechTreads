import { Handler } from "@netlify/functions";
import postgres from "postgres";

// Database setup
const queryClient = postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: process.env.NODE_ENV === "production" ? "require" : false,
});

export const handler: Handler = async (event, context) => {
  try {
    // Test database connection
    await queryClient`SELECT 1`;
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
      },
      body: JSON.stringify({
        success: true,
        message: "Database connection successful",
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error("Database connection failed:", error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
      },
      body: JSON.stringify({
        success: false,
        error: "Database connection failed",
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};
