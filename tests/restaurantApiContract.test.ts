/**
 * **이 사고를 잡았어야 했던 테스트.**
 *
 * 앱과 백엔드를 같은 문서를 보고 병렬로 만들었고, 필드 이름이 갈렸다. 앱의 DTO 는 손으로
 * 쓴 `interface` 였고 서비스가 응답을 `as SomeDto` 로 단정했기 때문에 **타입스크립트가 한
 * 건도 잡지 못했다.** `npx tsc --noEmit` 은 깨끗한데 런타임에는 모든 값이 `undefined` 였고,
 * 사용자는 이렇게 만났다:
 *
 *     RestaurantCard.tsx:106  Cannot read property 'slice' of undefined
 *
 * 그리고 그건 15건 중 하나였다. 나머지는 **터지지도 않았다** — 주소 확장 셰브런이 영원히
 * 안 나오고, "N곳이 빠졌어요" 안내가 한 번도 안 뜨고, 후기 메뉴 필터 칩 줄이 통째로
 * 사라져 있었다. 아무도 몰랐다. 테스트는 전부 초록이었다.
 *
 * ## 이 테스트가 세우는 성질 하나
 *
 *     서버가 필드 이름을 바꾸면 **화면이 아니라 테스트가** 깨진다.
 *
 * 세 조각을 잇는다:
 *
 * 1. `tests/fixtures/restaurant/*.json` — 살아 있는 서버의 **실제 응답**.
 *    `node scripts/capture-restaurant-fixtures.mjs` 로 재생성한다.
 * 2. `tests/helpers/restaurantContractManifest.ts` — 각 DTO 의 필드 집합을 런타임 값으로
 *    적은 표. `Record<keyof Dto, FieldMode>` 라서 **DTO 와 어긋나면 `tsc` 가 막는다.**
 * 3. 이 파일 — 1과 2를 **양방향**으로 비교한다.
 *
 * 양방향이 핵심이다. 한 방향만 보면 절반을 놓친다:
 * - 앱→서버만 보면, 서버가 **더 보내는** 필드(앱 DTO 가 모르는 필드)를 못 잡는다.
 *   이름이 바뀐 사고는 항상 이 모양이다 — `closeTime` 이 새로 나타나고 `closingTime` 이 사라진다.
 * - 서버→앱만 보면, 앱이 **없는 필드를 기대하는** 것을 못 잡는다. `nutritionBadges` 가 그것이었다.
 *
 * ## 왜 스모크 스크립트(옵션 b)가 아니라 fixture(옵션 a)인가
 *
 * 살아 있는 `:8100` 을 때리는 검사는 서버가 떠 있을 때만 돈다. 안 떠 있으면 조용히
 * 건너뛰어지고, **건너뛰어지는 검사는 없는 검사다** — 이 사고가 정확히 그런 사각지대에서
 * 살아남았다. fixture 는 서버 없이 CI 에서도 항상 돈다.
 *
 * fixture 의 유일한 약점은 "서버가 바뀌었는데 아무도 재생성하지 않는 것"이다. 두 가지로
 * 막는다: (1) 재생성이 명령 한 줄이다, (2) 백엔드 쪽 `bun test tests/restaurant` 가
 * 서버의 응답 모양을 따로 고정하고 있어, 서버가 모양을 바꾸면 그쪽이 먼저 깨진다.
 * 이 테스트는 **앱이 그 변화를 따라왔는지**를 본다.
 */

import {
  BOOKMARK_CARD,
  BOOKMARK_LIST_RESPONSE,
  BOOKMARK_TOGGLE,
  BUSINESS_HOUR,
  CARD,
  CARD_SAFETY,
  DETAIL,
  EXCLUDED_FOR_MISSING_DATA,
  HOURS_RESPONSE,
  LEGACY_RISK_COUNTS,
  LIST_RESPONSE,
  MAP_BOUNDS,
  MAP_CLUSTER,
  MAP_MARKER,
  MAP_RESPONSE,
  MENU_ITEM,
  MENUS_RESPONSE,
  PARKING,
  PHOTO,
  PHOTOS_RESPONSE,
  RATING_BREAKDOWN,
  REGION_GROUP,
  REGION_RESPONSE,
  REGION_SIDO,
  REVIEW,
  REVIEWER_PROFILE,
  REVIEWER_RESPONSE,
  REVIEWER_STATS,
  REVIEWS_RESPONSE,
  SAFETY_SUMMARY,
  SUGGEST_RESPONSE,
  SUGGESTION,
  TODAY_HOURS,
  type FieldManifest,
} from "./helpers/restaurantContractManifest"

