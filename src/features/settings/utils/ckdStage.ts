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
 * 서버가 준 stage 를 선택 상태로. 인식 못 하는 값은 null 로 둔다 —
 * 임의로 가까운 단계에 붙이면 그게 곧 잘못된 제한이 된다.
 * `DIALYSIS` 는 화면에서 별도 토글로 다루므로 여기서 처리하지 않는다.
 */
export function hydrateStage(
  serverStage: string | null | undefined,
): string | null {
  if (!serverStage) return null
  return KNOWN_KEYS.has(serverStage) ? serverStage : null
}

/** 선택 상태를 서버로 보낼 값으로. 투석 토글이 켜져 있으면 그쪽이 이긴다. */
export function toServerStage(
  selected: string | null,
  onDialysis: boolean,
): string | null {
  if (onDialysis) return "DIALYSIS"
  return selected
}

export function labelForStage(stage: string | null): string {
  if (!stage) return ""
  return STAGE_OPTIONS.find((o) => o.key === stage)?.label ?? stage
}
