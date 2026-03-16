import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

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
        
        const { data, error } = await supabase.functions.invoke('get-album-art', {
          body: { trackId }
        })

        if (error) {
          throw error
        }

        if (data?.albumArt) {
          setAlbumArt(data.albumArt)
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