import bookmarkToggleFixture from "./fixtures/restaurant/bookmark.toggle.json"
import bookmarksFixture from "./fixtures/restaurant/bookmarks.json"
import detailFixture from "./fixtures/restaurant/detail.json"
import hoursFixture from "./fixtures/restaurant/hours.json"
import mapClusterFixture from "./fixtures/restaurant/map.cluster.json"
import mapMarkerFixture from "./fixtures/restaurant/map.marker.json"
import menusFixture from "./fixtures/restaurant/menus.json"
import photosFixture from "./fixtures/restaurant/photos.json"
import regionsFixture from "./fixtures/restaurant/regions.json"
import reviewerFixture from "./fixtures/restaurant/reviewer.json"
import reviewsFixture from "./fixtures/restaurant/reviews.json"
import searchFixture from "./fixtures/restaurant/search.json"
import suggestFixture from "./fixtures/restaurant/search.suggest.json"

/* ────────────────────────── 비교 장치 ────────────────────────── */

type AnyManifest = Record<string, "always" | "omitted">

/**
 * 한 객체의 키 집합을 표와 비교한다. **두 방향을 다 본다** (헤더 참고).
 *
 * 실패 메시지는 사람이 고칠 수 있게 쓴다 — `Expected: true / Received: false` 로는
 * 아무도 못 고친다. 이 사고를 다시 만난 사람이 읽을 문장을 그대로 넣는다.
 */
function expectFieldsMatch(
  actual: unknown,
  manifest: AnyManifest,
  label: string,
): void {
  expect(typeof actual === "object" && actual !== null).toBe(true)
  const payload = actual as Record<string, unknown>

  const payloadKeys = Object.keys(payload).sort()
  const declaredKeys = Object.keys(manifest).sort()

  // ① 서버는 보내는데 앱 DTO 에 없는 필드. 이름이 바뀌면 여기에 **새 이름**이 뜬다.
  const undeclared = payloadKeys.filter((key) => !(key in manifest))
  expect(
    `${label} — 서버가 보내는데 앱 DTO 에 없는 필드: ${undeclared.join(", ") || "(없음)"}`,
  ).toBe(`${label} — 서버가 보내는데 앱 DTO 에 없는 필드: (없음)`)

  // ② 앱이 항상 기대하는데 응답에 없는 필드. 이름이 바뀌면 여기에 **옛 이름**이 뜬다.
  //    (`nutritionBadges` 가 정확히 이 자리에서 잡혔어야 했다.)
  const missing = declaredKeys.filter(
    (key) => manifest[key] === "always" && !(key in payload),
  )
  expect(
    `${label} — 앱이 기대하는데 서버가 안 보내는 필드: ${missing.join(", ") || "(없음)"}`,
  ).toBe(`${label} — 앱이 기대하는데 서버가 안 보내는 필드: (없음)`)
}

/** 목록의 **모든 항목**을 본다. 행마다 조립 경로가 다른 응답이 실제로 있다. */
function expectEveryItemMatches(
  items: readonly unknown[],
  manifest: AnyManifest,
  label: string,
): void {
  expect(items.length).toBeGreaterThan(0) // 빈 배열은 아무것도 증명하지 못한다
  items.forEach((item, index) => {
    expectFieldsMatch(item, manifest, `${label}[${index}]`)
  })
}

/** `FieldManifest<T>` 를 비교 장치가 읽을 수 있는 평평한 표로 좁힌다. */
const m = (manifest: FieldManifest<never> | object): AnyManifest =>
  manifest as AnyManifest

/* ────────────────────────── E1 GET /restaurants/map ────────────────────────── */

