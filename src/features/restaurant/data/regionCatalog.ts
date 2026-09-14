/**
 * 지역 카탈로그 — 정본. 필터 칩 라벨, 칩 선택 시 카메라가 갈 좌표, 서버 `region_group`
 * 백필이 **모두 이 표 하나**를 본다. 키가 갈리면 "강남 선택 → 0건" 이 조용히 난다.
 *
 * ## 키 규칙 (되돌리지 말 것)
 *
 * 1. 시도 키는 기존 i18n `restaurant.filter.regions.*` 를 그대로 쓴다(17개, 이미 존재).
 * 2. 그룹 키는 `<sido>-<slug>` 다. 기존 코드에 `seoul-all`, `gangnam` 처럼 접두어가
 *    **있는 것과 없는 것이 섞여** 있었는데, 접두어 없는 형태로는 목업 -24 의
 *    "수원 + 강남 + 서초" 동시 선택에서 어느 시도 소속인지 잃는다. 전부 접두어를 붙였다.
 * 3. `<sido>-all` 은 그룹이 아니라 **시도 전체**를 뜻한다. 서버 `region_group` 에
 *    저장하지 않고 질의에서 `region_sido = X` 로 번역한다(`FilterState.regionSidos`).
 * 4. `sigungu` 는 백엔드 백필용 매칭어다. 주소가 이 문자열 중 하나를 포함하면 그 그룹이다.
 *    **긴 것부터** 검사한다 — `강남구` 전에 `강남` 을 보면 `강남대로` 를 잘못 잡는다.
 * 5. `center` 는 칩을 눌렀을 때 지도가 갈 지점(역·시청 등 그룹 대표 지점)이다.
 *
 * ## 목업의 지역 칩은 전국을 타일링하지 않는다 — 이건 버그가 아니라 사실이다
 *
 * 경기 14칩(목업 -24 그대로)에 **이천시·여주시·광주시(경기)가 없다.** 그 시군의 식당은
 * `region_sido='gyeonggi'`, `region_group=NULL` 로 남아 **`경기 전체` 로만 도달한다.**
 * 이천을 `평택/오산/안성` 그룹에 밀어넣는 편법을 쓰지 않는다 — 사용자가 그 칩을 눌러
 * 이천 식당을 받으면 그건 조용한 오답이고, 버그로 보인다.
 * 서울은 25개 구가 11칩에 전부 배정되므로 `region_group IS NULL` 인 서울 식당은 없어야 한다.
 *
 * ## 동명 시도 판별: 반드시 시도 먼저
 *
 * `광주` 는 광주광역시(`gwangju`)와 경기 광주시 둘 다에 걸린다. `고성` 은 강원(고성군)과
 * 경남(고성군)에 각각 있다. 백필은 **주소의 시도 토큰을 먼저 확정한 뒤** 그룹을 찾는다.
 * 그룹부터 찾으면 틀린다. (참고: 경기 광주시는 위 사실 때문에 어느 그룹에도 없다.)
 * 창원시는 통합시라 주소에 `마산회원구`·`진해구` 가 그대로 남아 있다 — 세 값 모두
 * `gyeongnam-changwon` 이다.
 */

import type { LatLng } from "../types"

export interface RegionGroup {
  /** `<sido>-<slug>`. `<sido>-all` 은 시도 전체를 뜻하는 특수 키다. */
  key: string
  /** i18n 키. `restaurant.region.groups.<key>` */
  labelKey: string
  /** 칩 선택 시 카메라가 갈 지점. */
  center: LatLng
  /** 백필 매칭어. `<sido>-all` 은 빈 배열이다(전체를 뜻하므로 매칭 대상이 없다). */
  sigungu: readonly string[]
}

export interface RegionSido {
  key: string
  /** 기존 키를 재사용한다. 새로 만들지 않는다. */
  labelKey: string
  center: LatLng
  groups: readonly RegionGroup[]
}

