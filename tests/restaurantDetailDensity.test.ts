/**
 * 상세 화면의 **정보 밀도와 위계** 계약 (네이버 지도 벤치마크 §F 의 P0).
 *
 * 벤치마크에서 확인된 격차 세 가지를 여기에 못 박는다.
 *
 * 1. **메타가 한 줄이다.** `한식 · ★4.63 · 리뷰 1,848`. 우리는 배지 줄과 평점 줄이
 *    따로 있어 같은 세 조각에 세로를 두 배로 썼다.
 * 2. **영업 상태가 다음 전환을 말한다.** `영업 중 · 15:00에 브레이크타임`. 우리는
 *    `영업중 21:30까지` 로 **마감만** 말해서, 브레이크타임이 있는 가게에서 지금
 *    출발해도 되는 것처럼 읽혔다.
 * 3. **액션이 한 벌이어야 한다** — 같은 네 가지 일을 서로 다른 두 모양으로 동시에
 *    그리면 두 개의 다른 물건으로 보인다.
 *
 *    이 항목의 **자리**는 2026-08-20 에 한 번 바뀌었다. 벤치마크 당시의 결론은
 *    "상단 pill 행 + 스크롤하면 하단 고정" 이었고, 시안은 "히어로에는 액션 없음 +
 *    하단 바 상주" 다. 명제(한 벌)는 그대로고 자리만 둘에서 하나로 줄었다. 아래
 *    `액션은 한 벌이다` describe 안에 옛 기대값이 왜 정본이 아닌지 적어 두었다.
 *
 * ## 여기서 검사하지 않는 것
 *
 * 2번의 **판정** — "지금이 브레이크 전인가" 는 서버가 KST 로 계산한다
 * (`sinsin-be-bun/.../businessHours.ts`). 이 파일이 검사하는 것은 그 판정 결과에
 * **이름을 옳게 붙이는가**뿐이다. 시각 경계를 여기서 흉내내면 판정 규칙이 두 곳에
 * 생기고, 그게 `restaurantBusinessStatus.test.ts` 머리말이 막으려는 결함이다.
 *
 * 3번의 렌더 결과는 이 저장소에 컴포넌트 렌더 하네스가 없으므로
 * `restaurantDetailReset.test.ts` 와 같은 방식으로 **소스를 읽어 배선을 확인**한다.
 */

import fs from "fs"
import path from "path"

import { resolveTheme } from "../src/design-system-v2/theme"
import { over } from "../src/design-system-v2/tokens/blend"
import { radius } from "../src/design-system-v2/tokens/radius"
import {
  controlHeight,
  iconSize,
  touchTarget,
} from "../src/design-system-v2/tokens/size"
import { spacing } from "../src/design-system-v2/tokens/spacing"
import { typography } from "../src/design-system-v2/tokens/typography"
import { hasCommonKeyInBothLocales } from "./helpers/i18nResourceKeys"
import {
  describeBusinessStatus,
  transitionWallClock,
} from "../src/features/restaurant/utils/businessStatus"

const light = resolveTheme("light").colors
const dark = resolveTheme("dark").colors

const FEATURE_DIR = path.join(__dirname, "..", "src", "features", "restaurant")
const SCREEN = fs.readFileSync(
  path.join(FEATURE_DIR, "views", "RestaurantDetailScreen.tsx"),
  "utf8",
)
const META_LINE = fs.readFileSync(
  path.join(FEATURE_DIR, "components", "detail", "DetailMetaLine.tsx"),
  "utf8",
)
const ACTION_PILLS = fs.readFileSync(
  path.join(FEATURE_DIR, "components", "detail", "DetailActionPills.tsx"),
  "utf8",
)
const INFO_ROWS = fs.readFileSync(
  path.join(FEATURE_DIR, "components", "detail", "DetailInfoRows.tsx"),
  "utf8",
)

/**
 * 주석을 걷어낸 소스. **"이 필드를 쓰지 않는다" 류의 금지 계약은 이쪽에서 검사한다.**
 *
 * 이 저장소는 왜 안 쓰는지를 그 필드 이름과 함께 주석에 적어 두는 관습이 있어서,
 * 원문에 `not.toContain("legacyNutritionTags")` 를 걸면 **설명이 스스로를 위반한다.**
 * 그렇다고 설명을 지우면 다음 사람이 같은 판단을 처음부터 다시 하게 된다.
 *
 * 문자열 안의 `//`(URL 등)까지 지우지 않도록 줄 전체가 주석인 경우만 걷는다 — 이 파일들이
 * 실제로 쓰는 형태가 그것뿐이다.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/^[ \t]*\/\/.*$/gmu, "")
}

const SCREEN_CODE = stripComments(SCREEN)
const PILLS_CODE = stripComments(ACTION_PILLS)
const INFO_ROWS_CODE = stripComments(INFO_ROWS)

/**
 * `StyleSheet.create` 안에서 **이름 하나의 블록만** 잘라 온다.
 *
 * 이 파일에 있던 치수 단언이 오랫동안 공허했던 이유가 파일 전체 `toContain` 이었다 —
 * `height: touchTarget.min`(콘텐츠 행)과 `height: controlHeight.sm`(CTA)을 서로 맞바꿔도
 * 두 문자열이 파일 어딘가에 남아 있어서 초록이었다. 값이 **어느 블록에 묶였는지**를
 * 봐야 그 맞바꿈이 걸린다.
 *
 * 이름이 없으면 던진다. 블록 이름을 바꾸는 변이도 초록으로 지나가지 않게 하기 위해서다.
 */
function styleBlock(source: string, name: string): string {
  const at = source.indexOf(`\n  ${name}: {`)
  if (at === -1) throw new Error(`스타일 블록 \`${name}\` 이 없다`)
  const open = source.indexOf("{", at)
  let depth = 0
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1
    else if (source[i] === "}") {
      depth -= 1
      if (depth === 0) return source.slice(open, i + 1)
    }
  }
  throw new Error(`스타일 블록 \`${name}\` 이 닫히지 않았다`)
}

/**
 * 최상위 함수 하나의 원문. 닫는 `}` 가 0열에 있는 이 저장소의 서식을 이용한다.
 *
 * `function UtilityButton[\s\S]{0,700}` 같은 창(window) 매칭을 대신한다 — 창은 함수가
 * 길어지면 조용히 다음 함수까지 넘겨다보고, 짧아지면 있어야 할 것을 못 본다.
 */
