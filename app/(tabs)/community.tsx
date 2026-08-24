import { useEffect, useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import { typography } from "@/src/design-system-v2/tokens"
import { LAYOUT } from "@/src/theme/surface"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useLocalSearchParams, type Href } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"

import { useSurface } from "@/src/hooks/useSurface"
import {
  HeaderIconButton,
  headerActionRowRoom,
} from "@/src/shared/components"
import { useV2Theme } from "@/src/design-system-v2/hooks/useV2Theme"
import { FreePostTab } from "@/src/features/recipe/components/FreePostTab"
import { FLOATING_AI_BUTTON_COVERAGE } from "@/src/shared/components/FloatingAiButton"
import {
  FloatingWriteButton,
  FLOATING_WRITE_BUTTON_HEIGHT,
} from "@/src/shared/components/FloatingWriteButton"

/**
 * 커뮤니티 탭 — 자유글 피드가 산다.
 * 태그 딥링크(/community?tag=...)는 글 상세의 해시태그에서 들어온다.
 * 글쓰기는 브랜드 필 — 잉크 필(AI 상담)과 위계가 섞이지 않게 색으로 가른다.
 */
export default function CommunityScreen() {
  const { t } = useTranslation("common")
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
  const params = useLocalSearchParams<{ tag?: string }>()
  const surface = useSurface()
  /*
    상단 고정층의 면. `FreePostTab` 의 `pinnedHeader` 가 칠하는 것과 **같은 출처**여야
    한다 — 아래 `styles.header` 주석이 이유다.
  */
  const { colors } = useV2Theme()
  const [tagFilter, setTagFilter] = useState<string | null>(
    typeof params.tag === "string" && params.tag.length > 0 ? params.tag : null,
  )

  useEffect(() => {
    if (typeof params.tag === "string") {
      setTagFilter(params.tag.length > 0 ? params.tag : null)
    }
  }, [params.tag])

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: surface.bed,
        },
      ]}
    >
      {/*
        ■ 상단은 **하나의 고정층**이다 (2026-08-22)

        타이틀 줄 · 검색 · 칩 레일은 셋 다 스크롤하지 않고, 목록이 그 밑변에서 잘린다.
        그런데 라이트에서는 타이틀 줄만 화면 바닥(#eaeaec)에 앉고 그 아래 검색+칩 블록은
        흰 면이라, 한 덩어리로 읽혀야 하는 머리가 **두 평면으로 갈려** 있었다.

        **다크가 근거다.** 다크에서는 `background.default`(#1f1f21)가 곧 화면 바닥이라
        세 줄이 전부 같은 면이고, 층으로 읽히는 것은 색이 아니라 **카드가 그 밑으로
        지나간다**는 사실이다 — 사용자가 "자연스럽다" 고 한 그 상태다. 라이트에서 같은
        구조를 얻는 방법은 세 줄을 한 면에 놓는 것이고, 그 면은 `background.default`
        (라이트에서는 흰색 = 카드 평면)여야 한다. 반대로 고정층을 바닥색으로 칠하면
        그 위에 앉은 **컨트롤들이 무너진다**: 검색 필드의 면은 우물(#eaeaec)이라 바닥과
        같은 값이 되어 사라지고, 미선택 칩의 `fill.control` 은 **흰 헤더 위에서** 라벨이
        4.5 를 지키는 가장 진한 단으로 정해진 값이라(`tokens/colors.ts` · §7) 바닥이
        바뀌면 그 계산이 통째로 어긋난다.

        그래서 타이틀 줄이 검색+칩 쪽으로 올라온다(안전영역 띠까지 이 면이다 — 위가
        회색으로 남으면 갈라진 평면이 그대로다). 화면 바닥은 그 아래에서 시작한다.
        다크는 두 값이 같아 **한 픽셀도 안 바뀐다.**
      */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background.default,
            paddingTop: insets.top + HEADER_PAD_TOP,
          },
        ]}
      >
        <Text
          style={[styles.headerTitle, { color: surface.textStrong }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("community.title")}
        </Text>
        <View style={styles.headerActions}>
          <HeaderIconButton
            onPress={() => router.push("/community-library" as Href)}
            accessibilityLabel={t("community.myActivity")}
          >
            <Ionicons
              name="person-circle-outline"
              size={24}
              color={surface.textMuted}
            />
          </HeaderIconButton>
          <HeaderIconButton
            onPress={() =>
              router.push({
                pathname: "/community-library",
                params: { tab: "bookmarked" },
              } as Href)
            }
            accessibilityLabel={t("community.bookmarks")}
          >
            <Ionicons
              name="bookmark-outline"
              size={21}
              color={surface.textMuted}
            />
          </HeaderIconButton>
          <HeaderIconButton
            onPress={() => router.push("/(settings)/announcements" as Href)}
            accessibilityLabel={t("myPage.menu.announcements")}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={surface.textMuted}
            />
          </HeaderIconButton>
        </View>
      </View>

      {/*
        탭 재탭 사다리(`src/shared/navigation/tabReset.ts`)에서 이 라우트 파일이 맡는
        것은 없다. 2번(인기글 → 피드)은 탭 레이아웃이, 3번(맨 위로)과 4번(복구)은
        목록 핸들을 들고 있는 `FreePostTab` 이 등록한다.

        여기 있던 "아직 절반만 있다" 는 안내는 그 등록이 실제로 들어오면서 사라졌다.
        (그 안내가 적어 둔 `refresh: refreshable.refresh` 는 지금 **틀린 처방**이다 —
        4번은 새로고침이 아니라 복구이고, 멀쩡한 화면에서는 비어 있어야 한다.)
      */}
      <FreePostTab
        tagFilter={tagFilter}
        onTagFilterChange={setTagFilter}
        /*
          목록 여백은 **탭바 위**가 원점인 스크롤 좌표계다(화면 절대위치와 다르다).
          필이 덮는 구간 + 그 위에 쌓은 글쓰기 버튼(높이 44 + 간격 12)까지 비운다.
        */
        contentBottomPadding={
          FLOATING_AI_BUTTON_COVERAGE + FLOATING_WRITE_BUTTON_HEIGHT + 12 + 12
        }
      />

      <FloatingWriteButton
        label={t("community.write")}
        accessibilityLabel={t("community.writeAccessibility")}
        onPress={() => router.push("/free/new" as Href)}
      />
    </View>
  )
}

