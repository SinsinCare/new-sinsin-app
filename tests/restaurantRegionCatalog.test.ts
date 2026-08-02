/**
 * 지역 카탈로그는 필터 칩 라벨·카메라 좌표·서버 `region_group` 백필이 **함께** 보는 정본이다.
 * 키가 한 글자 갈리면 "강남 선택 → 0건" 이 조용히 난다(오류도 로그도 없다). 그래서
 * 키 규칙(접두어·유일성·`-all`)과 커버리지를 여기서 못 박는다.
 *
 * 그리고 **경기 칩이 전국을 타일링하지 않는다는 사실**을 단언한다. 이천·여주·광주(경기)가
 * 어느 그룹에도 없는 것은 버그가 아니라 결정이다 — 이천을 `평택/오산/안성` 에 밀어넣으면
 * 그 칩을 누른 사용자가 조용히 오답을 받는다. 이 테스트가 그 "친절한 수정" 을 막는다.
 */

import koCommon from "../src/i18n/locales/ko/common.json"
import { hasCommonKey } from "./helpers/i18nResourceKeys"
import {
  REGION_CATALOG,
  SIDO_ALL_SUFFIX,
  centerFor,
  groupsFor,
  isRegionGroupKey,
  isRegionSidoKey,
  isSidoAllKey,
  labelKeyFor,
  sidoKeyOf,
  sidoKeyOfAllKey,
} from "../src/features/restaurant/data/regionCatalog"

const ALL_GROUPS = REGION_CATALOG.flatMap((sido) => sido.groups)

/** 서울 25개 구. 목업 11칩이 이걸 전부 덮어야 `region_group IS NULL` 인 서울 식당이 없다. */
const SEOUL_25_GU = [
  "강남구",
  "강동구",
  "강북구",
  "강서구",
  "관악구",
  "광진구",
  "구로구",
  "금천구",
  "노원구",
  "도봉구",
  "동대문구",
  "동작구",
  "마포구",
  "서대문구",
  "서초구",
  "성동구",
  "성북구",
  "송파구",
  "양천구",
  "영등포구",
  "용산구",
  "은평구",
  "종로구",
  "중구",
  "중랑구",
] as const

describe("시·도 목록", () => {
  it("17개이고 중복이 없다 — 목업의 `울산` 두 번은 시안 실수다", () => {
    expect(REGION_CATALOG).toHaveLength(17)
    expect(new Set(REGION_CATALOG.map((s) => s.key)).size).toBe(17)
  })

  it("첫 칩은 서울, 두 번째는 경기다 (목업 -22 배치)", () => {
    expect(REGION_CATALOG[0].key).toBe("seoul")
    expect(REGION_CATALOG[1].key).toBe("gyeonggi")
  })

  it("시도 라벨 키는 기존 `restaurant.filter.regions.*` 를 재사용한다", () => {
    for (const sido of REGION_CATALOG) {
      expect(sido.labelKey).toBe(`restaurant.filter.regions.${sido.key}`)
      expect(hasCommonKey(sido.labelKey, "ko")).toBe(true)
      expect(hasCommonKey(sido.labelKey, "en")).toBe(true)
    }
  })

  it("모든 시도에 카메라 좌표가 있다", () => {
    for (const sido of REGION_CATALOG) {
      // 좌표가 없으면 칩을 눌러도 지도가 안 움직인다(레거시 REGION_CENTERS 는 11/60 뿐이었다).
      expect(sido.center.lat).toBeGreaterThan(32)
      expect(sido.center.lat).toBeLessThan(39)
      expect(sido.center.lng).toBeGreaterThan(124)
      expect(sido.center.lng).toBeLessThan(132)
    }
  })
})

