import { Suspense, lazy, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Layers, Plus } from 'lucide-react'
import { useStatuses, useTasks } from '../../hooks/queries'
import { usePrioritiesMeta } from '../../hooks/usePrioritiesMeta'
import { chartPalette, priorityColorMap } from '../../lib/chartTheme'
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
const ScoreBoardView = lazy(() =>
  import('./mindmap/ScoreBoardView').then((module) => ({
    default: module.ScoreBoardView,
  })),
)

type MindMapView = 'sankey' | 'radial' | 'tree' | 'swimlane' | 'score'

const VIEW_OPTIONS: Array<{ value: MindMapView; label: string }> = [
  { value: 'sankey', label: '桑基流带' },
  { value: 'radial', label: '径向脑图' },
  { value: 'tree', label: '四列树' },
  { value: 'swimlane', label: '泳道画布' },
  { value: 'score', label: '评分柱状图' },
]

const VIEW_STORAGE_KEY = 'task-manager:mindmap-view'
const COLLAPSE_STORAGE_KEY = 'task-manager:mindmap-collapsed'

const CHART_HEIGHTS: Record<MindMapView, number> = {
  sankey: 440,
  radial: 420,
  tree: 440,
  swimlane: 440,
  score: 440,
}

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
  const { groupBy, setGroupBy, resolvedTheme } = usePreferences()
  const { priorities, sorted } = usePrioritiesMeta()
  const [view, setView] = useState<MindMapView>(loadView)
  const [collapsed, setCollapsed] = useState<boolean>(loadCollapsed)

  const chartHeight = CHART_HEIGHTS[view]

  const palette = useMemo(() => {
    const base = chartPalette(resolvedTheme === 'dark')
    return { ...base, priority: priorityColorMap(priorities, resolvedTheme === 'dark') }
  }, [priorities, resolvedTheme])

  const viewProps = useMemo(
    () => ({
      tasks,
      statuses,
      priorities,
      palette,
      height: chartHeight,
      groupBy,
      isDark: resolvedTheme === 'dark',
      onOpenTask: openTask,
    }),
    [
      tasks,
      statuses,
      priorities,
      palette,
      chartHeight,
      groupBy,
      resolvedTheme,
      openTask,
    ],
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
    <section>
      <div className="mx-auto max-w-[1400px] px-4 py-3.5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-ink">任务脉络</h2>
          <span className="hidden text-xs text-muted lg:inline">
            {groupBy
              ? '按分组 / 优先级与最近更新时间综合排序，每分支最多展示 8 个'
              : '按优先级与最近更新时间综合排序，每分支最多展示 8 个'}
          </span>
          <div className="hidden items-center gap-3 rounded-full border border-line bg-surface px-3 py-1 md:flex">
            {sorted.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 text-[11px] text-ink-soft"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: palette.priority[item.id] ?? item.color }}
                />
                {item.name}
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
                'rounded-md border p-1.5 transition-colors ' +
                (groupBy
                  ? 'border-accent bg-accent text-white'
                  : 'border-line bg-surface text-ink-soft hover:border-line-strong hover:bg-elevated hover:text-ink')
              }
            >
              <Layers className="h-4 w-4" />
            </button>
            <Select
              value={view}
              className="h-8 w-32 text-xs"
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
              className="rounded-md border border-line bg-surface p-1.5 text-ink-soft transition-colors hover:border-line-strong hover:bg-elevated hover:text-ink"
            >
              {collapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
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
          <div className="app-surface-panel rounded-xl border border-line bg-surface p-3 shadow-sm">
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
              ) : view === 'score' ? (
                <ScoreBoardView {...viewProps} />
              ) : (
                <SwimlaneView {...viewProps} />
              )}
            </Suspense>
          </div>
        )}
      </div>
    </section>
  )
}
