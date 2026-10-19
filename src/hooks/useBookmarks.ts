import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  downloadBookmarksJson,
  openBookmarksFile,
  restoreBookmarksFile,
  resumeBookmarksFile,
  supportsFileSystemAccess,
  writeBookmarks,
  type StorageMode,
} from '../lib/file'
import {
  loadTagTouched,
  saveTagTouched,
} from '../lib/tagSort'
import type { Bookmark, BookmarkDraft } from '../types'

export type TagStat = {
  tag: string
  count: number
  lastActivity: number
}

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function toTime(iso: string): number {
  const value = Date.parse(iso)
  return Number.isFinite(value) ? value : 0
}

export function useBookmarks() {
  const [mode, setMode] = useState<StorageMode | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [handle, setHandle] = useState<FileSystemFileHandle | null>(null)
  const [pendingHandle, setPendingHandle] =
    useState<FileSystemFileHandle | null>(null)
  const [pendingFileName, setPendingFileName] = useState<string | null>(null)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [tagTouched, setTagTouched] = useState<Record<string, number>>(() =>
    loadTagTouched(),
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isOpen = mode !== null && fileName !== null
  const canNativeWrite = supportsFileSystemAccess()
  const needsReconnect = pendingHandle !== null && !isOpen

  const touchTags = useCallback((tags: string[]) => {
    if (tags.length === 0) return
    const now = Date.now()
    setTagTouched((prev) => {
      const next = { ...prev }
      for (const tag of tags) {
        next[tag] = now
      }
      saveTagTouched(next)
      return next
    })
  }, [])

  useEffect(() => {
    let cancelled = false

    async function restore() {
      try {
        const restored = await restoreBookmarksFile()
        if (cancelled) return
        if (restored.status === 'opened') {
          setMode(restored.data.mode)
          setFileName(restored.data.fileName)
          setHandle(restored.data.handle)
          setBookmarks(restored.data.bookmarks)
          setPendingHandle(null)
          setPendingFileName(null)
        } else if (restored.status === 'needs-gesture') {
          setPendingHandle(restored.handle)
          setPendingFileName(restored.fileName)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to restore file')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void restore()
    return () => {
      cancelled = true
    }
  }, [])

  const persist = useCallback(
    async (next: Bookmark[]) => {
      if (!mode || !fileName) return
      setSaving(true)
      setError(null)
      try {
        await writeBookmarks({ mode, fileName, handle }, next)
        setBookmarks(next)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save')
        throw err
      } finally {
        setSaving(false)
      }
    },
    [mode, fileName, handle],
  )

  const openFile = useCallback(async () => {
    setError(null)
    try {
      const result = await openBookmarksFile()
      setMode(result.mode)
      setFileName(result.fileName)
      setHandle(result.handle)
      setBookmarks(result.bookmarks)
      setPendingHandle(null)
      setPendingFileName(null)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Failed to open file')
    }
  }, [])

  const resumeFile = useCallback(async () => {
    if (!pendingHandle) return
    setError(null)
    try {
      const result = await resumeBookmarksFile(pendingHandle)
      if (!result) {
        setError('Permission denied. Choose the file again.')
        return
      }
      setMode(result.mode)
      setFileName(result.fileName)
      setHandle(result.handle)
      setBookmarks(result.bookmarks)
      setPendingHandle(null)
      setPendingFileName(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume file')
    }
  }, [pendingHandle])

  const downloadFile = useCallback(() => {
    if (!fileName) return
    downloadBookmarksJson(fileName, bookmarks)
  }, [fileName, bookmarks])

  const addBookmark = useCallback(
    async (draft: BookmarkDraft) => {
      const tags = normalizeTags(draft.tags)
      const bookmark: Bookmark = {
        url: draft.url.trim(),
        title: draft.title.trim(),
        tags,
        date_added: nowIso(),
        description: draft.description.trim(),
      }
      touchTags(tags)
      await persist([bookmark, ...bookmarks])
    },
    [bookmarks, persist, touchTags],
  )

  const updateBookmark = useCallback(
    async (index: number, draft: BookmarkDraft) => {
      const previous = bookmarks[index]
      const tags = normalizeTags(draft.tags)
      const next = bookmarks.map((b, i) =>
        i === index
          ? {
              ...b,
              url: draft.url.trim(),
              title: draft.title.trim(),
              tags,
              description: draft.description.trim(),
              date_added: draft.date_added ?? b.date_added,
            }
          : b,
      )
      const changed = new Set([...(previous?.tags ?? []), ...tags])
      touchTags([...changed])
      await persist(next)
    },
    [bookmarks, persist, touchTags],
  )

  const deleteBookmark = useCallback(
    async (index: number) => {
      const removed = bookmarks[index]
      if (removed) touchTags(removed.tags)
      await persist(bookmarks.filter((_, i) => i !== index))
    },
    [bookmarks, persist, touchTags],
  )

  const renameTag = useCallback(
    async (from: string, to: string) => {
      const nextName = to.trim().toLowerCase()
      if (!nextName || nextName === from) return
      const next = bookmarks.map((b) => ({
        ...b,
        tags: normalizeTags(b.tags.map((t) => (t === from ? nextName : t))),
      }))
      setTagTouched((prev) => {
        const nextTouched = { ...prev }
        const previous = nextTouched[from] ?? Date.now()
        delete nextTouched[from]
        nextTouched[nextName] = Math.max(previous, Date.now())
        saveTagTouched(nextTouched)
        return nextTouched
      })
      await persist(next)
    },
    [bookmarks, persist],
  )

  const deleteTag = useCallback(
    async (
      tag: string,
      options: { moveTo?: string | null; deleteBookmarks?: boolean } = {},
    ) => {
      const deleteBookmarks = options.deleteBookmarks === true
      const target = options.moveTo?.trim().toLowerCase() || null

      const next = deleteBookmarks
        ? bookmarks.filter((b) => !b.tags.includes(tag))
        : bookmarks.map((b) => {
            if (!b.tags.includes(tag)) return b
            const without = b.tags.filter((t) => t !== tag)
            if (target) without.push(target)
            return { ...b, tags: normalizeTags(without) }
          })

      setTagTouched((prev) => {
        const nextTouched = { ...prev }
        delete nextTouched[tag]
        if (target) nextTouched[target] = Date.now()
        saveTagTouched(nextTouched)
        return nextTouched
      })
      await persist(next)
    },
    [bookmarks, persist],
  )

  const tagStats = useMemo((): TagStat[] => {
    const counts = new Map<string, number>()
    const latestFromBookmarks = new Map<string, number>()

    for (const b of bookmarks) {
      const added = toTime(b.date_added)
      for (const tag of b.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1)
        latestFromBookmarks.set(
          tag,
          Math.max(latestFromBookmarks.get(tag) ?? 0, added),
        )
      }
    }

    return [...counts.entries()].map(([tag, count]) => ({
      tag,
      count,
      lastActivity: Math.max(
        latestFromBookmarks.get(tag) ?? 0,
        tagTouched[tag] ?? 0,
      ),
    }))
  }, [bookmarks, tagTouched])

  const tagCounts = useMemo(
    (): [string, number][] => tagStats.map((t) => [t.tag, t.count]),
    [tagStats],
  )

  return {
    isOpen,
    mode,
    fileName,
    bookmarks,
    loading,
    saving,
    error,
    canNativeWrite,
    needsReconnect,
    pendingFileName,
    openFile,
    resumeFile,
    downloadFile,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    renameTag,
    deleteTag,
    tagStats,
    tagCounts,
  }
}

function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of tags) {
    const tag = raw.trim().toLowerCase()
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    result.push(tag)
  }
  return result
}
