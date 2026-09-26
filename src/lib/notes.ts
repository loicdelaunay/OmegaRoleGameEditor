export function renderNoteHtml(note: string) {
  const sanitized = sanitizeRichTextNote(note)
  return noteHasVisibleContent(sanitized) ? sanitized : ''
}

export function sanitizeRichTextNote(note: string) {
  const trimmedNote = note.trim()
  if (!trimmedNote) {
    return ''
  }

  if (!/[<][a-z!/]/i.test(trimmedNote)) {
    return escapeHtml(decodeHtmlEntities(trimmedNote)).replace(/\n/g, '<br>')
  }

  if (typeof window === 'undefined') {
    return trimmedNote
  }

  const parser = new DOMParser()
  const documentFragment = parser.parseFromString(`<div>${trimmedNote}</div>`, 'text/html')
  const container = documentFragment.body.firstElementChild
  if (!container) {
    return ''
  }

  return Array.from(container.childNodes)
    .map((node) => sanitizeRichTextNode(node))
    .join('')
    .trim()
}

export function sanitizeRichTextNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeHtml(node.textContent ?? '').replace(/\n/g, '<br>')
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return ''
  }

  const element = node as HTMLElement
  const tagName = element.tagName.toLowerCase()
  const children = Array.from(element.childNodes)
    .map((child) => sanitizeRichTextNode(child))
    .join('')

  if (tagName === 'br') {
    return '<br>'
  }

  if (tagName === 'b' || tagName === 'strong') {
    return `<strong>${children}</strong>`
  }

  if (tagName === 'i' || tagName === 'em') {
    return `<em>${children}</em>`
  }

  if (tagName === 'font' || tagName === 'span') {
    const rawColor = element.style.color || element.getAttribute('color') || ''
    const color = sanitizeNoteColor(rawColor)
    return color ? `<span style="color: ${color};">${children}</span>` : children
  }

  if (tagName === 'div' || tagName === 'p') {
    return `<p>${children || '<br>'}</p>`
  }

  if (tagName === 'ul' || tagName === 'ol') {
    return `<${tagName}>${children}</${tagName}>`
  }

  if (tagName === 'li') {
    return `<li>${children || '<br>'}</li>`
  }

  return children
}

export function sanitizeNoteColor(value: string) {
  const color = value.trim()
  if (/^#[0-9a-f]{3,8}$/i.test(color)) {
    return color
  }

  if (/^rgba?\((?:\s*\d+\s*,){2,3}\s*(?:\d+|0?\.\d+)\s*\)$/i.test(color)) {
    return color
  }

  if (/^hsla?\((?:\s*[-\d.]+\s*,){2}\s*[-\d.%]+\s*(?:,\s*(?:\d+|0?\.\d+)\s*)?\)$/i.test(color)) {
    return color
  }

  return ''
}

export function noteHasVisibleContent(note: string) {
  return stripNoteMarkup(note).trim().length > 0
}

export function stripNoteMarkup(note: string) {
  return note.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ')
}

export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

export function decodeHtmlEntities(value: string) {
  if (typeof window === 'undefined' || !value.includes('&')) {
    return value
  }

  const textarea = document.createElement('textarea')
  textarea.innerHTML = value
  return textarea.value
}