/**
 * 타이틀 줄의 위 여백. 아래 여백(`LAYOUT.stickyHeaderGap` 12)과 같은 값이라 머리가
 * 하나의 띠로 읽힌다. 안전영역과 더해 렌더에서 주므로 상수로 뺐다 —
 * 스타일에 남겨 두면 인라인 `paddingTop` 이 그 값을 덮어 죽은 숫자가 된다.
 */
const HEADER_PAD_TOP = 12

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    // 위 여백은 안전영역과 합쳐 렌더에서 준다(`HEADER_PAD_TOP`).
    /*
      아래 여백. 이 헤더는 스크롤하지 않고 피드가 바로 밑에서 잘리므로, 4 로 두면
      스크롤한 순간 카드가 제목 줄에 붙어 잘려 **깨진 것처럼** 보인다(레시피 탭에서
      같은 문제를 실측했다). 위(12)와 같은 값으로 헤더가 하나의 띠로 읽히게 한다.
    */
    paddingBottom: LAYOUT.stickyHeaderGap,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    // 규격 터치 상자가 이 행 안쪽에 들어오도록(안드로이드 부모 경계) — 그 함수 주석.
    ...headerActionRowRoom(24),
  },
  /*
    화면 제목. 정본 토큰(22/30 Bold)이 손으로 적던 값과 크기·행간이 같다 —
    달랐던 것은 자간(-0.44 → 0)과 **굵기를 두 번 준 것**(face + fontWeight)뿐이다.
    같은 제목을 마이페이지도 그리므로 둘 다 이 토큰을 본다.
  */
  headerTitle: typography.title.medium,
})
