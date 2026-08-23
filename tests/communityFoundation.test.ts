/**
 * 커뮤니티 재디자인 **토대**(WBS 0.1 · 0.2 · 0.3)의 계약.
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.0 · §2.1 · §4 (G1 G6 G9 G12 G19 G20).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 이 파일이 지키는 것은 세 가지고, 셋 다 "타입은 통과하고 화면만 나빠지는" 종류다
 *
 *   1. **행 높이 공식** — 실측 6종(106·118·138·147·176·179)이 한 식에서 나온다는 것이
 *      `PostRow` 를 하나로 만들 수 있는 유일한 근거다. 공식이 틀어지면 여섯 화면이
 *      동시에 어긋나는데, 어긋난 뒤에는 어느 숫자가 맞았는지 아무도 모른다.
 *   2. **additive** — 이 디자인시스템을 233개 파일이 들여온다. 토큰을 더하는 일이
 *      기존 값 하나라도 건드리면 그 233곳이 조용히 다르게 그려진다. 그래서 기존
 *      토큰의 값을 여기서 **다시 못 박는다**.
 *   3. **아이콘 계보** — `heart`(하트+플러스)·`chat`·`profile` 은 다른 화면들이 쓰는
 *      기존 글리프고, 커뮤니티가 필요로 한 것은 그 옆자리다. "고쳐서 쓰기" 로 새는
 *      순간 다른 화면이 바뀐다.
 *
 * ■ 왜 소스 문자열이 아니라 값·기하를 보는가
 *
 * 이 저장소에는 주석이 계약을 대신 만족시켜 통과한 가드가 실재했다
 * (`communityDesignContract.test.ts` 머리말). 여기서는 SVG 를 **파싱해서 좌표를 재고**,
 * 토큰은 **값을 직접** 비교한다. 문자열 grep 은 쓰지 않는다.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { iconRegistry, iconNames } from "@/src/design-system-v2/icons/registry"
import { elevation } from "@/src/design-system-v2/tokens/elevation"
import {
  CHIP_GAP as GLOBAL_CHIP_GAP,
  GUTTER,
  SECTION_BAND as GLOBAL_SECTION_BAND,
} from "@/src/design-system-v2/tokens/layout"
import { controlHeight } from "@/src/design-system-v2/tokens/size"
import {
  fontFamily,
  typography,
} from "@/src/design-system-v2/tokens/typography"
import {
  CHIP_GAP,
  COMMUNITY_GUTTER,
  POST_ROW_HEADER_GAP,
  POST_ROW_PAD_V,
  POST_ROW_RANK_SIZE,
  POST_ROW_TAG_GAP,
  postRowHeight,
  RAIL_INSET,
  ROW,
  SECTION_BAND,
} from "@/src/features/recipe/components/community/communityLayout"

/* ══ 0.1 `communityLayout.ts` — §2.0 ═══════════════════════════════════════ */

describe("communityLayout — 전역 격자와 갈라진 세 값 (§5.1 §5.2 §2.7)", () => {
  it("화면 좌우 여백은 20 이고, 전역 GUTTER(16) 와 **다르다**", () => {
    // §5.1 판정. 12개 구역 전부 20 이다. 둘이 같아지면 판정이 사라진 것이다 —
    // 그때 커뮤니티 화면은 전역 격자로 되돌아가고 "세 번째 시작선"이 생긴다.
    expect(COMMUNITY_GUTTER).toBe(20)
    expect(COMMUNITY_GUTTER).not.toBe(GUTTER)
  })

  it("칩 간격은 6 이고, 전역 CHIP_GAP(8) 과 **다르다**", () => {
    expect(CHIP_GAP).toBe(6) // §5.2 — 8개 구역이 6
    expect(CHIP_GAP).not.toBe(GLOBAL_CHIP_GAP)
  })

  it("섹션 밴드는 8 이고, 전역 SECTION_BAND(16) 과 **다르다**", () => {
    expect(SECTION_BAND).toBe(8) // §2.7 — V2Divider thick 은 16 고정(§4-G4)
    expect(SECTION_BAND).not.toBe(GLOBAL_SECTION_BAND)
  })

  it("레일 인셋은 화면 여백을 따라간다 — 첫 칩이 제목과 같은 x 에서 시작한다", () => {
    expect(RAIL_INSET).toBe(COMMUNITY_GUTTER)
  })
})

