/**
 * 후기 신고 사유 — **화면의 어휘**를 **서버의 어휘**로 옮기는 표.
 *
 * ## 왜 표가 필요한가 (이 파일이 고친 결함)
 *
 * 시트는 `SPAM | IRRELEVANT | ABUSE | PRIVACY | ETC` 를 그대로 서버에 보내고 있었다.
 * 서버가 받는 값은 `SPAM | HARASSMENT | INAPPROPRIATE_CONTENT | FALSE_INFORMATION |
 * OTHER`(`restaurant/schemas.ts` 의 `REVIEW_REPORT_REASON_PATTERN`) 이라 겹치는 것은
 * `SPAM` 하나뿐 — **다섯 중 넷이 400 이었다.** 사용자에게는 "신고가 안 되는 앱"이었다.
 *
 * 서버 열거형은 못 바꾼다. 서버가 와이어 계약의 정본이고 배포 주기도 다르며, 그 값
 * 공간은 커뮤니티 신고와 **일부러** 같은 것이다(같은 파일 머리말: 두 번째 어휘를 만들면
 * 운영 콘솔이 신고를 표별로 다른 사유 집합으로 세게 된다). 그러니 옮기는 쪽은 앱이다 —
 * 커뮤니티 신고 화면(`CommunityReportScreen`)이 이미 그렇게 하고 있다.
 *
 * ## 어느 UI 사유를 어느 서버 값에 붙였나
 *
 * | 화면 사유 | 서버 값 | 근거 |
 * | --- | --- | --- |
 * | 주문과 관련없는 내용 | `INAPPROPRIATE_CONTENT` | 후기가 놓일 자리에 놓이지 않았다는 신고다. 서버 어휘에 "주제 이탈" 이 없어 가장 가까운 일반 통에 넣는다. |
 * | 음식점·메뉴와 관련 없는 내용 | `INAPPROPRIATE_CONTENT` | 위와 같은 종류(주제 이탈). 축만 주문→가게로 다르다. |
 * | 욕설·비방 | `HARASSMENT` | 커뮤니티의 `harassment` 와 같은 값. 사람을 향한 표현은 한 통에 모인다. |
 * | 광고·홍보 | `SPAM` | 원래부터 유일하게 맞던 값. |
 * | 개인정보 노출 | `INAPPROPRIATE_CONTENT` | 커뮤니티 `privacy` 선례를 그대로 따른다. |
 * | 리뷰 무단 복사 | `INAPPROPRIATE_CONTENT` | 커뮤니티 `copyright` 선례를 그대로 따른다. |
 * | 기타 | `OTHER` | 직접 입력한 문장이 곧 사유다. |
 *
 * **`FALSE_INFORMATION` 은 일부러 비워 둔다.** 시안의 일곱 사유 중 "허위 정보" 에
 * 해당하는 것이 없다. 통을 고르게 채우려고 주제 이탈을 여기 붙이면 운영 콘솔의
 * "허위 정보" 집계가 실제로는 주제 이탈이 되어, 있는 지표보다 **틀린 지표**가 된다.
 *
 * ## `detail` 앞머리 — 접힌 사유를 살려 보낸다 (되돌리지 말 것)
 *
 * 일곱이 다섯으로, 그중 넷이 한 값으로 접힌다. 서버 행만 보면 운영자는
 * `INAPPROPRIATE_CONTENT` 더미 안에서 "개인정보 노출" 과 "주문과 무관" 을 구분할 수
 * 없다 — 신고를 받아 놓고 무엇을 신고당했는지 모르는 상태다. 그래서 `detail` 의
 * **첫 줄**에 사용자가 실제로 고른 UI 사유 코드를 싣는다.
 *
 *     [PRIVACY]
 *     (사용자가 직접 쓴 내용이 있으면 둘째 줄부터)
 *
 * **읽는 쪽은 아직 0곳이다.** `restaurant_review_report` 는 서버에 `insert` 만 있고
 * (`engagementRepository.ts`), 이 표를 읽는 운영 콘솔은 서버에도 어드민에도 없다.
 * 그러니 아래는 "지금 파싱되고 있는 형식"이 아니라 **콘솔이 생길 때 이 형식으로
 * 파싱한다**는 약속이다. 그리고 그때 콘솔은 **두 포맷을 읽어야 한다** — 같은 5값
 * 어휘를 쓰는 커뮤니티 신고(`recipe/views/CommunityReportScreen`)는 지금도 로케일
 * 라벨을 `, ` 로 이어붙여 `description` 에 담는다. 커뮤니티를 이 형식으로 옮기는 것은
 * 이번 범위 밖이고, 갈라진 사실을 숨기는 것보다 여기 적어 두는 편이 낫다.
 *
 * 형식 규칙(**깨지 말 것**):
 *  - 첫 줄은 `[CODE]` **하나뿐**이고, 사용자가 쓴 글자는 절대 첫 줄에 오지 않는다.
 *    사용자가 `[SPAM]` 이라고 적어도 그건 둘째 줄 이후라 읽는 쪽은 헷갈릴 일이 없다 —
 *    파서는 **첫 줄만** 코드로 읽는다.
 *  - 코드는 **로케일과 무관한 상수**다. 라벨(`광고·홍보`/`Advertising`)을 실으면 같은
 *    사유가 신고자의 언어에 따라 두 문자열로 쌓여 콘솔이 그걸 다시 묶어야 한다.
 *    (커뮤니티 신고가 실제로 그 상태다 — 바로 위 문단.)
 *  - 둘째 줄의 본문은 **자유입력 사유(`ETC`)의 것만** 싣는다. 다른 사유로 넘어온
 *    본문은 버린다 — 사용자가 버렸다고 믿는 문장이 남의 사유로 접수되면 안 된다
 *    (`buildReviewReportPayload` 주석).
 *  - 반대로 **자유입력인데 본문이 비면 던진다.** 접으면 사용자가 `기타` 에 쓴 글이
 *    통째로 사라지고 서버에는 `[ETC]` 만 남는다 — 사유가 '기타'인데 기타 내용이 없는,
 *    콘솔이 읽어도 아무것도 모르는 행이다. 유출 방향만 막고 폐기 방향을 열어 두면
 *    "본문이 실렸는가" 를 아무도 안 지키는 것과 같다.
 *  - 상한을 넘으면 **사용자 본문을 자르고 코드는 남긴다.** 코드가 잘리면 이 필드의
 *    존재 이유가 사라지고, 500자를 넘긴 본문은 서버에서 400 이 된다.
 */

