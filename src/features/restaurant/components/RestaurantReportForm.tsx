/**
 * `식당 알려주기` 제보 폼.
 *
 * ## 이 파일이 design-system-v2 로 옮겨진 이유
 *
 * 지도 시트 끝의 `MapUtilityFooter` → `/restaurant/report` 로 **두 번 탭이면 닿는다.**
 * 즉 배포되는 화면이고 legacy 로 남겨 둘 수 있는 코드가 아니다. 옮기기 전에는
 *
 * - `tamagui` 에서 `Text`/`XStack`/`YStack` 을 가져다 쓰고 (D8: 새 코드에 Tamagui 금지)
 * - `fontWeight="700"`/`"600"` 을 네 곳에서 지정하고 (iOS 가짜 굵게 — 굵기는 `fontFamily` 에만)
 * - 사진 썸네일의 `삭제` 띠에 `rgba(0,0,0,0.58)` 을 하드코딩하고 (`colors.background.dim` 이 있다)
 * - legacy `Button`/`TextField`/`TextAreaField`(Tamagui 기반)를 썼다
 *
 * 색은 이미 `useV2Theme()` 에서 왔으므로 바뀐 것은 프리미티브와 타이포뿐이다. 검증
 * (`validateRestaurantReportDraft`)·업로드(`restaurantReportService`)·팔레트
 * (`getRestaurantReportPalette`)는 그대로다 — 동작을 바꾸는 작업이 아니다.
 *
 * ## 사진 썸네일의 `삭제` 는 띠로 남긴다
 *
 * ✕ 배지를 우상단에 얹는 편이 흔하지만, 78×78 썸네일 위의 20px 배지는 최소 터치 44 를
 * 못 채운다. 타일 전체가 삭제 버튼이고 하단 띠가 그 사실을 글자로 말한다 —
 * 실수로 지우기 쉬운 대신 무엇이 일어날지 분명하다.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Image,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native"
import { Text } from "@/src/shared/components/AppText"
import { useTranslation } from "react-i18next"

import {
  V2Button,
  V2TextField,
  borderWidth,
  radius,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"

import { GUTTER } from "../layout"
import { useRestaurantReportSubmission } from "../hooks/useRestaurantReportSubmission"
import {
  MAX_RESTAURANT_REPORT_PHOTOS,
  validateRestaurantReportDraft,
} from "../utils/restaurantReportValidation"
import { getRestaurantReportPalette } from "../utils/restaurantReportPresentation"
import { RestaurantReportSection } from "./RestaurantReportSection"

import { getErrorMessage } from "@/src/lib/errorUtils"
import { showSuccessToast } from "@/src/lib/toast"

import { useRestaurantReportPhotos } from "../hooks/useRestaurantReportPhotos"

interface RestaurantReportFormProps {
  paddingTop: number
  /**
   * 채우다 만 제보가 있는지 껍데기에 알린다.
   *
   * 뒤로 가기 버튼은 이 폼이 아니라 화면 껍데기(`RestaurantReportScreen`)가 갖고 있어서,
   * "지우고 나갈까요"를 물을 수 있는 쪽과 무엇이 지워지는지 아는 쪽이 갈려 있다.
   * 상태를 위로 올리는 대신 **더러움 한 비트만** 올려 보낸다.
   */
  onDirtyChange?: (dirty: boolean) => void
  onSubmittingChange?: (busy: boolean) => void
}

/** 썸네일 한 변. 3열 wrap 에서 가로 여백을 뺀 값이 아니라 목업 없는 화면의 고정값이다. */
const THUMBNAIL = 78

const emptyDraft = {
  name: "",
  address: "",
  category: "",
  recommendedMenu: "",
  reason: "",
  externalLink: "",
}

