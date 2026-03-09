import { useEffect, useRef } from "react"
import { Animated, useColorScheme } from "react-native"
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
import FireEmpty from "@/assets/icons/fire-empty.svg"
import CheckEmpty from "@/assets/icons/check-empty.svg"
import FireColor from "@/assets/icons/fire-color.svg"
import CheckColor from "@/assets/icons/check-color.svg"
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

type CharacterType = "character_1" | "character_2" | "character_3"

interface CharacterSectionProps {
  selectedDate: Date
  hasRecord: boolean
  characterType: CharacterType
  streak: number
  withinLimits: boolean
}

export function CharacterSection({
  selectedDate: _selectedDate,
  hasRecord,
  characterType,
  streak,
  withinLimits,
}: CharacterSectionProps) {
  const FireIcon = hasRecord ? FireColor : FireEmpty
  const CheckIcon = withinLimits ? CheckColor : CheckEmpty
  const streakText =
    streak > 0 ? `연속 ${streak}일 기록중` : "오늘은 기록이 없어요"
  const guideText = withinLimits
    ? "영양소 제한조건을 잘 지켰어요"
    : "영양소 제한조건을 지켜 식사해요"

  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"

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
    <YStack borderRadius="$6" padding="$7" gap="$7" alignItems="center">
      <YStack alignItems="center">
        <Animated.View style={{ transform: [{ translateY: floatY }] }}>
          <Icon name={characterType} size={200} />
        </Animated.View>
        <Animated.View
          style={{ transform: [{ scaleX: shadowScale }], marginTop: -20 }}
        >
          <ShadowEllipse dark={isDark} />
        </Animated.View>
      </YStack>
      <YStack>
        <XStack
          alignItems="center"
          justifyContent="center"
          gap="$2"
          paddingHorizontal={18}
          paddingVertical={5}
          borderRadius="$6"
        >
          <FireIcon width={24} height={24} />
          <Text fontSize={17} fontWeight="600">
            {streakText}
          </Text>
        </XStack>

        <XStack
          alignItems="center"
          justifyContent="center"
          gap="$2"
          paddingHorizontal={18}
          paddingVertical={5}
          borderRadius="$6"
        >
          <CheckIcon width={24} height={24} />
          <Text fontSize={17} fontWeight="600">
            {guideText}
          </Text>
        </XStack>
      </YStack>
    </YStack>
  )
}
