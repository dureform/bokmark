import type { Bookmark } from '../types'
import { loadFileHandle, saveFileHandle } from './idb'

const FALLBACK_STORAGE_KEY = 'bokmark-fallback-data'

export type StorageMode = 'native' | 'fallback'

export interface OpenedBookmarks {
  mode: StorageMode
  fileName: string
  handle: FileSystemFileHandle | null
  bookmarks: Bookmark[]
}

export type RestoreResult =
  | { status: 'opened'; data: OpenedBookmarks }
  | {
      status: 'needs-gesture'
      handle: FileSystemFileHandle
      fileName: string
    }
  | { status: 'none' }

export function supportsFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window
}

/** Read-only check — safe to call without a user gesture. */
export async function hasPermission(
  handle: FileSystemFileHandle,
  mode: 'read' | 'readwrite' = 'readwrite',
): Promise<boolean> {
  return (await handle.queryPermission({ mode })) === 'granted'
}

/**
 * May show a permission prompt. Must be called from a user gesture
 * (click, keypress, etc.).
 */
export async function ensurePermission(
  handle: FileSystemFileHandle,
  mode: 'read' | 'readwrite' = 'readwrite',
): Promise<boolean> {
  const opts = { mode }
  if ((await handle.queryPermission(opts)) === 'granted') return true
  try {
    return (await handle.requestPermission(opts)) === 'granted'
  } catch {
    // Throws if called without user activation
    return false
  }
}

export async function openBookmarksFile(): Promise<OpenedBookmarks> {
  if (supportsFileSystemAccess()) {
    return openWithFilePicker()
  }
  return openWithInputFallback()
}

async function openWithFilePicker(): Promise<OpenedBookmarks> {
  const [handle] = await window.showOpenFilePicker({
    types: [
      {
        description: 'JSON bookmarks',
        accept: { 'application/json': ['.json'] },
      },
    ],
    multiple: false,
  })

  const bookmarks = await readBookmarksFromHandle(handle)
  await saveFileHandle(handle)
  clearFallbackStorage()

  return {
    mode: 'native',
    fileName: handle.name,
    handle,
    bookmarks,
  }
}

function openWithInputFallback(): Promise<OpenedBookmarks> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.style.display = 'none'
    document.body.appendChild(input)

    const cleanup = () => {
      input.remove()
    }

    input.addEventListener('change', () => {
      const file = input.files?.[0]
      cleanup()
      if (!file) {
        reject(new DOMException('The user aborted a request.', 'AbortError'))
        return
      }
      void file
        .text()
        .then((text) => {
          const bookmarks = parseBookmarksJson(text)
          const opened: OpenedBookmarks = {
            mode: 'fallback',
            fileName: file.name,
            handle: null,
            bookmarks,
          }
          saveFallbackStorage(opened.fileName, bookmarks)
          resolve(opened)
        })
        .catch(reject)
    })

    input.addEventListener('cancel', () => {
      cleanup()
      reject(new DOMException('The user aborted a request.', 'AbortError'))
    })

    input.click()
  })
}

export async function restoreBookmarksFile(): Promise<RestoreResult> {
  if (supportsFileSystemAccess()) {
    const handle = await loadFileHandle()
    if (handle) {
      // Never call requestPermission here — page load is not a user gesture.
      if (await hasPermission(handle, 'readwrite')) {
        const bookmarks = await readBookmarksFromHandle(handle)
        return {
          status: 'opened',
          data: {
            mode: 'native',
            fileName: handle.name,
            handle,
            bookmarks,
          },
        }
      }
      return {
        status: 'needs-gesture',
        handle,
        fileName: handle.name,
      }
    }
  }

  const fallback = loadFallbackStorage()
  return fallback
    ? { status: 'opened', data: fallback }
    : { status: 'none' }
}

/** Call from a click handler to finish restoring a remembered file handle. */
export async function resumeBookmarksFile(
  handle: FileSystemFileHandle,
): Promise<OpenedBookmarks | null> {
  const allowed = await ensurePermission(handle, 'readwrite')
  if (!allowed) return null

  const bookmarks = await readBookmarksFromHandle(handle)
  await saveFileHandle(handle)
  return {
    mode: 'native',
    fileName: handle.name,
    handle,
    bookmarks,
  }
}

export async function writeBookmarks(
  opened: Pick<OpenedBookmarks, 'mode' | 'fileName' | 'handle'>,
  bookmarks: Bookmark[],
): Promise<void> {
  if (opened.mode === 'native' && opened.handle) {
    const allowed = await ensurePermission(opened.handle, 'readwrite')
    if (!allowed) {
      throw new Error('Write permission denied for bookmarks.json')
    }
    const writable = await opened.handle.createWritable()
    await writable.write(serializeBookmarks(bookmarks))
    await writable.close()
    return
  }

  saveFallbackStorage(opened.fileName, bookmarks)
  downloadBookmarksJson(opened.fileName, bookmarks)
}

export function downloadBookmarksJson(
  fileName: string,
  bookmarks: Bookmark[],
): void {
  const blob = new Blob([serializeBookmarks(bookmarks)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName || 'bookmarks.json'
  anchor.click()
  URL.revokeObjectURL(url)
}

export function serializeBookmarks(bookmarks: Bookmark[]): string {
  return JSON.stringify(bookmarks, null, 2) + '\n'
}

async function readBookmarksFromHandle(
  handle: FileSystemFileHandle,
): Promise<Bookmark[]> {
  const file = await handle.getFile()
  return parseBookmarksJson(await file.text())
}

function parseBookmarksJson(text: string): Bookmark[] {
  if (!text.trim()) return []

  const data = JSON.parse(text) as unknown
  if (!Array.isArray(data)) {
    throw new Error('bookmarks.json must be a JSON array')
  }

  return data.map(normalizeBookmark)
}

function normalizeBookmark(raw: unknown): Bookmark {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid bookmark entry')
  }

  const item = raw as Record<string, unknown>
  const tags = Array.isArray(item.tags)
    ? item.tags.filter((t): t is string => typeof t === 'string')
    : []

  return {
    url: String(item.url ?? ''),
    title: String(item.title ?? ''),
    tags,
    date_added:
      typeof item.date_added === 'string'
        ? item.date_added
        : new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    description: String(item.description ?? ''),
  }
}

function saveFallbackStorage(fileName: string, bookmarks: Bookmark[]): void {
  localStorage.setItem(
    FALLBACK_STORAGE_KEY,
    JSON.stringify({ fileName, bookmarks }),
  )
}

function loadFallbackStorage(): OpenedBookmarks | null {
  const raw = localStorage.getItem(FALLBACK_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as {
      fileName?: string
      bookmarks?: unknown
    }
    if (!Array.isArray(parsed.bookmarks)) return null
    return {
      mode: 'fallback',
      fileName: parsed.fileName || 'bookmarks.json',
      handle: null,
      bookmarks: parsed.bookmarks.map(normalizeBookmark),
    }
  } catch {
    return null
  }
}

function clearFallbackStorage(): void {
  localStorage.removeItem(FALLBACK_STORAGE_KEY)
}