/** `<sido>-all` 판별. 그룹 필터가 아니라 시도 필터로 번역해야 하는 키다. */
export const SIDO_ALL_SUFFIX = "-all"

export function isSidoAllKey(groupKey: string): boolean {
  return groupKey.endsWith(SIDO_ALL_SUFFIX)
}

/** `seoul-all` → `seoul`. 그룹 키에서 시도 키를 떼어낸다. */
export function sidoKeyOf(groupKey: string): string {
  const index = groupKey.indexOf("-")
  return index === -1 ? groupKey : groupKey.slice(0, index)
}

function group(
  key: string,
  lat: number,
  lng: number,
  sigungu: readonly string[] = [],
): RegionGroup {
  return {
    key,
    labelKey: `restaurant.region.groups.${key}`,
    center: { lat, lng },
    sigungu,
  }
}

/* ────────────────────────── 17 시·도 ────────────────────────── */

/**
 * 목업 -22/-23 의 서울 11칩. 25개 구를 전부 덮는다.
 * 목업 라벨에 없는 구(은평·강북·도봉·동대문·양천·금천)는 지리적으로 인접한 그룹에 넣었다.
 */
const SEOUL: RegionSido = {
  key: "seoul",
  labelKey: "restaurant.filter.regions.seoul",
  center: { lat: 37.5665, lng: 126.978 },
  groups: [
    group("seoul-all", 37.5665, 126.978),
    group("seoul-gangnam", 37.4979, 127.0276, ["강남구"]),
    group("seoul-seocho", 37.4837, 127.0324, ["서초구"]),
    group("seoul-jamsil", 37.5133, 127.1, ["송파구", "강동구"]),
    group("seoul-yeongdeungpo", 37.5264, 126.8963, [
      "영등포구",
      "강서구",
      "양천구",
    ]),
    group("seoul-kondae", 37.5408, 127.069, ["광진구", "성동구", "동대문구"]),
    group("seoul-jongno", 37.5704, 126.991, ["종로구", "중구"]),
    group("seoul-hongdae", 37.5563, 126.9236, ["마포구", "서대문구", "은평구"]),
    group("seoul-yongsan", 37.5326, 126.9905, ["용산구"]),
    group("seoul-seongbuk", 37.5894, 127.0167, [
      "성북구",
      "노원구",
      "중랑구",
      "강북구",
      "도봉구",
    ]),
    group("seoul-guro", 37.4955, 126.9268, [
      "구로구",
      "관악구",
      "동작구",
      "금천구",
    ]),
  ],
}

/**
 * 목업 -24 의 경기 14칩. **경기를 다 덮지 않는다** — 이천시·여주시·광주시(경기)가 없다.
 * 그 시군은 `경기 전체` 로만 도달한다(파일 헤더 참고).
 */
const GYEONGGI: RegionSido = {
  key: "gyeonggi",
  labelKey: "restaurant.filter.regions.gyeonggi",
  center: { lat: 37.4138, lng: 127.5183 },
  groups: [
    group("gyeonggi-all", 37.4138, 127.5183),
    group("gyeonggi-bundang", 37.3595, 127.1052, ["성남시"]),
    group("gyeonggi-suwon", 37.2636, 127.0286, ["수원시"]),
    group("gyeonggi-yongin", 37.2411, 127.1776, ["용인시", "화성시"]),
    group("gyeonggi-anyang", 37.3943, 126.9568, ["안양시", "과천시"]),
    group("gyeonggi-gapyeong", 37.8315, 127.5105, ["가평군", "양평군"]),
    group("gyeonggi-gunpo", 37.3617, 126.9352, ["군포시", "의왕시"]),
    group("gyeonggi-bucheon", 37.5035, 126.766, [
      "부천시",
      "안산시",
      "시흥시",
      "광명시",
    ]),
    group("gyeonggi-pyeongtaek", 36.9922, 127.1129, [
      "평택시",
      "오산시",
      "안성시",
    ]),
    group("gyeonggi-goyang", 37.6584, 126.832, ["고양시", "파주시"]),
    group("gyeonggi-gimpo", 37.6152, 126.7156, ["김포시"]),
    group("gyeonggi-namyangju", 37.636, 127.2165, ["남양주시", "의정부시"]),
    group("gyeonggi-hanam", 37.5393, 127.2148, ["하남시", "구리시"]),
    group("gyeonggi-pocheon", 37.8949, 127.2003, [
      "포천시",
      "양주시",
      "동두천시",
      "연천군",
    ]),
  ],
}

