import { hashPassword, verifyPassword, signToken, verifyToken } from '@/lib/auth'

describe('auth utilities', () => {
  test('hashPassword returns a bcrypt hash', async () => {
    const hash = await hashPassword('test123')
    expect(hash).not.toBe('test123')
    expect(hash).toMatch(/^\$2[aby]\$/)
  })

  test('verifyPassword matches correct password', async () => {
    const hash = await hashPassword('test123')
    expect(await verifyPassword('test123', hash)).toBe(true)
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })

  test('signToken creates a valid JWT', () => {
    const token = signToken({ userId: '123', role: 'teacher' })
    expect(typeof token).toBe('string')
    const payload = verifyToken(token)
    expect(payload.userId).toBe('123')
    expect(payload.role).toBe('teacher')
  })

  test('verifyToken throws on invalid token', () => {
    expect(() => verifyToken('invalid')).toThrow()
  })
})
