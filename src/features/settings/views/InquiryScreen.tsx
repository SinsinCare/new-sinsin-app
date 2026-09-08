import { Text } from "@/src/design-system-v2/primitives/NativeText"
/**
 * 1:1 문의 작성.
 *
 * ## 개편 전에 무엇이 문제였나 (design-system-v2 이전)
 *
 * 1. **문의 종류가 화면에서 제일 약한 컨트롤이었다.** 가장 먼저·반드시 해야 하는 선택인데
 *    오른쪽 끝의 작은 테두리 `선택` 버튼이었고, 고르려면 바텀시트를 열었다 닫아야 했다.
 *    게다가 고른 값이 버튼 옆에 글자로 또 나와서 같은 사실을 두 곳이 말했다.
 *    → 6개뿐인 선택지를 **칩으로 펼친다.** 탭 1회, 모달 0회, 중복 표기 0.
 * 2. **본문 입력란이 120pt 였다.** 글을 쓰러 들어온 화면인데 화면의 3분의 2가 빈 흰 면이고,
 *    그 면은 누를 수도 쓸 수도 없었다. → 본문이 `grow` 로 남는 높이를 전부 먹는다.
 *    빈 면이 곧 원고지가 된다.
 * 3. **본문 100자.** 서버 계약은 `content` 2000자다(`inquiryCreateBody`; `user_inquiry.content`
 *    는 TEXT). 클라이언트가 혼자 100자에서 잘라 문의를 두 문장짜리로 만들고 있었다.
 *    디자인 문제가 아니라 결함이라 같이 고친다.
 * 4. **제목이 서버 한도를 몰랐다.** 전송할 때 `[분류] ` 를 앞에 붙이는데 `subject` 는 200자라,
 *    긴 제목은 앱에서는 멀쩡하고 서버에서 떨어졌다. 접두사 몫을 빼고 막는다.
 * 5. legacy 표면 — `useSettingsColors`·손으로 만든 바텀시트·`Ionicons`·`ConfirmModal`·
 *    전폭 1px 구분선. → v2 토큰/컴포넌트, 확인은 `showConfirm`, 결과는 토스트.
 *
 * ## 색: 화면의 주황은 딱 하나
 *
 * 칩은 `tone="neutral"`(선택 = 잉크 면 + 반전 글자)이다. 브랜드 주황은 **보내기 버튼 하나**가
 * 독점한다 — 칩까지 주황이면 "지금 눌러야 하는 것" 이 일곱 개가 된다.
 * 선택 여부는 면 + 글자 굵기 두 가지로 동시에 말한다(색 하나에만 기대지 않는다).
 *
 * ## 세 덩어리가 같은 문법을 쓴다
 *
 * 문의 종류 · 제목 · 내용은 전부 `[라벨(subtext.mediumStrong)] → gap 6 → [컨트롤]` 이다.
 * 라벨을 `Field` 로 직접 그리는 이유는 내용 칸만 라벨 줄 오른쪽에 글자수를 달기 때문 —
 * 세 라벨이 한 곳에서 나와야 크기·색·간격이 영영 어긋나지 않는다.
 */

import { useCallback, useMemo, useState, type ReactNode } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native"
import { Image } from "expo-image"
import * as ImagePicker from "expo-image-picker"
import { useTranslation } from "react-i18next"

