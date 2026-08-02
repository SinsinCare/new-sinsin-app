#!/usr/bin/env node
/**
 * 식당 지도 API 의 **실제 응답**을 받아 `tests/fixtures/restaurant/` 에 박아 넣는다.
 *
 * ## 왜 이 스크립트가 있나 — 사고 보고서
 *
 * 앱과 백엔드를 같은 문서(`BUILD_CONTRACT`)를 보고 **병렬로** 만들었고 그 사이에 필드
 * 이름이 갈렸다. 앱의 DTO 는 손으로 쓴 `interface` 였고 서비스가 응답을 `as SomeDto` 로
 * 단정했기 때문에 **타입스크립트가 한 건도 잡지 못했다.** `npx tsc --noEmit` 은 깨끗한데
 * 런타임에는 모든 값이 `undefined` 였고, 화면은 이렇게 죽었다:
 *
 *     RestaurantCard.tsx:106  Cannot read property 'slice' of undefined
 *
 * 문서는 두 쪽 다 만족시키면서 서로 다르게 읽힐 수 있다. **응답은 그럴 수 없다.**
 * 그래서 계약의 정본을 문서가 아니라 여기서 받아 온 payload 로 옮겼다.
 *
 * ## 왜 "살아 있는 서버를 때리는 테스트" 가 아니라 고정된 fixture 인가
 *
 * 스모크 스크립트로 만들면 서버가 떠 있어야만 돌고, CI 나 다른 사람의 노트북에서는
 * 조용히 건너뛰어진다. **건너뛰어지는 검사는 없는 검사다** — 이 사고가 정확히 그렇게
 * 오래 살아남았다. 그래서 응답을 파일로 커밋하고, 테스트는 서버 없이 항상 돈다.
 *
 * 고정 fixture 의 유일한 약점은 "서버가 바뀌었는데 아무도 재생성하지 않는 것"이다.
 * 그 비용을 한 줄로 낮추는 것이 이 스크립트의 목적이다.
 *
 * ## 쓰는 법
 *
 *     # 1) 백엔드를 띄운다 (기본 :8100)
 *     # 2) 토큰을 받고 재생성한다
 *     node scripts/capture-restaurant-fixtures.mjs
 *
 * 환경변수로 바꿀 수 있다:
 *     API_BASE=http://localhost:8100/api/v1   # 백엔드 주소
 *     LOGIN_EMAIL / LOGIN_PASSWORD            # 없으면 tests/.env.test 의 값을 읽는다
 *     FIXTURE_RESTAURANT_ID=317               # 상세 5면을 뜰 식당 (메뉴·사진·후기가 다 있는 곳)
 *
 * 재생성한 뒤에는 **반드시** `npx jest tests/restaurantApiContract.test.ts` 를 돌린다.
 * 거기서 실패가 나면 서버가 계약을 바꿨다는 뜻이고, 그때 고쳐야 하는 것은 테스트가 아니라
 * `src/features/restaurant/types/index.ts` 다(그리고 그 타입을 읽는 화면들).
 *
 * ## 부작용을 남기지 않는다
 *
 * `/bookmarks` 는 저장된 행이 없으면 `items: []` 를 준다. **빈 배열은 fixture 로 쓸모가
 * 없다** — 이번 사고에서 가장 늦게 발견된 것이 "북마크 카드는 검색 카드와 아예 다른
 * 모양"이라는 사실이었고, 빈 배열은 그걸 증명하지 못한다. 그래서 이 스크립트는 북마크를
 * 하나 켜서 응답을 받고 **원래 상태로 되돌린다**(원래 켜져 있었으면 켜 둔 채로 둔다).
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, "..")
const OUT_DIR = resolve(REPO, "tests/fixtures/restaurant")

const API_BASE = process.env.API_BASE ?? "http://localhost:8100/api/v1"
const RESTAURANT_ID = Number(process.env.FIXTURE_RESTAURANT_ID ?? 317)

/** `tests/.env.test` 는 gitignore 대상이라 값을 여기 적지 않고 읽기만 한다. */
function credentialsFromEnvFile() {
  try {
    const text = readFileSync(resolve(REPO, "tests/.env.test"), "utf8")
    const pick = (key) =>
      text.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim()
    return { email: pick("TEST_EMAIL"), password: pick("TEST_PASSWORD") }
  } catch {
    return {}
  }
}

async function login() {
  const fromFile = credentialsFromEnvFile()
  const email = process.env.LOGIN_EMAIL ?? fromFile.email
  const password = process.env.LOGIN_PASSWORD ?? fromFile.password
  if (!email || !password) {
    throw new Error(
      "로그인 정보가 없습니다. LOGIN_EMAIL/LOGIN_PASSWORD 를 주거나 tests/.env.test 를 두세요.",
    )
  }
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  const body = await response.json()
  const token = body?.result?.accessToken
  if (!token)
    throw new Error(`로그인 실패: ${JSON.stringify(body).slice(0, 200)}`)
  return token
}

