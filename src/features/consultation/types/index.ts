import { IconName } from "@/src/shared/components"
import type { ChatCategory } from "@/src/types/chat"

export type { ChatCategory }

export interface CategoryMeta {
  key: ChatCategory
  label: string
  icon: IconName
  color?: string
}

export interface FaqItem {
  id: string
  category: ChatCategory
  question: string
  answer: string
}

export interface QuickQuestion {
  id: string
  category: ChatCategory
  text: string
}

export interface FaqCardEntry {
  id: string
  category: ChatCategory
  title: string
  description: string
}
