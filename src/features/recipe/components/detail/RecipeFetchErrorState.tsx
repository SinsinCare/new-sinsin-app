/**
 * 레시피 조회 실패 화면. **원인별로 다른 말을 한다.**
 *
 * ## 고친 결함 (실측)
 *
 * `sinsin:///recipe/1` — dev DB 에 없는 id — 를 열면 서버가 404 `COMMON_ERROR_004` 를
 * 주는데 화면은 `레시피를 불러오지 못했어요 / 인터넷 연결을 확인한 뒤 다시 시도해 주세요.`
 * 를 그렸다. 실패를 한 갈래로만 그렸기 때문이다. 두 방향으로 비쌌다:
 *  1. 사용자는 고칠 수 없는 것(자기 인터넷)을 고치려 한다. 앱이 거짓말을 한 것이다.
 *  2. 우리는 그 제보를 "네트워크 이슈" 로 분류해 닫는다. 원인이 화면에 가려진다.
 *
 * ## 이 화면이 반드시 갖는 것: **나가는 길**
 *
 * 종전 오류 화면에는 헤더도 뒤로가기도 없었다. 딥링크로 들어오면(=404 가 가장 잘 나는
 * 경로) 스택 맨 아래라 뒤로 갈 곳조차 없어 **사용자가 갇힌다.** 그래서 헤더를 항상 그리고,
 * 뒤로 갈 곳이 없으면 레시피 탭으로 보낸다.
 *
 * ## 재시도 버튼을 언제 안 그리나
 *
 * `NOT_FOUND` 는 재시도가 원인을 고치지 못한다 — 없는 레시피는 다시 눌러도 없다.
 * 그 자리에 "레시피 목록으로" 를 둔다. 판단표는 `utils/recipeFetchError.ts` 한 곳이다.
 */
import { StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import {
  V2ErrorState,
  V2ScreenHeader,
  useV2Theme,
} from "@/src/design-system-v2"
import type { V2IconName } from "@/src/design-system-v2"
import type { FetchFailureKind } from "@/src/shared/utils/fetchFailure"
import {
  recipeFailureCopy,
  recipeUnreadableIdCopy,
} from "../../utils/recipeFetchError"

export interface RecipeFetchErrorStateProps {
  /**
   * 분류된 실패 갈래. `null` 이면 **라우트 파라미터를 레시피 id 로 읽지 못한 경우**다
   * (`/recipe/abc`). 서버에 물어보지도 못했지만 사용자가 보는 상황은 "없는 레시피" 와
   * 같으므로 같은 문구를 쓴다.
   */
  kind: FetchFailureKind | null
  /** 다시 조회. `kind` 가 재시도 가능한 갈래일 때만 불린다. */
  onRetry: () => void
  /** 목록으로 나가기. 재시도가 무의미한 갈래의 행동이자, 헤더 뒤로가기의 대체 경로다. */
  onLeave: () => void
}

/**
 * 아이콘도 갈래를 따른다. `NOT_FOUND` 는 **경고가 아니라 사실 통지**라서 `info` 다 —
 * 지워진 레시피를 경고 삼각형으로 그리면 사용자가 자기가 뭘 잘못했다고 읽는다.
 *
 * 다만 색은 아직 못 맞춘다: `V2ErrorState` 가 아이콘을 `status.negative` 로 **고정**해
 * 칠한다(그 컴포넌트 안에 색 prop 이 없다). 그래서 `NOT_FOUND` 도 붉은 `info` 로 나온다.
 * 고치려면 DS 에 `iconColor` 를 더해야 하는데 그건 공용 컴포넌트 변경이라 이 작업의
 * 범위 밖이다 — 레시피 재설계에서 DS 를 손댈 때 같이 정리한다.
 */
const ICON: Record<FetchFailureKind, V2IconName> = {
  NETWORK_FAILURE: "caution",
  SERVER_ERROR: "caution",
  NOT_FOUND: "info",
  REQUEST_REJECTED: "caution",
}

export function RecipeFetchErrorState({
  kind,
  onRetry,
  onLeave,
}: RecipeFetchErrorStateProps) {
  const { t } = useTranslation("recipe")
  const { colors } = useV2Theme()

  const copy = kind == null ? recipeUnreadableIdCopy() : recipeFailureCopy(kind)
  const icon = kind == null ? ICON.NOT_FOUND : ICON[kind]

  return (
    <View
      style={[styles.root, { backgroundColor: colors.background.default }]}
      testID="recipe-detail-error"
    >
      {/* 헤더는 상태와 무관하게 항상 있다 — 위 머리말의 "나가는 길". */}
      <V2ScreenHeader onBack={onLeave} />
      <View style={styles.body}>
        <V2ErrorState
          icon={icon}
          title={t(copy.titleKey)}
          description={t(copy.bodyKey)}
          onRetry={copy.retry ? onRetry : onLeave}
          retryLabel={t(copy.actionKey)}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, alignItems: "center", justifyContent: "center" },
})