describe("GET /restaurants/map", () => {
  /*
   * 두 모드를 다 본다. 서버가 줌으로 MARKER/CLUSTER 를 가르는데, 한쪽만 검사하면
   * 반대쪽 배열의 항목 모양이 검사되지 않는다(클러스터 `key` 가 사라져도 조용하다).
   */
  it("MARKER 모드 최상위 필드가 앱 DTO 와 일치한다", () => {
    expect(mapMarkerFixture.mode).toBe("MARKER")
    expectFieldsMatch(
      mapMarkerFixture,
      m(MAP_RESPONSE),
      "MapSearchResponse(MARKER)",
    )
    expectFieldsMatch(mapMarkerFixture.viewport, m(MAP_BOUNDS), "viewport")
    expectFieldsMatch(
      mapMarkerFixture.excludedForMissingData,
      m(EXCLUDED_FOR_MISSING_DATA),
      "excludedForMissingData",
    )
  })

  it("마커 항목 필드가 앱 DTO 와 일치한다", () => {
    expectEveryItemMatches(
      mapMarkerFixture.markers,
      m(MAP_MARKER),
      "MapMarkerDto",
    )
  })

  it("CLUSTER 모드 최상위 필드가 앱 DTO 와 일치한다", () => {
    expect(mapClusterFixture.mode).toBe("CLUSTER")
    expectFieldsMatch(
      mapClusterFixture,
      m(MAP_RESPONSE),
      "MapSearchResponse(CLUSTER)",
    )
  })

  it("클러스터 항목 필드가 앱 DTO 와 일치한다", () => {
    expectEveryItemMatches(
      mapClusterFixture.clusters,
      m(MAP_CLUSTER),
      "MapClusterDto",
    )
  })

  /*
   * 이 사고에서 `excludedForMissingData` 는 숫자로 선언돼 있었고 서버는 처음부터 객체를
   * 보냈다. 화면의 `> 0` 이 객체를 숫자와 비교해 **항상 false** 였고, 그래서
   * "영양 정보가 없어 N곳이 빠졌어요" 안내가 한 번도 뜨지 않았다. 터지지 않는 종류의
   * 드리프트라 키 비교만으로는 부족해서 **객체라는 사실**을 따로 못 박는다.
   */
  it("excludedForMissingData 는 숫자가 아니라 객체다", () => {
    expect(typeof mapMarkerFixture.excludedForMissingData).toBe("object")
    expect(typeof searchFixture.excludedForMissingData).toBe("object")
  })
})

/* ────────────────────────── E2 GET /restaurants/search ────────────────────────── */

describe("GET /restaurants/search", () => {
  it("최상위 필드가 앱 DTO 와 일치한다", () => {
    expectFieldsMatch(searchFixture, m(LIST_RESPONSE), "RestaurantListResponse")
  })

  it("카드 항목 필드가 앱 DTO 와 일치한다", () => {
    expectEveryItemMatches(searchFixture.items, m(CARD), "RestaurantCardDto")
  })

  it("카드의 safety 객체 필드가 앱 DTO 와 일치한다", () => {
    searchFixture.items.forEach((item, index) => {
      expectFieldsMatch(
        item.safety,
        m(CARD_SAFETY),
        `RestaurantSafetyDto[${index}]`,
      )
    })
  })

  /*
   * 사고 재현 방지 3종. 이름이 아니라 **없다는 사실**을 고정한다 — 누군가 "카드에도
   * 넣어 주세요" 로 서버를 고치려 하면 그건 결정을 뒤집는 것이고(§-1.1),
   * 그때 이 테스트가 먼저 말을 건다.
   */
  it("서버는 nutritionBadges 를 보내지 않는다 (그게 맞다)", () => {
    // 미검수 임상 주장을 배지로 내보내는 두 번째 경로를 만들지 않기로 한 결정.
    // 배지는 `safety` 에서 앱이 만든다(utils/cardSafetyBadge.ts).
    searchFixture.items.forEach((item) => {
      expect("nutritionBadges" in item).toBe(false)
    })
  })

  it("카드는 branch 를 따로 주지 않는다 (name 에 병합돼 있다)", () => {
    searchFixture.items.forEach((item) => {
      expect("branch" in item).toBe(false)
    })
  })

  it("마감 시각의 서버 이름은 closeTime 이다 (closingTime 이 아니다)", () => {
    searchFixture.items.forEach((item) => {
      expect("closeTime" in item).toBe(true)
      expect("closingTime" in item).toBe(false)
    })
  })
})

