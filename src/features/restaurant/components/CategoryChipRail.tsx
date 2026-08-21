/**
 * 지도 위 카테고리 칩 레일. 목업 §2.3 (`AI 검색` + 한식/중식/일식/양식/샐러드/디저트).
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 2026-08-20: **시안대로 — 선택은 브랜드 테두리, 그림은 언제나 총천연색**
 *
 * 새 시안(`A3_1`·`A6_1`)을 3배 렌더에서 픽셀로 재면 이 레일은 아래와 같다. 괄호 안이
 * 3배 실측 픽셀이고, 오른쪽 칸이 그 값과 **정확히 같은** 정본 토큰이다.
 *
 *   | 잰 것         | 시안         | 토큰                                     |
 *   |---------------|--------------|------------------------------------------|
 *   | 칩 높이       | 32 (96px)    | `controlHeight.sm`                       |
 *   | 칩 사이       | 6 (18px)     | `RAIL_CHIP_GAP`(아래 — 필터 줄과 다르다) |
 *   | 모서리        | 알약         | `radius.full` (그대로)                   |
 *   | 테두리        | 1 (3px)      | chrome 이 이미 주는 두께                 |
 *   | 앞자리 그림   | 20 (60×60px) | `iconSize.sm` (스파클과 같은 칸)         |
 *   | 좌우 패딩     | 5~6 (15px)   | `spacing[6]`                             |
 *   | 그림-글자     | 4 (13px)     | `spacing[4]`                             |
 *   | 선택 테두리   | `#FE7139`    | `primary.primary`                        |
 *   | 선택 면       | `#FFF8F6`    | `over(primary.primaryWeak, 칩 면)`       |
 *   | 글자(양쪽)    | `#2A2A37`    | `label.normal`                           |
 *   | 글자 크기     | 13 (cap 28px)| `label.xSmall` / `xSmallWeak`            |
 *
 * 마지막 넷이 맞는지는 **칩 폭**으로 교차 검증했다. 위 값으로 계산한 폭이 시안 실측
 * (`한식` 61 · `샐러드` 72 · `AI 검색` 76)과 전부 0.5pt 안에서 맞는다 — 글자 크기를 13 이
 * 아닌 15 로 잡으면 여기서 5pt 넘게 벌어진다.
 *
 * 색 셋은 스포이드로 뽑은 새 hex 가 아니다 — `primary.primaryWeak`(`#fff4f099`)를 흰 면에
 * 얹으면 계산상 정확히 `#FFF8F6` 이 나온다. 시안이 처음부터 토큰을 쓰고 있었다는 뜻이다.
 *
 * ## 2026-07-31 판(잉크 면 + 반전 글자)을 접는 이유
 *
 * 그때 근거는 둘이었고, 둘 다 지금은 답이 있다.
 *
 *   1. **레시피 탭 카테고리 레일과 문법을 맞춘다.** 그 사이 더 가까운 이웃이 생겼다 —
 *      목록 화면에서 이 레일 **바로 아랫줄**이 `FilterChipRow`(=`SelectableChip`
 *      `variant="quiet"`)이고, 그쪽 선택은 이미 "옅은 주황 면 + gray-900 글자" 다.
 *      붙어 있는 두 줄이 서로 다른 선택 문법을 쓰는 쪽이 탭 사이의 차이보다 크게 보인다.
 *      시안도 두 줄을 같은 문법으로 그린다.
 *   2. **브랜드색이 지도 마커·`현재 지도에서 찾기` pill 과 엉킨다.** 그건 면을 주황으로
 *      **채울** 때의 이야기다. 여기서 쓰는 건 1pt 선과 4%짜리 틴트라 꽉 찬 주황 원(마커)과
 *      위계가 겹치지 않는다 — 시안 `A3_1` 이 실제로 그 둘을 한 화면에 놓고 있다.
 *
 * 미선택 면과 hairline 은 그대로 `mapOverlayChrome` 이다(다크 lower + line.alternative).
 * 시안은 목록에서 `line.neutral`(`#E8E8EA`) 한 단 진한 선을, 지도에서는 선 없이 그림자만
 * 쓰지만 그 선은 검색바·FAB 와 **공유하는** 값이라 이 파일에서 혼자 바꾸지 않는다.
 * 지도에서 배경과 칩을 실제로 가르는 것은 그래서 `FLOATING_SHADOW` 다 — 장식이 아니라
 * 경계 그 자체이고, `railChipSurface().shadow` 로 두 상태 모두에 실린다.
 *
 * ## 색은 여기서 안 고른다 — `categoryChipSurface.ts`
 *
 * 위 표의 색·굵기·그림자는 순수 함수 `railChipSurface({ active, mode, colors })` 가 값으로
 * 푼다. node 환경 테스트가 **호출해서 값을 비교**할 수 있어야 선택 표시를 통째로 지우는
 * 변이가 빨개진다(그 전에는 소스에 문자열이 있는지만 봐서 전부 초록이었다). 다크에서
 * 틴트를 깔지 않는 이유도 그 파일 머리말에 있다 — 다크 `primary.primaryWeak` 는 미정
 * 값(`#282828`)이라 얹으면 선택 칩 면이 미선택보다 **어두워진다**.
 *
 * ## 색맹 이중화 — 굵기는 **공짜**다
 *
 * 시안의 선택 신호는 색뿐이다(선택 라벨과 미선택 라벨은 굵기까지 픽셀이 같다). 그대로
 * 옮기면 색을 못 가리는 사람에게 선택 상태가 사라지므로 기존의 "고른 칩만 굵다" 를
 * **남긴다**. 대가가 없다는 근거: Pretendard 는 한글 글자폭이 Regular·Medium·SemiBold·
 * Bold 넷 다 1770/2048 로 **같다**(hmtx 확인). 굵기가 바뀌어도 한글 라벨의 칩 폭은 흔들리지
 * 않는다. 폭이 도는 건 라틴 라벨(영어 로케일)뿐이고, 라틴이 섞인 `AI 검색` 은 애초에
 * 토글이 아니라 굵어질 일이 없다.
 *
 * 테두리 **두께**로 이중화하지 않은 이유도 같다 — Yoga 는 border 를 padding 처럼 상자에
 * 더하므로 1→1.5pt 는 칩 폭을 흔든다. 두 상태의 테두리는 두께가 같고 색만 다르다.
 *
 * ## 안 고른 칩의 그림은 흐리지 않다
 *
 * 종전 45% 투명도는 레시피 캐러셀에서 가져온 값이었다. 시안은 미선택 칩도 3D 그림을
 * 100% 로 그린다(실측: 중식 `#FFCD38`/`#FF9200`, 샐러드 `#15C47E`, 일식 `#073240` — 전부
 * 원본 채도 그대로다. 45% 였다면 흰 면 위에서 `#FFEBC1` 쯤으로 떴어야 한다). 흐리게 만들
 * 길 자체를 막으려고 `CUISINE_ART` 의 prop 계약에서 `opacity` 를 뺐다 — 되돌리면 tsc 가
 * 먼저 막는다. "알록달록한 지도" 는 그림을 죽이는 대신 줄의 무게를 낮춰(40→32pt,
 * 15→13pt) 가라앉힌다. 그게 시안의 처방이다.
 *
 * ## `AI 검색` 은 선택이 아니라 액션이다
 *
 * 눌러도 `selected` 상태가 되지 않고 AI 검색 시트를 연다. 그래서 `accessibilityState.selected`
 * 를 붙이지 않는다 — 붙이면 스크린리더가 토글이라고 알려 준다. 브랜드색 반짝임은
 * 이 칩 하나에만 남는다(액션이라 카테고리 선택과 다른 신호를 줘야 한다).
 *
 * ## 음식 아이콘은 currentColor 가 아니다
 *
 * `assets/images/{korean,chinese,...}.svg` 는 여러 색이 박힌 **일러스트**다(아이콘이 아니다).
 * v2 아이콘 규칙("hex 하드코딩 금지, currentColor 만")은 단색 글리프에 대한 규칙이고,
 * 이 자산들은 컬러 일러스트라 그 규칙의 대상이 아니다. 대신 v2 레지스트리에 넣지 않고
 * 여기서 직접 import 한다 — 레지스트리는 색을 받는 글리프만 담는다. 레시피 카드가 쓰는
 * 표(`RECIPE_CATEGORY_ART`)와 같은 파일들이다.
 */

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type ViewStyle,
} from "react-native"
import { useTranslation } from "react-i18next"
import type React from "react"

