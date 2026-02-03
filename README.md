# 🎵 Music League Song Search

A simple web app to browse and search previously submitted songs from Music League games.

## Features

- **Search**: Find songs by name, artist, album, submitter, or round
- **Sort**: Click any column header to sort (ascending/descending)
- **Vote Tracking**: See total votes received for each submission
- **Responsive**: Works on desktop and mobile devices

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Supabase

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to find these:**
- Go to your [Supabase Dashboard](https://app.supabase.com)
- Select your project
- Go to Settings > API
- Copy the "Project URL" and "anon/public" key

### 3. Run the App

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Database Structure

The app queries the following Supabase tables:
- `submissions` - Songs submitted to each round
- `competitors` - Players/submitters
- `rounds` - Game rounds
- `votes` - Votes cast on submissions

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` folder, ready to deploy to any static hosting service (Netlify, Vercel, GitHub Pages, etc.).

## Tech Stack

- **Vite** - Build tool
- **React** - UI framework
- **Supabase** - Database and backend
