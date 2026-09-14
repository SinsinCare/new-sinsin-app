/**
 * 1:1 문의 작성 — 홈 건강기록 6페이지·신장 정보 수정과 **같은 시스템**으로 그린다(2026-09-12).
 *
 * 뼈대는 `RecordPageShell`(큰 제목·안내문·하단 고정 CTA·키보드 도킹·키보드 내리기 버튼),
 * 문의 종류는 `RecordChoices`(중성 바탕 + 진한 테두리), 제목·내용은 같은 면
 * (`FIELD.radius`·`surfaceSunken`·포커스 `brand` 테두리)의 `TextInput`, 글자수·사진 한도는
 * `RecordFieldHint`. 치수·타이포는 `recordPageSpec` 한 벌에서만 온다.
 *
 * ## 그대로인 것 (재설계 전과 같다)
 *
 * 1. **본문 2000자 · 제목 200자(접두사 몫 제외).** 서버 계약(`inquiryCreateBody` /
 *    `user_inquiry`)과 같은 값. 여기서 임의로 낮추지 말 것.
 * 2. **제목 한도는 분류를 고르기 전에 정해지고 그 뒤로 바뀌지 않는다.** 전송 시 제목 앞에
 *    `[분류] ` 가 붙어 `subject` 를 함께 쓰는데, 고른 분류마다 한도가 출렁이면 이미 쳐 둔
 *    제목이 분류를 바꾸는 순간 잘려나간다. 현재 언어의 **가장 긴 분류 이름** 기준으로 한 번.
 * 3. **사진은 남은 자리만큼만 고르게 한다**(`MAX_INQUIRY_PHOTOS`). OS 가 한도를 안 지키면
 *    여기서 한 번 더 자르고 토스트로 말한다. 권한이 없으면 설정으로 안내한다.
 * 4. **보내기는 종류·제목·내용이 다 있어야 켜진다.** 사진이 있으면 멀티파트, 없으면 JSON —
 *    경로 선택은 `submitInquiry` 안. 성공하면 목록 쿼리를 무효화하고 돌아가 토스트.
 *    실패하면 화면을 떠나지 않는다(쓴 글이 남아야 다시 보낼 수 있다) — `presentError`.
 * 5. **쓰다 나가면 확인**(`showConfirm`, destructive).
 *
 * ## 색: 화면의 주황은 딱 하나
 *
 * 칩은 중성 바탕 + 진한 테두리(`RecordChoices`). 브랜드 주황은 **보내기 버튼 하나**가
 * 독점한다 — 칩까지 주황이면 "지금 눌러야 하는 것" 이 일곱 개가 된다.
 */

import { useCallback, useMemo, useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Image } from "expo-image"
import * as ImagePicker from "expo-image-picker"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"
import { useQueryClient } from "@tanstack/react-query"

import { TextInput } from "@/src/design-system-v2/primitives/NativeText"
import { V2Text } from "@/src/design-system-v2"
import { fontFamily } from "@/src/design-system-v2/tokens/typography"
import { useSurface } from "@/src/hooks/useSurface"
import { singleLineInputText } from "@/src/theme/surface"
import {
  MAX_INQUIRY_PHOTOS,
  submitInquiry,
} from "@/src/services/data/inquiryService"
import { INQUIRY_LIST_QUERY_KEY } from "@/src/features/settings/hooks/useInquiryList"
import { showOpenSettingsAlert } from "@/src/features/settings/utils/openAppSettings"
import { showConfirm } from "@/src/lib/dialog"
import { showCautionToast, showSuccessToast } from "@/src/lib/toast"
import { presentError } from "@/src/lib/errorMessage"
import { remoteImageSource } from "@/src/shared/images/remoteImageSource"
import { useAppRouter } from "@/src/shared/navigation"

import { RecordPageShell } from "@/src/features/home/components/record/pages/RecordPageShell"
import { RecordChoices } from "@/src/features/home/components/record/pages/RecordChoices"
import { RecordFieldHint } from "@/src/features/home/components/record/pages/RecordFieldHint"
import { recordFieldLabel } from "@/src/features/home/components/record/pages/recordInk"
import {
  FIELD,
  FORM,
  PAGE_X,
  S,
} from "@/src/features/home/components/record/pages/recordPageSpec"

