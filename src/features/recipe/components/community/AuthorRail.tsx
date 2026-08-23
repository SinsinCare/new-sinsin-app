/**
 * **작성자 카드 레일 181** — `이런 작성자도 만나보세요`(S4 상세 하단 · S9 프로필).
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.12
 * · 실측 `author-profile.md` §2.7 · `detail-drag.md` §5.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 두 안(A·B)을 합친 것이 §2.12 의 판정이다
 *
 * 시안에는 같은 섹션이 두 모양으로 있다 — **A**: 카드 3장 가로 레일(세 번째는 잘려서
 * 스크롤임을 알린다). **B**: 카드 1장 + 우측 `더보기` 필 74×32.
 * §2.12 판정은 **A 채택 + 레일 끝에 `더보기` 필 하나**다. 카드로 개별 작성자에게 가고,
 * 필로 신신이웃(S11) 전체 목록에 간다 — 두 안이 각각 갖고 있던 길을 둘 다 남긴다.
 *
 * ■ 높이 181 은 `8 + 165 + 8` 이다
 *
 * 실측 블록 7972–8153(181) 안에서 카드가 7980–8145(165). 즉 위·아래 8 이 레일의 것이다.
 * `height: 181` 을 박지 않는 이유: 카드가 자기 높이를 알고 있으므로 여백만 주면 181 이
 * 나오고, 카드 높이가 바뀌면 레일이 따라간다(두 곳에 165 를 적어 두면 갈라진다).
 *
 * ■ `더보기` 필의 세로 자리
 *
 * 실측은 "카드에 대해 세로 중앙"(필 8041–8073, 카드 7980–8145 → 두 중심이 5px 안).
 * `alignItems: "center"` 면 그 자리가 그냥 나온다. `MorePill` 이 자기 위·아래 16 여백을
 * 갖고 있지만(목록 뒤에 혼자 놓이는 자리를 위한 것) 32+32 = 64 는 165 보다 작아서
 * 레일 높이에 영향을 주지 않는다.
 *
 * ■ 섹션 제목은 여기 없다
 *
 * `이런 작성자도 만나보세요` 47 은 `SectionHeader` 의 몫이고, 레일 181 은 그 **아래**
 * 블록이다(실측이 두 블록을 따로 잰다). 화면이 둘을 세로로 쌓는다.
 */
import {
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native"

import { spacing } from "@/src/design-system-v2/tokens/spacing"

import { AuthorCard, type AuthorCardProps } from "./AuthorCard"
import { RAIL_INSET } from "./communityLayout"
import { MorePill } from "./MorePill"

/** 카드 한 장이 필요로 하는 것 + 목록 키. */
export type AuthorRailItem = Omit<AuthorCardProps, "style"> & { id: string }

/** 카드 위·아래 여백(§2.12). 레일 높이 181 = 8 + 165 + 8. */
export const AUTHOR_RAIL_PAD_V = spacing[8]

/** 카드 사이(§2.12 — 실측 pitch 145 = 137 + 8). */
export const AUTHOR_RAIL_GAP = spacing[8]

export type AuthorRailProps = {
  authors: AuthorRailItem[]
  /**
   * 레일 끝 `더보기` 필 — 신신이웃(S11)으로 간다(§2.12 판정, B안의 몫).
   * 카피는 화면이 `t()` 로 만들어 넘긴다. 안 주면 안 그린다.
   */
  more?: { label: string; onPress: () => void }
  style?: StyleProp<ViewStyle>
}

export function AuthorRail({ authors, more, style }: AuthorRailProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      style={style}
    >
      {authors.map(({ id, ...card }) => (
        <AuthorCard key={id} {...card} />
      ))}
      {more ? <MorePill label={more.label} onPress={more.onPress} /> : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  /*
    가로 스크롤의 좌우 인셋은 **contentContainerStyle 에만** 준다 —
    컨테이너 padding 이면 오른쪽이 스크롤 끝에서 잘린다(`communityLayout.ts` §RAIL_INSET).
    세로 8 도 여기 있다: 컨테이너에 주면 카드가 그만큼 눌린다.
  */
  content: {
    paddingHorizontal: RAIL_INSET,
    paddingVertical: AUTHOR_RAIL_PAD_V,
    gap: AUTHOR_RAIL_GAP,
    alignItems: "center",
  },
})
