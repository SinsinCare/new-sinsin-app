import { useEffect, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { AppBottomSheet } from "@/src/shared/components/AppBottomSheet"
import { hapticSelection } from "@/src/lib/haptics"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE } from "@/src/theme/surface"
import { MEAL_OPTIONS } from "../../../data/mealConstants"
import { inferMealTypeFromTime } from "../../../utils/mealRecordUtils"
import { SheetChip, SheetChipRow, SheetInfoCard } from "./recordSheetControls"
import type { MealType } from "../../../types"
import { useTranslation } from "react-i18next"

export interface MealSlotStatus {
  recorded: boolean
  skipped: boolean
  time?: string
  imageUri?: string | null
}

interface MealSheetProps {
  visible: boolean
  onClose: () => void
  slots: Partial<Record<MealType, MealSlotStatus>>
  onCamera: (mealType: MealType) => void
  onGallery: (mealType: MealType) => void
  onText: (mealType: MealType) => void
  onSkip: (mealType: MealType) => void
  onViewResult: (mealType: MealType) => void
  /** 타임라인 카드에서 특정 끼니로 진입할 때. 없으면 시각으로 추론한다. */
  initialMealType?: MealType | null
}

/**
 * 식사 기록 시트. 사진이 주인공이다 — 영양 성분을 고르게 하지 않고
 * "찍기만 하면 AI가 알아봐요"로 역할을 넘긴다. 계산 가능한 값은 앱이 채운다.
 *
 * 끼니는 지금 시각으로 미리 골라 두고, 기록 강제는 죄책감과 직결이라
 * "오늘은 건너뛰기"를 회색으로 항상 함께 둔다.
 */
export function MealSheet({
  visible,
  onClose,
  slots,
  onCamera,
  onGallery,
  onText,
  onSkip,
  onViewResult,
  initialMealType,
}: MealSheetProps) {
  const { t } = useTranslation("common")
  const surface = useSurface()
  const [mealType, setMealType] = useState<MealType>("BREAKFAST")

  useEffect(() => {
    if (!visible) return
    setMealType(initialMealType ?? inferMealTypeFromTime(new Date()))
  }, [visible, initialMealType])

  const slot = slots[mealType]
  const skipped = slot?.skipped ?? false
  const recorded = (slot?.recorded ?? false) && !skipped
  const mealLabel = t(`meal.${mealType}`)

  return (
    <AppBottomSheet visible={visible} onClose={onClose} snapPoints={[72]}>
      <View style={styles.body}>
        <View style={styles.head}>
          <View style={styles.headText}>
            <Text style={[styles.title, { color: surface.textStrong }]}>
              {t("home.timeline.title")}
            </Text>
            <Text style={[styles.subtitle, { color: surface.textWeak }]}>
              {recorded
                ? t("home.sheet.meal.alreadyRecorded", { meal: mealLabel })
                : t("home.sheet.meal.willRecordAs", { meal: mealLabel })}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("action.close")}
            onPress={onClose}
            hitSlop={10}
          >
            {({ pressed }) => (
              <View
                style={[
                  styles.closeButton,
                  {
                    backgroundColor: pressed
                      ? surface.surfacePressed
                      : surface.surface,
                  },
                ]}
              >
                <Ionicons name="close" size={18} color={surface.textWeak} />
              </View>
            )}
          </Pressable>
        </View>

        <SheetChipRow grow>
          {MEAL_OPTIONS.map((option) => {
            const optionSlot = slots[option.type]
            const optionRecorded =
              (optionSlot?.recorded ?? false) && !(optionSlot?.skipped ?? false)
            return (
              <SheetChip
                key={option.type}
                label={t(`meal.${option.type}`)}
                anchor={
                  optionSlot?.skipped
                    ? t("home.timeline.skipped")
                    : optionRecorded
                      ? (optionSlot?.time ?? t("home.sheet.meal.recorded"))
                      : t("home.sheet.meal.notRecorded")
                }
                selected={mealType === option.type}
                onPress={() => setMealType(option.type)}
                style={styles.grow}
              />
            )
          })}
        </SheetChipRow>

        {recorded ? (
          <PrimaryAction
            icon="receipt-outline"
            title={t("home.sheet.meal.view", { meal: mealLabel })}
            description={t("home.sheet.meal.viewDescription")}
            onPress={() => onViewResult(mealType)}
          />
        ) : (
          <>
            <PrimaryAction
              icon="camera"
              title={t("home.sheet.meal.takePhoto")}
              description={t("home.sheet.meal.photoDescription")}
              onPress={() => onCamera(mealType)}
            />

            <View style={styles.secondaryRow}>
              <SecondaryAction
                label={t("home.sheet.meal.choosePhoto")}
                onPress={() => onGallery(mealType)}
              />
              <SecondaryAction
                label={t("home.sheet.meal.writeText")}
                onPress={() => onText(mealType)}
              />
            </View>
          </>
        )}

        <SheetInfoCard>{t("home.sheet.meal.info")}</SheetInfoCard>

        {!recorded && !skipped ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("home.sheet.meal.skip")}
            onPress={() => onSkip(mealType)}
          >
            {({ pressed }) => (
              <View
                style={[
                  styles.skipButton,
                  {
                    backgroundColor: pressed
                      ? surface.surfacePressed
                      : surface.surface,
                  },
                ]}
              >
                <Text style={[styles.skipLabel, { color: surface.textWeak }]}>
                  {t("home.sheet.meal.skip")}
                </Text>
              </View>
            )}
          </Pressable>
        ) : null}
      </View>
    </AppBottomSheet>
  )
}

/** 시트의 주 행동 — 브랜드 면 하나. 사진 기록이 이 화면의 주인공이다. */
function PrimaryAction({
  icon,
  title,
  description,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  description: string
  onPress: () => void
}) {
  const surface = useSurface()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title} ${description}`}
      onPress={() => {
        hapticSelection()
        onPress()
      }}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.primaryCard,
            { backgroundColor: surface.brand, opacity: pressed ? 0.92 : 1 },
          ]}
        >
          <Ionicons name={icon} size={22} color={surface.onBrand} />
          <View style={styles.primaryText}>
            <Text style={[styles.primaryTitle, { color: surface.onBrand }]}>
              {title}
            </Text>
            <Text style={styles.primaryDesc}>{description}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={surface.onBrand} />
        </View>
      )}
    </Pressable>
  )
}

function SecondaryAction({
  label,
  onPress,
}: {
  label: string
  onPress: () => void
}) {
  const surface = useSurface()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        hapticSelection()
        onPress()
      }}
      style={styles.grow}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.secondaryButton,
            {
              backgroundColor: pressed
                ? surface.surfacePressed
                : surface.surface,
            },
          ]}
        >
          <Text style={[styles.secondaryLabel, { color: surface.text }]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: LAYOUT.screenX,
    paddingTop: 4,
    gap: 12,
  },
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 4,
  },
  headText: { flex: 1, gap: 3 },
  title: { ...TYPE.sheetTitle, fontWeight: "700" },
  subtitle: TYPE.cardSub,
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  grow: { flex: 1 },
  primaryCard: {
    minHeight: 64,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  primaryText: { flex: 1, gap: 2 },
  primaryTitle: { ...TYPE.cardTitle, fontWeight: "700" },
  primaryDesc: { ...TYPE.cardSub, color: "rgba(255,255,255,0.88)" },
  secondaryRow: { flexDirection: "row", gap: 8 },
  secondaryButton: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryLabel: { ...TYPE.cardTitle, fontWeight: "600" },
  skipButton: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  skipLabel: { ...TYPE.cardTitle, fontWeight: "500" },
})
