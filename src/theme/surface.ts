import { tokens } from "./tokens"

/**
 * 서비스 표면 규칙 — "신신당부 전체 화면 구현 시트" 의 COLOR / TYPE / LAYOUT 을 옮긴 것.
 * 가입·온보딩·홈(기록)이 같은 값을 본다. 화면마다 회색을 새로 고르지 않는다.
 *
 * ■ 색
 *   면(surface)·보더(border)·글자 3단(textStrong / text / textWeak)만 쓴다.
 *   유채색 면은 선택·기록 완료 표시에만(브랜드 틴트). 그림자는 쓰지 않는다.
 *
 * ■ 브랜드
 *   시트는 #FF6B2D 로 표기돼 있고 앱 토큰은 #FE7139 다. 두 오렌지를 섞으면 화면마다
 *   브랜드가 달라 보이므로 앱 토큰 하나만 쓴다. 시트 값으로 통일하려면
 *   theme/tokens.ts 의 primary 한 줄만 바꾸면 전 화면이 따라온다.
 *
 * 순수 상수·함수만 둔다(RN 의존 없음).
 */

export interface SurfacePalette {
  /** 화면 바닥 */
  canvas: string
  /** 입력·칩 등 한 단계 떠 있는 면 */
  surface: string
  /** 눌린 면 */
  surfacePressed: string
  /** 선택된 면(브랜드 틴트) */
  surfaceBrand: string
  /** 카드 면. 라이트에서는 바닥(회색) 위의 흰 카드다. */
  card: string
  /** 실선이 꼭 필요한 곳(입력 보더). 기본은 여백과 톤으로 나눈다. */
  border: string
  /** 구분선 */
  hairline: string
  textStrong: string
  text: string
  /**
   * 라벨·보조 문장. 본문(text)보다 한 단계 물러서고 캡션(placeholder)보다는 진하다.
   * 라이트·다크가 같은 두 회색을 역할만 바꿔 쓴다(#747678 ↔ #A5A7A9).
   */
  textMuted: string
  textWeak: string
  placeholder: string
  brand: string
  onBrand: string
  /** 비활성 CTA. 브랜드색을 흐리게 깔지 않는다. */
  ctaOffBg: string
  ctaOffText: string
  /** 사진 없이 기록만 된 카드(시트: #FFF4EF / 다크 #2A2A2C) */
  recordedTint: string
  /** 위험 신호. 리포트·경고 전용이며 브랜드색과 겸하지 않는다. */
  danger: string
  /**
   * 3단 판정의 가운데(주의). 브랜드색을 주의색으로 겸하면 CTA 와 경고가 같은 색이 되어
   * "눌러야 하는 것"과 "조심해야 하는 것"의 위계가 무너진다.
   * 값은 지어내지 않고 FoodNutrientDonuts 가 이미 쓰던 앰버를 정본화한 것이다.
   *
   * danger 와 같은 규칙을 따른다 — **도트·텍스트에만** 쓴다. 틴트 면을 만들지
   * 않는다. 상태색 면이 늘어나는 순간 화면이 경고로 얼룩진다.
   */
  caution: string
}

const LIGHT: SurfacePalette = {
  canvas: "#FFFFFF",
  surface: "#F2F3F5",
  surfacePressed: "#E8EAED",
  surfaceBrand: "#FFF6F2",
  card: "#FFFFFF",
  border: "#E1E2E4",
  hairline: "rgba(23,24,28,0.06)",
  textStrong: "#17181C",
  text: "#3A3C42",
  textMuted: "#747678",
  textWeak: "#8A8D95",
  placeholder: "#A5A7A9",
  brand: tokens.color.primary.val,
  onBrand: "#FFFFFF",
  ctaOffBg: "#F2F3F5",
  ctaOffText: "#A5A8AE",
  recordedTint: "#FFF4EF",
  danger: "#C81E12",
  caution: "#B45309",
}

const DARK: SurfacePalette = {
  canvas: "#1F1F21",
  surface: "#26262A",
  surfacePressed: "#323238",
  surfaceBrand: "rgba(254,113,57,0.18)",
  card: "#232326",
  border: "#3A3A40",
  hairline: "rgba(255,255,255,0.08)",
  textStrong: "#F5F5F7",
  text: "#DCDCE2",
  textMuted: "#A5A7A9",
  textWeak: "#93959D",
  placeholder: "#747678",
  brand: tokens.color.primary.val,
  onBrand: "#FFFFFF",
  ctaOffBg: "#2E2E33",
  ctaOffText: "#7A7D85",
  recordedTint: "#2A2A2C",
  danger: "#FF5A4D",
  caution: "#FBBF24",
}