/* ────────────────────────── E3 GET /search/suggest ────────────────────────── */

describe("GET /restaurants/search/suggest", () => {
  it("최상위 필드가 앱 DTO 와 일치한다", () => {
    expectFieldsMatch(
      suggestFixture,
      m(SUGGEST_RESPONSE),
      "SearchSuggestResponse",
    )
  })

  it("제안 항목 필드가 앱 DTO 와 일치한다", () => {
    expectEveryItemMatches(
      suggestFixture.suggestions,
      m(SUGGESTION),
      "SearchSuggestionDto",
    )
  })

  /*
   * **이 테스트가 이 파일에서 가장 중요한 것 중 하나다.**
   *
   * 서버는 해당 없는 필드를 `null` 로 채우지 않고 **키를 지운다.** 앱은 그걸
   * `lat: number | null` 로 알고 있었고, 그래서 화면의 가드가 뒤집혀 있었다:
   *
   *     if (item.type === "REGION" && item.lat !== null) …   // undefined !== null → true!
   *
   * 좌표 없는 제안에서 이 가드가 통과해 지도 카메라가 `lat: undefined` 로 움직였다.
   * fixture 에 **좌표 없는 제안이 실제로 들어 있는지**를 먼저 확인한다 — 없으면 이
   * 성질은 증명되지 않은 것이고, 그 사실을 조용히 넘기면 안 된다.
   */
  it("좌표 없는 제안은 lat/lng 키가 null 이 아니라 아예 없다", () => {
    const coordless = suggestFixture.suggestions.filter(
      (item) => !("lat" in item),
    )
    expect(coordless.length).toBeGreaterThan(0)
    coordless.forEach((item) => {
      expect("lng" in item).toBe(false)
      expect(Object.values(item)).not.toContain(null)
    })
  })

  it("REGION 제안은 regionGroup 이 아니라 key 로 지역 슬러그를 준다", () => {
    const regions = suggestFixture.suggestions.filter(
      (item) => item.type === "REGION",
    )
    expect(regions.length).toBeGreaterThan(0)
    regions.forEach((item) => {
      expect("key" in item).toBe(true)
      expect("regionGroup" in item).toBe(false)
    })
  })
})

/* ────────────────────────── E5 GET /regions ────────────────────────── */

describe("GET /restaurants/regions", () => {
  it("최상위 필드가 앱 DTO 와 일치한다", () => {
    expectFieldsMatch(regionsFixture, m(REGION_RESPONSE), "RegionFacetResponse")
  })

  it("시도 항목 필드가 앱 DTO 와 일치한다", () => {
    expectEveryItemMatches(
      regionsFixture.sidos,
      m(REGION_SIDO),
      "RegionFacetDto",
    )
  })

  it("그룹 항목 필드가 앱 DTO 와 일치한다", () => {
    const groups = regionsFixture.sidos.flatMap((sido) => sido.groups)
    expectEveryItemMatches(groups, m(REGION_GROUP), "RegionFacetGroupDto")
  })

  /*
   * 서버는 표시 문구가 아니라 i18n 키를 보낸다. 예전 서버가 `label: "강남"` 을 보내
   * 영어 사용자에게 한글이 그대로 나갔고, 그게 지역을 슬러그 키로 옮긴 이유 중 하나다.
   */
  it("서버는 label 이 아니라 labelKey 를 보낸다", () => {
    regionsFixture.sidos.forEach((sido) => {
      expect("label" in sido).toBe(false)
      expect(sido.labelKey.startsWith("restaurant.")).toBe(true)
    })
  })
})

/* ────────────────────────── E6/E7 북마크 ────────────────────────── */

