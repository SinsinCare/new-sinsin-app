/**
 * **32px 카테고리 필터 칩 레일** — 피드(S1) · 인기글(S3) · 검색 결과(S2) · 신신이웃(S11).
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.5
 * · 실측 `popular.md` §2.4 · `search.md` §7.2 · `author-profile.md` §3.2
 * · 판정 `01-DECISIONS.md` **D11** · **D27**.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ D11/D27 — 칩은 `V2Chip fixedLabelWeight` 다
 *
 * `V2Chip` 은 기본적으로 **선택되면 라벨 굵기를 바꾼다**(`selected ? s.text : s.textWeak`,
 * `V2Chip.tsx` 머리말 "선택 여부는 면 + 글자 굵기 두 가지로 동시에 말한다").
 * 이 레일은 그러면 안 된다 — 세 구역이 독립적으로 같은 것을 쟀다:
 *   - `search.md` §7.2: `label 13 SemiBold #FE7139` + **"weight does **not** change between states"**
 *   - `popular.md` §2.4 · `author-profile.md` §3.2: 미선택도 **13 SemiBold**
 * 굵기가 바뀌면 칩 폭이 바뀌고, 가로 레일이라 **뒤의 칩이 전부 옆으로 밀린다** —
 * 실측 칩 폭(`전체` 52 · `질문·상담` 71 · `CKD 정보` 75)과도 어긋난다.
 *
 * D11 은 "`V2Chip` 에 굵기 고정 옵트인 프롭을 추가하고 레일이 그걸 쓴다" 로 끝났고,
 * **D27 이 그 프롭을 넣었다**(`fixedLabelWeight`, 기본 `false` 라 기존 소비자 불변).
 * 그래서 이 파일에 살던 사설 `CategoryChip` 은 지웠다 — 같은 그림을 두 벌 들고 있으면
 * 언젠가 한쪽만 고쳐진다. `size="s" tone="neutral"` 가지가 사설 칩과 **같은 값**을
 * 같은 방식으로 그린다(높이 `controlHeight.sm` 32, padH 12, `radius.full`,
 * 선택 면 `primary.primaryWeak` + 1px `primary.primary`, 미선택 `fill.control` —
 * 미선택은 2026-08-21 에 `fill.normal` 에서 갈라져 나왔다, `V2Chip` 안의 그 줄 참고).
 * 테두리가 상자를 키우지 않게 가로 패딩에서 1 을 빼는 산술도 `V2Chip` 안에 있다.
 *
 * ■ 오른쪽 고정 슬롯(`trailing`)은 스크롤 **밖**이다
 *
 * 피드(S1)의 필터 바는 왼쪽 칩 레일 + 오른쪽 정렬 필 하나다. 정렬은 칩과 같이 흘러가면
 * 안 된다 — 여덟 개짜리 레일에서 정렬을 바꾸려면 매번 끝까지 밀어야 한다. 그래서
 * `leading`(스크롤 **안**, 검색 결과 헤더가 쓰는 자리)과 달리 `trailing` 은 `ScrollView`
 * 바깥 형제이고, 스크롤 영역이 `flex: 1` 로 남은 폭을 갖는다.
 *
 * 그 경계에서 칩은 **잘린다**(RN `ScrollView` 는 자식을 클리핑한다). 잘린 모서리가 필에
 * 부딪힌 것처럼 보이지 않게 `EdgeFade placement="leftOfBar"` 가 그 24pt 를 덮는다 —
 * 끝점이 `"transparent"`(투명한 **검정**)면 안드로이드에서 중간이 회색으로 뜨므로
 * 같은 색의 알파 0 으로 간다(그 파일 머리말 §함정 1).
 *
 * ■ 컨테이너 높이 64 / 52 는 **패딩의 합**이지 `height` 가 아니다
 *
 * 실측: `popular.md` 레일 64(칩이 위·아래 16), `search.md` 결과 헤더 52. 두 값 모두
 * **하단 1px 하드라인을 포함한** 총 높이다(`author-profile.md` §3.2: 컨테이너 7349–7413,
 * 하드라인 7412, 칩 7365–7397 → 16 / 32 / 15+1).
 * Yoga 는 테두리를 상자 높이에 **포함**하므로(D13·D17 과 같은 산술) `paddingVertical: 16`
 * 에 테두리를 더하면 65 가 된다. 그래서 아래쪽 패딩에서 테두리만큼 뺀다 —
 * `16 + 32 + 15 + 1 = 64`, `10 + 32 + 9 + 1 = 52`. 칩의 위치(위에서 16 / 10)도 실측 그대로다.
 *
 * ⚠ `search.md` §7.2 는 칩을 `rel y 179–211`(위 6 / 아래 14)로 적고 같은 줄에서
 *   "vertically centered" 라고 쓴다 — 둘 다 참일 수 없다. 마스터 §2.5(`52`, **padV 10**)와
 *   그 문장이 2:1 로 이기고, 총 높이 52(주변 블록과 맞물리는 값)는 어느 쪽이든 같다.
 *
 * ■ 첫 인셋 20 은 `contentContainerStyle` 에만
 *
 * 가로 스크롤 컨테이너에 `paddingHorizontal` 을 주면 오른쪽 패딩이 스크롤 끝에서 잘려
 * 마지막 칩이 화면에 붙는다(`communityLayout.ts` §RAIL_INSET). 세로 패딩·하단선만
 * 바깥 상자가 갖는다.
 *
 * ■ `전체` 는 칩이지 "선택 없음" 이 아니다
 *
 * §2.5: "`전체` 가 기본 선택(= `category === null`). '아무것도 선택 안 됨' 상태를 만들지 말 것."
 * 그래서 `value: string | null` 하나로 말하고, `null` 이면 `전체` 칩이 켜진다.
 *
 * ■ 카테고리 4종(D1)은 이 파일에 없다
 *
 * D1 이 확정한 택소노미(`질문·상담`/`식단 인증`/`식당 추천`/`CKD 정보`)는 **서버 enum +
 * alembic 088 마이그레이션**이 따라와야 하는 제품 결정이고, 앱의 정본은 아직
 * `data/freePostCategories.ts`(현행 6종)다. 레일은 그 목록을 **받아서** 그린다 —
 * 여기에 한글을 박으면 §0.2("문자열은 전부 `t()`")도 D1 의 이행 순서도 깨진다.
 */
