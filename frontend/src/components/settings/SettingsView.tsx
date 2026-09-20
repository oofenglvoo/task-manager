import { AccountSettings } from './AccountSettings'
import { AppearanceSettings } from './AppearanceSettings'
import { DataSettings } from './DataSettings'
import { PriorityManager } from './PriorityManager'
import { StatusManager } from './StatusManager'
import { TagManager } from './TagManager'

export function SettingsView() {
  return (
    <div className="scrollbar-thin h-full overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <div>
          <h1 className="text-base font-semibold text-ink">设置</h1>
          <p className="mt-1 text-xs text-muted">外观、数据、任务状态、优先级与标签</p>
        </div>
        <AppearanceSettings />
        <DataSettings />
        <StatusManager />
        <PriorityManager />
        <TagManager />
        <AccountSettings />
      </div>
    </div>
  )
}
