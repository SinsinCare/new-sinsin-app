/**
 * 화면 **레이아웃 격자** — 기능(feature)을 가리지 않는 공용 값.
 *
 * ## 출처와 이 파일이 생긴 이유
 *
 * 원본은 `src/features/restaurant/layout.ts` 다. 거기 머리말이 문제를 정확히 적어 뒀다:
 * 상세 화면의 좌우 여백만 세어도 `16`(36곳)·`24`(10곳)·`12`(7곳)·`10`·`8`·`6`·`2` 가
 * 섞여 있었고, 값 하나하나는 그럴듯한데 화면에서는 **왼쪽 시작선이 여러 개**로 보였다.
 * 그게 "컴포넌트들이 따로 논다" 는 느낌의 정체였다. 고친 것은 숫자가 아니라 **기준**이다.
 *
 * 레시피 상세도 같은 병을 앓는다(실측: 화면 여백 16, 카드 안 14, 타일 안 14, 시트 16,
 * 섹션 간격 10/14/16/22/24 혼재). 같은 병에 같은 약을 써야 하는데 —
 * **레시피가 `features/restaurant/` 를 import 하면 안 된다.** 기능 모듈끼리 의존하면
 * 식당 팀의 리팩터가 레시피를 깨고, 두 기능은 서로의 배포 단위가 아니다.
 *
 * 그래서 규칙만 이 위치로 올렸다. 오늘 기준 **정본은 아직 식당 파일**이다(그 파일은
 * 지금 다른 작업자가 편집 중이라 손댈 수 없다). 식당 쪽 잠금이 풀리면
 * `features/restaurant/layout.ts` 를 이 파일의 re-export 로 바꿔서 정본을 여기로 옮겨야 한다.
 * 그 전까지 두 파일의 값은 **같아야 하고**, 어느 한쪽만 고치면 안 된다.
 *
 * ## 두 층으로 나눈다 (섞으면 안 된다)
 *
 * - **화면(screen)**: 좌우 `16`. 목업 §10 "화면 좌우 16".
 * - **모달 시트(sheet)**: 좌우 `24`. `V2BottomSheet` 가 제목·본문·푸터를 `spacing[24]` 로
 *   잡으므로 시트를 16 으로 끌어내리면 오히려 DS 와 어긋난다.
 *
 * 두 값이 다른 건 실수가 아니라 **표면이 다르기 때문**이다. 한 표면 안에서는 하나여야 한다.
 *
 * ## 시작선은 둘까지만
 *
 * 아이콘이 있는 행은 텍스트가 항상 `TEXT_INDENT`(= GUTTER + 아이콘 + 간격)에서 시작하고,
 * 섹션 제목처럼 아이콘 없는 줄은 `GUTTER` 에서 시작한다. **의도적으로 둘이다**(제목 < 본문).
 * 세 번째 시작선이 생기는 순간이 무너지는 순간이다.
 */

import { iconSize } from "./size"
import { radius } from "./radius"
import { spacing } from "./spacing"

/** 화면 좌우 여백. 목업 §10. 지도·리스트·상세가 공유한다. */
export const GUTTER = spacing[16]

/**
 * 모달 시트 좌우 여백. `V2BottomSheet` 와 같은 값이라 시트 안의 DS 컴포넌트와 선이 맞는다.
 * 화면(`GUTTER`)과 다른 것은 의도다 — 위 머리말 참고.
 */
export const SHEET_GUTTER = spacing[24]

/** 정보 행의 아이콘 크기. `V2Icon size="sm"` 과 같은 값이어야 선이 맞는다. */
export const ROW_ICON = iconSize.sm

/** 아이콘과 텍스트 사이. 목업 §10 "아이콘-텍스트 gap 8". */
export const ROW_ICON_GAP = spacing[8]

/**
 * 아이콘이 있는 행에서 **텍스트가 시작하는 x**(화면 왼쪽 기준).
 * 아이콘 없는 줄을 이 값에 맞추고 싶을 때도 쓴다 — 예: 아이콘 행 아래에 붙는 보조 설명.
 */
export const TEXT_INDENT = GUTTER + ROW_ICON + ROW_ICON_GAP

/** 섹션 사이 세로 여백. 목업 §10 "섹션 상하 20~24" 의 하한을 기본으로 쓴다. */
export const SECTION_GAP = spacing[20]

/** 섹션 제목과 그 내용 사이. */
export const SECTION_TITLE_GAP = spacing[12]

/** 목록 항목 사이. */
export const ITEM_GAP = spacing[16]

/** 칩끼리의 간격. 목업 §10 "칩 gap 8". */
export const CHIP_GAP = spacing[8]

/**
 * 섹션을 끊는 두꺼운 회색 띠의 높이. `V2Divider variant="thick"` 이 16 을 쓰므로 같은 값이다.
 * 큰 덩어리 사이에만 쓴다 — 매 섹션에 넣으면 화면이 줄무늬가 된다.
 */
export const SECTION_BAND = spacing[16]

/**
 * 정보 덩어리를 묶는 **둥근 회색 카드**의 안쪽 여백.
 *
 * 면으로 묶으면 "여기부터 여기까지가 한 주제" 가 한눈에 잡힌다. 다만 면을 쓰는 순간
 * 안쪽 여백이 좁으면 글자가 상자에 갇혀 보이므로 `GUTTER` 와 같은 값을 안쪽에도 준다 —
 * 화면 여백과 카드 여백이 같은 수라 카드 안팎의 리듬이 어긋나지 않는다.
 */
export const CARD_PADDING = GUTTER

/**
 * 그 카드의 모서리. 한 화면에 곡률이 두 개면 카드가 사진과 다른 재질처럼 보인다.
 */
export const CARD_RADIUS = radius.lg

/**
 * 카드끼리의 간격. 카드가 면으로 이미 끊고 있으므로 섹션 간격보다 좁게 둔다.
 */
export const CARD_GAP = spacing[12]

/**
 * 가로 스크롤(사진 스트립·칩 레일)의 **첫 항목 왼쪽 인셋**.
 *
 * 가로 스크롤 컨테이너에 `paddingHorizontal` 을 주면 안 된다 — 오른쪽 패딩이 스크롤
 * 끝에서 잘려 마지막 항목이 화면에 붙는다. `contentContainerStyle` 에 이 값을 준다.
 */
export const RAIL_INSET = GUTTER
