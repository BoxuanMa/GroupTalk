'use client'
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { Locale, DEFAULT_LOCALE, LOCALES, translate } from './messages'

interface I18nContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

const STORAGE_KEY = 'grouptalk_locale'

function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null
  if (stored && LOCALES.some((l) => l.code === stored)) return stored
  const nav = window.navigator.language.toLowerCase()
  if (nav.startsWith('ja')) return 'ja'
  if (nav.startsWith('en')) return 'en'
  return 'zh'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // Start with default to keep SSR/CSR markup identical, then sync from storage.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  useEffect(() => {
    const detected = detectInitialLocale()
    if (detected !== locale) setLocaleState(detected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, l)
      document.documentElement.lang = l
    }
  }, [])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale]
  )

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    // Graceful fallback if a component is rendered outside provider (e.g. tests)
    return { locale: DEFAULT_LOCALE, setLocale: () => {}, t: (k: string) => k }
  }
  return ctx
}
