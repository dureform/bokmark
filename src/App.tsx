import { useMemo, useState } from 'react'
import { BookmarkForm } from './components/BookmarkForm'
import { BookmarkList } from './components/BookmarkList'
import { CategorySidebar } from './components/CategorySidebar'
import { DeleteCategoryDialog } from './components/DeleteCategoryDialog'
import { useBookmarks } from './hooks/useBookmarks'
import { useTheme } from './hooks/useTheme'
import type { Bookmark } from './types'

function ThemeIcon({ theme }: { theme: 'light' | 'dark' }) {
  if (theme === 'dark') {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>
    )
  }

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  )
}

export default function App() {
  const {
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
  } = useBookmarks()
  const { theme, toggle } = useTheme()

  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [deletingTag, setDeletingTag] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return bookmarks
      .map((bookmark, index) => ({ bookmark, index }))
      .filter(({ bookmark }) => {
        if (activeTag && !bookmark.tags.includes(activeTag)) return false
        if (!q) return true
        const haystack = [
          bookmark.title,
          bookmark.url,
          bookmark.description,
          ...bookmark.tags,
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      })
  }, [bookmarks, query, activeTag])

  const editing: Bookmark | null =
    editingIndex === null ? null : (bookmarks[editingIndex] ?? null)

  const deletingCount =
    deletingTag === null
      ? 0
      : (tagCounts.find(([tag]) => tag === deletingTag)?.[1] ?? 0)

  const soleTagCount =
    deletingTag === null
      ? 0
      : bookmarks.filter(
          (b) => b.tags.length === 1 && b.tags[0] === deletingTag,
        ).length

  const otherTags = tagCounts
    .map(([tag]) => tag)
    .filter((tag) => tag !== deletingTag)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-muted">
        Restoring bookmarks…
      </div>
    )
  }

  if (!isOpen) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
        <div>
          <p className="text-sm tracking-[0.2em] text-ink-faint uppercase">
            Local bookmarks
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Bokmark
          </h1>
          <p className="mx-auto mt-3 max-w-md text-ink-muted">
            Open a <code className="text-ink">bookmark.json</code> file on your
            machine. Edits write straight back — nothing leaves your computer.
          </p>
          {!canNativeWrite && (
            <p className="mx-auto mt-4 max-w-md rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">
              Your browser can’t write files directly (Safari/Firefox). Opening
              still works; each save downloads an updated JSON. For true
              in-place saving, use Chrome or Edge.
            </p>
          )}
        </div>
        <div className="flex flex-col items-center gap-3">
          {needsReconnect && (
            <button
              type="button"
              onClick={() => void resumeFile()}
              className="rounded-2xl bg-accent px-6 py-3.5 text-base font-medium text-surface-raised hover:bg-accent-hover dark:text-surface"
            >
              Continue with {pendingFileName}
            </button>
          )}
          <button
            type="button"
            onClick={() => void openFile()}
            className={
              needsReconnect
                ? 'rounded-2xl border border-line px-6 py-3.5 text-base text-ink-muted hover:border-ink-faint hover:bg-surface-raised hover:text-ink'
                : 'rounded-2xl bg-accent px-6 py-3.5 text-base font-medium text-surface-raised hover:bg-accent-hover dark:text-surface'
            }
          >
            {needsReconnect ? 'Choose a different file' : 'Open bookmark.json'}
          </button>
        </div>
        {error && (
          <p className="max-w-md text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={toggle}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="rounded-xl p-2 text-ink-faint hover:bg-surface-raised hover:text-ink"
        >
          <ThemeIcon theme={theme} />
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-4xl flex-wrap items-end justify-between gap-4 px-6 py-8 lg:max-w-5xl">
          <div>
            <p className="text-sm tracking-[0.2em] text-ink-faint uppercase">
              bokmark
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {bookmarks.length} bookmark{bookmarks.length === 1 ? '' : 's'}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              <span className="text-ink-faint">Current file:</span>{' '}
              <span className="text-ink">{fileName}</span>
              {mode === 'fallback' ? ' · download mode' : ''}
              {saving ? ' · Saving…' : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void openFile()}
              className="rounded-xl border border-line px-3.5 py-2 text-sm text-ink-muted hover:border-ink-faint hover:bg-surface hover:text-ink"
            >
              Switch file
            </button>
            {mode === 'fallback' && (
              <button
                type="button"
                onClick={downloadFile}
                className="rounded-xl border border-line px-3.5 py-2 text-sm text-ink-muted hover:border-ink-faint hover:bg-surface hover:text-ink"
              >
                Download
              </button>
            )}
            <button
              type="button"
              onClick={toggle}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="rounded-xl border border-line p-2 text-ink-muted hover:border-ink-faint hover:bg-surface hover:text-ink"
            >
              <ThemeIcon theme={theme} />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingIndex(null)
                setFormOpen(true)
              }}
              className="rounded-xl bg-accent px-3.5 py-2 text-sm font-medium text-surface-raised hover:bg-accent-hover dark:text-surface"
            >
              Add bookmark
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-8 lg:flex-row lg:items-start lg:justify-between">
        <CategorySidebar
          totalCount={bookmarks.length}
          tagStats={tagStats}
          activeTag={activeTag}
          onSelect={setActiveTag}
          onRename={async (from, to) => {
            await renameTag(from, to)
            if (activeTag === from) setActiveTag(to.trim().toLowerCase())
          }}
          onRequestDelete={setDeletingTag}
        />

        <main className="min-w-0 w-full lg:max-w-xl lg:flex-1">
          {mode === 'fallback' && (
            <p className="mb-6 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">
              This browser can’t overwrite the file in place. Changes are kept
              locally and a fresh <code>bookmarks.json</code> is downloaded on
              each save. Prefer Chrome or Edge for direct file writing.
            </p>
          )}

          {error && (
            <p
              className="mb-6 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger"
              role="alert"
            >
              {error}
            </p>
          )}

          <div className="relative mb-6">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, URL, tags, description…"
              className="w-full rounded-2xl border border-line bg-surface-raised py-3.5 pr-12 pl-4 outline-none focus:border-accent"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                title="Clear search"
                aria-label="Clear search"
                className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-1.5 text-ink-faint hover:bg-surface hover:text-ink"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            )}
          </div>

          <BookmarkList
            items={filtered}
            onEdit={(index) => {
              setEditingIndex(index)
              setFormOpen(true)
            }}
            onDelete={(index) => void deleteBookmark(index)}
            onTagClick={(tag) => setActiveTag(tag)}
          />
        </main>
      </div>

      <BookmarkForm
        open={formOpen}
        initial={editing}
        onClose={() => {
          setFormOpen(false)
          setEditingIndex(null)
        }}
        onSubmit={async (draft) => {
          if (editingIndex === null) {
            await addBookmark(draft)
          } else {
            await updateBookmark(editingIndex, draft)
          }
        }}
      />

      <DeleteCategoryDialog
        open={deletingTag !== null}
        tag={deletingTag}
        count={deletingCount}
        soleTagCount={soleTagCount}
        otherTags={otherTags}
        onClose={() => setDeletingTag(null)}
        onConfirm={async (result) => {
          if (!deletingTag) return
          if (result.action === 'move') {
            await deleteTag(deletingTag, { moveTo: result.moveTo })
            if (activeTag === deletingTag) setActiveTag(result.moveTo)
            return
          }
          if (result.action === 'deleteBookmarks') {
            await deleteTag(deletingTag, { deleteBookmarks: true })
          } else {
            await deleteTag(deletingTag)
          }
          if (activeTag === deletingTag) setActiveTag(null)
        }}
      />
    </div>
  )
}
