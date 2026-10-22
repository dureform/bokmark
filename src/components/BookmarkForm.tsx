import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { Bookmark, BookmarkDraft } from '../types'

interface BookmarkFormProps {
  open: boolean
  initial?: Bookmark | null
  categories: string[]
  onClose: () => void
  onSubmit: (draft: BookmarkDraft) => Promise<void>
}

function parseTagParts(value: string): { completed: string[]; draft: string } {
  const parts = value.split(',')
  const draft = parts[parts.length - 1] ?? ''
  const completed = parts
    .slice(0, -1)
    .map((t) => t.trim())
    .filter(Boolean)
  return { completed, draft }
}

function applySuggestion(value: string, suggestion: string): string {
  const { completed } = parseTagParts(value)
  return [...completed, suggestion].join(', ') + ', '
}

export function BookmarkForm({
  open,
  initial,
  categories,
  onClose,
  onSubmit,
}: BookmarkFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const listboxId = useId()
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [tags, setTags] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      setTitle(initial?.title ?? '')
      setUrl(initial?.url ?? '')
      setTags(initial?.tags.join(', ') ?? '')
      setDescription(initial?.description ?? '')
      setError(null)
      setBusy(false)
      setSuggestOpen(false)
      setActiveIndex(0)
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open, initial])

  const suggestions = useMemo(() => {
    const { completed, draft } = parseTagParts(tags)
    const query = draft.trim().toLowerCase()
    if (!query) return []

    const taken = new Set(completed.map((t) => t.toLowerCase()))
    return categories
      .filter((tag) => {
        const lower = tag.toLowerCase()
        if (taken.has(lower)) return false
        return lower.startsWith(query) || lower.includes(query)
      })
      .sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(query) ? 0 : 1
        const bStarts = b.toLowerCase().startsWith(query) ? 0 : 1
        if (aStarts !== bStarts) return aStarts - bStarts
        return a.localeCompare(b)
      })
      .slice(0, 8)
  }, [tags, categories])

  useEffect(() => {
    setActiveIndex(0)
  }, [suggestions])

  function chooseSuggestion(suggestion: string) {
    setTags(applySuggestion(tags, suggestion))
    setSuggestOpen(false)
    setActiveIndex(0)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedTags = tags
      .split(/[,]+/)
      .map((t) => t.trim())
      .filter(Boolean)
    if (!title.trim() || !url.trim()) {
      setError('Title and URL are required.')
      return
    }
    if (parsedTags.length === 0) {
      setError('At least one category is required.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSubmit({
        title,
        url,
        tags: parsedTags,
        description,
        date_added: initial?.date_added,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  const showSuggestions = suggestOpen && suggestions.length > 0

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 h-full max-h-none w-full max-w-none bg-surface p-0 text-ink outline-none"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose()
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="absolute top-1/2 left-1/2 flex w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-5 rounded-2xl border border-line bg-surface-raised p-6 shadow-xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 id={titleId} className="text-xl font-semibold tracking-tight">
            {initial ? 'Edit bookmark' : 'Add bookmark'}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Changes are written to your bookmark.json file immediately.
          </p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-ink-muted">Title</span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-xl border border-line bg-surface px-3.5 py-2.5 outline-none focus:border-accent"
            placeholder="Readable name"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-ink-muted">URL</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="rounded-xl border border-line bg-surface px-3.5 py-2.5 outline-none focus:border-accent"
            placeholder="https://"
            inputMode="url"
          />
        </label>

        <div className="relative flex flex-col gap-1.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-ink-muted">Category</span>
            <input
              value={tags}
              onChange={(e) => {
                setTags(e.target.value)
                setSuggestOpen(true)
              }}
              onFocus={() => setSuggestOpen(true)}
              onBlur={() => {
                // Delay so suggestion click can register
                window.setTimeout(() => setSuggestOpen(false), 120)
              }}
              onKeyDown={(e) => {
                if (!showSuggestions) return
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setActiveIndex((i) =>
                    Math.min(i + 1, suggestions.length - 1),
                  )
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setActiveIndex((i) => Math.max(i - 1, 0))
                } else if (e.key === 'Enter' && suggestions[activeIndex]) {
                  e.preventDefault()
                  chooseSuggestion(suggestions[activeIndex])
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  setSuggestOpen(false)
                }
              }}
              required
              role="combobox"
              aria-expanded={showSuggestions}
              aria-controls={listboxId}
              aria-autocomplete="list"
              className="rounded-xl border border-line bg-surface px-3.5 py-2.5 outline-none focus:border-accent"
              placeholder="design, tools"
            />
          </label>
          {showSuggestions && (
            <ul
              id={listboxId}
              role="listbox"
              className="absolute top-full right-0 left-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-line bg-surface-raised py-1 shadow-lg"
            >
              {suggestions.map((suggestion, index) => (
                <li key={suggestion} role="option" aria-selected={index === activeIndex}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => chooseSuggestion(suggestion)}
                    className={`w-full px-3.5 py-2 text-left text-sm ${
                      index === activeIndex
                        ? 'bg-accent-soft text-accent'
                        : 'text-ink hover:bg-surface'
                    }`}
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <span className="text-xs text-ink-faint">
            At least one category is required. Suggestions appear as you type.
          </span>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-ink-muted">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="resize-y rounded-xl border border-line bg-surface px-3.5 py-2.5 outline-none focus:border-accent"
            placeholder="Optional note"
          />
        </label>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm text-ink-muted hover:bg-surface hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-surface-raised hover:bg-accent-hover disabled:opacity-60 dark:text-surface"
          >
            {busy ? 'Saving…' : initial ? 'Save' : 'Add'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