import {
  V2Icon,
  controlHeight,
  iconSize,
  radius,
  spacing,
  touchTarget,
  useV2Theme,
} from "@/src/design-system-v2"

import { dynamicKey } from "@/src/i18n/dynamicKey"

import type { CuisineType } from "../types"
import { RAIL_CUISINE_TYPES } from "../data/filterCatalog"
import { CUISINE_ART } from "./cuisineArt"
import { railChipSurface } from "./categoryChipSurface"

import { RAIL_INSET } from "../layout"

/** 시안 실측 96px/3 = 32. DS 사다리에 그대로 있다(작은 칩 = `SelectableChip size="s"` 와 같은 값). */
const HEIGHT = controlHeight.sm

/**
 * 32pt 칩은 최소 터치 44 에 못 미친다. 박스를 키우지 않고 **세로로만** 늘린다 — 가로로
 * 늘리면 6pt 떨어진 이웃 칩과 히트 영역이 겹쳐 어느 쪽이 잡히는지 예측할 수 없다
 * (`SelectableChip` 과 같은 처방). 이 6 이 스크롤뷰에 잘리지 않는 것은 `RAIL_PAD_VERTICAL`
 * 이 보장한다 — 그 관계는 테스트가 두 적용값을 파싱해 비교한다.
 */
