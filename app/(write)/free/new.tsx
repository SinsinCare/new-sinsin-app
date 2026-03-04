import { useRouter } from "expo-router"
import { FreePostEditor } from "@/src/features/recipe/components/FreePostEditor"

export default function FreePostNewScreen() {
  const router = useRouter()
  return <FreePostEditor onClose={() => router.back()} />
}
