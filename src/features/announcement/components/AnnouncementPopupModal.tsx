import { useEffect, useState } from "react"
import {
  BackHandler,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Portal } from "@tamagui/portal"
import Animated, { FadeIn, FadeOut } from "react-native-reanimated"
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

import { ModalOverlayHost } from "@/src/shared/components"

import { showErrorToast } from "@/src/lib/toast"

interface AnnouncementPopupModalProps {
  visible: boolean
  notice: AnnouncementNotice | null
  onClose: (dismissPermanently: boolean) => void | Promise<void>
}

/**
 * 홈 진입 공지 팝업.
 *
 * **RN Modal 이 아니다 — 일부러.** 이 팝업은 홈 진입 직후 네트워크 응답 시점에
 * 뜨는데, 같은 순간에 복구된 분석 결과(FoodAnalysisResult pageSheet)나 권장
 * 업데이트 안내가 함께 present 될 수 있다. iOS 에서 네이티브 모달 둘의 전환이
 * 겹치면 UIKit 이 꼬여 앱 전체 터치가 죽는다(LoadingOverlay 머리말 — 2026-08-03
 * 홈 시작 시점 프리징이 이 조합으로 관찰됐다). 루트 포털 JS 오버레이로 그리면
 * UIKit 전환이 없어 시작 시점 경쟁에서 빠진다. 네이티브 pageSheet 와 겹치면
 * 그쪽이 위를 덮고, 닫히면 팝업이 그대로 남아 있다 — 순서 조율이 필요 없다.
 */
export function AnnouncementPopupModal({
  visible,
  notice,
  onClose,
}: AnnouncementPopupModalProps) {
  if (!visible || !notice) return null
  return (
    <Portal>
      {/* 같은 세션에 다른 공지가 갈아끼워져도 체크박스 상태가 새로 시작하도록 */}
      <AnnouncementPopupCard
        key={notice.id}
        notice={notice}
        onClose={onClose}
      />
    </Portal>
  )
}

function AnnouncementPopupCard({
  notice,
  onClose,
}: {
  notice: AnnouncementNotice
  onClose: AnnouncementPopupModalProps["onClose"]
}) {
  const { t } = useTranslation()
  // 보일 때만 마운트되므로 상태는 수명과 함께 초기화된다.
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [isOpeningLink, setIsOpeningLink] = useState(false)
  const { colors } = useV2Theme()

  const close = (dismissPermanently = dontShowAgain) => {
    void onClose(dismissPermanently)
  }

  // 네이티브 Modal 시절의 onRequestClose 와 같게, 안드로이드 뒤로가기는 닫기다.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      void onClose(false)
      return true
    })
    return () => sub.remove()
    // onClose 는 activeNotice 를 캡처한 useCallback — 최신 것을 쓴다.
  }, [onClose])

  const handlePrimaryPress = async () => {
    const hasCta = Boolean(notice.ctaLabel && notice.linkUrl)
    if (!hasCta || !notice.linkUrl) {
      close()
      return
    }

    const targetUrl = normalizeAnnouncementLink(notice.linkUrl)
    if (!targetUrl) {
      showErrorToast(
        t("announcement.linkErrorTitle"),
        t("announcement.invalidLinkBody"),
      )
      return
    }

    setIsOpeningLink(true)
    try {
      await Linking.openURL(targetUrl)
    } catch {
      showErrorToast(
        t("announcement.linkErrorTitle"),
        t("announcement.openLinkErrorBody"),
      )
      return
    } finally {
      setIsOpeningLink(false)
    }

    close()
  }

  const hasCta = Boolean(notice.ctaLabel && notice.linkUrl)

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={StyleSheet.absoluteFill}
      // 뒤 화면 조작을 막는 게 딤의 역할 — 손잡이 없는 View 는 탭이 새므로 응답자를 자처한다.
      onStartShouldSetResponder={() => true}
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
                    hasCta ? (notice.ctaLabel ?? undefined) : t("action.close")
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

      {/* 이 오버레이가 루트 토스트 호스트 위에 그려지므로 안쪽에도 호스트를 둔다
          (마지막 마운트가 이기는 규칙 — ModalOverlayHost 머리말). */}
      <ModalOverlayHost />
    </Animated.View>
  )
}
