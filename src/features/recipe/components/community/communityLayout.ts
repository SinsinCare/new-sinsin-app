/**
 * 커뮤니티(자유글) 재디자인의 **레이아웃 격자 정본**.
 * 출처: `docs/design/community-redesign/00-MASTER.md` §2.0 (그 값들의 근거는 12개 구역
 * 측정 파일 — `feed-home.md` · `feed-drag.md` · `search.md` · `popular.md` · `post-detail.md`
 * · `comment-write.md` · `author-profile.md` · `meal-169.md` 등).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 왜 v2 `tokens/layout.ts` 를 그냥 쓰지 않는가
 *
 * 세 값이 **의도적으로** 전역 격자와 다르다. 마스터 스펙이 각각 판정을 못 박아 뒀다:
 *
 *   - 화면 좌우 여백 **20** vs `layout.GUTTER` 16 — §5.1. 12개 구역 **전부** 20 이고
 *     현행 커뮤니티 코드와 `theme/surface.ts SCREEN_X` 도 20 이다. 16 을 섞으면
 *     `layout.ts` 머리말이 경고하는 "세 번째 시작선" 이 생긴다.
 *     → `layout.GUTTER` 는 **건드리지 않는다**. 커뮤니티만 여기서 20 을 쓴다.
 *   - 칩 간격 **6** vs `layout.CHIP_GAP` 8 — §5.2. 8개 구역이 6 이고 `spacing[6]` 은 실재 토큰이다.
 *   - 섹션 밴드 **8** vs `layout.SECTION_BAND` 16 — §2.7. v2 `V2Divider variant="thick"` 이
 *     16 고정이라 §4-G4(`size` 프롭)가 붙기 전까지는 이 값으로 로컬 구현한다.
 *
 * 이름이 전역 격자와 겹치는 것(`CHIP_GAP` · `RAIL_INSET` · `SECTION_BAND`)은 스펙이 정한
 * 이름이다. **같이 import 하지 말 것** — 커뮤니티 화면은 이 파일만 본다.
 *
 * ■ 왜 순수 모듈인가
 *
 * 이 저장소의 jest 는 `testEnvironment: "node"` 라 `react-native` 를 들여오는 파일을
 * 파싱하지 못한다. 값이 컴포넌트 안에 있으면 "행 높이 공식이 실측 6종을 재현하는가" 를
 * **검증할 방법이 없어** 다음 리팩터에서 조용히 되살아난다.
 * 그래서 `@/src/design-system-v2` 배럴이 아니라 `tokens/*` 를 **직접** 들여온다 —
 * 배럴은 `components/`(react-native)를 함께 끌고 와 이 모듈을 테스트 불가로 만든다.
 * (`components/list/recipeRowLayout.ts` 와 같은 관용구다.)
 */
import { SEARCH_TO_RAIL_GAP as SHARED_SEARCH_TO_RAIL_GAP } from "@/src/design-system-v2/tokens/layout"
import { controlHeight } from "@/src/design-system-v2/tokens/size"
import { spacing } from "@/src/design-system-v2/tokens/spacing"

/**
 * 커뮤니티 화면의 좌우 여백. **20** — §5.1 판정.
 * 리터럴 20 을 화면에 직접 쓰지 말 것. 시작선이 하나여야 한다는 것이 이 상수의 존재 이유다.
 */
export const COMMUNITY_GUTTER = spacing[20]

/**
 * 칩끼리의 간격. **6** — §5.2 판정 (v2 `layout.CHIP_GAP` 은 8이다).
 */
export const CHIP_GAP = spacing[6]

/**
 * 가로 스크롤(칩 레일·사진 스트립)의 **첫 항목 왼쪽 인셋**.
 *
 * 가로 스크롤 컨테이너에 `paddingHorizontal` 을 주면 오른쪽 패딩이 스크롤 끝에서 잘려
 * 마지막 항목이 화면에 붙는다. **`contentContainerStyle` 에만** 준다 — §2.5 "첫 인셋 20".
 */
export const RAIL_INSET = COMMUNITY_GUTTER

