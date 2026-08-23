import { useEffect, useState } from "react"
import { Image, StyleSheet } from "react-native"
import { useTranslation } from "react-i18next"

import { V2HStack, V2Text, V2VStack } from "@/src/design-system-v2"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Icon } from "@/src/shared/components"
import { formatCount } from "../utils/displayNumber"

const ICON_COLOR = {
  light: "#FF9775",
  dark: "#E78A63D9",
} as const
const PLACEHOLDER = require("@/assets/images/SIn_2.png")
const DEFAULT_ASPECT_RATIO = 1

interface ImageCardProps {
  imageUri: string
  likeCount: number
  commentCount: number
}

export function ImageCard({
  imageUri,
  likeCount,
  commentCount,
}: ImageCardProps) {
  // 그릴 문구는 없지만 **언어는 필요하다** — 수의 자릿수 구분을 기기가 정하면 안 된다.
  const { i18n } = useTranslation()
  const colorScheme = useAppColorScheme()
  const isDark = colorScheme === "dark"
  const [errored, setErrored] = useState(false)
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_ASPECT_RATIO)

  useEffect(() => {
    if (imageUri) {
      Image.getSize(
        imageUri,
        (w, h) => setAspectRatio(w / h),
        () => setErrored(true),
      )
    }
  }, [imageUri])

  const iconColor = ICON_COLOR[isDark ? "dark" : "light"]

  return (
    /*
      `position: absolute` 인 지표 줄이 이 카드 기준으로 놓여야 한다.
      tamagui 는 relative 가 기본이었지만 RN 은 아니므로 명시한다.
    */
    <V2VStack style={styles.card}>
      <V2VStack style={{ aspectRatio }}>
        <Image
          source={errored ? PLACEHOLDER : { uri: imageUri }}
          onError={() => setErrored(true)}
          style={styles.image}
          resizeMode="cover"
        />
      </V2VStack>
      <V2HStack align="center" gap={12} style={styles.stats}>
        <V2HStack align="center" gap={4}>
          <Icon name="hands-clap" size={20} color={iconColor} />
          {/* 사진 위 글자라 면 색과 무관하게 흰색 고정. */}
          <V2Text style={styles.count} color="white">
            {formatCount(likeCount, i18n.language)}
          </V2Text>
        </V2HStack>
        <V2HStack align="center" gap={4}>
          <Icon name="message" size={20} color={iconColor} />
          <V2Text style={styles.count} color="white">
            {formatCount(commentCount, i18n.language)}
          </V2Text>
        </V2HStack>
      </V2HStack>
    </V2VStack>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: 10, overflow: "hidden", position: "relative" },
  image: { width: "100%", height: "100%" },
  stats: { position: "absolute", bottom: 12, right: 12 },
  count: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
})
