# Deploying to Portainer

This guide will help you deploy the Music League Search app using Portainer.

## Prerequisites

- Portainer instance running and accessible
- Git repository with this code pushed to GitHub/GitLab/Bitbucket (or local build)
- Supabase credentials
- Spotify API credentials

## Deployment Options

### Option 1: Build from Git Repository (Recommended)

#### 1. Create a New Stack

1. Log into Portainer
2. Select your environment
3. Go to **Stacks** → **Add Stack**
4. Name it `music-league-search`

#### 2. Use Docker Compose

Paste this into the Web Editor:

```yaml
version: '3.8'

services:
  music-league-search:
    build:
      context: https://github.com/kreatiff/ml-data.git#dev
      dockerfile: Dockerfile
      args:
        - VITE_SUPABASE_URL=https://lvgcgqzhwbpjwmhgdcpa.supabase.co
        - VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
        - VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id
        - VITE_SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
    ports:
      - "3000:80"
    restart: unless-stopped
    container_name: music-league-search
```

**Replace:**
- `YOUR_USERNAME/YOUR_REPO` with your actual Git repository
- All credential values with your actual credentials

#### 3. Deploy

Click **Deploy the stack**

Portainer will:
- Clone your repository
- Build the Docker image with environment variables
- Start the container
- Expose it on port 3000

#### 4. Access Your App

Visit: `http://your-server-ip:3000`

---

### Option 2: Build Locally and Push to Registry

If you want more control or faster deployments:

#### 1. Build and Push to Docker Hub

```bash
# Navigate to project directory
cd d:\dev\musicLeagueData\app\music-league-search

# Build with environment variables
docker build \
  --build-arg VITE_SUPABASE_URL=https://lvgcgqzhwbpjwmhgdcpa.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=your_key \
  --build-arg VITE_SPOTIFY_CLIENT_ID=your_id \
  --build-arg VITE_SPOTIFY_CLIENT_SECRET=your_secret \
  -t yourusername/music-league-search:latest .

# Push to Docker Hub
docker push yourusername/music-league-search:latest
```

#### 2. Update Dockerfile for Build Args

Add these lines at the top of your Dockerfile after `FROM node:18-alpine AS builder`:

```dockerfile
# Accept build arguments
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SPOTIFY_CLIENT_ID
ARG VITE_SPOTIFY_CLIENT_SECRET

# Set as environment variables for the build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_SPOTIFY_CLIENT_ID=$VITE_SPOTIFY_CLIENT_ID
ENV VITE_SPOTIFY_CLIENT_SECRET=$VITE_SPOTIFY_CLIENT_SECRET
```

#### 3. Deploy in Portainer

Go to **Containers** → **Add Container**:

- **Name**: `music-league-search`
- **Image**: `yourusername/music-league-search:latest`
- **Port mapping**: `3000:80`
- **Restart policy**: Unless stopped

Click **Deploy the container**

---

### Option 3: Use Portainer Git Repository Build

#### 1. Go to Containers → Add Container

Fill in:
- **Name**: `music-league-search`
- **Build method**: Repository
- **Repository URL**: `https://github.com/YOUR_USERNAME/YOUR_REPO`
- **Repository reference**: `refs/heads/main`
- **Dockerfile path**: `Dockerfile`

#### 2. Add Environment Variables

In the **Env** section, add:
```
VITE_SUPABASE_URL=https://lvgcgqzhwbpjwmhgdcpa.supabase.co
VITE_SUPABASE_ANON_KEY=your_key
VITE_SPOTIFY_CLIENT_ID=your_id
VITE_SPOTIFY_CLIENT_SECRET=your_secret
```

#### 3. Port Mapping

Add port mapping: `3000:80`

#### 4. Deploy

Click **Deploy the container**

---

## Setting Up Reverse Proxy (Optional)

To use a domain name with SSL:

### Using Nginx Proxy Manager (in Portainer)

1. Deploy Nginx Proxy Manager via Portainer stack
2. Add a new proxy host:
   - **Domain Names**: `music.yourdomain.com`
   - **Forward Hostname/IP**: `music-league-search` (container name)
   - **Forward Port**: `80`
   - Enable **SSL** and request Let's Encrypt certificate

---

## Updating the App

### If using Git build:
1. Push changes to your repository
2. In Portainer: **Stacks** → Your stack → **Pull and redeploy**

### If using Docker Hub:
1. Build and push new image with updated tag
2. In Portainer: **Containers** → Your container → **Recreate**
3. Pull latest image

---

## Troubleshooting

### Container Fails to Start

Check logs in Portainer:
1. Go to **Containers** → Your container
2. Click **Logs**

Common issues:
- Missing or incorrect environment variables
- Port already in use (change `3000` to another port)

### Environment Variables Not Working

Vite requires variables at **build time**. If you change environment variables:
1. You must rebuild the image
2. Simply recreating the container won't work

### Can't Access the App

- Check if the container is running in Portainer
- Verify port mapping is correct
- Check firewall rules on your server
- For cloud servers, check security group/firewall rules

### CORS Errors

Add your deployment domain to Supabase allowed origins:
1. Supabase Dashboard → Settings → API
2. Add your domain to allowed origins

---

## Alternative: docker-compose.yml File

Create this file in your project root:

```yaml
version: '3.8'

services:
  music-league-search:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
        - VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
        - VITE_SPOTIFY_CLIENT_ID=${VITE_SPOTIFY_CLIENT_ID}
        - VITE_SPOTIFY_CLIENT_SECRET=${VITE_SPOTIFY_CLIENT_SECRET}
    ports:
      - "3000:80"
    restart: unless-stopped
```

Create `.env` file with your credentials, then upload both files to Portainer stack.
