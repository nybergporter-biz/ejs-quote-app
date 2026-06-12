import { useEffect } from 'react'
import { useLocalStorage } from './useLocalStorage'

// mode: 'dark' | 'light' | 'system'
export function useDarkMode() {
  const [mode, setMode] = useLocalStorage('ejs.theme', 'dark')

  useEffect(() => {
    const root = document.documentElement
    const apply = (resolved) => {
      root.classList.remove('light', 'dark')
      root.classList.add(resolved)
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) meta.setAttribute('content', resolved === 'light' ? '#f0f4f8' : '#07101e')
    }

    if (mode === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      apply(mq.matches ? 'dark' : 'light')
      const handler = (e) => apply(e.matches ? 'dark' : 'light')
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
    apply(mode)
  }, [mode])

  const isDark =
    mode === 'dark' ||
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  const toggle = () => setMode(isDark ? 'light' : 'dark')

  return { mode, setMode, isDark, toggle }
}