import {
  GUTTER,
  V2BottomCTA,
  V2Chip,
  V2Icon,
  V2ScreenHeader,
  V2TextField,
  radius,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import {
  MAX_INQUIRY_PHOTOS,
  submitInquiry,
} from "@/src/services/data/inquiryService"
import { showOpenSettingsAlert } from "@/src/features/settings/utils/openAppSettings"
import { showConfirm } from "@/src/lib/dialog"
import { showCautionToast, showSuccessToast } from "@/src/lib/toast"
import { presentError } from "@/src/lib/errorMessage"
import { remoteImageSource } from "@/src/shared/images/remoteImageSource"
import { useAppRouter } from "@/src/shared/navigation"

/** 서버 계약(`inquiryCreateBody` / `user_inquiry`)과 같은 값. 여기서 임의로 낮추지 말 것. */
const MAX_SUBJECT = 200
const MAX_CONTENT = 2000

/** 글자수를 조용한 회색에서 끌어올리는 지점 — 한도가 눈앞일 때만 눈에 띄면 된다. */
const COUNTER_ALERT_RATIO = 0.9

const INQUIRY_CATEGORIES = [
  { value: "app", labelKey: "inquiry.categories.app" },
  { value: "health", labelKey: "inquiry.categories.health" },
  { value: "content", labelKey: "inquiry.categories.content" },
  { value: "billing", labelKey: "inquiry.categories.billing" },
  { value: "account", labelKey: "inquiry.categories.account" },
  { value: "other", labelKey: "inquiry.categories.other" },
] as const

export function InquiryScreen() {
  const router = useAppRouter()
  const { colors } = useV2Theme()
  const { t } = useTranslation("settings")

  const [category, setCategory] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  /*
    제목 한도는 **분류를 고르기 전에 정해지고 그 뒤로 바뀌지 않는다.** 전송 시 제목 앞에
    `[분류] ` 가 붙어 `subject`(200자)를 함께 쓰는데, 고른 분류마다 한도가 출렁이면 이미
    쳐 둔 제목이 분류를 바꾸는 순간 잘려나간다. 그래서 현재 언어에서 **가장 긴 분류 이름**을
    기준으로 한 번 계산한다 — 몇 글자 손해 보고 예측 가능성을 산다.
  */
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

  /*
    사진 고르기. **남은 자리만큼만 고르게 한다** — 6장을 고르게 해 놓고 5장에서 자르면
    사라진 한 장의 이유를 사용자가 알 수 없다(`MediaPicker` 머리말과 같은 규칙).
  */
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

  /*
    사진이 있으면 멀티파트, 없으면 JSON — 경로 선택은 `submitInquiry` 안에 있다.
    사진 있는 문의는 줄이기 + 업로드가 걸려 몇 초 더 걸린다. 그동안 버튼은 로딩 상태다.
  */
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
      // 접수는 끝났다 — 확인을 눌러야 돌아가는 대신 돌아가면서 알린다.
      router.back()
      showSuccessToast(t("inquiry.successTitle"), t("inquiry.successBody"))
    } catch (error) {
      // 실패했을 땐 화면을 떠나지 않는다 — 쓴 글이 그대로 남아야 다시 보낼 수 있다.
      // 오류를 통째로 버리고 "인터넷 연결을 확인해 주세요" 를 띄우던 자리다. 문의가
      // 막히는 실제 원인은 정지된 계정·세션 만료·요청 몰림 쪽이 훨씬 많다.
      presentError(error, {
        scope: "inquiry-submit",
        retry: () => void handleSubmit(),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 한도 근처에서만 회색을 벗는다. 색이 아니라 밝기로 먼저 말하고, 꽉 찼을 때만 빨강.
  const counterColor =
    content.length >= MAX_CONTENT
      ? colors.status.negative
      : content.length >= MAX_CONTENT * COUNTER_ALERT_RATIO
        ? colors.label.normal
        : colors.label.assistive

  return (
    <View style={[styles.root, { backgroundColor: colors.background.default }]}>
      <V2ScreenHeader title={t("inquiry.title")} onBack={handleBack} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          {/* 1) 문의 종류 — 6개뿐이라 펼쳐 둔다. 시트를 열 이유가 없다. */}
          <Field label={t("inquiry.category")}>
            <View style={styles.chips}>
              {INQUIRY_CATEGORIES.map((item) => (
                <V2Chip
                  key={item.value}
                  label={t(item.labelKey)}
                  tone="neutral"
                  selected={category === item.value}
                  onPress={() => setCategory(item.value)}
                  disabled={isSubmitting}
                />
              ))}
            </View>
          </Field>

          {/* 2) 제목 */}
          <Field label={t("inquiry.subject")}>
            <V2TextField
              value={title}
              onChangeText={setTitle}
              placeholder={t("inquiry.subjectPlaceholder")}
              maxLength={maxTitle}
              returnKeyType="next"
              disabled={isSubmitting}
            />
          </Field>

          {/* 3) 내용 — 남는 높이를 전부 가져간다. 글자수는 셀 것이 생겼을 때만 나온다. */}
          <Field
            grow
            label={t("inquiry.content")}
            trailing={
              content.length > 0 ? (
                <Text
                  style={[typography.subtext.small, { color: counterColor }]}
                >
                  {content.length}/{MAX_CONTENT}
                </Text>
              ) : null
            }
          >
            <V2TextField
              grow
              multiline
              value={content}
              onChangeText={setContent}
              placeholder={t("inquiry.contentPlaceholder")}
              maxLength={MAX_CONTENT}
              disabled={isSubmitting}
            />
          </Field>

          {/* 4) 사진 — 붙일 것이 있을 때만 자리를 차지한다. 타일은 정사각형 한 줄이다. */}
          <Field
            label={t("inquiry.photos")}
            trailing={
              <Text
                style={[
                  typography.subtext.small,
                  { color: colors.label.assistive },
                ]}
              >
                {photos.length}/{MAX_INQUIRY_PHOTOS}
              </Text>
            }
          >
            <View style={styles.photos}>
              {photos.map((photo) => (
                <View key={photo.uri} style={styles.photoTile}>
                  <Image
                    source={remoteImageSource(photo.uri)}
                    style={styles.photoImage}
                    contentFit="cover"
                  />
                  {/* 지우기는 타일 위 작은 원이지만 탭 영역은 hitSlop 으로 44 를 채운다. */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("inquiry.photoRemove")}
                    onPress={() => handleRemovePhoto(photo.uri)}
                    disabled={isSubmitting}
                    hitSlop={12}
                    style={[
                      styles.photoRemove,
                      { backgroundColor: colors.label.normal },
                    ]}
                  >
                    <V2Icon
                      name="close"
                      size={12}
                      color={colors.background.default}
                    />
                  </Pressable>
                </View>
              ))}

              {photos.length < MAX_INQUIRY_PHOTOS ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("inquiry.photoAdd")}
                  onPress={() => void handleAddPhotos()}
                  disabled={isSubmitting}
                  style={[
                    styles.photoTile,
                    styles.photoAdd,
                    { borderColor: colors.line.normal },
                  ]}
                >
                  <V2Icon
                    name="camera"
                    size={20}
                    color={colors.label.alternative}
                  />
                </Pressable>
              ) : null}
            </View>
          </Field>
        </View>

        <V2BottomCTA
          primaryLabel={t("inquiry.send")}
          onPrimary={handleSubmit}
          primaryProps={{ disabled: !canSubmit, loading: isSubmitting }}
        />
      </KeyboardAvoidingView>
    </View>
  )
}

/**
 * 세 입력 덩어리의 공통 골격 — 라벨 줄(+선택적 우측 슬롯)과 컨트롤.
 * 라벨 타이포·색·간격은 `V2TextField` 가 자기 라벨에 쓰는 것과 같은 값이다.
 */
function Field({
  label,
  trailing,
  grow = false,
  children,
}: {
  label: string
  trailing?: ReactNode
  grow?: boolean
  children: ReactNode
}) {
  const { colors } = useV2Theme()

  return (
    <View style={[styles.field, grow && styles.flex]}>
      <View style={styles.labelRow}>
        <Text
          style={[
            typography.subtext.mediumStrong,
            { color: colors.label.normal },
          ]}
          lineBreakStrategyIOS="hangul-word"
        >
          {label}
        </Text>
        {trailing}
      </View>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: GUTTER,
    paddingTop: spacing[16],
    // 세 덩어리 사이 — 구분선 대신 여백이 끊는다(보더리스).
    gap: spacing[24],
  },
  field: { gap: spacing[6] },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  photos: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[8],
    marginTop: spacing[2],
  },
  photoTile: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    overflow: "visible",
  },
  photoImage: {
    width: "100%",
    height: "100%",
    borderRadius: radius.sm,
  },
  photoRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  photoAdd: {
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[8],
    // 라벨과의 간격은 Field 가 6 을 주지만, 칩은 글자보다 면이 커서 6 이면 붙어 보인다.
    marginTop: spacing[2],
  },
})
