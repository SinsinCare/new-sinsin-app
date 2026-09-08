import { Text } from "@/src/design-system-v2/primitives/NativeText"
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
 *   대신 접수됐다는 토스트만 띄운다 — 처음이면 `reportDone`, 서버가 `alreadyReported`
 *   를 돌려주면 `reportAlready`.
 * - `visible` 이 켜질 때 상태를 다시 심는다. Modal 이 마운트된 채 남아 `useState` 초기값이
 *   다시 돌지 않는다 — 프로토타입 필터 시트의 stale 상태 버그와 같은 함정이다.
 * - 내가 쓴 후기(`mine`)에는 신고 버튼 자체를 그리지 않는 것이 호출부 책임이다. 그래도
 *   여기서 한 번 더 막는다(`disableForOwn`) — **서버는 자기 후기 신고를 명시적으로
 *   막는다.** 삽입 자체가 `t.user_id <> reporterUserId` 로 걸러지고
 *   (`engagementRepository.reportReview`), 신고 행이 안 생기면 서비스가 `FORBIDDEN` 을
 *   던진다(`engagementService.createReviewReport`). 그러니 `disableForOwn` 은 "서버가
 *   안 막아서" 가 아니라 **막힐 요청을 눌리기 전에 알려 주려고** 있다 — 보내 놓고 403 을
 *   토스트로 알리는 것보다 꺼진 버튼과 `reportOwn` 안내가 낫다.
 * - **화면의 사유 코드를 그대로 서버에 보내지 않는다.** 값 공간이 다르다(다섯 중 넷이
 *   400 이었다). 변환은 `utils/reviewReportReasons` 한 곳에서만 일어난다 — 그 파일
 *   머리말에 어느 사유를 어느 서버 값에 붙였는지와 `detail` 형식이 있다.
 */

