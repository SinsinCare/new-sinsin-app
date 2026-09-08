/**
 * 커뮤니티 곁가지 일곱 자리 — **다른 파일의 주인이 못 고치던 것들**.
 *
 * 일곱은 서로 다른 층에 흩어져 있지만 전부 "화면이 사용자에게 거짓말을 하거나,
 * 손이 닿지 않거나, 값을 토큰 밖에서 고른" 자리다. 무엇이 결함이었는지는 각
 * describe 머리에 적는다 — 되돌리면 그 describe 가 깨진다.
 *
 * ─── 왜 소스 계약인가 ────────────────────────────────────────────────────
 * 이 저장소의 jest 는 `react-native` 를 스텁으로 갈아 끼운 node 환경이라 화면을
 * 마운트할 수 없다(`jest.config.ts` 의 moduleNameMapper). 그래서 화면 쪽은
 * `communityDesignContract` · `communityHonestStates` 와 같은 방식으로 소스를
 * 읽되, **주석을 먼저 걷어낸다**(`tests/helpers/codeOnly`) — 안 걷으면 "왜 이렇게
 * 했는지" 적어 둔 문장이 계약을 대신 만족시켜, 코드를 지우고 설명만 남겨도 초록이
 * 된다. i18n 카탈로그처럼 **진짜로 돌려 볼 수 있는 것은 돌린다.**
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { createInstance } from "i18next"

import { codeOnly } from "./helpers/codeOnly"
import { getSurfacePalette } from "@/src/theme/surface"
import { formatCount } from "@/src/features/recipe/utils/displayNumber"
import enCommon from "@/src/i18n/locales/en/common.json"
import enRecipe from "@/src/i18n/locales/en/recipe.json"
import koCommon from "@/src/i18n/locales/ko/common.json"
import koRecipe from "@/src/i18n/locales/ko/recipe.json"

const ROOT = join(__dirname, "..")
const read = (path: string) => codeOnly(readFileSync(join(ROOT, path), "utf-8"))

const POST_DETAIL = "src/features/recipe/views/PostDetailScreen.tsx"
const CONNECTIONS = "src/features/recipe/views/CommunityConnectionsScreen.tsx"
const SEARCH = "src/features/recipe/views/CommunitySearchScreen.tsx"
const AUTHOR_PROFILE =
  "src/features/recipe/views/CommunityAuthorProfileScreen.tsx"
/** 같은 열쇠를 부르는 **남의 파일**. 여기 계약이 깨지면 그쪽 화면이 깨진 것이다. */
const POPULAR_SCREEN = "src/features/recipe/views/CommunityPopularScreen.tsx"

/* ─────────────────────────────── X1 ─────────────────────────────── */