/** 서버가 받는 값. `REVIEW_REPORT_REASON_PATTERN` 과 같은 집합이어야 한다. */
export const REVIEW_REPORT_SERVER_REASONS = [
  "SPAM",
  "HARASSMENT",
  "INAPPROPRIATE_CONTENT",
  "FALSE_INFORMATION",
  "OTHER",
] as const

export type ReviewReportServerReason =
  (typeof REVIEW_REPORT_SERVER_REASONS)[number]

/**
 * 시안(Figma)의 일곱 줄. **순서가 곧 화면 순서**다.
 *
 * `code` 는 서버 열거형과 **한 글자도 겹치지 않게** 지었다. 겹쳐 두면 어느 쪽 어휘를
 * 들고 있는지 눈으로 구분되지 않아, 예전처럼 UI 값이 그대로 서버로 새는 사고가
 * 조용히 반복된다.
 */
export const REVIEW_REPORT_REASONS = [
  {
    code: "ORDER_IRRELEVANT",
    labelKey: "restaurant.review.reportReasons.ORDER_IRRELEVANT",
    serverReason: "INAPPROPRIATE_CONTENT",
  },
  {
    code: "PLACE_IRRELEVANT",
    labelKey: "restaurant.review.reportReasons.PLACE_IRRELEVANT",
    serverReason: "INAPPROPRIATE_CONTENT",
  },
  {
    code: "ABUSE",
    labelKey: "restaurant.review.reportReasons.ABUSE",
    serverReason: "HARASSMENT",
  },
  {
    code: "ADVERTISING",
    labelKey: "restaurant.review.reportReasons.ADVERTISING",
    serverReason: "SPAM",
  },
  {
    code: "PRIVACY",
    labelKey: "restaurant.review.reportReasons.PRIVACY",
    serverReason: "INAPPROPRIATE_CONTENT",
  },
  {
    code: "COPIED_REVIEW",
    labelKey: "restaurant.review.reportReasons.COPIED_REVIEW",
    serverReason: "INAPPROPRIATE_CONTENT",
  },
  {
    code: "ETC",
    labelKey: "restaurant.review.reportReasons.ETC",
    serverReason: "OTHER",
  },
] as const satisfies readonly {
  code: string
  labelKey: string
  serverReason: ReviewReportServerReason
}[]

