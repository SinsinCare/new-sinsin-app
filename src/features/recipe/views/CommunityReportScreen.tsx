import { useMemo, useState } from "react"
import { Pressable, ScrollView, StyleSheet, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useLocalSearchParams } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"

import { Text } from "@/src/shared/components/AppText"
import { useAppRouter } from "@/src/shared/navigation"
import { useSurface } from "@/src/hooks/useSurface"
import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import {
  V2BottomSheet,
  V2Button,
  V2SheetTextInput,
  V2TextField,
  spacing,
} from "@/src/design-system-v2"
import { communityPostService } from "../services/communityPostService"
import { presentCommunityError } from "../utils/communityError"
import { showSuccessToast } from "@/src/lib/toast"

const REASON_LABEL_KEYS = {
  falseHealth: "community.reportForm.falseHealth",
  harassment: "community.reportForm.harassment",
  spam: "community.reportForm.spam",
  privacy: "community.reportForm.privacy",
  copyright: "community.reportForm.copyright",
  inappropriate: "community.reportForm.inappropriate",
  other: "community.reportForm.other",
} as const

const REASONS = [
  { key: "falseHealth", api: "FALSE_INFORMATION" },
  { key: "harassment", api: "HARASSMENT" },
  { key: "spam", api: "SPAM" },
  { key: "privacy", api: "INAPPROPRIATE_CONTENT" },
  { key: "copyright", api: "INAPPROPRIATE_CONTENT" },
  { key: "inappropriate", api: "INAPPROPRIATE_CONTENT" },
  { key: "other", api: "OTHER" },
] as const

type ReasonKey = (typeof REASONS)[number]["key"]

/** 기타 사유 입력 상한. 서버 `description` 상한(500) 안에 사유 라벨 줄까지 넣고도 남는다. */
const OTHER_MAX = 300

