import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Download, Upload } from 'lucide-react'
import { api, errorMessage } from '../../lib/api'
import { useToast } from '../../store/toast'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'

export function DataSettings() {
  const queryClient = useQueryClient()
  const { push } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Record<string, unknown> | null>(null)
  const [busy, setBusy] = useState(false)

  async function exportData() {
    try {
      const data = await api.data.exportAll()
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `task-manager-backup-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
      push('已导出备份文件', 'success')
    } catch (error) {
      push(errorMessage(error), 'error')
    }
  }

  async function pickFile(file: File | undefined) {
    if (!file) return
    try {
      const text = await file.text()
      setPending(JSON.parse(text) as Record<string, unknown>)
    } catch {
      push('无法解析该 JSON 文件', 'error')
    }
  }

  async function confirmImport() {
    if (!pending) return
    setBusy(true)
    try {
      const result = await api.data.importAll(pending)
      await queryClient.invalidateQueries()
      push(`导入完成：${result.projects} 个项目、${result.tasks} 个任务`, 'success')
      setPending(null)
    } catch (error) {
      push(errorMessage(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-lg border border-line bg-surface">
      <header className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">数据</h2>
        <p className="text-xs text-muted">导出或导入全部数据（JSON）</p>
      </header>

      <div className="space-y-3 px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={exportData}>
            <Download className="h-3.5 w-3.5" />
            导出备份
          </Button>
          <Button size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" />
            导入备份
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              void pickFile(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </div>
        <p className="text-xs text-muted">
          导出包含项目、状态、标签、任务与子任务；导入会
          <strong className="text-danger">覆盖</strong>
          当前全部数据。
        </p>
      </div>

      <ConfirmDialog
        open={pending != null}
        title="导入数据"
        message="导入将清空当前所有项目、状态、标签与任务，并替换为备份内容，此操作不可撤销。确定继续吗？"
        confirmLabel="覆盖导入"
        loading={busy}
        onCancel={() => setPending(null)}
        onConfirm={confirmImport}
      />
    </section>
  )
}
