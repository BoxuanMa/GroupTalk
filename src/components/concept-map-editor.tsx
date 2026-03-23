'use client'
import { useCallback } from 'react'
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  Node,
  Edge,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { ConceptMapNode } from './concept-map-node'
import { Button } from '@/components/ui/button'

const nodeTypes = { concept: ConceptMapNode }

interface ConceptMapEditorProps {
  initialNodes: Node[]
  initialEdges: Edge[]
  onSave: (nodes: Node[], edges: Edge[]) => void
  title: string
}

export function ConceptMapEditor({ initialNodes, initialEdges, onSave, title }: ConceptMapEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialNodes.map((n) => ({ ...n, type: 'concept' }))
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialEdges.map((e) => ({
      ...e,
      label: (e.data as { relation?: string })?.relation || e.label,
      markerEnd: { type: MarkerType.ArrowClosed },
    }))
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      const label = prompt('请输入关系描述：')
      if (label) {
        setEdges((eds) => addEdge({ ...connection, label, markerEnd: { type: MarkerType.ArrowClosed } }, eds))
      }
    },
    [setEdges]
  )

  function addNode() {
    const label = prompt('请输入概念名称：')
    if (!label) return
    const category = prompt('请输入分类（如：理论、方法、案例）：') || '概念'
    const id = `n${Date.now()}`
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'concept',
        position: { x: 300, y: 300 },
        data: { label, category, color: '#6B7280' },
      },
    ])
  }

  function deleteSelected() {
    setNodes((nds) => nds.filter((n) => !n.selected))
    setEdges((eds) => eds.filter((e) => !e.selected))
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b bg-gray-50 flex justify-between items-center">
        <span className="font-semibold text-sm">{title}</span>
        <div className="flex gap-2">
          <Button onClick={addNode} className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700">添加节点</Button>
          <Button onClick={deleteSelected} className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700">删除选中</Button>
          <Button onClick={() => onSave(nodes, edges)} className="px-2 py-1 text-xs">保存</Button>
        </div>
      </div>
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  )
}