export function CommunityReportScreen() {
  const { t } = useTranslation("common")
  const router = useAppRouter()
  const surface = useSurface()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ postId?: string }>()
  const postId = typeof params.postId === "string" ? params.postId : ""
  const [selected, setSelected] = useState<Set<ReasonKey>>(new Set())
  const [otherOpen, setOtherOpen] = useState(false)
  const [otherDraft, setOtherDraft] = useState("")
  const [otherText, setOtherText] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const canSubmit =
    postId.length > 0 &&
    selected.size > 0 &&
    (!selected.has("other") || otherText.trim().length > 0)

  const selectedReasonObjects = useMemo(
    () => REASONS.filter((reason) => selected.has(reason.key)),
    [selected],
  )

  const toggle = (key: ReasonKey) => {
    if (key === "other" && !selected.has(key)) {
      setOtherDraft(otherText)
      setOtherOpen(true)
      return
    }
    /*
      체크된 `기타` 를 다시 누르면 **적어 둔 문장까지 함께 지운다.** 예전에는 체크만
      풀리고 `otherText` 가 남아, 행 오른쪽 미리보기에는 고르지도 않은 사유가 계속
      떠 있었다(그리고 다시 체크하면 옛 문장이 조용히 부활했다).
    */
    if (key === "other") {
      setOtherText("")
      setOtherDraft("")
    }
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const confirmOther = () => {
    const normalized = otherDraft.trim().slice(0, OTHER_MAX)
    if (!normalized) return
    setOtherText(normalized)
    setSelected((current) => new Set(current).add("other"))
    setOtherOpen(false)
  }

  const submit = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    const primary = selectedReasonObjects[0]?.api ?? "OTHER"
    const labels = selectedReasonObjects.map((reason) =>
      t(REASON_LABEL_KEYS[reason.key]),
    )
    const description = [labels.join(", "), otherText.trim()]
      .filter(Boolean)
      .join(" — ")
      .slice(0, 500)
    try {
      await communityPostService.reportPost(postId, primary, description)
      showSuccessToast(
        t("community.reportForm.success"),
        t("community.postDetail.reportReceivedBody"),
      )
      router.back()
    } catch (error) {
      presentCommunityError(error, { scope: "community-report-form" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: surface.canvas, paddingTop: insets.top },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: surface.hairline }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("action.back")}
        >
          <Ionicons name="chevron-back" size={24} color={surface.textStrong} />
        </Pressable>
        <Text style={[styles.title, { color: surface.textStrong }]}>
          {t("community.reportForm.title")}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.description, { color: surface.text }]}>
          {t("community.reportForm.description")}
        </Text>
        <View style={styles.reasons}>
          {REASONS.map((reason) => {
            const checked = selected.has(reason.key)
            return (
              <SurfacePressable
                key={reason.key}
                onPress={() => toggle(reason.key)}
                accessibilityState={{ selected: checked }}
                baseColor={surface.surface}
                style={styles.reason}
              >
                <View
                  style={[
                    styles.check,
                    {
                      borderColor: checked ? surface.brand : surface.hairline,
                      backgroundColor: checked ? surface.brand : "transparent",
                    },
                  ]}
                >
                  {checked && (
                    <Ionicons
                      name="checkmark"
                      size={13}
                      color={surface.onBrand}
                    />
                  )}
                </View>
                <Text
                  style={[styles.reasonText, { color: surface.textStrong }]}
                >
                  {t(REASON_LABEL_KEYS[reason.key])}
                </Text>
                {reason.key === "other" && otherText.length > 0 && (
                  <Text
                    style={[styles.otherPreview, { color: surface.text }]}
                    numberOfLines={1}
                  >
                    {otherText}
                  </Text>
                )}
              </SurfacePressable>
            )
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <SurfacePressable
          onPress={submit}
          disabled={!canSubmit || submitting}
          accessibilityState={{ disabled: !canSubmit || submitting }}
          baseColor={canSubmit ? surface.brand : surface.ctaOffBg}
          style={styles.submit}
        >
          <Text
            style={[
              styles.submitText,
              { color: canSubmit ? surface.onBrand : surface.ctaOffText },
            ]}
          >
            {t("community.reportForm.submit")}
          </Text>
        </SurfacePressable>
      </View>

      {/*
        `기타 사유` 시트 — 시안 `docs/design/community-redesign/report.md` §2.6(F2·F3).

        예전엔 이 자리에 시트 크롬을 손으로 그렸다: `height 48` + 1px `surface.hairline`
        밑줄 + 15/21 텍스트, 그리고 `SurfacePressable` 로 만든 54pt 확인 버튼. v1 `surface`
        팔레트와 v2 시트가 한 화면에서 섞여, 밑줄 굵기(1 vs 2)·글자(15 vs 17)·버튼
        (54/14 vs 56/16)이 전부 시안과 어긋나 있었다. 지금은 전부 DS 부품이다:

         - 밑줄·2px `line.normal`·좌우 패딩 0·값 있을 때만 나오는 **채운 원 ✕** →
           `V2TextField variant="line" clearable`
         - 시트 안이므로 입력 구현은 `V2SheetTextInput` 을 넘긴다. 평범한 `TextInput` 은
           gorhom 에 포커스를 못 알려 키패드가 확인 버튼을 덮는다(그 컴포넌트 머리말).
         - 확인 버튼은 시트 푸터(`primaryLabel`)가 아니라 children 에 둔다 — 푸터는
           `disabled` 를 못 받아서, 빈 칸일 때 눌릴 것처럼 보이는 버튼이 남는다.

        `surface` 는 `community_report_other` 다. `community_post_category` 를 쓰던 동안
        이 시트의 `sheet_opened` 가 **글쓰기의 카테고리 고르기와 한 칸에 섞여 있었다.**
      */}
      <V2BottomSheet
        surface="community_report_other"
        visible={otherOpen}
        onClose={() => setOtherOpen(false)}
        title={t("community.reportForm.otherTitle")}
      >
        <View style={styles.sheetContent}>
          <V2TextField
            variant="line"
            inputComponent={V2SheetTextInput}
            value={otherDraft}
            onChangeText={setOtherDraft}
            placeholder={t("community.reportForm.otherPlaceholder")}
            maxLength={OTHER_MAX}
            clearable
            returnKeyType="done"
            onSubmitEditing={confirmOther}
            accessibilityLabel={t("community.reportForm.otherTitle")}
          />
          <V2Button
            size="xl"
            fullWidth
            disabled={!otherDraft.trim()}
            onPress={confirmOther}
          >
            {t("community.reportForm.confirm")}
          </V2Button>
        </View>
      </V2BottomSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    height: 54,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 17,
    lineHeight: 23,
    fontFamily: "Pretendard-Bold",
    fontWeight: "700",
  },
  headerSpacer: { width: 24 },
  content: { padding: 20, paddingBottom: 120 },
  description: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  reasons: { gap: 8 },
  reason: {
    minHeight: 52,
    borderRadius: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  reasonText: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Pretendard-Medium",
    fontWeight: "500",
  },
  otherPreview: { flex: 1, textAlign: "right", fontSize: 11.5, lineHeight: 16 },
  footer: { paddingHorizontal: 20, paddingTop: 12 },
  submit: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: "Pretendard-Bold",
    fontWeight: "700",
  },
  /* 시안 §2.6 의 시트 리듬: 타이틀 → 38.5 → 입력 → 57 → 확인. 시트가 좌우 24 로
     타이틀을 앉히므로(V2BottomSheet) 여기서도 24 로 맞춘다. */
  sheetContent: {
    paddingTop: spacing[32],
    paddingHorizontal: spacing[24],
    gap: spacing[32],
  },
})