describe("그룹 키 규칙 (되돌리지 말 것)", () => {
  it("120개이고 전부 유일하다", () => {
    expect(ALL_GROUPS).toHaveLength(120)
    expect(new Set(ALL_GROUPS.map((g) => g.key)).size).toBe(120)
  })

  it("모든 그룹 키가 소속 시도로 접두된다", () => {
    // 접두어 없는 `강남` 형태로는 목업 -24 의 "수원 + 강남 + 서초" 동시 선택에서
    // 어느 시도 소속인지 잃는다.
    for (const sido of REGION_CATALOG) {
      for (const group of sido.groups) {
        expect(group.key.startsWith(`${sido.key}-`)).toBe(true)
        expect(sidoKeyOf(group.key)).toBe(sido.key)
      }
    }
  })

  it("모든 시도가 `<sido>-all` 을 첫 칩으로 갖는다", () => {
    for (const sido of REGION_CATALOG) {
      expect(sido.groups[0].key).toBe(`${sido.key}${SIDO_ALL_SUFFIX}`)
      expect(isSidoAllKey(sido.groups[0].key)).toBe(true)
    }
  })

  it("`-all` 에 백필 매칭어가 없다 — 세종만 예외이고 그것도 저장 대상은 아니다", () => {
    // `-all` 은 그룹이 아니라 **시도 전체**를 뜻하고, 서버 `region_group` 에 저장하지 않는다
    // (카탈로그 헤더 규칙 3). 그래서 매칭어를 들고 있을 이유가 없다.
    //
    // 실측 예외: 세종은 시군구가 없는 단일 시라 그룹이 `sejong-all` 하나뿐이고,
    // 거기에 `세종특별자치시` 가 들어 있다. 칩 동작에는 영향이 없다 —
    // `isSidoAllKey('sejong-all')` 이 true 라 필터는 항상 `regionSidos` 로 번역된다.
    // **백필이 그룹 매칭어를 순회할 때만 함정이다**: 그대로 쓰면 세종 행에
    // `region_group='sejong-all'` 이 박혀 규칙 3 을 깬다. 백필은 `-all` 을 건너뛴다.
    const withSigungu = ALL_GROUPS.filter(
      (group) => isSidoAllKey(group.key) && group.sigungu.length > 0,
    ).map((group) => group.key)
    expect(withSigungu).toEqual(["sejong-all"])
  })

  it("`-all` 이 아닌 그룹은 백필 매칭어를 갖는다", () => {
    for (const group of ALL_GROUPS) {
      if (isSidoAllKey(group.key)) continue
      expect(group.sigungu.length).toBeGreaterThan(0)
    }
  })

  it("한 시군구가 두 그룹에 동시에 들어가지 않는다", () => {
    // 겹치면 백필 결과가 검사 순서에 따라 달라진다 — 재현되지 않는 오답이 된다.
    for (const sido of REGION_CATALOG) {
      const seen = new Set<string>()
      for (const group of sido.groups) {
        for (const name of group.sigungu) {
          expect(seen.has(name)).toBe(false)
          seen.add(name)
        }
      }
    }
  })

  it("모든 그룹 라벨 키가 ko/en 둘 다에 있다", () => {
    for (const group of ALL_GROUPS) {
      expect(group.labelKey).toBe(`restaurant.region.groups.${group.key}`)
      expect(hasCommonKey(group.labelKey, "ko")).toBe(true)
      expect(hasCommonKey(group.labelKey, "en")).toBe(true)
    }
  })

  it("i18n 에 카탈로그에 없는 유령 그룹 키가 남아 있지 않다", () => {
    const known = new Set(ALL_GROUPS.map((g) => g.key))
    const inResources = Object.keys(koCommon.restaurant.region.groups)
    expect(inResources).toHaveLength(120)
    for (const key of inResources) {
      expect(known.has(key)).toBe(true)
    }
  })
})

describe("서울 — 25개 구를 11칩이 전부 덮는다", () => {
  const seoulGroups = groupsFor("seoul")

  it("`서울 전체` 를 포함해 11칩이다", () => {
    expect(seoulGroups).toHaveLength(11)
  })

  it("빠진 구가 없다", () => {
    const covered = new Set(seoulGroups.flatMap((g) => g.sigungu))
    for (const gu of SEOUL_25_GU) {
      expect(covered.has(gu)).toBe(true)
    }
    // 목업 라벨에 없는 구(은평·강북·도봉·동대문·양천·금천)도 인접 그룹에 들어가 있어야
    // `region_group IS NULL` 인 서울 식당이 생기지 않는다.
    expect(covered.size).toBe(SEOUL_25_GU.length)
  })

  it("강남·서초는 각자 단독 칩이다 (시드 데이터가 이 블록에 있다)", () => {
    const gangnam = seoulGroups.find((g) => g.key === "seoul-gangnam")
    const seocho = seoulGroups.find((g) => g.key === "seoul-seocho")
    expect(gangnam?.sigungu).toEqual(["강남구"])
    expect(seocho?.sigungu).toEqual(["서초구"])
    expect(gangnam?.center).toEqual({ lat: 37.4979, lng: 127.0276 })
  })
})

