import dotenv from 'dotenv'
dotenv.config()
import { createServer } from 'http'
import next from 'next'
import { setupSocketIO } from './src/lib/socket'
import { setIO } from './src/lib/io-store'

// Fail fast if critical env vars are missing or set to placeholder values.
const REQUIRED_ENVS = ['DATABASE_URL', 'JWT_SECRET', 'OPENAI_API_KEY'] as const
const PLACEHOLDERS = new Set([
  'your-secret-key-change-in-production',
  'change-this-in-production',
  'your-openai-api-key',
  'dev-secret',
])
const missing: string[] = []
for (const key of REQUIRED_ENVS) {
  const v = process.env[key]
  if (!v || PLACEHOLDERS.has(v)) missing.push(key)
}
if (process.env.NODE_ENV === 'production' && missing.length > 0) {
  console.error(
    `[server] Refusing to start: missing or placeholder env vars: ${missing.join(', ')}`
  )
  process.exit(1)
} else if (missing.length > 0) {
  console.warn(`[server] WARNING: missing/placeholder env vars: ${missing.join(', ')}`)
}

// Surface unhandled errors instead of silently dropping them.
process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandledRejection:', reason)
})
process.on('uncaughtException', (err) => {
  console.error('[server] uncaughtException:', err)
})

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()
const port = parseInt(process.env.PORT || '3000', 10)

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res)
  })

  const io = setupSocketIO(httpServer)

  // Make io accessible for API routes
  setIO(io)
  ;(globalThis as Record<string, unknown>).__io = io

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`)
  })
})
