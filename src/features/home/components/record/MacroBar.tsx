import { StyleSheet } from "react-native"
import { YStack, XStack, Text, View } from "tamagui"
import { useTranslation } from "react-i18next"

interface MacroBarProps {
  carbs: number
  protein: number
  fat: number
}

export function MacroBar({ carbs, protein, fat }: MacroBarProps) {
  const { t } = useTranslation("common")
  const carbKcal = carbs * 4
  const proteinKcal = protein * 4
  const fatKcal = fat * 9
  const total = carbKcal + proteinKcal + fatKcal || 1

  const carbPct = Math.round((carbKcal / total) * 100)
  const proteinPct = Math.round((proteinKcal / total) * 100)
  const fatPct = 100 - carbPct - proteinPct

  return (
    <YStack gap="$2">
      <XStack gap="$3">
        {[
          {
            label: t("mealReport.nutrients.carbohydrates"),
            value: `${Math.round(carbs * 10) / 10}g`,
            color: "$sub9",
          },
          {
            label: t("mealReport.nutrients.protein"),
            value: `${Math.round(protein * 10) / 10}g`,
            color: "$sub6",
          },
          {
            label: t("mealReport.nutrients.fat"),
            value: `${Math.round(fat * 10) / 10}g`,
            color: "$sub4",
          },
        ].map(({ label, value, color }) => (
          <XStack key={label} alignItems="center" gap="$1.5">
            <View
              width={8}
              height={8}
              borderRadius={4}
              backgroundColor={color}
            />
            <Text fontSize="$3" color="$colorSubtle">
              {label} {value}
            </Text>
          </XStack>
        ))}
      </XStack>
      <XStack height={28} borderRadius={4} overflow="hidden">
        <View
          flex={carbPct}
          backgroundColor="$sub9"
          borderTopLeftRadius={4}
          borderBottomLeftRadius={4}
          alignItems="center"
          justifyContent="center"
        >
          {carbPct >= 8 && <Text style={styles.label}>{carbPct}%</Text>}
        </View>
        <View
          flex={proteinPct}
          backgroundColor="$sub6"
          alignItems="center"
          justifyContent="center"
        >
          {proteinPct >= 8 && <Text style={styles.label}>{proteinPct}%</Text>}
        </View>
        <View
          flex={fatPct}
          backgroundColor="$sub4"
          borderTopRightRadius={4}
          borderBottomRightRadius={4}
          alignItems="center"
          justifyContent="center"
        >
          {fatPct >= 8 && <Text style={styles.label}>{fatPct}%</Text>}
        </View>
      </XStack>
    </YStack>
  )
}

const styles = StyleSheet.create({
  label: {
    color: "white",
    fontSize: 11,
    fontWeight: "700",
  },
})
