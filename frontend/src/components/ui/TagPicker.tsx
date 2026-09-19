import type { Tag } from '../../lib/types'
import { cn } from '../../lib/utils'

export function TagPicker({
  tags,
  selected,
  onChange,
}: {
  tags: Tag[]
  selected: number[]
  onChange: (ids: number[]) => void
}) {
  if (tags.length === 0) {
    return <p className="text-xs text-muted">暂无标签，可到「设置」中创建。</p>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const active = selected.includes(tag.id)
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() =>
              onChange(
                active ? selected.filter((id) => id !== tag.id) : [...selected, tag.id],
              )
            }
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs transition-colors',
              active ? 'font-medium' : 'border-line text-ink-soft hover:border-line-strong',
            )}
            style={
              active
                ? { color: tag.color, borderColor: `${tag.color}99`, backgroundColor: `${tag.color}26` }
                : undefined
            }
          >
            {tag.name}
          </button>
        )
      })}
    </div>
  )
}