/** 서버 계약(`inquiryCreateBody` / `user_inquiry`)과 같은 값. 여기서 임의로 낮추지 말 것. */
const MAX_SUBJECT = 200
const MAX_CONTENT = 2000

/** 글자수를 조용한 회색에서 끌어올리는 지점 — 한도가 눈앞일 때만 눈에 띄면 된다. */
const COUNTER_ALERT_RATIO = 0.9

/** 사진 타일 한 변. 숫자 칸 높이(88)에서 상하 여백을 뺀 값 — 신장 정보 화면의 선택 행과 같은 셈법. */
const PHOTO_TILE = FIELD.height - S[6]

const INQUIRY_CATEGORIES = [
  { value: "app", labelKey: "inquiry.categories.app" },
  { value: "health", labelKey: "inquiry.categories.health" },
  { value: "content", labelKey: "inquiry.categories.content" },
  { value: "billing", labelKey: "inquiry.categories.billing" },
  { value: "account", labelKey: "inquiry.categories.account" },
  { value: "other", labelKey: "inquiry.categories.other" },
] as const

type InquiryCategory = (typeof INQUIRY_CATEGORIES)[number]["value"]

export function InquiryScreen() {
  const router = useAppRouter()
  const s = useSurface()
  const { t } = useTranslation("settings")
  const queryClient = useQueryClient()

  const [category, setCategory] = useState<InquiryCategory | null>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [titleFocused, setTitleFocused] = useState(false)
  const [contentFocused, setContentFocused] = useState(false)

  // 머리말 §2 — 가장 긴 분류 이름 기준으로 한 번만 정한다.
  const maxTitle = useMemo(() => {
    const longestLabel = Math.max(
      ...INQUIRY_CATEGORIES.map((item) => t(item.labelKey).length),
    )
    return MAX_SUBJECT - (longestLabel + "[] ".length)
  }, [t])

  const trimmedTitle = title.trim()
  const trimmedContent = content.trim()
  const isDirty =
    !!category ||
    trimmedTitle.length > 0 ||
    trimmedContent.length > 0 ||
    photos.length > 0
  const canSubmit =
    !!category && trimmedTitle.length > 0 && trimmedContent.length > 0

  // 머리말 §3 — 남은 자리만큼만 고르게 한다.
  const handleAddPhotos = useCallback(async () => {
    const remaining = MAX_INQUIRY_PHOTOS - photos.length
    if (remaining <= 0 || isSubmitting) return

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") {
      await showOpenSettingsAlert(
        t("inquiry.photoPermissionTitle"),
        t("inquiry.photoPermissionBody"),
      )
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1,
    })
    if (result.canceled) return

    // OS 가 한도를 지키지 않는 경우가 있다(안드로이드 일부 갤러리). 여기서 한 번 더 자르고,
    // 자를 일이 생겼으면 조용히 넘어가지 않는다.
    const picked = result.assets.slice(0, remaining)
    if (result.assets.length > picked.length) {
      showCautionToast(t("inquiry.photoLimit", { count: MAX_INQUIRY_PHOTOS }))
    }
    setPhotos((current) => [...current, ...picked])
  }, [isSubmitting, photos.length, t])

  const handleRemovePhoto = useCallback((uri: string) => {
    setPhotos((current) => current.filter((photo) => photo.uri !== uri))
  }, [])

  const handleBack = async () => {
    if (isDirty) {
      const confirmed = await showConfirm({
        title: t("inquiry.discardTitle"),
        description: t("inquiry.discardBody"),
        confirmLabel: t("inquiry.discard"),
        destructive: true,
      })
      if (!confirmed) return
    }
    router.back()
  }

  // 머리말 §4.
  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return
    setIsSubmitting(true)
    try {
      const categoryLabel = t(
        INQUIRY_CATEGORIES.find((item) => item.value === category)?.labelKey ??
          "inquiry.categories.other",
      )
      await submitInquiry({
        subject: `[${categoryLabel}] ${trimmedTitle}`,
        content: trimmedContent,
        photos,
      })
      // 접수는 끝났다 — 목록이 방금 보낸 문의를 맨 위에 보이도록 캐시를 버리고 돌아간다.
      // 무효화는 기다리지 않는다: 목록 화면이 마운트되며 스스로 다시 받는다.
      void queryClient.invalidateQueries({ queryKey: INQUIRY_LIST_QUERY_KEY })
      router.back()
      showSuccessToast(t("inquiry.successTitle"), t("inquiry.successBody"))
    } catch (error) {
      // 실패했을 땐 화면을 떠나지 않는다 — 쓴 글이 그대로 남아야 다시 보낼 수 있다.
      presentError(error, {
        scope: "inquiry-submit",
        retry: () => void handleSubmit(),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const fieldFace = (focused: boolean) => ({
    backgroundColor: focused ? s.canvas : s.surfaceSunken,
    borderColor: focused ? s.brand : s.surfaceSunken,
  })
  const contentAtLimit = content.length >= MAX_CONTENT
  const contentNearLimit = content.length >= MAX_CONTENT * COUNTER_ALERT_RATIO
  const photosFull = photos.length >= MAX_INQUIRY_PHOTOS

  return (
    <RecordPageShell
      title={t("inquiry.write.title")}
      navigationTitle={t("inquiry.title")}
      intro={t("inquiry.write.intro")}
      onBack={() => void handleBack()}
      ctaLabel={t("inquiry.send")}
      ctaDisabled={!canSubmit}
      ctaLoading={isSubmitting}
      onCtaPress={() => void handleSubmit()}
    >
      <View style={styles.content}>
        {/* 1) 문의 종류 — 6개뿐이라 펼쳐 둔다. 시트를 열 이유가 없다. */}
        <View style={styles.group}>
          <V2Text style={styles.label} color={s.textStrong}>
            {t("inquiry.category")}
          </V2Text>
          <RecordChoices<InquiryCategory>
            value={category}
            disabled={isSubmitting}
            onChange={setCategory}
            options={INQUIRY_CATEGORIES.map((item) => ({
              value: item.value,
              label: t(item.labelKey),
            }))}
          />
        </View>

        {/* 2) 제목 — 숫자 칸과 같은 면의 한 줄 입력. */}
        <View style={styles.group}>
          <V2Text style={styles.label} color={s.textStrong}>
            {t("inquiry.subject")}
          </V2Text>
          <View style={[styles.field, fieldFace(titleFocused)]}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              onFocus={() => setTitleFocused(true)}
              onBlur={() => setTitleFocused(false)}
              placeholder={t("inquiry.subjectPlaceholder")}
              placeholderTextColor={recordFieldLabel(s)}
              selectionColor={s.brand}
              maxLength={maxTitle}
              returnKeyType="next"
              editable={!isSubmitting}
              accessibilityLabel={t("inquiry.subject")}
              style={[styles.singleLineInput, { color: s.textStrong }]}
            />
          </View>
        </View>

        {/* 3) 내용 — 대여섯 줄이 보이는 칸. 글이 길어지면 따라 자란다. 글자수는 셀 것이 생겼을 때만. */}
        <View style={styles.group}>
          <V2Text style={styles.label} color={s.textStrong}>
            {t("inquiry.content")}
          </V2Text>
          <View
            style={[
              styles.field,
              styles.multilineField,
              fieldFace(contentFocused),
            ]}
          >
            <TextInput
              multiline
              value={content}
              onChangeText={setContent}
              onFocus={() => setContentFocused(true)}
              onBlur={() => setContentFocused(false)}
              placeholder={t("inquiry.contentPlaceholder")}
              placeholderTextColor={recordFieldLabel(s)}
              selectionColor={s.brand}
              maxLength={MAX_CONTENT}
              editable={!isSubmitting}
              textAlignVertical="top"
              accessibilityLabel={t("inquiry.content")}
              style={[styles.multilineInput, { color: s.textStrong }]}
            />
          </View>
          {/* 한도 근처에서만 회색을 벗고, 꽉 찼을 때만 오류색. */}
          <RecordFieldHint error={contentAtLimit}>
            {content.length > 0 || contentNearLimit
              ? `${content.length}/${MAX_CONTENT}`
              : ""}
          </RecordFieldHint>
        </View>

        {/* 4) 사진 — 타일은 정사각형 한 줄. 지우기는 hitSlop 으로 44 를 채운다. */}
        <View style={styles.group}>
          <View style={styles.labelRow}>
            <V2Text style={styles.label} color={s.textStrong}>
              {t("inquiry.photos")}
            </V2Text>
            <V2Text style={styles.hint} color={s.text}>
              {photos.length}/{MAX_INQUIRY_PHOTOS}
            </V2Text>
          </View>
          <View style={styles.photos}>
            {photos.map((photo) => (
              <View key={photo.uri} style={styles.photoTile}>
                <Image
                  source={remoteImageSource(photo.uri)}
                  style={styles.photoImage}
                  contentFit="cover"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("inquiry.photoRemove")}
                  onPress={() => handleRemovePhoto(photo.uri)}
                  disabled={isSubmitting}
                  hitSlop={S[3]}
                  style={[
                    styles.photoRemove,
                    { backgroundColor: s.textStrong },
                  ]}
                >
                  <Ionicons name="close" size={12} color={s.canvas} />
                </Pressable>
              </View>
            ))}

            {!photosFull ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("inquiry.photoAdd")}
                onPress={() => void handleAddPhotos()}
                disabled={isSubmitting}
                style={({ pressed }) => [
                  styles.photoTile,
                  styles.photoAdd,
                  {
                    backgroundColor: pressed
                      ? s.surfacePressed
                      : s.surfaceSunken,
                    borderColor: s.surfaceSunken,
                  },
                ]}
              >
                <Ionicons name="camera-outline" size={20} color={s.text} />
              </Pressable>
            ) : null}
          </View>
          <RecordFieldHint error={photosFull}>
            {t("inquiry.photoLimit", { count: MAX_INQUIRY_PHOTOS })}
          </RecordFieldHint>
        </View>
      </View>
    </RecordPageShell>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: PAGE_X, gap: FORM.sectionGap },
  group: { gap: FORM.labelGap },
  label: FORM.label,
  hint: FORM.hint,
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: S[2],
  },
  field: {
    minHeight: FIELD.height - S[6],
    borderRadius: FIELD.radius,
    borderWidth: 1,
    paddingHorizontal: FIELD.paddingX,
    paddingVertical: S[4],
    justifyContent: "center",
  },
  // 한 줄 입력에는 lineHeight 를 주지 않는다 — `singleLineInputText` 머리말 참고.
  singleLineInput: {
    ...singleLineInputText(FORM.body),
    fontFamily: fontFamily.regular,
    padding: 0,
  },
  // 내용 칸 하한: 숫자 칸 두 개 높이 — 대여섯 줄이 보이면 "글을 쓰는 칸" 으로 읽힌다.
  multilineField: { minHeight: FIELD.height * 2, justifyContent: "flex-start" },
  multilineInput: {
    ...FORM.body,
    fontFamily: fontFamily.regular,
    flex: 1,
    padding: 0,
    includeFontPadding: false,
  },
  photos: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: S[2],
    paddingTop: S[1],
  },
  photoTile: {
    width: PHOTO_TILE,
    height: PHOTO_TILE,
    borderRadius: FORM.choiceRadius,
    overflow: "visible",
  },
  photoImage: {
    width: "100%",
    height: "100%",
    borderRadius: FORM.choiceRadius,
  },
  photoRemove: {
    position: "absolute",
    top: -S[1],
    right: -S[1],
    width: S[5],
    height: S[5],
    borderRadius: S[5] / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  photoAdd: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
})
