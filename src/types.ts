export interface Bookmark {
  url: string
  title: string
  tags: string[]
  date_added: string
  description: string
}

export type BookmarkDraft = Omit<Bookmark, 'date_added'> & {
  date_added?: string
}
