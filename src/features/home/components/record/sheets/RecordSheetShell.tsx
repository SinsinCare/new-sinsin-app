import { useEffect, type ReactNode } from "react"
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import Animated, {
  Easing,
  ReduceMotion,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import Ionicons from "@expo/vector-icons/Ionicons"
import { AppBottomSheet } from "@/src/shared/components/AppBottomSheet"
import { hapticStepAdvance } from "@/src/lib/haptics"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, MOTION, TYPE } from "@/src/theme/surface"
import { useTranslation } from "react-i18next"

const EASE = Easing.bezier(0.22, 1, 0.36, 1)
const SPRING = { ...MOTION.spring, reduceMotion: ReduceMotion.System }
const TIMING = {
  duration: MOTION.duration.base,
  easing: EASE,
  reduceMotion: ReduceMotion.System,
}

interface RecordSheetShellProps {
  visible: boolean
  onClose: () => void
  title: string
  subtitle?: string
  /** 화면 높이 대비 %. 입력 필드가 있으면 키보드 몫까지 크게 잡는다. */
  snapPoint: number
  /** 값이 담긴 CTA 라벨 — "저장" 대신 "200ml 기록하기". */
  ctaLabel: string
  ctaDisabled?: boolean
  ctaLoading?: boolean
  onCtaPress: () => void
  children: ReactNode
}

/**
 * 기록 시트의 공통 뼈대 — 제목 17/700 + 보조 한 줄 + 닫기(✕), 본문, CTA h56 r16 17/700.
 * CTA 는 가입 스텝과 같은 문법으로 움직인다: 활성화되는 순간 회색 면이 브랜드색으로
 * 물들고, 누르면 살짝 눌린다. 시트 안에서도 주인공은 CTA 하나다.
 */
export function RecordSheetShell({
  visible,
  onClose,
  title,
  subtitle,
  snapPoint,
  ctaLabel,
  ctaDisabled = false,
  ctaLoading = false,
  onCtaPress,
  children,
}: RecordSheetShellProps) {
  const { t } = useTranslation("common")
  const surface = useSurface()
  const ctaActive = !ctaDisabled && !ctaLoading
  const activeness = useSharedValue(ctaActive ? 1 : 0)
  const press = useSharedValue(0)

  useEffect(() => {
    activeness.value = withTiming(ctaActive ? 1 : 0, TIMING)
  }, [activeness, ctaActive])

  const ctaStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      activeness.value,
      [0, 1],
      [surface.ctaOffBg, surface.brand],
    ),
    transform: [{ scale: 1 - press.value * 0.015 }],
  }))

  const ctaTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      activeness.value,
      [0, 1],
      [surface.ctaOffText, surface.onBrand],
    ),
  }))

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={[snapPoint]}
    >
      <View style={styles.body}>
        <View style={styles.head}>
          <View style={styles.headText}>
            <Text style={[styles.title, { color: surface.textStrong }]}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: surface.textWeak }]}>
                {subtitle}
              </Text>
            ) : null}
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

        {children}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !ctaActive }}
          onPress={() => {
            if (!ctaActive) return
            hapticStepAdvance()
            onCtaPress()
          }}
          onPressIn={() => {
            if (!ctaActive) return
            press.value = withTiming(1, { duration: 90, easing: EASE })
          }}
          onPressOut={() => {
            press.value = withSpring(0, SPRING)
          }}
          disabled={!ctaActive}
        >
          <Animated.View style={[styles.cta, ctaStyle]}>
            {ctaLoading ? (
              <ActivityIndicator size="small" color={surface.ctaOffText} />
            ) : null}
            <Animated.Text style={[styles.ctaLabel, ctaTextStyle]}>
              {ctaLabel}
            </Animated.Text>
          </Animated.View>
        </Pressable>
      </View>
    </AppBottomSheet>
  )
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: LAYOUT.screenX,
    paddingTop: 4,
    // 카드 간격 10 · 섹션 간격 28 사이 — 시트 안의 블록 간격
    gap: 18,
  },
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
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
  cta: {
    height: LAYOUT.cta.height,
    borderRadius: LAYOUT.cta.radius,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaLabel: { fontSize: 17, lineHeight: 24, fontWeight: "700" },
})
