import { memo, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import { Image } from "expo-image"
import {
  radius,
  spacing,
  typography,
  useV2Theme,
  V2Icon,
} from "@/src/design-system-v2"
import { remoteImageSource } from "@/src/shared/images/remoteImageSource"
import { realPhotoUrls } from "../utils/stockPhoto"

/** A stable, single thumbnail keeps comparison rows compact and avoids nested scrolling. */
export const RestaurantThumbnail = memo(function RestaurantThumbnail({
  urls,
  name,
}: {
  urls: readonly string[]
  name: string
}) {
  const { colors } = useV2Theme()
  const { t } = useTranslation("common")
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set())
  const url = realPhotoUrls(urls).find((value) => !failed.has(value))
  return (
    <View style={[styles.frame, { backgroundColor: colors.fill.normal }]}>
      {url ? (
        <Image
          source={remoteImageSource(url)}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          recyclingKey={`${name}:${url}`}
          accessibilityLabel={name}
          onError={() => setFailed((previous) => new Set([...previous, url]))}
        />
      ) : (
        <>
          <V2Icon name="fork" size="sm" color={colors.label.alternative} />
          <Text
            style={[typography.caption.small, { color: colors.label.neutral }]}
          >
            {t("restaurant.card.photoUnavailable")}
          </Text>
        </>
      )}
    </View>
  )
})
const styles = StyleSheet.create({
  frame: {
    width: 96,
    minHeight: 96,
    alignSelf: "stretch",
    borderRadius: radius.lg,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[4],
  },
})
