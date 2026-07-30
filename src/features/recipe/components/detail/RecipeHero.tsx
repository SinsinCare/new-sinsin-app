/**
 * 히어로 이미지와 그 위의 상단 바(계약 §6.2 "스크롤에 따라 축소, 상단에 저장/공유").
 *
 * 두 가지를 나눠 뒀다:
 *   `RecipeHeroImage` — 스크롤에 따라 움직이는 사진. 스크롤 값은 화면이 소유한다.
 *   `RecipeDetailTopBar` — 스크롤과 무관하게 고정된 뒤로/저장/공유.
 * 한 컴포넌트에 넣으면 사진과 함께 버튼도 밀려 올라가 버린다.
 *
 * 색 애니메이션(흰 아이콘 ↔ 검은 아이콘)을 하지 않는 이유: `useNativeDriver` 로 색을
 * 보간할 수 없어 JS 스레드에서 프레임마다 색을 계산해야 하고, 스크롤 중에 그게 제일 먼저
 * 끊긴다. 대신 아이콘을 **반투명 검은 원**에 올린다 — 사진 위에서도, 흰 배경 위에서도 읽힌다.
 *
 * 이미지가 없는 레시피(큐레이션 카탈로그에 흔하다)는 회색 자리를 300px 씩 잡지 않는다.
 * 아이콘 하나만 둔 낮은 헤더로 줄인다(`HERO_HEIGHT_EMPTY`).
 */
import { Animated, Pressable, StyleSheet } from "react-native"
import { Image } from "expo-image"
import Ionicons from "@expo/vector-icons/Ionicons"
import { View, XStack } from "tamagui"
import { useTranslation } from "react-i18next"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT } from "@/src/theme/surface"

export const HERO_HEIGHT_IMAGE = 300
export const HERO_HEIGHT_EMPTY = 96

export function heroHeight(imageUrl: string | null): number {
  return imageUrl ? HERO_HEIGHT_IMAGE : HERO_HEIGHT_EMPTY
}

export interface RecipeHeroImageProps {
  imageUrl: string | null
  scrollY: Animated.Value
}

export function RecipeHeroImage({ imageUrl, scrollY }: RecipeHeroImageProps) {
  const surface = useSurface()
  const height = heroHeight(imageUrl)

  if (!imageUrl) {
    return (
      <View
        position="absolute"
        top={0}
        left={0}
        right={0}
        height={height}
        backgroundColor={surface.surface}
      />
    )
  }

  const translateY = scrollY.interpolate({
    inputRange: [-height, 0, height],
    outputRange: [-height / 2, 0, height * 0.35],
    extrapolateRight: "clamp",
  })
  // 위로 당길 때만 커진다(iOS 바운스). 아래로 스크롤하면 1 에서 멈춘다.
  const scale = scrollY.interpolate({
    inputRange: [-height, 0],
    outputRange: [1.6, 1],
    extrapolateRight: "clamp",
  })
  const opacity = scrollY.interpolate({
    inputRange: [0, height * 0.75],
    outputRange: [1, 0.3],
    extrapolate: "clamp",
  })

  return (
    <Animated.View
      style={[
        styles.hero,
        { height, backgroundColor: surface.surface },
        { opacity, transform: [{ translateY }, { scale }] },
      ]}
      pointerEvents="none"
    >
      <Image
        source={{ uri: imageUrl }}
        style={styles.heroImage}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    </Animated.View>
  )
}

export interface RecipeDetailTopBarProps {
  top: number
  saved: boolean
  onBack: () => void
  onToggleSave: () => void
  onShare: () => void
  /** 저장 요청 중에는 다시 눌러도 무시한다(절대 상태라 연타 자체는 안전하다). */
  saveBusy?: boolean
}

export function RecipeDetailTopBar({
  top,
  saved,
  onBack,
  onToggleSave,
  onShare,
  saveBusy = false,
}: RecipeDetailTopBarProps) {
  const { t } = useTranslation("recipe")

  return (
    <XStack
      position="absolute"
      top={top}
      left={0}
      right={0}
      paddingHorizontal={LAYOUT.screenX}
      paddingVertical={8}
      alignItems="center"
      justifyContent="space-between"
      zIndex={10}
    >
      <CircleButton
        icon="chevron-back"
        label={t("detail.back")}
        onPress={onBack}
      />
      <XStack gap={8}>
        <CircleButton
          icon={saved ? "bookmark" : "bookmark-outline"}
          label={
            saved
              ? t("detail.unsaveAccessibility")
              : t("detail.saveAccessibility")
          }
          selected={saved}
          disabled={saveBusy}
          onPress={onToggleSave}
        />
        <CircleButton
          icon="share-outline"
          label={t("detail.shareAccessibility")}
          onPress={onShare}
        />
      </XStack>
    </XStack>
  )
}

function CircleButton({
  icon,
  label,
  onPress,
  selected = false,
  disabled = false,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
  selected?: boolean
  disabled?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View
        width={36}
        height={36}
        borderRadius={18}
        alignItems="center"
        justifyContent="center"
        // 사진 위·흰 배경 위 어디서나 읽히는 유일한 방법. 색을 스크롤에 맞춰 바꾸지 않는다.
        backgroundColor="rgba(0,0,0,0.42)"
      >
        <Ionicons name={icon} size={19} color="#FFFFFF" />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  hero: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
  },
  heroImage: { width: "100%", height: "100%" },
})
