'use client'
import { useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { DEFAULT_SYSTEM_PROMPT } from '@/lib/ai-config'

interface AiConfigFormProps {
  value: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}

export function AiConfigForm({ value, onChange }: AiConfigFormProps) {
  const role = (value.role as string) || 'system_helper'

  // Pre-fill the default system prompt so teachers can see and edit it
  useEffect(() => {
    if (value.systemPrompt === undefined || value.systemPrompt === null) {
      onChange({ ...value, systemPrompt: DEFAULT_SYSTEM_PROMPT })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function update(key: string, val: unknown) {
    onChange({ ...value, [key]: val })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">AI 角色</label>
        <select
          className="w-full border rounded-lg px-3 py-2"
          value={role}
          onChange={(e) => update('role', e.target.value)}
        >
          <option value="system_helper">系统助手（@触发）</option>
          <option value="known_ai_peer">已知 AI 同伴</option>
          <option value="hidden_ai_peer">隐藏 AI 同伴</option>
        </select>
      </div>

      {role === 'hidden_ai_peer' && (
        <div>
          <label className="block text-sm font-medium mb-1">虚拟学生名</label>
          <Input
            value={(value.displayName as string) || ''}
            onChange={(e) => update('displayName', e.target.value)}
            placeholder="如：王明"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">角色人设 Prompt</label>
        <textarea
          className="w-full border rounded-lg px-3 py-2 h-48 font-mono text-sm"
          value={(value.systemPrompt as string) ?? DEFAULT_SYSTEM_PROMPT}
          onChange={(e) => update('systemPrompt', e.target.value)}
          placeholder="设定 AI 的角色和行为..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">主动程度</label>
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={(value.proactiveness as string) || 'medium'}
            onChange={(e) => update('proactiveness', e.target.value)}
          >
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">触发方式</label>
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={(value.triggerMode as string) || 'mention_only'}
            onChange={(e) => update('triggerMode', e.target.value)}
          >
            <option value="mention_only">仅 @触发</option>
            <option value="auto">自动参与</option>
            <option value="hybrid">混合</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">沉默阈值（秒）</label>
          <Input
            type="number"
            value={(value.silenceThreshold as number) || 60}
            onChange={(e) => update('silenceThreshold', Number(e.target.value))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">最大频率（条/分钟）</label>
          <Input
            type="number"
            value={(value.maxFrequency as number) || 2}
            onChange={(e) => update('maxFrequency', Number(e.target.value))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">模型</label>
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={(value.model as string) || 'gpt-4o'}
            onChange={(e) => update('model', e.target.value)}
          >
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4o-mini">GPT-4o Mini</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Temperature</label>
          <Input
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={(value.temperature as number) || 0.7}
            onChange={(e) => update('temperature', Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  )
}
