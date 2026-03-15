# Deploying to Dokploy

This guide will help you deploy the Music League Search app to Dokploy.

## Prerequisites

- Dokploy instance running and accessible
- Git repository with this code pushed to GitHub/GitLab/Gitea
- Supabase credentials
- Spotify API credentials

## Deployment Steps

### 1. Create New Application in Dokploy

1. Log into your Dokploy dashboard
2. Click **Create New Application**
3. Choose **Docker** as deployment type
4. Select your Git provider and repository

### 2. Configure Build Settings

In the Dokploy application settings:

**Build Configuration:**
- **Dockerfile Path**: `Dockerfile` (should be auto-detected)
- **Build Context**: `.` (root of repository)
- **Port**: `80`

### 3. Set Environment Variables

In the **Environment Variables** section, add the following:

```
VITE_SUPABASE_URL=https://lvgcgqzhwbpjwmhgdcpa.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Important:** These must be set as **build-time environment variables** since Vite bakes them into the build at compile time.

Note: Spotify credentials (`SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`) should be configured as backend secrets in your Supabase project using the Supabase CLI or dashboard.

### 4. Configure Domain (Optional)

- Add your custom domain in the Domains section
- Dokploy will automatically handle SSL/TLS with Let's Encrypt

### 5. Deploy

1. Click **Deploy** button
2. Dokploy will:
   - Clone your repository
   - Build the Docker image with environment variables
   - Start the container
   - Expose it on the configured port

### 6. Verify Deployment

Once deployed, visit your app URL and check:
- The app loads successfully
- Songs are fetched from Supabase
- Album art banner appears (if Spotify credentials are configured)

## Updating the App

To deploy updates:
1. Push changes to your Git repository
2. In Dokploy, click **Redeploy** or enable auto-deploy on push

## Troubleshooting

### Environment Variables Not Working

Vite requires environment variables to be prefixed with `VITE_` and available at **build time**. Make sure:
- All variables start with `VITE_`
- They're set in Dokploy's environment variables section
- You redeploy after changing environment variables

### App Shows Blank Page

Check the browser console and Dokploy logs:
```bash
# In Dokploy, view application logs
```

Common issues:
- Missing environment variables
- Incorrect Supabase credentials
- Network connectivity to Supabase

### CORS Issues with Supabase

If you get CORS errors, ensure your deployment domain is allowed in Supabase:
1. Go to Supabase Dashboard → Settings → API
2. Add your Dokploy domain to allowed origins

## Build Locally (Testing)

To test the Docker build locally:

```bash
docker build -t music-league-search .
docker run -p 8080:80 music-league-search
```

Then visit http://localhost:8080

## Architecture

The deployment uses:
- **Multi-stage Docker build** for optimized image size
- **nginx** to serve the static Vite build
- **Environment variables** baked into the build at compile time
