'use client'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { LOCALES, Locale } from '@/lib/i18n/messages'
import { Globe } from 'lucide-react'

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useI18n()
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <Globe className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
      <select
        aria-label="Language"
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="text-sm border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 bg-white text-slate-600
          hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
          appearance-none cursor-pointer transition-colors"
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </div>
  )
}
