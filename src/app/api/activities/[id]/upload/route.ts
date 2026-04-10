export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireTeacher, unauthorized } from '@/lib/middleware'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = requireTeacher(request)

    const activity = await prisma.activity.findFirst({
      where: { id: params.id, teacherId: payload.userId },
    })
    if (!activity) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get('pdf') as File | null
    if (!file) {
      return NextResponse.json({ error: 'PDF file required' }, { status: 400 })
    }
    // Validate type (extension + MIME) and size
    const MAX_BYTES = 50 * 1024 * 1024 // 50 MB
    const isPdfExt = file.name.toLowerCase().endsWith('.pdf')
    const isPdfMime = file.type === 'application/pdf' || file.type === ''
    if (!isPdfExt || !isPdfMime) {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'PDF too large (max 50MB)' }, { status: 413 })
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'Empty file' }, { status: 400 })
    }

    // Sanitize filename: strip path components, keep only basename
    const safeBase = path
      .basename(file.name)
      .replace(/[^A-Za-z0-9._-]/g, '_')
      .slice(0, 100)
    const fileName = `${Date.now()}-${safeBase}`

    const uploadsRoot = path.resolve(process.cwd(), 'uploads')
    const uploadDir = path.resolve(uploadsRoot, params.id)
    if (!uploadDir.startsWith(uploadsRoot + path.sep)) {
      return NextResponse.json({ error: 'Invalid activity id' }, { status: 400 })
    }
    await mkdir(uploadDir, { recursive: true })

    const filePath = path.join(uploadDir, fileName)
    const bytes = await file.arrayBuffer()
    // Quick magic-number check: PDFs start with "%PDF-"
    const head = Buffer.from(bytes.slice(0, 5))
    if (head.toString('ascii') !== '%PDF-') {
      return NextResponse.json({ error: 'File is not a valid PDF' }, { status: 400 })
    }
    await writeFile(filePath, Buffer.from(bytes))

    // Extract PDF text for AI context
    let pdfText: string | null = null
    try {
      const { extractPdfText } = await import('@/lib/concept-map-generator')
      pdfText = await extractPdfText(`/uploads/${params.id}/${fileName}`)
    } catch (err) {
      console.error('[upload] PDF text extraction failed:', err)
    }

    const updated = await prisma.activity.update({
      where: { id: params.id },
      data: {
        pdfUrl: `/uploads/${params.id}/${fileName}`,
        pdfFileName: file.name,
        ...(pdfText && { pdfText }),
      },
    })

    return NextResponse.json({ activity: updated })
  } catch {
    return unauthorized()
  }
}