const VERTICAL_HIT_SLOP = (touchTarget.min - HEIGHT) / 2

/**
 * 칩 사이. 시안 실측 18px/3 = 6 이고, **`layout.CHIP_GAP`(8)이 아니다** — 같은 시안에서
 * 아랫줄 필터 칩은 24px(=8)로 떨어져 있다. 그림이 붙은 이 줄만 한 단 좁다.
 */
const RAIL_CHIP_GAP = spacing[6]

/**
 * 칩 앞자리는 **20pt 정사각 한 칸**이다 — `AI 검색` 의 스파클도 같은 칸을 쓴다.
 *
 * 시안에서 중식·일식 그림의 상자를 재면 정확히 60×60px(=20)이고, 스파클 칩의 남는 폭을
 * 역산해도 같은 20 이 나온다. 종전 값(22×20)은 일러스트 viewBox 비율(32×28 ~ 37×35)에
 * 맞춘 것이었는데, 정사각 상자가 `pngIcon` 이 서 있는 전제이기도 하다 — 그 파일 머리말:
 * "정사각 상자에 contain 으로 앉히면 납작한 그림(초밥)은 자연히 낮게, 둥근 그림은 꽉 차게
 * 그려져 SVG 형제와 광학 크기가 맞는다".
 */
const ART_SIZE = iconSize.sm

/**
 * 레일 안쪽 세로 패딩. **두 개를 동시에 덮어야 하는 값**이다.
 *
 *   - `FLOATING_SHADOW` 의 도달 거리 = 반경 8 + 아래 오프셋 2 = **10**. ScrollView 는
 *     자식을 자기 높이에 맞춰 자르므로, 이보다 작으면 그림자가 칩 위아래에서 뚝 끊겨
 *     "칩이 잘려 보인다"(QA 2026-08-06).
 *   - `VERTICAL_HIT_SLOP` = **6**. hitSlop 도 스크롤뷰 프레임 밖으로는 못 나간다
 *     (`FilterChipRow` 머리말의 같은 함정).
 *
 * 같은 값의 네거티브 마진으로 상쇄해 바깥 레이아웃 리듬은 그대로 둔다 — 그래서 둘은
 * 한 상수를 봐야 한다.
 */
const RAIL_PAD_VERTICAL = spacing[12]

export interface CategoryChipRailProps {
  /** 레일은 **단일 선택**이다. 선택 없음은 `null`. */
  selected: CuisineType | null
  onSelect: (type: CuisineType | null) => void
  onPressAiSearch: () => void
  /** 좌우 인셋. 검색바와 같은 값이어야 왼쪽 선이 맞는다. */
  insetHorizontal?: number
  style?: ViewStyle
}