export type ReviewReportReasonCode =
  (typeof REVIEW_REPORT_REASONS)[number]["code"]

/** 직접 입력을 요구하는 사유. 이 줄만 본문 없이는 보낼 수 없다. */
export const REVIEW_REPORT_FREE_TEXT_CODE =
  "ETC" satisfies ReviewReportReasonCode

/**
 * 서버 `MAX_REVIEW_REPORT_DETAIL_LENGTH`(500). TypeBox 의 `maxLength` 는 UTF-16 단위로
 * 세므로 여기서도 `String.length` 로 잰다 — 코드포인트로 재면 이모지가 섞인 순간
 * 통과시킨 문장이 서버에서 400 이 된다.
 */
export const REVIEW_REPORT_DETAIL_MAX = 500

/**
 * 화면 사유 + (선택) 직접 입력 → 서버로 보낼 본문.
 *
 * `detail` 은 **절대 비지 않는다.** 항상 첫 줄에 사유 코드가 있으므로, 예전처럼
 * `''` 과 "사유 없음" 이 같은 모양이 되는 일이 없다.
 *
 * 모르는 코드는 **던진다.** 예전엔 `?? "OTHER"` 로 접었는데, 그러면 `reason=OTHER` +
 * 첫 줄엔 표에 없는 코드라는 앞뒤 안 맞는 행이 조용히 쌓인다 — 고장이 정상처럼 보인다.
 * 타입이 이미 막고 있으므로 이 던지기는 정상 경로에서 비용이 0 이다.
 *
 * ## `freeText` 에 기본값을 두지 않는다
 *
 * `freeText = ""` 이던 시절에는 **호출부가 본문을 안 넘기는 것**이 정상 호출과 구분되지
 * 않았다. 게이팅은 "남의 사유에 본문이 실리는" 유출 방향만 막고, 사용자가 `기타` 에 쓴
 * 글이 통째로 사라지는 **폐기 방향**은 조용히 통과했다. 이제 본문 자리는 **항상 명시**
 * 해야 하고(`""` 를 넘기는 것도 명시다), 자유입력인데 그 자리가 비면 던진다 — 이 검사가
 * 빌더에 있으므로 상한도 `canSubmit` 도 없는 호출부(`useRestaurantReviews.reportReview`)가
 * 함께 지켜진다.
 */
