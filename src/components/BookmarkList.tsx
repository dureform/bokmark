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
            className="flex cursor-pointer items-start justify-between gap-4 px-5 py-4"
          >
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
              {bookmark.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
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
              )}
            </div>

            <div
              className="flex shrink-0 gap-1 opacity-60 transition-opacity group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => onEdit(index)}
                className="rounded-lg px-2.5 py-1.5 text-sm text-ink-muted hover:bg-surface hover:text-ink"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete “${bookmark.title || bookmark.url}”?`)) {
                    onDelete(index)
                  }
                }}
                className="rounded-lg px-2.5 py-1.5 text-sm text-ink-muted hover:bg-danger-soft hover:text-danger"
              >
                Delete
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
