import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'

interface ConceptNodeData {
  label: string
  category: string
  color: string
}

export const ConceptMapNode = memo(function ConceptMapNode({ data }: NodeProps<ConceptNodeData>) {
  return (
    <div
      className="px-4 py-2 rounded-lg border-2 shadow-sm min-w-[100px] text-center"
      style={{ borderColor: data.color, backgroundColor: `${data.color}15` }}
    >
      <Handle type="target" position={Position.Top} />
      <div className="text-xs text-gray-500 mb-1">{data.category}</div>
      <div className="font-medium text-sm">{data.label}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
})
