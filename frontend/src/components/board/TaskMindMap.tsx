import { Suspense, lazy, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Layers, Plus } from 'lucide-react'
import { useStatuses, useTasks } from '../../hooks/queries'
import { cn } from '../../lib/utils'
import { usePreferences } from '../../store/preferences'
import { useUI } from '../../store/ui'
import { EmptyState } from '../ui/EmptyState'
import { Button } from '../ui/Button'
import { Select } from '../ui/Input'

const RadialView = lazy(() =>
  import('./mindmap/RadialView').then((module) => ({ default: module.RadialView })),
)
const SankeyView = lazy(() =>
  import('./mindmap/SankeyView').then((module) => ({ default: module.SankeyView })),
)
const SwimlaneView = lazy(() =>
  import('./mindmap/SwimlaneView').then((module) => ({ default: module.SwimlaneView })),
)
const TreeView = lazy(() =>
  import('./mindmap/TreeView').then((module) => ({ default: module.TreeView })),
)

type MindMapView = 'sankey' | 'radial' | 'tree' | 'swimlane'

const VIEW_OPTIONS: Array<{ value: MindMapView; label: string }> = [
  { value: 'sankey', label: '桑基流带' },
  { value: 'radial', label: '径向脑图' },
  { value: 'tree', label: '四列树' },
  { value: 'swimlane', label: '泳道画布' },
]

const VIEW_STORAGE_KEY = 'task-manager:mindmap-view'
const COLLAPSE_STORAGE_KEY = 'task-manager:mindmap-collapsed'

const CHART_HEIGHTS: Record<MindMapView, number> = {
  sankey: 440,
  radial: 420,
  tree: 440,
  swimlane: 440,
}

const LEGEND: Array<{ priority: number; label: string; className: string }> = [
  { priority: 3, label: '高', className: 'bg-priority-high' },
  { priority: 2, label: '中', className: 'bg-priority-medium' },
  { priority: 1, label: '低', className: 'bg-priority-low' },
]

function loadView(): MindMapView {
  try {
    const raw = window.localStorage.getItem(VIEW_STORAGE_KEY)
    if (raw && VIEW_OPTIONS.some((item) => item.value === raw)) return raw as MindMapView
  } catch {
    // ignore
  }
  return 'sankey'
}

function loadCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function TaskMindMap() {
  const { data: statuses = [] } = useStatuses()
  const { data: tasks = [], isLoading } = useTasks({ sort: 'position', order: 'asc' })
  const { openTask, openCreate } = useUI()
  const { groupBy, setGroupBy } = usePreferences()
  const [view, setView] = useState<MindMapView>(loadView)
  const [collapsed, setCollapsed] = useState<boolean>(loadCollapsed)

  const chartHeight = CHART_HEIGHTS[view]

  const viewProps = useMemo(
    () => ({ tasks, statuses, height: chartHeight, groupBy, onOpenTask: openTask }),
    [tasks, statuses, chartHeight, groupBy, openTask],
  )

  function changeView(next: MindMapView) {
    setView(next)
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next)
    } catch {
      // ignore
    }
  }

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? '1' : '0')
      } catch {
        // ignore
      }
      return next
    })
  }

  const isEmpty = !isLoading && tasks.length === 0

  return (
    <section className="border-b border-line px-4 py-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-ink">任务脉络</h2>
        <span className="text-xs text-muted">
          {groupBy
            ? '按分组 / 优先级与最近更新时间综合排序，每分支最多展示 8 个'
            : '按优先级与最近更新时间综合排序，每分支最多展示 8 个'}
        </span>
        <div className="ml-2 hidden items-center gap-2 sm:flex">
          {LEGEND.map((item) => (
            <span key={item.priority} className="inline-flex items-center gap-1 text-xs text-muted">
              <span className={cn('h-2 w-2 rounded-full', item.className)} />
              {item.label}
            </span>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            aria-label={groupBy ? '切换为不分组' : '按分组查看'}
            title={groupBy ? '不分组' : '按分组'}
            onClick={() => setGroupBy(!groupBy)}
            className={
              'rounded border p-1.5 transition-colors ' +
              (groupBy
                ? 'border-accent/60 bg-accent-soft text-ink'
                : 'border-line text-ink-soft hover:border-line-strong hover:text-ink')
            }
          >
            <Layers className="h-4 w-4" />
          </button>
          <Select
            value={view}
            className="w-32"
            aria-label="选择视图"
            onChange={(event) => changeView(event.target.value as MindMapView)}
          >
            {VIEW_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <button
            type="button"
            aria-label={collapsed ? '展开任务脉络' : '折叠任务脉络'}
            title={collapsed ? '展开' : '折叠'}
            onClick={toggleCollapsed}
            className="rounded border border-line p-1.5 text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {collapsed ? null : isLoading ? (
        <div className="h-40 animate-pulse rounded-lg bg-elevated" />
      ) : isEmpty ? (
        <EmptyState
          title="还没有任务"
          description="创建第一个任务，它会出现在这张任务脉络图中。"
          action={
            <Button variant="primary" size="sm" onClick={() => openCreate()}>
              <Plus className="h-3.5 w-3.5" />
              新建任务
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border border-line bg-canvas/30 p-3">
          <Suspense
            fallback={
              <div
                className="animate-pulse rounded bg-elevated"
                style={{ height: chartHeight }}
              />
            }
          >
            {view === 'sankey' ? (
              <SankeyView {...viewProps} />
            ) : view === 'radial' ? (
              <RadialView {...viewProps} />
            ) : view === 'tree' ? (
              <TreeView {...viewProps} />
            ) : (
              <SwimlaneView {...viewProps} />
            )}
          </Suspense>
        </div>
      )}
    </section>
  )
}