describe("communityLayout — ROW 실측값 (§2.0)", () => {
  it("마이크로 배지 21 · 큰 썸네일 86 · 작은 썸네일 60", () => {
    expect(ROW.microPill).toBe(21)
    expect(ROW.thumbLarge).toBe(86)
    expect(ROW.thumbSmall).toBe(60)
  })

  it("필터 칩 높이는 controlHeight.sm 과 같은 값이다 (§2.5)", () => {
    // 32 를 리터럴로 박아 두면 컨트롤 사다리가 움직여도 칩만 남는다.
    expect(ROW.chip).toBe(controlHeight.sm)
  })

  it("텍스트열 74 는 **타이포 토큰에서 나온다** — 제목 20 + 4 + 요약 20 + 12 + 메타 18", () => {
    /*
      §2.0 의 `postTextColumn: 74  // 20 + 4 + 20 + 12 + 18` 을 분해해 놓은 것이다.
      이 단언이 0.1(레이아웃)과 0.3(타이포 토큰)을 **묶는다**: `subtext.largeStrong` 의
      lineHeight 가 19(=`label.smallWeak`)였다면 텍스트열은 73 이 되고, 썸네일 없는 행의
      실측 106 이 105 로 어긋난다. §5.3 이 lh 20 을 고른 이유가 바로 이것이다.
    */
    const 제목 = typography.subtext.largeStrong.lineHeight // 20
    const 요약 = typography.body.xSmall.lineHeight // 20 (13 Regular / lh 20)
    const 메타 = typography.subtext.medium.lineHeight // 18 (13 Regular / lh 18)
    expect(제목 + 4 + 요약 + 12 + 메타).toBe(ROW.postTextColumn)
    expect(ROW.postTextColumn).toBe(74)
  })

  it("76px 목록 행은 썸네일 60 이 상하 8 씩 여백을 갖는 높이다 (§2.4)", () => {
    expect(ROW.compactRow).toBe(76)
    expect((ROW.compactRow - ROW.thumbSmall) / 2).toBe(8)
  })

  it("댓글 98 · 대댓글 들여쓰기 12 · 디렉터리 101 · 연결 81 · 헤더 47 · 정렬바 48 · 탭 51", () => {
    expect(ROW.commentRow).toBe(98) // §2.8 — 3개 구역이 독립 측정
    expect(ROW.commentReplyIndent).toBe(12)
    expect(ROW.directoryRow).toBe(101) // §2.14
    expect(ROW.connectionRow).toBe(81) // §2.14
    expect(ROW.sectionHeader).toBe(47) // §2.7
    expect(ROW.sortBar).toBe(48)
    expect(ROW.tabStrip).toBe(51) // §2.15 — V2Tab size="l"
  })
})

describe("postRowHeight — §2.1 공식이 실측 6종을 재현한다", () => {
  /*
    이 표가 이 파일에서 가장 중요한 단언이다. 4개 구역(feed-drag·feed-home·search·
    popular)에서 잰 행 높이가 **전부 한 식에서 나온다**는 것이 `PostRow` 를 여섯 벌이
    아니라 한 벌로 만들 수 있는 유일한 근거다. 하나라도 어긋나면 그 근거가 무너진다.
  */
  const 실측: [string, Parameters<typeof postRowHeight>[0], number][] = [
    [
      "배지 + 태그 + 썸",
      { hasCategory: true, hasTags: true, hasThumbnail: true },
      176,
    ],
    ["태그 + 썸", { hasTags: true, hasThumbnail: true }, 147],
    ["썸만", { hasThumbnail: true }, 118],
    ["썸 없음", {}, 106],
    [
      "랭크 + 배지 + 태그 + 썸",
      { hasRank: true, hasCategory: true, hasTags: true, hasThumbnail: true },
      179,
    ],
    ["랭크만", { hasRank: true }, 138],
  ]

  it.each(실측)("%s = %o → %i", (_이름, 모양, 높이) => {
    expect(postRowHeight(모양)).toBe(높이)
  })

  it("여섯 값이 서로 다르다 — 공식이 상수 하나를 돌려주는 게 아니다", () => {
    const 결과 = 실측.map(([, 모양]) => postRowHeight(모양))
    expect(new Set(결과).size).toBe(6)
  })
})

