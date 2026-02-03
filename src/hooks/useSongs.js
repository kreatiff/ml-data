import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function useSongs() {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchSongs()
  }, [])

  async function fetchSongs() {
    try {
      setLoading(true)
      setError(null)

      const { data: submissions, error: submissionsError } = await supabase
        .from('submissions')
        .select(`
          round_id,
          spotify_uri,
          song_name,
          artists,
          album,
          created_at,
          submitter:competitors!submissions_submitter_fk(name),
          round:rounds!submissions_round_fk(name, created_at)
        `)
        .order('created_at', { ascending: false })

      if (submissionsError) throw submissionsError

      const { data: aggregateVotes, error: votesError } = await supabase
        .from('aggregate_votes')
        .select('round_id, spotify_uri, total_votes')

      if (votesError) {
        console.error('Error fetching aggregate votes:', votesError)
        throw votesError
      }

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
        round_name: submission.round?.name || 'Unknown',
        round_date: submission.round?.created_at,
        total_votes: votesMap[`${submission.round_id}_${submission.spotify_uri}`] || 0
      }))

      console.log('Fetched submissions:', submissions.length)
      console.log('Fetched aggregate votes:', aggregateVotes.length)
      console.log('Songs with votes:', songsWithVotes.length)

      setSongs(songsWithVotes)
    } catch (err) {
      console.error('Error fetching songs:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return { songs, loading, error, refetch: fetchSongs }
}
