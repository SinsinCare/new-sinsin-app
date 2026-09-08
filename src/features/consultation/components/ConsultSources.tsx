import { View } from "react-native"
import { consultSources, type ConsultActivity } from "@/src/types/chat"
import { spacing } from "@/src/design-system-v2"
import { ConsultRecipeCard } from "./ConsultRecipeCard"

export function ConsultSources({
  activities,
  onDisclosure,
}: {
  activities?: ConsultActivity[]
  onDisclosure?: () => void
}) {
  const sources = consultSources(activities ?? [])
  if (!sources.length) return null
  return (
    <View style={{ gap: spacing[12] }}>
      {sources.map((source) => (
        <ConsultRecipeCard
          key={source.id}
          source={source}
          onDisclosure={onDisclosure}
        />
      ))}
    </View>
  )
}
