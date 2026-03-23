// Mock dependencies before importing concept-map-generator
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: { completions: { create: jest.fn() } },
  }))
})

jest.mock('pdf-parse', () => jest.fn())

import { parseConceptMapResponse } from '@/lib/concept-map-generator'

describe('Concept Map Generator', () => {
  test('parseConceptMapResponse extracts valid nodes and edges', () => {
    const raw = JSON.stringify({
      nodes: [
        { id: 'n1', label: '光合作用', category: '过程' },
        { id: 'n2', label: '叶绿素', category: '物质' },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', relation: '需要' },
      ],
    })

    const result = parseConceptMapResponse(raw)
    expect(result.nodes).toHaveLength(2)
    expect(result.edges).toHaveLength(1)
    expect(result.nodes[0].position).toBeDefined()
  })

  test('parseConceptMapResponse handles malformed JSON gracefully', () => {
    const result = parseConceptMapResponse('not json')
    expect(result.nodes).toEqual([])
    expect(result.edges).toEqual([])
  })
})
