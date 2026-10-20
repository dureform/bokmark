import type { Bookmark } from '../types'

interface BookmarkListProps {
  items: { bookmark: Bookmark; index: number }[]
  onEdit: (index: number) => void
  onDelete: (index: number) => void
  onTagClick: (tag: string) => void
}

function openBookmark(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

function PencilIcon() {
  return (
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function TrashIcon() {
  return (
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
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  )
}

function formatDate(iso: string): string {
  const value = Date.parse(iso)
  if (!Number.isFinite(value)) return iso
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(value)
}

export function BookmarkList({
  items,
  onEdit,
  onDelete,
  onTagClick,
}: BookmarkListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
        <p className="text-ink-muted">No bookmarks match your search.</p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map(({ bookmark, index }) => (
        <li
          key={`${bookmark.url}-${bookmark.date_added}-${index}`}
          className="group rounded-2xl border border-line bg-surface-raised transition-colors hover:border-accent/40"
        >
          <div
            role="link"
            tabIndex={0}
            onClick={() => openBookmark(bookmark.url)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openBookmark(bookmark.url)
              }
            }}
            className="flex cursor-pointer flex-col gap-3 px-5 py-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-lg font-medium tracking-tight text-ink group-hover:text-accent">
                  {bookmark.title || bookmark.url}
                </p>
                <p className="mt-0.5 truncate text-sm text-ink-faint">
                  {bookmark.url}
                </p>
                {bookmark.description && (
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    {bookmark.description}
                  </p>
                )}
              </div>

              <div
                className="flex shrink-0 gap-0.5 opacity-60 transition-opacity group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  title="Edit"
                  aria-label={`Edit ${bookmark.title || bookmark.url}`}
                  onClick={() => onEdit(index)}
                  className="rounded-lg p-1.5 text-ink-muted hover:bg-surface hover:text-ink"
                >
                  <PencilIcon />
                </button>
                <button
                  type="button"
                  title="Delete"
                  aria-label={`Delete ${bookmark.title || bookmark.url}`}
                  onClick={() => {
                    if (confirm(`Delete “${bookmark.title || bookmark.url}”?`)) {
                      onDelete(index)
                    }
                  }}
                  className="rounded-lg p-1.5 text-ink-muted hover:bg-danger-soft hover:text-danger"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>

            <div className="flex items-end justify-between gap-3">
              <time
                dateTime={bookmark.date_added}
                className="shrink-0 text-xs text-ink-faint tabular-nums"
              >
                {formatDate(bookmark.date_added)}
              </time>
              <div className="flex min-w-0 flex-wrap justify-end gap-1.5">
                {bookmark.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onTagClick(tag)
                    }}
                    className="rounded-md bg-accent-soft px-2 py-0.5 text-xs text-accent hover:bg-accent hover:text-surface-raised dark:hover:text-surface"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