/* 아래 15개 시·도는 **목업에 세부 칩이 없다.** 근거가 없으므로 각 시도의 주요 상권 단위로
   짰다 — 광역시는 구, 도는 시 단위. 목업이 나오면 이 블록만 갈아 끼우면 된다. */

const INCHEON: RegionSido = {
  key: "incheon",
  labelKey: "restaurant.filter.regions.incheon",
  center: { lat: 37.4563, lng: 126.7052 },
  groups: [
    group("incheon-all", 37.4563, 126.7052),
    group("incheon-guwol", 37.4479, 126.701, ["남동구"]),
    group("incheon-songdo", 37.3894, 126.639, ["연수구"]),
    group("incheon-bupyeong", 37.4894, 126.7247, ["부평구", "계양구"]),
    group("incheon-juan", 37.4634, 126.6802, ["미추홀구", "중구", "동구"]),
    group("incheon-cheongna", 37.5349, 126.648, ["서구"]),
    group("incheon-ganghwa", 37.7473, 126.4878, ["강화군", "옹진군"]),
  ],
}

const BUSAN: RegionSido = {
  key: "busan",
  labelKey: "restaurant.filter.regions.busan",
  center: { lat: 35.1796, lng: 129.0756 },
  groups: [
    group("busan-all", 35.1796, 129.0756),
    group("busan-haeundae", 35.1631, 129.1636, ["해운대구"]),
    group("busan-seomyeon", 35.1578, 129.0596, ["부산진구", "연제구"]),
    group("busan-nampo", 35.0988, 129.03, ["중구", "서구", "동구", "영도구"]),
    group("busan-gwangalli", 35.1532, 129.1186, ["수영구", "남구"]),
    group("busan-dongnae", 35.2049, 129.0784, ["동래구", "금정구"]),
    group("busan-sasang", 35.1626, 128.9906, [
      "사상구",
      "북구",
      "강서구",
      "사하구",
    ]),
    group("busan-gijang", 35.2444, 129.2222, ["기장군"]),
  ],
}

const DAEGU: RegionSido = {
  key: "daegu",
  labelKey: "restaurant.filter.regions.daegu",
  center: { lat: 35.8714, lng: 128.6014 },
  groups: [
    group("daegu-all", 35.8714, 128.6014),
    group("daegu-dongseongno", 35.8693, 128.5947, ["중구"]),
    group("daegu-dongdaegu", 35.8797, 128.6286, ["동구", "수성구"]),
    group("daegu-dalseo", 35.828, 128.5327, ["달서구", "남구"]),
    group("daegu-chilgok", 35.9053, 128.5772, ["북구", "서구"]),
    group("daegu-dalseong", 35.7746, 128.4313, ["달성군", "군위군"]),
  ],
}

const GWANGJU: RegionSido = {
  key: "gwangju",
  labelKey: "restaurant.filter.regions.gwangju",
  center: { lat: 35.1595, lng: 126.8526 },
  groups: [
    group("gwangju-all", 35.1595, 126.8526),
    group("gwangju-sangmu", 35.152, 126.8896, ["서구"]),
    group("gwangju-chungjangno", 35.1478, 126.92, ["동구"]),
    group("gwangju-cheomdan", 35.1908, 126.8843, ["북구"]),
    group("gwangju-suwan", 35.166, 126.794, ["광산구"]),
    group("gwangju-jinwol", 35.1268, 126.9028, ["남구"]),
  ],
}

