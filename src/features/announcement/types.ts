export interface AnnouncementNotice {
  id: number
  title: string
  content: string
  createdAt: string
  imageUrl?: string | null
  linkUrl?: string | null
  ctaLabel?: string | null
}
