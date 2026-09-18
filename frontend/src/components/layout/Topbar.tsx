import { PanelLeft, Plus, Search } from 'lucide-react'
import { useProjects, useTags } from '../../hooks/queries'
import { useUI } from '../../store/ui'
import { Button } from '../ui/Button'
import { Input, Select } from '../ui/Input'

export function Topbar() {
  const {
    projectId,
    search,
    setSearch,
    priority,
    setPriority,
    tagId,
    setTagId,
    openCreate,
    toggleSidebar,
  } = useUI()
  const { data: projects = [] } = useProjects()
  const { data: tags = [] } = useTags()
  const current = projects.find((project) => project.id === projectId)

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4">
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label="打开导航"
        className="rounded p-1.5 text-ink-soft transition-colors hover:bg-elevated hover:text-ink"
      >
        <PanelLeft className="h-4 w-4" />
      </button>
      <span className="text-sm font-medium text-ink">
        {current ? current.name : '全部任务'}
      </span>

      <div className="relative ml-auto w-56">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          value={search}
          placeholder="搜索任务…"
          className="pl-8"
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <Select
        value={priority ?? ''}
        className="w-28"
        aria-label="优先级筛选"
        onChange={(event) =>
          setPriority(event.target.value === '' ? null : Number(event.target.value))
        }
      >
        <option value="">优先级</option>
        <option value={3}>高</option>
        <option value={2}>中</option>
        <option value={1}>低</option>
      </Select>

      <Select
        value={tagId ?? ''}
        className="w-32"
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

      <Button variant="primary" onClick={() => openCreate()}>
        <Plus className="h-4 w-4" />
        新建任务
      </Button>
    </header>
  )
}
