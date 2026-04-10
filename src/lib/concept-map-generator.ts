import OpenAI from 'openai'
import { readFile } from 'fs/promises'
import path from 'path'

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

interface ConceptNode {
  id: string
  label: string
  category: string
  color: string
  position: { x: number; y: number }
}

interface ConceptEdge {
  id: string
  source: string
  target: string
  relation: string
}

interface ConceptMapData {
  nodes: ConceptNode[]
  edges: ConceptEdge[]
}

const CATEGORY_COLORS: Record<string, string> = {
  '理论': '#4F46E5',
  '方法': '#059669',
  '案例': '#D97706',
  '概念': '#7C3AED',
  '过程': '#DC2626',
  '物质': '#2563EB',
  default: '#6B7280',
}

export function parseConceptMapResponse(raw: string): ConceptMapData {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { nodes: [], edges: [] }

    const data = JSON.parse(jsonMatch[0])

    const nodes: ConceptNode[] = (data.nodes || []).map((n: Record<string, string>, i: number) => ({
      id: n.id || `n${i}`,
      label: n.label || '',
      category: n.category || '概念',
      color: CATEGORY_COLORS[n.category] || CATEGORY_COLORS.default,
      position: { x: 150 + (i % 4) * 250, y: 100 + Math.floor(i / 4) * 200 },
    }))

    const edges: ConceptEdge[] = (data.edges || []).map((e: Record<string, string>, i: number) => ({
      id: e.id || `e${i}`,
      source: e.source,
      target: e.target,
      relation: e.relation || '',
    }))

    return { nodes, edges }
  } catch {
    return { nodes: [], edges: [] }
  }
}

/** Convert PDF pages to base64 PNG images via child process (avoids webpack issues) */
export async function pdfToImages(pdfPath: string, maxPages = 8): Promise<string[]> {
  const { execFile } = await import('child_process')
  const { promisify } = await import('util')
  const execFileAsync = promisify(execFile)
  const fullPath = path.join(process.cwd(), pdfPath)
  const scriptPath = path.join(process.cwd(), 'src/lib/pdf-to-images.mjs')
  const { stdout } = await execFileAsync('node', [scriptPath, fullPath, String(maxPages)], {
    maxBuffer: 100 * 1024 * 1024, // 100MB for large PDFs
  })
  return JSON.parse(stdout)
}

/** Try text extraction first; if text is garbage, fall back to vision */
export async function extractPdfText(pdfPath: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse/lib/pdf-parse.js')
  const fullPath = path.join(process.cwd(), pdfPath)
  const buffer = await readFile(fullPath)
  const data = await pdfParse(buffer)
  return data.text.slice(0, 100000)
}

/** Check if extracted text is mostly readable (not garbled) */
export function isTextReadable(text: string): boolean {
  const trimmed = text.replace(/\s+/g, '')
  if (trimmed.length < 50) return false
  // Count meaningful characters: CJK, Hiragana, Katakana, Latin words (2+ letters), digits
  const cjk = trimmed.match(/[\u4e00-\u9fff]/g)?.length || 0
  const kana = trimmed.match(/[\u3040-\u30ff]/g)?.length || 0
  // Only count Latin if they form actual words (2+ consecutive letters)
  const latinWords = trimmed.match(/[A-Za-z]{2,}/g)
  const latin = latinWords ? latinWords.join('').length : 0
  const meaningful = cjk + kana + latin
  const ratio = meaningful / trimmed.length
  return ratio > 0.4
}

const CONCEPT_MAP_PROMPT = `分析以下内容，提取核心概念和概念之间的关系，生成知识图谱。

要求：
1. 提取 8-15 个最重要的概念作为节点
2. 每个节点有 id、label（概念名）、category（分类，如：理论、方法、案例、概念、过程、物质）
3. 提取概念之间的关系作为边，每条边有 id、source、target、relation（关系描述，如：导致、属于、对比、包含）
4. 返回严格的 JSON 格式：{ "nodes": [...], "edges": [...] }
5. 只返回 JSON，不要其他文字`

/** Generate concept map from chat text */
export async function generateConceptMap(
  content: string,
  type: 'pdf' | 'chat'
): Promise<ConceptMapData> {
  const typeHint = type === 'pdf'
    ? '以下是课件内容：'
    : '以下是学生的小组讨论记录：'

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: CONCEPT_MAP_PROMPT },
      { role: 'user', content: `${typeHint}\n\n${content}` },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  })

  const raw = completion.choices[0]?.message?.content || ''
  return parseConceptMapResponse(raw)
}

/** Generate concept map from PDF pages as images (for scanned/image PDFs) */
export async function generateConceptMapFromPdfImages(pdfPath: string): Promise<ConceptMapData> {
  const images = await pdfToImages(pdfPath, 8)

  const imageMessages: OpenAI.Chat.Completions.ChatCompletionContentPart[] = images.map((b64) => ({
    type: 'image_url' as const,
    image_url: { url: `data:image/png;base64,${b64}`, detail: 'low' as const },
  }))

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: CONCEPT_MAP_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: '以下是课件 PDF 的各页截图，请根据课件内容生成知识图谱：' },
          ...imageMessages,
        ],
      },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  })

  const raw = completion.choices[0]?.message?.content || ''
  return parseConceptMapResponse(raw)
}

/** Smart PDF concept map: try text first, fall back to vision */
export async function generatePdfConceptMap(pdfPath: string): Promise<ConceptMapData> {
  // Try text extraction first
  try {
    const text = await extractPdfText(pdfPath)
    if (isTextReadable(text)) {
      return generateConceptMap(text, 'pdf')
    }
  } catch {
    // text extraction failed, fall back to vision
  }

  // Fall back to vision mode (PDF pages as images)
  return generateConceptMapFromPdfImages(pdfPath)
}
