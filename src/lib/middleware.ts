import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, TokenPayload } from './auth'

export function getAuthPayload(request: NextRequest): TokenPayload | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  try {
    return verifyToken(authHeader.slice(7))
  } catch {
    return null
  }
}

export function requireTeacher(request: NextRequest): TokenPayload {
  const payload = getAuthPayload(request)
  if (!payload || payload.role !== 'teacher') {
    throw new Error('Unauthorized')
  }
  return payload
}

export function requireAuth(request: NextRequest): TokenPayload {
  const payload = getAuthPayload(request)
  if (!payload) {
    throw new Error('Unauthorized')
  }
  return payload
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
