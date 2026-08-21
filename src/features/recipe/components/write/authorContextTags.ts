/**
 * 작성자의 신장 프로필 → 이 레시피에 붙일 태그.
 *
 * ## 왜 칩 다섯 개를 이 한 줄로 바꿨는가
 * 예전에는 `신장질환 병기` 칩 레일에서 작성자가 직접 골랐다. 두 가지가 잘못돼 있었다.
 *
 * 1. **앱이 이미 아는 것을 다시 물었다.** `ckdStage`·`isDialysis`·`comorbidities` 는
 *    프로필에 다 있다. 다섯 칩을 훑어 고르는 비용을 사용자가 두 번 낸 셈이다.
 * 2. **작성자가 할 수 없는 판단을 요구했다.** 칩의 뜻은 "이 레시피는 CKD 4기에
 *    **적합하다**" 인데, 그건 임상 판단이다. 환자가 자기 레시피를 두고 그 판정을
 *    내릴 수는 없다.
 *
 * 그렇다고 프로필 값을 **그대로 칩에 채워 넣으면 더 나쁘다.** 프로필의 뜻은
 * "작성자가 CKD 4기**다**" 이고, 그것을 "이 레시피가 CKD 4기에 적합하다" 로 옮기는
 * 것은 무관한 사실에서 임상 주장을 만들어 내는 일이다. 서버가
 * `CLINICAL_TAG_TOKENS` + `displayTags()` 로 검수 전 레시피의 임상 딱지를 걸러 내는
 * 것과 정확히 반대 방향이다.
 *
 * 그래서 **값의 출처가 아니라 질문을 바꿨다.** 화면은 이제 한 줄로 묻는다 —
 * "내 기준(CKD 3기 · 고혈압 동반)으로 적었어요". 작성자가 **보증할 수 있는 사실**만
 * 말하고, 검색 신호는 그대로 유지된다 — 태그는 예전과 똑같이 서버로 가고
 * `sinsin-be-bun` 의 `domains/recipe/locale.ts::tagsForQuery` 가 그대로 받는다
 * (이 이름은 앱이 아니라 **서버 쪽** 심볼이다)
 *
 * ## 왜 문자열 하나가 아니라 `{ value, labelKey }` 인가
 * 예전에는 한국어 태그 문자열 배열만 돌려줬고, 화면이 그걸 `join(" · ")` 해서 문장에
 * 그대로 끼워 넣었다. **en 로케일에서 문장 한가운데 한국어가 박혔다** —
 * `Written for my own needs (CKD 5기 · 당뇨 동반)`.
 *
 * 원인은 한 문자열에 서로 다른 두 일을 시킨 것이다. 태그 **값**은 서버 검색 어휘라
 * 번역하면 안 되고(번역해서 보내면 그 레시피가 검색에서 빠진다), 화면 **문구**는
 * 번역해야 한다. 그래서 둘로 쪼갰다.
 *  - `value`    — 서버로 보내는 태그. 한국어 정본이고 절대 번역하지 않는다.
 *  - `labelKey` — 화면이 `t()` 로 그리는 열쇠(`category.stage.*`).
 *
 * `labelKey` 를 리터럴 유니온으로 못 박은 이유는 `writeCopy.ts::WriteChipOption` 과
 * 같다 — `string` 이면 오타 난 열쇠가 컴파일을 통과하고, 화면에는 문구 대신
 * `category.stage.ckd6` 같은 열쇠가 그대로 뜬다.
 *
 * ## 3A·3B 가 한 칸으로 합쳐지는 것에 대하여
 * 프로필은 3A 와 3B 를 구분한다(`ckdStage.ts` 머리말: 둘을 뭉개서 칼륨·인 제한이
 * 조용히 완화된 사고가 있었다). 레시피 태그 어휘에는 `CKD3` 하나뿐이라 여기서
 * 합쳐진다. **이건 제한값이 아니라 검색 버킷이므로 합쳐도 환자가 다치지 않는다** —
 * 다만 우연이 아니라 의도라는 것을 여기 적어 둔다. 어휘가 3a/3b 로 갈리는 날
 * 이 표만 고치면 된다.
 *
 * ## 태그를 만들지 않는 축
 * - **CKD 1·2기**: 어휘에 없고 식이제한도 사실상 없다. 태그를 만들지 않는다.
 * - **병기를 모를 때**(`hydrateStage` 가 `undefined`): 모르는 것은 모르는 채로 둔다.
 *   투석 중이면 `ckd_stage` 컬럼이 `"DIALYSIS"` 로 들어가 있어 여기 걸리는데,
 *   그 경우는 아래 투석 축이 대신 답한다.
 */

