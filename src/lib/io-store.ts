// Shared Socket.IO instance store
// Uses globalThis to survive Next.js hot-reload
import type { Server as SocketIOServer } from 'socket.io'

const g = globalThis as unknown as { __socketIO?: SocketIOServer }

export function setIO(io: SocketIOServer) {
  g.__socketIO = io
}

export function getIO(): SocketIOServer | undefined {
  return g.__socketIO
}
