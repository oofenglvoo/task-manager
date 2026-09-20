import { Moon, PanelLeft, Plus, Search, Sun } from 'lucide-react'
import { useTags } from '../../hooks/queries'
import { usePrioritiesMeta } from '../../hooks/usePrioritiesMeta'
import { usePreferences } from '../../store/preferences'
import { useUI } from '../../store/ui'
import { Button } from '../ui/Button'
import { Input, Select } from '../ui/Input'

export function Topbar() {
  const {
    search,
    setSearch,
    priority,
    setPriority,
    tagId,
    setTagId,
    openCreate,
    toggleSidebar,
  } = useUI()
  const { data: tags = [] } = useTags()
  const { sorted: sortedPriorities } = usePrioritiesMeta()
  const { resolvedTheme, setTheme } = usePreferences()

  return (
    <header className="app-chrome flex h-12 shrink-0 items-center gap-2.5 border-b border-line bg-surface px-4">
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label="打开导航"
        title="导航"
        className="rounded border border-transparent p-1.5 text-muted transition-colors hover:bg-elevated hover:text-ink hover:border-line"
      >
        <PanelLeft className="h-4 w-4" />
      </button>
      <span className="text-sm font-semibold text-ink">全部任务</span>

      <div className="relative ml-auto w-64">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
        <Input
          value={search}
          placeholder="搜索任务…"
          className="h-8 pl-8 text-xs"
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <Select
        value={priority ?? ''}
        className="h-8 w-28 text-xs"
        aria-label="优先级筛选"
        onChange={(event) =>
          setPriority(event.target.value === '' ? null : Number(event.target.value))
        }
      >
        <option value="">优先级</option>
        {sortedPriorities.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </Select>

      <Select
        value={tagId ?? ''}
        className="h-8 w-32 text-xs"
        aria-label="标签筛选"
        onChange={(event) =>
          setTagId(event.target.value === '' ? null : Number(event.target.value))
        }
      >
        <option value="">标签</option>
        {tags.map((tag) => (
          <option key={tag.id} value={tag.id}>
            {tag.name}
          </option>
        ))}
      </Select>

      <Button
        variant="ghost"
        size="icon"
        aria-label="切换主题"
        title="切换主题"
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      >
        {resolvedTheme === 'dark' ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4" />
        )}
      </Button>

      <Button variant="primary" size="sm" onClick={() => openCreate()}>
        <Plus className="h-4 w-4" />
        新建任务
      </Button>
    </header>
  )
}
