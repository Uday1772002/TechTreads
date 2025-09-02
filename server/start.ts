import { serve } from "bun";

import app from "./index";

const port = process.env.PORT || 3000;
const hostname = process.env.HOSTNAME || "0.0.0.0";

console.log(`🚀 Starting server on ${hostname}:${port}`);
console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
console.log(
  `🗄️  Database URL: ${process.env.DATABASE_URL ? "Set" : "Not set"}`,
);

// Test database connection on startup
try {
  const { db } = await import("./adapter");
  console.log("✅ Database connection initialized");
} catch (error) {
  console.error("❌ Database connection failed:", error);
  process.exit(1);
}

serve(
  {
    fetch: app.fetch,
    port: Number(port),
    hostname,
  },
  (info) => {
    console.log(`🎉 Server running at http://${info.hostname}:${info.port}`);
  },
);
