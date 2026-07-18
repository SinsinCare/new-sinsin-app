import { useEffect, useRef } from "react"
import { Animated, Image, StyleSheet } from "react-native"
import type { ImageSourcePropType } from "react-native"
import { LinearGradient as ExpoLinearGradient } from "expo-linear-gradient"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import {
  Defs,
  Ellipse,
  FeGaussianBlur,
  Filter,
  LinearGradient,
  Stop,
  Svg,
} from "react-native-svg"
import { Text, XStack, YStack } from "tamagui"
import { Icon } from "@/src/shared/components/Icon"

function ShadowEllipse({ dark }: { dark?: boolean }) {
  const edgeColor = dark ? "#1D1D1D" : "#666666"
  const midColor = dark ? "#000000" : "#000000"
  const stopOpacity = dark ? 1 : 0.1

  return (
    <Svg width={119} height={32} viewBox="0 0 119 32">
      <Defs>
        <Filter
          id="blur"
          x="0"
          y="0"
          width="118.2"
          height="31.2"
          filterUnits="userSpaceOnUse"
        >
          <FeGaussianBlur stdDeviation={4.55} />
        </Filter>
        <LinearGradient
          id="grad"
          x1="9.1001"
          y1="15.6"
          x2="109.1"
          y2="15.6"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={edgeColor} stopOpacity={stopOpacity} />
          <Stop offset="0.5" stopColor={midColor} stopOpacity={stopOpacity} />
          <Stop offset="1" stopColor={edgeColor} stopOpacity={stopOpacity} />
        </LinearGradient>
      </Defs>
      <Ellipse
        cx={59.1}
        cy={15.6}
        rx={50}
        ry={6.5}
        fill="url(#grad)"
        filter="url(#blur)"
      />
    </Svg>
  )
}

type CharacterType =
  | "character-excellent"
  | "character-good"
  | "character-caution"

/** 유저의 데이터 입력 상태에 따라 깔리는 배경 종류 */
export type CharacterBackgroundVariant = "low" | "high"

const BACKGROUND_SOURCES: Record<
  CharacterBackgroundVariant,
  ImageSourcePropType
> = {
  low: require("@/assets/images/home-bg-low.png"),
  high: require("@/assets/images/home-bg-high.png"),
}

interface CharacterSectionProps {
  selectedDate: Date
  hasRecord: boolean
  characterType: CharacterType
  streak: number
  withinLimits: boolean
  backgroundVariant: CharacterBackgroundVariant
}

export function CharacterSection({
  selectedDate: _selectedDate,
  hasRecord,
  characterType,
  streak,
  withinLimits,
  backgroundVariant,
}: CharacterSectionProps) {
  const isDarkMode = useAppColorScheme() === "dark"
  const fireIconName = hasRecord ? "fire-color" : "fire-dark"
  const checkIconName = withinLimits ? "check-color" : "check-dark"
  const streakText =
    streak > 0 ? `연속 ${streak}일 기록중` : "오늘은 식이 기록이 없어요"
  const guideText = withinLimits
    ? "영양소 제한조건을 잘 지켰어요"
    : "영양소 제한조건을 지켜 식사해요"
  const floatY = useRef(new Animated.Value(0)).current
  const shadowScale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(floatY, {
            toValue: -12,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(shadowScale, {
            toValue: 0.85,
            duration: 1800,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(floatY, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(shadowScale, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start()
  }, [floatY, shadowScale])

  return (
    <YStack
      borderRadius="$6"
      padding="$7"
      gap="$1"
      alignItems="center"
      overflow="hidden"
    >
      {/* 캐릭터 뒤에 깔리는 배경 (z축 가장 뒤) */}
      <Image
        source={BACKGROUND_SOURCES[backgroundVariant]}
        style={styles.background}
        resizeMode="cover"
      />
      <ExpoLinearGradient
        pointerEvents="none"
        colors={["transparent", "rgba(0, 0, 0, 0.58)"]}
        locations={[0, 1]}
        style={styles.statusContrastGradient}
      />
      <YStack alignItems="center">
        <Animated.View style={{ transform: [{ translateY: floatY }] }}>
          <Icon name={characterType} size={200} />
        </Animated.View>
        <Animated.View
          style={{ transform: [{ scaleX: shadowScale }], marginTop: -12 }}
        >
          <ShadowEllipse dark={isDarkMode} />
        </Animated.View>
      </YStack>
      <YStack
        width="100%"
        paddingHorizontal="$3"
        paddingVertical="$2"
        borderRadius="$5"
        backgroundColor="rgba(0, 0, 0, 0.36)"
      >
        <XStack
          alignItems="center"
          justifyContent="center"
          gap="$2"
          paddingVertical={4}
          borderRadius="$6"
        >
          <Icon name={fireIconName} size={26} />
          <Text fontSize={18} fontWeight="600" color="white" numberOfLines={1}>
            {streakText}
          </Text>
        </XStack>

        <XStack
          alignItems="center"
          justifyContent="center"
          gap="$2"
          paddingVertical={5}
          borderRadius="$6"
        >
          <Icon name={checkIconName} size={26} />
          <Text fontSize={18} fontWeight="600" color="white" numberOfLines={1}>
            {guideText}
          </Text>
        </XStack>
      </YStack>
    </YStack>
  )
}

const styles = StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },
  statusContrastGradient: {
    ...StyleSheet.absoluteFillObject,
    top: "55%",
  },
})
