/**
 * 보관함이 **비어 보일 때 무슨 말을 하는가**의 판단표.
 *
 * 화면 안에 삼중 삼항식으로 있던 것을 꺼냈다. 이 저장소의 jest 는
 * `testEnvironment: "node"` 라 `RecipeArchiveScreen` 을 그려 볼 수 없어서, 판단이 JSX
 * 안에 있는 동안에는 **어떤 조합에서 어떤 말을 하는지 검증할 방법이 없었다.**
 *
 * 순서가 전부다. 셋이 동시에 참일 수 있고, 무엇을 먼저 말하느냐가 사용자가 다음에 할
 * 일을 정한다:
 *
 *  1. **실패가 먼저다.** 서버가 답을 못 준 것을 "저장한 레시피가 없어요" 라고 말하면
 *     앱이 거짓말을 한다 — 사용자는 있는 것을 없다고 믿고 되돌릴 방법도 없다.
 *  2. **그다음이 좁힘이다.** 검색어·필터가 걸린 채로 비었으면 보관함이 빈 게 아니라
 *     조건이 좁은 것이다. 그때 줄 행동은 "레시피 보러 가기" 가 아니라 **조건 풀기**다.
 *  3. 마지막이 진짜 빈 보관함. 탭마다 다음 행동이 같으므로(둘러보기) 문구만 갈린다.
 *
 * 아이콘도 판단의 일부라 여기서 정한다. 실패에만 `caution` 을 쓴다 — 빈 보관함은
 * 사고가 아니라 아직 아무것도 안 한 상태이고, 거기에 경고 삼각형을 놓으면 사용자가
 * 자기가 뭘 잘못했다고 읽는다(상세의 `RecipeFetchErrorState` 가 같은 이유로 `NOT_FOUND`
 * 를 `info` 로 그린다).
 */
import type { RecipeArchiveTab } from "./archiveTab"

/** 무엇이 비었는가. 화면은 이 값으로 갈래를 나누지 않고 아래 문구만 그린다. */
export type ArchiveEmptyKind =
  | "loadError"
  | "narrowed"
  | "savedEmpty"
  | "recentEmpty"

/** 빈 자리에서 줄 수 있는 행동. 화면이 이 이름으로 핸들러를 고른다. */
export type ArchiveEmptyAction = "retry" | "clearNarrowing" | "browse"

/**
 * 갈래별 문구표. **`as const` 인 것이 요점이다** — i18n 키가 리터럴 유니온으로 남아야
 * `t(copy.titleKey)` 가 타입 검사를 통과한다(`src/i18n` 이 키를 타입으로 박아 뒀다).
 * `string` 으로 넓히면 오타가 런타임까지 살아남는다.
 *
 * 아이콘은 `V2IconName` 을 직접 참조하지 않는다 — 그 타입을 들여오면 이 모듈이 svg 를
 * 끌고 와서 node 환경 jest 가 파싱하지 못한다. 이름이 세트에 있는지는 화면이 컴파일될 때
 * 걸린다(화면이 이 값을 그대로 `V2EmptyState` 에 넘긴다).
 */
const ARCHIVE_EMPTY_COPY = {
  loadError: {
    kind: "loadError",
    icon: "caution",
    titleKey: "archive.loadErrorTitle",
    bodyKey: "archive.loadErrorBody",
    actionKey: "archive.retry",
    action: "retry",
  },
  narrowed: {
    kind: "narrowed",
    icon: "search",
    titleKey: "archive.filteredEmptyTitle",
    bodyKey: "archive.filteredEmptyBody",
    // 좁힘을 푸는 말은 목록 화면의 "전체 해제" 와 같은 키를 쓴다 — 같은 동작에
    // 두 벌의 낱말을 두면 화면마다 다른 말이 된다.
    actionKey: "list.filterClearAll",
    action: "clearNarrowing",
  },
  savedEmpty: {
    kind: "savedEmpty",
    icon: "bookmark",
    titleKey: "archive.savedEmptyTitle",
    bodyKey: "archive.savedEmptyBody",
    actionKey: "archive.browse",
    action: "browse",
  },
  recentEmpty: {
    kind: "recentEmpty",
    icon: "clock",
    titleKey: "archive.recentEmptyTitle",
    bodyKey: "archive.recentEmptyBody",
    actionKey: "archive.browse",
    action: "browse",
  },
} as const satisfies Record<
  ArchiveEmptyKind,
  {
    kind: ArchiveEmptyKind
    icon: string
    titleKey: string
    bodyKey: string
    actionKey: string
    action: ArchiveEmptyAction
  }
>

export type ArchiveEmptyCopy =
  (typeof ARCHIVE_EMPTY_COPY)[keyof typeof ARCHIVE_EMPTY_COPY]

export interface ArchiveEmptyInput {
  /** 목록 조회가 실패했는가. */
  isError: boolean
  /** 검색어나 필터로 좁혀져 있는가. */
  isNarrowed: boolean
  tab: RecipeArchiveTab
}

export function resolveArchiveEmpty({
  isError,
  isNarrowed,
  tab,
}: ArchiveEmptyInput): ArchiveEmptyCopy {
  if (isError) return ARCHIVE_EMPTY_COPY.loadError
  if (isNarrowed) return ARCHIVE_EMPTY_COPY.narrowed
  return tab === "saved"
    ? ARCHIVE_EMPTY_COPY.savedEmpty
    : ARCHIVE_EMPTY_COPY.recentEmpty
}