const DAEJEON: RegionSido = {
  key: "daejeon",
  labelKey: "restaurant.filter.regions.daejeon",
  center: { lat: 36.3504, lng: 127.3845 },
  groups: [
    group("daejeon-all", 36.3504, 127.3845),
    group("daejeon-dunsan", 36.352, 127.378, ["서구"]),
    group("daejeon-eunhaengdong", 36.3283, 127.427, ["중구"]),
    group("daejeon-yuseong", 36.362, 127.356, ["유성구"]),
    group("daejeon-daedong", 36.327, 127.454, ["동구"]),
    group("daejeon-songgang", 36.386, 127.416, ["대덕구"]),
  ],
}

const ULSAN: RegionSido = {
  key: "ulsan",
  labelKey: "restaurant.filter.regions.ulsan",
  center: { lat: 35.5384, lng: 129.3114 },
  groups: [
    group("ulsan-all", 35.5384, 129.3114),
    group("ulsan-samsan", 35.5384, 129.33, ["남구"]),
    group("ulsan-seongnam", 35.5619, 129.332, ["중구"]),
    group("ulsan-ilsan", 35.5045, 129.4166, ["동구"]),
    group("ulsan-mugeo", 35.549, 129.241, ["울주군"]),
    group("ulsan-hogye", 35.5936, 129.362, ["북구"]),
  ],
}

/** 세종은 단일 행정단위다. 하위 그룹을 만들지 않는다. */
const SEJONG: RegionSido = {
  key: "sejong",
  labelKey: "restaurant.filter.regions.sejong",
  center: { lat: 36.48, lng: 127.289 },
  groups: [group("sejong-all", 36.48, 127.289, ["세종특별자치시"])],
}

const GANGWON: RegionSido = {
  key: "gangwon",
  labelKey: "restaurant.filter.regions.gangwon",
  center: { lat: 37.8228, lng: 128.1555 },
  groups: [
    group("gangwon-all", 37.8228, 128.1555),
    group("gangwon-chuncheon", 37.8813, 127.73, ["춘천시", "홍천군"]),
    group("gangwon-wonju", 37.3422, 127.9202, ["원주시", "횡성군"]),
    group("gangwon-gangneung", 37.7519, 128.8761, [
      "강릉시",
      "동해시",
      "삼척시",
    ]),
    // `고성군` 은 경남에도 있다. 백필은 시도 토큰을 먼저 확정한 뒤 여기로 온다.
    group("gangwon-sokcho", 38.207, 128.5918, ["속초시", "양양군", "고성군"]),
    group("gangwon-pyeongchang", 37.3705, 128.39, [
      "평창군",
      "정선군",
      "영월군",
    ]),
    group("gangwon-cheorwon", 38.1466, 127.3134, [
      "철원군",
      "화천군",
      "인제군",
      "양구군",
    ]),
    group("gangwon-taebaek", 37.164, 128.9856, ["태백시"]),
  ],
}

const CHUNGBUK: RegionSido = {
  key: "chungbuk",
  labelKey: "restaurant.filter.regions.chungbuk",
  center: { lat: 36.6357, lng: 127.4914 },
  groups: [
    group("chungbuk-all", 36.6357, 127.4914),
    group("chungbuk-cheongju", 36.6424, 127.489, ["청주시"]),
    group("chungbuk-chungju", 36.991, 127.9259, ["충주시", "제천시"]),
    group("chungbuk-eumseong", 36.9403, 127.6905, ["음성군", "진천군"]),
    group("chungbuk-okcheon", 36.3062, 127.5713, [
      "옥천군",
      "영동군",
      "보은군",
    ]),
    group("chungbuk-danyang", 36.9846, 128.3654, [
      "단양군",
      "괴산군",
      "증평군",
    ]),
  ],
}

