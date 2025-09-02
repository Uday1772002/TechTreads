import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { asc, count, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";

import { zValidator } from "@hono/zod-validator";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { Handler } from "@netlify/functions";
import { Lucia } from "lucia";
import postgres from "postgres";

// Import your schemas
import { sessionTable, userTable } from "../../server/db/schemas/auth";
import { commentsTable } from "../../server/db/schemas/comments";
import { postsTable } from "../../server/db/schemas/posts";
import { postUpvotesTable } from "../../server/db/schemas/upvotes";
import { type SuccessResponse } from "../../shared/types";

// Database setup
const queryClient = postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: process.env.NODE_ENV === "production" ? "require" : false,
});

const db = drizzle(queryClient, {
  schema: {
    user: userTable,
    session: sessionTable,
    posts: postsTable,
    comments: commentsTable,
    postUpvotes: postUpvotesTable,
  },
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

// Hono app for posts routes
const app = new Hono();

app.use(
  "*",
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://techtreads.netlify.app", "https://techtreads-app.netlify.app"]
        : ["http://localhost:3000", "http://localhost:8888"],
    credentials: true,
  }),
);

// Middleware to get user
app.use("*", async (c, next) => {
  const sessionId = lucia.readSessionCookie(c.req.header("Cookie") ?? "");
  if (sessionId) {
    const { session, user } = await lucia.validateSession(sessionId);
    c.set("user", user);
    c.set("session", session);
  }
  await next();
});

app.get("/", async (c) => {
  const page = parseInt(c.req.query("page") || "1");
  const sortBy = c.req.query("sortBy") || "created_at";
  const order = c.req.query("order") || "desc";
  const author = c.req.query("author");
  const site = c.req.query("site");

  const limit = 10;
  const offset = (page - 1) * limit;

  let query = db.select().from(postsTable);

  if (author) {
    query = query.where(eq(postsTable.author_id, author));
  }

  const orderBy =
    order === "asc"
      ? asc(postsTable[sortBy as keyof typeof postsTable])
      : desc(postsTable[sortBy as keyof typeof postsTable]);
  query = query.orderBy(orderBy).limit(limit).offset(offset);

  const posts = await query;

  return c.json({
    success: true,
    data: posts,
    pagination: {
      page,
      limit,
      hasMore: posts.length === limit,
    },
  });
});

app.post(
  "/",
  zValidator("form", {
    title: "string",
    url: "string",
    content: "string",
  }),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Not authenticated" });
    }

    const { title, url, content } = c.req.valid("form");

    const [post] = await db
      .insert(postsTable)
      .values({
        id: crypto.randomUUID(),
        title,
        url,
        content,
        author_id: user.id,
        created_at: new Date(),
      })
      .returning();

    return c.json<SuccessResponse>(
      {
        success: true,
        message: "Post created",
        data: post,
      },
      201,
    );
  },
);

app.get("/:id", async (c) => {
  const id = c.req.param("id");

  const [post] = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.id, id))
    .limit(1);

  if (!post) {
    throw new HTTPException(404, { message: "Post not found" });
  }

  return c.json({
    success: true,
    data: post,
  });
});

app.post("/:id/upvote", async (c) => {
  const user = c.get("user");
  if (!user) {
    throw new HTTPException(401, { message: "Not authenticated" });
  }

  const postId = c.req.param("id");

  // Check if already upvoted
  const [existingUpvote] = await db
    .select()
    .from(postUpvotesTable)
    .where(
      eq(postUpvotesTable.post_id, postId) &&
        eq(postUpvotesTable.user_id, user.id),
    )
    .limit(1);

  if (existingUpvote) {
    // Remove upvote
    await db
      .delete(postUpvotesTable)
      .where(
        eq(postUpvotesTable.post_id, postId) &&
          eq(postUpvotesTable.user_id, user.id),
      );
  } else {
    // Add upvote
    await db.insert(postUpvotesTable).values({
      id: crypto.randomUUID(),
      post_id: postId,
      user_id: user.id,
      created_at: new Date(),
    });
  }

  return c.json({
    success: true,
    message: "Upvote toggled",
  });
});

// Netlify function handler
export const handler: Handler = async (event, context) => {
  const url = new URL(event.rawUrl);
  const path = url.pathname.replace("/.netlify/functions/posts", "");

  const request = new Request(event.rawUrl, {
    method: event.httpMethod,
    headers: event.headers as HeadersInit,
    body: event.body,
  });

  const response = await app.fetch(request);

  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.text(),
  };
};
