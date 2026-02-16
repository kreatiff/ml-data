import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID')
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET')
  const refreshToken = Deno.env.get('SPOTIFY_REFRESH_TOKEN')

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Spotify credentials in environment')
  }

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  const data = await res.json()
  if (data.error) {
    throw new Error(`Spotify token refresh failed: ${data.error_description || data.error}`)
  }

  return data.access_token
}

async function getSpotifyUserId(accessToken: string): Promise<string> {
  const res = await fetch('https://api.spotify.com/v1/me', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  })
  const data = await res.json()
  if (data.error) {
    throw new Error(`Failed to get user profile: ${data.error.message}`)
  }
  return data.id
}

async function createPlaylist(
  accessToken: string,
  userId: string,
  name: string,
  description: string
): Promise<{ id: string; url: string }> {
  const res = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      description,
      public: true,
    }),
  })

  const data = await res.json()
  if (data.error) {
    throw new Error(`Failed to create playlist: ${data.error.message}`)
  }

  return { id: data.id, url: data.external_urls.spotify }
}

async function addTracksToPlaylist(
  accessToken: string,
  playlistId: string,
  trackUris: string[]
): Promise<void> {
  // Spotify allows max 100 tracks per request
  const BATCH_SIZE = 100
  for (let i = 0; i < trackUris.length; i += BATCH_SIZE) {
    const batch = trackUris.slice(i, i + BATCH_SIZE)
    const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: batch }),
    })

    const data = await res.json()
    if (data.error) {
      throw new Error(`Failed to add tracks (batch ${i / BATCH_SIZE + 1}): ${data.error.message}`)
    }
  }
}

async function replaceTracksOnPlaylist(
  accessToken: string,
  playlistId: string,
  trackUris: string[]
): Promise<void> {
  // PUT replaces all tracks; first batch via PUT, rest via POST
  const BATCH_SIZE = 100
  const firstBatch = trackUris.slice(0, BATCH_SIZE)

  const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uris: firstBatch }),
  })

  const data = await res.json()
  if (data.error) {
    throw new Error(`Failed to replace tracks: ${data.error.message}`)
  }

  // Add remaining batches if > 100 tracks
  for (let i = BATCH_SIZE; i < trackUris.length; i += BATCH_SIZE) {
    const batch = trackUris.slice(i, i + BATCH_SIZE)
    const addRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: batch }),
    })

    const addData = await addRes.json()
    if (addData.error) {
      throw new Error(`Failed to add tracks (batch ${i / BATCH_SIZE + 1}): ${addData.error.message}`)
    }
  }
}

async function updatePlaylistDetails(
  accessToken: string,
  playlistId: string,
  name: string,
  description: string
): Promise<void> {
  const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, description }),
  })

  if (!res.ok) {
    const data = await res.json()
    throw new Error(`Failed to update playlist details: ${data.error?.message || res.statusText}`)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name, description, trackUris, playlistId: existingPlaylistId } = await req.json()

    if (!name || !Array.isArray(trackUris) || trackUris.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name, trackUris (non-empty array)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Deduplicate track URIs while preserving order
    const uniqueUris = [...new Set(trackUris)]

    const accessToken = await getAccessToken()

    if (existingPlaylistId) {
      // Update existing playlist
      await updatePlaylistDetails(accessToken, existingPlaylistId, name, description || '')
      await replaceTracksOnPlaylist(accessToken, existingPlaylistId, uniqueUris)

      return new Response(
        JSON.stringify({
          success: true,
          playlistId: existingPlaylistId,
          playlistUrl: `https://open.spotify.com/playlist/${existingPlaylistId}`,
          tracksAdded: uniqueUris.length,
          updated: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create new playlist
    const userId = await getSpotifyUserId(accessToken)
    const playlist = await createPlaylist(accessToken, userId, name, description || '')
    await addTracksToPlaylist(accessToken, playlist.id, uniqueUris)

    return new Response(
      JSON.stringify({
        success: true,
        playlistId: playlist.id,
        playlistUrl: playlist.url,
        tracksAdded: uniqueUris.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('create-playlist error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
