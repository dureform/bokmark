import { useMemo, useState } from 'react'
import type { TagStat } from '../hooks/useBookmarks'
import {
  loadTagSort,
  saveTagSort,
  type TagSort,
} from '../lib/tagSort'

interface CategorySidebarProps {
  totalCount: number
  tagStats: TagStat[]
  activeTag: string | null
  onSelect: (tag: string | null) => void
  onRename: (from: string, to: string) => Promise<void>
  onRequestDelete: (tag: string) => void
}

function PencilIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  )
}

function sortTags(stats: TagStat[], sort: TagSort): TagStat[] {
  const items = [...stats]
  if (sort === 'alpha') {
    return items.sort((a, b) => a.tag.localeCompare(b.tag))
  }
  if (sort === 'recent') {
    return items.sort((a, b) => {
      if (b.lastActivity !== a.lastActivity) {
        return b.lastActivity - a.lastActivity
      }
      return a.tag.localeCompare(b.tag)
    })
  }
  return items.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return a.tag.localeCompare(b.tag)
  })
}

export function CategorySidebar({
  totalCount,
  tagStats,
  activeTag,
  onSelect,
  onRename,
  onRequestDelete,
}: CategorySidebarProps) {
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [sort, setSort] = useState<TagSort>(() => loadTagSort())

  const sortedTags = useMemo(() => sortTags(tagStats, sort), [tagStats, sort])

  function changeSort(next: TagSort) {
    setSort(next)
    saveTagSort(next)
  }

  async function commitRename(from: string) {
    if (!draft.trim()) return
    setBusy(true)
    try {
      await onRename(from, draft)
      setEditing(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <aside className="flex max-h-56 w-full flex-col lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:w-80 lg:shrink-0">
      <div className="mb-3 shrink-0 space-y-2 border-b border-line px-2 pb-3">
        <p className="text-xs tracking-[0.16em] text-ink-faint uppercase">
          Categories
        </p>
        <label className="relative block">
          <span className="sr-only">Sort categories</span>
          <select
            value={sort}
            onChange={(e) => changeSort(e.target.value as TagSort)}
            className="w-full appearance-none rounded-lg border border-line bg-surface-raised py-1.5 pr-8 pl-2.5 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="count">Most bookmarks</option>
            <option value="recent">Recently updated</option>
            <option value="alpha">A–Z</option>
          </select>
          <svg
            className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-ink-muted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </label>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`flex w-full shrink-0 items-center gap-0.5 rounded-xl py-2.5 text-left text-sm transition-colors ${
            activeTag === null
              ? 'bg-accent text-surface-raised dark:text-surface'
              : 'text-ink hover:bg-surface-raised'
          }`}
        >
          <span className="min-w-0 flex-1 truncate px-3 font-medium">All</span>
          <span className="w-[52px] shrink-0" aria-hidden="true" />
          <span
            className={`shrink-0 pr-3 tabular-nums ${
              activeTag === null ? 'opacity-80' : 'text-ink-faint'
            }`}
          >
            {totalCount}
          </span>
        </button>

        {sortedTags.length === 0 ? (
          <p className="px-3 py-4 text-sm text-ink-faint">No categories yet.</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {sortedTags.map(({ tag, count }) => (
              <li key={tag} className="group/item">
                {editing === tag ? (
                  <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface-raised p-2">
                    <input
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void commitRename(tag)
                        if (e.key === 'Escape') setEditing(null)
                      }}
                      className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void commitRename(tag)}
                        className="rounded-md px-1.5 py-0.5 text-xs text-accent hover:bg-accent-soft"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="rounded-md px-1.5 py-0.5 text-xs text-ink-muted hover:bg-surface hover:text-ink"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`flex items-center gap-0.5 rounded-xl ${
                      activeTag === tag
                        ? 'bg-accent text-surface-raised dark:text-surface'
                        : 'hover:bg-surface-raised'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(tag)}
                      className="min-w-0 flex-1 truncate px-3 py-2.5 text-left text-sm font-medium"
                    >
                      {tag}
                    </button>
                    <div
                      className={`flex w-[52px] shrink-0 justify-end gap-0.5 opacity-0 transition-opacity group-hover/item:opacity-100 focus-within:opacity-100 ${
                        activeTag === tag ? 'opacity-100' : ''
                      }`}
                    >
                      <button
                        type="button"
                        title="Rename"
                        aria-label={`Rename ${tag}`}
                        onClick={() => {
                          setEditing(tag)
                          setDraft(tag)
                        }}
                        className={`rounded-md p-1.5 ${
                          activeTag === tag
                            ? 'hover:bg-white/15'
                            : 'text-ink-muted hover:bg-surface hover:text-ink'
                        }`}
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        aria-label={`Delete ${tag}`}
                        onClick={() => onRequestDelete(tag)}
                        className={`rounded-md p-1.5 ${
                          activeTag === tag
                            ? 'hover:bg-white/15'
                            : 'text-ink-muted hover:bg-danger-soft hover:text-danger'
                        }`}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                    <span
                      className={`shrink-0 pr-3 tabular-nums text-sm ${
                        activeTag === tag ? 'opacity-80' : 'text-ink-faint'
                      }`}
                    >
                      {count}
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