/**
 * 봉투(`{isSuccess, code, result}`)를 벗겨 `result` 만 돌려준다.
 *
 * fixture 에 봉투를 함께 저장하지 않는 이유: 앱의 `apiClient` 가 이미 벗겨서 서비스에
 * 넘기므로, 서비스가 실제로 보는 값은 `result` 다. 봉투까지 넣으면 테스트가 앱이 절대
 * 보지 않는 층을 검사하게 된다.
 */
async function get(token, path) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await response.json()
  if (!response.ok || body?.isSuccess === false) {
    throw new Error(
      `GET ${path} 실패 (${response.status}): ${body?.code ?? ""} ${body?.message ?? ""}`,
    )
  }
  return body.result
}

async function mutate(token, method, path) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await response.json()
  if (!response.ok || body?.isSuccess === false) {
    throw new Error(
      `${method} ${path} 실패 (${response.status}): ${body?.code ?? ""}`,
    )
  }
  return body.result
}

function write(name, value) {
  const file = resolve(OUT_DIR, `${name}.json`)
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8")
  console.log(`  ✓ ${name}.json`)
}

async function run() {
  mkdirSync(OUT_DIR, { recursive: true })
  const token = await login()
  const id = RESTAURANT_ID
  console.log(`캡처 중: ${API_BASE} (restaurant ${id})`)

  /*
   * 지도는 **두 모드를 다 떠야 한다.** 서버가 줌으로 MARKER/CLUSTER 를 가르는데
   * 한쪽만 저장하면 반대쪽 배열이 빈 채로 굳어 "클러스터 키가 사라졌다" 같은 드리프트를
   * 못 잡는다. 줌 3 = 마커, 줌 9 = 클러스터(서버 mapParams 의 경계 기준).
   */
  write(
    "map.marker",
    await get(
      token,
      "/restaurants/map?swLat=37.49&swLng=127.02&neLat=37.51&neLng=127.04&zoom=3",
    ),
  )
  write(
    "map.cluster",
    await get(
      token,
      "/restaurants/map?swLat=37.4&swLng=126.9&neLat=37.6&neLng=127.2&zoom=9",
    ),
  )
  write("search", await get(token, "/restaurants/search?limit=3"))
  write("regions", await get(token, "/restaurants/regions"))

  /*
   * 자동완성은 **세 종류(REGION/RESTAURANT/MENU)가 한 응답에 다 들어가는 질의**로 뜬다.
   * 서버는 해당 없는 필드의 키를 `null` 로 채우지 않고 **지운다**. MENU 제안에는
   * `lat`/`lng`/`restaurantId` 가 아예 없고, 앱이 그걸 `| null` 로 알고 있었기 때문에
   * `item.lat !== null` 이 `undefined !== null` → true 로 통과해 지도 카메라가
   * `lat: undefined` 로 움직였다. 그 사고를 fixture 가 증명할 수 있게 셋을 다 담는다.
   */
  const suggestRegion = await get(
    token,
    `/restaurants/search/suggest?q=${encodeURIComponent("강남")}`,
  )
  const suggestMenu = await get(
    token,
    `/restaurants/search/suggest?q=${encodeURIComponent("비빔밥")}`,
  )
  write("search.suggest", {
    suggestions: [...suggestRegion.suggestions, ...suggestMenu.suggestions],
  })

  /*
   * 북마크: 빈 목록은 fixture 로 쓸모가 없다(헤더 참고). 켜고 → 뜨고 → 되돌린다.
   * 원래 켜져 있었다면 끄지 않는다.
   */
  const before = await get(token, "/restaurants/bookmarks?limit=50")
  const alreadySaved = before.items.some((item) => item.restaurantId === id)
  const toggled = await mutate(token, "PUT", `/restaurants/${id}/bookmark`)
  write("bookmark.toggle", toggled)
  write("bookmarks", await get(token, "/restaurants/bookmarks?limit=3"))
  if (!alreadySaved)
    await mutate(token, "DELETE", `/restaurants/${id}/bookmark`)

  write("detail", await get(token, `/restaurants/${id}`))
  write("menus", await get(token, `/restaurants/${id}/menus`))
  write("photos", await get(token, `/restaurants/${id}/photos`))
  write("reviews", await get(token, `/restaurants/${id}/reviews`))
  write("hours", await get(token, `/restaurants/${id}/hours`))

  /*
   * E13 작성자 프로필. 시드 데이터의 `restaurant_review.user_id` 가 전부 NULL 이라
   * 후기에서 이 화면으로 갈 수 없지만(=화면은 도달 불가), **응답 모양은 검사할 수 있다.**
   * 도달 불가라고 계약을 안 지켜도 되는 것은 아니다.
   */
  write("reviewer", await get(token, "/restaurants/reviewers/1"))

  console.log(
    `\n완료. 이제 반드시 실행: npx jest tests/restaurantApiContract.test.ts`,
  )
}

run().catch((error) => {
  console.error(`\n실패: ${error.message}`)
  process.exit(1)
})
