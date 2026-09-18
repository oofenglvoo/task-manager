import { StatusManager } from './StatusManager'
import { TagManager } from './TagManager'

export function SettingsView() {
  return (
    <div className="scrollbar-thin h-full overflow-y-auto p-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-sm font-semibold text-ink">设置</h1>
          <p className="text-xs text-muted">管理任务状态与标签</p>
        </div>
        <StatusManager />
        <TagManager />
      </div>
    </div>
  )
}
