import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GroupTalk — 协作学习研究平台',
  description: '教育研究协作学习平台',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  )
}
