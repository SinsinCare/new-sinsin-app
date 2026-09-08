import { over } from "../design-system-v2/tokens/blend"
import {
  primitives,
  semanticDark,
  semanticLight,
} from "../design-system-v2/tokens/colors"
import { getSurfaceLayers } from "../design-system-v2/tokens/layers"
import {
  typography,
  type TextStyleToken,
} from "../design-system-v2/tokens/typography"

/**
 * 서비스 표면 규칙 — 화면 골격(면·보더·글자 3단)의 값 표.
 *
 * ■ 값의 출처는 이제 하나다 (2026-08-17)
 *   아래 팔레트는 **손으로 고른 회색이 아니라 `design-system-v2` 시맨틱에서 파생한 값**이다.
 *   정본은 Figma `Design-system_Mobile`(node-id=20-2) → `design-system-v2/tokens/colors.ts`.
 *   이 파일을 쓰는 화면 78개는 **한 줄도 고치지 않고** v2 와 같은 색을 보게 된다.
 *   같은 역할에 다른 값을 쓰던 세 계보(v2 / surface / tamagui)를 접는 작업의 첫 단계다.
 *   경위와 남은 항목: `docs/design/2026-08-17-design-consistency-plan.md`.
 *
 *   **여기에 새 리터럴 hex 를 적지 말 것.** 필요한 색이 v2 에 없으면 그건 토큰이 없는 것이고,
 *   토큰을 먼저 정해야 한다. 아래 `over()` 로 v2 값을 합성하는 것까지가 허용 범위다.
 *
 * ■ **면의 정본은 이제 사다리다** (2026-08-22)
 *   회색 면의 층은 `design-system-v2/tokens/layers.ts` 가 정한다. 이 파일은 그 단들에
 *   **레거시 이름을 붙이는 어댑터**일 뿐이다 — `card` 는 `planes.content`, `surface` 는
 *   `planes.well`, `bed` 는 `planes.bed` 다(매핑 전문은 아래 `derive` 머리말).
 *   여기서 새 면을 계산하지 마라. 필요한 회색이 사다리에 없으면 **단을 먼저 정한다.**
 *
 * ■ 인터페이스는 그대로다
 *   `SurfacePalette` 의 키 21개는 하나도 늘거나 줄지 않았다. 호출부는 아무것도 모른다.
 *
 * ■ 알파를 그대로 두는 것과 합성하는 것
 *   글자·선(label/line)은 **알파를 그대로 둔다** — 어떤 면 위에 얹혀도 같은 위계로 읽힌다.
 *   면(canvas/card/surface…)은 **바닥 위로 합성해 불투명하게 만든다** — 이 값들은
 *   `interpolateColor` 의 끝점(SurfacePressable)이거나 통째로 교체되는 배경이라,
 *   알파로 두면 눌린 순간 카드가 사라진다.
 *
 * ■ 브랜드
 *   `#FE7139` 하나. v2 `primary.primary` 와 이미 일치하므로 손대지 않는다.
 *
 * 순수 상수·함수만 둔다(RN 의존 없음).
 */