describe("postRowHeight — 각 부품이 정확히 얼마를 더하는가", () => {
  /*
    실측 6종만 고정하면 **일곱 번째 조합**(예: 랭크 + 태그, 썸 없음)에서 아무 답이나
    나와도 초록이다. 부품별 증분을 따로 못 박아 공식이 표가 아니라 식이게 한다.
  */
  it("태그 레일은 21 + 8 = 29 를 더한다", () => {
    expect(
      postRowHeight({ hasTags: true, hasThumbnail: true }) -
        postRowHeight({ hasThumbnail: true }),
    ).toBe(ROW.microPill + POST_ROW_TAG_GAP)
    expect(ROW.microPill + POST_ROW_TAG_GAP).toBe(29)
  })

  it("카테고리 배지는 21 + 8, 랭크 원은 24 + 8 을 더한다", () => {
    const 맨몸 = postRowHeight({ hasThumbnail: true })
    expect(
      postRowHeight({ hasCategory: true, hasThumbnail: true }) - 맨몸,
    ).toBe(ROW.microPill + POST_ROW_HEADER_GAP)
    expect(postRowHeight({ hasRank: true, hasThumbnail: true }) - 맨몸).toBe(
      POST_ROW_RANK_SIZE + POST_ROW_HEADER_GAP,
    )
  })

  it("랭크와 배지는 **같은 줄**이다 — 둘 다 있어도 큰 쪽(24)만 센다", () => {
    // 179(랭크+배지+태그+썸) − 176(배지+태그+썸) = 3 = 24 − 21.
    // 둘을 따로 쌓으면 여기서 24 가 나와 인기글 행이 통째로 길어진다.
    expect(
      postRowHeight({
        hasRank: true,
        hasCategory: true,
        hasTags: true,
        hasThumbnail: true,
      }),
    ).toBe(
      postRowHeight({ hasCategory: true, hasTags: true, hasThumbnail: true }) +
        (POST_ROW_RANK_SIZE - ROW.microPill),
    )
  })

  it("썸네일이 콘텐츠 블록 높이를 정한다 — 86 vs 텍스트열 74", () => {
    expect(postRowHeight({ hasThumbnail: true }) - postRowHeight({})).toBe(
      ROW.thumbLarge - ROW.postTextColumn,
    )
    // 썸네일이 없을 때는 텍스트열이 정한다. 0 으로 접히면 행이 32 가 된다.
    expect(postRowHeight({})).toBe(POST_ROW_PAD_V * 2 + ROW.postTextColumn)
  })

  it("헤더가 없으면 헤더 gap 도 없다 — 8 이 유령으로 남지 않는다", () => {
    expect(postRowHeight({ hasThumbnail: true })).toBe(
      POST_ROW_PAD_V * 2 + ROW.thumbLarge,
    )
  })

  it("인자를 안 주면 가장 작은 행(106)이다 — 부품은 전부 opt-in", () => {
    expect(postRowHeight()).toBe(106)
  })

  it("행의 위아래 패딩은 16 이다 — 시안의 첫 행 8 은 시안 오류다 (§5.21-3)", () => {
    expect(POST_ROW_PAD_V).toBe(16)
  })
})

/* ══ 0.3 토큰 — §4-G9 / §4-G6 ══════════════════════════════════════════════ */

