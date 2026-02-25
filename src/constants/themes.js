/**
 * Theme definitions (CSS variable overrides).
 * Used by App.jsx for theme application and SongsPage.jsx for the selector.
 */

export const themes = {
    default: {
        name: 'Default',
        colors: {
            '--spotify-black': '#000000',
            '--spotify-bg': '#121212',
            '--spotify-elevated': '#181818',
            '--spotify-card': '#282828',
            '--spotify-green': '#1DB954',
            '--spotify-green-hover': '#1ED760',
            '--spotify-white': '#FFFFFF',
            '--spotify-gray': '#B3B3B3',
            '--spotify-light-gray': '#E0E0E0',
        }
    },
    cyber: {
        name: 'Cyber-Brutalist',
        colors: {
            '--spotify-black': '#050505',
            '--spotify-bg': '#050505',
            '--spotify-elevated': '#111111',
            '--spotify-card': '#111111',
            '--spotify-green': '#CCFF00',
            '--spotify-green-hover': '#DDFF33',
            '--spotify-white': '#E0E0E0',
            '--spotify-gray': '#666666',
            '--spotify-light-gray': '#999999',
        }
    }
}