export function RestaurantReportForm({
  paddingTop,
  onDirtyChange,
  onSubmittingChange,
}: RestaurantReportFormProps) {
  const { t } = useTranslation("common")
  const theme = useV2Theme()
  const { colors } = theme
  const palette = getRestaurantReportPalette(theme)
  const [draft, setDraft] = useState(emptyDraft)
  const scroll = useRef<ScrollView>(null)
  const cardY = useRef(0)
  const [validationAttempted, setValidationAttempted] = useState(false)
  const [error, setError] = useState("")
  const [photoError, setPhotoError] = useState("")
  const { photos, isPicking, addPhotos, removePhoto, clearPhotos } =
    useRestaurantReportPhotos((photoError) =>
      setPhotoError(getErrorMessage(photoError)),
    )
  const { submit: submitReport, isSubmitting } = useRestaurantReportSubmission({
    onSubmittingChange,
    onError: (submitError) => {
      setError(getErrorMessage(submitError))
      Keyboard.dismiss()
      scroll.current?.scrollTo({ y: cardY.current, animated: true })
    },
    onSuccess: () => {
      setValidationAttempted(false)
      setDraft(emptyDraft)
      clearPhotos()
      setPhotoError("")
      showSuccessToast(
        t("restaurant.report.successTitle"),
        t("restaurant.report.successBody"),
      )
    },
  })
  // 이 폼은 이제 `app/restaurant/report.tsx` 안에서만 렌더되고, 그 화면이 헤더로
  // 상태바 영역을 이미 먹는다. 예전에는 플래그가 꺼진 `식당` 탭의 본체로 직접 떴기 때문에
  // 안드로이드 상태바 높이를 스스로 보정해야 했는데(`StatusBar.currentHeight`), 지금 그대로
  // 두면 헤더 아래에 정체불명의 24px 이 한 번 더 생긴다. 여백 책임은 호출부 한 곳에 있다.
  const contentTopPadding = paddingTop

  const update = useCallback((key: keyof typeof draft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }, [])

  // 등록에 성공하면 폼이 비므로 이 값도 저절로 false 로 돌아간다.
  const isDirty =
    photos.length > 0 ||
    Object.values(draft).some((value) => value.trim().length > 0)
  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const submit = useCallback(async () => {
    if (isPicking) return
    const validation = validateRestaurantReportDraft({
      ...draft,
      photoCount: photos.length,
    })
    if (validation) {
      setValidationAttempted(true)
      Keyboard.dismiss()
      scroll.current?.scrollTo({ y: cardY.current, animated: true })
      setError(
        validation === "tooManyPhotos"
          ? t("restaurant.report.validation.tooManyPhotos", {
              count: MAX_RESTAURANT_REPORT_PHOTOS,
            })
          : "",
      )
      return
    }

    setError("")
    await submitReport({ draft, photos })
  }, [draft, photos, submitReport, isPicking, t])

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.flex, { backgroundColor: palette.bg }]}
    >
      <ScrollView
        ref={scroll}
        bounces={false}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: contentTopPadding },
        ]}
      >
        <View style={styles.intro}>
          <Text
            style={[typography.display.small, { color: palette.text }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("restaurant.report.introTitle")}
          </Text>
          <Text
            style={[typography.label.smallWeak, { color: palette.subText }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("restaurant.report.introBody")}
          </Text>
        </View>

        <View
          onLayout={(event) => {
            cardY.current = event.nativeEvent.layout.y
          }}
          style={[
            styles.card,
            {
              borderColor: palette.cardBorder,
              backgroundColor: palette.card,
            },
          ]}
        >
          <Text
            style={[typography.title.xSmall, { color: palette.text }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("restaurant.report.formTitle")}
          </Text>

          {error ? (
            <Text
              style={[
                typography.subtext.medium,
                styles.error,
                {
                  color: palette.errorText,
                  backgroundColor: palette.errorBackground,
                },
              ]}
              lineBreakStrategyIOS="hangul-word"
            >
              {error}
            </Text>
          ) : null}

          <RestaurantReportSection
            title={t("restaurant.report.sections.restaurant")}
            backgroundColor={palette.section}
            borderColor={palette.fieldBorder}
            textColor={palette.text}
          >
            <V2TextField
              disabled={isSubmitting}
              label={t("restaurant.report.fields.name")}
              required
              error={
                validationAttempted && !draft.name.trim()
                  ? t("restaurant.report.validation.nameRequired")
                  : false
              }
              value={draft.name}
              onChangeText={(value) => update("name", value)}
              placeholder={t("restaurant.report.fields.namePlaceholder")}
            />
            <V2TextField
              disabled={isSubmitting}
              label={t("restaurant.report.fields.address")}
              value={draft.address}
              onChangeText={(value) => update("address", value)}
              placeholder={t("restaurant.report.fields.addressPlaceholder")}
            />
            <V2TextField
              disabled={isSubmitting}
              label={t("restaurant.report.fields.category")}
              required
              error={
                validationAttempted && !draft.category.trim()
                  ? t("restaurant.report.validation.categoryRequired")
                  : false
              }
              value={draft.category}
              onChangeText={(value) => update("category", value)}
              placeholder={t("restaurant.report.fields.categoryPlaceholder")}
            />
          </RestaurantReportSection>

          <RestaurantReportSection
            title={t("restaurant.report.sections.highlights")}
            backgroundColor={palette.section}
            borderColor={palette.fieldBorder}
            textColor={palette.text}
          >
            <V2TextField
              disabled={isSubmitting}
              label={t("restaurant.report.fields.menu")}
              value={draft.recommendedMenu}
              onChangeText={(value) => update("recommendedMenu", value)}
              placeholder={t("restaurant.report.fields.menuPlaceholder")}
            />
            <V2TextField
              disabled={isSubmitting}
              label={t("restaurant.report.fields.reason")}
              value={draft.reason}
              onChangeText={(value) => update("reason", value)}
              placeholder={t("restaurant.report.fields.reasonPlaceholder")}
              multiline
              textAlignVertical="top"
            />
            <V2TextField
              disabled={isSubmitting}
              label={t("restaurant.report.fields.link")}
              value={draft.externalLink}
              onChangeText={(value) => update("externalLink", value)}
              placeholder={t("restaurant.report.fields.linkPlaceholder")}
              autoCapitalize="none"
            />
          </RestaurantReportSection>

          <RestaurantReportSection
            title={t("restaurant.report.sections.photos")}
            backgroundColor={palette.section}
            borderColor={palette.fieldBorder}
            textColor={palette.text}
          >
            <View style={styles.photoBlock}>
              <View style={styles.photoHeader}>
                <Text
                  style={[typography.subtext.large, { color: palette.text }]}
                >
                  {t("restaurant.report.selectedPhotos", {
                    current: photos.length,
                    max: MAX_RESTAURANT_REPORT_PHOTOS,
                  })}
                </Text>
                <V2Button
                  size="s"
                  color="neutral"
                  variant="weak"
                  disabled={
                    isSubmitting ||
                    isPicking ||
                    photos.length >= MAX_RESTAURANT_REPORT_PHOTOS
                  }
                  loading={isPicking}
                  onPress={() => {
                    setPhotoError("")
                    void addPhotos()
                  }}
                >
                  {t("restaurant.report.addPhoto")}
                </V2Button>
              </View>
              {photoError ? (
                <Text
                  accessibilityRole="alert"
                  accessibilityLiveRegion="polite"
                  style={[
                    typography.subtext.medium,
                    { color: palette.errorText },
                  ]}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {photoError}
                </Text>
              ) : null}
              {photos.length > 0 && (
                <View style={styles.photoRow}>
                  {photos.map((photo) => (
                    <Pressable
                      key={photo.uri}
                      onPress={() => removePhoto(photo.uri)}
                      accessibilityRole="button"
                      disabled={isSubmitting}
                      accessibilityState={{ disabled: isSubmitting }}
                      accessibilityLabel={t("restaurant.report.removePhoto")}
                      style={({ pressed }) => [
                        styles.photoThumb,
                        pressed && styles.pressedCard,
                      ]}
                    >
                      <Image
                        source={{ uri: photo.uri }}
                        style={styles.photoImage}
                      />
                      <Text
                        style={[
                          typography.caption.small,
                          styles.removeLabel,
                          {
                            // 사진 위에 얹히는 띠. 밝은 사진에서도 글자가 읽히도록
                            // 반투명 어두운 면 토큰을 쓴다(하드코딩 rgba 금지).
                            backgroundColor: colors.background.dim,
                            color: colors.static.white,
                          },
                        ]}
                      >
                        {t("restaurant.report.remove")}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </RestaurantReportSection>

          <V2Button
            size="xl"
            color="brand"
            variant="fill"
            fullWidth
            disabled={isPicking}
            loading={isSubmitting}
            onPress={() => void submit()}
          >
            {t("restaurant.report.submit")}
          </V2Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: spacing[32], gap: spacing[16] },
  // 안내 문단은 아래 카드의 **테두리와 같은 선**에서 시작한다. 여기가 24 였을 때
  // 문단만 카드보다 8 오른쪽에서 시작해, 한 화면에 왼쪽 선이 둘로 보였다.
  intro: {
    gap: spacing[8],
    paddingHorizontal: GUTTER,
    paddingTop: spacing[20],
  },
  card: {
    gap: spacing[16],
    marginHorizontal: GUTTER,
    padding: spacing[16],
    borderRadius: radius["2xl"],
    borderWidth: borderWidth.thin,
  },
  error: { padding: spacing[12], borderRadius: radius.md },
  photoBlock: { gap: spacing[8] },
  photoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[8],
  },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing[8] },
  photoThumb: {
    height: THUMBNAIL,
    width: THUMBNAIL,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  photoImage: { height: "100%", width: "100%" },
  removeLabel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: spacing[2],
    textAlign: "center",
  },
  pressedCard: { opacity: 0.9 },
})
