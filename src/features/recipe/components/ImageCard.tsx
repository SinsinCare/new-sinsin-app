import { useEffect, useState } from "react"
import { Image, useColorScheme } from "react-native"
import { XStack, YStack, Text } from "tamagui"
import { Icon } from "@/src/shared/components"

const ICON_COLOR = {
  light: "#FF9775",
  dark: "#E78A63D9",
} as const
const PLACEHOLDER = require("@/assets/images/Sin_light.png")
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
  const colorScheme = useColorScheme()
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

  return (
    <YStack borderRadius={10} overflow="hidden">
      <YStack aspectRatio={aspectRatio}>
        <Image
          source={errored ? PLACEHOLDER : { uri: imageUri }}
          onError={() => setErrored(true)}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      </YStack>
      <XStack
        position="absolute"
        bottom={12}
        right={12}
        alignItems="center"
        gap="$3"
      >
        <XStack alignItems="center" gap="$1">
          <Icon
            name="hands-clap"
            size={20}
            color={ICON_COLOR[isDark ? "dark" : "light"]}
          />
          <Text fontSize={14} lineHeight={20} fontWeight="500" color="white">
            {likeCount}
          </Text>
        </XStack>
        <XStack alignItems="center" gap="$1">
          <Icon
            name="message"
            size={20}
            color={ICON_COLOR[isDark ? "dark" : "light"]}
          />
          <Text fontSize={14} lineHeight={20} fontWeight="500" color="white">
            {commentCount}
          </Text>
        </XStack>
      </XStack>
    </YStack>
  )
}
