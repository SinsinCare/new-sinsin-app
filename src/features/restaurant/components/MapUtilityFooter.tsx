/**
 * 목록 끝에 붙는 보조 진입점 블록 — `저장한 곳` 과 `식당 알려주기`.
 *
 * ## 왜 이 블록이 존재하는가 (INTEGRATION_BRIEF §F.1)
 *
 * `RestaurantReportForm` 은 지금까지 **`restaurantTab` 플래그가 꺼져 있을 때의 대체 화면**
 * 으로만 렌더됐다(`app/(tabs)/restaurant.tsx`). 즉 지도를 켜는 순간 제보 폼으로 가는
 * 유일한 길이 조용히 사라진다 — 기능 하나를 삭제하는 것과 같다. `저장한 곳` 도 같은
 * 처지다: 지도의 북마크 FAB 은 **"저장한 곳만 보기" 필터 토글**이지 목록 화면이 아니라
 * (DESIGN_SPEC §11.20), 저장 목록에는 문이 아예 없었다.
 *
 * ## 왜 지도 위가 아니라 목록 끝인가
 *
 * 목업의 지도면에는 검색바·칩 레일·FAB 2개·pill 이 이미 떠 있다. 여기에 버튼을 더하면
 * 지도가 보이지 않는다. 반대로 목록의 끝은 "여기까지가 전부다" 를 사용자가 방금 확인한
 * 지점이라, `찾는 식당이 없나요?` 가 가장 자연스럽게 읽히는 자리다.
 *
 * `FlatList` 의 `ListFooterComponent` 는 **데이터가 0건일 때도** 그려진다. 그래서
 * 시드 데이터가 강남 한 블록뿐인 오늘(가장 흔한 상태가 0건이다, D12) 빈 상태 바로 아래에
 * 제보 진입점이 함께 뜬다 — 찾지 못한 순간이 제보 동기가 가장 큰 순간이다.
 */

import { StyleSheet, Text, View, type ViewStyle } from "react-native"
import { useTranslation } from "react-i18next"

import {
  V2Divider,
  V2Icon,
  iconSize,
  spacing,
  typography,
  useV2Theme,
  V2ListRow,
} from "@/src/design-system-v2"

export interface MapUtilityFooterProps {
  /** `저장한 곳` 으로 이동. 없으면 그 줄을 렌더하지 않는다(죽은 행 금지). */
  onPressBookmarks?: () => void
  /** 제보 폼으로 이동. 없으면 그 줄을 렌더하지 않는다. */
  onPressReport?: () => void
  style?: ViewStyle
}

export function MapUtilityFooter({
  onPressBookmarks,
  onPressReport,
  style,
}: MapUtilityFooterProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()

  // 둘 다 없으면 구분선만 남은 빈 블록이 된다. 아무 것도 그리지 않는다.
  if (!onPressBookmarks && !onPressReport) return null

  return (
    <View style={[styles.root, style]}>
      <V2Divider tone="alternative" />
      <Text
        style={[
          typography.subtext.medium,
          styles.prompt,
          { color: colors.label.alternative },
        ]}
      >
        {t("restaurant.report.entryPrompt")}
      </Text>
      {onPressBookmarks && (
        <V2ListRow
          leadingIcon="bookmark"
          title={t("restaurant.bookmark.listEntry")}
          onPress={onPressBookmarks}
          verticalPadding="m"
          sideMargin="s"
          trailing={<Chevron color={colors.label.assistive} />}
        />
      )}
      {onPressReport && (
        <V2ListRow
          leadingIcon="report"
          title={t("restaurant.report.formTitle")}
          onPress={onPressReport}
          verticalPadding="m"
          sideMargin="s"
          trailing={<Chevron color={colors.label.assistive} />}
        />
      )}
    </View>
  )
}

/** 행 끝 화살표. `V2ListRow` 는 트레일링 슬롯을 소비처가 채우는 계약이다. */
function Chevron({ color }: { color: string }) {
  return <V2Icon name="chevronRight" size={iconSize.sm} color={color} />
}

const styles = StyleSheet.create({
  root: { paddingTop: spacing[8], paddingBottom: spacing[8] },
  // 안내 문구만 `V2ListRow` 의 sideMargin="s"(20) 와 같은 선에 맞춘다.
  prompt: {
    paddingHorizontal: spacing[20],
    paddingTop: spacing[16],
    paddingBottom: spacing[4],
  },
})
