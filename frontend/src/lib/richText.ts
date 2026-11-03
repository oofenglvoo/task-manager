const BLOCK_TAGS = new Set([
  'P',
  'DIV',
  'LI',
  'UL',
  'OL',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'BLOCKQUOTE',
  'PRE',
  'TR',
])

export function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 把旧版本保存的纯文本描述转换成可编辑、可展示的 HTML。 */
export function normalizeDescription(value: string | null | undefined): string {
  if (!value) return ''
  if (looksLikeHtml(value)) return value
  return escapeHtml(value.replace(/\r\n?/g, '\n')).replace(/\n/g, '<br>')
}

// 把富文本 HTML 转成用于卡片/列表/tooltip 展示与搜索的纯文本。
export function htmlToText(html: string | null | undefined): string {
  if (!html) return ''
  if (!looksLikeHtml(html)) return html.trim()
  const doc = new DOMParser().parseFromString(html, 'text/html')

  doc.querySelectorAll('br').forEach((node) => node.replaceWith('\n'))

  const walk = (node: Node): string => {
    let text = ''
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent ?? ''
        return
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return
      const element = child as Element
      const inner = walk(element)
      const tag = element.tagName.toUpperCase()
      if (tag === 'IMG') {
        text += element.getAttribute('alt') || '[图片]'
        return
      }
      if (BLOCK_TAGS.has(tag)) {
        text += `${inner}\n`
        return
      }
      text += inner
    })
    return text
  }

  return walk(doc.body)
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
}

export function hasRichContent(html: string | null | undefined): boolean {
  if (!html) return false
  if (/<img\b/i.test(html)) return true
  return htmlToText(html).length > 0
}