import { type ReactNode } from "react"
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"

import { V2Chip } from "@/src/design-system-v2/components/V2Chip"
import { useV2Theme } from "@/src/design-system-v2/hooks/useV2Theme"
import { borderWidth } from "@/src/design-system-v2/tokens/size"
import { spacing } from "@/src/design-system-v2/tokens/spacing"

import { EdgeFade } from "./EdgeFade"
import { CHIP_GAP, RAIL_INSET, ROW } from "./communityLayout"

/** 칩 하나. `key` 는 서버 `category` 파라미터로 그대로 간다. */
export type CategoryChipRailItem = {
  key: string
  /** `t()` 로 만든 카피. */
  label: string
}

/**
 * 레일이 얼마나 두꺼운가.
 *  - `feed`(기본) — 피드·인기글·신신이웃의 단독 레일. 위·아래 16 → **64**.
 *  - `results` — 검색 결과 스티키 헤더 안의 레일. 위·아래 10 → **52**.
 */
export type CategoryChipRailDensity = "feed" | "results"

/** 밀도 → 칩 위·아래 여백(§2.5). 총 높이는 `categoryChipRailHeight()` 가 만든다. */
export const CHIP_RAIL_INSET_V: Record<CategoryChipRailDensity, number> = {
  feed: spacing[16],
  results: spacing[10],
}

/**
 * 레일의 총 높이 — **하단 1px 하드라인을 포함한다**(머리말 §컨테이너 높이).
 * `feed` 64 · `results` 52 로 실측과 같다.
 */
export function categoryChipRailHeight(
  density: CategoryChipRailDensity,
): number {
  return CHIP_RAIL_INSET_V[density] * 2 + ROW.chip
}