describe("GET /restaurants/bookmarks", () => {
  it("최상위 필드가 앱 DTO 와 일치한다", () => {
    expectFieldsMatch(
      bookmarksFixture,
      m(BOOKMARK_LIST_RESPONSE),
      "BookmarkListResponse",
    )
  })

  it("북마크 카드 필드가 앱 DTO 와 일치한다", () => {
    expectEveryItemMatches(
      bookmarksFixture.items,
      m(BOOKMARK_CARD),
      "BookmarkCardDto",
    )
  })

  /*
   * **북마크 카드는 검색 카드와 다른 모양이다.** 이번 사고에서 가장 늦게 발견됐고,
   * 앱은 `items: RestaurantCardDto[]` 로 선언하고 있었다. 두 표가 다르다는 사실을
   * 테스트로 고정한다 — 누군가 "같은 카드니까 합치자" 로 되돌리면 여기서 막힌다.
   */
  it("북마크 카드에는 개인화 safety 가 없다 (0 이나 SAFE 로 채우지 않는다)", () => {
    bookmarksFixture.items.forEach((item) => {
      expect("safety" in item).toBe(false)
      // 자리는 있지만 값이 `null` 이다. 미판정을 안전으로 승격하지 않는 규칙(D4).
      expect(item.safetySummary).toBeNull()
    })
  })

  it("북마크 카드에만 bookmarkedAt 이 있다", () => {
    bookmarksFixture.items.forEach((item) => {
      expect(typeof item.bookmarkedAt).toBe("string")
    })
    searchFixture.items.forEach((item) => {
      expect("bookmarkedAt" in item).toBe(false)
    })
  })

  it("PUT /:id/bookmark 응답 필드가 앱 DTO 와 일치한다", () => {
    expectFieldsMatch(
      bookmarkToggleFixture,
      m(BOOKMARK_TOGGLE),
      "BookmarkToggleResponse",
    )
  })
})

/* ────────────────────────── 상세 GET /:id ────────────────────────── */

describe("GET /restaurants/:id", () => {
  it("최상위 47키가 앱 DTO 와 일치한다", () => {
    expectFieldsMatch(detailFixture, m(DETAIL), "RestaurantDetailDto")
  })

  it("중첩 객체 필드가 앱 DTO 와 일치한다", () => {
    expectFieldsMatch(detailFixture.parking, m(PARKING), "ParkingInfoDto")
    expectFieldsMatch(
      detailFixture.safetySummary,
      m(SAFETY_SUMMARY),
      "SafetySummaryDto",
    )
    expectFieldsMatch(
      detailFixture.legacyRiskCounts,
      m(LEGACY_RISK_COUNTS),
      "LegacyRiskCounts",
    )
    expectEveryItemMatches(
      detailFixture.businessHours,
      m(BUSINESS_HOUR),
      "BusinessHourDto",
    )
  })

  /*
   * 상세 화면 전체를 죽였던 두 줄. `detail.nutritionBadges.map()` 이
   * `Cannot read property 'map' of undefined` 였고, `roadAddress` 는 터지지 않고
   * 주소 줄을 통째로 감추기만 했다(그래서 더 늦게 발견됐다).
   */
  it("서버는 nutritionBadges·branch·tagline·roadAddress 를 보내지 않는다", () => {
    expect("nutritionBadges" in detailFixture).toBe(false)
    expect("branch" in detailFixture).toBe(false)
    expect("tagline" in detailFixture).toBe(false)
    expect("roadAddress" in detailFixture).toBe(false)
    expect("address" in detailFixture).toBe(true)
  })

  /*
   * `photoCategoryCounts` 에 `all` 키가 없다. 서버는 0건 카테고리를 아예 생략하고
   * 전체 수는 `photoCount` 로 준다 — 앱이 `.all` 을 읽어 `전체 undefined` 칩을 그렸다.
   */
  it("photoCategoryCounts 에 all 키는 없고 전체 수는 photoCount 다", () => {
    expect("all" in detailFixture.photoCategoryCounts).toBe(false)
    expect(typeof detailFixture.photoCount).toBe("number")
  })
})

/* ────────────────────────── 메뉴 GET /:id/menus ────────────────────────── */

