import { useAppRouter } from "@/src/shared/navigation"
import { FreePostEditor } from "@/src/features/recipe/components/FreePostEditor"

export default function FreePostNewScreen() {
  const router = useAppRouter()
  return <FreePostEditor onClose={() => router.back()} />
}
