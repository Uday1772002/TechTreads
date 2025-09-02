# TechTreads Deployment Guide

## Netlify + Supabase Setup

This guide will help you deploy TechTreads to Netlify with Supabase as the database.

## Prerequisites

1. **GitHub Account** - Your code should be in a GitHub repository
2. **Netlify Account** - Sign up at [netlify.com](https://netlify.com)
3. **Supabase Account** - Sign up at [supabase.com](https://supabase.com)

## Step 1: Set up Supabase Database

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `techtreads-db`
   - **Database Password**: Choose a strong password
   - **Region**: Choose closest to your users
5. Click "Create new project"

### 1.2 Get Database URL

1. Go to **Settings** → **Database**
2. Copy the **Connection string** (URI format)
3. It should look like: `postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres`

### 1.3 Run Database Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref [your-project-ref]

# Run migrations
supabase db push
```

## Step 2: Deploy to Netlify

### 2.1 Connect GitHub Repository

1. Go to [netlify.com](https://netlify.com)
2. Click "New site from Git"
3. Choose "GitHub"
4. Select your TechTreads repository
5. Configure build settings:
   - **Build command**: `cd frontend && bun run build`
   - **Publish directory**: `frontend/dist`
   - **Functions directory**: `netlify/functions`

### 2.2 Set Environment Variables

In Netlify dashboard, go to **Site settings** → **Environment variables**:

| Variable       | Value                                                                         | Description                     |
| -------------- | ----------------------------------------------------------------------------- | ------------------------------- |
| `DATABASE_URL` | `postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres` | Your Supabase connection string |
| `NODE_ENV`     | `production`                                                                  | Environment setting             |

### 2.3 Deploy

1. Click "Deploy site"
2. Wait for build to complete
3. Your app will be available at `https://[random-name].netlify.app`

## Step 3: Custom Domain (Optional)

1. In Netlify dashboard, go to **Domain settings**
2. Click "Add custom domain"
3. Enter your domain name
4. Follow DNS configuration instructions

## Step 4: Test Your Deployment

### 4.1 Health Check

Visit: `https://your-app.netlify.app/health`
Should return: `{"status":"ok","timestamp":"...","environment":"production"}`

### 4.2 Test Authentication

1. Go to your app URL
2. Try signing up with a new account
3. Try logging in
4. Test creating posts and comments

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors

- **Check**: DATABASE_URL environment variable is set correctly
- **Check**: Supabase project is active and not paused
- **Check**: Database password is correct

#### 2. Build Failures

- **Check**: All dependencies are in package.json
- **Check**: Build command is correct
- **Check**: Node.js version compatibility

#### 3. Function Timeouts

- **Check**: Database queries are optimized
- **Check**: No infinite loops in functions
- **Check**: Cold start performance

#### 4. CORS Errors

- **Check**: CORS origins include your Netlify domain
- **Check**: Credentials are properly configured

### Debug Commands

```bash
# Check Netlify function logs
netlify functions:list
netlify functions:invoke auth

# Check Supabase connection
supabase status
supabase db reset

# Local development
netlify dev
```

## Environment Variables Reference

| Variable            | Required | Description                                       | Example                                                              |
| ------------------- | -------- | ------------------------------------------------- | -------------------------------------------------------------------- |
| `DATABASE_URL`      | ✅       | Supabase PostgreSQL connection string             | `postgresql://postgres:password@db.abc123.supabase.co:5432/postgres` |
| `NODE_ENV`          | ✅       | Environment setting                               | `production`                                                         |
| `SUPABASE_URL`      | ❌       | Supabase project URL (if using Supabase client)   | `https://abc123.supabase.co`                                         |
| `SUPABASE_ANON_KEY` | ❌       | Supabase anonymous key (if using Supabase client) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`                            |

## Cost Breakdown

| Service      | Free Tier                          | Paid Plans        |
| ------------ | ---------------------------------- | ----------------- |
| **Netlify**  | 100GB bandwidth, 300 build minutes | $19/month for Pro |
| **Supabase** | 500MB database, 2GB bandwidth      | $25/month for Pro |
| **Total**    | **$0/month**                       | **$44/month**     |

## Support

- **Netlify Docs**: [docs.netlify.com](https://docs.netlify.com)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Issues**: Create an issue in your GitHub repository

## Security Notes

- Never commit DATABASE_URL to version control
- Use environment variables for all sensitive data
- Enable Row Level Security (RLS) in Supabase
- Regularly update dependencies
- Monitor function logs for errors
