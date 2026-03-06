import { useRef, useState } from "react"
import { Text, XStack, YStack, View } from "tamagui"
import {
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native"
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
  const [pickerBottom, setPickerBottom] = useState(0)
  const buttonRef = useRef<React.ComponentRef<typeof TouchableOpacity>>(null)

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

      <Modal
        visible={isPickerOpen}
        transparent
        animationType="none"
        onRequestClose={() => setIsPickerOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsPickerOpen(false)}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        <View style={[styles.pickerCard, { bottom: pickerBottom }]}>
          <XStack>
            {MEAL_OPTIONS.slice(0, 2).map((opt) => (
              <TouchableOpacity
                key={opt.type}
                style={styles.mealOption}
                onPress={() => handleMealSelect(opt.type)}
              >
                <Icon name={opt.icon} size={18} color="$black" />
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
                <Icon name={opt.icon} size={18} color="$black" />
                <Text style={styles.mealLabel}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </XStack>
          <View style={styles.arrow} />
        </View>
      </Modal>

      <TouchableOpacity
        ref={buttonRef}
        style={styles.recordButton}
        onPress={handleOpenPicker}
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
})
