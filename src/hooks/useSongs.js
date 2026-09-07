import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useIndexedDB } from './useIndexedDB'

const PAGE_SIZE = 1000

/**
 * Fetch every row of a query, paginating past Supabase/PostgREST's default
 * max-rows cap (1000) — a plain unbounded .select() silently truncates once
 * a table grows past that, since a 206 partial response isn't an error.
 */
async function fetchAllRows(buildQuery) {
  const rows = []
  let from = 0

  while (true) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows
}

/**
 * Fetch songs + aggregate votes from Supabase and return a merged array.
 * Single source of truth for the query shape and mapping logic.
 */
async function fetchSongsFromSupabase() {
  const submissions = await fetchAllRows(() => supabase
    .from('submissions')
    .select(`
      round_id,
      spotify_uri,
      song_name,
      artists,
      album,
      created_at,
      submitter:competitors!submissions_submitter_fk(name, avatar_url),
      round:rounds!submissions_round_fk(name, started_at)
    `)
    .order('created_at', { ascending: false })
    .order('round_id')
    .order('spotify_uri')
  )

  const aggregateVotes = await fetchAllRows(() => supabase
    .from('aggregate_votes')
    .select('round_id, spotify_uri, total_votes')
    .order('round_id')
    .order('spotify_uri')
  )

  const votesMap = {}
  aggregateVotes.forEach(vote => {
    const key = `${vote.round_id}_${vote.spotify_uri}`
    votesMap[key] = vote.total_votes
  })

  return submissions.map(submission => ({
    round_id: submission.round_id,
    spotify_uri: submission.spotify_uri,
    song_name: submission.song_name,
    artists: submission.artists,
    album: submission.album,
    created_at: submission.created_at,
    submitter_name: submission.submitter?.name || 'Unknown',
    submitter_avatar_url: submission.submitter?.avatar_url || null,
    round_name: submission.round?.name || 'Unknown',
    round_date: submission.round?.started_at,
    total_votes: votesMap[`${submission.round_id}_${submission.spotify_uri}`] || 0
  }))
}

export function useSongs() {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { loadData, saveData } = useIndexedDB()

  useEffect(() => {
    let isMounted = true

    async function initializeSongs() {
      try {
        // Try to load from cache first for instant render
        const cachedData = await loadData()

        if (cachedData && isMounted) {
          setSongs(cachedData)
          setLoading(false)

          // Background refresh: fetch fresh data and update UI + cache
          try {
            const freshData = await fetchSongsFromSupabase()
            if (isMounted) {
              setSongs(freshData)
              await saveData(freshData)
            }
          } catch (err) {
            console.error('Background refresh failed:', err)
            // Silent failure — stale cached data is still shown
          }
        } else {
          // No cache, fetch fresh and block until done
          const freshData = await fetchSongsFromSupabase()
          if (isMounted) {
            setSongs(freshData)
            setLoading(false)
            await saveData(freshData)
          }
        }
      } catch (err) {
        console.error('Error initializing songs:', err)
        if (isMounted) {
          setError(err.message)
          setLoading(false)
        }
      }
    }

    initializeSongs()

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty dependency array - only run once on mount

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const freshData = await fetchSongsFromSupabase()
      setSongs(freshData)
      await saveData(freshData)
    } catch (err) {
      console.error('Error refetching songs:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [saveData])

  return { songs, loading, error, refetch }
}
