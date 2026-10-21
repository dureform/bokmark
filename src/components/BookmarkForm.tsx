import { useEffect, useId, useRef, useState } from 'react'
import type { Bookmark, BookmarkDraft } from '../types'

interface BookmarkFormProps {
  open: boolean
  initial?: Bookmark | null
  onClose: () => void
  onSubmit: (draft: BookmarkDraft) => Promise<void>
}

export function BookmarkForm({
  open,
  initial,
  onClose,
  onSubmit,
}: BookmarkFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [tags, setTags] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open, initial])

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

        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-ink-muted">Category</span>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            required
            className="rounded-xl border border-line bg-surface px-3.5 py-2.5 outline-none focus:border-accent"
            placeholder="design, tools"
          />
          <span className="text-xs text-ink-faint">
            At least one category is required.
          </span>
        </label>

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