function fnSource(source: string, name: string): string {
  // 닫는 `}` 는 **줄을 끝내는** 것이어야 한다. 여러 줄로 분해된 매개변수의 `}`(뒤에
  // `: Props) {` 가 붙는다)에서 멈추면 함수 본문을 한 글자도 못 본다.
  const match = new RegExp(
    `\\n(?:export )?function ${name}\\([\\s\\S]*?\\n\\}(?=\\n|$)`,
    "u",
  ).exec(source)
  if (!match) throw new Error(`함수 \`${name}\` 이 없다`)
  return match[0]
}

/**
 * 화면의 `actions` 배열을 항목 단위로 쪼갠다. 배열 리터럴을 통째로 `toContain` 하면
 * "네 번째에 글리프가 없다" 같은 **항목별** 계약을 표현할 수 없다.
 */
function actionEntries(): { key: string; body: string }[] {
  const at = SCREEN_CODE.indexOf("const actions: DetailAction[] = [")
  if (at === -1) throw new Error("`actions` 배열 리터럴이 없다")
  // `DetailAction[]` 의 `[` 가 아니라 대입 뒤의 `[` 에서 시작해야 한다.
  const open = SCREEN_CODE.indexOf("= [", at) + 2
  let depth = 0
  let close = -1
  for (let i = open; i < SCREEN_CODE.length; i += 1) {
    if (SCREEN_CODE[i] === "[") depth += 1
    else if (SCREEN_CODE[i] === "]") {
      depth -= 1
      if (depth === 0) {
        close = i
        break
      }
    }
  }
  if (close === -1) throw new Error("`actions` 배열이 닫히지 않았다")
  return SCREEN_CODE.slice(open, close)
    .split(/(?=\bkey: ")/u)
    .slice(1)
    .map((body) => ({
      key: /key: "(\w+)"/u.exec(body)?.[1] ?? "",
      body,
    }))
}

describe("전환 시각의 벽시계 — 기기 시간대를 타지 않는다", () => {
  it("KST 오프셋 문자열에서 HH:MM 을 그대로 꺼낸다", () => {
    expect(transitionWallClock("2026-07-31T15:00:00+09:00")).toBe("15:00")
    expect(transitionWallClock("2026-07-31T21:30:00+09:00")).toBe("21:30")
    // 밀리초·초 생략 어느 쪽도 서버가 낼 수 있다.
    expect(transitionWallClock("2026-07-31T15:00+09:00")).toBe("15:00")
    expect(transitionWallClock("2026-07-31T15:00:00.000+09:00")).toBe("15:00")
  })

  it("KST 오프셋이 아니면 모른다고 답한다 (추측해서 변환하지 않는다)", () => {
    // `Z` 로 정규화된 값의 15:00 은 KST 벽시계가 아니다. 여기서 +9 를 더해 주는 순간
    // 이 파일이 하지 않기로 한 클라이언트 재계산이 뒷문으로 들어온다.
    expect(transitionWallClock("2026-07-31T15:00:00Z")).toBeNull()
    expect(transitionWallClock("2026-07-31T15:00:00+00:00")).toBeNull()
    expect(transitionWallClock("2026-07-31 15:00:00")).toBeNull()
    expect(transitionWallClock(null)).toBeNull()
    expect(transitionWallClock(undefined)).toBeNull()
    expect(transitionWallClock("")).toBeNull()
  })

  it("기기 시간대를 바꿔도 결과가 같다", () => {
    const before = process.env.TZ
    const read = (tz: string) => {
      process.env.TZ = tz
      return transitionWallClock("2026-07-31T15:00:00+09:00")
    }
    expect(read("UTC")).toBe("15:00")
    expect(read("America/New_York")).toBe("15:00")
    expect(read("Asia/Seoul")).toBe("15:00")
    process.env.TZ = before
  })
})

describe("영업중이 다음 전환을 말한다 (벤치마크 관찰 9)", () => {
  const KST_BREAK = "2026-07-31T15:00:00+09:00"
  const KST_CLOSE = "2026-07-31T21:30:00+09:00"

  it("다음 전환이 브레이크 시작이면 마감이 아니라 브레이크를 말한다", () => {
    expect(
      describeBusinessStatus(
        {
          status: "OPEN",
          closingTime: "21:30",
          breakStartTime: "15:00",
          breakEndTime: "17:00",
          nextTransitionAt: KST_BREAK,
        },
        light,
      ),
    ).toMatchObject({
      subLabelKey: "restaurant.businessStatus.breakAt",
      subParams: { time: "15:00" },
    })
  })

  it("브레이크가 이미 끝났으면(다음 전환 = 마감) 예전대로 `까지` 다", () => {
    // 서버의 다음 전환이 21:30 이라는 것 자체가 "브레이크는 지났다" 는 뜻이다.
    // 우리가 지금이 몇 시인지 따로 계산할 필요가 없는 이유.
    expect(
      describeBusinessStatus(
        {
          status: "OPEN",
          closingTime: "21:30",
          breakStartTime: "15:00",
          breakEndTime: "17:00",
          nextTransitionAt: KST_CLOSE,
        },
        light,
      ),
    ).toMatchObject({
      subLabelKey: "restaurant.businessStatus.until",
      subParams: { time: "21:30" },
    })
  })

  it("브레이크타임이 없는 가게는 지어내지 않는다", () => {
    // 개발 DB 의 2,632 행 전부 `break_start` 가 비어 있다(2026-07-31 실측).
    // 없는 브레이크를 만들어 내면 그게 프로토타입의 `휴무일 21:30까지` 와 같은 종류의 거짓말이다.
    expect(
      describeBusinessStatus(
        {
          status: "OPEN",
          closingTime: "21:30",
          breakStartTime: null,
          nextTransitionAt: KST_CLOSE,
        },
        light,
      ),
    ).toMatchObject({
      subLabelKey: "restaurant.businessStatus.until",
      subParams: { time: "21:30" },
    })
  })

  it("전환 시각을 모르면(목록 카드) 예전 문구 그대로다", () => {
    // 카드 응답에는 `nextTransitionAt` 이 아예 없다. 그 자리에서 브레이크를 주장하려면
    // 기기 시계를 봐야 하고, 그 순간 카드와 상세가 서로 다른 상태를 말하게 된다.
    expect(
      describeBusinessStatus(
        {
          status: "OPEN",
          closingTime: "21:30",
          breakStartTime: "15:00",
          nextTransitionAt: null,
        },
        light,
      ),
    ).toMatchObject({ subLabelKey: "restaurant.businessStatus.until" })
  })

  it("브레이크 예고는 OPEN 에서만 나온다", () => {
    // `BREAK_TIME` 은 이미 브레이크 중이므로 할 말이 `15:00에 브레이크타임` 이 아니라
    // `17:00부터 다시 영업` 이다. 두 문구가 뒤바뀌면 사용자는 지금 갈 수 있다고 읽는다.
    expect(
      describeBusinessStatus(
        {
          status: "BREAK_TIME",
          breakStartTime: "15:00",
          breakEndTime: "17:00",
          nextTransitionAt: "2026-07-31T17:00:00+09:00",
        },
        light,
      ).subLabelKey,
    ).toBe("restaurant.businessStatus.breakUntil")
  })

  it("문구 키가 ko/en 둘 다에 있다", () => {
    // 없으면 화면에 `restaurant.businessStatus.breakAt` 이 그대로 찍힌 채 배포된다.
    expect(hasCommonKeyInBothLocales("restaurant.businessStatus.breakAt")).toBe(
      true,
    )
    expect(hasCommonKeyInBothLocales("restaurant.metaDot")).toBe(true)
  })

  it("상세가 서버의 `breakStart` 를 실제로 넘긴다", () => {
    // 유틸만 맞고 배선이 빠지면 화면은 그대로다.
    expect(INFO_ROWS).toContain("breakStartTime={status.breakStart}")
  })
})

describe("메타 한 줄 (벤치마크 관찰 1)", () => {
  it("음식 종류·평점·리뷰가 한 줄에 온다 — 배지 줄과 평점 줄로 쪼개지 않는다", () => {
    expect(SCREEN).toContain("<DetailMetaLine")
    // 옛 두 줄 구조가 되살아나지 않게 못 박는다.
    expect(SCREEN).not.toContain("styles.badgeRow")
    expect(SCREEN).not.toContain("styles.ratingRow")
  })

  it("세 조각을 가운뎃점으로 잇고 그 점은 i18n 에서 온다", () => {
    expect(META_LINE).toContain('t("restaurant.metaDot")')
    for (const key of [
      "restaurant.detail.metaRating",
      "restaurant.detail.metaReviews",
      "restaurant.detail.metaAccessibility",
    ]) {
      expect(hasCommonKeyInBothLocales(key)).toBe(true)
    }
  })

  it("리뷰 수를 `count` 로 보간하지 않는다 (영어에서 `1 reviews` 가 된다)", () => {
    expect(META_LINE).toContain("formattedCount")
  })

  it("상호명 옆에 영양 태그 칩을 그리지 않는다 (미검수 임상 주장)", () => {
    /*
      2026-08-20 시안(C1_1)의 상호명 줄은 `신신국밥 [저단백] [한식]` 이다. **거절했다.**
      화면과 시안이 다른 것이 실수로 보이지 않게 여기서 못 박는다.

      `저단백` 은 `NutritionTag.LOW_PROTEIN` 이고, 그 출처는 정적
      `restaurant.nutrition_tags` CSV — 수집 시각에 메뉴 평균으로 붙인 라벨이라 환자별
      기준을 모른다. 5기·투석 환자와 1기 환자가 같은 칩을 본다. 백엔드는 같은 문자열을
      `nonclinicalTags()` 로 걸러 내고 있고(BUILD_CONTRACT §-1.1), 히어로에 칩으로
      그리는 것은 그 검열의 **두 번째 우회로**를 여는 일이다. 그래서 서버도 이 값을
      `legacyNutritionTags`(디버깅용) 이름으로만 내린다.

      개인 기준으로 계산된 값은 `safety` 이고 그건 **메뉴 단위**로만 뜻이 있다 —
      식당 단위 등급을 배지로 단언하면 사용자가 "이 집은 가도 되는 곳" 을 색 하나로
      판단한다. 안전도 배지 자체를 없애자는 말이 아니다. 그것은 메뉴 목록에 살아 있고
      `restaurantSafetyBadge.test.ts` 가 지킨다.
    */
    expect(SCREEN_CODE).not.toContain("legacyNutritionTags")
    expect(SCREEN_CODE).not.toContain("nutritionBadges")
    expect(SCREEN_CODE).not.toContain("nutritionTagLabelKey")
    // 식당 단위 등급을 히어로에 그리는 경로도 함께 막는다.
    expect(SCREEN_CODE).not.toContain("avgSafety")
    expect(SCREEN_CODE).not.toContain("<SafetyBadge")
  })

  it("음식 종류는 칩으로 올라가고 메타 줄에서는 빠진다 (축은 한 곳이다)", () => {
    /*
      ── 2026-08-21 갱신 ────────────────────────────────────────────────
      앞 판본은 정확히 반대였다: `cuisineLabel={t(...)}` 가 있어야 하고 칩은 없어야 했다.
      근거는 "배지는 종류가 여러 개일 때 값어치가 있고 `cuisineType` 은 단수다" 였는데,
      그건 **취향 판단이었지 안전 근거가 아니다**(옆 항목의 `저단백` 거절과 다르다).

      그리고 시안(C1_1)이 한 일은 칩을 하나 더한 것이 아니라 **이 축을 메타 줄에서 빼서
      칩으로 올린 것**이다. 그래서 두 자리에 동시에 두면 시안을 반만 따른 것이 되고,
      옛 `868식당 [한식] / ★4.9 · 한식` 의 중복이 그대로 돌아온다. 칩을 그리는 쪽과
      메타 줄에서 빼는 쪽을 **한 항목 안에서** 함께 못 박는 이유가 그것이다.
    */
    const chips = SCREEN_CODE.match(/<CuisineChip\b/gu) ?? []
    expect(chips).toHaveLength(1)
    expect(SCREEN_CODE).toContain(
      "label={t(`restaurant.cuisine.${detail.cuisineType}`)}",
    )
    // 같은 값이 메타 줄로도 가면 축이 둘이 된다.
    expect(SCREEN_CODE).toContain("cuisineLabel={null}")
    expect(SCREEN_CODE).not.toContain("cuisineLabel={t(")
    // 조각을 뺄 수 있다는 것은 `DetailMetaLine` 이 원래부터 열어 둔 문이다.
    expect(META_LINE).toContain("cuisineLabel: string | null")
  })

  it("칩 치수는 시안 C1_1 실측이고 전부 토큰 위에 떨어진다", () => {
    /*
      3배 렌더 PNG 를 픽셀 단위로 재서 얻은 값이다.

        높이 20.0 · 모서리 10.3(= 높이의 절반 → pill) · 좌우 안여백 7.5~8 ·
        면 rgb(244,244,245) · 글자 13(획 굵기가 `진단하기` 와 같다) · 글자색 rgb(105,106,109)

      높이는 직접 주지 않는다 — 글줄(16) + 위아래 2 로 저절로 20 이 되어야, 글꼴을 키운
      사용자에게서 글자가 상자에 잘리지 않는다. 그 산수를 여기서 못 박는다.
    */
    const chip = styleBlock(SCREEN_CODE, "cuisineChip")
    expect(chip).toContain("paddingHorizontal: spacing[8]")
    expect(chip).toContain("paddingVertical: spacing[2]")
    // pill 이다. `radius.lg`(12)로 되돌리면 20 높이에서 렌더가 10 으로 클램프해 겉보기는
    // 같지만, `radius.ts` 머리말이 "pill 은 언제나 radius.full" 이라고 정해 두었다.
    expect(chip).toContain("borderRadius: radius.full")
    expect(chip).not.toContain("height:")

    expect(typography.label.xSmall.fontSize).toBe(13)
    expect(typography.label.xSmall.lineHeight + spacing[2] * 2).toBe(20)
    expect(spacing[8]).toBe(8)

    const fn = fnSource(SCREEN_CODE, "CuisineChip")
    expect(fn).toContain("typography.label.xSmall")
    expect(fn).toContain("colors.label.neutral")
    expect(fn).toContain("colors.fill.normal")

    /*
      실측색과 합성이 일치하는지. 리터럴 hex 를 스타일에 적을 일이 없다는 뜻이고,
      동시에 이 두 줄이 **어느 토큰이 그 값인지**를 계산으로 고정한다.
    */
    expect(over(light.fill.normal, light.background.default)).toBe("#f4f4f5")
    expect(over(light.label.neutral, "#f4f4f5")).toBe("#696a6d")
  })

  it("상호명이 길면 칩이 아니라 상호명이 접힌다", () => {
    // 칩을 줄이면 `한식` 이 `한…` 이 되어 아무 것도 말하지 못하는 상자만 남는다.
    const row = styleBlock(SCREEN_CODE, "titleRow")
    expect(row).toContain('flexDirection: "row"')
    expect(row).toContain('alignItems: "center"') // 시안: 칩 중심 122.0 ↔ 상호명 잉크 중심 121.8
    expect(row).toContain("gap: spacing[8]") // 시안: 상호명 상자 끝 → 칩 왼쪽 8.2
    expect(styleBlock(SCREEN_CODE, "title")).toContain("flexShrink: 1")
    expect(styleBlock(SCREEN_CODE, "cuisineChip")).not.toContain("flexShrink")
  })
})

describe("액션은 한 벌이다 (벤치마크 관찰 2·11)", () => {
  it("액션은 **다섯**이다 — 우리가 실제로 할 수 있는 일만 (길찾기 포함)", () => {
    for (const key of [
      "restaurant.detail.actionDiagnose",
      "restaurant.detail.actionRoute",
      "restaurant.detail.actionCall",
      "restaurant.detail.actionShare",
      "restaurant.detail.actionSave",
      "restaurant.detail.actionSaved",
    ]) {
      expect(hasCommonKeyInBothLocales(key)).toBe(true)
    }
    /*
      2026-07-31 에 `길찾기` 가 들어왔다. 이 자리의 앞 판본은 "네이버의 `출발`·`도착`은
      우리에게 없는 기능이라 베끼지 않는다" 였고, 그 규칙 자체는 여전히 옳다 —
      **우리는 경로를 계산하지 않는다.** 바뀐 것은 길찾기를 그렇게 볼 이유가 없다는 판단이다:

        - 이 화면은 "여기 가도 되는가" 를 판단하는 곳이고, 판단이 끝난 사용자의 다음
          행동은 하나뿐이다(간다). 국내 지도·맛집 서비스가 예외 없이 상세에 길찾기를 둔다.
        - 없던 기능을 만드는 것이 아니라 **좌표를 들고 지도 앱을 여는 것**이다
          (`utils/mapAppLinks`). 죽은 버튼이 되는 경로는 좌표가 없을 때인데, 그때는
          `canRouteTo` 가 false 라 버튼 자체가 그려지지 않는다 — 그 규칙을 아래에서 검사한다.

      `예약`·`쿠폰` 은 여전히 만들지 않는다. 그건 우리가 대신할 수단이 없다.
    */
    const actionKeys = [...SCREEN.matchAll(/^\s*key: "(\w+)",$/gm)].map(
      (m) => m[1],
    )
    expect(new Set(actionKeys)).toEqual(
      new Set(["diagnose", "route", "call", "share", "bookmark"]),
    )
  })

  it("좌표가 없으면 길찾기 버튼을 만들지 않는다 (죽은 버튼 금지)", () => {
    // 이름만으로 지도 앱을 열면 동명 가게로 안내한다 — 없는 것보다 나쁘다.
    expect(SCREEN).toContain("canRouteTo({")
    // 주석을 걷은 쪽에서 본다 — 그 액션에 붙은 설명이 길어졌다고 계약이 흔들리면 안 된다.
    expect(SCREEN_CODE).toMatch(/canRouteTo\([\s\S]{0,120}key: "route"/u)
  })

  it("채움은 하나뿐이다 — 진단하기만 primary", () => {
    const primaries = SCREEN.match(/emphasis: "primary"/g) ?? []
    expect(primaries).toHaveLength(1)
    expect(SCREEN).toMatch(/key: "diagnose"[\s\S]{0,200}emphasis: "primary"/)
  })

  it("액션을 그리는 자리는 **하나**다 — 하단 바뿐", () => {
    /*
      ── 2026-08-20 갱신 ────────────────────────────────────────────────
      이 자리의 앞 판본은 세 가지를 검사했고, 셋 다 더 이상 정본이 아니다.

        (a) `<DetailActionPills actions={actions} />` 가 히어로 안에 있을 것
        (b) `actionRowBottom`·`actionsPinned`·`pointerEvents` 로 하단 고정을 켜고 끌 것
        (c) `actionBarHidden` 으로 투명하게 숨길 것

      옛 기대값이 옳았던 전제는 "액션이 히어로와 하단 **두 자리**에 그려진다" 였다.
      시안이 그 전제를 뒤집는다 — 히어로는 `상호명 → 평점 → 소개 → 사진` 이고 액션이
      없다(C1_1). 하단 바는 스크롤 위치와 무관하게 항상 상주한다(C1_2·C2_2~C6_2 여섯 장
      전부 동일한 바). 자리가 하나면 (a)~(c) 는 검사할 대상 자체가 없다.

      "액션은 한 벌" 이라는 이 describe 의 명제는 약해진 게 아니라 강해졌다. 그래서
      **자리가 둘로 늘어나는 것**을 여기서 계속 막는다.
    */
    /*
      ── 2026-08-21 갱신 ────────────────────────────────────────────────
      바로 위 문단은 옳지만 **아래 단언들이 그것을 검사하지 않았다.** 앞 판본이 본 것은
      폐기된 식별자 세 개(`actionRowBottom`·`actionsPinned`·`actionBarHidden`)의 이름
      부재뿐이라, 같은 동작을 `barVisible` 로 이름만 바꿔 되살리면 그대로 초록이었다.
      이름 목록은 계약이 아니다.

      그래서 이름이 아니라 **구조**를 본다. 옛 결함이 돌아오려면 넷 중 하나는 반드시 깨진다:
        (a) 바 태그가 두 번 나오거나(두 자리),
        (b) 바가 조건부로 렌더되거나(나타났다 사라짐),
        (c) 바가 스크롤 **안**으로 들어가거나(본문과 함께 흘러감),
        (d) 바가 보임을 켜고 끄는 prop 을 받거나.
    */
    // (a) 자리는 하나다. 액션 배열이 두 곳으로 갈라지는 것도 같은 결함이다.
    expect(SCREEN_CODE.match(/<DetailActionBar\b/gu) ?? []).toHaveLength(1)
    expect(SCREEN_CODE.match(/actions=\{actions\}/gu) ?? []).toHaveLength(1)

    const barAt = SCREEN_CODE.indexOf("<DetailActionBar")

    /*
      (b) 조건부 렌더가 아니다. 조건부 JSX 는 태그 바로 앞에 `&&`·`?`·`:` 중 하나를
      남긴다(여는 괄호와 공백만 그 사이에 낄 수 있다). 그 문자를 직접 본다.
    */
    const lead = SCREEN_CODE.slice(0, barAt).replace(/[\s(]+$/u, "")
    for (const operator of ["&&", "?", ":"]) {
      expect(lead.endsWith(operator)).toBe(false)
    }

    /*
      (c) 스크롤 **밖**의 형제다. 안에 있으면 높이 되먹임이 자기 자신을 밀어내고,
      무엇보다 바가 본문과 함께 흘러가 "항상 보인다" 가 거짓이 된다.

      `lastIndexOf` 여야 한다 — 히어로의 사진 캐러셀도 `ScrollView` 라 `indexOf` 는
      **세로 스크롤이 아니라 그 가로 스크롤의 닫는 태그**를 집고, 그러면 바를 세로
      스크롤 안으로 옮겨도 이 단언이 참인 채로 남는다(실제로 그랬다).
    */
    expect(SCREEN_CODE.lastIndexOf("</ScrollView>")).toBeLessThan(barAt)

    /*
      (d) 바가 받는 prop 은 셋뿐이다. `style`·`pointerEvents`·`opacity` 어느 것으로도
      보임을 켜고 끌 수 없다는 뜻이고, 옛 `actionBarHidden` 이 하던 일이 정확히 그것이다.
    */
    const bar = SCREEN_CODE.match(/<DetailActionBar[\s\S]*?\/>/u)?.[0] ?? ""
    const barProps = [...bar.matchAll(/\b(\w+)=\{/gu)].map((m) => m[1])
    expect(new Set(barProps)).toEqual(
      new Set(["actions", "paddingBottom", "onLayout"]),
    )

    /*
      히어로 안의 pill 행이 되살아나면 걸린다. 그 컴포넌트는 이제 존재하지 않는다.
      (`DetailActionPills` 라는 **낱말**은 아직 코드에 있다 — 바가 사는 파일 이름이
      그대로라 import 경로에 남는다. 그래서 낱말이 아니라 JSX 태그를 본다.)
    */
    expect(SCREEN_CODE).not.toContain("<DetailActionPills")
    expect(PILLS_CODE).not.toContain("export function DetailActionPills")
    // 바 쪽에서 숨기는 통로도 없다. 스타일 블록 안에서만 본다.
    const barStyle = styleBlock(PILLS_CODE, "bar")
    for (const channel of ["opacity", "display", "transform"]) {
      expect(barStyle).not.toContain(channel)
    }
    expect(PILLS_CODE).not.toContain("pointerEvents")
  })

  it("아이콘 바와 pill 행을 둘 다 그리지 않는다", () => {
    // 같은 네 가지 일을 서로 다른 두 모양으로 동시에 보여 주면 둘이 다른 것으로 읽힌다.
    expect(SCREEN).not.toContain("function ActionIcon")
    expect(SCREEN).not.toContain("<ActionIcon")
  })

  it("채움을 가진 것은 `진단하기` 하나뿐이고, 글리프 없는 액션은 글자로 읽힌다", () => {
    /*
      시안의 하단 바는 라벨 없는 아이콘 셋 + 주황 글자 버튼 하나다. 옛 pill 행이 라벨을
      단 이유("무엇을 할 수 있는 곳인지가 읽혀야 한다")는 여기서 **주요 액션 하나**로
      좁혀서 지킨다 — 아이콘 셋은 저장·공유·전화라 글리프만으로 보편적으로 읽힌다.

      2026-08-21 에 넷째(`길찾기`)가 글자가 됐다(아래 `길찾기는 글자로 읽힌다` 항목).
      그래서 이 항목의 명제는 "글자가 하나" 가 아니라 **"채움이 하나"** 다.

      보이지 않는다고 라벨을 지우면 스크린리더 사용자에게는 버튼이 사라진다. 그래서
      글리프 버튼도 `accessibilityLabel` 로 i18n 문구를 계속 받는다.
    */
    const utility = fnSource(PILLS_CODE, "UtilityButton")
    const text = fnSource(PILLS_CODE, "TextButton")
    const primary = fnSource(PILLS_CODE, "PrimaryButton")

    for (const fn of [utility, text, primary]) {
      expect(fn).toContain("accessibilityLabel={action.label}")
      expect(fn).toContain('accessibilityRole="button"')
    }

    // 글리프 버튼: 아이콘만, 글자 없음.
    expect(utility).toContain("<V2Icon")
    expect(utility).not.toContain("<Text")
    // 글자 버튼 둘: 글자만, 아이콘 없음(시안의 CTA 는 글자뿐이다).
    for (const fn of [text, primary]) {
      expect(fn).toContain("<Text")
      expect(fn).not.toContain("<V2Icon")
    }

    // 채움은 `PrimaryButton` 에만 있다. `TextButton` 은 면도 테두리도 없다.
    expect(primary).toContain("backgroundColor: colors.primary.primary")
    expect(text).not.toContain("backgroundColor")
    expect(styleBlock(PILLS_CODE, "textButton")).not.toContain("borderWidth")
    // 두 글자 버튼의 잉크가 다르다는 것이 "채움이 하나" 의 다른 표현이다.
    expect(text).toContain("color: colors.label.normal")
    expect(primary).toContain("color: colors.static.white")
  })

  it("순서는 화면이 정하고 바는 그것을 뒤집지 않는다", () => {
    /*
      시안은 `🔖 ↗ 📞` 셋이다(C1_2·C4_2). 우리는 `길찾기` 를 지울 수 없으므로 넷이 되는데,
      **시안의 셋을 시안 순서 그대로 두고 뒤에 더한다** — 그래야 시안과 겹치는 부분이
      1:1 로 남는다. 맨 오른쪽(= CTA 바로 옆)인 이유는 판단이 끝난 사용자의 다음 행동이
      "간다" 라서다.

      ── 2026-08-21 갱신 ────────────────────────────────────────────────
      앞 판본은 화면 쪽 배열만 보고 "`DetailActionBar` 는 순서를 정하지 않는다" 를 **근거로
      적어 두기만 했다.** 그 전제가 미검사면 렌더러가 뒤집는 순간 순서 계약이 통째로
      무효가 된다. 그래서 전제도 함께 못 박는다.
    */
    expect(actionEntries().map((entry) => entry.key)).toEqual([
      "bookmark",
      "share",
      "call",
      "route",
      "diagnose",
    ])

    // 렌더러 불변식 1: 배열을 다시 정렬하지 않는다.
    expect(PILLS_CODE).not.toContain(".reverse()")
    expect(PILLS_CODE).not.toMatch(/\.sort\(/u)
    // 렌더러 불변식 2: 어느 행도 `row-reverse` 가 아니다. 방향을 뒤집는 것은
    // `reverse()` 와 화면에서 구별되지 않는다.
    expect(PILLS_CODE).not.toContain("reverse")
    for (const name of ["row", "utilities", "worded"]) {
      expect(styleBlock(PILLS_CODE, name)).toContain('flexDirection: "row"')
    }
  })

  it("길찾기는 남아 있을 뿐 아니라 **읽힌다** (같은 글리프를 두 뜻으로 쓰지 않는다)", () => {
    /*
      2026-08-21. 넷째 액션의 글리프는 `mapPin` 이었는데, **같은 화면의 주소 행이 이미
      그 글리프**다(`DetailInfoRows`). 한 화면에서 같은 그림이 "여기가 주소" 와 "여기를
      눌러 길을 찾아라" 를 동시에 뜻하면 둘 다 안 읽힌다. 라벨을 지우기 전에는 `길찾기`
      라는 보이는 글자가 그 모호함을 막고 있었다.

      구분되는 글리프는 `iconRegistry` 에 없다(내비게이션 화살표 계열이 한 종도 없다).
      그래서 넷째만 글리프 없이 **글자로** 그린다 — 시안의 아이콘 셋은 1:1 로 남고,
      우리가 더한 것은 더한 것처럼 보인다.

      `전화` 는 정보 행과 글리프가 겹치지만 그대로 둔다. 겹침 자체가 문제가 아니라
      **두 뜻**이 문제이고, 전화 글리프는 두 자리에서 같은 뜻이다(건다).
    */
    const entries = actionEntries()
    const wordless = entries.filter((entry) => !/\bicon: /u.test(entry.body))
    expect(wordless.map((entry) => entry.key)).toEqual(["route", "diagnose"])

    // 글리프를 지우고 라벨만 없애는(= 다시 안 읽히는) 되돌림을 막는다.
    const route = entries.find((entry) => entry.key === "route")?.body ?? ""
    expect(route).toContain('label: t("restaurant.detail.actionRoute")')

    // `mapPin` 의 주인은 주소 행이다. 그 행이 이 글리프를 놓으면 위 판단을 다시 읽어야 한다.
    const screenIcons = [...SCREEN_CODE.matchAll(/icon: "(\w+)"/gu)].map(
      (m) => m[1],
    )
    expect(screenIcons).not.toContain("mapPin")
    expect(INFO_ROWS_CODE).toContain('name="mapPin"')

    /*
      바는 글리프 없는 보조 액션을 **조용히 버리지 않는다** — 글자 버튼으로 보낸다.
      두 무리가 서로의 **여집합**이어야 그것이 보장된다. 술어 이름이 무엇인지는 상관없고
      (이름만 보는 단언은 `isGlyphActionRenamed` 같은 개명에 그대로 통과한다), 두 번째
      `filter` 가 첫 번째의 부정인지가 계약이다. 예컨대 오른쪽 무리를
      `emphasis === "primary"` 로 바꾸면 `길찾기` 가 어느 무리에도 못 들어가 사라진다.
    */
    const barFn = fnSource(PILLS_CODE, "DetailActionBar")
    expect(barFn).toMatch(
      /\.filter\((\w+)\)[\s\S]*?\.filter\(\(action\) => !\1\(action\)\)/u,
    )
    expect(fnSource(PILLS_CODE, "UtilityButton")).not.toContain("return null")
  })

  it("저장 상태는 글리프 **면**과 색 두 갈래로 말한다", () => {
    /*
      라벨을 없애면서 `저장` → `저장됨` 이라는 글자 채널이 사라졌다. 그 자리를 대신하는
      것이 이 두 갈래다 — 글리프가 채워지고(`bookmark` → `bookmarkFilled`) 색이 브랜드로
      바뀐다. 라벨 제거를 감수한 근거가 바로 이 채널이라, 이게 조용히 사라지면 저장 상태가
      화면에서 완전히 안 보인다.

      한 갈래만 남기는 것도 결함이다: 색만 바꾸면 색을 구분하지 못하는 사용자에게 안 보이고,
      면만 바꾸면 작은 글리프에서 눈에 안 띈다.
    */
    const bookmark =
      actionEntries().find((entry) => entry.key === "bookmark")?.body ?? ""
    // (1) 면 — 두 글리프가 실제로 다르다.
    expect(bookmark).toContain('icon: detail.bookmarked ? "bookmarkFilled"')
    expect(bookmark).toContain(': "bookmark"')
    // (2) 상태가 바로 전달된다(색·스크린리더 둘 다 이 한 값을 본다).
    expect(bookmark).toContain("selected: detail.bookmarked")
    // (3) 색 — 바가 그 상태를 브랜드색으로 그린다.
    const utility = fnSource(PILLS_CODE, "UtilityButton")
    expect(utility).toContain(
      "color={action.selected ? colors.primary.primary : colors.label.normal}",
    )
    // (4) 스크린리더에도 같은 사실이 간다.
    expect(utility).toContain("selected: action.selected")
    expect(bookmark).toContain('t("restaurant.detail.actionSaved")')
    expect(bookmark).toContain('t("restaurant.detail.actionSave")')
  })

  it("바 치수는 시안 실측값이고 전부 토큰 위에 떨어진다", () => {
    /*
      3배 렌더 PNG(`C1_2.png`)를 픽셀 단위로 잰 값이다. 눈대중이 아니므로 "그냥 좀 더
      두툼하게" 같은 이유로 바꾸지 말 것.

        위 모서리 반경 24.0 · 위 여백 7.7 · 콘텐츠 행 44.0 · CTA 65.0×32.0(반경 8, 안여백 10)

      ── 2026-08-21 갱신 ────────────────────────────────────────────────
      앞 판본은 이 여섯 값을 **파일 전체 `toContain`** 으로 봤다. 그래서 콘텐츠 행 높이
      (`touchTarget.min`)와 CTA 높이(`controlHeight.sm`)를 서로 맞바꿔도 두 문자열이
      파일 어딘가에 남아 초록이었다 — 주석은 바꾸지 말라고 경고하면서 정작 그 변경을
      막지 못했다. 값이 **어느 블록에 묶였는지**를 본다.
    */
    const bar = styleBlock(PILLS_CODE, "bar")
    expect(bar).toContain('borderTopLeftRadius: radius["3xl"]')
    expect(bar).toContain('borderTopRightRadius: radius["3xl"]')
    expect(bar).toContain("paddingTop: spacing[8]")
    expect(bar).toContain("borderTopWidth: borderWidth.thin")

    expect(styleBlock(PILLS_CODE, "row")).toContain("height: touchTarget.min")

    const primary = styleBlock(PILLS_CODE, "primary")
    expect(primary).toContain("height: controlHeight.sm")
    expect(primary).toContain("paddingHorizontal: spacing[10]")
    expect(primary).toContain("borderRadius: radius.sm")

    /*
      토큰 사다리가 통째로 움직이면 위 단언은 전부 참인 채로 화면만 달라진다.
      실측값을 리터럴로 한 번 박아 그 통로를 닫는다.
    */
    expect(radius["3xl"]).toBe(24)
    expect(spacing[8]).toBe(8)
    expect(touchTarget.min).toBe(44)
    expect(controlHeight.sm).toBe(32)
    expect(spacing[10]).toBe(10)
    expect(radius.sm).toBe(8)
  })

  it("보조 아이콘은 24 상자 + hitSlop 이고 가로 피치는 시안의 40 이다", () => {
    /*
      시안에서 글리프 중심을 재면 36.0 → 76.0 → 116.7 로 **40 간격**이다. 앞 판본은
      44×44 투명 상자를 간격 0 으로 맞붙여 피치가 44 가 됐다 — 넷째 아이콘이 시안보다
      10pt 오른쪽에 서고 무리 폭이 12pt 넓어졌다.

      그건 동시에 이 저장소의 명시 규칙 위반이다: `size.ts` 의 `touchTarget` 주석이
      "시각 높이와 별개, hit-slop 으로 확보 권장" 이고, 같은 화면의 `headerButton` 이
      정확히 그 방식이다. 상자는 글리프 크기, 44 는 `hitSlop` 이 만든다.
    */
    const utility = styleBlock(PILLS_CODE, "utility")
    expect(utility).toContain("width: iconSize.md")
    expect(utility).not.toContain("width: touchTarget.min")
    expect(styleBlock(PILLS_CODE, "utilities")).toContain("gap: spacing[16]")

    const fn = fnSource(PILLS_CODE, "UtilityButton")
    expect(fn).toContain("hitSlop={(touchTarget.min - iconSize.md) / 2}")
    expect(fn).toContain("size={iconSize.md}")

    // 실측 못. 24 + 16 = 40 이 시안 피치이고, 상자 24 에 좌우 10 을 더해야 44 가 된다.
    expect(iconSize.md).toBe(24)
    expect(spacing[16]).toBe(16)
    expect(iconSize.md + spacing[16]).toBe(40)
    expect((touchTarget.min - iconSize.md) / 2).toBe(10)

    // 글자 버튼 둘도 같은 원칙이다 — 상자는 32, 모자란 12 는 hitSlop 이 채운다.
    for (const name of ["TextButton", "PrimaryButton"]) {
      expect(fnSource(PILLS_CODE, name)).toContain(
        "hitSlop={(touchTarget.min - controlHeight.sm) / 2}",
      )
    }
    expect(styleBlock(PILLS_CODE, "textButton")).toContain(
      "height: controlHeight.sm",
    )
  })

  it("바 위 머리카락 선은 `line.alternative` 다 (실측색과 합성이 일치한다)", () => {
    /*
      시안의 선은 흰 배경 위에서 `rgb(244,244,245)` 였다. 알파 토큰을 흰색에 합성해 보면
      어느 것이 그 값인지가 계산으로 정해진다 — 스포이드로 새 hex 를 만들 일이 없다.
    */
    expect(over(light.line.alternative, light.background.default)).toBe(
      "#f4f4f5",
    )
    // 앞 판본이 쓰던 `line.neutral` 은 한 단계 진하다. 되돌리면 시안보다 선이 무거워진다.
    expect(over(light.line.neutral, light.background.default)).toBe("#e8e8ea")
    expect(styleBlock(PILLS_CODE, "bar")).not.toContain("borderTopColor")
    expect(fnSource(PILLS_CODE, "DetailActionBar")).toContain(
      "borderTopColor: colors.line.alternative",
    )
  })

  it("바의 면은 **불투명**하다 (본문이 아이콘·CTA 뒤로 비쳐 흐르지 않는다)", () => {
    /*
      이 줄을 지우면 바가 투명해져 스크롤되는 본문이 아이콘과 CTA 뒤로 지나간다 —
      옛 `actionBarHidden` 이 만들던 결함과 결과가 같다. 바가 "항상 보인다" 는 계약은
      자리(위 항목)와 면(여기) 둘 다 있어야 성립한다.

      `background.default` 인 이유는 알파가 없어서다. 알파 토큰(`background.dim` 등)으로
      바꾸면 문자열은 그럴듯한데 화면은 다시 비친다. 그래서 토큰 자체의 불투명함을 못 박는다.
    */
    expect(fnSource(PILLS_CODE, "DetailActionBar")).toContain(
      "backgroundColor: colors.background.default",
    )
    // `#rrggbb` — 여덟 자리(알파)면 비친다.
    expect(light.background.default).toHaveLength(7)
    expect(dark.background.default).toHaveLength(7)
    expect(styleBlock(PILLS_CODE, "bar")).not.toContain("backgroundColor")
  })

  it("바의 좌우 여백은 시안의 20 이 아니라 화면 정본 `GUTTER` 다", () => {
    /*
      시안은 이 바에서 좌우 20 을 쓴다(아이콘 상자 왼쪽 20.0 · CTA 오른쪽 끝 355.0 = 375-20).
      그래도 16 으로 스냅한다 — 화면 좌우 정본은 `layout.ts` 의 `GUTTER` 하나이고, 바 하나
      때문에 세 번째 좌측 시작선을 만들지 않는다.

      ── 2026-08-21 갱신 ────────────────────────────────────────────────
      앞 판본은 `paddingHorizontal: GUTTER` 가 파일 **어디에** 있든 통과했다. 바에 10,
      CTA 에 16 을 주는 변경(= 이 항목이 이름 붙인 바로 그 결함, 세 번째 시작선)이 초록
      이었다는 뜻이다. 그래서 **바 블록 안에서** 본다.
    */
    expect(styleBlock(PILLS_CODE, "bar")).toContain("paddingHorizontal: GUTTER")
    // 이 파일에 사는 좌우 여백은 두 종류뿐이다: 화면 시작선(바)과 컨트롤 안여백(글자 버튼 둘).
    const insets = [
      ...PILLS_CODE.matchAll(/paddingHorizontal: ([^,\n]+)/gu),
    ].map((m) => m[1])
    expect(insets).toEqual(["GUTTER", "spacing[10]", "spacing[10]"])
    expect(PILLS_CODE).not.toContain("RAIL_INSET")
  })
})

describe("여백·격자 (벤치마크 §F P4)", () => {
  /*
    여기 있던 두 항목(`정보 덩어리를 둥근 면으로 묶는다` · `카드 치수는 격자 정본에서만 온다`)을
    2026-08-20 시안 반영과 함께 지웠다. **통과시키려고 기대값을 바꾼 것이 아니라 전제가 죽었다.**

    옛 전제는 "덩어리는 둥근 회색 면(`DetailCard`)이 말한다" 였고, 그 근거였던 관찰
    ("선은 여기가 끝을 말하지만 다섯 줄이 한 덩어리임을 말하지 못한다")은 지금도 옳다.
    바뀐 것은 **덩어리를 무엇이 말하는가** 이고 실측으로 정해졌다 — 시안 C1_2 에서 정보 네 줄은
    x 전 구간이 순백이고, 경계는 섹션 사이의 전폭 띠(`V2Divider variant="thick"`)가 그린다.
    정보 탭(D7_1)은 전폭 머리카락 선이다. 그래서 옛 마지막 단언(`info` 에 `<V2Divider` 가
    없어야 한다)은 지금 **정확히 반대**가 됐다.

    카드를 지우면서 화면 여백(16)과 카드 안여백(16)이 겹쳐 만들던 세 번째 좌측 시작선(32)도
    사라졌다 — 격자 정본(`layout.ts` 머리말)이 요구하는 "좌측 시작선은 정확히 둘" 로 돌아왔다.
    `DetailCard.tsx` 는 마지막 사용처가 없어져 함께 지웠다(죽은 코드가 이 기능의 DS 규칙
    위반 목록을 혼자 만드는 것을 `types/index.ts` 머리말이 이미 한 번 기록했다).

    새 계약의 정본은 `tests/restaurantDetailFlatSurface.test.ts` 다 — 평면이라는 것뿐 아니라
    **경계가 살아 있다는 것**까지 못 박는다(카드를 지우면서 경계까지 지우는 것이 이 변경의
    유일한 위험이다).
  */

  it("탭 바가 히어로 사진에 붙지 않는다", () => {
    expect(SCREEN).toContain("const TAB_BAR_LEAD = SECTION_GAP")
    // 여백은 sticky 블록 **안쪽**이어야 한다. 히어로 쪽에 주면 탭이 헤더에 붙는 순간
    // 그 여백이 함께 사라져 다시 붙는다.
    expect(SCREEN).toContain("tabBarBlock: { paddingTop: TAB_BAR_LEAD }")
  })
})
