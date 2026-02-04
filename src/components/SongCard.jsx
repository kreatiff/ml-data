import { memo } from 'react'
import './SongCard.css'

function SongCard({ song }) {
  return (
    <div className="song-card">
      <div className="song-card-header">
        <div className="song-card-title" title={song.song_name}>
          {song.song_name}
        </div>
        <div className="song-card-artist" title={song.artists}>
          by {song.artists}
        </div>
      </div>
      
      <div className="song-card-divider" />
      
      <div className="song-card-details">
        <div className="song-card-row">
          <div className="song-card-label">
            <span className="song-card-icon">👤</span>
            <span>{song.submitter_name}</span>
          </div>
          <div className="song-card-label">
            <span className="song-card-icon">🎯</span>
            <span title={song.round_name}>{song.round_name}</span>
          </div>
        </div>
        
        <div className="song-card-row">
          <div className="song-card-label">
            <span className="song-card-icon">⭐</span>
            <span className="song-card-votes">{song.total_votes} votes</span>
          </div>
          <div className="song-card-label">
            <span className="song-card-icon">📅</span>
            <span>{new Date(song.created_at).toLocaleDateString('en-AU')}</span>
          </div>
        </div>
        
        {song.album && (
          <div className="song-card-album" title={song.album}>
            <span className="song-card-icon">💿</span>
            <span>{song.album}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(SongCard)
