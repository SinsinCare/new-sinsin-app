import { useEffect, useState } from "react"
import {
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  View,
} from "react-native"
import { Image } from "expo-image"
import { Text, YStack } from "tamagui"
import { Button, Checkbox } from "@/src/shared/components"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { tokens } from "@/src/theme/tokens"
import type { AnnouncementNotice } from "../types"

interface AnnouncementPopupModalProps {
  visible: boolean
  notice: AnnouncementNotice | null
  onClose: (dismissPermanently: boolean) => void | Promise<void>
}

export function AnnouncementPopupModal({
  visible,
  notice,
  onClose,
}: AnnouncementPopupModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const isDark = useAppColorScheme() === "dark"

  useEffect(() => {
    if (visible) setDontShowAgain(false)
  }, [visible, notice?.id])

  if (!notice) return null

  const cardBg = isDark ? tokens.color.cardBgDark.val : "white"
  const textColor = isDark ? tokens.color.textDark.val : tokens.color.black.val
  const bodyColor = isDark
    ? tokens.color.textDarkSub.val
    : tokens.color.grey3.val
  const borderColor = isDark
    ? tokens.color.grey4.val
    : tokens.color.borderLight.val
  const hasCta = Boolean(notice.ctaLabel && notice.linkUrl)

  const handleCtaPress = async () => {
    if (!notice.linkUrl) return
    try {
      await Linking.openURL(notice.linkUrl)
      await onClose(dontShowAgain)
    } catch {
      Alert.alert("링크를 열 수 없어요", "잠시 후 다시 시도해주세요.")
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => onClose(false)}
    >
      <View style={styles.backdrop}>
        <YStack
          width="86%"
          maxWidth={420}
          maxHeight="74%"
          backgroundColor={cardBg}
          borderRadius="$4"
          padding="$5"
          gap="$4"
          borderWidth={StyleSheet.hairlineWidth}
          borderColor={borderColor}
        >
          {notice.imageUrl && (
            <Image
              source={{ uri: notice.imageUrl }}
              style={styles.bannerImage}
              contentFit="cover"
              transition={120}
              accessibilityLabel={`${notice.title} 이미지`}
            />
          )}

          <YStack gap="$2">
            <Text fontSize="$7" fontWeight="700" color={textColor}>
              {notice.title}
            </Text>
            <Text fontSize="$3" color={bodyColor}>
              공지사항
            </Text>
          </YStack>

          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <Text fontSize="$4" lineHeight={23} color={bodyColor}>
              {notice.content}
            </Text>
          </ScrollView>

          <YStack gap="$4">
            <Checkbox
              checked={dontShowAgain}
              onToggle={() => setDontShowAgain((value) => !value)}
              label="다시 안 보기"
            />
            {hasCta && (
              <Button fullWidth onPress={() => void handleCtaPress()}>
                {notice.ctaLabel}
              </Button>
            )}
            <Button fullWidth onPress={() => onClose(dontShowAgain)}>
              닫기
            </Button>
          </YStack>
        </YStack>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.46)",
    paddingHorizontal: 20,
  },
  contentScroll: {
    flexGrow: 0,
  },
  contentContainer: {
    paddingVertical: 4,
  },
  bannerImage: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 8,
    backgroundColor: "#EDEDED",
  },
})