/**
 * 섹션을 끊는 전폭 회색 띠의 높이. **8** (`background.lower`) — §2.7.
 * v2 `V2Divider variant="thick"` 의 16 이 아니다. 위 16 / 아래 8 의 흰 여백과 함께 쓴다.
 */
export const SECTION_BAND = spacing[8]

/**
 * **검색 줄 아래 여백** — 그 밑에 바로 칩 레일이 붙는 고정 헤더의 리듬. **8**.
 *
 * 커뮤니티 전용 값이 아니다. 2026-08-21 에 사용자가 "검색도 카테고리 바보다 위에 있고
 * 똑같이 스크롤에 영향을 안 받아야" 한다고 정하면서 **레시피 탭도 같은 모양**으로
 * 통일하기로 했다 — 두 탭이 같은 문법을 쓰려면 이 한 칸이 두 곳에서 같아야 한다.
 * (레시피 탭은 다른 작업이 잡고 있어 이 상수만 내놓는다.)
 *
 * 칩까지의 **광학적** 거리는 이 값 + 레일 자신의 위 여백(`CHIP_RAIL_INSET_V.results` 10)
 * = 18 이다. 레일의 10 을 여기서 다시 세지 않는 이유는, 레일이 밀도를 바꾸면 이 상수도
 * 같이 틀려지기 때문이다 — 각자 자기 몫만 든다.
 *
 * **정본은 `design-system-v2/tokens/layout.ts` 다.** 위 문단이 "커뮤니티 전용 값이 아니다"
 * 라고 적은 그대로, 두 기능의 **공통 상위**에 두고 여기서는 이름만 다시 내놓는다.
 * 이 파일의 다른 값들(20·6·8)은 전역 격자와 **의도적으로 달라서** 여기 사는 것이고,
 * 이 값은 반대로 **같아야 해서** 여기 살 수 없다. 값을 여기 다시 적으면 사본이 되고,
 * 사본은 언젠가 한쪽만 고쳐진다.
 */
export const SEARCH_TO_RAIL_GAP = SHARED_SEARCH_TO_RAIL_GAP

/**
 * 커뮤니티가 공유하는 **행·요소 높이**. 전부 SVG 원본 실측이다(§0.3, 오차 <0.5%).
 * 반올림하지 말 것 — 각 값 옆의 주석이 그 숫자가 어디서 나왔는지다.
 */
export const ROW = {
  /** 태그·카테고리·작성자 배지의 높이. §2.2 `MicroPill`. v2 `V2Chip` 최소 32라 못 쓴다. */
  microPill: 21,
  /** 필터 칩 높이. §2.5 — `controlHeight.sm` 과 같은 값이라 토큰으로 묶는다. */
  chip: controlHeight.sm,
  /** 피드/검색/인기글 게시글 행의 썸네일 한 변. §2.1. */
  thumbLarge: 86,
  /** 76px 목록 행(`CompactPostRow`)의 썸네일 한 변. §2.4. */
  thumbSmall: 60,
  /** 게시글 행 텍스트열의 높이. §2.0 — 제목 20 + gap 4 + 요약 20 + gap 12 + 메타 18. */
  postTextColumn: 74,
  /** `CompactPostRow` 전체 높이. §2.4 (썸네일 60 + 상하 8 = 76). */
  compactRow: 76,
  /** 댓글 행 높이(본문 한 줄 기준). §2.8 — 3개 구역이 독립적으로 98을 측정했다. 줄당 +16. */
  commentRow: 98,
  /** 대댓글의 좌측 들여쓰기. §2.8. */
  commentReplyIndent: 12,
  /** 신신이웃 디렉터리 행(`NeighborRow`) 높이. §2.14. */
  directoryRow: 101,
  /** 팔로워/팔로잉 행(`ConnectionRow`) 높이. §2.14. */
  connectionRow: 81,
  /** 섹션 헤더 높이. §2.7 — 제목 17 Bold + padV 12. */
  sectionHeader: 47,
  /** 상세 댓글 정렬 바 높이. §2.0. */
  sortBar: 48,
  /** 상단 3탭 스트립 높이. §2.15 — `V2Tab size="l"`. */
  tabStrip: 51,
} as const