describe("GET /restaurants/:id/menus", () => {
  it("최상위 필드가 앱 DTO 와 일치한다", () => {
    expectFieldsMatch(
      menusFixture,
      m(MENUS_RESPONSE),
      "RestaurantMenusResponse",
    )
  })

  it("메뉴 항목 필드가 앱 DTO 와 일치한다", () => {
    expectEveryItemMatches(menusFixture.menus, m(MENU_ITEM), "MenuItemDto")
  })

  /*
   * 영양소 4종의 서버 이름에는 **단위 접미사가 없다.** 앱이 `proteinG`/`sodiumMg`/
   * `potassiumMg`/`phosphorusMg` 로 읽고 있었고 넷 다 `undefined` 였다 — 그래서
   * `진단하기` 가 상담으로 싣는 음식 맥락에 **영양소가 하나도 없었다.** 터지지 않는
   * 종류라 화면만 봐서는 알 수 없었다. 이 기능의 목적 자체가 비어 있던 셈이다.
   */
  it("영양소 키에 단위 접미사가 붙지 않는다 (proteinG 가 아니라 protein)", () => {
    menusFixture.menus.forEach((menu) => {
      expect("protein" in menu).toBe(true)
      expect("sodium" in menu).toBe(true)
      expect("potassium" in menu).toBe(true)
      expect("phosphorus" in menu).toBe(true)
      expect("proteinG" in menu).toBe(false)
      expect("sodiumMg" in menu).toBe(false)
    })
  })

  /** 판정 삼각형이 다 와야 배지에 근거가 있다. 하나라도 없으면 빈 배지가 그려진다. */
  it("메뉴마다 safetyLevel·safetyDriver·confidence 가 모두 온다", () => {
    menusFixture.menus.forEach((menu) => {
      expect(["SAFE", "CAUTION", "RESTRICTED", "UNKNOWN"]).toContain(
        menu.safetyLevel,
      )
      expect("safetyDriver" in menu).toBe(true) // 값은 null 일 수 있다
      expect(["ESTIMATED", "VERIFIED"]).toContain(menu.confidence)
    })
  })
})

/* ────────────────────────── 사진 GET /:id/photos ────────────────────────── */

describe("GET /restaurants/:id/photos", () => {
  it("최상위 필드가 앱 DTO 와 일치한다", () => {
    expectFieldsMatch(
      photosFixture,
      m(PHOTOS_RESPONSE),
      "RestaurantPhotosResponse",
    )
  })

  it("사진 항목 7키가 앱 DTO 와 일치한다", () => {
    expectEveryItemMatches(photosFixture.items, m(PHOTO), "PhotoDto")
  })

  /*
   * `author` 는 **한 번도 채워진 적이 없었다.** 뷰어의 작성자 블록이 `photo.author` 를
   * 읽고 있었으니 그 블록은 항상 비어 있었다는 뜻이다. 이제 `sourceReviewId` 로 찾은
   * 후기에서 작성자를 꺼낸다 — 그래서 그 키가 오는지가 기능의 전제가 됐다.
   */
  it("사진에는 author 가 없고 sourceReviewId 로 작성자를 찾는다", () => {
    photosFixture.items.forEach((photo) => {
      expect("author" in photo).toBe(false)
      expect("aspectRatio" in photo).toBe(false)
      expect("sourceReviewId" in photo).toBe(true)
    })
  })
})

/* ────────────────────────── 후기 GET /:id/reviews ────────────────────────── */

