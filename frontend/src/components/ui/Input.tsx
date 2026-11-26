import { ChevronDown } from 'lucide-react'
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { cn } from '../../lib/utils'

const base =
  'w-full rounded border border-line bg-surface px-3 text-sm text-ink shadow-sm placeholder:text-muted transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-50'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, 'h-9', className)} {...props} />
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, 'py-2 leading-relaxed', className)} {...props} />
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(base, 'h-9 appearance-none pr-8', className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  )
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  // 注意：这里必须是 <div> 而不是 <label>。原生 <label> 会把点击事件
  // 转发给它关联的表单控件（label.control = 第一个 labelable 后代）。
  // 描述字段里第一个 labelable 后代是工具栏的"加粗"按钮，于是每次点击
  // 富文本编辑器都会被 label 激活成一次"加粗"点击 —— 表现为新输入的文字
  // 全部变成 <b>。改成 div 后不再转发；字段标签仅作视觉/无障碍文本。
  return (
    <div className="block space-y-1.5">
      <span className="text-xs font-medium text-ink-soft">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
    </div>
  )
}