export type CategoryChipRailProps = {
  /** `전체` 뒤에 이 순서로 그린다. 카피는 화면이 `t()` 로 만들어 넘긴다. */
  items: CategoryChipRailItem[]
  /** 선택된 카테고리 키. **`null` = `전체`** (§2.5 — "선택 없음" 상태는 없다). */
  value: string | null
  onChange: (key: string | null) => void
  /** `전체` 칩의 카피(`t()`). */
  allLabel: string
  /** 기본 `feed`(64). 검색 결과 헤더는 `results`(52). */
  density?: CategoryChipRailDensity
  /**
   * 칩보다 앞에 놓이는 슬롯. **스크롤 안**이라 칩과 같이 흘러간다. 검색 결과 헤더는
   * 이 자리에 정렬 필이 온다(`search.md` §7.2 의 1번 항목 — 필과 칩이 **같은 레일**).
   */
  leading?: ReactNode
  /**
   * 레일 **오른쪽에 고정**되는 슬롯. 스크롤 밖이라 칩이 아무리 많아도 제자리다 —
   * 피드(S1)의 정렬 필이 여기 산다. 주면 그 앞에 24pt 페이드가 같이 선다(머리말 §trailing).
   */
  trailing?: ReactNode
  style?: StyleProp<ViewStyle>
}

export function CategoryChipRail({
  items,
  value,
  onChange,
  allLabel,
  density = "feed",
  leading,
  trailing,
  style,
}: CategoryChipRailProps) {
  const { colors } = useV2Theme()
  const insetV = CHIP_RAIL_INSET_V[density]

  const chip = (key: string | null, label: string) => (
    <V2Chip
      key={key ?? "all"}
      label={label}
      // D11/D27 — 두 상태가 같은 13 SemiBold 다. 빼면 고른 칩만 넓어져 레일이 밀린다.
      fixedLabelWeight
      selected={value === key}
      size="s"
      tone="neutral"
      onPress={() => onChange(key)}
    />
  )

  return (
    <View
      style={[
        styles.rail,
        {
          paddingTop: insetV,
          // 하단 1px 은 총 높이 **안쪽**이다(머리말 §컨테이너 높이).
          paddingBottom: insetV - borderWidth.thin,
          backgroundColor: colors.background.default,
          borderBottomColor: colors.line.normal,
        },
        style,
      ]}
    >
      {/*
        스크롤 영역은 남은 폭을 갖는다. `trailing` 이 없으면 형제가 없으므로 전폭이다 —
        고정 슬롯이 있을 때만 폭이 갈린다.
      */}
      <View style={styles.scrollArea}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {leading}
          {chip(null, allLabel)}
          {items.map((item) => chip(item.key, item.label))}
        </ScrollView>
        {trailing ? <EdgeFade placement="leftOfBar" /> : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  rail: {
    // 높이를 박지 않는다 — 위 패딩 + 칩 32 + 아래 패딩 + 테두리가 곧 64 / 52 다.
    borderBottomWidth: borderWidth.thin,
    flexDirection: "row",
  },
  /**
   * 페이드의 기준 상자이기도 하다 — `EdgeFade` 는 절대 배치라 **패딩 없는 껍데기** 안에
   * 있어야 한다(그 파일 머리말 §함정 2). 레일의 세로 패딩은 바깥 상자가 갖고 여기는 없다.
   */
  scrollArea: { flex: 1 },
  /** 가로 스크롤의 인셋은 **여기**에만(머리말 §첫 인셋). */
  content: {
    paddingHorizontal: RAIL_INSET,
    gap: CHIP_GAP,
    alignItems: "center",
  },
  /**
   * 고정 슬롯. 오른쪽 인셋은 **거터 그대로**다 — 스크롤 끝에서 잘리는 자리가 아니라
   * 항상 화면에 있는 자리라, 여기서는 컨테이너 패딩이 정직하다.
   */
  trailing: {
    paddingRight: RAIL_INSET,
    paddingLeft: spacing[8],
    justifyContent: "center",
  },
})