export interface SurfacePalette {
  /** 화면 바닥 */
  canvas: string
  /**
   * **화면이 실제로 까는 바닥.** 아래 `canvas` 와 헷갈리지 말 것 — `canvas` 는 "합성의
   * 기준면"(라이트에서 흰색)이고, 이쪽은 **눈에 보이는 페이지 바닥**이다.
   *
   * 이 칸이 생기기 전에는 화면 8곳이 각자 `isDark ? canvas : surface` 라고 적었다.
   * 같은 뜻을 여덟 번 적으면 그중 하나가 어긋나는 날이 오고, 실제로 그날이 왔다 —
   * 설정 편집 폼 넷이 tamagui `appBg` 로 같은 값을 다른 이름으로 깔다가 그 위의
   * 입력칸과 값이 겹쳤다(`SettingsTextField` 머리말 §우물).
   *
   * ⚠ **`isDark` 로 고르지 않는다.** 규칙은 "카드가 아닌 쪽" 이다 — 라이트는 카드가
   * 바닥(흰색)과 같은 예외라 바닥이 한 겹 아래 우물이고, 다크는 카드가 이미 한 겹
   * 위라 바닥이 곧 `canvas` 다. 그 예외를 다시 쓰는 대신 **예외로부터 계산**한다.
   */
  bed: string
  /** 입력·칩 등 한 단계 떠 있는 면 */
  surface: string
  /**
   * `surface` 보다 **한 단계 얕은** 면. 같은 화면에 우물이 둘 있을 때 둘을 가른다 —
   * 예: 레시피 작성의 `+` 추가 줄(surface)과 그 아래 설명 입력(여기). 같은 값을 쓰면
   * 두 블록이 한 덩어리로 붙어 보인다.
   */
  surfaceSunken: string
  /** 눌린 면 */
  surfacePressed: string
  /**
   * 섹션과 섹션 사이의 **가로 전체 띠**. 카드 경계선 대신 쓰는 굵은 여백이라
   * `hairline`(선)과 역할이 다르다 — 선은 목록 안을 가르고, 이 띠는 화면을 가른다.
   */
  band: string
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
  /** 라벨·보조 문장. 본문(text)보다 한 단계 물러선다. */
  textMuted: string
  /** 가장 옅은 글자. 지금은 `placeholder` 와 같은 단이다 — 아래 파생부 주석 참고. */
  textWeak: string
  placeholder: string
  brand: string
  onBrand: string
  /** 비활성 CTA. 브랜드색을 흐리게 깔지 않는다. */
  ctaOffBg: string
  ctaOffText: string
  /** 사진 없이 기록만 된 카드. 브랜드 틴트 한 벌을 `surfaceBrand` 와 같이 쓴다. */
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

/**
 * v2 시맨틱 한 벌에서 표면 팔레트를 만든다. 라이트·다크가 **같은 규칙**을 탄다 —
 * 모드마다 다른 규칙을 쓰면 그게 곧 다음 드리프트의 씨앗이다.
 *
 * ■ 면은 **이제 여기서 정하지 않는다** (2026-08-22)
 *
 * 층(면의 사다리)은 `design-system-v2/tokens/layers.ts` 가 정본이고, 이 함수는 거기에
 * **이름만 붙인다.** 예전에는 이 파일이 팔레트를 만들면서 층까지 같이 정했다 —
 * `card` 의 라이트 예외도, 우물 두 겹도, 바닥이 "카드가 아닌 쪽" 이라는 것도 전부
 * 여기 있었다. 그러면 층을 물어볼 곳이 어댑터 한 곳뿐이라, v2 를 보는 화면
 * (`useV2Theme`)은 층을 알 방법이 없었고 회색이 필요하면 골라야 했다.
 *
 * **값은 한 바이트도 안 바뀐다.** 계산식이 통째로 옮겨 간 것이고, 대조는
 * `tests/surfaceLadderGuard.test.ts` §L2 가 사다리 이전 팔레트 전체를 떠서 맞춘다.
 *
 * 아래 매핑이 어댑터 이름 ↔ 사다리 단의 전부다:
 *
 *   canvas        planes[basePlane]  (= `background.default`. 라이트 content · 다크 bed)
 *   bed           planes.bed
 *   card          planes.content
 *   surface       planes.well
 *   surfaceSunken planes.wellShallow
 *   surfacePressed planes.pressed
 *   band          planes.band
 *   ctaOffBg      planes.well
 *
 * 1:1 대응이 없어 판단이 들어간 자리는 각 줄에 이유를 적었다.
 */
function derive(v2: typeof semanticLight, isDark: boolean): SurfacePalette {
  const { label, line, primary, status, static: staticColors } = v2
  const { planes, basePlane } = getSurfaceLayers(isDark)

  /**
   * 합성의 기준면(`background.default`). **아래 `bed` 와 헷갈리지 말 것** —
   * 이쪽은 "합성의 기준면"(라이트에서 흰색)이고, `bed` 는 눈에 보이는 페이지 바닥이다.
   * 사다리에서는 라이트 `content` · 다크 `bed` 단이다.
   */
  const canvas = planes[basePlane]

  return {
    canvas,
    bed: planes.bed,
    surface: planes.well,
    surfaceSunken: planes.wellShallow,
    surfacePressed: planes.pressed,
    band: planes.band,

    // 선택·기록완료 표시의 브랜드 틴트. **회색이 아니라 색**이라 사다리 밖이다.
    // 라이트는 Figma 의 primary-weak. 다크는 Figma 가 라이트와 같은 값(#fff1eb)을 둬서
    // 그대로 쓰면 거의 흰 면이 된다(§1-B-2, 디자이너 확인 대기). 확인 전까지는
    // **primary 를 18% 로 깐 기존 값**을 유지하되 리터럴 대신 primary 토큰에서 파생한다.
    surfaceBrand: isDark
      ? over(`${primary.primary}2e`, canvas)
      : over(primary.primaryWeak, canvas),

    // 다크 카드 값은 예전 tamagui 의 cardBgDark(#313138)와 사실상 같은 색으로 떨어진다
    // — 두 계보가 여기서 만난다.
    card: planes.content,

    border: line.normal,
    hairline: line.alternative,

    // 글자 4단은 v2 label 사다리를 그대로 탄다. 알파를 유지해 어떤 면 위에서도 같은 위계.
    textStrong: label.normal,
    text: label.neutral,
    textMuted: label.alternative,
    // v2 label 사다리에 textMuted 와 placeholder 사이 단이 없다.
    // 없는 단을 지어내는 대신 **가장 옅은 단으로 합친다** — 위계는 넷이면 충분하다.
    textWeak: label.assistive,
    placeholder: label.assistive,

    brand: primary.primary,
    onBrand: staticColors.white,

    // 비활성 CTA. 우물과 같은 단이다(V2Button 의 disabled 와 같은 면).
    ctaOffBg: planes.well,
    // V2Button 은 disabled 전경에 label.disable 을 쓰지만 그 값은 위 면 위에서 1.3:1 이라
    // 사실상 안 보인다. 비활성 CTA 는 "지금은 못 누른다"가 읽혀야 하므로 한 단 진한 쪽을 쓴다.
    ctaOffText: label.assistive,

    // 사진 없이 기록만 된 카드. 예전엔 surfaceBrand 와 2pt 다른 별도 틴트였는데
    // 두 개를 유지할 이유가 없어 **브랜드 틴트 한 벌로 합쳤다**.
    recordedTint: isDark
      ? over(`${primary.primary}2e`, canvas)
      : over(primary.primaryWeak, canvas),

    danger: status.negative,
    caution: status.cautionary,
  }
}

const LIGHT: SurfacePalette = derive(semanticLight, false)
const DARK: SurfacePalette = derive(semanticDark, true)

export function getSurfacePalette(isDark: boolean): SurfacePalette {
  return isDark ? DARK : LIGHT
}

/** Small body text on an inset neutral panel needs an opaque dark-mode label. */
export function surfaceBodyText(surface: {
  isDark: boolean
  text: string
}): string {
  return surface.isDark ? primitives.grayscale[400] : surface.text
}

/**
 * 정본 텍스트 토큰에서 **크기·행간·자간만** 떼어 낸다.
 *
 * `TYPE` 은 호출부가 `fontWeight` 로 굵기를 정하는 표라, face 를 같이 넘기면
 * 이미 굵은 face 위에 합성 볼드가 한 번 더 얹힌다. 굵기는 `AppText` 가 face 로 바꾼다.
 */
function sizeOf(token: TextStyleToken) {
  return {
    fontSize: token.fontSize,
    lineHeight: token.lineHeight,
    letterSpacing: token.letterSpacing,
  } as const
}

/**
 * TYPE 표 — **v2 `typography` 스케일 위의 별칭**이다 (2026-08-17).
 *
 * 예전에는 여기 크기·행간·자간을 손으로 적었고, 그래서
 *  - 자간이 11개 토큰 전부 음수였다(정본은 전부 0),
 *  - 스케일에 없는 크기(16·18·12.5)가 섞였고,
 *  - `label` 과 `caption` 이 같은 값인데 이름만 둘, `value` 와 `cardTitle` 은
 *    같은 15px 인데 행간이 22/21 로 갈렸다.
 * 같은 15px 텍스트가 탭마다 다른 폭으로 그려지던 원인이 이 표다.
 *
 * 이제 각 키는 정본 토큰 하나를 가리킨다. **크기를 여기서 새로 정하지 않는다** —
 * 필요한 크기가 스케일에 없으면 그건 스케일을 늘릴 일이지 여기 숫자를 적을 일이 아니다.
 *
 * 굵기는 값에 들어 있지 않다. 호출부가 `fontWeight` 로 준 굵기는
 * `shared/components/AppText` 의 `Text` 가 Pretendard face 로 바꿔 준다 —
 * 그 파일 머리말 참고(그게 없으면 OS 기본 서체로 그려진다).
 */
export const TYPE = {
  /** 가입 스텝 질문. 2줄 고정 */
  question: sizeOf(typography.title.smallXWeak), // 20/27
  /** 필드 라벨 */
  label: sizeOf(typography.subtext.medium), // 13/18
  /** 필드 값 */
  value: sizeOf(typography.subtext.large), // 15/20
  /** CTA 라벨. v2 스케일에 16 이 없다 — 버튼(large)의 정본은 label.medium 이다. */
  cta: sizeOf(typography.label.medium), // 17/21
  sheetTitle: sizeOf(typography.title.xSmall), // 17/23
  /** 섹션 타이틀. 식당 탭(정본 구현)이 쓰는 값과 같은 것으로 맞췄다 — 예전 18px 은 스케일 밖. */
  sectionTitle: sizeOf(typography.title.xSmall), // 17/23
  /** 홈 카드 타이틀 + 보조 */
  cardTitle: sizeOf(typography.label.small), // 15/19
  cardSub: sizeOf(typography.subtext.small), // 12/16 (예전 12.5 — 정수 아닌 크기였다)
  caption: sizeOf(typography.subtext.medium), // 13/18
  /** 기록 수치 + 단위 */
  numeric: sizeOf(typography.display.medium), // 28/38
  unit: sizeOf(typography.caption.medium), // 14/16
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
  /**
   * **스크롤하지 않는 머리(제목·검색·세그먼트) 와 그 아래 목록 사이.**
   *
   * 이 값은 장식이 아니라 기능이다 — 머리가 고정이면 목록은 그 밑변에서 **잘린다.**
   * 여백이 없으면 스크롤한 순간 카드 사진이 검색창에 딱 붙어 잘려서, 층이 겹친 것이
   * 아니라 **사진이 깨진 것처럼** 보인다(2026-08-18 레시피 탭 실측, 사용자 지적).
   *
   * 실제로 화면마다 제각각이었다 — 레시피 0 · 커뮤니티 4 · 내 활동 4 · 보관함 4 ·
   * 마이페이지 12. 0 과 4 는 둘 다 "붙어 잘린다" 쪽이다. `section.titleGap` 과 같은
   * 12 로 맞춰 머리가 하나의 띠로 읽히게 한다.
   *
   * **잘리는 자리는 화면마다 다르고, 옮겨 다닌다.** 레시피 홈은 2026-08-21 에 카테고리
   * 레일이 고정층으로 올라가면서 그 경계가 검색창 밑변 → **레일 밑변**으로 내려갔다.
   * 값이 아니라 **자리**가 바뀐 것이므로 이 상수는 그대로고, 화면이 이 패딩을 어느
   * 상자에 다느냐만 따라 내려간다(`recipeHomeStickyLayout.ts` 의 `RECIPE_STICKY`).
   */
  stickyHeaderGap: 12,
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
