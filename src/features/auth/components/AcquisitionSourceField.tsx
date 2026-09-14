import { useEffect, useMemo, useRef, useState } from "react"
import {
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native"
import { Text, TextInput } from "@/src/shared/components/AppText"
import { AppModal } from "@/src/shared/components/AppModal"
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  ReduceMotion,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { hapticSelection } from "@/src/lib/haptics"
import { useSurface } from "@/src/hooks/useSurface"
import { AUTH_LAYOUT, AUTH_MOTION, AUTH_TYPE } from "../data/authSurface"
import { singleLineInputText } from "@/src/theme/surface"
import {
  getAcquisitionSourceOptions,
  type AcquisitionSourceInput,
} from "../data/acquisitionSources"
import { ACQUISITION_OTHER_MAX_LENGTH } from "../data/signupSteps"

const ITEM_HEIGHT = 48
const VISIBLE_ITEMS = 5
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS
const WHEEL_PADDING = (WHEEL_HEIGHT - ITEM_HEIGHT) / 2

const EASE = Easing.bezier(0.22, 1, 0.36, 1)
const SPRING = { ...AUTH_MOTION.spring, reduceMotion: ReduceMotion.System }
const TIMING = {
  duration: AUTH_MOTION.duration.base,
  easing: EASE,
  reduceMotion: ReduceMotion.System,
}

interface WheelItemProps {
  label: string
  index: number
  scrollY: SharedValue<number>
  selected: boolean
  selectedColor: string
  restColor: string
  onPress: () => void
}

function WheelItem({
  label,
  index,
  scrollY,
  selected,
  selectedColor,
  restColor,
  onPress,
}: WheelItemProps) {
  // 가운데에서 멀어질수록 옅어지고 작아진다. 물리적인 다이얼처럼 읽히게 하는 부분.
  const style = useAnimatedStyle(() => {
    const distance = index * ITEM_HEIGHT - scrollY.value
    const steps = [-2, -1, 0, 1, 2].map((n) => n * ITEM_HEIGHT)
    return {
      opacity: interpolate(distance, steps, [0.3, 0.55, 1, 0.55, 0.3], "clamp"),
      transform: [
        {
          scale: interpolate(
            distance,
            steps,
            [0.88, 0.95, 1, 0.95, 0.88],
            "clamp",
          ),
        },
      ],
    }
  })

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Animated.View style={[styles.wheelItem, style]}>
        <Text
          numberOfLines={1}
          style={[
            styles.wheelLabel,
            {
              color: selected ? selectedColor : restColor,
              fontWeight: selected ? "700" : "500",
            },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  )
}

interface AcquisitionSourceFieldProps {
  value: AcquisitionSourceInput
  otherValue: string
  onChange: (value: AcquisitionSourceInput, otherValue: string) => void
}

/**
 * 유입경로 선택. 필드를 누르면 하단 시트가 올라오고, 다이얼을 돌려 고른 뒤
 * "선택 완료"로 확정한다. `기타(직접 입력)` 을 고르면 같은 시트가 이유 입력으로
 * 바뀐다 — 시트를 닫았다 다시 여는 왕복이 없다.
 *
 * 필드도 시트도 테두리·그림자가 없다. 시트는 배경 딤과 모서리로만 떠 있다.
 */
export function AcquisitionSourceField({
  value,
  otherValue,
  onChange,
}: AcquisitionSourceFieldProps) {
  const surface = useSurface()
  const { t } = useTranslation("auth")
  // 열 개의 i18n 라벨. 스크롤 프레임마다 다시 만들 이유가 없다 — 언어가 바뀌면
  // `t` 가 바뀌고 그때만 다시 만든다(`useTermsAgreement` 와 같은 관례).
  const options = useMemo(getAcquisitionSourceOptions, [t])
  const insets = useSafeAreaInsets()
  const scrollRef = useRef<Animated.ScrollView>(null)
  const scrollY = useSharedValue(0)
  const sheetProgress = useSharedValue(0)
  const openedAtIndex = useRef(0)
  // 닫힘 모션이 끝나기 전에 언마운트되면 타이머가 사라진 컴포넌트의 state 를 건드린다.
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [phase, setPhase] = useState<"list" | "reason">("list")
  const [draftIndex, setDraftIndex] = useState(0)
  const [draftOther, setDraftOther] = useState(otherValue)

  const selectedOption = options.find((o) => o.value === value)
  const draftOption = options[draftIndex]

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y
    },
  })

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(sheetProgress.value, [0, 1], [420, 0]) },
    ],
  }))
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: sheetProgress.value,
  }))

  const open = () => {
    const index = Math.max(
      options.findIndex((o) => o.value === value),
      0,
    )
    openedAtIndex.current = index
    setDraftIndex(index)
    setDraftOther(otherValue)
    setPhase("list")
    setIsOpen(true)
    scrollY.value = index * ITEM_HEIGHT
    sheetProgress.value = withSpring(1, SPRING)
  }

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    // 모달이 붙은 다음 프레임에 위치를 잡아야 목록이 첫 항목에서 시작하지 않는다.
    // 열릴 때 한 번뿐이다 — 스크롤 중에 다시 잡으면 사용자의 손을 되감는다.
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: openedAtIndex.current * ITEM_HEIGHT,
        animated: false,
      })
    }, 0)
    return () => clearTimeout(timer)
  }, [isOpen])

  const close = () => {
    // 모달을 즉시 언마운트하면 내려가는 모션이 잘린다. 애니메이션이 끝난 뒤에 닫는다.
    sheetProgress.value = withTiming(0, TIMING)
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null
      setIsOpen(false)
    }, TIMING.duration)
  }

  const settleIndex = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.min(
      Math.max(Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT), 0),
      options.length - 1,
    )
    if (next !== draftIndex) {
      hapticSelection()
      setDraftIndex(next)
    }
  }

  // 손을 뗀 뒤 관성이 남아 있으면 여기서 확정하지 않는다 — 흘러가는 도중의 값을 잡으면
  // 다이얼이 멈추기도 전에 햅틱이 울린다. 관성이 끝나면 momentum 핸들러가 잡는다.
  const settleIfStopped = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (Math.abs(e.nativeEvent.velocity?.y ?? 0) > 0.05) return
    settleIndex(e)
  }

  const confirm = () => {
    if (draftOption.value === "OTHER" && phase === "list") {
      setPhase("reason")
      return
    }
    if (draftOption.value === "OTHER") {
      onChange("OTHER", draftOther.trim())
    } else {
      onChange(draftOption.value, "")
    }
    close()
  }

  const canConfirm = phase === "list" || !!draftOther.trim()
  const displayText = selectedOption
    ? selectedOption.value === "OTHER" && otherValue
      ? t("acquisition.otherDisplay", { value: otherValue })
      : selectedOption.label
    : t("profile.acquisition.placeholder")

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("acquisition.selectA11y")}
        onPress={open}
      >
        {({ pressed }) => (
          <View
            style={[
              styles.trigger,
              {
                backgroundColor: pressed
                  ? surface.surfacePressed
                  : selectedOption
                    ? surface.surfaceBrand
                    : surface.surfaceSunken,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.triggerText,
                {
                  color: selectedOption ? surface.brand : surface.placeholder,
                  fontWeight: selectedOption ? "600" : "500",
                },
              ]}
            >
              {displayText}
            </Text>
            <Ionicons
              name="chevron-down"
              size={18}
              color={selectedOption ? surface.brand : surface.placeholder}
            />
          </View>
        )}
      </Pressable>

      <AppModal
        visible={isOpen}
        transparent
        statusBarTranslucent
        animationType="none"
        onRequestClose={close}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Animated.View style={[styles.backdrop, backdropStyle]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          </Animated.View>

          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: surface.canvas,
                paddingBottom: insets.bottom + 16,
              },
              sheetStyle,
            ]}
          >
            <View
              style={[styles.handle, { backgroundColor: surface.hairline }]}
            />

            <Text
              style={[styles.sheetTitle, { color: surface.textStrong }]}
              lineBreakStrategyIOS="hangul-word"
            >
              {phase === "list"
                ? t("acquisition.sheetTitle")
                : t("acquisition.otherTitle")}
            </Text>

            {phase === "list" ? (
              <View style={styles.wheelWrap}>
                {/* 가운데 한 줄이 선택 자리. 다이얼이 그 위를 지나간다. */}
                <View
                  pointerEvents="none"
                  style={[
                    styles.wheelHighlight,
                    { backgroundColor: surface.surfaceSunken },
                  ]}
                />
                <Animated.ScrollView
                  bounces={false}
                  overScrollMode="never"
                  // "기타" 입력 키보드가 떠 있어도 휠 조작이 첫 탭에 먹히지 않게.
                  keyboardShouldPersistTaps="handled"
                  ref={scrollRef}
                  onScroll={scrollHandler}
                  scrollEventThrottle={16}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  onMomentumScrollEnd={settleIndex}
                  onScrollEndDrag={settleIfStopped}
                  contentContainerStyle={{ paddingVertical: WHEEL_PADDING }}
                >
                  {options.map((option, index) => (
                    <WheelItem
                      key={option.value}
                      label={option.label}
                      index={index}
                      scrollY={scrollY}
                      selected={index === draftIndex}
                      selectedColor={surface.textStrong}
                      restColor={surface.textWeak}
                      onPress={() => {
                        scrollRef.current?.scrollTo({
                          y: index * ITEM_HEIGHT,
                          animated: true,
                        })
                        if (index !== draftIndex) {
                          hapticSelection()
                          setDraftIndex(index)
                        }
                      }}
                    />
                  ))}
                </Animated.ScrollView>
              </View>
            ) : (
              <Animated.View
                entering={FadeIn.duration(AUTH_MOTION.duration.fast)}
                exiting={FadeOut.duration(AUTH_MOTION.duration.fast)}
                style={styles.reasonWrap}
              >
                <View
                  style={[
                    styles.reasonField,
                    { backgroundColor: surface.surfaceSunken },
                  ]}
                >
                  <TextInput
                    autoFocus
                    value={draftOther}
                    onChangeText={setDraftOther}
                    placeholder={t("acquisition.otherPlaceholder")}
                    placeholderTextColor={surface.placeholder}
                    selectionColor={surface.brand}
                    maxLength={ACQUISITION_OTHER_MAX_LENGTH}
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      if (canConfirm) confirm()
                    }}
                    style={[styles.reasonText, { color: surface.textStrong }]}
                  />
                </View>
              </Animated.View>
            )}

            <View style={styles.sheetCta}>
              <Pressable onPress={confirm} disabled={!canConfirm}>
                <View
                  style={[
                    styles.sheetCtaButton,
                    {
                      backgroundColor: canConfirm
                        ? surface.brand
                        : surface.surfaceSunken,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.sheetCtaLabel,
                      {
                        color: canConfirm
                          ? surface.onBrand
                          : surface.ctaOffText,
                      },
                    ]}
                  >
                    {phase === "list" && draftOption.value === "OTHER"
                      ? t("acquisition.directInput")
                      : t("acquisition.select")}
                  </Text>
                </View>
              </Pressable>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </AppModal>
    </View>
  )
}

