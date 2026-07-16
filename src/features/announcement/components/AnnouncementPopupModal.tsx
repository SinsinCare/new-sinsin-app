import { useEffect, useState } from "react"
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native"
import { Image } from "expo-image"
import {
  V2Badge,
  V2Button,
  V2Checkbox,
  V2Icon,
  V2IconButton,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import { normalizeAnnouncementLink } from "../data/announcementLink"
import type { AnnouncementNotice } from "../types"
import { announcementPopupStyles as styles } from "./announcementPopupStyles"

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
  const [isOpeningLink, setIsOpeningLink] = useState(false)
  const { colors } = useV2Theme()

  useEffect(() => {
    if (!visible) return
    setDontShowAgain(false)
    setIsOpeningLink(false)
  }, [visible, notice?.id])

  if (!notice) return null

  const hasCta = Boolean(notice.ctaLabel && notice.linkUrl)
  const close = (dismissPermanently = dontShowAgain) => {
    void onClose(dismissPermanently)
  }

  const handlePrimaryPress = async () => {
    if (!hasCta || !notice.linkUrl) {
      close()
      return
    }

    const targetUrl = normalizeAnnouncementLink(notice.linkUrl)
    if (!targetUrl) {
      Alert.alert(
        "링크를 열 수 없어요",
        "공지에 등록된 링크 형식을 확인해주세요.",
      )
      return
    }

    setIsOpeningLink(true)
    try {
      await Linking.openURL(targetUrl)
    } catch {
      Alert.alert("링크를 열 수 없어요", "잠시 후 다시 시도해주세요.")
      return
    } finally {
      setIsOpeningLink(false)
    }

    close()
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => close(false)}
    >
      <View
        style={[styles.backdrop, { backgroundColor: colors.background.dim }]}
      >
        <View
          accessibilityViewIsModal
          onAccessibilityEscape={() => close(false)}
          style={[
            styles.card,
            {
              backgroundColor: colors.background.floated,
              borderColor: colors.line.alternative,
            },
          ]}
        >
          {notice.imageUrl && (
            <Image
              source={{ uri: notice.imageUrl }}
              style={[
                styles.heroImage,
                { backgroundColor: colors.fill.background },
              ]}
              contentFit="cover"
              transition={120}
              accessibilityLabel={`${notice.title} 공지 이미지`}
            />
          )}

          <View style={styles.content}>
            <View style={styles.headerRow}>
              <View style={styles.headerMeta}>
                {!notice.imageUrl && (
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: colors.primary.primaryWeak },
                    ]}
                  >
                    <V2Icon
                      name="announcement"
                      size="sm"
                      color={colors.primary.primary}
                    />
                  </View>
                )}
                <V2Badge size="xs" color="brand" variant="weak">
                  새로운 소식
                </V2Badge>
              </View>

              <V2IconButton
                name="close"
                size="s"
                variant="fill"
                accessibilityLabel="공지 닫기"
                onPress={() => close()}
              />
            </View>

            <Text
              accessibilityRole="header"
              style={[
                typography.title.xSmallWeak,
                { color: colors.label.normal },
              ]}
            >
              {notice.title}
            </Text>

            <ScrollView
              style={styles.bodyScroll}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Text
                style={[
                  typography.subtext.large,
                  { color: colors.label.neutral },
                ]}
              >
                {notice.content}
              </Text>
            </ScrollView>

            <View
              style={[
                styles.footer,
                { borderTopColor: colors.line.alternative },
              ]}
            >
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel="이 공지 다시 보지 않기"
                accessibilityState={{ checked: dontShowAgain }}
                onPress={() => setDontShowAgain((value) => !value)}
                style={({ pressed }) => [
                  styles.dismissRow,
                  pressed && styles.pressed,
                ]}
              >
                <V2Checkbox
                  accessible={false}
                  pointerEvents="none"
                  size="s"
                  checked={dontShowAgain}
                />
                <Text
                  style={[
                    typography.subtext.medium,
                    { color: colors.label.neutral },
                  ]}
                >
                  이 공지 다시 보지 않기
                </Text>
              </Pressable>

              <V2Button
                fullWidth
                size="m"
                color="brand"
                variant="fill"
                loading={isOpeningLink}
                onPress={() => void handlePrimaryPress()}
                style={styles.primaryButton}
              >
                {hasCta ? notice.ctaLabel : "확인"}
              </V2Button>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}