describe("typography.subtext.largeStrong — §4-G9", () => {
  it("15 Medium / lh 20 / letterSpacing 0", () => {
    expect(typography.subtext.largeStrong).toEqual({
      fontFamily: fontFamily.medium,
      fontSize: 15,
      lineHeight: 20,
      letterSpacing: 0,
    })
  })

  it("굵기는 face 로만 — `fontWeight` 키가 없다 (집안 규칙)", () => {
    // 있으면 iOS 가 이미 굵은 face 위에 합성 볼드를 덧씌운다(typography.ts 머리말).
    expect(typography.subtext.largeStrong).not.toHaveProperty("fontWeight")
  })

  it("`mediumStrong : medium` 과 **같은 관계**다 — face 만 다르고 나머지는 같다", () => {
    const 관계 = (weak: object, strong: object) => {
      const { fontFamily: 약한face, ...약한나머지 } = weak as Record<
        string,
        unknown
      >
      const { fontFamily: 강한face, ...강한나머지 } = strong as Record<
        string,
        unknown
      >
      expect(강한나머지).toEqual(약한나머지)
      expect(약한face).toBe(fontFamily.regular)
      expect(강한face).toBe(fontFamily.medium)
    }
    관계(typography.subtext.medium, typography.subtext.mediumStrong)
    관계(typography.subtext.large, typography.subtext.largeStrong)
  })

  it("`label.smallWeak`(15/19) 가 아니다 — 그게 이 토큰이 생긴 이유다", () => {
    expect(typography.label.smallWeak.fontSize).toBe(
      typography.subtext.largeStrong.fontSize,
    )
    expect(typography.label.smallWeak.lineHeight).not.toBe(
      typography.subtext.largeStrong.lineHeight,
    )
  })

  it("additive — 기존 두 토큰은 그대로다", () => {
    expect(typography.subtext.large).toEqual({
      fontFamily: fontFamily.regular,
      fontSize: 15,
      lineHeight: 20,
      letterSpacing: 0,
    })
    expect(typography.label.smallWeak).toEqual({
      fontFamily: fontFamily.medium,
      fontSize: 15,
      lineHeight: 19,
      letterSpacing: 0,
    })
  })

  it("스케일 전체 불변식 — letterSpacing 0, fontWeight 없음, face 는 Pretendard", () => {
    const faces: string[] = Object.values(fontFamily)
    Object.entries(typography).forEach(([group, tokens]) => {
      Object.entries(tokens).forEach(([name, token]) => {
        const 라벨 = `${group}.${name}`
        expect([라벨, token.letterSpacing]).toEqual([라벨, 0])
        expect([라벨, "fontWeight" in token]).toEqual([라벨, false])
        expect([라벨, faces.includes(token.fontFamily)]).toEqual([라벨, true])
      })
    })
  })
})

describe("elevation[3] — §4-G6 (앵커드 팝오버)", () => {
  it("dy16 / σ30 / rgba(0,27,55,0.10) / android 8", () => {
    expect(elevation[3]).toEqual({
      shadowColor: "rgb(0, 27, 55)",
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.1,
      shadowRadius: 30,
      elevation: 8,
    })
  })

  it("두 플랫폼 **모두** 에서 실제 경계가 생긴다", () => {
    // `shadowOpacity: 0` 이나 `elevation: 0` 이면 값은 있는데 경계는 없다.
    // 팝오버는 딤이 없어서(§2.6) 그림자가 유일한 분리 수단이다.
    expect(elevation[3].shadowOpacity).toBeGreaterThan(0)
    expect(elevation[3].elevation).toBeGreaterThan(0)
  })

  it("elevation[2] 보다 확실히 깊다 — 사다리의 다음 칸이다", () => {
    expect(elevation[3].shadowOffset.height).toBeGreaterThan(
      elevation[2].shadowOffset.height,
    )
    expect(elevation[3].shadowRadius).toBeGreaterThan(elevation[2].shadowRadius)
    expect(elevation[3].elevation).toBeGreaterThan(elevation[2].elevation)
  })

  it("색은 elevation[2] 와 같다 — 같은 그림자 계열의 다른 칸이다", () => {
    expect(elevation[3].shadowColor).toBe(elevation[2].shadowColor)
  })

  it("additive — 1·2 는 그대로다 (2 는 작성자 카드 그림자 = 시안 바이트 일치)", () => {
    expect(elevation[1]).toEqual({
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.09,
      shadowRadius: 1,
      elevation: 1,
    })
    // §4 "갭이 아닌 것": 시안의 `0 1px 3px rgba(0,27,55,0.10)` 과 일치해야 한다.
    expect(elevation[2]).toEqual({
      shadowColor: "rgb(0, 27, 55)",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    })
  })
})

/* ══ 0.2 아이콘 6종 — §4 G1 G12 G19 G20 ════════════════════════════════════ */

