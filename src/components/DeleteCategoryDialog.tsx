import { useEffect, useRef, useState } from 'react'

export type DeleteCategoryResult =
  | { action: 'remove' }
  | { action: 'move'; moveTo: string }
  | { action: 'deleteBookmarks' }

interface DeleteCategoryDialogProps {
  open: boolean
  tag: string | null
  count: number
  /** Bookmarks that only have this category (would become uncategorized if stripped). */
  soleTagCount: number
  otherTags: string[]
  onClose: () => void
  onConfirm: (result: DeleteCategoryResult) => Promise<void>
}

export function DeleteCategoryDialog({
  open,
  tag,
  count,
  soleTagCount,
  otherTags,
  onClose,
  onConfirm,
}: DeleteCategoryDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [action, setAction] = useState<'remove' | 'move' | 'deleteBookmarks'>(
    'remove',
  )
  const [moveTo, setMoveTo] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canStrip = soleTagCount === 0
  const canMove = otherTags.length > 0

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      const initial: 'remove' | 'move' | 'deleteBookmarks' = canMove
        ? 'move'
        : canStrip
          ? 'remove'
          : 'deleteBookmarks'
      setAction(initial)
      setMoveTo(otherTags[0] ?? '')
      setBusy(false)
      setError(null)
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open, otherTags, canStrip, canMove])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tag) return

    const destination = moveTo.trim().toLowerCase()
    if (action === 'move' && !destination) {
      setError('Choose a category to move bookmarks to.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      if (action === 'move') {
        await onConfirm({ action: 'move', moveTo: destination })
      } else if (action === 'deleteBookmarks') {
        await onConfirm({ action: 'deleteBookmarks' })
      } else {
        await onConfirm({ action: 'remove' })
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete category')
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
        onSubmit={(e) => void handleSubmit(e)}
        className="absolute top-1/2 left-1/2 flex w-[min(92vw,26rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-5 rounded-2xl border border-line bg-surface-raised p-6 shadow-xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Delete category
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {count === 0
              ? `Remove “${tag}”.`
              : `“${tag}” is on ${count} bookmark${count === 1 ? '' : 's'}. Choose what happens to them.`}
          </p>
        </div>

        {count > 0 && (
          <fieldset className="flex flex-col gap-3">
            <label
              className={`flex items-start gap-3 rounded-xl border border-line px-3.5 py-3 has-checked:border-accent ${
                canStrip
                  ? 'cursor-pointer'
                  : 'cursor-not-allowed opacity-50'
              }`}
            >
              <input
                type="radio"
                name="delete-action"
                checked={action === 'remove'}
                disabled={!canStrip}
                onChange={() => setAction('remove')}
                className="mt-1"
              />
              <span>
                <span className="block font-medium">Just remove the category</span>
                <span className="text-sm text-ink-muted">
                  {canStrip
                    ? 'Bookmarks stay; the category is stripped off.'
                    : `${soleTagCount} bookmark${soleTagCount === 1 ? '' : 's'} only ${soleTagCount === 1 ? 'has' : 'have'} this category — move or delete ${soleTagCount === 1 ? 'it' : 'them'} instead.`}
                </span>
              </span>
            </label>

            <div
              className={`rounded-xl border border-line px-3.5 py-3 ${
                action === 'move' ? 'border-accent' : ''
              } ${canMove ? '' : 'opacity-50'}`}
            >
              <label
                className={`flex items-start gap-3 ${
                  canMove ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}
              >
                <input
                  type="radio"
                  name="delete-action"
                  checked={action === 'move'}
                  disabled={!canMove}
                  onChange={() => setAction('move')}
                  className="mt-1"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">
                    Move bookmarks to another category
                  </span>
                  <span className="mt-1 block text-sm text-ink-muted">
                    {canMove
                      ? 'Replaces this category on those bookmarks.'
                      : 'No other categories available.'}
                  </span>
                </span>
              </label>
              <div className="mt-2 pl-7">
                <select
                  value={moveTo}
                  disabled={!canMove}
                  onChange={(e) => {
                    setMoveTo(e.target.value)
                    setAction('move')
                  }}
                  onFocus={() => {
                    if (canMove) setAction('move')
                  }}
                  className="w-full rounded-lg border border-line bg-surface px-2.5 py-2 outline-none focus:border-accent disabled:opacity-60"
                >
                  {canMove ? (
                    otherTags.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))
                  ) : (
                    <option value="">No other categories</option>
                  )}
                </select>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line px-3.5 py-3 has-checked:border-accent">
              <input
                type="radio"
                name="delete-action"
                checked={action === 'deleteBookmarks'}
                onChange={() => setAction('deleteBookmarks')}
                className="mt-1"
              />
              <span>
                <span className="block font-medium">
                  Delete category and its bookmarks
                </span>
                <span className="text-sm text-ink-muted">
                  Removes the category and permanently deletes all{' '}
                  {count} bookmark{count === 1 ? '' : 's'} tagged with it.
                </span>
              </span>
            </label>
          </fieldset>
        )}

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm text-ink-muted hover:bg-surface hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || (action === 'move' && !moveTo.trim())}
            className="rounded-xl bg-danger px-4 py-2.5 text-sm font-medium text-white hover:bg-danger-hover disabled:opacity-60"
          >
            {busy
              ? 'Deleting…'
              : action === 'deleteBookmarks'
                ? 'Delete category & bookmarks'
                : 'Delete'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
