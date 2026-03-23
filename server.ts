import { createServer } from 'http'
import next from 'next'
import { setupSocketIO } from './src/lib/socket'

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()
const port = parseInt(process.env.PORT || '3000', 10)

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res)
  })

  const io = setupSocketIO(httpServer)

  // Make io accessible for AI engine
  ;(global as Record<string, unknown>).__io = io

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`)
  })
})
