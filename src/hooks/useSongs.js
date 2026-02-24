import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useIndexedDB } from './useIndexedDB'

export function useSongs() {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { loadData, saveData } = useIndexedDB()

  useEffect(() => {
    let isMounted = true

    async function fetchFreshData(isBackgroundUpdate = false) {
      try {
        const { data: submissions, error: submissionsError } = await supabase
          .from('submissions')
          .select(`
            round_id,
            spotify_uri,
            song_name,
            artists,
            album,
            created_at,
            submitter:competitors!submissions_submitter_fk(name, avatar_url),
            round:rounds!submissions_round_fk(name, created_at)
          `)
          .order('created_at', { ascending: false })

        if (submissionsError) throw submissionsError

        const { data: aggregateVotes, error: votesError } = await supabase
          .from('aggregate_votes')
          .select('round_id, spotify_uri, total_votes')

        if (votesError) throw votesError

        const votesMap = {}
        aggregateVotes.forEach(vote => {
          const key = `${vote.round_id}_${vote.spotify_uri}`
          votesMap[key] = vote.total_votes
        })

        const songsWithVotes = submissions.map(submission => ({
          round_id: submission.round_id,
          spotify_uri: submission.spotify_uri,
          song_name: submission.song_name,
          artists: submission.artists,
          album: submission.album,
          created_at: submission.created_at,
          submitter_name: submission.submitter?.name || 'Unknown',
          submitter_avatar_url: submission.submitter?.avatar_url || null,
          round_name: submission.round?.name || 'Unknown',
          round_date: submission.round?.created_at,
          total_votes: votesMap[`${submission.round_id}_${submission.spotify_uri}`] || 0
        }))

        if (!isMounted) return

        if (!isBackgroundUpdate) {
          console.log('Fetched songs from Supabase:', songsWithVotes.length)
          setSongs(songsWithVotes)
          setLoading(false)
        } else {
          console.log('Background refresh complete')
        }

        // Save to cache
        await saveData(songsWithVotes)
      } catch (err) {
        console.error('Error fetching songs:', err)
        if (!isMounted) return
        if (!isBackgroundUpdate) {
          setError(err.message)
          setLoading(false)
        }
      }
    }

    async function initializeSongs() {
      try {
        // Try to load from cache first
        const cachedData = await loadData()

        if (cachedData && isMounted) {
          console.log('Loading songs from cache:', cachedData.length)
          setSongs(cachedData)
          setLoading(false)
          // Fetch fresh data in background
          fetchFreshData(true)
        } else {
          // No cache, fetch fresh
          await fetchFreshData(false)
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

  const refetch = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: submissions, error: submissionsError } = await supabase
        .from('submissions')
        .select(`
          round_id,
          spotify_uri,
          song_name,
          artists,
          album,
          created_at,
          submitter:competitors!submissions_submitter_fk(name, avatar_url),
          round:rounds!submissions_round_fk(name, created_at)
        `)
        .order('created_at', { ascending: false })

      if (submissionsError) throw submissionsError

      const { data: aggregateVotes, error: votesError } = await supabase
        .from('aggregate_votes')
        .select('round_id, spotify_uri, total_votes')

      if (votesError) throw votesError

      const votesMap = {}
      aggregateVotes.forEach(vote => {
        const key = `${vote.round_id}_${vote.spotify_uri}`
        votesMap[key] = vote.total_votes
      })

      const songsWithVotes = submissions.map(submission => ({
        round_id: submission.round_id,
        spotify_uri: submission.spotify_uri,
        song_name: submission.song_name,
        artists: submission.artists,
        album: submission.album,
        created_at: submission.created_at,
        submitter_name: submission.submitter?.name || 'Unknown',
        submitter_avatar_url: submission.submitter?.avatar_url || null,
        round_name: submission.round?.name || 'Unknown',
        round_date: submission.round?.created_at,
        total_votes: votesMap[`${submission.round_id}_${submission.spotify_uri}`] || 0
      }))

      setSongs(songsWithVotes)
      await saveData(songsWithVotes)
    } catch (err) {
      console.error('Error refetching songs:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return { songs, loading, error, refetch }
}
