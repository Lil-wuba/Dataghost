import { useState, useEffect } from 'react'

export function useTheme() {
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('darkMode')
    setDarkMode(saved === null ? true : saved === 'true')

    function handleThemeChange(e) {
      setDarkMode(e.detail.darkMode)
    }

    window.addEventListener('themeChange', handleThemeChange)
    return () => window.removeEventListener('themeChange', handleThemeChange)
  }, [])

  return darkMode
}