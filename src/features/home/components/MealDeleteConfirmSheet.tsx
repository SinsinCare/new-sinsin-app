import { Image, StyleSheet, Text, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { V2BottomSheet, useV2Theme } from "@/src/design-system-v2"
import { useTranslation } from "react-i18next"
import type { MealType } from "../types"

export interface MealDeletePreview {
  mealType: MealType | null
  /** 미리보기에 실물 사진을 쓴다 — 무엇을 지우는지 카드로 먼저 보여주는 시트라서. */
  imageUri: string | null
  /** 서버 createdAt(naive UTC). "Z" 를 붙여 현지 시각으로 그린다. */
  recordedAt: string | null
}

/**
 * 식사 기록 삭제 확인 — 시트 시안(2026-08-03) "되돌릴 수 없는 것의 비용".
 *
 * 무엇을 지우는지 카드로 **먼저 미리보기** — 오귀속 삭제 방지. '그대로 두기'를
 * 동급 크기로 나란히 두고, 레드는 지우기에만 쓴다. 사진만 바꾸려는 사용자에게는
 * 문장으로 수정 경로를 먼저 권한다. 실행 취소가 없는 동작이라 확인 비용을
 * 의도적으로 남긴다(그 외 되돌릴 수 있는 동작은 토스트가 맡는다).
 */
export function MealDeleteConfirmSheet({
  visible,
  preview,
  onKeep,
  onDelete,
}: {
  visible: boolean
  preview: MealDeletePreview
  onKeep: () => void
  onDelete: () => void
}) {
  const { t, i18n } = useTranslation("common")
  const { colors } = useV2Theme()

  const mealLabel = preview.mealType
    ? t(`meal.${preview.mealType}`)
    : t("foodResult.deletePreviewFallback")
  const photoLabel =
    preview.imageUri !== null ? t("foodResult.deletePreviewPhoto") : null

  const timeLabel = (() => {
    if (!preview.recordedAt) return null
    const raw = preview.recordedAt
    const parsed = new Date(raw.endsWith("Z") ? raw : raw + "Z")
    if (isNaN(parsed.getTime())) return null
    const time = new Intl.DateTimeFormat(
      i18n.language.startsWith("en") ? "en-US" : "ko-KR",
      { hour: "numeric", minute: "2-digit" },
    ).format(parsed)
    const now = new Date()
    const isToday =
      parsed.getFullYear() === now.getFullYear() &&
      parsed.getMonth() === now.getMonth() &&
      parsed.getDate() === now.getDate()
    return isToday
      ? `${t("home.sheet.today")} ${time}`
      : `${parsed.getMonth() + 1}.${parsed.getDate()} ${time}`
  })()

  return (
    <V2BottomSheet
      visible={visible}
      onClose={onKeep}
      title={t("foodResult.deleteConfirmTitle")}
      showClose
      secondaryLabel={t("foodResult.deleteKeep")}
      onSecondary={onKeep}
      primaryLabel={t("foodResult.deleteAction")}
      primaryColor="danger"
      onPrimary={onDelete}
    >
      <View style={styles.body}>
        {/* 지울 대상 미리보기 — 사진이 있으면 사진이 제일 정확한 미리보기다. */}
        <View
          style={[styles.previewCard, { backgroundColor: colors.fill.normal }]}
        >
          {preview.imageUri ? (
            <Image
              source={{ uri: preview.imageUri }}
              style={styles.previewImage}
            />
          ) : (
            <View
              style={[
                styles.previewIcon,
                { backgroundColor: colors.background.default },
              ]}
            >
              <Ionicons
                name="restaurant-outline"
                size={20}
                color={colors.label.neutral}
              />
            </View>
          )}
          <View style={styles.previewText}>
            <Text
              style={[styles.previewTitle, { color: colors.label.normal }]}
              numberOfLines={1}
            >
              {photoLabel ? `${mealLabel} · ${photoLabel}` : mealLabel}
            </Text>
            {timeLabel ? (
              <Text
                style={[styles.previewSub, { color: colors.label.alternative }]}
              >
                {timeLabel}
              </Text>
            ) : null}
          </View>
        </View>

        <Text style={[styles.bodyText, { color: colors.label.neutral }]}>
          {t("foodResult.deleteConfirmBody")}
        </Text>
      </View>
    </V2BottomSheet>
  )
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 24,
    marginTop: 20,
    gap: 16,
  },
  previewCard: {
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  previewImage: { width: 44, height: 44, borderRadius: 10 },
  previewIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  previewText: { flex: 1, gap: 2 },
  previewTitle: { fontSize: 15, lineHeight: 21, fontWeight: "600" },
  previewSub: { fontSize: 12.5, lineHeight: 17 },
  bodyText: { fontSize: 14.5, lineHeight: 22 },
})
