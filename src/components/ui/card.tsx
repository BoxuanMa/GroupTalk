import { HTMLAttributes } from 'react'

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`bg-white rounded-xl shadow-sm border p-6 ${className}`} {...props} />
}