const CHUNGNAM: RegionSido = {
  key: "chungnam",
  labelKey: "restaurant.filter.regions.chungnam",
  center: { lat: 36.5184, lng: 126.8 },
  groups: [
    group("chungnam-all", 36.5184, 126.8),
    group("chungnam-cheonan", 36.8151, 127.1139, ["천안시", "아산시"]),
    group("chungnam-dangjin", 36.8894, 126.628, ["당진시", "서산시"]),
    group("chungnam-gongju", 36.4465, 127.119, ["공주시", "계룡시", "논산시"]),
    group("chungnam-boryeong", 36.3331, 126.6127, [
      "보령시",
      "태안군",
      "홍성군",
    ]),
    group("chungnam-buyeo", 36.2757, 126.9098, [
      "부여군",
      "서천군",
      "청양군",
      "금산군",
      "예산군",
    ]),
  ],
}

const JEONBUK: RegionSido = {
  key: "jeonbuk",
  labelKey: "restaurant.filter.regions.jeonbuk",
  center: { lat: 35.7175, lng: 127.153 },
  groups: [
    group("jeonbuk-all", 35.7175, 127.153),
    group("jeonbuk-jeonju", 35.8242, 127.148, ["전주시", "완주군"]),
    group("jeonbuk-gunsan", 35.9676, 126.7369, ["군산시", "익산시"]),
    group("jeonbuk-jeongeup", 35.5699, 126.8558, [
      "정읍시",
      "김제시",
      "부안군",
    ]),
    group("jeonbuk-namwon", 35.4164, 127.3905, ["남원시", "임실군", "순창군"]),
    group("jeonbuk-muju", 35.9078, 127.6608, [
      "무주군",
      "진안군",
      "장수군",
      "고창군",
    ]),
  ],
}

const JEONNAM: RegionSido = {
  key: "jeonnam",
  labelKey: "restaurant.filter.regions.jeonnam",
  center: { lat: 34.8679, lng: 126.991 },
  groups: [
    group("jeonnam-all", 34.8679, 126.991),
    group("jeonnam-yeosu", 34.7604, 127.6622, ["여수시"]),
    group("jeonnam-suncheon", 34.9506, 127.4872, ["순천시", "광양시"]),
    group("jeonnam-mokpo", 34.8118, 126.3922, ["목포시", "무안군", "신안군", "영암군"]),
    group("jeonnam-naju", 35.0158, 126.7108, ["나주시", "화순군", "담양군"]),
    group("jeonnam-haenam", 34.5735, 126.5989, [
      "해남군",
      "강진군",
      "완도군",
      "진도군",
    ]),
    group("jeonnam-boseong", 34.7715, 127.08, ["보성군", "고흥군", "장흥군"]),
    group("jeonnam-yeonggwang", 35.2772, 126.512, [
      "영광군",
      "함평군",
      "장성군",
      "구례군",
      "곡성군",
    ]),
  ],
}

const GYEONGBUK: RegionSido = {
  key: "gyeongbuk",
  labelKey: "restaurant.filter.regions.gyeongbuk",
  center: { lat: 36.4919, lng: 128.8889 },
  groups: [
    group("gyeongbuk-all", 36.4919, 128.8889),
    group("gyeongbuk-pohang", 36.019, 129.3435, ["포항시", "경주시"]),
    group("gyeongbuk-gumi", 36.1195, 128.3446, ["구미시", "김천시", "칠곡군"]),
    group("gyeongbuk-andong", 36.5684, 128.7294, [
      "안동시",
      "예천군",
      "영주시",
      "봉화군",
    ]),
    group("gyeongbuk-gyeongsan", 35.8251, 128.7411, [
      "경산시",
      "청도군",
      "영천시",
    ]),
    group("gyeongbuk-sangju", 36.4109, 128.159, ["상주시", "문경시", "의성군"]),
    group("gyeongbuk-uljin", 36.993, 129.4004, [
      "울진군",
      "영덕군",
      "청송군",
      "영양군",
      "울릉군",
    ]),
    group("gyeongbuk-goryeong", 35.7262, 128.2628, ["고령군", "성주군"]),
  ],
}

