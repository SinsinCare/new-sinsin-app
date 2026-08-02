/**
 * 보관함의 두 탭 — 이름과 순서만 담은 순수 모듈.
 *
 * 화면(`RecipeArchiveScreen.tsx`)이 아니라 여기 있는 이유는 하나다: 이 저장소의 jest 는
 * `testEnvironment: "node"` 라 `react-native` 를 들여오는 파일을 파싱하지 못한다. 타입과
 * 순서가 화면 안에 있으면 판단 모듈(`archiveEmptyState.ts`)이 화면을 import 하게 되고,
 * 그 순간 판단을 검증할 수 없다.
 *
 * `ArchiveSource`(서비스 계층)와 값이 같지만 **같은 타입으로 묶지 않는다** — 하나는
 * 화면의 탭이고 하나는 서버 엔드포인트의 갈래다. 지금 같을 뿐이고, 탭이 하나 더
 * 생기는 날(예: 내가 쓴 레시피) 둘은 갈라진다.
 */

export type RecipeArchiveTab = "saved" | "recent"

/** 화면에 그리는 순서. 저장이 먼저다 — 보관함에 오는 이유의 대부분이 저장한 것이다. */
export const RECIPE_ARCHIVE_TABS: readonly RecipeArchiveTab[] = [
  "saved",
  "recent",
]

/** 탭 이름의 번역 키. 문구를 화면과 테스트가 같은 표에서 본다. */
export const RECIPE_ARCHIVE_TAB_LABEL_KEYS = {
  saved: "archive.tabSaved",
  recent: "archive.tabRecent",
} as const satisfies Record<RecipeArchiveTab, string>

/** 목록 위에 말하는 개수 문구의 키(좁히지 않았을 때). */
export const RECIPE_ARCHIVE_COUNT_KEYS = {
  saved: "archive.savedCount",
  recent: "archive.recentCount",
} as const satisfies Record<RecipeArchiveTab, string>

/** 라우트가 준 시작 탭. 모르는 값이면 저장 탭으로 떨어진다. */
export function normalizeArchiveTab(value: string): RecipeArchiveTab {
  return value === "recent" ? "recent" : "saved"
}
