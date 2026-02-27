/**
 * useItunesArt — fetches album art from the iTunes Search API (free, no auth).
 *
 * Takes an array of { key, songName, artists } and returns a Map: key → imageUrl.
 * Results are cached at module level so navigating away and back doesn't re-fetch.
 *
 * iTunes Search API: https://itunes.apple.com/search?term=...&entity=song&limit=1
 * artworkUrl100 can be rewritten to artworkUrl600 for full-res images.
 */
import { useState, useEffect, useRef } from 'react'

// Module-level cache persists for the lifetime of the page session
const artCache = new Map() // key → url | null

const CONCURRENCY = 4 // parallel requests at a time

async function fetchItunesArt(songName, artists) {
  const term = encodeURIComponent(`${songName} ${artists}`.trim())
  const url = `https://itunes.apple.com/search?term=${term}&entity=song&limit=1&media=music`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const artwork = data?.results?.[0]?.artworkUrl100
    if (!artwork) return null
    // Upscale from 100×100 thumbnail to 300×300
    return artwork.replace('100x100bb', '300x300bb')
  } catch {
    return null
  }
}

/**
 * @param {Array<{key: string, songName: string, artists: string}>} songs
 * @returns {Map<string, string|null>} artMap — key → image URL (or null if not found)
 */
export function useItunesArt(songs) {
  const [artMap, setArtMap] = useState(() => new Map())
  const pendingRef = useRef(new Set())

  useEffect(() => {
    if (!songs?.length) return

    // Determine which songs still need fetching
    const toFetch = songs.filter(s => !artCache.has(s.key) && !pendingRef.current.has(s.key))
    if (toFetch.length === 0) {
      // All already cached — just emit the map
      setArtMap(new Map(songs.map(s => [s.key, artCache.get(s.key) ?? null])))
      return
    }

    // Mark as in-flight
    toFetch.forEach(s => pendingRef.current.add(s.key))

    let cancelled = false

    async function fetchAll() {
      // Process in batches of CONCURRENCY
      for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
        if (cancelled) break
        const batch = toFetch.slice(i, i + CONCURRENCY)
        await Promise.all(
          batch.map(async s => {
            const url = await fetchItunesArt(s.songName, s.artists)
            artCache.set(s.key, url)
            pendingRef.current.delete(s.key)
          })
        )
        if (!cancelled) {
          // Emit updated map after each batch so thumbnails appear progressively
          setArtMap(new Map(songs.map(s => [s.key, artCache.get(s.key) ?? null])))
        }
      }
    }

    fetchAll()

    return () => { cancelled = true }
  }, [songs])

  return artMap
}
