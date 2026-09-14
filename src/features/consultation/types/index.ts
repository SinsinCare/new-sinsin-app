import type { ChatCategory } from "@/src/types/chat"

export type { ChatCategory }

export interface FaqCardEntry {
  id: string
  category: ChatCategory
  title: string
  description: string
}
