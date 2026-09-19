import { useRef, useState } from 'react'
import { ImagePlus, Link2, Trash2 } from 'lucide-react'
import { api, errorMessage } from '../../lib/api'
import { fileToUploadBlob } from '../../lib/image'
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

const COMPACT_OPTIONS: Array<{ value: 'off' | 'on'; label: string }> = [
  { value: 'off', label: '宽松' },
  { value: 'on', label: '紧凑' },
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

function OpacitySlider({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm text-ink-soft">{label}</span>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-1.5 w-40 cursor-pointer appearance-none rounded-full bg-line-strong accent-accent"
        />
        <span className="w-10 text-right text-xs tabular-nums text-muted">
          {Math.round(value * 100)}%
        </span>
      </div>
    </div>
  )
}

export function AppearanceSettings() {
  const {
    theme,
    cardSize,
    compact,
    background,
    bgOpacity,
    cardOpacity,
    panelOpacity,
    setTheme,
    setCardSize,
    setCompact,
    setBackground,
    setBgOpacity,
    setCardOpacity,
    setPanelOpacity,
  } = usePreferences()
  const { push } = useToast()
  const [url, setUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setUploading(true)
    try {
      const blob = await fileToUploadBlob(file)
      const { url: uploaded } = await api.backgrounds.upload(blob, file.name)
      setBackground(uploaded)
      push('背景已更新', 'success')
    } catch (error) {
      push(errorMessage(error), 'error')
    } finally {
      setUploading(false)
    }
  }

  function applyUrl() {
    const value = url.trim()
    if (!value) return
    setBackground(value)
    setUrl('')
    push('背景已更新', 'success')
  }

  function clearBackground() {
    const current = background
    setBackground(null)
    if (current && current.startsWith('/api/backgrounds/')) {
      void api.backgrounds.remove(current).catch(() => {})
    }
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

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-ink-soft">显示密度</span>
          <Segmented
            value={compact ? 'on' : 'off'}
            options={COMPACT_OPTIONS}
            onChange={(value) => setCompact(value === 'on')}
          />
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
            <Button
              size="sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="h-3.5 w-3.5" />
              {uploading ? '上传中…' : '上传图片'}
            </Button>
            {background ? (
              <Button size="sm" variant="danger" onClick={clearBackground}>
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
              本地上传的图片会保存到后端（data/backgrounds/），偏好同步到后端；也可直接填图片链接。
            </p>
          )}
        </div>

        <div className="space-y-3 border-t border-line pt-4">
          <span className="text-sm text-ink-soft">透明度</span>
          <OpacitySlider
            label="背景遮罩"
            value={bgOpacity}
            onChange={setBgOpacity}
          />
          <OpacitySlider label="卡片" value={cardOpacity} onChange={setCardOpacity} />
          <OpacitySlider label="面板" value={panelOpacity} onChange={setPanelOpacity} />
          <p className="text-xs text-muted">
            背景遮罩越深、卡片与面板越不透明。仅在设置背景图片后遮罩才可见。
          </p>
        </div>
      </div>
    </section>
  )
}