export function CategoryChipRail({
  selected,
  onSelect,
  onPressAiSearch,
  insetHorizontal = RAIL_INSET,
  style,
}: CategoryChipRailProps) {
  const { t } = useTranslation("common")

  return (
    <ScrollView
      horizontal
      bounces={false}
      overScrollMode="never"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        styles.content,
        { paddingLeft: insetHorizontal, paddingRight: insetHorizontal },
      ]}
      /* 잘림 방지는 `RAIL_PAD_VERTICAL` 이 맡는다(그 상수 머리말). */
      style={[styles.rail, style]}
    >
      <RailChip
        label={t("restaurant.map.aiSearch")}
        onPress={onPressAiSearch}
        /* 색은 아이콘 파일이 정한다(두 톤 채움) — registry 의 sparkle 주석. */
        leading={<V2Icon name="sparkle" size={iconSize.sm} />}
      />
      {/*
        "전체" 칩은 두지 않는다(레시피 캐러셀과 같은 판단, 2026-08-04).

        한때 세웠던 이유는 "되돌리는 길이 화면에 안 보인다" 였는데, 이 레일은 원래부터
        **고른 칩을 다시 누르면 해제**되는 단일 선택이다. 전체 칩은 그 위에 "선택 없음"
        을 한 번 더 말하는 중복이었고, 음식 일러스트만 있는 줄에 글자 칩 하나가 끼어
        줄의 성격도 흐렸다.
      */}
      {RAIL_CUISINE_TYPES.map((spec) => {
        const Art = CUISINE_ART[spec.value]
        const isSelected = selected === spec.value
        return (
          <RailChip
            key={spec.value}
            label={t(dynamicKey(spec.labelKey))}
            selected={isSelected}
            // 같은 칩을 다시 누르면 해제된다(단일 선택 토글).
            onPress={() => onSelect(isSelected ? null : spec.value)}
            /* 고르든 안 고르든 **같은 그림**이다(머리말 §총천연색). 상태는 칩이 말한다. */
            leading={
              Art ? <Art width={ART_SIZE} height={ART_SIZE} /> : undefined
            }
          />
        )
      })}
    </ScrollView>
  )
}

function RailChip({
  label,
  selected,
  onPress,
  leading,
}: {
  label: string
  /** `undefined` = 토글이 아닌 액션 칩. 스크린리더에 선택 상태를 알리지 않는다. */
  selected?: boolean
  onPress: () => void
  leading?: React.ReactNode
}) {
  const { colors, mode } = useV2Theme()
  const isToggle = selected !== undefined
  const active = selected === true
  /*
    면·테두리·잉크·굵기·그림자는 전부 여기서 값으로 온다. 이 파일은 그것을 어디에
    얹을지만 정한다 — 그래야 node 테스트가 렌더 없이 해석된 값을 검사할 수 있다.
  */
  const surface = railChipSurface({ active, mode, colors })

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isToggle ? { selected: active } : undefined}
      hitSlop={{ top: VERTICAL_HIT_SLOP, bottom: VERTICAL_HIT_SLOP }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        // 지도 배경과 칩을 가르는 경계 그 자체. 두 상태가 같이 갖는다(머리말).
        surface.shadow,
        {
          backgroundColor: surface.backgroundColor,
          borderColor: surface.borderColor,
          // 두 상태가 같은 두께. 갈리면 Yoga 가 칩 폭을 흔든다.
          borderWidth: surface.borderWidth,
        },
        pressed && styles.pressed,
      ]}
    >
      {leading}
      <Text
        style={[surface.typography, { color: surface.color }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  // 가로 ScrollView 기본 flexGrow가 리스트 화면의 남은 세로 공간을 먹지 않게 한다.
  // 지도에서는 absolute overlay라 차이가 없고, 목록에서는 칩 높이만 차지해야 한다.
  rail: { flexGrow: 0, marginVertical: -RAIL_PAD_VERTICAL },
  content: {
    gap: RAIL_CHIP_GAP,
    alignItems: "center",
    paddingVertical: RAIL_PAD_VERTICAL,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    /*
      앞자리 그림과 라벨 사이. 시안에서 그림 상자 오른끝과 글자 사이가 13px(≈4)다.

      좌우 패딩 6 은 그 상자에서 테두리까지의 15px(=5)를 사다리로 올린 값이고, 세로
      패딩 6(=(32-20)/2)과 우연히 같아졌다. 이 셋을 넣고 계산한 칩 폭은 시안의 실측
      폭과 0.5pt 안에서 맞는다(`한식` 61 · `샐러드` 72 · `AI 검색` 76 —
      `restaurantCategoryChip.test.ts` 가 그 계산을 붙들고 있다).
    */
    gap: spacing[4],
    height: HEIGHT,
    paddingHorizontal: spacing[6],
    borderRadius: radius.full,
  },
  pressed: { opacity: 0.85 },
})
