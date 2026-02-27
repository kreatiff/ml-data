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

const ITUNES_ENDPOINTS = [
  'https://itunes.apple.com/search',
  // Alternate endpoint used by Apple's own search clients; avoids redirect issues in some browsers.
  'https://itunes.apple.com/WebObjects/MZStoreServices.woa/ws/wsSearch'
]

async function fetchItunesArt(songName, artists) {
  const term = encodeURIComponent(`${songName} ${artists}`.trim())
  for (const endpoint of ITUNES_ENDPOINTS) {
    const url = `${endpoint}?term=${term}&entity=song&limit=1&media=music&country=US`

    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const data = await res.json()
      const artwork = data?.results?.[0]?.artworkUrl100
      if (!artwork) {
        // Definitive "not found" response.
        return { url: null, cacheable: true }
      }

      // Upscale from 100×100 thumbnail to 300×300
      return { url: artwork.replace('100x100bb', '300x300bb'), cacheable: true }
    } catch {
      // Try the next endpoint.
    }
  }

  // Network/CORS/transient failures should not be cached forever.
  return { url: null, cacheable: false }
}

/**
 * @param {Array<{key: string, songName: string, artists: string}>} songs
 * @returns {Map<string, string|null>} artMap — key → image URL (or null if not found)
 */
export function useItunesArt(songs) {
  const [artMap, setArtMap] = useState(() => new Map())
  const [retryNonce, setRetryNonce] = useState(0)
  const pendingRef = useRef(new Set())

  useEffect(() => {
    if (!songs?.length) return

    // Determine which songs still need fetching
    const toFetch = songs.filter(s => !artCache.has(s.key) && !pendingRef.current.has(s.key))
    const emitCurrentMap = () => {
      setArtMap(new Map(songs.map(s => [s.key, artCache.get(s.key) ?? null])))
    }

    if (toFetch.length === 0) {
      // All already cached — just emit the map
      queueMicrotask(emitCurrentMap)
      return
    }

    // Mark as in-flight
    toFetch.forEach(s => pendingRef.current.add(s.key))

    let cancelled = false
    let retryTimer

    async function fetchAll() {
      // Process in batches of CONCURRENCY
      for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
        if (cancelled) break
        const batch = toFetch.slice(i, i + CONCURRENCY)
        await Promise.all(
          batch.map(async s => {
            const { url, cacheable } = await fetchItunesArt(s.songName, s.artists)
            if (cacheable) {
              artCache.set(s.key, url)
            }
            pendingRef.current.delete(s.key)
          })
        )
        if (!cancelled) {
          // Emit updated map after each batch so thumbnails appear progressively
          emitCurrentMap()
        }
      }

      const unresolved = songs.filter(s => !artCache.has(s.key) && !pendingRef.current.has(s.key))
      if (!cancelled && unresolved.length > 0) {
        retryTimer = window.setTimeout(() => {
          setRetryNonce(n => n + 1)
        }, 5000)
      }
    }

    fetchAll()

    return () => {
      cancelled = true
      if (retryTimer) {
        window.clearTimeout(retryTimer)
      }
    }
  }, [songs, retryNonce])

  return artMap
}
