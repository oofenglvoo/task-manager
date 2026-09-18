import { useMemo, useState } from 'react'
import { CheckCircle2, Plus } from 'lucide-react'
import { useStatuses, useTasks } from '../../hooks/queries'
import { buildMindMap, type MindMapNode } from '../../lib/mindmap'
import { cn, relativeTime } from '../../lib/utils'
import { useUI } from '../../store/ui'
import { EmptyState } from '../ui/EmptyState'
import { Button } from '../ui/Button'

function curvePath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const midX = (from.x + to.x) / 2
  return `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`
}

export function TaskMindMap() {
  const { data: statuses = [] } = useStatuses()
  const { data: tasks = [], isLoading } = useTasks({ sort: 'position', order: 'asc' })
  const { openTask, openCreate } = useUI()
  const [activePriority, setActivePriority] = useState<string | null>(null)

  const layout = useMemo(() => buildMindMap(tasks, statuses), [tasks, statuses])

  if (isLoading) {
    return (
      <section className="border-b border-line px-4 py-4">
        <div className="h-40 animate-pulse rounded-lg bg-elevated" />
      </section>
    )
  }

  if (layout.nodes.length <= 1) {
    return (
      <section className="border-b border-line px-4 py-4">
        <EmptyState
          title="还没有任务"
          description="创建第一个任务，它会出现在这张任务脑图中。"
          action={
            <Button variant="primary" size="sm" onClick={() => openCreate()}>
              <Plus className="h-3.5 w-3.5" />
              新建任务
            </Button>
          }
        />
      </section>
    )
  }

  const dimmed = (node: MindMapNode) =>
    activePriority != null && node.id !== 'root' && activePriority !== node.id

  return (
    <section className="border-b border-line px-4 py-4">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-ink">任务脉络</h2>
        <span className="text-xs text-muted">
          按优先级与最近更新时间综合排序，每分支最多展示 8 个
        </span>
      </div>
      <div className="scrollbar-thin overflow-x-auto rounded-lg border border-line bg-surface">
        <svg
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role="img"
          aria-label="任务脑图"
          className="min-h-[220px]"
        >
          {layout.links.map((link) => (
            <path
              key={link.id}
              d={curvePath(link.from, link.to)}
              fill="none"
              stroke={link.color ?? 'rgb(var(--c-line-strong))'}
              strokeWidth={1.5}
              strokeDasharray={link.dashed ? '4 4' : undefined}
              vectorEffect="non-scaling-stroke"
              className={cn(
                'transition-opacity duration-150',
                activePriority != null && link.rootId !== activePriority
                  ? 'opacity-15'
                  : 'opacity-70',
              )}
            />
          ))}

          {layout.nodes.map((node) => {
            const interactive = node.type === 'task'
            const isRoot = node.type === 'root'
            const isMore = node.type === 'more'
            const isContainer = node.type === 'priority' || node.type === 'status'
            return (
              <g
                key={node.id}
                role={interactive ? 'button' : undefined}
                tabIndex={interactive ? 0 : undefined}
                aria-label={interactive ? `打开任务：${node.label}` : undefined}
                onClick={() => {
                  if (interactive && node.taskId != null) openTask(node.taskId)
                }}
                onKeyDown={(event) => {
                  if (interactive && node.taskId != null && event.key === 'Enter') {
                    openTask(node.taskId)
                  }
                }}
                onMouseEnter={() => {
                  if (isContainer) setActivePriority(node.id)
                }}
                onMouseLeave={() => {
                  if (isContainer) setActivePriority(null)
                }}
                className={cn(
                  'transition-opacity duration-150 motion-reduce:transition-none',
                  dimmed(node) && 'opacity-30',
                  interactive && 'cursor-pointer focus:outline-none',
                )}
              >
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  rx={isRoot ? 10 : 8}
                  fill={
                    isRoot
                      ? 'rgb(var(--c-accent))'
                      : isMore
                        ? 'rgb(var(--c-elevated))'
                        : 'rgb(var(--c-note-base))'
                  }
                  stroke={
                    isRoot
                      ? 'rgb(var(--c-accent))'
                      : isMore
                        ? 'rgb(var(--c-line-strong))'
                        : (node.color ?? 'rgb(var(--c-line))')
                  }
                  strokeWidth={isRoot ? 0 : 1.2}
                  strokeDasharray={isMore ? '4 3' : undefined}
                />
                {!isRoot ? (
                  <rect
                    x={node.x}
                    y={node.y}
                    width={4}
                    height={node.height}
                    rx={2}
                    fill={node.color ?? 'rgb(var(--c-line-strong))'}
                  />
                ) : null}

                {(() => {
                  const textX = node.x + (isRoot ? 14 : 14)
                  const maxChars =
                    node.type === 'task'
                      ? 15
                      : node.type === 'status'
                        ? 8
                        : node.type === 'priority'
                          ? 6
                          : 10
                  const label =
                    node.label.length > maxChars
                      ? `${node.label.slice(0, maxChars)}…`
                      : node.label
                  return (
                    <>
                      <text
                        x={textX}
                        y={node.sublabel ? node.y + node.height / 2 - 4 : node.y + node.height / 2 + 4}
                        fill={
                          isRoot
                            ? 'rgb(255 255 255)'
                            : node.done
                              ? 'rgb(var(--c-muted))'
                              : 'rgb(var(--c-ink))'
                        }
                        fontSize={isRoot ? 13 : 12}
                        fontWeight={isRoot || isContainer ? 600 : 500}
                        className={cn(node.done && 'line-through')}
                      >
                        {label}
                      </text>
                      {node.sublabel ? (
                        <text
                          x={textX}
                          y={node.y + node.height / 2 + 12}
                          fill={isRoot ? 'rgb(255 255 255 / 0.8)' : 'rgb(var(--c-muted))'}
                          fontSize={10}
                        >
                          {node.sublabel}
                        </text>
                      ) : null}
                      {node.type === 'task' ? (
                        <text
                          x={node.x + node.width - 10}
                          y={node.y + node.height / 2 + 4}
                          textAnchor="end"
                          fill="rgb(var(--c-muted))"
                          fontSize={10}
                        >
                          {relativeTime(tasks.find((t) => t.id === node.taskId)?.updated_at ?? '')}
                        </text>
                      ) : null}
                    </>
                  )
                })()}

                {node.done ? (
                  <CheckCircle2
                    x={node.x + node.width - 22}
                    y={node.y + 6}
                    width={12}
                    height={12}
                    className="text-success"
                  />
                ) : null}
              </g>
            )
          })}
        </svg>
      </div>
    </section>
  )
}
