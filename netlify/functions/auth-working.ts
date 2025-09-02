import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";

import { zValidator } from "@hono/zod-validator";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import type { Handler } from "@netlify/functions";
import { generateId, Lucia } from "lucia";
import postgres from "postgres";

// Import your schemas
import { sessionTable, userTable } from "../../server/db/schemas/auth";
import { loginSchema, type SuccessResponse } from "../../shared/types";

// Database setup
const queryClient = postgres(process.env["DATABASE_URL"]!, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: process.env.NODE_ENV === "production" ? "require" : false,
});

const db = drizzle(queryClient, {
  schema: { user: userTable, session: sessionTable },
});

const adapter = new DrizzlePostgreSQLAdapter(db, sessionTable, userTable);

const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === "production",
    },
  },
  getUserAttributes: (att) => {
    return { username: att.username };
  },
});

// Hono app for auth routes
const app = new Hono();

app.use(
  "*",
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? [
            "https://techtreads.netlify.app",
            "https://techtreads-app.netlify.app",
          ]
        : ["http://localhost:3000", "http://localhost:8888"],
    credentials: true,
  }),
);

app.post("/signup", zValidator("form", loginSchema), async (c) => {
  try {
    const { username, password } = c.req.valid("form");
    const passwordHash = await Bun.password.hash(password);
    const userId = generateId(15);

    await db.insert(userTable).values({
      id: userId,
      username,
      password_hash: passwordHash,
    });

    const session = await lucia.createSession(userId, { username });
    const sessionCookie = lucia.createSessionCookie(session.id).serialize();

    c.header("Set-Cookie", sessionCookie, { append: true });

    return c.json<SuccessResponse>(
      {
        success: true,
        message: "User created",
      },
      201,
    );
  } catch (error) {
    console.error("Signup error:", error);

    if (error instanceof postgres.PostgresError && error.code === "23505") {
      return c.json(
        {
          success: false,
          error: "Username already used",
          isFormError: true,
        },
        409,
      );
    }

    return c.json(
      {
        success: false,
        error: "Failed to create user",
        isFormError: false,
      },
      500,
    );
  }
});

app.post("/login", zValidator("form", loginSchema), async (c) => {
  const { username, password } = c.req.valid("form");

  const [existingUser] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.username, username))
    .limit(1);

  if (!existingUser) {
    throw new HTTPException(401, {
      message: "Incorrect username",
      cause: { form: true },
    });
  }

  const validPassword = await Bun.password.verify(
    password,
    existingUser.password_hash,
  );
  if (!validPassword) {
    throw new HTTPException(401, {
      message: "Incorrect password",
      cause: { form: true },
    });
  }

  const session = await lucia.createSession(existingUser.id, { username });
  const sessionCookie = lucia.createSessionCookie(session.id).serialize();

  c.header("Set-Cookie", sessionCookie, { append: true });

  return c.json<SuccessResponse>(
    {
      success: true,
      message: "Logged in",
    },
    200,
  );
});

app.get("/user", async (c) => {
  const sessionId = lucia.readSessionCookie(c.req.header("Cookie") ?? "");
  if (!sessionId) {
    return c.json({ success: false, error: "Not authenticated" }, 401);
  }

  const { session, user } = await lucia.validateSession(sessionId);
  if (!session || !user) {
    return c.json({ success: false, error: "Invalid session" }, 401);
  }

  return c.json<SuccessResponse<{ username: string }>>({
    success: true,
    message: "User fetched",
    data: { username: user.username },
  });
});

app.get("/logout", async (c) => {
  const sessionId = lucia.readSessionCookie(c.req.header("Cookie") ?? "");
  if (sessionId) {
    await lucia.invalidateSession(sessionId);
  }
  c.header("Set-Cookie", lucia.createBlankSessionCookie().serialize());
  return c.json({ success: true, message: "Logged out" });
});

// Netlify function handler
export const handler: Handler = async (event) => {
  try {
    const url = new URL(event.rawUrl);
    // Handle both direct function calls and API redirects
    let path = url.pathname;
    if (path.startsWith("/.netlify/functions/auth-working")) {
      path = path.replace("/.netlify/functions/auth-working", "");
    } else if (path.startsWith("/api/auth")) {
      path = path.replace("/api/auth", "");
    }

    const request = new Request(event.rawUrl, {
      method: event.httpMethod,
      headers: event.headers as any,
      body:
        event.httpMethod === "GET" || event.httpMethod === "HEAD"
          ? undefined
          : event.body,
    });

    const response = await app.fetch(request);
    const body = await response.text();

    return {
      statusCode: response.status,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        "Content-Type": "application/json",
      } as Record<string, string>,
      body: body,
    };
  } catch (error) {
    console.error("Function error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
      },
      body: JSON.stringify({
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};