describe("경기 — 목업 칩이 전국을 타일링하지 않는다 (문서화된 공백)", () => {
  const gyeonggiGroups = groupsFor("gyeonggi")
  const covered = new Set(gyeonggiGroups.flatMap((g) => g.sigungu))

  it("`경기 전체` 를 포함해 14칩이다 (목업 -24 그대로)", () => {
    expect(gyeonggiGroups).toHaveLength(14)
  })

  it.each(["이천시", "여주시", "광주시"])(
    "%s 는 어느 경기 그룹에도 없다 — 인접 그룹에 밀어넣지 말 것",
    (sigungu) => {
      // 이천을 `평택/오산/안성` 에 넣으면 그 칩을 누른 사용자가 이천 식당을 받는다.
      // 그건 조용한 오답이고 버그로 보인다. 이 시군의 식당은 `경기 전체` 로만 도달한다.
      expect(covered.has(sigungu)).toBe(false)
    },
  )

  it("경기 광주시가 광주광역시 그룹으로 새지도 않는다", () => {
    // `광주` 는 광주광역시(gwangju)와 경기 광주시 둘 다에 걸린다. 백필은 시도를 먼저 확정한다.
    const gwangjuGroups = groupsFor("gwangju")
    for (const group of gwangjuGroups) {
      expect(group.sigungu).not.toContain("광주시")
    }
    expect(REGION_CATALOG.some((s) => s.key === "gwangju")).toBe(true)
  })

  it("수원은 단독 칩이다 (목업 -24 의 선택 상태)", () => {
    const suwon = gyeonggiGroups.find((g) => g.key === "gyeonggi-suwon")
    expect(suwon?.sigungu).toEqual(["수원시"])
  })
})

describe("동명 지역 — 시도를 먼저 확정해야 하는 값들", () => {
  it("고성군은 강원과 경남 양쪽에 있다", () => {
    const gangwon = groupsFor("gangwon").flatMap((g) => g.sigungu)
    const gyeongnam = groupsFor("gyeongnam").flatMap((g) => g.sigungu)
    expect(gangwon).toContain("고성군")
    expect(gyeongnam).toContain("고성군")
  })

  it("창원 통합시의 잔존 구 이름 셋이 같은 그룹이다", () => {
    const changwon = groupsFor("gyeongnam").find(
      (g) => g.key === "gyeongnam-changwon",
    )
    expect(changwon?.sigungu).toEqual(
      expect.arrayContaining(["창원시", "마산회원구", "진해구"]),
    )
  })
})

describe("조회 헬퍼", () => {
  it("모르는 시도는 빈 배열이다 — 화면이 섹션을 감춘다", () => {
    expect(groupsFor("atlantis")).toEqual([])
    expect(groupsFor(null)).toEqual([])
  })

  it("centerFor/labelKeyFor 는 그룹 키와 시도 키 둘 다 받는다", () => {
    expect(centerFor("seoul-gangnam")).toEqual({ lat: 37.4979, lng: 127.0276 })
    expect(centerFor("seoul")).toEqual({ lat: 37.5665, lng: 126.978 })
    expect(labelKeyFor("seoul-gangnam")).toBe(
      "restaurant.region.groups.seoul-gangnam",
    )
    expect(labelKeyFor("seoul")).toBe("restaurant.filter.regions.seoul")
  })

  it("모르는 키는 null 이다 — 옛 링크의 사라진 키를 칩으로 그리지 않는다", () => {
    expect(centerFor("gyeonggi-icheon")).toBeNull()
    expect(labelKeyFor("gyeonggi-icheon")).toBeNull()
  })

  it("모든 카탈로그 키가 좌표와 라벨을 갖는다", () => {
    for (const group of ALL_GROUPS) {
      expect(centerFor(group.key)).not.toBeNull()
      expect(labelKeyFor(group.key)).not.toBeNull()
    }
  })

  it("`-all` 판별과 시도 추출", () => {
    expect(isSidoAllKey("seoul-all")).toBe(true)
    expect(isSidoAllKey("seoul-gangnam")).toBe(false)
    expect(sidoKeyOf("seoul-all")).toBe("seoul")
    expect(sidoKeyOf("seoul")).toBe("seoul")
  })
})

