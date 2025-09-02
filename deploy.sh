#!/bin/bash

# TechTreads Netlify + Supabase Deployment Script

echo "🚀 Starting TechTreads deployment to Netlify + Supabase..."

# Check if required tools are installed
if ! command -v netlify &> /dev/null; then
    echo "❌ Netlify CLI not found. Installing..."
    npm install -g netlify-cli
fi

if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Check if user is logged in to Netlify
if ! netlify status &> /dev/null; then
    echo "🔐 Please log in to Netlify..."
    netlify login
fi

# Check if user is logged in to Supabase
if ! supabase status &> /dev/null; then
    echo "🔐 Please log in to Supabase..."
    supabase login
fi

echo "📦 Installing dependencies..."
bun install

echo "🏗️  Building frontend..."
cd frontend
bun run build
cd ..

echo "🗄️  Setting up database..."
# Note: You'll need to create a Supabase project first and get the DATABASE_URL
echo "⚠️  Make sure to:"
echo "   1. Create a Supabase project at https://supabase.com"
echo "   2. Get your DATABASE_URL from Settings → Database"
echo "   3. Set DATABASE_URL environment variable in Netlify"

echo "🚀 Deploying to Netlify..."
netlify deploy --prod

echo "✅ Deployment complete!"
echo "🌐 Your app should be live at the URL shown above"
echo "📊 Don't forget to set up your Supabase database and environment variables!"