const SVG_DIR = join(__dirname, "..", "src", "design-system-v2", "icons", "svg")
const svg = (file: string) => readFileSync(join(SVG_DIR, file), "utf-8")

/** `d` 를 절대 좌표 꼭짓점으로 편다. M/L/H/V(+상대형)만 다룬다 — 화살표용. */
function pathPoints(d: string): [number, number][] {
  const tokens = d.match(/[MmLlHhVv]|-?\d*\.?\d+/g) ?? []
  const points: [number, number][] = []
  let cmd = ""
  let x = 0
  let y = 0
  let i = 0
  while (i < tokens.length) {
    const token = tokens[i]
    if (/[A-Za-z]/.test(token)) {
      cmd = token
      i += 1
      continue
    }
    const n = Number(token)
    if (cmd === "M" || cmd === "L") {
      x = n
      y = Number(tokens[i + 1])
      i += 2
      if (cmd === "M") cmd = "L"
    } else if (cmd === "m" || cmd === "l") {
      x += n
      y += Number(tokens[i + 1])
      i += 2
      if (cmd === "m") cmd = "l"
    } else if (cmd === "H") {
      x = n
      i += 1
    } else if (cmd === "h") {
      x += n
      i += 1
    } else if (cmd === "V") {
      y = n
      i += 1
    } else if (cmd === "v") {
      y += n
      i += 1
    } else {
      throw new Error(`pathPoints: 지원하지 않는 명령 ${cmd} — ${d}`)
    }
    points.push([x, y])
  }
  return points
}

/** `<circle …/>` 을 전부 뽑는다. */
function circles(source: string) {
  return [...source.matchAll(/<circle\b[^>]*\/>/g)].map(([tag]) => {
    const attr = (name: string) => {
      const hit = tag.match(new RegExp(`${name}="([^"]+)"`))
      if (!hit) throw new Error(`circle 에 ${name} 없음: ${tag}`)
      return hit[1]
    }
    return {
      cx: Number(attr("cx")),
      cy: Number(attr("cy")),
      r: Number(attr("r")),
      fill: attr("fill"),
    }
  })
}

/** 첫 `<path>` 의 `d`. */
function pathD(source: string, index = 0): string {
  const hits = [...source.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)]
  return hits[index][1]
}

/** `M` 으로 시작하는 하위 경로들. */
function subPaths(d: string): string[] {
  return (d.match(/M[^M]*/g) ?? []).map((s) => s.trim())
}

const NEW_ICONS = {
  more: "icon-more.svg",
  heartFilled: "icon-heart-filled.svg",
  heartOutline: "icon-heart-outline.svg",
  chatOutline: "icon-chat-outline.svg",
  arrowUp: "icon-arrow-up.svg",
  profileFilled: "icon-profile-filled.svg",
} as const

describe("아이콘 레지스트리 — 6종 추가 (WBS 0.2)", () => {
  it.each(Object.entries(NEW_ICONS))(
    "`%s` 가 %s 로 등록돼 있다",
    (name, file) => {
      // jest 의 svg 트랜스포머는 **파일 이름을 값으로** 돌려준다(tests/helpers/svgTransformer.js).
      // 그래서 "어느 이름이 어느 자산을 가리키는가" 를 여기서 실제로 검증할 수 있다.
      expect(iconRegistry[name as keyof typeof iconRegistry]).toBe(file)
    },
  )

  it("레지스트리에 **같은 자산을 두 번** 등록한 이름이 없다", () => {
    // `heartFilled: IconHeart` 같은 복붙 사고가 나면 두 이름이 같은 그림을 준다.
    const assets = iconNames.map((n) => iconRegistry[n])
    expect(new Set(assets).size).toBe(assets.length)
  })

  it("`chevronUp` 은 **일부러 없다** — chevronDown 을 180° 돌려 쓴다 (§4-G20)", () => {
    expect(iconNames).not.toContain("chevronUp")
    expect(iconNames).toContain("chevronDown")
  })

  it("기존 글리프는 자리를 지킨다 — heart · chat · profile 은 다른 화면들의 것이다", () => {
    expect(iconRegistry.heart).toBe("icon-heart.svg")
    expect(iconRegistry.chat).toBe("icon-chat.svg")
    expect(iconRegistry.profile).toBe("icon-profile.svg")
  })

  it("새 6종은 기존 이름을 덮어쓰지 않았다", () => {
    const 새이름 = new Set(Object.keys(NEW_ICONS))
    const 기존자산 = iconNames
      .filter((n) => !새이름.has(n))
      .map((n) => iconRegistry[n])
    Object.values(NEW_ICONS).forEach((file) => {
      expect(기존자산).not.toContain(file)
    })
  })
})

