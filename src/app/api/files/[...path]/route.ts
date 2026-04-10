export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const uploadsRoot = path.resolve(process.cwd(), 'uploads')
  const filePath = path.resolve(uploadsRoot, ...params.path)
  // Prevent path traversal: resolved path must stay inside uploadsRoot
  if (!filePath.startsWith(uploadsRoot + path.sep)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const file = await readFile(filePath)
    return new NextResponse(new Uint8Array(file), {
      headers: { 'Content-Type': 'application/pdf' },
    })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
