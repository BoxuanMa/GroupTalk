import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const filePath = path.join(process.cwd(), 'uploads', ...params.path)
  try {
    const file = await readFile(filePath)
    return new NextResponse(file, {
      headers: { 'Content-Type': 'application/pdf' },
    })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
