import { StyleSheet, View } from "react-native"
import { spacing } from "@/src/design-system-v2"
import { consultSources, type ConsultActivity } from "@/src/types/chat"
import { consultNutritionCards } from "../lib/consultNutrition"
import { ConsultNutritionCard } from "./ConsultNutritionCard"
import { ConsultSources } from "./ConsultSources"

export function ConsultDataCards({
  activities = [],
  onDisclosure,
}: {
  activities?: ConsultActivity[]
  onDisclosure?: () => void
}) {
  const cards = consultNutritionCards(activities)
  if (!cards.length && !consultSources(activities).length) return null
  return (
    <View style={styles.stack}>
      {cards.map((card) => (
        <ConsultNutritionCard
          key={card.kind}
          card={card}
          onDisclosure={onDisclosure}
        />
      ))}
      <ConsultSources activities={activities} onDisclosure={onDisclosure} />
    </View>
  )
}
const styles = StyleSheet.create({ stack: { gap: spacing[12] } })