const GYEONGNAM: RegionSido = {
  key: "gyeongnam",
  labelKey: "restaurant.filter.regions.gyeongnam",
  center: { lat: 35.4606, lng: 128.2132 },
  groups: [
    group("gyeongnam-all", 35.4606, 128.2132),
    // 통합시라 주소에 `마산회원구`·`마산합포구`·`진해구` 가 남아 있다. 전부 이 그룹이다.
    group("gyeongnam-changwon", 35.228, 128.6811, [
      "창원시",
      "마산회원구",
      "마산합포구",
      "진해구",
    ]),
    group("gyeongnam-jinju", 35.18, 128.1076, ["진주시", "사천시"]),
    group("gyeongnam-gimhae", 35.2285, 128.8894, ["김해시", "양산시"]),
    // `고성군` 은 강원에도 있다 — 시도 먼저.
    group("gyeongnam-tongyeong", 34.8544, 128.4331, [
      "통영시",
      "거제시",
      "고성군",
    ]),
    group("gyeongnam-miryang", 35.5038, 128.7469, [
      "밀양시",
      "창녕군",
      "의령군",
      "함안군",
    ]),
    group("gyeongnam-geochang", 35.6866, 127.9095, [
      "거창군",
      "함양군",
      "산청군",
      "합천군",
    ]),
    group("gyeongnam-namhae", 34.8376, 127.8925, ["남해군", "하동군"]),
  ],
}

const JEJU: RegionSido = {
  key: "jeju",
  labelKey: "restaurant.filter.regions.jeju",
  center: { lat: 33.4996, lng: 126.5312 },
  groups: [
    group("jeju-all", 33.4996, 126.5312),
    group("jeju-jejusi", 33.4996, 126.5312, ["제주시"]),
    group("jeju-seogwipo", 33.2541, 126.5601, ["서귀포시"]),
    group("jeju-aewol", 33.463, 126.3096, ["애월읍", "한림읍"]),
    group("jeju-seongsan", 33.4581, 126.9268, ["성산읍", "구좌읍", "표선면"]),
  ],
}

/**
 * 17 시·도. 순서는 목업 -22 의 칩 배치(5열 wrap) 그대로다.
 * 목업에 `울산` 이 두 번 나오는데 그건 시안의 실수이므로 여기서는 한 번만 둔다.
 */
export const REGION_CATALOG: readonly RegionSido[] = [
  SEOUL,
  GYEONGGI,
  INCHEON,
  BUSAN,
  ULSAN,
  JEJU,
  GYEONGNAM,
  DAEGU,
  SEJONG,
  GYEONGBUK,
  GANGWON,
  CHUNGNAM,
  DAEJEON,
  CHUNGBUK,
  JEONNAM,
  GWANGJU,
  JEONBUK,
] as const

/* ────────────────────────── 조회 헬퍼 ────────────────────────── */

/** 그룹 키 → 그룹. 한 번만 만들어 두고 재사용한다(칩 렌더마다 17×8 순회를 하지 않게). */
const GROUP_INDEX: ReadonlyMap<string, RegionGroup> = new Map(
  REGION_CATALOG.flatMap((sido) =>
    sido.groups.map((item) => [item.key, item] as const),
  ),
)

const SIDO_INDEX: ReadonlyMap<string, RegionSido> = new Map(
  REGION_CATALOG.map((sido) => [sido.key, sido] as const),
)

/** 필터 시트 1단(광역) 칩 목록. */
export function sidoList(): readonly RegionSido[] {
  return REGION_CATALOG
}

