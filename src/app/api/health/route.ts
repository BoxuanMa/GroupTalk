export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Cheap probe: confirm DB is reachable.
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'ok' })
  } catch {
    return NextResponse.json({ status: 'degraded' }, { status: 503 })
  }
}
