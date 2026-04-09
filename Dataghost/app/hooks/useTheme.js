import { useState, useEffect } from 'react'

// Read theme synchronously on first render to avoid flash
function getInitialTheme() {
  if (typeof window === 'undefined') return true // SSR default dark
  const saved = localStorage.getItem('darkMode')
  return saved === null ? true : saved === 'true'
}

export function useTheme() {
  const [darkMode, setDarkMode] = useState(getInitialTheme)

  useEffect(() => {
    function handleThemeChange(e) {
      setDarkMode(e.detail.darkMode)
    }
    window.addEventListener('themeChange', handleThemeChange)
    return () => window.removeEventListener('themeChange', handleThemeChange)
  }, [])

  return darkMode
}