/** 필터 시트 2단(세부) 칩 목록. 모르는 시도 키면 빈 배열 — 화면이 섹션을 감춘다. */
export function groupsFor(sidoKey: string | null): readonly RegionGroup[] {
  if (!sidoKey) return []
  return SIDO_INDEX.get(sidoKey)?.groups ?? []
}

/** 칩을 눌렀을 때 카메라가 갈 지점. 시도 키를 넣어도 동작한다. */
export function centerFor(key: string): LatLng | null {
  return GROUP_INDEX.get(key)?.center ?? SIDO_INDEX.get(key)?.center ?? null
}

/** 칩 라벨의 i18n 키. 시도 키를 넣어도 동작한다. */
export function labelKeyFor(key: string): string | null {
  return GROUP_INDEX.get(key)?.labelKey ?? SIDO_INDEX.get(key)?.labelKey ?? null
}

/* ──────────────────── 밖에서 들어온 키 검증 ────────────────────
 *
 * 서버 응답(`POST /ai-search`)과 딥링크 쿼리는 **우리가 쓴 값이 아니다.** 그 두 곳에서
 * 들어온 키를 그대로 `FilterState` 에 넣으면 이 기능을 망가뜨렸던 그 사고가 그대로 재현된다:
 * 모르는 키는 서버에서 0건으로 돌아오고, 칩은 i18n 을 못 찾아 `restaurant.region.groups.강남`
 * 이라는 **키 문자열 자체**를 화면에 그린다. 둘 다 사용자에게 설명할 수 없는 화면이다.
 *
 * `labelKeyFor() !== null` 로 걸러서는 안 된다 — 그 함수는 라벨 조회용이라 시도 키와
 * `<sido>-all` 까지 통과시킨다. 즉 `regionGroups=seoul` 과 `regionGroups=seoul-all` 이
 * **그룹 필터로** 서버에 나가고, 서버는 `-all` 을 `region_group` 에 저장하지 않으므로
 * (카탈로그 규칙 3) 조용히 0건이 된다. 축마다 정확한 술어가 따로 필요하다.
 *
 * 이름과 의미는 백엔드 `regionCatalog.ts` 의 `isRegionGroupKey` / `isRegionSidoKey` 와
 * 같게 맞췄다. 두 쪽이 같은 질문에 같은 답을 해야 계약이 성립한다.
 */

/** 실제 그룹 키(`region_group` 에 저장되는 값)인가. `<sido>-all` 과 시도 키는 **거짓**이다. */
export function isRegionGroupKey(key: string): boolean {
  return !isSidoAllKey(key) && GROUP_INDEX.has(key)
}

/** 17개 시도 키 중 하나인가. `regionSidos` 축에 넣을 수 있는 값인지의 판정이다. */
export function isRegionSidoKey(key: string): boolean {
  return SIDO_INDEX.has(key)
}

/**
 * `seoul-all` → `seoul`. **정확히** `<알려진 시도 키>-all` 일 때만 답하고, 아니면 null 이다.
 *
 * `sidoKeyOf` 를 쓰면 안 되는 자리다. 그 함수는 **첫 하이픈에서 자르기** 때문에
 * `seoul-typo-all` 을 `seoul` 로 만들어 **없는 칩을 서울 전체 필터로 바꿔 버린다.**
 * 서버는 모르는 시도 키를 무시하므로 결과는 "필터가 안 걸린 전체 목록" 이 되고, 사용자는
 * 필터가 걸렸다고 믿는다 — 0건보다 나쁜 조용한 오답이다. 카탈로그 규칙은 **추측하지 않는다**
 * 이고, 백엔드 `sidoForGroup` 도 같은 이유로 하이픈을 자르지 않는다.
 */
export function sidoKeyOfAllKey(key: string): string | null {
  if (!isSidoAllKey(key)) return null
  const sidoKey = key.slice(0, key.length - SIDO_ALL_SUFFIX.length)
  return SIDO_INDEX.has(sidoKey) ? sidoKey : null
}
