/**
 * **앱이 이 API 가 없는 백엔드를 보고 있다** 를 응답만 보고 알아채는 판정.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 실제로 난 사고 (2026-07-31)
 *
 * 식당 탭 전체가 죽어 있었고 화면에는 스켈레톤과 빨간 콘솔 박스만 있었다. 응답은 이랬다.
 *
 *     GET /api/v1/restaurants/search  →  400 COMMON_ERROR_001
 *     [{"field":"path.restaurant_id","rejectedValue":null,
 *       "type":"int_parsing","reason":"Input should be a valid integer…"}]
 *
 * 읽어야 할 것은 이 한 가지다: **`/restaurants/search` 라우트가 그 서버에 없어서
 * `/restaurants/{restaurant_id}` 로 떨어졌고, `"search"` 를 정수로 읽으려다 실패했다.**
 * 앱은 파이썬 백엔드(:8000)를 보고 있었고 v2 식당 API 는 bun 백엔드(:8100)에만 있었다.
 *
 * 그런데 앱이 화면에 띄운 것은 "잘못된 요청" 뿐이었다. 즉 **원인이 화면에도, 로그에도,
 * 어디에도 이름으로 적히지 않았다** — 사람이 400 본문을 눈으로 읽고 라우트 매칭 규칙을
 * 추론해야 알 수 있었다. 그동안 이 탭은 "만들었는데 안 되는 기능" 으로 남아 있었다.
 *
 * ■ 왜 이 판정이 확실한가
 *
 * 컬렉션 경로(`/restaurants/search`, `/recipes/home` …)를 불렀는데 서버가 **경로 파라미터**
 * (`path.*`)를 정수로 읽으려다 실패했다면, 그건 우리가 보낸 값이 잘못된 것이 아니다.
 * 우리는 애초에 그 파라미터를 보낸 적이 없다. 정적 세그먼트가 동적 세그먼트로 흡수됐다는
 * 뜻이고 — 원인은 하나뿐이다: **그 라우트가 그 서버에 없다.**
 *
 * 그래서 이건 "환경 설정 오류" 로 이름 붙일 수 있는 유일한 400 이고, 개발자에게 그렇게
 * 말해 줘야 한다. 사용자에게 보이는 문구는 바꾸지 않는다(그들이 할 수 있는 일이 없다).
 *
 * ■ 순수 함수인 이유
 *
 * 판정이 훅·인터셉터 안에 있으면 검증할 수 없고, 이 오류는 **환경에서만** 재현된다.
 * 여기 있으면 400 본문 한 조각으로 테스트가 가능하다.
 */

/** 서버가 준 `fieldErrors` 한 칸. 이름만 맞으면 되므로 최소로 받는다. */
interface FieldErrorLike {
  field?: unknown
  type?: unknown
}

function asFieldErrors(value: unknown): FieldErrorLike[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is FieldErrorLike => item !== null && typeof item === "object",
  )
}

/**
 * 이 400 이 **"이 서버에는 그 라우트가 없다"** 인가.
 *
 * 조건 셋을 모두 만족해야 한다:
 *   1. 상태 400
 *   2. 실패한 필드가 **경로 파라미터**(`path.` 로 시작)
 *   3. 정수 파싱 실패(`int_parsing`) — 정적 세그먼트가 `{id}` 로 흡수됐다는 지문
 *
 * 하나라도 어긋나면 `false` 다. 진짜 잘못된 요청(뒤집힌 bbox, 없는 필터 키)을 환경 문제로
 * 오진하면, 이 판정은 앞 판본이 저지른 실수(400 을 전부 "인터넷 확인" 으로 뭉갠 것)를
 * 방향만 바꿔 되풀이하는 셈이 된다.
 */
export function isMisroutedCollectionRequest(input: {
  statusCode?: number
  fieldErrors?: unknown
}): boolean {
  if (input.statusCode !== 400) return false
  return asFieldErrors(input.fieldErrors).some((item) => {
    const field = typeof item.field === "string" ? item.field : ""
    const type = typeof item.type === "string" ? item.type : ""
    return field.startsWith("path.") && type === "int_parsing"
  })
}

/**
 * 개발자에게 남길 한 줄. **사용자 문구가 아니다** — 콘솔·크래시 리포트용이다.
 *
 * `endpoint` 를 그대로 넣는 이유: 어느 API 가 없는지가 곧 어느 백엔드를 보고 있는지의
 * 단서다(식당 v2 가 없다 = 파이썬을 보고 있다).
 */
export function backendMismatchMessage(endpoint: string): string {
  return (
    `[env] ${endpoint} 라우트가 지금 백엔드에 없습니다 — ` +
    `정적 경로가 \`/{id}\` 로 흡수돼 400(int_parsing)이 났습니다. ` +
    `EXPO_PUBLIC_BACKEND_URL 이 이 API 를 가진 서버를 가리키는지 확인하세요.`
  )
}
