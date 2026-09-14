/**
 * 0건·실패 상태. **원인마다 다른 문구 + 다른 CTA** (D12 / DESIGN_SPEC §11.13).
 *
 * ## 왜 이 구분이 이 기능의 핵심인가
 *
 * 시드 데이터가 **강남 한 블록(376곳, 1.6×1.5km)** 뿐이다. 서울 다른 동네만 열어도 0건이고,
 * `LOW_SUGAR` 칩과 `SALAD` 칩은 오늘 누르면 무조건 0건이다. 즉 "0건" 은 예외가 아니라
 * **가장 흔한 상태**다. 이걸 하나의 문구로 뭉개면:
 *
 * - 전부 "오류" 로 보이면 → 사용자는 앱이 고장 났다고 판단하고 떠난다.
 * - 전부 "데이터 없음" 으로 보이면 → 필터를 되돌릴 생각을 못 하고 계속 0건을 본다.
 *
 * ## 실패를 "인터넷 확인" 하나로 뭉개고 있었다 (이 파일이 고친 결함)
 *
 * 예전에는 모든 실패가 `NETWORK_FAILURE` 였고 문구는 `인터넷 연결을 확인한 뒤 다시 불러와
 * 주세요` 였다. 그런데 이 기능이 실제로 내던 오류는 대부분 **400** 이었다 — 뒤집힌 bbox,
 * 카탈로그에 없는 필터 키, 깨진 커서. 전부 **우리가** 만든 잘못된 요청이다. 그걸 사용자의
 * 와이파이 문제로 알리면 두 가지가 동시에 나빠진다: 사용자는 고칠 수 없는 것을 고치려 하고,
 * 우리는 그 제보를 "네트워크 이슈" 로 분류해 닫는다. 원인 분류는 `utils/fetchError.ts` 가
 * 하고(로그도 거기서 남는다), 이 파일은 그 결과에 맞는 말을 한다.
 *
 * | 이유 | 성격 | 문구 요지 | CTA |
 * |---|---|---|---|
 * | `NO_DATA_HERE` | 오류 아님 | 이 지역은 준비 중 | 지도 넓혀서 다시 찾기 |
 * | `FILTERED_TO_ZERO` | 오류 아님 | 고른 조건에 맞는 곳이 없다 | 필터 초기화 |
 * | `NETWORK_FAILURE` | 사용자가 고칠 수 있음 | **인터넷 연결 확인** | 다시 불러오기 |
 * | `SERVER_ERROR` | 서버 | 잠시 뒤 다시 | 다시 시도 |
 * | `REQUEST_REJECTED` | **우리 버그** | 인터넷 문제가 아니라고 명시 | 다시 시도 |
 * | `RESPONSE_MALFORMED` | **우리 버그** | 형식이 어긋났다고 명시 | 다시 시도 |
 *
 * 인터넷을 언급하는 문구는 `NETWORK_FAILURE` **하나뿐이다.** 우리 결함인 두 갈래는
 * 문구에서 그 사실을 먼저 밝힌다 — 사용자가 자기 환경을 의심하며 시간을 쓰지 않게.
 * 재시도 버튼은 남긴다: 그 사이 필터가 바뀌었으면 성공할 수 있고, 그것이 우리가 줄 수 있는
 * 유일한 행동이다.
 *
 * 오류 시각언어(`V2ErrorState`, 빨간 아이콘)는 실패 네 갈래가 쓴다. `NO_DATA_HERE` 와
 * `FILTERED_TO_ZERO` 는 오류가 아니므로 중립 빈 상태다 — 준비 중인 지역을 붉은 경고로
 * 알리지 않는다.
 */

import { StyleSheet, View, type ViewStyle } from "react-native"
import { useTranslation } from "react-i18next"

import {
  V2EmptyState,
  V2ErrorState,
  spacing,
  type V2IconName,
} from "@/src/design-system-v2"

import { dynamicKey } from "@/src/i18n/dynamicKey"

