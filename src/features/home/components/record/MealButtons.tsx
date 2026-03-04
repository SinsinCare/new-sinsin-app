import { useState } from "react"
import { Text, XStack, YStack, View } from "tamagui"
import { TouchableOpacity, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { MealType } from "../../types"
import { MealButton } from "./MealButton"
import { tokens } from "@/src/theme/tokens"
import { Icon, IconName } from "@/src/shared/components"

type MealOptionConfig = {
  type: MealType
  label: string
  icon: IconName
}

const MEAL_OPTIONS: MealOptionConfig[] = [
  { type: "BREAKFAST", label: "아침", icon: "morning" },
  { type: "LUNCH", label: "점심", icon: "noon" },
  { type: "DINNER", label: "저녁", icon: "evening" },
  { type: "SNACKS", label: "간식", icon: "dessert" },
]

interface MealButtonsProps {
  onSelectMealType: (mealType: MealType) => void
  mealImages?: Partial<Record<MealType, string>>
  recordedMeals?: Partial<Record<MealType, boolean>>
  onRecord: (mealType: MealType) => void
}

export function MealButtons({
  onSelectMealType,
  mealImages = {},
  recordedMeals = {},
  onRecord,
}: MealButtonsProps) {
  const mealTypes: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"]
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  const handleMealSelect = (mealType: MealType) => {
    setIsPickerOpen(false)
    onSelectMealType(mealType)
    onRecord(mealType)
  }

  return (
    <YStack paddingVertical="$3" gap="$4">
      <Text fontSize={22} fontWeight="700">
        식이 기록
      </Text>
      <XStack width="100%" justifyContent="center" gap="$2">
        {mealTypes.map((type) => (
          <MealButton
            key={type}
            mealType={type}
            onPress={() => onSelectMealType(type)}
            imageUri={mealImages[type]}
            isRecorded={recordedMeals[type] ?? false}
          />
        ))}
      </XStack>

      <View style={{ position: "relative" }}>
        {isPickerOpen && (
          <View style={styles.pickerCard}>
            <XStack>
              {MEAL_OPTIONS.slice(0, 2).map((opt, i) => (
                <TouchableOpacity
                  key={opt.type}
                  style={[styles.mealOption]}
                  onPress={() => handleMealSelect(opt.type)}
                >
                  <Icon
                    name={opt.icon}
                    size={18}
                    color={tokens.color.grey8.val}
                  />
                  <Text style={styles.mealLabel}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </XStack>
            <XStack>
              {MEAL_OPTIONS.slice(2, 4).map((opt) => (
                <TouchableOpacity
                  key={opt.type}
                  style={styles.mealOption}
                  onPress={() => handleMealSelect(opt.type)}
                >
                  <Icon
                    name={opt.icon}
                    size={18}
                    color={tokens.color.grey8.val}
                  />
                  <Text style={styles.mealLabel}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </XStack>
            <View style={styles.arrow} />
          </View>
        )}

        <TouchableOpacity
          style={styles.recordButton}
          onPress={() => setIsPickerOpen((prev) => !prev)}
        >
          <Ionicons
            name="camera-outline"
            size={20}
            color={tokens.color.pureWhite.val}
          />
          <Text color="white" fontSize="$4" fontWeight="600">
            식이 기록하기
          </Text>
        </TouchableOpacity>
      </View>
    </YStack>
  )
}

const styles = StyleSheet.create({
  recordButton: {
    backgroundColor: tokens.color.primary7.val,
    borderRadius: 25,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  pickerCard: {
    position: "absolute",
    bottom: 65,
    alignSelf: "center",
    width: 175,
    backgroundColor: "white",
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
    overflow: "visible",
  },
  mealOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 5,
  },
  mealLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#2d2d2d",
  },
  arrow: {
    position: "absolute",
    bottom: -5,
    alignSelf: "center",
    width: 10,
    height: 12,
    backgroundColor: "white",
    transform: [{ rotate: "45deg" }],
    shadowColor: "#000",
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
})
