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
 * 3. **액션이 상단 pill 행에 있고, 스크롤하면 하단에 고정된다.** 그리고 그것이
 *    **한 벌**이어야 한다 — 아이콘 바와 pill 행을 동시에 그리면 같은 네 가지 일이
 *    두 개의 다른 물건으로 보인다.
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
import { hasCommonKeyInBothLocales } from "./helpers/i18nResourceKeys"
import {
  describeBusinessStatus,
  transitionWallClock,
} from "../src/features/restaurant/utils/businessStatus"

const light = resolveTheme("light").colors

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
    expect(SCREEN).toMatch(/canRouteTo\([\s\S]{0,120}key: "route"/)
  })

  it("채움은 하나뿐이다 — 진단하기만 primary", () => {
    const primaries = SCREEN.match(/emphasis: "primary"/g) ?? []
    expect(primaries).toHaveLength(1)
    expect(SCREEN).toMatch(/key: "diagnose"[\s\S]{0,200}emphasis: "primary"/)
  })

  it("히어로와 하단 고정이 **같은 배열**을 받는다", () => {
    // 두 곳에서 각자 조립하면 한쪽에만 전화 pill 이 빠지는 식으로 갈라진다.
    expect(SCREEN).toContain("<DetailActionPills actions={actions} />")
    expect(SCREEN).toContain("actions={actions}")
    expect(SCREEN).toContain("<DetailActionBar")
  })

  it("아이콘 바와 pill 행을 둘 다 그리지 않는다", () => {
    // 같은 네 가지 일을 서로 다른 두 모양으로 동시에 보여 주면 둘이 다른 것으로 읽힌다.
    expect(SCREEN).not.toContain("function ActionIcon")
    expect(SCREEN).not.toContain("<ActionIcon")
  })

  it("액션 행을 지나친 뒤에만 하단에 고정된다", () => {
    expect(SCREEN).toContain("actionRowBottom")
    expect(SCREEN).toContain("actionsPinned")
    // 숨어 있는 동안 투명한 바가 본문의 마지막 줄을 가로채면 안 된다.
    expect(SCREEN).toContain('pointerEvents={actionsPinned ? "auto" : "none"}')
  })

  it("숨김을 `display: none` 으로 하지 않는다 (하단 여백이 무너진다)", () => {
    expect(SCREEN).toContain("actionBarHidden")
    expect(SCREEN).not.toMatch(/actionBarHidden:\s*\{[^}]*display/)
  })

  it("pill 행은 가로 인셋을 스크롤 안쪽에서 준다", () => {
    // 컨테이너에 좌우 패딩을 주면 스크롤 끝에서 잘려 마지막 pill 이 화면에 붙는다.
    expect(ACTION_PILLS).toContain("contentContainerStyle")
    expect(ACTION_PILLS).toContain("RAIL_INSET")
  })
})

describe("여백·격자 (벤치마크 §F P4)", () => {
  it("정보 덩어리를 둥근 면으로 묶는다", () => {
    const home = fs.readFileSync(
      path.join(FEATURE_DIR, "components", "detail", "HomeTab.tsx"),
      "utf8",
    )
    const info = fs.readFileSync(
      path.join(FEATURE_DIR, "components", "detail", "InfoTab.tsx"),
      "utf8",
    )
    expect(home).toContain("<DetailCard>")
    expect(info).toContain("<DetailCard>")
    // 면으로 묶으면서 선은 지운다 — 함께 쓰면 한 경계가 두 번 그어진다.
    expect(info).not.toContain("<V2Divider")
  })

  it("카드 치수는 격자 정본(layout.ts)에서만 온다", () => {
    const card = fs.readFileSync(
      path.join(FEATURE_DIR, "components", "detail", "DetailCard.tsx"),
      "utf8",
    )
    expect(card).toContain("CARD_PADDING")
    expect(card).toContain("CARD_RADIUS")
    // 숫자를 새로 정하면 카드마다 안쪽 여백이 갈린다.
    expect(card).not.toMatch(/padding:\s*\d/)
    expect(card).not.toMatch(/borderRadius:\s*\d/)
  })

  it("탭 바가 히어로 사진에 붙지 않는다", () => {
    expect(SCREEN).toContain("const TAB_BAR_LEAD = SECTION_GAP")
    // 여백은 sticky 블록 **안쪽**이어야 한다. 히어로 쪽에 주면 탭이 헤더에 붙는 순간
    // 그 여백이 함께 사라져 다시 붙는다.
    expect(SCREEN).toContain("tabBarBlock: { paddingTop: TAB_BAR_LEAD }")
  })
})
