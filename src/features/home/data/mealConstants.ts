import { IconName } from "@/src/shared/components"
import { MealType } from "../types"

export type MealOptionConfig = {
  type: MealType
  label: string
  icon: IconName
}

export const MEAL_OPTIONS: MealOptionConfig[] = [
  { type: "BREAKFAST", label: "아침", icon: "morning" },
  { type: "LUNCH", label: "점심", icon: "noon" },
  { type: "DINNER", label: "저녁", icon: "evening" },
  { type: "SNACKS", label: "간식", icon: "dessert" },
]
