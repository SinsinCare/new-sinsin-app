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
import { useTranslation } from "react-i18next"

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
  const { t } = useTranslation()
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
        t("announcement.linkErrorTitle"),
        t("announcement.invalidLinkBody"),
      )
      return
    }

    setIsOpeningLink(true)
    try {
      await Linking.openURL(targetUrl)
    } catch {
      Alert.alert(
        t("announcement.linkErrorTitle"),
        t("announcement.openLinkErrorBody"),
      )
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
              accessibilityLabel={t("announcement.image", {
                title: notice.title,
              })}
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
                  {t("announcement.new")}
                </V2Badge>
              </View>

              <V2IconButton
                name="close"
                size="s"
                variant="fill"
                accessibilityLabel={t("announcement.close")}
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
              bounces={false}
              overScrollMode="never"
              style={styles.bodyScroll}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator={false}
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
                accessibilityLabel={t("announcement.dontShowAgain")}
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
                  {t("announcement.dontShowAgain")}
                </Text>
              </Pressable>

              <View style={hasCta ? styles.actionRow : undefined}>
                {hasCta && (
                  <V2Button
                    size="m"
                    color="neutral"
                    variant="weak"
                    accessibilityLabel={t("announcement.close")}
                    onPress={() => close()}
                    style={styles.actionButton}
                  >
                    {t("action.close")}
                  </V2Button>
                )}

                <V2Button
                  fullWidth={!hasCta}
                  size="m"
                  color="brand"
                  variant="fill"
                  loading={isOpeningLink}
                  accessibilityLabel={
                    hasCta
                      ? (notice.ctaLabel ?? undefined)
                      : t("action.close")
                  }
                  onPress={() => void handlePrimaryPress()}
                  style={hasCta ? styles.actionButton : styles.primaryButton}
                >
                  {hasCta ? notice.ctaLabel : t("action.close")}
                </V2Button>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}
