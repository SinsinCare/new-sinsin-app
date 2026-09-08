import { Text } from "@/src/design-system-v2/primitives/NativeText"
import { memo, useState } from "react"
import { StyleSheet, useWindowDimensions } from "react-native"
import { Pressable, ScrollView } from "react-native-gesture-handler"
import { Image } from "expo-image"
import { useTranslation } from "react-i18next"

import {
  radius,
  spacing,
  typography,
  useV2Theme,
  V2Icon,
} from "@/src/design-system-v2"
import { remoteImageSource } from "@/src/shared/images/remoteImageSource"
import { GUTTER } from "../layout"
import { realPhotoUrls } from "../utils/stockPhoto"

export const RESTAURANT_PHOTO_HEIGHT = 128
const PHOTO_GAP = spacing[2]

/** The existing card response supplies these previews; no per-venue detail requests. */
export const PhotoStrip = memo(function PhotoStrip({
  urls,
  name,
  onPress,
}: {
  urls: readonly string[]
  name: string
  onPress?: (urls: readonly string[], index: number) => void
}) {
  const { width } = useWindowDimensions()
  const photos = realPhotoUrls(urls).slice(0, 3)
  if (photos.length === 0) return null

  const available = width - GUTTER * 2
  // The third image peeks in, making horizontal scrolling apparent.
  const tileWidth =
    photos.length < 3
      ? (available - PHOTO_GAP * (photos.length - 1)) / photos.length
      : (available - PHOTO_GAP * 2) / 2.8

  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      directionalLockEnabled
      bounces={false}
      overScrollMode="never"
      showsHorizontalScrollIndicator={false}
      style={styles.rail}
      contentContainerStyle={styles.content}
    >
      {photos.map((url, index) => (
        <PhotoTile
          key={url}
          url={url}
          name={name}
          index={index}
          width={tileWidth}
          onPress={onPress ? () => onPress(photos, index) : undefined}
        />
      ))}
    </ScrollView>
  )
})

function PhotoTile({
  url,
  name,
  index,
  width,
  onPress,
}: {
  url: string
  name: string
  index: number
  width: number
  onPress?: () => void
}) {
  const { colors } = useV2Theme()
  const { t } = useTranslation("common")
  const [failed, setFailed] = useState(false)

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("restaurant.photoAccessibility", {
        name,
        number: index + 1,
      })}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { width, backgroundColor: colors.fill.normal },
        pressed && styles.pressed,
      ]}
    >
      {failed ? (
        <>
          <V2Icon name="fork" size="sm" color={colors.label.alternative} />
          <Text
            style={[typography.caption.small, { color: colors.label.neutral }]}
          >
            {t("restaurant.card.photoUnavailable")}
          </Text>
        </>
      ) : (
        <Image
          source={remoteImageSource(url)}
          recyclingKey={url}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          accessibilityLabel={t("restaurant.photoAccessibility", {
            name,
            number: index + 1,
          })}
          onError={() => setFailed(true)}
        />
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  rail: {
    height: RESTAURANT_PHOTO_HEIGHT,
    flexGrow: 0,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  content: { gap: PHOTO_GAP },
  pressed: { opacity: 0.7 },
  tile: {
    height: RESTAURANT_PHOTO_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[4],
  },
})
