import { useState, useEffect } from 'react'

export function useSpotifyAlbumArt(spotifyUri) {
  const [albumArt, setAlbumArt] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAlbumArt() {
      if (!spotifyUri) {
        setLoading(false)
        return
      }

      try {
        const trackId = spotifyUri.split(':')[2]
        
        const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID
        const clientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET

        if (!clientId || !clientSecret) {
          console.warn('Spotify credentials not configured')
          setLoading(false)
          return
        }

        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret)
          },
          body: 'grant_type=client_credentials'
        })

        const { access_token } = await tokenResponse.json()

        const trackResponse = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
          headers: {
            'Authorization': `Bearer ${access_token}`
          }
        })

        const trackData = await trackResponse.json()
        
        if (trackData.album?.images?.[0]?.url) {
          setAlbumArt(trackData.album.images[0].url)
        }
      } catch (error) {
        console.error('Error fetching album art:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAlbumArt()
  }, [spotifyUri])

  return { albumArt, loading }
}
