/**
 * 정렬 줄 — `추천 | 최신 | 별점 | 저장순 | 빠른 조리`(계약 §3.1 sort 5종).
 *
 * `빠른 조리`(quick)는 시안에 없다. 하지만 "지금 뭐 먹지" 는 실제 질의다 — 조리시간이
 * 15분인지 45분인지가 오늘 그걸 만드는지 마는지를 정한다.
 *
 * 왜 칩이 아니라 글자인가: 위의 적용된 필터 칩과 생김새가 같으면 하나는 "빼는 것",
 * 하나는 "고르는 것" 인데 사용자가 구별할 수 없다. 정렬은 항상 하나가 켜져 있고
 * 지울 수 없으므로 X 가 붙는 칩과 다른 문법을 준다(§6.4 결과 예측 가능).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 밑줄을 없앴다 — **탭이 아닌데 탭처럼 보였다**
 *
 * 켜진 항목 아래에 브랜드색 2pt 밑줄을 깔고 있었다. 그런데 이 줄은 목록과 같은
 * 스크롤에 있어서, 조금만 내리면 **고정된 검색 필드 바로 아래에 주황 밑줄 하나만**
 * 남는다. 실제 화면에서 그것은 "탭이 하나뿐인 탭바" 로 읽혔다(지적: "검색창 왼쪽
 * 아래에 붙은 정체불명의 주황 밑줄"). 밑줄은 관례상 **탭 전환**의 표시이고, 이 줄은
 * 화면을 전환하지 않으므로 그 관례를 빌리면 안 된다.
 *
 * 켜진 항목은 이제 **낱말 자체**로 말한다(브랜드색 + 굵은 face). 같은 화면의 카테고리
 * 캐러셀이 이미 "굵기 + 색으로만 선택을 말한다" 는 문법을 쓰고 있어서, 밑줄을 빼면
 * 두 줄의 문법이 같아진다 — 사용자가 한 화면에서 두 가지 선택 표시법을 배우지 않아도 된다.
 *
 * ■ 글꼴은 `typography.*` 를 편다 — `fontWeight` 를 쓰지 않는다
 *
 * Pretendard 가 굵기별 4개 파일로 로드돼 있어 face 위에 `fontWeight` 를 겹치면 iOS 에서
 * 가짜 볼드가 난다(`typography.ts` 머리말). 굵기는 face 로만 말한다.
 */
import { Pressable, ScrollView, StyleSheet, Text } from "react-native"
import { useTranslation } from "react-i18next"

import { useSurface } from "@/src/hooks/useSurface"
import { RAIL_INSET, spacing, typography } from "@/src/design-system-v2"
import { tokens } from "@/src/theme/tokens"

import { RECIPE_SORT_KEYS, type RecipeSortKey } from "../../types/recipeListV2"

const SORT_LABEL_KEYS = {
  recommended: "list.sort.recommended",
  recent: "list.sort.recent",
  rating: "list.sort.rating",
  saves: "list.sort.saves",
  quick: "list.sort.quick",
} as const satisfies Record<RecipeSortKey, string>

interface RecipeSortRowProps {
  sort: RecipeSortKey
  onChange: (sort: RecipeSortKey) => void
}

export function RecipeSortRow({ sort, onChange }: RecipeSortRowProps) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      bounces={false}
      overScrollMode="never"
      keyboardShouldPersistTaps="handled"
      /*
        가로 스크롤은 `contentContainerStyle` 로만 여백을 준다 — 컨테이너에
        `paddingHorizontal` 을 주면 뷰포트가 좁아져 마지막 항목이 화면 끝에서 잘린다.
        왼쪽 인셋을 화면 여백(`RAIL_INSET` = `GUTTER`)과 같게 두어야 정렬 줄의 첫
        낱말이 섹션 제목·목록 줄과 **같은 시작선**에 선다.
      */
      contentContainerStyle={styles.content}
    >
      {RECIPE_SORT_KEYS.map((key) => {
        const isActive = key === sort
        const label = t(SORT_LABEL_KEYS[key])
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            accessibilityRole="button"
            accessibilityLabel={t("list.sortAccessibility", { label })}
            accessibilityState={{ selected: isActive }}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text
              style={[
                isActive ? styles.labelActive : styles.label,
                {
                  color: isActive
                    ? tokens.color.primary.val
                    : surface.textMuted,
                },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[20],
    paddingHorizontal: RAIL_INSET,
    alignItems: "center",
  },
  /**
   * 켜짐/꺼짐이 **같은 크기·같은 줄높이**여야 한다. face 만 바뀌므로 정렬을 눌러도
   * 줄의 높이나 낱말 위치가 튀지 않는다(굵기를 fontSize 로 흉내내면 그 순간 튄다).
   */
  label: {
    ...typography.subtext.large,
  },
  labelActive: {
    ...typography.label.small,
    // `label.small`(15/19)과 `subtext.large`(15/20)의 줄높이 1pt 차이를 맞춘다.
    lineHeight: typography.subtext.large.lineHeight,
  },
})
