// Standalone script to convert PDF to base64 images
// Run in a child process to avoid webpack bundling issues with pdfjs-dist
import { pdf } from 'pdf-to-img'
import { readFile } from 'fs/promises'

const pdfPath = process.argv[2]
const maxPages = parseInt(process.argv[3] || '8', 10)

const buffer = await readFile(pdfPath)
const images = []
let i = 0
for await (const page of await pdf(buffer, { scale: 1.5 })) {
  if (i >= maxPages) break
  images.push(Buffer.from(page).toString('base64'))
  i++
}

// Output as JSON to stdout
process.stdout.write(JSON.stringify(images))
