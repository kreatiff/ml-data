/**
 * One-time script to obtain a Spotify refresh token for your account.
 *
 * Prerequisites:
 *   1. Create/reuse a Spotify app at https://developer.spotify.com/dashboard
 *   2. Add https://dupleighcates-dev.1pod.top/callback as a Redirect URI in the app settings
 *   3. Set environment variables before running:
 *        SPOTIFY_CLIENT_ID=<your_client_id>
 *        SPOTIFY_CLIENT_SECRET=<your_client_secret>
 *
 * Usage:
 *   node scripts/spotify-get-token.js
 *
 * The script opens the Spotify auth page in your browser. After you approve,
 * Spotify redirects to the callback URL. Copy the full redirect URL from your
 * browser and paste it when prompted. The script exchanges the code for a
 * refresh token. Store it as a Supabase Edge Function secret:
 *   supabase secrets set SPOTIFY_REFRESH_TOKEN=<token>
 */

import { execSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createInterface } from 'node:readline'

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET
const REDIRECT_URI = 'https://dupleighcates-dev.1pod.top/callback'
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

// Open browser
try {
  if (process.platform === 'win32') {
    execSync(`start "" "${authUrl.toString()}"`, { shell: 'cmd.exe' })
  } else if (process.platform === 'darwin') {
    execSync(`open "${authUrl.toString()}"`)
  } else {
    execSync(`xdg-open "${authUrl.toString()}"`)
  }
  console.log('Opened Spotify authorization page in your browser.\n')
} catch {
  console.log('Could not open browser automatically. Visit this URL:\n')
  console.log(authUrl.toString() + '\n')
}

console.log('After you approve, Spotify will redirect to the callback URL.')
console.log('The page may not load — that\'s fine.')
console.log('Copy the FULL URL from your browser\'s address bar and paste it below.\n')

const rl = createInterface({ input: process.stdin, output: process.stdout })

rl.question('Paste the redirect URL: ', async (input) => {
  rl.close()

  try {
    const redirectUrl = new URL(input.trim())
    const code = redirectUrl.searchParams.get('code')
    const returnedState = redirectUrl.searchParams.get('state')
    const error = redirectUrl.searchParams.get('error')

    if (error) {
      console.error('Authorization error:', error)
      process.exit(1)
    }

    if (returnedState !== state) {
      console.error('State mismatch — possible CSRF. Try running the script again.')
      process.exit(1)
    }

    if (!code) {
      console.error('No authorization code found in the URL.')
      process.exit(1)
    }

    // Exchange code for tokens
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
      console.error('Token exchange failed:', JSON.stringify(data, null, 2))
      process.exit(1)
    }

    console.log('\n=== Spotify Tokens ===')
    console.log('Access Token:', data.access_token)
    console.log('Refresh Token:', data.refresh_token)
    console.log('\nStore the refresh token as a Supabase secret:')
    console.log(`  supabase secrets set SPOTIFY_REFRESH_TOKEN=${data.refresh_token}`)
    console.log(`  supabase secrets set SPOTIFY_CLIENT_ID=${CLIENT_ID}`)
    console.log(`  supabase secrets set SPOTIFY_CLIENT_SECRET=${CLIENT_SECRET}`)
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  }
})
