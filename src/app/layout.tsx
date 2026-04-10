import type { Metadata } from 'next'
import './globals.css'
import { I18nProvider } from '@/lib/i18n/I18nProvider'

export const metadata: Metadata = {
  title: 'GroupTalk',
  description: 'Classroom collaborative learning platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body className="min-h-screen bg-gray-50">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  )
}