export function getSurfacePalette(isDark: boolean): SurfacePalette {
  return isDark ? DARK : LIGHT
}

/** 시트 TYPE 표. 크기가 곧 위계다 — 화면마다 다시 정하지 않는다. */
export const TYPE = {
  /** 가입 스텝 질문. 2줄 고정 */
  question: { fontSize: 20, lineHeight: 30, letterSpacing: -0.4 },
  /** 필드 라벨 */
  label: { fontSize: 13, lineHeight: 18, letterSpacing: -0.26 },
  /** 필드 값 */
  value: { fontSize: 15, lineHeight: 22, letterSpacing: -0.3 },
  cta: { fontSize: 16, lineHeight: 22, letterSpacing: -0.32 },
  sheetTitle: { fontSize: 17, lineHeight: 24, letterSpacing: -0.34 },
  /** 홈 섹션 타이틀 */
  sectionTitle: { fontSize: 18, lineHeight: 25, letterSpacing: -0.36 },
  /** 홈 카드 타이틀 + 보조 */
  cardTitle: { fontSize: 15, lineHeight: 21, letterSpacing: -0.3 },
  cardSub: { fontSize: 12.5, lineHeight: 18, letterSpacing: -0.25 },
  caption: { fontSize: 13, lineHeight: 18, letterSpacing: -0.26 },
  /** 기록 수치 + 단위 */
  numeric: { fontSize: 28, lineHeight: 34, letterSpacing: -0.7 },
  unit: { fontSize: 14, lineHeight: 20, letterSpacing: -0.28 },
} as const

/**
 * **단일행 `TextInput` 의 글자 스타일.** 위 `TYPE` 토큰을 그대로 쓰지 말고 이걸 통과시킨다.
 *
 * `TYPE` 은 전부 `lineHeight` 를 들고 있는데, 그건 `Text` 를 위한 값이다.
 * 한 줄짜리 `TextInput` 에 `lineHeight` 가 들어가면 **iOS 가 글자를 세로 가운데가 아니라
 * 문단 스타일(min/maxLineHeight) 기준으로 앉힌다.** 그래서 내용이 바뀔 때마다 —
 * 생년월일이 `1997` 에서 `1997.11` 로 자동 서식되는 순간처럼 — 글자가 위아래로 튄다.
 * 컨테이너는 `height: 56 + alignItems: center` 로 멀쩡한데 글자만 움직이므로
 * 패딩 문제로 보이지만, 패딩에는 아무 문제가 없다.
 *
 * `includeFontPadding: false` 는 안드로이드 몫이다. 폰트 위아래에 붙는 여백을 떼지 않으면
 * 같은 필드가 두 OS 에서 다른 높이에 그려진다.
 *
 * 설정 화면의 `SettingsTextField` 가 처음부터 이 규칙(lineHeight 없음 +
 * includeFontPadding false)으로 되어 있었고 증상이 없었다 — 그쪽이 기준이다.
 *
 * **여러 줄 입력에는 쓰지 말 것.** 거기서는 `lineHeight` 가 줄 간격을 정하는 진짜 역할을 한다.
 */
export function singleLineInputText<T extends { lineHeight?: number }>(
  token: T,
): Omit<T, "lineHeight"> & { includeFontPadding: false } {
  const { lineHeight: _lineHeightIsForText, ...rest } = token
  return { ...rest, includeFontPadding: false }
}

/** 화면 좌우 여백. 이 파일 안에서 파생값(레일 인셋·본문 시작선)을 계산하려고 따로 뺐다. */
const SCREEN_X = 20

/**
 * 아이콘·번호·체크처럼 본문 **앞에 오는 표시**의 한 변, 그리고 표시와 본문 사이.
 *
 * 행마다 이 크기를 다시 고르면 본문 시작선이 행마다 달라진다 — 재료(24)와 조리 단계(26)가
 * 실제로 2pt 어긋나 있었다. 눈에 띄지 않을 것 같지만, 같은 스크롤에 두 문단이 세로로
 * 쌓이면 문단 왼쪽이 흔들리는 것으로 보인다.
 */
const ROW_MARKER = 26
const ROW_MARKER_GAP = 12