import type { StageTag } from "@/src/features/recipe/data/recipeTags"
import { hydrateStage } from "@/src/features/settings/utils/ckdStage"

/** 이 함수가 프로필에서 실제로 읽는 것. `KidneyProfile` 전체를 받지 않는다. */
export interface AuthorKidneyContext {
  ckdStage: string | null | undefined
  isDialysis: boolean
  /** 동반 질환 축(`DIABETES`·`HYPERTENSION`…). 위 표 머리말의 두 축 설명 참고. */
  comorbidities?: readonly string[] | null
  /** 진단 원인 축(`DIABETIC_KIDNEY_DISEASE`…). 같은 사실을 다른 어휘로 말한다. */
  diagnosisCauses?: readonly string[] | null
}

/**
 * 태그 하나 = 서버에 보낼 값 + 화면에 쓸 문구 열쇠.
 *
 * `value` 가 `string` 이 아니라 `StageTag` 인 것이 이 파일의 유일한 강제 장치다.
 * "새 어휘를 지어내지 않는다" 는 오래 주석으로만 있었고, `STAGE_TAGS` 를 읽는
 * 프로덕션 코드가 하나도 없어서 실제로는 아무것도 막지 못했다. 이제 표에 어휘 밖
 * 문자열을 적으면 그 자리에서 컴파일이 깨진다.
 */
export interface AuthorContextTag {
  value: StageTag
  labelKey:
    | "category.stage.ckd3"
    | "category.stage.ckd4"
    | "category.stage.ckd5"
    | "category.stage.dialysis"
    | "category.stage.diabetes"
    | "category.stage.hypertension"
}

/**
 * 투석 축. 병기와 **다른 축**이라 병기 표에 넣을 수 없다(`kidney-status-three-axes`).
 *
 * 값이 `투석` 이 아니라 `투석환자` 인 근거는 `recipeTags.ts::STAGE_TAGS` 머리말에
 * 있다 — 요약하면 서버 정본이 `투석환자` 이고, 태그 질의가 부분일치라 넓은 쪽으로
 * 맞춰도 `투석` 검색을 잃지 않는다.
 */
const DIALYSIS_TAG: AuthorContextTag = {
  value: "투석환자",
  labelKey: "category.stage.dialysis",
}

/** 정본 병기 키 → 레시피 태그. 여기 없는 키(1·2기)는 태그를 만들지 않는다. */
const STAGE_TO_TAG: Readonly<Record<string, AuthorContextTag>> = {
  STAGE_3A: { value: "CKD3", labelKey: "category.stage.ckd3" },
  STAGE_3B: { value: "CKD3", labelKey: "category.stage.ckd3" },
  STAGE_4: { value: "CKD4", labelKey: "category.stage.ckd4" },
  STAGE_5: { value: "CKD5", labelKey: "category.stage.ckd5" },
}

