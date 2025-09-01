import { defineConfig } from "drizzle-kit";

// DEPLOYMENT TEST - SSL configuration for Render PostgreSQL
export default defineConfig({
  dialect: "postgresql",
  schema: "server/db/schemas/*",
  out: "drizzle",
  dbCredentials: {
    url: process.env["DATABASE_URL"]!,
    ssl: {
      rejectUnauthorized: false,
    },
  },
});
