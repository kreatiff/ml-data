/**
 * One-time script to obtain a Spotify refresh token for your account.
 *
 * Prerequisites:
 *   1. Create/reuse a Spotify app at https://developer.spotify.com/dashboard
 *   2. Add http://localhost:8888/callback as a Redirect URI in the app settings
 *   3. Set environment variables before running:
 *        SPOTIFY_CLIENT_ID=<your_client_id>
 *        SPOTIFY_CLIENT_SECRET=<your_client_secret>
 *
 * Usage:
 *   node scripts/spotify-get-token.js
 *
 * The script starts a tiny local server, opens the Spotify auth page in your
 * browser, and exchanges the resulting code for a refresh token. Copy the
 * printed refresh token and store it as a Supabase Edge Function secret:
 *   supabase secrets set SPOTIFY_REFRESH_TOKEN=<token>
 */

import http from 'node:http'
import { execSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET
const REDIRECT_URI = 'http://localhost:8888/callback'
const SCOPES = 'playlist-modify-public'

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables first.')
  process.exit(1)
}

const state = randomBytes(16).toString('hex')

const authUrl = new URL('https://accounts.spotify.com/authorize')
authUrl.searchParams.set('response_type', 'code')
authUrl.searchParams.set('client_id', CLIENT_ID)
authUrl.searchParams.set('scope', SCOPES)
authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
authUrl.searchParams.set('state', state)

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:8888`)

  if (url.pathname !== '/callback') {
    res.writeHead(404)
    res.end('Not found')
    return
  }

  const code = url.searchParams.get('code')
  const returnedState = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  if (error) {
    res.writeHead(400, { 'Content-Type': 'text/html' })
    res.end(`<h1>Error: ${error}</h1>`)
    server.close()
    process.exit(1)
  }

  if (returnedState !== state) {
    res.writeHead(400, { 'Content-Type': 'text/html' })
    res.end('<h1>State mismatch — possible CSRF attack</h1>')
    server.close()
    process.exit(1)
  }

  // Exchange code for tokens
  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI
      })
    })

    const data = await tokenRes.json()

    if (data.error) {
      console.error('Token exchange failed:', data)
      res.writeHead(500, { 'Content-Type': 'text/html' })
      res.end(`<h1>Token exchange failed</h1><pre>${JSON.stringify(data, null, 2)}</pre>`)
      server.close()
      process.exit(1)
    }

    console.log('\n=== Spotify Tokens ===')
    console.log('Access Token:', data.access_token)
    console.log('Refresh Token:', data.refresh_token)
    console.log('\nStore the refresh token as a Supabase secret:')
    console.log(`  supabase secrets set SPOTIFY_REFRESH_TOKEN=${data.refresh_token}`)
    console.log(`  supabase secrets set SPOTIFY_CLIENT_ID=${CLIENT_ID}`)
    console.log(`  supabase secrets set SPOTIFY_CLIENT_SECRET=${CLIENT_SECRET}`)

    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end('<h1>Success!</h1><p>You can close this tab. Check the terminal for your refresh token.</p>')
  } catch (err) {
    console.error('Error exchanging code:', err)
    res.writeHead(500, { 'Content-Type': 'text/html' })
    res.end(`<h1>Error</h1><pre>${err.message}</pre>`)
  }

  server.close()
})

server.listen(8888, () => {
  console.log('Listening on http://localhost:8888/callback')
  console.log('Opening Spotify authorization page...\n')

  // Open browser cross-platform
  const openCmd = process.platform === 'win32' ? 'start'
    : process.platform === 'darwin' ? 'open' : 'xdg-open'
  try {
    execSync(`${openCmd} "${authUrl.toString()}"`)
  } catch {
    console.log('Could not open browser automatically. Visit this URL:')
    console.log(authUrl.toString())
  }
})
