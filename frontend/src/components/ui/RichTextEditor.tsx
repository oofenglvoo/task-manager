import { useEffect, useRef } from 'react'
import {
  Bold,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Paintbrush,
  Strikethrough,
  Underline,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useToast } from '../../store/toast'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
}

const FONT_SIZES: Array<{ value: string; label: string }> = [
  { value: '2', label: '小' },
  { value: '3', label: '正常' },
  { value: '4', label: '大' },
  { value: '5', label: '特大' },
]

export function RichTextEditor({
  value,
  onChange,
  placeholder = '补充说明…',
  minHeight = 160,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const colorRef = useRef<HTMLInputElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const { push } = useToast()

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    if (document.activeElement === editor) return
    if (editor.innerHTML === value) return
    editor.innerHTML = value
  }, [value])

  function emit() {
    const editor = editorRef.current
    if (!editor) return
    onChange(editor.innerHTML)
  }

  function exec(command: string, argument?: string) {
    editorRef.current?.focus()
    // execCommand 已废弃但无替代方案的简单实现；浏览器仍普遍支持。
    document.execCommand(command, false, argument)
    emit()
  }

  function insertImage(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        exec('insertImage', result)
      }
    }
    reader.onerror = () => push('图片读取失败', 'error')
    reader.readAsDataURL(file)
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const items = event.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          event.preventDefault()
          insertImage(file)
          return
        }
      }
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    const file = event.dataTransfer?.files?.[0]
    if (file && file.type.startsWith('image/')) {
      event.preventDefault()
      insertImage(file)
    }
  }

  const toolbarButton =
    'inline-flex h-7 w-7 items-center justify-center rounded border border-line bg-surface text-ink-soft transition-colors hover:bg-elevated hover:text-ink'

  return (
    <div className="overflow-hidden rounded border border-line bg-canvas focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/50">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line px-1.5 py-1">
        <button
          type="button"
          title="加粗"
          className={toolbarButton}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => exec('bold')}
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="斜体"
          className={toolbarButton}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => exec('italic')}
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="下划线"
          className={toolbarButton}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => exec('underline')}
        >
          <Underline className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="删除线"
          className={toolbarButton}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => exec('strikeThrough')}
        >
          <Strikethrough className="h-4 w-4" />
        </button>

        <span className="mx-0.5 h-4 w-px bg-line" />

        <select
          aria-label="字号"
          defaultValue=""
          className="h-7 rounded border border-line bg-canvas px-1 text-xs text-ink-soft focus:outline-none"
          onMouseDown={(event) => event.stopPropagation()}
          onChange={(event) => {
            if (event.target.value) exec('fontSize', event.target.value)
            event.target.value = ''
          }}
        >
          <option value="">字号</option>
          {FONT_SIZES.map((size) => (
            <option key={size.value} value={size.value}>
              {size.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          title="字体颜色"
          className={toolbarButton}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => colorRef.current?.click()}
        >
          <Paintbrush className="h-4 w-4" />
        </button>
        <input
          ref={colorRef}
          type="color"
          className="hidden"
          onChange={(event) => exec('foreColor', event.target.value)}
        />

        <span className="mx-0.5 h-4 w-px bg-line" />

        <button
          type="button"
          title="无序列表"
          className={toolbarButton}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => exec('insertUnorderedList')}
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="有序列表"
          className={toolbarButton}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => exec('insertOrderedList')}
        >
          <ListOrdered className="h-4 w-4" />
        </button>

        <span className="mx-0.5 h-4 w-px bg-line" />

        <button
          type="button"
          title="插入图片"
          className={toolbarButton}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) insertImage(file)
            event.target.value = ''
          }}
        />
        <button
          type="button"
          title="清除格式"
          className={toolbarButton}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => exec('removeFormat')}
        >
          <span className="text-xs font-medium">清除</span>
        </button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        onPaste={handlePaste}
        onDrop={handleDrop}
        style={{ minHeight }}
        className={cn(
          'rich-editor px-3 py-2 text-sm leading-relaxed text-ink outline-none',
          'empty:before:pointer-events-none empty:before:text-muted empty:before:content-[attr(data-placeholder)]',
        )}
      />
    </div>
  )
}