describe("팔로워·팔로잉의 빈 화면이 문장으로 말한다", () => {
  /*
    예전에는 `` `${t(modeLabelKey)} 0` `` — 축 이름과 수만 적었다. "팔로워 0" 은
    문구가 아니라 자리 표시였고, 그 화면을 처음 보는 사람에게는 아무 말도 안 한다.
  */
  const source = read(CONNECTIONS)

  it("축 이름 뒤에 0 을 붙여 문구를 대신하지 않는다", () => {
    expect(source).not.toMatch(/\$\{t\(modeLabelKey\)\}\s*0/u)
    expect(source).not.toMatch(/modeLabelKey\)\}\s*0`/u)
  })

  it("두 축이 서로 다른 전용 문구를 부른다", () => {
    expect(source).toContain("community.author.emptyFollowing")
    expect(source).toContain("community.author.emptyFollowers")
    // 축을 가르는 조건이 실제로 코드에 있다 — 하나만 부르면 한쪽이 거짓말이 된다.
    expect(source).toMatch(/mode === "following"[\s\S]{0,120}emptyFollowing/u)
  })

  it("그 문구가 이웃 문구를 빌려 오지 않았다", () => {
    const ko = koCommon.community.author
    expect(ko.emptyFollowers).not.toBe(ko.emptyFollowing)
    expect(ko.emptyFollowers).not.toBe(ko.emptyReviews)
    expect(ko.emptyFollowing).not.toBe(ko.emptyReviews)
  })
})

/* ─────────────────────────────── X2 ─────────────────────────────── */

describe("검색창의 ✕ 는 '전체 삭제' 가 아니다", () => {
  /*
    입력칸의 ✕ 는 **지금 친 검색어 한 줄**을 지운다. 그런데 라벨이
    `community.search.clearAll`("전체 삭제") 이라, 보이지 않는 사용자에게는 최근
    검색어를 통째로 지우는 버튼으로 읽혔다 — 그 버튼은 같은 화면에 따로 있다.
  */
  const source = read(SEARCH)
  /** ✕ 를 그리는 Pressable 만 잘라 본다. 화면 전체를 보면 옆 버튼이 섞인다. */
  const clearButton = (() => {
    const end = source.indexOf("close-circle")
    expect(end).toBeGreaterThan(-1)
    return source.slice(source.lastIndexOf("<Pressable", end), end)
  })()

  it("✕ 는 recipe 네임스페이스의 '검색어 지우기' 를 쓴다", () => {
    expect(clearButton).toContain('tRecipe("feed.clearSearch")')
    expect(clearButton).not.toContain("clearAll")
  })

  it("두 벌을 쥔다 — common 과 recipe", () => {
    expect(source).toContain('useTranslation("common")')
    expect(source).toContain('const { t: tRecipe } = useTranslation("recipe")')
  })

  it("옆의 '전체 삭제' 는 그대로다 (그쪽은 맞는 문구였다)", () => {
    expect(source).toMatch(
      /onPress=\{clearRecentSearches\}[\s\S]{0,400}community\.search\.clearAll/u,
    )
  })

  it("두 문구는 실제로 다른 말이다", () => {
    expect(koRecipe.feed.clearSearch).toBe("검색어 지우기")
    expect(enRecipe.feed.clearSearch).toBe("Clear search")
    expect(koRecipe.feed.clearSearch).not.toBe(
      koCommon.community.search.clearAll,
    )
  })
})

/* ─────────────────────────────── X3 ─────────────────────────────── */

describe("작성자 프로필의 수는 앱 언어를 따른다", () => {
  /*
    `toLocaleString()` 은 **인자가 없으면 기기 로케일**이다. 앱을 한국어로 두고
    기기를 독일어로 쓰면 같은 행에서 팔로워가 `3.291`, 글 수가 `3291` 이 된다.
    커뮤니티에서 앱이 자기 언어로 말하지 않는 자리는 이 화면 하나만 남아 있었다.
  */
  const source = read(AUTHOR_PROFILE)

  it("로케일 없는 toLocaleString 이 남아 있지 않다", () => {
    expect(source).not.toContain("toLocaleString(")
  })

  it("두 수가 모두 formatCount(값, 앱 언어) 를 지난다", () => {
    expect(source).toContain(
      "formatCount(profile.followerCount, i18n.language)",
    )
    expect(source).toContain(
      "formatCount(profile.followingCount, i18n.language)",
    )
    // 언어를 넘기려면 훅에서 i18n 을 꺼내 와야 한다.
    expect(source).toContain('const { t, i18n } = useTranslation("common")')
  })

  it("그 함수는 기기 설정과 무관하게 같은 답을 낸다", () => {
    expect(formatCount(3291, "ko")).toBe("3,291")
    expect(formatCount(3291, "en-US")).toBe(formatCount(3291, "ko-KR"))
  })
})

/* ─────────────────────────────── X4 ─────────────────────────────── */

describe("섹션을 가르는 띠가 토큰에서 나온다", () => {
  /*
    다크만 손으로 고른 `#26262A` 였다. v2 팔레트 어디에도 없는 값이라 팔레트가
    움직여도 이 면 하나만 제자리에 남는다 — 다음 드리프트의 씨앗이다.
    토큰 표에는 이미 이 개념이 있다: `band` = "화면을 가르는 띠".
  */
  const source = read(POST_DETAIL)

  it("띠 색에 리터럴 hex 가 없다", () => {
    expect(source).not.toMatch(/#26262A/iu)
    expect(source).not.toMatch(/sectionBandBg\s*=\s*surface\.isDark/u)
  })

  it("띠는 surface.band 다", () => {
    expect(source).toMatch(/const sectionBandBg = surface\.band\b/u)
    // 두 자리(본문↔댓글 · 댓글↔이어 읽을 글)가 같은 값을 쓴다.
    expect(
      source.match(/backgroundColor: sectionBandBg/gu)?.length,
    ).toBeGreaterThanOrEqual(2)
  })

  it("두 모드 모두에서 띠가 바닥과 갈라진다 (이 화면의 바닥은 canvas 다)", () => {
    // 띠가 바닥과 같은 값이면 화면을 가르지 못한다 — 그때는 토큰이 틀린 것이다.
    expect(source).toContain("backgroundColor: surface.canvas")
    for (const isDark of [false, true]) {
      const palette = getSurfacePalette(isDark)
      expect(palette.band).not.toBe(palette.canvas)
    }
  })
})

/* ─────────────────────────────── X5 ─────────────────────────────── */

/** `styles.<name>: { … }` 블록에서 숫자 하나를 읽는다. */
function styleNumber(source: string, style: string, key: string): number {
  const block = source.slice(source.indexOf(`  ${style}: {`))
  const found = new RegExp(`${key}:\\s*(\\d+(?:\\.\\d+)?)`, "u").exec(
    block.slice(0, block.indexOf("},")),
  )
  expect(found).not.toBeNull()
  return Number(found?.[1])
}

/** 그 style 을 쓰는 누름틀의 `hitSlop={n}`. 없으면 0. */
function hitSlopFor(source: string, style: string): number {
  const at = source.indexOf(`style={styles.${style}}`)
  expect(at).toBeGreaterThan(-1)
  const open = Math.max(
    source.lastIndexOf("<SurfacePressable", at),
    source.lastIndexOf("<Pressable", at),
  )
  const found = /hitSlop=\{(\d+)\}/u.exec(source.slice(open, at))
  return found ? Number(found[1]) : 0
}

describe("댓글 전송 버튼에 손이 닿는다", () => {
  /*
    원은 36pt 였고 `hitSlop` 이 없었다 — 손끝 최소치(44pt)보다 8pt 작다.
    같은 줄의 좋아요 버튼은 이미 `hitSlop` 으로 그 차이를 메우고 있었다.
  */
  const source = read(POST_DETAIL)

  it("36pt 원이 hitSlop 으로 44pt 를 채운다", () => {
    const size = styleNumber(source, "sendButton", "width")
    expect(size).toBe(styleNumber(source, "sendButton", "height"))
    const slop = hitSlopFor(source, "sendButton")
    expect(slop).toBeGreaterThan(0)
    expect(size + slop * 2).toBeGreaterThanOrEqual(44)
  })

  it("전송 버튼 자체도 최소 44pt를 확보한다", () => {
    // 원을 키우면 입력 바 전체가 따라 커진다. 그래서 width/height 는 손대지 않는다.
    expect(styleNumber(source, "sendButton", "width")).toBe(44)
  })

  it("베낀 원본(좋아요 버튼)도 여전히 44pt 를 넘긴다", () => {
    expect(
      styleNumber(source, "likeButton", "minHeight"),
    ).toBeGreaterThanOrEqual(44)
  })
})

/* ─────────────────────────────── X6 ─────────────────────────────── */

describe("조회수는 복수형 안에서 천 단위를 끊는다", () => {
  /*
    `"{{count}} views"` 는 `3291 views` 를 낸다 — 자릿수를 세어 보게 만드는 표기다.
    같은 카드의 좋아요·댓글은 이미 `formatCount` 를 지나 `3,291` 로 나가고 있어서
    한 줄 안에서 규칙이 갈렸다.

    ## 왜 `{{formattedCount}}` 가 아닌가 (되돌리기 전에 읽을 것)

    `restaurant.detail.metaReviews` 가 쓰는 그 모양은 **호출부가 반드시 값을 같이
    넘겨야** 한다. 그런데 이 열쇠는 두 화면이 부른다 — `src/features/recipe/views/PostDetailScreen.tsx` 와
    `CommunityPopularScreen.tsx`. 한쪽만 고치면 다른 화면에 `{{formattedCount}}` 가
    글자 그대로 찍힌다(i18next 의 `skipOnVariables` 기본값이 그렇다).

    게다가 이 열쇠는 **복수형**이다. `tests/i18nPluralSafety.test.ts` 는 모든 복수
    그룹을 `{ count }` 하나로 렌더해 보고 `{{` 가 남으면 실패시킨다 — 그 검사는
    옳다. 그래서 값이 아니라 **형식을 문구 쪽에 둔다**: `{{count, number}}` 는
    i18next 내장 포맷터라 호출부가 지금까지 넘기던 `count` 그대로 동작하고,
    복수형 선택도 같은 `count` 로 갈린다. 두 화면이 함께 고쳐진다.
  */
  const resources = {
    ko: { common: koCommon },
    en: { common: enCommon },
  }
  const tFor = (language: "ko" | "en") => {
    const i18n = createInstance()
    void i18n.init({
      resources,
      lng: language,
      fallbackLng: "ko",
      defaultNS: "common",
      ns: ["common"],
      interpolation: { escapeValue: false },
      returnNull: false,
    })
    return i18n.getFixedT(language, "common")
  }

  it("영어는 복수형과 천 단위를 동시에 지킨다", () => {
    const t = tFor("en")
    expect(t("community.postDetail.viewCount", { count: 1 })).toBe("1 view")
    expect(t("community.postDetail.viewCount", { count: 2 })).toBe("2 views")
    expect(t("community.postDetail.viewCount", { count: 3291 })).toBe(
      "3,291 views",
    )
    expect(t("community.postDetail.viewCount", { count: 1234567 })).toBe(
      "1,234,567 views",
    )
  })

  it("한국어도 같은 자리에서 끊는다", () => {
    const t = tFor("ko")
    expect(t("community.postDetail.viewCount", { count: 3291 })).toBe(
      "조회 3,291",
    )
    expect(t("community.postDetail.viewCount", { count: 999 })).toBe("조회 999")
  })

  it("같은 줄의 좋아요·댓글과 **같은 답**을 낸다", () => {
    // 한 카드 안에서 조회수만 다른 규칙으로 끊기면 그게 곧 다음 결함이다.
    for (const language of ["ko", "en"] as const) {
      const rendered = tFor(language)("community.postDetail.viewCount", {
        count: 1234567,
      })
      expect(rendered).toContain(formatCount(1234567, language))
    }
  })

  it("`count` 하나만 넘기는 호출부가 여전히 온전히 렌더된다", () => {
    /*
      이것이 `CommunityPopularScreen`(남의 파일)이 지키는 계약이다. 여기가 깨지면
      그 화면에 `{{formattedCount}}` 같은 날문자가 찍힌다.
    */
    expect(read(POPULAR_SCREEN)).toContain("<PostListItem")
    expect(read(POPULAR_SCREEN)).toContain("viewCount={item.views}")
    expect(read("src/features/recipe/components/PostListItem.tsx")).toContain(
      "formatCount(viewCount, i18n.language)",
    )
    for (const language of ["ko", "en"] as const) {
      for (const count of [0, 1, 2, 11, 3291]) {
        const rendered = tFor(language)("community.postDetail.viewCount", {
          count,
        })
        expect(rendered).not.toContain("{{")
        expect(rendered).not.toBe("community.postDetail.viewCount")
      }
    }
  })

  it("문구가 호출부에 두 번째 변수를 요구하지 않는다", () => {
    const strings = [
      koCommon.community.postDetail.viewCount,
      enCommon.community.postDetail.viewCount,
      enCommon.community.postDetail.viewCount_one,
      enCommon.community.postDetail.viewCount_other,
    ]
    for (const value of strings) {
      expect(value).toContain("{{count, number}}")
      expect(value).not.toContain("{{formattedCount}}")
    }
  })

  it("상세 화면은 그 열쇠에 count 를 넘긴다", () => {
    expect(read(POST_DETAIL)).toContain(
      't("community.postDetail.viewCount", { count: post.views ?? 0 })',
    )
  })
})

/* ─────────────────────────────── X7 ─────────────────────────────── */

describe("먼저 들어온 두 고침이 그대로 있다", () => {
  /*
    동시에 여러 손이 이 파일을 만지는 동안 조용히 되돌아가기 쉬운 두 자리다.
     1. 본문이 있으면 오류 화면이 이기지 않는다 — **글이 정말 사라진 게 아니라면.**
     2. 답글에는 ⋯ → 답글 이 없다(서버가 답글의 답글을 안 받는다).
  */
  const source = read(POST_DETAIL)

  it("묘비는 본문이 없거나 서버가 '없는 글' 이라 말했을 때만 이긴다", () => {
    expect(source).toMatch(/if \(isError && \(!post \|\| isPostGone\)\)/u)
    // `isError && !post` 만 남으면 남이 지운 글 위에서 화면이 멀쩡해 보인다.
    expect(source).not.toMatch(/if \(isError && !post\)/u)
  })

  it("답글의 ⋯ 메뉴에는 '답글' 이 없다", () => {
    expect(source).toMatch(/const replyEntry = isReply\s*\?\s*\[\]/u)
    // 시트가 그 사실을 알려면 호출부가 깊이를 넘겨야 한다.
    expect(source).toContain("handleCommentMore(comment, isReply)")
    expect(source).toMatch(
      /const handleCommentMore = async \(\s*comment: CommunityComment,\s*isReply: boolean,\s*\)/u,
    )
  })
})
