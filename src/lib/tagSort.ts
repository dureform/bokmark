export type TagSort = 'count' | 'alpha' | 'recent'

export const TAG_SORT_STORAGE_KEY = 'bokmark-tag-sort'
export const TAG_TOUCHED_STORAGE_KEY = 'bokmark-tag-touched'

export function loadTagSort(): TagSort {
  const stored = localStorage.getItem(TAG_SORT_STORAGE_KEY)
  if (stored === 'count' || stored === 'alpha' || stored === 'recent') {
    return stored
  }
  return 'count'
}

export function saveTagSort(sort: TagSort): void {
  localStorage.setItem(TAG_SORT_STORAGE_KEY, sort)
}

export function loadTagTouched(): Record<string, number> {
  try {
    const raw = localStorage.getItem(TAG_TOUCHED_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const result: Record<string, number> = {}
    for (const [tag, value] of Object.entries(parsed)) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        result[tag] = value
      }
    }
    return result
  } catch {
    return {}
  }
}

export function saveTagTouched(touched: Record<string, number>): void {
  localStorage.setItem(TAG_TOUCHED_STORAGE_KEY, JSON.stringify(touched))
}
