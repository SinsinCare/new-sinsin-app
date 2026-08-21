export const NUTRITION_TAGS = [
  "저염",
  "저단백",
  "저칼륨",
  "저인",
  "고열량",
] as const

/**
 * 작성자의 신장 상태에서 나오는 태그. **사용자가 고르는 목록이 아니다** —
 * 프로필에서 파생된다(`write/authorContextTags.ts`). 여기 있는 값만 나올 수 있다.
 * `StageTag` 로 그 약속을 타입이 강제한다(`AuthorContextTag["value"]`).
 *
 * 투석은 병기와 다른 축이라 병기 자리에 넣을 수 없었는데, 투석 환자야말로 제한이
 * 가장 센 집단이라 태그가 없으면 검색에서 통째로 빠진다.
 *
 * ## 왜 `투석` 이 아니라 `투석환자` 인가
 * 서버 정본이 `투석환자` 다. `sinsin-be-bun/src/domains/recipe/locale.generated.ts`:
 *
 *     export const TAG_KO_BY_INPUT: Readonly<Record<string, string>> = {
 *       ...
 *       "dialysis": "투석환자",
 *
 * 카탈로그 레시피는 저 표를 거쳐 `투석환자` 로 저장된다. 사용자 레시피만 `투석` 로
 * 저장하면 **`투석환자` 로 거르는 화면에서 통째로 빠졌다** — `%투석환자%` 는
 * `투석` 에 걸리지 않는다.
 *
 * 반대로 넓은 쪽(`투석환자`)에 맞추면 잃는 것이 없다. 태그 질의가 부분일치이기
 * 때문이다. `sinsin-be-bun/src/domains/recipe/repository.ts`:
 *
 *     and.push({ tags: { contains: tag.replace(/^#+/, ""), mode: "insensitive" } });
 *
 * 즉 `투석` 으로 검색·필터해도 `%투석%` 이라 `투석환자` 가 그대로 걸린다.
 * **양쪽을 다 만족시키는 방향이 하나뿐이라 이쪽으로 정했다.**
 *
 * 카드 표시에서 걸러지는 성질도 그대로다 — `displayTags()` 가
 * `CLINICAL_TAG_TOKENS.some((token) => folded.includes(token))` 로 거르고 그 표에
 * `"투석"` 이 있어서 `투석환자` 도 부분일치로 걸린다. 즉 검색에만 쓰이는 다른
 * 태그들과 같은 취급을 받는다.
 */
/*
  ## 왜 `CKD 3기` 가 아니라 `CKD3` 인가 (2026-08-21)

  같은 이유가 병기에도 있었는데 더 컸다. 개발 DB 실측:

      #저염식   168행 (전부 카탈로그)
      #CKD3     154행 (전부 카탈로그)
      #투석환자  17행 (전부 카탈로그)

  카탈로그 175건은 병기를 **`#CKD3`** 로 저장한다. 앱이 `CKD 3기` 를 쓰면
  `%CKD3%` 도 `%CKD 3기%` 도 서로를 못 잡는다(공백과 `기` 때문이다) — 즉 병기로
  거르는 화면이 생기는 날 **카탈로그 154건과 사용자 레시피가 영영 만나지 못한다.**

  지금 고치는 이유: 병기 태그를 실은 사용자 레시피가 **0행이다**(위 표의
  `user_rows` 가 전부 0). 나중에 고치면 데이터 마이그레이션이 된다.

  `#` 은 붙이지 않는다. 서버가 질의에서 `replace(/^#+/, "")` 로 떼고, 부분일치라
  `CKD3` 가 `#CKD3` 에 그대로 걸린다. 음식 종류도 앱은 `한식`, 카탈로그는 `#한식`
  로 이미 그렇게 만나고 있다.

  **화면 문구는 이 값과 무관하다** — `authorContextTags.ts` 의 `labelKey` 가
  `category.stage.*` 로케일을 타므로 사용자는 계속 "CKD 3기" 로 본다.
  값은 와이어, 문구는 로케일. 두 축을 섞지 말 것.

  `당뇨 동반`·`고혈압 동반` 은 서버 정본도 카탈로그 전례도 없는 앱 전용 어휘라
  그대로 둔다(맞출 대상이 없다).
*/
export const STAGE_TAGS = [
  "투석환자",
  "CKD3",
  "CKD4",
  "CKD5",
  "당뇨 동반",
  "고혈압 동반",
] as const

export const CUISINE_TAGS = [
  "한식",
  "중식",
  "일식",
  "양식",
  "샐러드",
  "디저트",
  "음료",
] as const

export type NutritionTag = (typeof NUTRITION_TAGS)[number]
export type StageTag = (typeof STAGE_TAGS)[number]
export type CuisineTag = (typeof CUISINE_TAGS)[number]
