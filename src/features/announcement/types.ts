export interface AnnouncementNotice {
  id: number
  title: string
  content: string
  createdAt: string
  updatedAt?: string | null
  revision?: string | number | null
  imageUrl?: string | null
  linkUrl?: string | null
  ctaLabel?: string | null
}