describe("아이콘 자산 — 공통 규약", () => {
  it.each(Object.values(NEW_ICONS))(
    "%s 는 24 그리드 + currentColor 다",
    (file) => {
      const source = svg(file)
      expect(source).toContain('viewBox="0 0 24 24"')
      // 박힌 hex 가 있으면 `V2Icon` 의 color prop 이 먹지 않는다(registry.ts 머리말의 실측).
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}/)
      expect(source).toContain("currentColor")
    },
  )
})

describe("`more` — 24 박스, ⌀2.67 점 3개, 간격 4.67 (§4-G1)", () => {
  const dots = circles(svg(NEW_ICONS.more))

  it("점이 셋이고 전부 채움이다", () => {
    expect(dots).toHaveLength(3)
    dots.forEach((dot) => expect(dot.fill).toBe("currentColor"))
  })

  it("지름 2.67", () => {
    dots.forEach((dot) => expect(dot.r * 2).toBeCloseTo(2.67, 3))
  })

  it("**가로** 생략부호다 — 세 점의 y 가 같다(케밥이 아니다)", () => {
    expect(new Set(dots.map((d) => d.cy)).size).toBe(1)
    expect(dots[0].cy).toBe(12)
  })

  it("중심 간격 4.67", () => {
    const xs = dots.map((d) => d.cx).sort((a, b) => a - b)
    expect(xs[1] - xs[0]).toBeCloseTo(4.67, 3)
    expect(xs[2] - xs[1]).toBeCloseTo(4.67, 3)
  })

  it("24 박스 안에서 가로 중앙이고, 잉크 폭이 실측 12.0 이다", () => {
    const xs = dots.map((d) => d.cx).sort((a, b) => a - b)
    const 잉크왼 = xs[0] - dots[0].r
    const 잉크오 = xs[2] + dots[0].r
    expect((잉크왼 + 잉크오) / 2).toBeCloseTo(12, 3)
    // post-detail.md: 잉크 x 337..349 = 12.0 × 2.67.
    expect(잉크오 - 잉크왼).toBeCloseTo(12.0, 1)
  })
})

describe("하트·말풍선 — filled ↔ outline 은 **같은 컨투어** (§4-G19)", () => {
  it("`heartFilled` 는 `heart` 의 하트 윤곽에서 플러스만 뺀 것이다", () => {
    const 건강하트 = subPaths(pathD(svg("icon-heart.svg")))
    // 기존 글리프는 그대로다: 하트 윤곽 + 플러스 두 하위 경로.
    expect(건강하트).toHaveLength(2)
    expect(건강하트[1].startsWith("M16.5")).toBe(true) // 플러스 획
    expect(pathD(svg(NEW_ICONS.heartFilled))).toBe(건강하트[0])
  })

  it("`heartOutline` 은 `heartFilled` 와 `d` 가 같다 — 좋아요를 눌러도 글리프가 안 튄다", () => {
    expect(pathD(svg(NEW_ICONS.heartOutline))).toBe(
      pathD(svg(NEW_ICONS.heartFilled)),
    )
  })

  it("`chatOutline` 은 `chat` 과 `d` 가 같다 — chat 은 시안과 일치해 그대로 둔다", () => {
    expect(pathD(svg(NEW_ICONS.chatOutline))).toBe(pathD(svg("icon-chat.svg")))
  })

  it("채움과 선이 실제로 갈린다", () => {
    const 채움 = svg(NEW_ICONS.heartFilled)
    expect(채움).toContain('fill="currentColor"')
    expect(채움).not.toContain("stroke=")

    const 아웃라인 = [svg(NEW_ICONS.heartOutline), svg(NEW_ICONS.chatOutline)]
    아웃라인.forEach((source) => {
      expect(source).toContain('stroke="currentColor"')
      // path 에 fill 이 붙으면 아웃라인이 아니라 채움이 된다(루트의 fill="none" 은 별개).
      expect(source).not.toMatch(/<path[^>]*\sfill="currentColor"/)
    })
  })

  it("아웃라인 획은 실측 2.67 이다 (12px 박스의 1.33 → 24 박스)", () => {
    ;[NEW_ICONS.heartOutline, NEW_ICONS.chatOutline].forEach((file) => {
      expect(svg(file)).toContain('stroke-width="2.67"')
    })
  })
})

