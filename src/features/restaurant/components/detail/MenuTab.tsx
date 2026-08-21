/**
 * 메뉴 탭 (목업 -14). 안전도 배지가 붙은 메뉴 목록 + 하단 안내 문구.
 *
 * ## 순서를 안전도로 바꾸지 않는다
 *
 * `제한` 을 위로 몰면 사용자는 그 식당을 "못 갈 곳" 으로 읽는다. 목업은 메뉴판 순서를
 * 따르고, 훅이 대표 메뉴만 앞으로 올린다(`useRestaurantMenus`). 여기서 다시 정렬하지 않는다.
 *
 * ## 안내 문구가 여러 줄인 이유
 *
 * 서로 다른 말이라 합칠 수 없다.
 * - `한 끼 기준은 …`(mealBasis): 행마다 나오는 `한 끼 기준의 1.9배` 의 **기준이 무엇인지**.
 *   이 문장이 없으면 화면에서 가장 중요한 숫자의 분모를 사용자가 모른다.
 * - `매장 운영상황에 따라 …`(menuNotice): 목업의 운영 정보 면책.
 * - `이 정보는 … 추정 분석이에요`(disclaimer): 기능명세가 요구하는 **의료 면책**.
 *   개인화 판정이 화면에 있는 곳이면 예외 없이 붙는다.
 *
 * ## `추정` 은 목록이 한 번만 말한다
 *
 * 오늘 DB 의 메뉴 2013건이 전부 `ESTIMATED` 라 행마다 붙이면 같은 단어가 다섯 번 찍혀
 * 잡음이 된다. 목록의 신뢰도가 한 가지면 위에서 한 줄로 말하고, **행마다 다를 때만**
 * `showConfidence` 로 각 행에 표기한다(`menuConfidenceMode`).
 *
 * ## 목록을 FlatList 로 만들지 않은 이유
 *
 * 한 식당의 메뉴는 실측 평균 5건대다(2013건 / 376곳). 상세 화면은 하나의 스크롤을
 * 공유해야 탭 바가 sticky 로 붙는데, 그 안에 FlatList 를 넣으면 중첩 스크롤이 된다.
 * 사진·후기처럼 무한히 늘어나는 목록만 "더 보기" 로 끊는다.
 */

import { StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"

import {
  spacing,
  typography,
  useV2Theme,
  V2Divider,
  V2EmptyState,
  V2ErrorState,
} from "@/src/design-system-v2"
import { dynamicKey } from "@/src/i18n/dynamicKey"

import { GUTTER } from "../../layout"
import type { MenuItemDto } from "../../types"
import { menuConfidenceMode } from "../../utils/menuSafetyEvidence"
import { MenuRow } from "./MenuRow"
import { MenuTabSkeleton } from "./DetailSkeletons"
import { ProfileMissingNotice } from "./ProfileMissingNotice"

/** 목록 신뢰도 → 상단 한 줄. 조건문을 화면 안에 흘리지 않는다. */
const CONFIDENCE_KEY = {
  ALL_ESTIMATED: "restaurant.safety.confidence.allEstimated",
  ALL_VERIFIED: "restaurant.safety.confidence.allVerified",
  MIXED: "restaurant.safety.confidence.mixed",
} as const

export interface MenuTabProps {
  menus: MenuItemDto[]
  profileMissing: boolean
  /** 서버 상한에 걸려 잘렸다. 조용히 넘기지 않고 목록 끝에서 말한다. */
  truncated?: boolean
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

export function MenuTab({
  menus,
  profileMissing,
  truncated = false,
  isLoading,
  isError,
  onRetry,
}: MenuTabProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const confidence = menuConfidenceMode(menus)

  if (isLoading) {
    return <MenuTabSkeleton />
  }

  if (isError) {
    return (
      <V2ErrorState
        surface="restaurant_detail_menu"
        title={t("restaurant.error.detailTitle")}
        description={t("restaurant.error.detailBody")}
        onRetry={onRetry}
        retryLabel={t("restaurant.error.detailRetry")}
      />
    )
  }

  if (menus.length === 0) {
    return (
      <V2EmptyState
        surface="restaurant_detail_menu"
        title={t("restaurant.empty.menuTitle")}
      />
    )
  }

  return (
    <View style={styles.container}>
      {profileMissing && <ProfileMissingNotice style={styles.notice} />}

      {/* 신뢰도는 목록이 한 번 말한다. 프로필이 없으면 판정 자체가 없으므로 이 줄도 없다. */}
      {!profileMissing && confidence !== null && (
        <Text
          style={[
            typography.subtext.medium,
            styles.confidence,
            { color: colors.label.alternative },
          ]}
          lineBreakStrategyIOS="hangul-word"
        >
          {t(dynamicKey(CONFIDENCE_KEY[confidence]))}
        </Text>
      )}

      {menus.map((menu, index) => (
        <View key={menu.menuId}>
          {index > 0 && <V2Divider tone="alternative" />}
          <MenuRow
            menu={menu}
            profileMissing={profileMissing}
            showConfidence={confidence === "MIXED"}
          />
        </View>
      ))}

      <View style={styles.disclaimer}>
        {truncated && (
          <Text
            style={[
              typography.subtext.medium,
              { color: colors.label.alternative },
            ]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("restaurant.detail.menuTruncated")}
          </Text>
        )}
        {/* 화면에서 가장 중요한 숫자의 분모를 설명하는 줄. 판정이 있을 때만 뜻이 있다. */}
        {!profileMissing && (
          <Text
            style={[
              typography.subtext.medium,
              { color: colors.label.assistive },
            ]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("restaurant.safety.mealBasis")}
          </Text>
        )}
        <Text
          style={[typography.subtext.medium, { color: colors.label.assistive }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("restaurant.safety.menuNotice")}
        </Text>
        <Text
          style={[typography.subtext.small, { color: colors.label.assistive }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("restaurant.safety.disclaimer")}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: GUTTER },
  notice: { marginTop: spacing[16] },
  confidence: { paddingTop: spacing[16] },
  disclaimer: {
    gap: spacing[8],
    paddingTop: spacing[24],
    paddingBottom: spacing[32],
  },
})
