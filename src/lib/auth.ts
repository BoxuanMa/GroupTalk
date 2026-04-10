import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const PLACEHOLDER_SECRETS = new Set([
  'dev-secret',
  'change-this-in-production',
  'your-secret-key-change-in-production',
])

let warnedPlaceholder = false

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  const isProd = process.env.NODE_ENV === 'production'
  if (!secret) {
    if (isProd) {
      throw new Error('JWT_SECRET environment variable is required in production.')
    }
    if (!warnedPlaceholder) {
      console.warn('[auth] JWT_SECRET not set, using insecure fallback (dev only).')
      warnedPlaceholder = true
    }
    return 'dev-secret-not-for-production'
  }
  if (PLACEHOLDER_SECRETS.has(secret)) {
    if (isProd) {
      throw new Error('JWT_SECRET is set to a placeholder value; refusing to start in production.')
    }
    if (!warnedPlaceholder) {
      console.warn(
        '[auth] WARNING: JWT_SECRET is a placeholder. Set a strong random value before deploying.'
      )
      warnedPlaceholder = true
    }
  } else if (isProd && secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long in production.')
  }
  return secret
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export interface TokenPayload {
  userId: string
  role: 'teacher' | 'student'
  activityId?: string
  groupId?: string
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '24h' })
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, getJwtSecret()) as TokenPayload
}
