import type { Bookmark } from '../types'

export type ImportSummary = {
  bookmarks: Bookmark[]
  categoryCount: number
}

const FALLBACK_TAG = 'imported'

/**
 * Parse a Netscape-style bookmark HTML export (Chrome/Safari/Firefox)
 * into Bokmark's JSON bookmark shape.
 */
export function parseNetscapeBookmarks(html: string): ImportSummary {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const root = doc.querySelector('dl')
  if (!root) {
    throw new Error('Not a valid bookmark export (missing bookmark list).')
  }

  const collected: Bookmark[] = []
  const seenUrls = new Set<string>()

  walkDl(root, [], collected, seenUrls)

  if (collected.length === 0) {
    throw new Error('No bookmarks found in that file.')
  }

  const categories = new Set<string>()
  for (const b of collected) {
    for (const tag of b.tags) categories.add(tag)
  }

  return {
    bookmarks: collected,
    categoryCount: categories.size,
  }
}

function walkDl(
  dl: Element,
  folderStack: string[],
  out: Bookmark[],
  seenUrls: Set<string>,
): void {
  for (const child of Array.from(dl.children)) {
    if (child.tagName !== 'DT') continue

    const heading = child.querySelector(':scope > h3')
    const link = child.querySelector(':scope > a')
    const nested =
      child.querySelector(':scope > dl') ??
      (child.nextElementSibling?.tagName === 'DL'
        ? child.nextElementSibling
        : null)

    if (heading) {
      const name = normalizeTag(heading.textContent ?? '')
      const nextStack = name ? [...folderStack, name] : folderStack
      if (nested) walkDl(nested, nextStack, out, seenUrls)
      continue
    }

    if (link) {
      const href = link.getAttribute('href')?.trim() ?? ''
      if (!href || href.startsWith('javascript:') || href.startsWith('data:')) {
        continue
      }
      if (seenUrls.has(href)) continue
      seenUrls.add(href)

      const title = (link.textContent ?? '').trim() || href
      const addDate = link.getAttribute('add_date')
      const leaf = folderStack[folderStack.length - 1]
      const tag = leaf || FALLBACK_TAG

      out.push({
        url: href,
        title,
        tags: [tag],
        date_added: unixToIso(addDate),
        description: '',
      })
    }
  }
}

function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ')
}

function unixToIso(raw: string | null): string {
  if (!raw) return nowIso()
  const seconds = Number(raw)
  if (!Number.isFinite(seconds) || seconds <= 0) return nowIso()
  // Some exports use milliseconds
  const ms = seconds > 1e12 ? seconds : seconds * 1000
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
}

export function pickHtmlBookmarkFile(): Promise<File> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.html,.htm,text/html'
    input.style.display = 'none'
    document.body.appendChild(input)

    const cleanup = () => input.remove()

    input.addEventListener('change', () => {
      const file = input.files?.[0]
      cleanup()
      if (!file) {
        reject(new DOMException('The user aborted a request.', 'AbortError'))
        return
      }
      resolve(file)
    })

    input.addEventListener('cancel', () => {
      cleanup()
      reject(new DOMException('The user aborted a request.', 'AbortError'))
    })

    input.click()
  })
}