/**
 * 밖에서 들어온 키(서버 `ai-search` 응답, 딥링크 쿼리)를 축에 넣기 전 판정하는 술어들.
 * 이름과 의미는 백엔드 `regionCatalog.ts` 의 동명 함수와 같아야 한다 — 두 쪽이 같은 질문에
 * 다른 답을 하면 그게 바로 "칩을 눌렀는데 0건" 이다.
 */
describe("키 검증 술어", () => {
  it("`isRegionGroupKey` 는 실제 그룹 키에만 참이다", () => {
    expect(isRegionGroupKey("seoul-gangnam")).toBe(true)
    // 시도 키는 그룹이 아니다.
    expect(isRegionGroupKey("seoul")).toBe(false)
    // `-all` 은 그룹이 아니라 "시도 전체" 다 — 서버가 `region_group` 에 저장하지 않는다.
    expect(isRegionGroupKey("seoul-all")).toBe(false)
    // 한글 라벨은 더 이상 키가 아니다(이 사고의 원인).
    expect(isRegionGroupKey("강남")).toBe(false)
    expect(isRegionGroupKey("gyeonggi-icheon")).toBe(false)
  })

  it("`isRegionSidoKey` 는 17개 시도 키에만 참이다", () => {
    for (const sido of REGION_CATALOG) {
      expect(isRegionSidoKey(sido.key)).toBe(true)
    }
    expect(isRegionSidoKey("seoul-all")).toBe(false)
    expect(isRegionSidoKey("seoul-gangnam")).toBe(false)
    expect(isRegionSidoKey("서울")).toBe(false)
    expect(isRegionSidoKey("부산전체")).toBe(false)
  })

  it("두 술어는 서로 배타적이고, 카탈로그 전체를 정확히 분류한다", () => {
    const groups = ALL_GROUPS.filter((g) => !isSidoAllKey(g.key))
    expect(groups).toHaveLength(103)
    for (const group of groups) {
      expect(isRegionGroupKey(group.key)).toBe(true)
      expect(isRegionSidoKey(group.key)).toBe(false)
    }
    for (const sido of REGION_CATALOG) {
      // `<sido>-all` 은 두 축 어디에도 그대로 들어가지 않는다. `sidoKeyOf` 로 번역해야 한다.
      expect(isRegionGroupKey(`${sido.key}${SIDO_ALL_SUFFIX}`)).toBe(false)
      expect(isRegionSidoKey(`${sido.key}${SIDO_ALL_SUFFIX}`)).toBe(false)
      expect(sidoKeyOfAllKey(`${sido.key}${SIDO_ALL_SUFFIX}`)).toBe(sido.key)
    }
  })

  /**
   * `sidoKeyOf` 는 첫 하이픈에서 자르므로 `seoul-typo-all` 을 `seoul` 로 만든다. 그 값을
   * 그대로 시도 필터에 쓰면 없는 칩이 **서울 전체**로 바뀐다. 서버 `sidoForGroup` 도 같은
   * 이유로 하이픈을 자르지 않는다 — 두 쪽이 같은 답을 해야 한다.
   */
  it("`sidoKeyOfAllKey` 는 정확히 `<시도>-all` 일 때만 답한다", () => {
    expect(sidoKeyOfAllKey("seoul-all")).toBe("seoul")
    expect(sidoKeyOfAllKey("sejong-all")).toBe("sejong")
    // 하이픈을 자르는 쪽은 추측을 하고, 이쪽은 하지 않는다.
    expect(sidoKeyOf("seoul-typo-all")).toBe("seoul")
    expect(sidoKeyOfAllKey("seoul-typo-all")).toBeNull()
    expect(sidoKeyOfAllKey("부산전체-all")).toBeNull()
    expect(sidoKeyOfAllKey("seoul-gangnam")).toBeNull()
    expect(sidoKeyOfAllKey("seoul")).toBeNull()
    expect(sidoKeyOfAllKey("-all")).toBeNull()
  })
})
