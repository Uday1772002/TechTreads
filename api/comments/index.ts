import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";

import { zValidator } from "@hono/zod-validator";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { generateId, Lucia } from "lucia";
import postgres from "postgres";

// Import your schemas
import { sessionTable, userTable } from "../../server/db/schemas/auth";
import { commentsTable } from "../../server/db/schemas/comments";
import { postsTable } from "../../server/db/schemas/posts";
import { commentUpvotesTable } from "../../server/db/schemas/upvotes";
import { type SuccessResponse } from "../../shared/types";

// Database setup
if (!process.env["DATABASE_URL"]) {
  console.error("DATABASE_URL environment variable is not set");
  throw new Error("DATABASE_URL environment variable is not set");
}

const queryClient = postgres(process.env["DATABASE_URL"]!, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: process.env.NODE_ENV === "production" ? "require" : false,
});

const db = drizzle(queryClient, {
  schema: {
    user: userTable,
    session: sessionTable,
    comments: commentsTable,
    posts: postsTable,
    commentUpvotes: commentUpvotesTable,
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

// Hono app for comments routes
const app = new Hono();

app.use(
  "*",
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://techtreads.vercel.app", "https://techtreads-app.vercel.app"]
        : ["http://localhost:3000", "http://localhost:3001"],
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

// Get comments for a post
app.get("/:id", async (c) => {
  const postId = c.req.param("id");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "10");
  const sortBy = c.req.query("sortBy") || "created_at";
  const order = c.req.query("order") || "desc";

  const offset = (page - 1) * limit;

  const orderBy =
    order === "asc"
      ? asc(commentsTable[sortBy as keyof typeof commentsTable])
      : desc(commentsTable[sortBy as keyof typeof commentsTable]);

  const comments = await db
    .select()
    .from(commentsTable)
    .where(eq(commentsTable.postId, postId))
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  return c.json({
    success: true,
    data: comments,
    pagination: {
      page,
      limit,
      hasMore: comments.length === limit,
    },
  });
});

// Create a comment
app.post(
  "/:id",
  zValidator("form", {
    content: "string",
  }),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Not authenticated" });
    }

    const postId = c.req.param("id");
    const { content } = c.req.valid("form");

    // Verify post exists
    const [post] = await db
      .select()
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .limit(1);

    if (!post) {
      throw new HTTPException(404, { message: "Post not found" });
    }

    const [comment] = await db
      .insert(commentsTable)
      .values({
        id: generateId(15),
        content,
        postId: postId,
        userId: user.id,
        createdAt: new Date(),
      })
      .returning();

    return c.json<SuccessResponse>(
      {
        success: true,
        message: "Comment created",
        data: comment,
      },
      201,
    );
  },
);

// Reply to a comment
app.post(
  "/:id/reply",
  zValidator("form", {
    content: "string",
  }),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Not authenticated" });
    }

    const parentCommentId = c.req.param("id");
    const { content } = c.req.valid("form");

    // Verify parent comment exists
    const [parentComment] = await db
      .select()
      .from(commentsTable)
      .where(eq(commentsTable.id, parentCommentId))
      .limit(1);

    if (!parentComment) {
      throw new HTTPException(404, { message: "Parent comment not found" });
    }

    const [comment] = await db
      .insert(commentsTable)
      .values({
        id: generateId(15),
        content,
        postId: parentComment.postId,
        parentCommentId: parentCommentId,
        userId: user.id,
        createdAt: new Date(),
      })
      .returning();

    return c.json<SuccessResponse>(
      {
        success: true,
        message: "Reply created",
        data: comment,
      },
      201,
    );
  },
);

// Upvote a comment
app.post("/:id/upvote", async (c) => {
  const user = c.get("user");
  if (!user) {
    throw new HTTPException(401, { message: "Not authenticated" });
  }

  const commentId = c.req.param("id");

  // Check if already upvoted
  const [existingUpvote] = await db
    .select()
    .from(commentUpvotesTable)
    .where(
      eq(commentUpvotesTable.commentId, commentId) &&
        eq(commentUpvotesTable.userId, user.id),
    )
    .limit(1);

  if (existingUpvote) {
    // Remove upvote
    await db
      .delete(commentUpvotesTable)
      .where(
        eq(commentUpvotesTable.commentId, commentId) &&
          eq(commentUpvotesTable.userId, user.id),
      );
  } else {
    // Add upvote
    await db.insert(commentUpvotesTable).values({
      id: generateId(15),
      commentId: commentId,
      userId: user.id,
      createdAt: new Date(),
    });
  }

  return c.json({
    success: true,
    message: "Upvote toggled",
  });
});

export default app;
