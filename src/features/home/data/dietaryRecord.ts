import { MealType } from "../types"

export interface MealRecord {
  id: string
  mealType: MealType
  label: string
  time: string | null
  imageUri: string | null
}

export const mockDailyMealRecords: MealRecord[] = [
  {
    id: "meal-1",
    mealType: "BREAKFAST",
    label: "아침",
    time: "08:30",
    imageUri:
      "https://images.unsplash.com/photo-1659603903007-28c60a54687d?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: "meal-2",
    mealType: "LUNCH",
    label: "점심",
    time: "13:00",
    imageUri:
      "https://images.unsplash.com/photo-1580651315530-69c8e0026377?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: "meal-3",
    mealType: "DINNER",
    label: "저녁",
    time: null,
    imageUri: null,
  },
  {
    id: "meal-4",
    mealType: "SNACKS",
    label: "간식",
    time: null,
    imageUri: null,
  },
]
