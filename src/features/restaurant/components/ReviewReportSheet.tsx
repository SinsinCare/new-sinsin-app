/**
 * 후기 신고 시트. 사유 선택 + (선택) 상세 → `POST /restaurants/reviews/:id/report`.
 *
 * ## 왜 이 컴포넌트가 직접 뮤테이션을 갖는가
 *
 * `useRestaurantReviews` 에도 `reportReview` 가 있지만 그 훅은 **`restaurantId` 를 요구**한다
 * (후기 목록 쿼리를 함께 들고 있기 때문). 신고 버튼은 작성자 프로필 화면(목업 -30)에도
 * 있고 거기에는 식당이 없다. 그래서 신고만 하는 최소 뮤테이션을 여기서 소유한다 —
 * 그 화면에서 쓸 수도 없는 훅을 억지로 끌어오는 것보다 낫다.
 *
 * ## 되돌리지 말 것
 *
 * - 성공 시 목록을 무효화하지 않는다. 신고는 그 후기를 즉시 감추지 않는다(서버 `status:'NEW'`).
 *   목록을 새로 불러오면 사용자는 "신고했는데 그대로 있다" 를 두 번 확인하게 된다.
 *   대신 접수됐다는 토스트(`reportDone`)만 띄운다.
 * - `visible` 이 켜질 때 상태를 다시 심는다. Modal 이 마운트된 채 남아 `useState` 초기값이
 *   다시 돌지 않는다 — 프로토타입 필터 시트의 stale 상태 버그와 같은 함정이다.
 * - 내가 쓴 후기(`mine`)에는 신고 버튼 자체를 그리지 않는 것이 호출부 책임이다. 그래도
 *   여기서 한 번 더 막는다(`disableForOwn`) — 서버는 유니크 제약만 갖고 있고 자기 신고를
 *   거르지 않는다.
 */

import { useCallback, useEffect, useState } from "react"
import { StyleSheet, Text, TextInput, View } from "react-native"
import { useMutation } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import {
  V2BottomSheet,
  V2Option,
  radius,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import { presentError } from "@/src/lib/errorMessage"
import { showSuccessToast } from "@/src/lib/toast"
import { restaurantService } from "@/src/services/data/restaurantService"

/**
 * 사유 값 = 서버 `restaurant_review_report.reason varchar(30)`.
 * 라벨은 `restaurant.review.reportReasons.*` 에 이미 있다(ko/en 모두).
 */
const REPORT_REASONS = [
  { value: "SPAM", labelKey: "restaurant.review.reportReasons.SPAM" },
  {
    value: "IRRELEVANT",
    labelKey: "restaurant.review.reportReasons.IRRELEVANT",
  },
  { value: "ABUSE", labelKey: "restaurant.review.reportReasons.ABUSE" },
  { value: "PRIVACY", labelKey: "restaurant.review.reportReasons.PRIVACY" },
  { value: "ETC", labelKey: "restaurant.review.reportReasons.ETC" },
] as const

type ReportReason = (typeof REPORT_REASONS)[number]["value"]

/** 상세 입력 상한. 서버 `detail` 은 text 지만 화면에서 무한히 받을 이유가 없다. */
const DETAIL_MAX = 300

export interface ReviewReportSheetProps {
  visible: boolean
  onClose: () => void
  /** 신고 대상. `null` 이면 시트는 열려도 제출할 수 없다. */
  reviewId: number | null
  /** 내가 쓴 후기다 — 사유를 고르더라도 제출을 막는다. */
  disableForOwn?: boolean
  /** 접수 성공. 호출부가 시트를 닫는다. */
  onReported?: (result: { reviewId: number; status: string }) => void
}

export function ReviewReportSheet({
  visible,
  onClose,
  reviewId,
  disableForOwn = false,
  onReported,
}: ReviewReportSheetProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [detail, setDetail] = useState("")

  useEffect(() => {
    if (!visible) return
    setReason(null)
    setDetail("")
  }, [visible])

  const mutation = useMutation({
    mutationFn: (args: { reviewId: number; reason: string; detail: string }) =>
      restaurantService.reportReview(args.reviewId, {
        reason: args.reason,
        // 빈 문자열을 보내면 서버 컬럼에 `''` 가 남아 "사유 없음" 과 구분되지 않는다.
        detail: args.detail.trim().length > 0 ? args.detail.trim() : null,
      }),
  })

  const submit = useCallback(async () => {
    if (reviewId === null || reason === null || disableForOwn) return
    try {
      const result = await mutation.mutateAsync({ reviewId, reason, detail })
      showSuccessToast(t("restaurant.review.reportDone"))
      onReported?.(result)
      onClose()
    } catch (error) {
      /*
        폴백(`신고를 보내지 못했어요. 잠시 후 다시…`)을 넘기지 않는다. 예전 규칙에서는
        그 문장이 **서버 코드를 이겨서**, 같은 후기를 두 번 신고했을 때(서버의 유니크
        제약) 무엇이 문제인지 끝내 알 수 없었다. 지금은 코드가 먼저다.
      */
      presentError(error, { scope: "restaurant-review-report" })
    }
  }, [
    detail,
    disableForOwn,
    mutation,
    onClose,
    onReported,
    reason,
    reviewId,
    t,
  ])

  const canSubmit =
    reviewId !== null &&
    reason !== null &&
    !disableForOwn &&
    !mutation.isPending

  return (
    <V2BottomSheet
      visible={visible}
      onClose={onClose}
      title={t("restaurant.review.reportReasonTitle")}
      subTitle={disableForOwn ? t("restaurant.review.reportOwn") : undefined}
      primaryLabel={t("restaurant.review.reportSubmit")}
      onPrimary={canSubmit ? () => void submit() : undefined}
      secondaryLabel={t("action.close")}
      onSecondary={onClose}
    >
      <View style={styles.list}>
        {REPORT_REASONS.map((item) => (
          <V2Option
            key={item.value}
            selected={reason === item.value}
            label={t(item.labelKey)}
            disabled={disableForOwn}
            onPress={() => setReason(item.value)}
          />
        ))}

        {/*
          상세는 `기타` 를 골랐을 때만 나타난다. 항상 띄우면 시트가 길어져
          사유 목록의 마지막 항목이 화면 밖으로 밀린다.
        */}
        {reason === "ETC" ? (
          <View
            style={[
              styles.detailBox,
              { backgroundColor: colors.fill.background },
            ]}
          >
            <TextInput
              value={detail}
              onChangeText={setDetail}
              placeholder={t("restaurant.review.reportDetailPlaceholder")}
              placeholderTextColor={colors.label.assistive}
              multiline
              maxLength={DETAIL_MAX}
              textAlignVertical="top"
              style={[
                typography.subtext.large,
                styles.detailInput,
                { color: colors.label.normal },
              ]}
              accessibilityLabel={t(
                "restaurant.review.reportDetailPlaceholder",
              )}
            />
            <Text
              style={[
                typography.subtext.medium,
                styles.detailCounter,
                { color: colors.label.assistive },
              ]}
            >
              {t("restaurant.review.form.counter", {
                current: detail.length,
                max: DETAIL_MAX,
              })}
            </Text>
          </View>
        ) : null}
      </View>
    </V2BottomSheet>
  )
}

const styles = StyleSheet.create({
  list: { gap: spacing[8], paddingVertical: spacing[8] },
  detailBox: {
    borderRadius: radius.lg,
    padding: spacing[16],
    minHeight: 120,
  },
  detailInput: { minHeight: 72, padding: 0 },
  detailCounter: { textAlign: "right", marginTop: spacing[8] },
})
