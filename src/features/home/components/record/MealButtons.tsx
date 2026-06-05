import { useRef, useState } from "react"
import { Text, XStack, YStack, View } from "tamagui"
import {
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Ionicons } from "@expo/vector-icons"
import { MealType } from "../../types"
import { MealButton } from "./MealButton"
import { tokens } from "@/src/theme/tokens"
import { Icon } from "@/src/shared/components"
import { MEAL_OPTIONS } from "../../data/mealConstants"

interface MealButtonsProps {
  onSelectMealType: (mealType: MealType) => void
  mealImages?: Partial<Record<MealType, string>>
  recordedMeals?: Partial<Record<MealType, boolean>>
  mealTimes?: Partial<Record<MealType, string>>
  onRecord: (mealType: MealType) => void
  onViewResult: (mealType: MealType) => void
}

export function MealButtons({
  onSelectMealType,
  mealImages = {},
  recordedMeals = {},
  mealTimes = {},
  onRecord,
  onViewResult,
}: MealButtonsProps) {
  const mealTypes: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"]
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [pickerBottom, setPickerBottom] = useState(0)
  const buttonRef = useRef<React.ComponentRef<typeof TouchableOpacity>>(null)
  const isDarkMode = useAppColorScheme() === "dark"
  const cardBg = isDarkMode
    ? tokens.color.cardBgDark.val
    : tokens.color.pureWhite.val
  const iconColor = isDarkMode
    ? tokens.color.textDark.val
    : tokens.color.black.val
  const labelColor = isDarkMode ? tokens.color.textDark.val : "#2d2d2d"

  const handleOpenPicker = () => {
    buttonRef.current?.measure(
      (
        _x: number,
        _y: number,
        _w: number,
        _h: number,
        _pageX: number,
        pageY: number,
      ) => {
        const screenHeight = Dimensions.get("window").height
        setPickerBottom(screenHeight - pageY + 15)
        setIsPickerOpen(true)
      },
    )
  }

  const handleMealSelect = (mealType: MealType) => {
    setIsPickerOpen(false)
    onSelectMealType(mealType)
    onRecord(mealType)
  }

  return (
    <YStack paddingVertical="$1" gap="$3">
      <YStack gap="$1">
        <Text
          fontSize={20}
          fontWeight="600"
          color={isDarkMode ? "$textDark" : "$color"}
        >
          식이 기록
        </Text>
        <Text fontSize={14} fontWeight="500" color="$colorSubtle">
          아래 버튼을 눌러 오늘의 식사를 기록해보세요.
        </Text>
      </YStack>
      <XStack gap="$2">
        {mealTypes.map((type) => (
          <MealButton
            key={type}
            mealType={type}
            onPress={
              recordedMeals[type] ? () => onViewResult(type) : () => onRecord(type)
            }
            imageUri={mealImages[type]}
            isRecorded={recordedMeals[type] ?? false}
            time={mealTimes[type]}
          />
        ))}
      </XStack>

      <Modal
        visible={isPickerOpen}
        transparent
        animationType="none"
        onRequestClose={() => setIsPickerOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsPickerOpen(false)}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        <View
          style={[
            styles.pickerCard,
            { bottom: pickerBottom, backgroundColor: cardBg },
          ]}
        >
          <XStack>
            {MEAL_OPTIONS.slice(0, 2).map((opt) => (
              <TouchableOpacity
                key={opt.type}
                style={styles.mealOption}
                onPress={() => handleMealSelect(opt.type)}
              >
                <Icon name={opt.icon} size={18} color={iconColor} />
                <Text style={[styles.mealLabel, { color: labelColor }]}>
                  {opt.label}
                </Text>
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
                <Icon name={opt.icon} size={18} color={iconColor} />
                <Text style={[styles.mealLabel, { color: labelColor }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </XStack>
          <View style={[styles.arrow, { backgroundColor: cardBg }]} />
        </View>
      </Modal>

      <TouchableOpacity
        ref={buttonRef}
        style={styles.recordButton}
        onPress={handleOpenPicker}
      >
        <Ionicons name="camera-outline" size={20} color="white" />
        <Text color="white" fontSize="$4" fontWeight="600">
          식이 기록하기
        </Text>
      </TouchableOpacity>
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
    alignSelf: "center",
    width: 175,
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
  },
  arrow: {
    position: "absolute",
    bottom: -5,
    alignSelf: "center",
    width: 10,
    height: 12,
    transform: [{ rotate: "45deg" }],
    shadowColor: "#000",
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
})
