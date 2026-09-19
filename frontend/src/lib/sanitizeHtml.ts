// 富文本描述的净化：卡片/历史时间线直接用 innerHTML 渲染，必须先过滤不可信 HTML。
// 仅保留编辑器可产生的安全标签与属性，移除图片、脚本、事件处理器等。

const ALLOWED_TAGS = new Set([
  'B',
  'STRONG',
  'I',
  'EM',
  'U',
  'S',
  'STRIKE',
  'DEL',
  'SPAN',
  'DIV',
  'P',
  'BR',
  'UL',
  'OL',
  'LI',
  'FONT',
  'MARK',
  'SUB',
  'SUP',
  'A',
])

// 允许保留的 style 属性（其余丢弃，防止 url()/expression 等）。
const ALLOWED_STYLE_PROPS = new Set([
  'color',
  'background-color',
  'font-size',
  'font-weight',
  'font-style',
  'text-decoration',
])

const ALLOWED_HREF = /^(https?:|mailto:)/i

function sanitizeStyle(value: string): string {
  return value
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const index = part.indexOf(':')
      if (index < 0) return ''
      const prop = part.slice(0, index).trim().toLowerCase()
      const val = part.slice(index + 1).trim()
      if (!ALLOWED_STYLE_PROPS.has(prop)) return ''
      if (/url\s*\(|expression|javascript:/i.test(val)) return ''
      return `${prop}: ${val}`
    })
    .filter(Boolean)
    .join('; ')
}

export interface SanitizeOptions {
  allowImages?: boolean
}

export function sanitizeDescription(
  html: string | null | undefined,
  options: SanitizeOptions = {},
): string {
  if (!html) return ''
  if (typeof DOMParser === 'undefined') return html
  const { allowImages = false } = options

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstElementChild
  if (!root) return ''

  const clean = (node: Element) => {
    for (const child of Array.from(node.children)) {
      const tag = child.tagName.toUpperCase()

      if (tag === 'IMG') {
        if (allowImages && child.getAttribute('src')) {
          const img = doc.createElement('img')
          const src = child.getAttribute('src') ?? ''
          if (/^(data:image\/|https?:)/i.test(src)) {
            img.setAttribute('src', src)
            if (child.getAttribute('alt')) {
              img.setAttribute('alt', child.getAttribute('alt') ?? '')
            }
            child.replaceWith(img)
          } else {
            child.remove()
          }
        } else {
          child.remove()
        }
        continue
      }

      if (!ALLOWED_TAGS.has(tag)) {
        // 不在白名单：先净化其后代，再保留子内容（去掉标签本身）。
        clean(child)
        const fragment = doc.createDocumentFragment()
        while (child.firstChild) fragment.appendChild(child.firstChild)
        child.replaceWith(fragment)
        continue
      }

      for (const attr of Array.from(child.attributes)) {
        const name = attr.name.toLowerCase()
        let keep = false
        if (tag === 'FONT' && (name === 'color' || name === 'size')) keep = true
        else if (tag === 'A' && name === 'href') {
          keep = ALLOWED_HREF.test(attr.value)
        } else if (name === 'style') {
          const style = sanitizeStyle(attr.value)
          if (style) child.setAttribute('style', style)
          else child.removeAttribute(name)
          continue
        }
        if (!keep) child.removeAttribute(attr.name)
      }

      clean(child)
    }
  }

  clean(root)
  return root.innerHTML
}
