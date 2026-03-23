import OpenAI from 'openai'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse')
import { readFile } from 'fs/promises'
import path from 'path'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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

export async function extractPdfText(pdfPath: string): Promise<string> {
  const fullPath = path.join(process.cwd(), pdfPath)
  const buffer = await readFile(fullPath)
  const data = await pdfParse(buffer)
  return data.text.slice(0, 32000)
}

const CONCEPT_MAP_PROMPT = `分析以下内容，提取核心概念和概念之间的关系，生成知识图谱。

要求：
1. 提取 8-15 个最重要的概念作为节点
2. 每个节点有 id、label（概念名）、category（分类，如：理论、方法、案例、概念、过程、物质）
3. 提取概念之间的关系作为边，每条边有 id、source、target、relation（关系描述，如：导致、属于、对比、包含）
4. 返回严格的 JSON 格式：{ "nodes": [...], "edges": [...] }
5. 只返回 JSON，不要其他文字`

export async function generateConceptMap(
  content: string,
  type: 'pdf' | 'chat'
): Promise<ConceptMapData> {
  const typeHint = type === 'pdf'
    ? '以下是课件内容：'
    : '以下是学生的小组讨论记录：'

  const completion = await openai.chat.completions.create({
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