export function buildReviewReportPayload(
  code: ReviewReportReasonCode,
  freeText: string,
): { reason: ReviewReportServerReason; detail: string } {
  const matched = REVIEW_REPORT_REASONS.find((item) => item.code === code)
  if (!matched) {
    throw new Error(
      `알 수 없는 후기 신고 사유 코드: ${String(code)}. ` +
        "REVIEW_REPORT_REASONS 에 없는 값은 서버 어휘로 옮길 근거가 없다.",
    )
  }
  const reason = matched.serverReason
  const head = `[${code}]`
  /*
    본문은 **자유입력 사유의 것만** 싣는다. 시트에서 `기타` 에 글을 쓴 뒤 다른 사유로
    바꾸면 입력칸은 사라지지만 문장은 state 에 남고, 그대로 넘기면 사용자가 버렸다고
    믿는 문장이 **다른 사유로** 접수된다(다시 볼 방법도 없다).

    게이팅을 시트가 아니라 여기 두는 이유: 빌더는 화면 어휘가 서버로 나가는 **유일한
    변환점**이라 여기서 막으면 훅을 포함한 모든 호출부가 함께 지켜진다. 시트 쪽
    `setReason` 에서 지우는 방식은 쓰지 않는다 — `기타 → 다른 사유 → 다시 기타` 에서
    쓰던 글이 사라진다.

    다만 이 게이팅이 보는 방향은 **유출**뿐이다. 호출부가 본문을 아예 안 넘기는
    **폐기** 방향은 여기서 안 보이므로, 그 축은 계약 테스트가 호출부 소스를 읽어
    잡는다(렌더 테스트가 없다는 것이 그 축을 못 잡을 이유는 아니다).
  */
  const body = code === REVIEW_REPORT_FREE_TEXT_CODE ? freeText.trim() : ""
  /*
    자유입력은 **본문이 곧 사유다.** 여기서 접으면 `{reason:"OTHER", detail:"[ETC]"}` —
    '기타'라고만 적힌 신고가 서버에 쌓이고, 사용자가 쓴 문장은 다시 볼 방법이 없다.
    시트는 `canSubmit` 으로 이 조합을 애초에 못 누르게 하지만 훅에는 그 검사가 없고,
    시트 쪽 게이팅이 사라져도(본문 인자를 상수로 바꾸는 등) 여기서 걸린다.
  */
  if (code === REVIEW_REPORT_FREE_TEXT_CODE && body.length === 0) {
    throw new Error(
      `자유입력 사유(${REVIEW_REPORT_FREE_TEXT_CODE})는 본문이 곧 사유다. ` +
        "빈 본문으로 접으면 서버에는 사유 코드만 남고 사용자가 쓴 글은 사라진다.",
    )
  }
  if (body.length === 0) return { reason, detail: head }
  // 줄바꿈 한 칸까지 계산해서 남은 자리에만 본문을 담는다.
  return {
    reason,
    detail: `${head}\n${clampUtf16(body, REVIEW_REPORT_DETAIL_MAX - head.length - 1)}`,
  }
}

/**
 * 자를 때 서러게이트 쌍을 반으로 가르지 않는다 — 이모지 하나가 깨진 글자로 남는다.
 *
 * **오늘 이 자르기는 시트에서 도달하지 않는다.** 본문을 실을 수 있는 사유는 자유입력
 * (`[ETC]`) 하나뿐이라 예산은 `REVIEW_REPORT_DETAIL_MAX - "[ETC]".length - 1` 인데
 * 시트 상한(`ReviewReportSheet` 의 `DETAIL_MAX`)은 그보다 작다 — 언제나 위의
 * `text.length <= max` 첫 줄에서 빠져나간다. **여기에 숫자를 옮겨 적지 않는다.**
 * 둘 중 하나만 움직이면 이 산문이 조용히 거짓이 되는데, 산문은 빨개지지 않는다.
 * 그래도 방어를 남기는 이유:
 *  - 시트 상한을 예산까지 올려 실제로 도달시키는 쪽은 **사용자에게 더 나쁘다**. 시안에
 *    없는 숫자로 카운터를 늘려 놓고, 그 끝에서 조용히 잘리는 경험을 만들 뿐이다.
 *    시안 값은 "잘릴 일이 없는 상한"이라 값이 있다.
 *  - 빌더는 export 된 함수고 시트만 부르지 않는다(`useRestaurantReviews.reportReview`
 *    에는 300자 상한이 없다). 상한 없는 호출부에서는 이 방어가 곧 마지막 방어다.
 * 계약 테스트가 "시트 상한 + 앞머리 ≤ 서버 상한" 을 단언해 둔다 — 누가 상한을 올리면
 * 그 단언이 먼저 빨개진다.
 */
function clampUtf16(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, Math.max(0, max))
  const last = cut.charCodeAt(cut.length - 1)
  return last >= 0xd800 && last <= 0xdbff ? cut.slice(0, -1) : cut
}
