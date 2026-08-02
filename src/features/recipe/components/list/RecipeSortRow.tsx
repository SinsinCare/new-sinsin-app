/**
 * 정렬 줄 — `추천 | 최신 | 별점 | 저장순 | 빠른 조리`(계약 §3.1 sort 5종).
 *
 * `빠른 조리`(quick)는 시안에 없다. 하지만 "지금 뭐 먹지" 는 실제 질의다 — 조리시간이
 * 15분인지 45분인지가 오늘 그걸 만드는지 마는지를 정한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 맨 글자 → **라운딩 칩**, 그리고 색은 무채색이다 (디자인 피드백)
 *
 * 종전 판본은 밑줄도 면도 없는 **맨 글자 다섯 개**였고, 켜진 것만 주황이었다.
 * 두 가지가 무너져 있었다:
 *
 *  1. **누를 수 있다는 것을 모양이 말하지 않았다.** 바로 위 카테고리 캐러셀은 면을
 *     가진 타일이고 그 위 헤더의 `보관함`·`쓰기` 도 회색 알약이다. 그 사이에 낀 회색
 *     낱말 다섯 개는 목록의 소제목처럼 읽혔다(같은 지적으로 `보관함` 이 이미 한 번
 *     맨 글자에서 칩으로 올라왔다 — 같은 결함이 이 줄에 남아 있었다).
 *  2. **주황이 두 뜻을 겸했다.** 같은 화면에서 주황은 검색 필드의 `필터 1` 배지 —
 *     "지금 결과가 좁혀져 있다" 는 신호다. 정렬은 결과를 좁히지 않는데 같은 색으로
 *     켜져 있으니, 주황 두 개 중 무엇이 결과를 바꾼 것인지 알 수 없었다.
 *
 * 이제 **면으로 말한다**: 안 고른 것은 옅은 회색 알약, 고른 것은 잉크 면 + 흰 글자.
 * 무채색이라 이 화면의 주황은 다시 `필터 N` 하나뿐이다.
 *
 * ■ 위의 적용된 필터 칩과 헷갈리지 않는가 — 세 가지가 다르다
 *
 * 종전 주석이 "칩으로 만들면 빼는 칩과 고르는 칩을 구별할 수 없다" 를 이유로 맨 글자를
 * 골랐었다. 그 걱정은 **색까지 같을 때만** 성립한다. 지금 둘은 이렇게 갈린다:
 *
 *   적용된 필터(`AppliedFilterRow`) — 주황 틴트 면 · 주황 글자 · 오른쪽에 `×`
 *   정렬(이 줄)                     — 무채색 면 · `×` 없음 · 항상 하나가 켜져 있다
 *
 * 지울 수 있는 것에만 `×` 가 붙고, 유채색은 "결과가 좁혀졌다" 쪽에만 있다.
 *
 * ■ 칩을 여기서 그리지 않는다 — `V2Chip`
 *
 * 알약 하나를 이 파일에서 또 손으로 그리면 앱 안의 다섯 번째 칩 구현이 된다(이미
 * `V2Chip` · `SelectableChip` · `DetailFilterChip` · 헤더 알약이 있다). 치수·라디우스·
 * 터치 타겟·글자 굵기 규칙은 DS 가 들고 있고 이 파일은 **무엇을 고르게 할지**만 정한다.
 * `tone="neutral"` 이 위 §색의 근거다.
 */
import { ScrollView, StyleSheet } from "react-native"
import { useTranslation } from "react-i18next"

import { CHIP_GAP, RAIL_INSET, V2Chip } from "@/src/design-system-v2"

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
        칩이 섹션 제목·목록 줄과 **같은 시작선**에 선다.
      */
      contentContainerStyle={styles.content}
    >
      {RECIPE_SORT_KEYS.map((key) => {
        const label = t(SORT_LABEL_KEYS[key])
        return (
          <V2Chip
            key={key}
            label={label}
            /*
              같은 칩을 다시 눌러도 해제되지 않는다 — 정렬은 항상 하나가 켜져 있고
              "정렬 없음" 이라는 상태가 없다(그 점이 필터와 다르다).
            */
            selected={key === sort}
            onPress={() => onChange(key)}
            size="s"
            tone="neutral"
            /* 화면에는 `별점` 만 보인다. 앞뒤 맥락이 없는 스크린리더에는 그것이
               "별점" 인지 "별점 순으로 본다" 인지 알 수 없다. */
            accessibilityLabel={t("list.sortAccessibility", { label })}
          />
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: {
    gap: CHIP_GAP,
    paddingHorizontal: RAIL_INSET,
    alignItems: "center",
  },
})
