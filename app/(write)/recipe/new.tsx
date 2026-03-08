import { router } from "expo-router"
import { RecipeEditor } from "@/src/features/recipe/components/RecipeEditor"

export default function RecipeNewScreen() {
  return <RecipeEditor onClose={() => router.back()} />
}