/** 시트 LAYOUT 표. 높이·라디우스를 여기서만 정한다. */
export const LAYOUT = {
  screenX: SCREEN_X,

  /**
   * 가로 스크롤(칩 레일·카드 캐러셀)의 **첫 항목 왼쪽 인셋**. 값은 `screenX` 와 같지만
   * **주는 자리가 다르다** — 반드시 `contentContainerStyle` 에 준다.
   *
   * 가로 스크롤을 `paddingHorizontal` 을 준 컨테이너로 감싸면 뷰포트 자체가 좁아져서
   * 마지막 항목이 화면 끝에서 잘리고, 끝까지 밀어도 다음 항목이 보이지 않는다.
   * `contentContainerStyle` 에 주면 컨테이너는 화면 끝까지 살아 있고 내용만 들어온다.
   */
  railInset: SCREEN_X,

  /** 선행 표시(아이콘·번호·체크)의 한 변. 위 `ROW_MARKER` 머리말 참고. */
  rowMarker: ROW_MARKER,
  /** 선행 표시와 본문 사이. */
  rowMarkerGap: ROW_MARKER_GAP,
  /**
   * 선행 표시가 있는 행에서 **본문이 시작하는 x**(화면 왼쪽 기준).
   *
   * 한 화면의 시작선은 **둘**이다 — 제목·문단은 `screenX`, 표시가 붙은 행의 본문은 여기.
   * 셋째가 생기는 순간이 "컴포넌트가 따로 노는" 순간이다.
   */
  rowTextIndent: SCREEN_X + ROW_MARKER + ROW_MARKER_GAP,

  headerHeight: 56,
  /**
   * 헤더의 아이콘 버튼(뒤로가기 등).
   *
   * **아이콘 상자의 왼쪽 모서리를 `screenX` 에 정확히 맞추면서 터치 영역 44 를 지킨다.**
   * 둘은 그냥은 같이 안 된다 — `padding` 만 주면 상자가 그만큼 안으로 밀려 아래 제목보다
   * 오른쪽에서 시작하고, `padding` 을 빼면 터치 영역이 아이콘 크기(24)로 줄어든다.
   * 그래서 padding 을 주고 같은 값을 음수 마진으로 되돌린다.
   *
   *     style={{ padding: LAYOUT.iconButton.pad, marginLeft: -LAYOUT.iconButton.pad }}
   *
   * 이걸 화면마다 눈대중으로 보정하다 `screenX - 8`, `paddingHorizontal: 4` 같은 값이
   * 생겼고, 그래서 가입·온보딩·설정의 뒤로가기가 각각 16 / 12 / 20 에서 시작했다.
   * 보정값을 새로 만들지 말고 이 토큰을 쓸 것.
   */
  iconButton: { size: 24, pad: 10 },
  progressHeight: 3,
  /** 진행바 ~ 질문 / 질문 ~ 입력 */
  questionTop: 16,
  questionToField: 28,
  field: { height: 56, radius: 14 },
  cta: { height: 56, radius: 16, bottom: 34 },
  /** 홈 카드 안의 CTA 는 한 단계 낮다 */
  ctaCompact: { height: 52, radius: 16 },
  /** 성별 등 선택 카드 */
  selectCard: { size: 128, radius: 20 },
  sheet: { radius: 24, handleWidth: 40, handleHeight: 4 },
  /**
   * 홈 섹션·카드.
   *
   * - `titleGap` — 섹션 제목과 그 내용 사이. 섹션마다 다시 고르면(레시피 상세가 실제로
   *   12·14·14·14·16 이었다) 같은 스크롤 안에서 섹션마다 제목이 다른 높이로 뜬다.
   * - `between` — 섹션과 섹션 사이. `paddingVertical` 과 같은 값이고, 섹션이 자기 여백을
   *   갖지 않고 부모가 `gap` 으로 나눌 때 쓴다.
   */
  section: {
    paddingVertical: 24,
    paddingHorizontal: SCREEN_X,
    gap: 8,
    titleGap: 12,
    between: 24,
  },
  card: { radius: 16, padding: 18, gap: 12 },
  /** 숫자 스테퍼 같은 조작부 */
  control: { height: 44, radius: 12 },
  /** 빠른 추가 칩 */
  chip: { height: 36, radius: 10 },
  /** 세그먼트 트랙과 그 안의 아이템 */
  segment: { radius: 14, itemHeight: 36, itemRadius: 10 },
  /** 상태 배지 */
  badge: { height: 28, radius: 8 },
} as const

/**
 * 모션. 전환은 짧고 한 방향이며, 되돌아갈 때만 반대로 흐른다.
 * 시스템 "동작 줄이기"는 reanimated 의 ReduceMotion.System 이 처리한다.
 */
export const MOTION = {
  shift: 24,
  duration: { fast: 140, base: 220, slow: 300 },
  spring: { damping: 22, stiffness: 220, mass: 0.9 },
} as const
