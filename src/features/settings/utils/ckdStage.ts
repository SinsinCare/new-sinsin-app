/**
 * CKD 단계 선택 UI 의 왕복 규칙.
 *
 * 예전에는 편집 화면이 `parseInt(ckdStage.replace(/\D/g, ""))` 로 하이드레이트해
 * `STAGE_3B` → `3` 이 됐고, 저장 맵에 3B 항목이 없어 `3` → `STAGE_3A` 로 굳었다.
 * 3B 환자가 프로필을 열었다 저장만 해도 칼륨 2500→3000, 인 900→1000 으로
 * **제한이 조용히 완화됐다.**
 *
 * 순수 로직이라 .ts 로 분리했다. .tsx 에 두면 이걸 검증하려는 테스트가
 * react-native 모듈 그래프를 통째로 끌고 와서 jest(node 환경)에서 파싱이 깨진다.
 *
 * key 는 백엔드 app/core/ckd_limits.py 의 정본 키와 같아야 한다.
 */

export interface StageOption {
  key: string
  label: string
}

export const STAGE_OPTIONS: readonly StageOption[] = [
  { key: "STAGE_1", label: "1기" },
  { key: "STAGE_2", label: "2기" },
  { key: "STAGE_3A", label: "3a기" },
  { key: "STAGE_3B", label: "3b기" },
  { key: "STAGE_4", label: "4기" },
  { key: "STAGE_5", label: "5기" },
] as const

const KNOWN_KEYS = new Set(STAGE_OPTIONS.map((o) => o.key))

/**
 * 정본 키가 아닌 표기 → 정본 키. **백엔드 `ckdLimits.ts::STAGE_ALIASES` 의 사본**이고
 * 두 쪽이 같은 답을 해야 한다.
 *
 * 왜 필요한가: `ckd_stage` 컬럼에는 enum 도 CHECK 도 없고, 구버전 앱·구서버가 남긴
 * **숫자만 저장된 행**이 실제로 존재한다(백엔드 표의 주석이 그 사실을 못박고 있다).
 * 그런 행을 여기서 못 읽으면 편집 화면이 "없음" 을 고른 것처럼 보이고, 저장이 곧
 * **병기 삭제**가 된다 — 카드가 `ckdStageLabel` 로는 `5기` 를 잘 그리기 때문에
 * 사용자에게는 "잘 뜨던 5기가 저장하니 입력 전이 됐다"로만 보인다(QA 2026-08-05).
 *
 * `3` 은 3A/3B 를 구분할 수 없다. 백엔드와 같게 **엄격한 3B** 로 붙인다 — 제한을
 * 조용히 완화하는 쪽이 환자를 다치게 하는 실패 모드이기 때문이다.
 */
const STAGE_ALIASES: Readonly<Record<string, string>> = {
  "1": "STAGE_1",
  "2": "STAGE_2",
  "3": "STAGE_3B",
  "3a": "STAGE_3A",
  "3b": "STAGE_3B",
  "4": "STAGE_4",
  "5": "STAGE_5",
  stage1: "STAGE_1",
  stage2: "STAGE_2",
  stage3a: "STAGE_3A",
  stage3b: "STAGE_3B",
  stage4: "STAGE_4",
  stage5: "STAGE_5",
}

/**
 * 서버가 준 stage 를 선택 상태로.
 *
 * 세 갈래다. **셋을 구분하는 것이 이 함수의 전부다.**
 *  - 정본 키·별칭 → 그 단계 (`"STAGE_5"`, `"5"` 둘 다 5기)
 *  - 값이 아예 없음(`null`/빈 문자열) → `null` = "CKD 아님" 을 **서버가 말한 것**
 *  - 아는 표기가 아님 → `undefined` = **모른다**. 화면은 아무 칩도 고르지 않고
 *    저장할 때 이 축을 **건드리지 않는다**. 예전에는 이것도 `null` 이라
 *    "사용자가 없음을 골랐다" 와 구분되지 않았고, 저장 한 번에 병기가 지워졌다.
 *
 * `DIALYSIS` 는 화면에서 별도 토글로 다루므로 여기서 단계로 바꾸지 않는다
 * (호출부가 그 값을 먼저 가로챈다).
 */
export function hydrateStage(
  serverStage: string | null | undefined,
): string | null | undefined {
  if (serverStage === null || serverStage === undefined) return null
  const raw = serverStage.trim()
  if (raw === "") return null
  const upper = raw.toUpperCase()
  if (KNOWN_KEYS.has(upper)) return upper
  const alias = STAGE_ALIASES[raw.toLowerCase()]
  return alias ?? undefined
}

/**
 * 선택 상태를 서버로 보낼 값으로. 투석 토글이 켜져 있으면 그쪽이 이긴다.
 *
 * `undefined` 를 돌려주면 **그 필드를 아예 보내지 말라**는 뜻이다(서버는 키가 없으면
 * 병기 축을 건드리지 않는다). `null` 은 "CKD 아님으로 지워라" 라는 **명령**이므로,
 * 사용자가 `없음` 을 직접 고르지 않았는데 그 값이 나가면 안 된다.
 */
export function toServerStage(
  selected: string | null | undefined,
  onDialysis: boolean,
): string | null | undefined {
  if (onDialysis) return "DIALYSIS"
  return selected
}

export function labelForStage(stage: string | null): string {
  if (!stage) return ""
  return STAGE_OPTIONS.find((o) => o.key === stage)?.label ?? stage
}