describe("GET /restaurants/:id/reviews", () => {
  it("최상위 필드가 앱 DTO 와 일치한다", () => {
    expectFieldsMatch(
      reviewsFixture,
      m(REVIEWS_RESPONSE),
      "RestaurantReviewsResponse",
    )
  })

  it("후기 항목 필드가 앱 DTO 와 일치한다", () => {
    expectEveryItemMatches(reviewsFixture.items, m(REVIEW), "ReviewDto")
  })

  it("ratingBreakdown 필드가 앱 DTO 와 일치한다", () => {
    expectFieldsMatch(
      reviewsFixture.ratingBreakdown,
      m(RATING_BREAKDOWN),
      "RatingDistributionDto",
    )
  })

  /*
   * 작성자는 평평한 다섯 필드다. 앱은 `author: ReviewerProfileDto` 중첩을 선언했고
   * `ReviewCard` 가 `review.author.reviewerId` 를 읽어 **후기 탭과 홈 탭이 함께 죽었다**
   * (홈 탭도 후기 3건을 미리 그린다). 크래시 두 개가 한 필드에서 나왔다.
   */
  it("작성자는 중첩 author 가 아니라 평평한 다섯 필드다", () => {
    reviewsFixture.items.forEach((review) => {
      expect("author" in review).toBe(false)
      expect("authorName" in review).toBe(true)
      expect("reviewerId" in review).toBe(true)
      expect("authorProfileImageUrl" in review).toBe(true)
      expect("authorReviewCount" in review).toBe(true)
      expect("authorFollowerCount" in review).toBe(true)
    })
  })

  /*
   * `menuCounts` 는 **객체다**(`{ "비빔밥": 2 }`), 배열이 아니다. 앱이
   * `{menuName,count}[]` 로 선언해 `.length` 가 `undefined` 였고, 그래서 후기 탭의
   * `메뉴` 필터 칩 줄이 **조용히 사라져 있었다.** 터지지 않아서 아무도 못 봤다.
   */
  it("menuCounts 는 배열이 아니라 객체다", () => {
    expect(Array.isArray(reviewsFixture.menuCounts)).toBe(false)
    expect(typeof reviewsFixture.menuCounts).toBe("object")
    expect(Object.keys(reviewsFixture.menuCounts).length).toBeGreaterThan(0)
  })
})

/* ────────────────────────── 영업시간 GET /:id/hours ────────────────────────── */

describe("GET /restaurants/:id/hours", () => {
  it("최상위 필드가 앱 DTO 와 일치한다", () => {
    expectFieldsMatch(
      hoursFixture,
      m(HOURS_RESPONSE),
      "RestaurantHoursResponse",
    )
  })

  it("today 객체 필드가 앱 DTO 와 일치한다", () => {
    expectFieldsMatch(hoursFixture.today, m(TODAY_HOURS), "TodayHoursDto")
  })

  it("요일별 항목 필드가 앱 DTO 와 일치한다", () => {
    expectEveryItemMatches(
      hoursFixture.hours,
      m(BUSINESS_HOUR),
      "BusinessHourDto",
    )
  })

  /*
   * `today` 는 **객체**다. 앱은 요일 문자열로 알고 있었고, 그래서
   * `hours.find(h => h.weekday === today)` 가 객체와 문자열을 비교해 항상 실패했다
   * (마감 시각이 영원히 비었다). 없는 `status` 필드를 읽어 상태는 늘 `UNKNOWN` 이었다 —
   * 즉 **영업 중인 모든 식당이 "정보 없음" 으로 보였다.**
   */
  it("today 는 요일 문자열이 아니라 객체이고, status 라는 필드는 없다", () => {
    expect(typeof hoursFixture.today).toBe("object")
    expect(hoursFixture.today).not.toBeNull()
    expect("status" in hoursFixture).toBe(false)
    expect("businessStatus" in hoursFixture.today).toBe(true)
  })

  /** 계약 §2.3 이 카운트다운의 근거로 요구한다. 상세와 `/hours` 양쪽에 있어야 한다. */
  it("nextTransitionAt 이 최상위와 today 양쪽에 온다", () => {
    expect("nextTransitionAt" in hoursFixture).toBe(true)
    expect("nextTransitionAt" in hoursFixture.today).toBe(true)
    expect("nextTransitionAt" in detailFixture).toBe(true)
  })
})

/* ────────────────────────── E13 GET /reviewers/:id ────────────────────────── */