import { useCallback, useEffect, useState } from "react"
import { StyleSheet, View, useWindowDimensions } from "react-native"
import { useMutation } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import {
  V2BottomSheet,
  V2Button,
  V2Option,
  V2SheetScrollView,
  V2SheetTextInput,
  radius,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import { presentError } from "@/src/lib/errorMessage"
import { showSuccessToast } from "@/src/lib/toast"
import { restaurantService } from "@/src/services/data/restaurantService"
import {
  REVIEW_REPORT_FREE_TEXT_CODE,
  REVIEW_REPORT_REASONS,
  buildReviewReportPayload,
  type ReviewReportReasonCode,
} from "../utils/reviewReportReasons"

/**
 * 상세 입력 상한. 서버 `detail` 상한(`REVIEW_REPORT_DETAIL_MAX`) 안에 사유 코드 줄까지
 * 넣고도 남는 값이고, **시안이 고른 숫자**다.
 *
 * 서버 상한을 여기 옮겨 적지 않는다 — 한쪽만 움직이면 이 산문이 조용히 거짓이 된다.
 * 두 값의 관계와 이 숫자 자체는 계약 테스트가 못 박는다.
 */
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
  const { height: windowHeight } = useWindowDimensions()
  const [reason, setReason] = useState<ReviewReportReasonCode | null>(null)
  const [detail, setDetail] = useState("")

  useEffect(() => {
    if (!visible) return
    setReason(null)
    setDetail("")
  }, [visible])

  const mutation = useMutation({
    mutationFn: (args: {
      reviewId: number
      reason: ReviewReportReasonCode
      detail: string
    }) =>
      restaurantService.reportReview(
        args.reviewId,
        /*
          서버 어휘로 옮기는 유일한 자리. `detail` 첫 줄에 고른 사유가 실린다.
          `detail` 을 여기서 `needsFreeText` 로 좁히지 않는 것은 빌더가 이미
          "본문은 자유입력 사유의 것만" 을 강제하기 때문이다 — 두 곳에서 막으면
          어느 쪽이 정본인지 흐려진다.

          **본문 자리에 상수를 박지 말 것.** 빌더 게이팅은 남의 사유에 본문이 실리는
          것만 막는다. 여기서 `""` 를 넘기면 사용자가 `기타` 에 쓴 글이 통째로 사라지고
          서버에는 `[ETC]` 만 남는데, 그건 게이팅이 보는 방향이 아니다. 렌더 테스트는
          없지만 계약 테스트가 이 호출의 인자를 소스로 읽어 못 박아 둔다
          (`restaurantReviewReportContract` 의 "본문 자리에 상수를 박지 않는다").
        */
        buildReviewReportPayload(args.reason, args.detail),
      ),
  })

  const submit = useCallback(async () => {
    if (reviewId === null || reason === null || disableForOwn) return
    try {
      const result = await mutation.mutateAsync({ reviewId, reason, detail })
      /*
        이미 접수된 신고를 방금 접수된 것처럼 말하지 않는다. 서버는 두 번째 신고를
        오류가 아니라 **200 + `alreadyReported: true`** 로 돌려준다 — 그 값을 버리고
        늘 같은 토스트를 띄우면, 사용자는 어제 한 신고가 오늘 새로 들어간 줄 안다.
      */
      showSuccessToast(
        result.alreadyReported
          ? t("restaurant.review.reportAlready")
          : t("restaurant.review.reportDone"),
      )
      onReported?.(result)
      onClose()
    } catch (error) {
      /*
        폴백(`신고를 보내지 못했어요. 잠시 후 다시…`)을 넘기지 않는다. 그 문장은
        **서버 코드를 이겨서** 이 엔드포인트가 실제로 내는 실패를 전부 "잠시 후 다시"
        로 덮는다 — 자기 후기 신고는 403, 지워진 후기는 404 라 다시 눌러도 영원히
        같은 결과다. (중복 신고는 여기 오지 않는다. 바로 위 성공 경로가 읽는다.)
        지금은 코드가 먼저다.
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

  const needsFreeText = reason === REVIEW_REPORT_FREE_TEXT_CODE
  const canSubmit =
    reviewId !== null &&
    reason !== null &&
    !disableForOwn &&
    !mutation.isPending &&
    // `기타 사유 (직접입력)` 은 적은 내용이 곧 사유다. 비면 서버에 `[ETC]` 만 남는다.
    (!needsFreeText || detail.trim().length > 0)

  return (
    <V2BottomSheet
      surface="restaurant_review_report"
      visible={visible}
      onClose={onClose}
      /*
        라벨이 붙은 나가는 길. CTA 를 children 으로 옮기면서 푸터의
        `secondaryLabel={t("action.close")}` 이 함께 사라졌는데, `disableForOwn` 이면
        사유 일곱 줄과 CTA 가 **전부 disabled** 라 화면 안에 누를 수 있는 것이 하나도
        남지 않는다 — 나가는 길이 스크림 탭과 드래그 핸들뿐이었다(둘 다 이름이 없어
        스크린리더에는 존재하지 않는다).
      */
      showClose
      title={t("restaurant.review.reportReasonTitle")}
      subTitle={
        disableForOwn
          ? t("restaurant.review.reportOwn")
          : t("restaurant.review.reportReasonSubtitle")
      }
    >
      {/*
        사유가 일곱 줄이라 작은 화면에서는 시트 상한(화면 높이)을 넘긴다. 시트는
        children 을 스크롤해 주지 않으므로(V2BottomSheet 머리말) 넘치는 몫은 여기서
        받는다 — 안 그러면 잘리는 것이 하필 맨 아래의 CTA 다.
      */}
      <V2SheetScrollView
        style={{ maxHeight: Math.round(windowHeight * 0.5) }}
        contentContainerStyle={styles.list}
      >
        {REVIEW_REPORT_REASONS.map((item) => (
          <V2Option
            key={item.code}
            selected={reason === item.code}
            label={t(item.labelKey)}
            disabled={disableForOwn}
            onPress={() => setReason(item.code)}
          />
        ))}

        {/*
          상세는 `기타` 를 골랐을 때만 나타난다. 항상 띄우면 시트가 길어져
          사유 목록의 마지막 항목이 화면 밖으로 밀린다.
        */}
        {needsFreeText ? (
          <View
            style={[
              styles.detailBox,
              { backgroundColor: colors.fill.background },
            ]}
          >
            {/*
              시트 안의 입력은 `V2SheetTextInput` 이어야 한다. 평범한 `TextInput` 은
              gorhom 에 포커스를 알리지 못해 키패드가 CTA 를 그대로 덮는다
              (그 컴포넌트 머리말).
            */}
            <V2SheetTextInput
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
      </V2SheetScrollView>

      {/*
        CTA 를 시트의 푸터 슬롯이 아니라 children 안에 둔다. 푸터는 `disabled` 를
        받지 않아서, 아무것도 안 고른 상태의 버튼이 눌릴 것처럼 보인 채 아무 일도
        일어나지 않는다 — 시안은 "미선택이면 꺼진 버튼"이다.
      */}
      <View style={styles.cta}>
        <V2Button
          size="xl"
          fullWidth
          disabled={!canSubmit}
          loading={mutation.isPending}
          onPress={() => void submit()}
        >
          {t("restaurant.review.reportSubmit")}
        </V2Button>
      </View>
    </V2BottomSheet>
  )
}

const styles = StyleSheet.create({
  // 행(V2Option)은 자체 좌우 24 로 제목과 정렬된다 — 목록에는 가로 패딩을 주지 않는다.
  list: { gap: spacing[8], paddingVertical: spacing[8] },
  detailBox: {
    borderRadius: radius.lg,
    padding: spacing[16],
    minHeight: 120,
    // 행과 달리 자기 패딩이 없으므로 여기서 시트 좌우 여백(24)에 맞춘다.
    marginHorizontal: spacing[24],
  },
  detailInput: { minHeight: 72, padding: 0 },
  detailCounter: { textAlign: "right", marginTop: spacing[8] },
  // 시트 푸터와 같은 자리(가로 24 · 위 32)에 앉힌다 — CTA 만 옮겨 왔을 뿐이다.
  cta: { marginTop: spacing[32], paddingHorizontal: spacing[24] },
})