/**
 * 게시글 행의 **세로 패딩**(위·아래 각각). §2.1 공식의 첫 항과 끝 항.
 *
 * 시안은 feed R1 · search 행(a) · popular 카드1 의 첫 행만 8 로 그렸는데, 그건 시안 자체
 * 오류다(§5.21-3) — **16 으로 통일**한다.
 */
export const POST_ROW_PAD_V = spacing[16]

/** 헤더행(랭크/카테고리 배지)과 그 아래 사이. §2.1. */
export const POST_ROW_HEADER_GAP = spacing[8]

/** 태그 레일과 그 아래 사이. §2.1. */
export const POST_ROW_TAG_GAP = spacing[8]

/** 인기글 랭크 원의 지름. §2.1 — 24×24 `radius.full`, `minWidth 24`(2자리 대비). */
export const POST_ROW_RANK_SIZE = 24

/** 게시글 행이 어떤 부품을 들고 있는지. 높이는 이 네 가지로 **전부** 결정된다. */
export type PostRowShape = {
  /** 인기글의 랭크 원(24)이 있는가. 있으면 헤더행 높이를 이쪽이 정한다. */
  hasRank?: boolean
  /** 카테고리 배지(`MicroPill` 21)가 있는가. */
  hasCategory?: boolean
  /** 태그 레일(21)이 있는가. `tags.slice(0, 4)` 가 비지 않았는가와 같다. */
  hasTags?: boolean
  /** 썸네일(86)이 있는가. 없으면 텍스트열(74)이 높이를 정한다. */
  hasThumbnail?: boolean
}

/**
 * **게시글 행 높이 공식** — §2.1.
 *
 * 4개 구역(feed-drag · feed-home · search · popular)에서 측정된 행 높이 **6종이 전부
 * 이 한 식으로 재현된다.** 그래서 행 종류를 나누지 않고 이 함수 하나로 만든다 —
 * 숫자 6개를 상수로 박아 두면 다섯 번째 조합이 나오는 순간 아무도 답을 모른다.
 *
 * ```
 * 높이 = 16
 *      + [헤더행 + 8]        헤더행 = 랭크 원 24 있으면 24, 없고 배지만 있으면 21
 *      + [태그레일 21 + 8]   태그가 있을 때만
 *      + max(썸네일 86, 텍스트열 74)
 *      + 16
 * ```
 *
 * 실측 대조(§2.1 검증표) — 전부 일치:
 *
 * | 조합 | 계산 | 실측 |
 * |---|---|---|
 * | 배지 + 태그 + 썸 | 16 + 29 + 29 + 86 + 16 | **176** |
 * | 태그 + 썸        | 16 + 29 + 86 + 16      | **147** |
 * | 썸만             | 16 + 86 + 16           | **118** |
 * | 썸 없음          | 16 + 74 + 16           | **106** |
 * | 랭크 + 배지 + 태그 + 썸 | 16 + 32 + 29 + 86 + 16 | **179** |
 * | 랭크만           | 16 + 32 + 74 + 16      | **138** |
 *
 * 랭크와 배지는 **같은 줄**에 있다 — 둘 다 있으면 큰 쪽(24)이 줄 높이다(179 가 그 경우).
 * 썸네일이 있으면 썸네일(86)이 콘텐츠 블록 높이를 정하고 텍스트열(74)은 그 안에서
 * 세로 중앙에 놓인다(§2.1 "썸네일 세로정렬").
 */
export function postRowHeight({
  hasRank = false,
  hasCategory = false,
  hasTags = false,
  hasThumbnail = false,
}: PostRowShape = {}): number {
  const headerRow = hasRank
    ? POST_ROW_RANK_SIZE
    : hasCategory
      ? ROW.microPill
      : 0

  const header = headerRow === 0 ? 0 : headerRow + POST_ROW_HEADER_GAP
  const tagRail = hasTags ? ROW.microPill + POST_ROW_TAG_GAP : 0
  const content = hasThumbnail
    ? Math.max(ROW.thumbLarge, ROW.postTextColumn)
    : ROW.postTextColumn

  return POST_ROW_PAD_V + header + tagRail + content + POST_ROW_PAD_V
}