const styles = StyleSheet.create({
  trigger: {
    height: AUTH_LAYOUT.fieldHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderRadius: AUTH_LAYOUT.radius.field,
    gap: 8,
  },
  triggerText: {
    ...AUTH_TYPE.field,
    flex: 1,
  },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: AUTH_LAYOUT.radius.sheet,
    borderTopRightRadius: AUTH_LAYOUT.radius.sheet,
    paddingTop: 10,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 18,
  },
  sheetTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    letterSpacing: -0.4,
    paddingHorizontal: AUTH_LAYOUT.screenX,
    paddingBottom: 8,
  },
  wheelWrap: { height: WHEEL_HEIGHT, justifyContent: "center" },
  wheelHighlight: {
    position: "absolute",
    left: AUTH_LAYOUT.screenX,
    right: AUTH_LAYOUT.screenX,
    height: ITEM_HEIGHT,
    borderRadius: AUTH_LAYOUT.radius.pill,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  wheelLabel: {
    fontSize: 17,
    lineHeight: 23,
    letterSpacing: -0.34,
  },
  reasonWrap: {
    paddingHorizontal: AUTH_LAYOUT.screenX,
    paddingTop: 4,
    paddingBottom: 4,
  },
  reasonField: {
    height: AUTH_LAYOUT.fieldHeight,
    borderRadius: AUTH_LAYOUT.radius.field,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  reasonText: {
    ...singleLineInputText(AUTH_TYPE.field),
    fontWeight: "600",
    padding: 0,
  },
  sheetCta: { paddingHorizontal: AUTH_LAYOUT.screenX, paddingTop: 20 },
  sheetCtaButton: {
    height: AUTH_LAYOUT.ctaHeight,
    borderRadius: AUTH_LAYOUT.radius.cta,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCtaLabel: {
    ...AUTH_TYPE.cta,
    fontWeight: "600",
  },
})
