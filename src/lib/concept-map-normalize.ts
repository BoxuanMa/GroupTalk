// Canonical flat schema for concept-map nodes/edges stored in DB.
// Both new generator output and ReactFlow editor output are normalized
// here so the rest of the app only sees one shape.

type AnyRecord = Record<string, unknown>

export interface FlatNode {
  id: string
  label: string
  category: string
  color: string
  position: { x: number; y: number }
}

export interface FlatEdge {
  id: string
  source: string
  target: string
  relation: string
}

export function normalizeNodes(input: unknown): FlatNode[] {
  if (!Array.isArray(input)) return []
  return input.map((raw, i) => {
    const n = (raw ?? {}) as AnyRecord
    const data = (n.data as AnyRecord | undefined) || {}
    const pos = (n.position as AnyRecord | undefined) || {}
    return {
      id: String(n.id ?? `n${i}`),
      label: String(n.label ?? data.label ?? ''),
      category: String(n.category ?? data.category ?? '概念'),
      color: String(n.color ?? data.color ?? '#6B7280'),
      position: {
        x: typeof pos.x === 'number' ? pos.x : 150 + (i % 4) * 250,
        y: typeof pos.y === 'number' ? pos.y : 100 + Math.floor(i / 4) * 200,
      },
    }
  })
}

export function normalizeEdges(input: unknown): FlatEdge[] {
  if (!Array.isArray(input)) return []
  return input.map((raw, i) => {
    const e = (raw ?? {}) as AnyRecord
    const data = (e.data as AnyRecord | undefined) || {}
    return {
      id: String(e.id ?? `e${i}`),
      source: String(e.source ?? ''),
      target: String(e.target ?? ''),
      relation: String(e.relation ?? data.relation ?? e.label ?? ''),
    }
  })
}
