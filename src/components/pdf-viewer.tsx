'use client'
import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { Button } from '@/components/ui/button'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PdfViewerProps {
  url: string
}

export function PdfViewer({ url }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b bg-gray-50">
        <div className="flex gap-2">
          <Button
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="px-2 py-1 text-sm bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            &#9664;
          </Button>
          <span className="text-sm leading-8">{pageNumber} / {numPages}</span>
          <Button
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
            className="px-2 py-1 text-sm bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            &#9654;
          </Button>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setScale((s) => Math.max(0.5, s - 0.1))} className="px-2 py-1 text-sm bg-gray-200 text-gray-700 hover:bg-gray-300">-</Button>
          <span className="text-sm leading-8">{Math.round(scale * 100)}%</span>
          <Button onClick={() => setScale((s) => Math.min(2.0, s + 0.1))} className="px-2 py-1 text-sm bg-gray-200 text-gray-700 hover:bg-gray-300">+</Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto flex justify-center p-4">
        <Document file={url} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
          <Page pageNumber={pageNumber} scale={scale} />
        </Document>
      </div>
    </div>
  )
}