/**
 * 질환 키 → 레시피 태그.
 *
 * ## 축이 둘이다 — 하나만 보면 당뇨가 통째로 빠진다
 * 프로필에는 서로 다른 어휘를 쓰는 두 배열이 있다.
 *
 *   동반 질환 `comorbidities`   : `DIABETES` · `HYPERTENSION` · `HEART_DISEASE` …
 *                                 (`settings/views/KidneyProfileEditScreen.tsx` 의 `COMORBIDITY_OPTIONS`)
 *   진단 원인 `diagnosisCauses` : `DIABETIC_KIDNEY_DISEASE` · `HYPERTENSION` …
 *                                 (`settings/data/constants.ts` 의 `DIAGNOSIS_CAUSE_OPTIONS`)
 *
 * 처음에는 이 표를 `DIABETIC_KIDNEY_DISEASE` 로 잠가 놓고 `comorbidities` 만 읽었다.
 * 그 키는 **저 배열에 절대 안 들어오는 값**이라 당뇨를 등록한 사람에게도 `당뇨 동반` 이
 * 한 번도 안 붙었다. 고혈압만 동작한 것은 두 목록에 같은 문자열이 있어서 생긴 우연이다.
 *
 * 그래서 **두 축을 다 읽는다.** 당뇨병성 신장질환이면 당뇨가 있고(좁은 것 → 넓은 것),
 * 동반 질환에 당뇨를 체크했어도 당뇨가 있다. 어느 쪽이든 사실이므로 둘 다 받는다.
 * 반대 방향(당뇨 → 당뇨병성 신장질환)은 참이 아니라서 하지 않는다.
 */
const COMORBIDITY_TO_TAG: Readonly<Record<string, AuthorContextTag>> = {
  DIABETES: {
    value: "당뇨 동반",
    labelKey: "category.stage.diabetes",
  },
  // 진단 원인 축의 표기. 같은 사실을 다른 어휘로 말한 것이라 같은 태그로 모은다.
  DIABETIC_KIDNEY_DISEASE: {
    value: "당뇨 동반",
    labelKey: "category.stage.diabetes",
  },
  HYPERTENSION: {
    value: "고혈압 동반",
    labelKey: "category.stage.hypertension",
  },
}

/**
 * 프로필에서 붙일 수 있는 태그를 뽑는다.
 *
 * 순서는 고정이다(투석 → 병기 → 동반 질환). 화면이 이 배열을 그대로 문구로 잇기
 * 때문에, 순서가 흔들리면 같은 사용자에게 매번 다른 문장이 보인다.
 *
 * **빈 배열이면 화면은 그 줄을 아예 그리지 않는다.** 붙일 것이 없는데 "내 기준으로
 * 적었어요" 를 띄우면, 켜도 아무 일이 일어나지 않는 컨트롤이 된다.
 */
export function deriveAuthorContextTags(
  context: AuthorKidneyContext | null | undefined,
): AuthorContextTag[] {
  if (!context) return []
  const tags: AuthorContextTag[] = []

  /*
    같은 값이 두 축에서 나올 수 있다고 보고 막는다(3A·3B 가 한 태그로 합쳐지듯,
    표가 늘면 겹치는 칸이 생긴다). **`value` 로만 판정한다** — 같은 값에 다른
    문구 열쇠가 붙는 일은 표의 버그이지 두 개의 태그가 아니다.
  */
  const push = (tag: AuthorContextTag) => {
    if (!tags.some((existing) => existing.value === tag.value)) tags.push(tag)
  }

  // 투석 중이면 병기 컬럼이 비거나 `"DIALYSIS"` 라 병기 쪽에서는 아무것도 안 나온다.
  if (context.isDialysis) push(DIALYSIS_TAG)

  const stage = hydrateStage(context.ckdStage)
  const stageTag = stage == null ? undefined : STAGE_TO_TAG[stage]
  if (stageTag !== undefined) push(stageTag)

  /*
    **표를 훑는다. 프로필 배열을 훑지 않는다.** 서버가 준 `comorbidities` 의 순서는
    보장된 것이 아니라서, 그 순서대로 이으면 같은 사람에게도 새로고침마다
    "당뇨 동반 · 고혈압 동반" 과 "고혈압 동반 · 당뇨 동반" 이 번갈아 보인다.
    문장이 흔들리면 사용자는 값이 바뀐 줄 안다.
  */
  const owned = new Set(
    [...(context.comorbidities ?? []), ...(context.diagnosisCauses ?? [])].map(
      (key) => String(key).trim().toUpperCase(),
    ),
  )
  for (const [key, tag] of Object.entries(COMORBIDITY_TO_TAG)) {
    if (owned.has(key)) push(tag)
  }

  return tags
}