describe("GET /restaurants/reviewers/:id", () => {
  it("최상위 필드가 앱 DTO 와 일치한다", () => {
    expectFieldsMatch(
      reviewerFixture,
      m(REVIEWER_RESPONSE),
      "ReviewerProfileResponse",
    )
  })

  it("profile·stats 필드가 앱 DTO 와 일치한다", () => {
    expectFieldsMatch(
      reviewerFixture.profile,
      m(REVIEWER_PROFILE),
      "ReviewerProfileDto",
    )
    expectFieldsMatch(
      reviewerFixture.stats,
      m(REVIEWER_STATS),
      "ReviewerStatsDto",
    )
  })

  /*
   * 작성자가 쓴 **후기 목록은 오지 않는다.** 앱은 `reviews`/`nextCursor`/`hasMore` 를
   * 최상위에 선언하고 훅이 `useInfiniteQuery` 로 `page.reviews` 를 돌려
   * `for (const x of undefined)` 를 만들고 있었다. 서버도 계약도 그 목록을 약속하지
   * 않았으므로 **앱이 틀렸다** — 화면은 그 자리를 "제공되지 않음" 빈 상태로 둔다.
   */
  it("작성자 후기 목록은 응답에 없다 (앱이 기대하면 안 된다)", () => {
    expect("reviews" in reviewerFixture).toBe(false)
    expect("nextCursor" in reviewerFixture).toBe(false)
    expect("hasMore" in reviewerFixture).toBe(false)
  })

  /*
   * 팔로우 개념 자체가 스키마에 없다. 앱은 `following: boolean | null` 을 선언했고
   * 화면이 `following !== null` 로 팔로우 UI 를 켰다 — `undefined !== null` 이 `true` 라서
   * **눌러도 아무 일 없는 버튼**이 세 곳에 켜져 있었다.
   */
  it("profile 에 following 필드는 없다", () => {
    expect("following" in reviewerFixture.profile).toBe(false)
    expect("nickName" in reviewerFixture.profile).toBe(true)
    expect("nickname" in reviewerFixture.profile).toBe(false)
    expect("avatarUrl" in reviewerFixture.profile).toBe(false)
  })
})

/* ────────────────────────── 장치 자체를 검사한다 ────────────────────────── */

/**
 * **이 블록이 없으면 위의 전부를 믿을 수 없다.**
 *
 * 지난 라운드의 실패가 "테스트는 초록인데 화면은 깨져 있었다" 였다. 그래서 비교 장치가
 * 실제로 **실패할 수 있다**는 것을 증명한다 — 사고를 그대로 재현해서 넣어 본다.
 * 이 세 케이스가 통과한다는 것은 위의 케이스들이 진짜로 무언가를 지키고 있다는 뜻이다.
 */
describe("계약 비교 장치가 실제로 드리프트를 잡는가", () => {
  it("서버가 필드를 지우면 실패한다 (nutritionBadges 사고)", () => {
    const { safety: _dropped, ...withoutSafety } = searchFixture.items[0]
    expect(() =>
      expectFieldsMatch(withoutSafety, m(CARD), "RestaurantCardDto"),
    ).toThrow(/safety/)
  })

  it("서버가 필드 이름을 바꾸면 양쪽에서 실패한다 (closeTime → closingTime)", () => {
    const { closeTime, ...rest } = searchFixture.items[0]
    const renamed = { ...rest, closingTime: closeTime }
    // 새 이름은 "앱 DTO 에 없는 필드" 로, 옛 이름은 "서버가 안 보내는 필드" 로 잡힌다.
    expect(() =>
      expectFieldsMatch(renamed, m(CARD), "RestaurantCardDto"),
    ).toThrow(/closingTime/)
  })

  it("서버가 필드를 새로 더해도 실패한다 (DTO 가 모르는 필드는 화면이 못 쓴다)", () => {
    const extended = { ...searchFixture.items[0], newServerField: 1 }
    expect(() =>
      expectFieldsMatch(extended, m(CARD), "RestaurantCardDto"),
    ).toThrow(/newServerField/)
  })

  /*
   * 빈 배열은 아무것도 증명하지 못한다. fixture 를 서버가 비어 있을 때 재생성하면
   * 항목 검사가 **0번 돌면서 초록**이 되는데, 그게 이 사고의 재발 경로다
   * (`/bookmarks` 가 실제로 빈 배열이었고, 그래서 북마크 카드 드리프트가 가장 늦게 발견됐다).
   */
  it("빈 목록으로는 통과할 수 없다", () => {
    expect(() =>
      expectEveryItemMatches([], m(CARD), "RestaurantCardDto"),
    ).toThrow()
  })
})
