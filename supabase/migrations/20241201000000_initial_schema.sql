-- Create users table
CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY NOT NULL,
  "username" text NOT NULL,
  "password_hash" text NOT NULL,
  CONSTRAINT "user_username_unique" UNIQUE("username")
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS "session" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
);

-- Create posts table
CREATE TABLE IF NOT EXISTS "posts" (
  "id" text PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "url" text,
  "content" text,
  "author_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "posts_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE CASCADE
);

-- Create comments table
CREATE TABLE IF NOT EXISTS "comments" (
  "id" text PRIMARY KEY NOT NULL,
  "content" text NOT NULL,
  "post_id" text NOT NULL,
  "parent_id" text,
  "author_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE,
  CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE CASCADE,
  CONSTRAINT "comments_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE CASCADE
);

-- Create post upvotes table
CREATE TABLE IF NOT EXISTS "post_upvotes" (
  "id" text PRIMARY KEY NOT NULL,
  "post_id" text NOT NULL,
  "user_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "post_upvotes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE,
  CONSTRAINT "post_upvotes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE,
  CONSTRAINT "post_upvotes_post_id_user_id_unique" UNIQUE("post_id", "user_id")
);

-- Create comment upvotes table
CREATE TABLE IF NOT EXISTS "comment_upvotes" (
  "id" text PRIMARY KEY NOT NULL,
  "comment_id" text NOT NULL,
  "user_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "comment_upvotes_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE,
  CONSTRAINT "comment_upvotes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE,
  CONSTRAINT "comment_upvotes_comment_id_user_id_unique" UNIQUE("comment_id", "user_id")
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "session_user_id_idx" ON "session"("user_id");
CREATE INDEX IF NOT EXISTS "posts_author_id_idx" ON "posts"("author_id");
CREATE INDEX IF NOT EXISTS "posts_created_at_idx" ON "posts"("created_at");
CREATE INDEX IF NOT EXISTS "comments_post_id_idx" ON "comments"("post_id");
CREATE INDEX IF NOT EXISTS "comments_parent_id_idx" ON "comments"("parent_id");
CREATE INDEX IF NOT EXISTS "comments_author_id_idx" ON "comments"("author_id");
CREATE INDEX IF NOT EXISTS "post_upvotes_post_id_idx" ON "post_upvotes"("post_id");
CREATE INDEX IF NOT EXISTS "post_upvotes_user_id_idx" ON "post_upvotes"("user_id");
CREATE INDEX IF NOT EXISTS "comment_upvotes_comment_id_idx" ON "comment_upvotes"("comment_id");
CREATE INDEX IF NOT EXISTS "comment_upvotes_user_id_idx" ON "comment_upvotes"("user_id");

-- Enable Row Level Security (RLS)
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "post_upvotes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "comment_upvotes" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can read all users
CREATE POLICY "Users can read all users" ON "user" FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile" ON "user" FOR UPDATE USING (auth.uid()::text = id);

-- Sessions are managed by the application
CREATE POLICY "Sessions are managed by app" ON "session" FOR ALL USING (true);

-- Posts are readable by everyone
CREATE POLICY "Posts are readable by everyone" ON "posts" FOR SELECT USING (true);

-- Users can create posts
CREATE POLICY "Users can create posts" ON "posts" FOR INSERT WITH CHECK (auth.uid()::text = author_id);

-- Users can update their own posts
CREATE POLICY "Users can update own posts" ON "posts" FOR UPDATE USING (auth.uid()::text = author_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete own posts" ON "posts" FOR DELETE USING (auth.uid()::text = author_id);

-- Comments are readable by everyone
CREATE POLICY "Comments are readable by everyone" ON "comments" FOR SELECT USING (true);

-- Users can create comments
CREATE POLICY "Users can create comments" ON "comments" FOR INSERT WITH CHECK (auth.uid()::text = author_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON "comments" FOR UPDATE USING (auth.uid()::text = author_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON "comments" FOR DELETE USING (auth.uid()::text = author_id);

-- Post upvotes are readable by everyone
CREATE POLICY "Post upvotes are readable by everyone" ON "post_upvotes" FOR SELECT USING (true);

-- Users can manage their own post upvotes
CREATE POLICY "Users can manage own post upvotes" ON "post_upvotes" FOR ALL USING (auth.uid()::text = user_id);

-- Comment upvotes are readable by everyone
CREATE POLICY "Comment upvotes are readable by everyone" ON "comment_upvotes" FOR SELECT USING (true);

-- Users can manage their own comment upvotes
CREATE POLICY "Users can manage own comment upvotes" ON "comment_upvotes" FOR ALL USING (auth.uid()::text = user_id);
