import { FONT_SCALE } from "@/src/design-system-v2/tokens/fontScaling"
import { useEffect } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import Animated, {
  Easing,
  ReduceMotion,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { Image } from "expo-image"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"
import { hapticSelection } from "@/src/lib/haptics"
import { useSurface } from "@/src/hooks/useSurface"
import { AUTH_LAYOUT, AUTH_MOTION, AUTH_TYPE } from "../data/authSurface"

type Gender = "MALE" | "FEMALE"

// 시트에서 추출한 실제 서비스 아이콘. Ionicons 의 ♂/♀ 기호는 시트의 일러스트와
// 무게가 달라 같은 화면에서 붕 떴다.
const OPTIONS: { key: Gender; icon: number }[] = [
  {
    key: "MALE",
    icon: require("@/assets/images/gender-male.png"),
  },
  {
    key: "FEMALE",
    icon: require("@/assets/images/gender-female.png"),
  },
]

const EASE = Easing.bezier(0.22, 1, 0.36, 1)
const TIMING = {
  duration: AUTH_MOTION.duration.fast,
  easing: EASE,
  reduceMotion: ReduceMotion.System,
}
const SPRING = {
  damping: 15,
  stiffness: 260,
  reduceMotion: ReduceMotion.System,
}

interface GenderCardProps {
  label: string
  icon: number
  selected: boolean
  onPress: () => void
}

function GenderCard({ label, icon, selected, onPress }: GenderCardProps) {
  const surface = useSurface()
  const selection = useSharedValue(selected ? 1 : 0)
  const pop = useSharedValue(1)

  useEffect(() => {
    selection.value = withTiming(selected ? 1 : 0, TIMING)
    if (selected) {
      // 고른 카드가 한 번 튄다. 두 카드 중 어느 쪽이 반응했는지 눈이 바로 잡는다.
      pop.value = withSequence(
        withTiming(1.02, { duration: 90, easing: EASE }),
        withSpring(1, SPRING),
      )
    }
  }, [pop, selected, selection])

  const cardStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      selection.value,
      [0, 1],
      [surface.surfaceSunken, surface.surfaceBrand],
    ),
    transform: [{ scale: pop.value }],
  }))

  const contentStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      selection.value,
      [0, 1],
      [surface.textWeak, surface.brand],
    ),
  }))

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={() => {
        if (!selected) hapticSelection()
        onPress()
      }}
      onPressIn={() => {
        pop.value = withTiming(0.985, { duration: 90, easing: EASE })
      }}
      onPressOut={() => {
        pop.value = withSpring(1, SPRING)
      }}
      style={styles.pressable}
    >
      {/* 선택은 면(브랜드 틴트) + 글자색 하나로만 말한다. 테두리·그림자·체크 배지를
          겹치면 같은 정보를 세 번 그리는 셈이다. */}
      <Animated.View style={[styles.card, cardStyle]}>
        <Image source={icon} style={styles.icon} contentFit="contain" />
        <Animated.Text
          maxFontSizeMultiplier={FONT_SCALE.body}
          style={[styles.label, contentStyle]}
        >
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  )
}

/** 성별 선택 카드 2종. */
export function GenderSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (g: Gender) => void
}) {
  const { t } = useTranslation("auth")
  const labels: Record<Gender, string> = {
    MALE: t("profile.gender.male"),
    FEMALE: t("profile.gender.female"),
  }
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {OPTIONS.map((opt) => (
        <GenderCard
          key={opt.key}
          label={labels[opt.key]}
          icon={opt.icon}
          selected={value === opt.key}
          onPress={() => onChange(opt.key)}
        />
      ))}
    </View>
  )
}

/**
 * 세 번째 선택지(OTHER). 목업은 카드 두 장만 그렸지만 구 화면에는 "기타"가 있었고
 * 서버도 받는 값이다. 조용히 없애면 둘 중 어느 쪽도 아닌 사람이 가입을 못 한다.
 * 카드로 올리면 목업 레이아웃이 깨지므로 아래 한 줄로 둔다.
 */
export function GenderOtherOption({
  selected,
  onPress,
}: {
  selected: boolean
  onPress: () => void
}) {
  const surface = useSurface()
  const { t } = useTranslation("auth")
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => {
        if (!selected) hapticSelection()
        onPress()
      }}
      hitSlop={12}
      style={styles.otherRow}
    >
      {selected && (
        <Ionicons name="checkmark" size={16} color={surface.brand} />
      )}
      <Text
        style={[
          styles.otherLabel,
          {
            color: selected ? surface.brand : surface.textWeak,
            fontWeight: selected ? "600" : "500",
          },
        ]}
      >
        {t("profile.gender.other")}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
  pressable: { flex: 1 },
  card: {
    // 시트: 선택 카드 128×128
    height: AUTH_LAYOUT.selectCardSize,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: AUTH_LAYOUT.radius.selectCard,
  },
  icon: { width: 44, height: 44 },
  label: {
    ...AUTH_TYPE.option,
    fontWeight: "600",
  },
  otherRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 4,
    marginTop: 18,
    paddingVertical: 6,
  },
  otherLabel: AUTH_TYPE.helper,
})
