import type { ChatCategory } from "@/src/types/models"

export type { ChatCategory }

export interface CategoryMeta {
  key: ChatCategory
  label: string
  icon: string
  color: string
}

export interface FaqItem {
  id: string
  category: ChatCategory
  question: string
  answer: string
}

export interface ConsultHistoryItem {
  id: string
  category: ChatCategory
  firstQuestion: string
  timestamp: Date
}