import type { EmptyReason } from "../types"
// 실패 갈래의 문구 표는 `utils/fetchError` 에 있다 — 분류와 문구를 같은 곳에 둔다.
// 여기 복사하면 리스트 전용 화면과 갈라져 한쪽만 고쳐진다(그 오분류가 이 파일이 고친 결함이다).
import { failureSpec } from "../utils/fetchError"

/** 0건(오류 아님) 이유 → 문구 키 + 아이콘. 모듈 레벨 룩업(인라인 조건 금지 규칙). */
const REASON = {
  NO_DATA_HERE: {
    icon: "mapPin" as V2IconName,
    titleKey: "restaurant.empty.noDataHereTitle",
    bodyKey: "restaurant.empty.noDataHereBody",
    actionKey: "restaurant.empty.noDataHereAction",
  },
  FILTERED_TO_ZERO: {
    icon: "filter" as V2IconName,
    titleKey: "restaurant.empty.filteredTitle",
    bodyKey: "restaurant.empty.filteredBody",
    actionKey: "restaurant.empty.filteredAction",
  },
} as const

export interface MapEmptyStateProps {
  reason: EmptyReason
  /**
   * `NO_DATA_HERE` — 줌아웃 후 다시 검색.
   *
   * **넓힐 지도가 없으면 넘기지 않는다.** 지도 SDK 가 죽어 리스트 모드로 내려간 화면에는
   * WebView 가 없어 `setLevel` 이 아무 일도 하지 않는다. 그때 이 버튼을 그리면 눌러도
   * 영원히 변화가 없는 컨트롤이 된다 — `RestaurantListScreen` 이 같은 이유로 이 이유에
   * 행동을 주지 않는다. 없으면 문구만 남고 버튼이 사라진다.
   */
  onWidenMap?: () => void
  /** `FILTERED_TO_ZERO` — 필터 전체 해제. */
  onResetFilters: () => void
  /** 실패 네 갈래 공통 — 재조회. */
  onRetry: () => void
  /** The map's middle detent must leave room for the recovery action. */
  compact?: boolean
  style?: ViewStyle
}

export function MapEmptyState({
  reason,
  onWidenMap,
  onResetFilters,
  onRetry,
  compact = false,
  style,
}: MapEmptyStateProps) {
  const { t } = useTranslation("common")

  const failure = failureSpec(reason)
  if (failure) {
    return (
      <View style={[styles.root, style]}>
        <V2ErrorState
          surface="restaurant_map"
          title={t(dynamicKey(failure.titleKey))}
          description={t(dynamicKey(failure.bodyKey))}
          retryLabel={t(dynamicKey(failure.retryKey))}
          onRetry={onRetry}
          retryGestureHandler
        />
      </View>
    )
  }

  const spec = REASON[reason as keyof typeof REASON]
  // 행동이 없으면 라벨도 넘기지 않는다 — `V2EmptyState` 는 둘이 함께 있을 때만 버튼을
  // 그리므로, 라벨만 남기면 눌리지 않는 글자가 버튼 자리에 선다.
  const action = reason === "NO_DATA_HERE" ? onWidenMap : onResetFilters
  return (
    <View style={[styles.root, compact && styles.compactRoot, style]}>
      <V2EmptyState
        surface="restaurant_map"
        icon={compact ? undefined : spec.icon}
        title={t(spec.titleKey)}
        description={t(spec.bodyKey)}
        actionLabel={action ? t(spec.actionKey) : undefined}
        onAction={action}
        actionGestureHandler
        style={compact ? styles.compactContent : undefined}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  // Full-page fallback retains the standard illustration and spacing. In the
  // map sheet, omit decoration and compact spacing so the recovery CTA fits
  // beneath its fixed filter header at the middle detent.
  root: { paddingTop: spacing[8], paddingBottom: spacing[32] },
  compactRoot: { paddingTop: 0, paddingBottom: spacing[16] },
  compactContent: { padding: spacing[16], gap: spacing[8] },
})
