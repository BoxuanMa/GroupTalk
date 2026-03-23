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
    const file = formData.get('pdf') as File
    if (!file || !file.name.endsWith('.pdf')) {
      return NextResponse.json({ error: 'PDF file required' }, { status: 400 })
    }

    const uploadDir = path.join(process.cwd(), 'uploads', params.id)
    await mkdir(uploadDir, { recursive: true })

    const fileName = `${Date.now()}-${file.name}`
    const filePath = path.join(uploadDir, fileName)
    const bytes = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))

    const updated = await prisma.activity.update({
      where: { id: params.id },
      data: { pdfUrl: `/uploads/${params.id}/${fileName}`, pdfFileName: file.name },
    })

    return NextResponse.json({ activity: updated })
  } catch {
    return unauthorized()
  }
}
