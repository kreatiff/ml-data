import { useState, useEffect, useCallback } from 'react'
import { SALMON_NAMES } from '../constants/leagues'

const STORAGE_KEY = 'salmon_mode'
const EVENT_NAME = 'salmonModeChanged'



export function useSalmonMode() {
  const [salmonMode, setSalmonMode] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  })

  useEffect(() => {
    const handler = () => {
      setSalmonMode(localStorage.getItem(STORAGE_KEY) === 'true')
    }
    window.addEventListener(EVENT_NAME, handler)
    return () => window.removeEventListener(EVENT_NAME, handler)
  }, [])

  const applySalmonColors = useCallback((active) => {
    const root = document.documentElement
    if (active) {
      root.style.setProperty('--spotify-green', '#fa8072')
      root.style.setProperty('--spotify-green-hover', '#ff9a8d')
    } else {
      const theme = localStorage.getItem('app_theme') || 'cyber'
      if (theme === 'cyber') {
        root.style.setProperty('--spotify-green', '#CCFF00')
        root.style.setProperty('--spotify-green-hover', '#DDFF33')
      } else {
        root.style.setProperty('--spotify-green', '#1DB954')
        root.style.setProperty('--spotify-green-hover', '#1ED760')
      }
    }
  }, [])

  useEffect(() => {
    applySalmonColors(salmonMode)
  }, [salmonMode, applySalmonColors])

  const activateSalmonMode = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setSalmonMode(true)
    window.dispatchEvent(new Event(EVENT_NAME))
  }, [])

  const deactivateSalmonMode = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setSalmonMode(false)
    window.dispatchEvent(new Event(EVENT_NAME))
  }, [])

  const getLeagueName = useCallback((leagueId, originalName) => {
    if (salmonMode && SALMON_NAMES[leagueId]) {
      return SALMON_NAMES[leagueId]
    }
    return originalName
  }, [salmonMode])

  const formatDate = useCallback((dateStr) => {
    const d = new Date(dateStr)
    const formatted = d.toLocaleDateString('en-AU')
    if (!salmonMode) return formatted
    return formatted.replace('/2025', '/1BS').replace('/2026', '/1AS')
  }, [salmonMode])

  return { salmonMode, activateSalmonMode, deactivateSalmonMode, getLeagueName, formatDate }
}


