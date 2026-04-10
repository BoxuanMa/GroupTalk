'use client'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { LOCALES, Locale } from '@/lib/i18n/messages'

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useI18n()
  return (
    <select
      aria-label="Language"
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      className={`text-sm border border-gray-300 rounded px-2 py-1 bg-white ${className}`}
    >
      {LOCALES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  )
}
