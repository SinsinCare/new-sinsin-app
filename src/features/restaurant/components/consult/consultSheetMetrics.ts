/**
 * 상담 시트가 공유하는 **치수와 글자 한 벌**. 시안(375×812 프레임의 3배 렌더)을 ÷3 한 값이다.
 *
 * 한 곳에 모으는 이유는 정렬 때문이다 — 사용자 버블 오른쪽 끝, 어시스턴트 버블 왼쪽 끝,
 * 복사·공유 아이콘의 x, 면책 문구, 컴포저 알약이 **전부 같은 선**에 서야 한다. 파일마다
 * 숫자를 적으면 그중 하나만 고쳐지는 날이 온다.
 *
 * ## 시안 대비 알려진 차이 (되돌리려 하지 말 것)
 *
 * | 항목 | 시안 | 우리 | 이유 |
 * |---|---|---|---|
 * | 핸들 블록 | 40 | 44 | `V2BottomSheet` 의 최소 터치 타겟. 아래 전부가 4pt 씩 내려간다 |
 * | 컴포저 `＋`·🎤 | 있음 | 없음 | 첨부·음성 **구현이 앱에 없다**(`ConsultSheetComposer` 머리말) |
 * | 답변 뒤 액션 행 | 턴 간격 **안**(합 28) | 합 47 | 아래 `CONSULT_ANSWER_TAIL_GAP` — **호스트 배선이 남았다** |
 * | 대화 목록 위 여백 | 36 | 16 | 아래 `CONSULT_TOP_GAP` — **호스트 배선이 남았다** |
 */

import type { TextStyle } from "react-native"

import { spacing } from "@/src/design-system-v2/tokens"

/** 시트 본문 좌우 여백. 채팅 거터(`ChatMessageBubble` 의 `CHAT_GUTTER`)와 같은 20 이다. */
export const CONSULT_GUTTER = spacing[20]

/** 마스코트 지름. 시안 실측 40×40, x=20(= 거터). */
export const CONSULT_AVATAR = 40

/** 마스코트와 버블 사이. 시안 실측 10 → 어시스턴트 버블 왼쪽 x=70. */
export const CONSULT_AVATAR_GAP = spacing[10]

/** 버블 안여백. 시안 실측 좌우 14 / 상하 12. */
export const CONSULT_BUBBLE_PAD_X = 14
export const CONSULT_BUBBLE_PAD_Y = spacing[12]

/** 턴과 턴 사이. 시안 실측 24(E3_1: 사용자 버블 바닥 202.67 → 어시스턴트 버블 머리 227). */
export const CONSULT_TURN_GAP = spacing[24]

/**
 * 제목 줄상자 아래에서 본문 첫 줄까지. 시안 실측 36.
 *
 * 빈 상태와 대화 목록이 **같은 값**이다(E2_1: 줄상자 바닥 120 → 문구 잉크 상자 156.
 * E3_1: 같은 120 → 첫 사용자 버블 156). 시트를 열어 두고 첫 질문을 보내는 순간
 * 헤더 아래가 20pt 튀면 안 되는데, 지금 목록은 `listContent` 의 16 으로 그린다.
 *
 * **호스트 배선이 남았다** — `RestaurantConsultSheetHost` 의
 * `listContent: { paddingVertical: spacing[16] }` 를
 * `{ paddingTop: CONSULT_TOP_GAP, paddingBottom: spacing[16] }` 로.
 */
export const CONSULT_TOP_GAP = 36

/**
 * 어시스턴트 버블 바닥 → 복사·공유 행 위. 시안 실측 3.17 → 그리드 4.
 */
export const CONSULT_ACTION_ROW_GAP = spacing[4]

/**
 * 액션 행 아래 → 다음 질문 버블. 시안 실측 7.17 → 그리드 6.
 *
 * 시안은 답변 뒤 세로 간격을 **28** 로 쓰고(E6_1: 버블 바닥 275.67 → 다음 버블 머리 304)
 * 액션 행 18 을 그 안에 넣는다(4 + 18 + 6 = 28). 우리는 액션 행이 자기 높이를 차지한 뒤
 * 호스트가 턴 간격 24 를 또 얹어 **47** 이 된다 — 시안의 1.7배다.
 *
 * 음수 마진으로 액션 행을 턴 간격 위로 밀어 넣지 **않았다**. 안드로이드는 부모 상자 밖으로
 * 나간 자식에게 터치를 전달하지 않는다 — 복사·공유·재생성이 **보이는데 안 눌리는** 상태가 된다.
 * 그래서 아래를 줄이는 일은 간격을 소유한 쪽, 즉 호스트가 해야 한다.
 *
 * **호스트 배선이 남았다** — `ItemSeparatorComponent` 는 `leadingItem` 을 받는다:
 * 앞 메시지가 어시스턴트면 `CONSULT_ANSWER_TAIL_GAP`, 아니면 `CONSULT_TURN_GAP`.
 */
export const CONSULT_ANSWER_TAIL_GAP = spacing[6]

/**
 * 버블 본문 글자.
 *
 * **15/23 조합의 타이포 토큰이 없다** — `label.small` 은 15/19, `subtext.large` 는 15/20 이다.
 * 시안은 줄피치 23 이고(어시스턴트 버블 높이 185 = 7줄×23 + 12×2 로 정확히 떨어진다),
 * 그 값이 이 표면의 읽기 리듬이다. 그래서 토큰이 아니라 숫자 한 쌍을 여기 한 번만 적는다.
 * `V2Text` 가 `fontWeight` 를 Pretendard face 로 바꿔 주므로 서체는 지켜진다.
 */
export const CONSULT_BUBBLE_TEXT: TextStyle = { fontSize: 15, lineHeight: 23 }
