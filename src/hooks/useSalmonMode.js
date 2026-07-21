import { useState, useEffect, useCallback } from 'react'
import { SALMON_NAMES } from '../constants/leagues'
import { themes } from '../constants/themes'

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
      root.style.setProperty('--spotify-green-rgb', '250, 128, 114')
    } else {
      const theme = localStorage.getItem('app_theme') || 'cyber'
      const colors = themes[theme]?.colors || themes.cyber.colors
      root.style.setProperty('--spotify-green', colors['--spotify-green'])
      root.style.setProperty('--spotify-green-hover', colors['--spotify-green-hover'])
      root.style.setProperty('--spotify-green-rgb', colors['--spotify-green-rgb'])
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