describe("`arrowUp` — `arrowBack` 을 90° 돌린 글리프 (§4-G20)", () => {
  const back = pathPoints(pathD(svg("icon-arrow-back.svg")))
  const up = pathPoints(pathD(svg(NEW_ICONS.arrowUp)))

  it("좌표가 (12,12) 기준 +90° 회전과 정확히 일치한다", () => {
    // 세트 안에서 화살표 둘이 서로 다른 비율로 그려지면 헤더와 컴포저의 무게가 달라진다.
    const 회전 = back.map(([x, y]) => [24 - y, x])
    expect(up).toEqual(회전)
  })

  it("실제로 **위**를 가리킨다 — 촉이 맨 위, 가로 중앙", () => {
    const minY = Math.min(...up.map(([, y]) => y))
    const 촉 = up.filter(([, y]) => y === minY)
    expect(촉.every(([x]) => x === 12)).toBe(true)
    // 화살대는 촉보다 아래에 있다.
    expect(Math.max(...up.map(([, y]) => y))).toBeGreaterThan(minY)
  })

  it("획 두께는 `arrowBack` 과 같다", () => {
    const width = (file: string) =>
      svg(file).match(/stroke-width="([^"]+)"/)?.[1]
    expect(width(NEW_ICONS.arrowUp)).toBe(width("icon-arrow-back.svg"))
  })
})

describe("`profileFilled` — 채운 사람 글리프 (§4-G12)", () => {
  it("기존 `profile` 은 **선** 그대로다 — 이게 갭의 내용이다", () => {
    const 선 = svg("icon-profile.svg")
    expect(선).toContain('stroke="currentColor"')
    expect(선).not.toContain('fill="currentColor"')
  })

  it("새 자산은 **채움** 이고 획이 없다", () => {
    const 채움 = svg(NEW_ICONS.profileFilled)
    expect(채움).not.toContain("stroke=")
    expect([...채움.matchAll(/fill="currentColor"/g)]).toHaveLength(2) // 머리 + 몸
  })

  it("머리와 몸이 세로축 12 에 정렬돼 있다 — 원 안에서 치우치지 않는다", () => {
    const [head] = circles(svg(NEW_ICONS.profileFilled))
    expect(head.cx).toBe(12)
    // 몸통은 위 중앙에서 시작한다.
    expect(pathD(svg(NEW_ICONS.profileFilled)).startsWith("M12 ")).toBe(true)
  })

  it("잉크 비율이 실측(48 아바타에 34.3×41.1)과 맞는다", () => {
    // author-profile.md: 48 아바타의 글리프 34.3 × 41.1, 60 아바타의 42.9 × 51.4 →
    // 폭 0.715 · 높이 0.857. 24 그리드로는 17.2 × 20.6.
    const [head] = circles(svg(NEW_ICONS.profileFilled))
    const 몸통 = pathD(svg(NEW_ICONS.profileFilled))
    // 몸통 좌우 끝은 상대 큐빅의 x 이동량(±8.6)에서 온다 → 폭 17.2.
    expect(몸통).toContain("-8.6")
    expect(17.2 / 24).toBeCloseTo(34.3 / 48, 2)
    // 머리 꼭대기 1.7 부터 몸통 바닥 22.32 까지 = 20.62 ≈ 0.857 × 24.
    expect(head.cy - head.r).toBeCloseTo(1.7, 2)
    expect((22.32 - (head.cy - head.r)) / 24).toBeCloseTo(41.1 / 48, 2)
  })
})
