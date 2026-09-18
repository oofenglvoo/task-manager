import { useRef, useState } from 'react'
import { ImagePlus, Link2, Trash2 } from 'lucide-react'
import { errorMessage } from '../../lib/api'
import { fileToDataUrl } from '../../lib/image'
import { cn } from '../../lib/utils'
import type { CardSize, ThemeMode } from '../../store/preferences'
import { usePreferences } from '../../store/preferences'
import { useToast } from '../../store/toast'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string }> = [
  { value: 'dark', label: '深色' },
  { value: 'light', label: '浅色' },
  { value: 'system', label: '跟随系统' },
]

const SIZE_OPTIONS: Array<{ value: CardSize; label: string }> = [
  { value: 'sm', label: '小' },
  { value: 'md', label: '中' },
  { value: 'lg', label: '大' },
]

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <div className="inline-flex rounded-md border border-line p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded px-3 py-1 text-xs transition-colors',
            value === option.value
              ? 'bg-accent text-white'
              : 'text-ink-soft hover:bg-elevated hover:text-ink',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function AppearanceSettings() {
  const { theme, cardSize, background, setTheme, setCardSize, setBackground } =
    usePreferences()
  const { push } = useToast()
  const [url, setUrl] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    try {
      const dataUrl = await fileToDataUrl(file)
      if (dataUrl.length > 4_500_000) {
        push('图片过大，请换一张更小的图片', 'error')
        return
      }
      setBackground(dataUrl)
      push('背景已更新', 'success')
    } catch (error) {
      push(errorMessage(error), 'error')
    }
  }

  function applyUrl() {
    const value = url.trim()
    if (!value) return
    setBackground(value)
    setUrl('')
    push('背景已更新', 'success')
  }

  return (
    <section className="rounded-lg border border-line bg-surface">
      <header className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">外观</h2>
        <p className="text-xs text-muted">主题、卡片大小与背景图片</p>
      </header>

      <div className="space-y-5 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-ink-soft">主题</span>
          <Segmented value={theme} options={THEME_OPTIONS} onChange={setTheme} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-ink-soft">卡片大小</span>
          <Segmented value={cardSize} options={SIZE_OPTIONS} onChange={setCardSize} />
        </div>

        <div className="space-y-3">
          <span className="text-sm text-ink-soft">背景图片</span>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={url}
              placeholder="粘贴图片 URL…"
              className="max-w-xs"
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  applyUrl()
                }
              }}
            />
            <Button size="sm" onClick={applyUrl}>
              <Link2 className="h-3.5 w-3.5" />
              使用链接
            </Button>
            <Button size="sm" onClick={() => fileRef.current?.click()}>
              <ImagePlus className="h-3.5 w-3.5" />
              上传图片
            </Button>
            {background ? (
              <Button size="sm" variant="danger" onClick={() => setBackground(null)}>
                <Trash2 className="h-3.5 w-3.5" />
                清除
              </Button>
            ) : null}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                void handleFile(event.target.files?.[0])
                event.target.value = ''
              }}
            />
          </div>
          {background ? (
            <div className="overflow-hidden rounded-md border border-line">
              <img src={background} alt="背景预览" className="h-32 w-full object-cover" />
            </div>
          ) : (
            <p className="text-xs text-muted">
              支持本地上传或图片链接；背景应用于整个应用，任务卡片保持不透明。
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
