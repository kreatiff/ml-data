import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { trackId } = await req.json()

    if (!trackId) {
      return new Response(
        JSON.stringify({ error: 'Missing trackId' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const clientId = Deno.env.get('SPOTIFY_CLIENT_ID')
    const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: 'Spotify credentials not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`)
      },
      body: 'grant_type=client_credentials'
    })

    if (!tokenResponse.ok) {
        return new Response(
            JSON.stringify({ error: 'Failed to fetch Spotify token' }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    const { access_token } = await tokenResponse.json()

    const trackResponse = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    })

    if (!trackResponse.ok) {
        return new Response(
            JSON.stringify({ error: 'Failed to fetch Spotify track' }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    const trackData = await trackResponse.json()
    const albumArtUrl = trackData.album?.images?.[0]?.url || null

    return new Response(
      JSON.stringify({ albumArt: albumArtUrl }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('get-album-art error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
