/**
 * 레시피 작성 — 태그 한 그룹을 **가로 한 줄**로 놓는 레일.
 *
 * `WriteChipGroup`(줄바꿈 wrap) 을 대체**했다** — 그 파일은 이제 없다. 갈아 끼울 때
 * prop 이름을 한 글자도 바꾸지 않아서 호출부는 컴포넌트 이름만 고치면 됐다.
 *
 * ## 왜 wrap 이 아니라 레일인가
 * 영양 기준·병기·음식 종류 세 그룹이 세로로 붙어 있는데, wrap 은 그룹마다 높이가
 * 제각각(1줄/2줄/3줄)이 된다. 작성 화면은 이 아래로 재료·조리순서·설명이 더 있는
 * 긴 폼이라, 접기를 없앤 지금 세로 길이가 곧 이탈률이다. 한 줄로 눕히면 그룹 높이가
 * 셋 다 같아지고 "여기서 저기까지가 한 그룹" 이 눈으로 잡힌다.
 * 대신 오른쪽에 더 있다는 사실이 화면 밖으로 나가므로, **레일은 화면 가로 전체를 써서**
 * 마지막 칩이 오른쪽 가장자리에 걸쳐 보이게 한다(§인셋).
 *
 * ## 칩을 손으로 그리지 않는다
 * 시안 칩(32 높이 pill, 13 semibold)은 `V2Chip size="s"` 와 **치수까지 같다**.
 * `WriteChipGroup` 은 v2 이전 것이라 칩을 직접 그렸고(36 높이·radius 10·14/500),
 * 그래서 같은 앱 안에서 필터 칩과 작성 칩의 생김새가 갈렸다. 여기서는 v2 칩을 쓴다 —
 * 선택 표시(면 + 글자 굵기), 세로 hitSlop 44, `accessibilityState.selected` 가
 * 전부 `V2Chip` 안에 이미 있다(직접 읽어 확인했다). 그래서 접근성 래핑도 하지 않는다.
 *
 * 다만 **hitSlop 은 칩이 준다고 끝나는 것이 아니다.** 두 군데서 잘린다.
 * (1) 가로 ScrollView 는 자식이 자기 경계 밖으로 내민 부분을 자르므로, 레일이 위아래로
 *     자리를 내주지 않으면 칩이 붙인 6pt 가 그대로 잘린다(`railContent` 주석).
 * (2) 자리를 내주고 그만큼을 음수 마진으로 되갚으면 이번엔 **레일이 부모 박스 밖으로
 *     6pt 내려선다.** RN 은 `ViewPropTypes.d.ts` 에 "The touch area never extends past
 *     the parent view bounds" 라고 적어 두었으므로, 레일이 `wrap` 의 마지막 자식인
 *     호출부(= `notice` 없는 음식 종류 레일)에서는 아래쪽 슬롭이 부모 밖이라 죽는다
 *     (44 → 38). 그래서 `wrap` 도 같은 짝을 한 번 더 쓴다(`styles.wrap` 주석).
 *
 * `tone="brand"` 다. 이 화면에서 브랜드색을 쓰는 다른 요소는 하단 등록 CTA 하나뿐이고,
 * 그건 스크롤과 무관한 고정 바라 칩 줄과 같은 시야에서 강조를 다투지 않는다.
 *
 * ## 시안의 1px 칩 보더는 넣지 않는다
 * 시안에는 칩마다 `line.neutral`(8%) 테두리가 있지만 **채택하지 않는다.** v2 는
 * 보더리스가 정책이고(`V2Chip` 머리말), 미선택 칩의 `fill.normal` 면이 흰 바닥 위에서
 * 이미 경계 노릇을 한다. 보더를 넣으면 선택/미선택 사이에서 칩 폭이 흔들리거나
 * (보더를 선택 때만 그릴 경우) 주황 면 위에 회색 테가 겹친다. 여기 하나만 테두리가
 * 생기면 앱 안의 다른 모든 칩과도 어긋난다.
 *
 * ## 인셋은 왜 `contentContainerStyle` 인가
 * 컨테이너에 `paddingHorizontal` 을 주면 **뷰포트 자체가 좁아져** 끝까지 밀어도
 * 마지막 칩이 화면 끝에서 잘린다(`LAYOUT.railInset` 머리말·`CategoryChipRail` 선례).
 * 그래서 컨테이너는 화면 끝까지 살려 두고 여백은 내용에 준다.
 *
 * 부모 섹션이 `paddingHorizontal: LAYOUT.screenX` 를 걸고 있으므로 레일만
 * 음수 마진으로 그 밖으로 빼낸다. 라벨과 notice 는 **음수 마진 밖**에 둔다 —
 * 그것들은 다른 섹션 제목들과 같은 시작선(`screenX`)에 서야 한다.
 *
 * ## 위계
 * 라벨/notice 의 크기·색은 지워진 `WriteChipGroup` 에서 그대로 가져왔다. 그 파일이
 * 실사용 피드백("분류 제목이 항목보다 작으니 어색")을 받고 라벨 15/700 · 칩 글자를 한 단
 * 내리는 것으로 조정해 둔 값이라, 여기서 다시 고르면 그 조정이 지워진다.
 * 칩 글자가 13(`size="s"`)으로 한 단 더 내려가면서 라벨과의 간격은 오히려 벌어졌다.
 * (그 조정이 정한 것은 **보이는 크기**다. `hint`·`notice` 의 12px 은 그대로 두고
 *  행간만 스케일 정본을 가리키게 바꿨다 — `styles.hint` 주석.)
 */

import { ScrollView, StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"

import { V2Chip, controlHeight, touchTarget } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE } from "@/src/theme/surface"

/**
 * `V2Chip size="s"` 가 위아래로 내미는 hitSlop = (44 - 32) / 2 = **6**.
 *
 * 6 을 적지 않고 같은 식으로 다시 세는 이유: 레일이 비워 줘야 하는 자리는 "6pt" 가
 * 아니라 **칩이 내미는 만큼**이다. 칩 높이나 최소 터치 규격이 바뀌면 여기도 같이
 * 따라와야 한다. 식은 `V2Chip` 본문(`(touchTarget.min - s.height) / 2`)과
 * `restaurant/components/CategoryChipRail.tsx::VERTICAL_HIT_SLOP` 이 쓰는 것과 같다.
 */
const CHIP_HIT_SLOP = (touchTarget.min - controlHeight.sm) / 2

interface WriteChipRailProps {
  label: string
  /**
   * 필수 항목 표시(브랜드색 `*`). `WriteTextField` 와 **같은 표식**을 쓴다 —
   * 같은 화면에서 "안 적으면 등록이 안 되는 칸" 이 칸 종류마다 다르게 보이면
   * 사용자는 별이 붙은 것만 채우고 회색 버튼 앞에서 막힌다.
   */
  required?: boolean
  /** 라벨 옆 한 줄(예: "하나만 고를 수 있어요"). */
  hint?: string | null
  /** 그룹 아래 안내(병기 태그의 표시 규칙 등). */
  notice?: string | null
  options: { value: string; label: string }[]
  selected: string[]
  onToggle: (value: string) => void
}

export function WriteChipRail({
  label,
  required = false,
  hint,
  notice,
  options,
  selected,
  onToggle,
}: WriteChipRailProps) {
  const s = useSurface()

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: s.textStrong }]}>
          {label}
          {required ? <Text style={{ color: s.brand }}> *</Text> : null}
        </Text>
        {hint ? (
          <Text style={[styles.hint, { color: s.textWeak }]}>{hint}</Text>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        /*
          `flexGrow: 0` 이 없으면 가로 ScrollView 가 폼의 남은 세로 공간을 먹는다
          (그룹 사이가 화면 높이에 따라 벌어진다). 높이는 칩 하나여야 한다.
        */
        style={styles.rail}
        contentContainerStyle={styles.railContent}
      >
        {options.map((option) => (
          <V2Chip
            key={option.value}
            label={option.label}
            selected={selected.includes(option.value)}
            onPress={() => onToggle(option.value)}
            size="s"
            tone="brand"
          />
        ))}
      </ScrollView>
      {notice ? (
        <Text style={[styles.notice, { color: s.textMuted }]}>{notice}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  /*
    라벨 ↔ 컨트롤 사이. **8 이다.** 이 화면의 다른 폼 블록이 전부 8 로 서 있다 —
    `WriteTextField`·`StepSummaryField`·`AuthorContextRow`·`IngredientEditor`·
    `PhotoPickerRow` 의 `wrap` 을 열어 보면 다섯 다 `{ gap: 8 }` 이다(직접 확인했다).
    여기만 10 이면 같은 세로 스크롤 안에서 분류 두 블록의 라벨만 2pt 더 떠 보인다 —
    한 줄 안에서는 안 보이지만 블록이 이어 붙으면 리듬이 어긋난 것으로 읽힌다.

    반대로 다섯을 10 으로 올리는 길도 있었지만, 8 은 이 파일 하나가 아니라 폼 전체가
    이미 서 있는 값이라 소수 쪽을 맞추는 것이 맞다.

    `paddingBottom`/`marginBottom` 은 배치가 아니라 **과녁**이다(머리말 hitSlop (2)).
    아래 `rail` 의 `marginVertical: -CHIP_HIT_SLOP` 때문에 레일 프레임의 밑변이 이
    블록의 밑변보다 6pt 아래에 선다. `notice` 가 없어 레일이 마지막 자식인 호출부에서는
    그 6pt 가 곧 부모 밖이라 칩의 아래쪽 슬롭이 잘린다. 그래서 프레임만 6 늘리고 같은
    값의 음수 마진으로 바깥 배치를 되돌린다 — 보이는 자리는 1pt 도 안 움직인다.
    선례는 `IngredientEditor.wrap`(같은 짝, 값은 그쪽 과녁에 맞춘 7).
    늘어난 6 은 섹션의 `paddingVertical: 24`·`gap: 20`(`RecipeWriteScreen.section`) 안이라
    다음 블록도 화면 끝도 밟지 않는다.
  */
  wrap: { gap: 8, paddingBottom: CHIP_HIT_SLOP, marginBottom: -CHIP_HIT_SLOP },
  labelRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  label: { ...TYPE.cardTitle, fontWeight: "700" },
  /*
    12px 은 스케일에 `cardSub`(12/16) 로 이미 있다. 예전에는 `caption`(13/18) 위에
    크기만 덮어써서 12px 글자가 13px 용 행간을 끌고 다녔다 — `hint` 는 12/18,
    `notice` 는 손으로 적은 12/17. **12/17 도 12/18 도 v2 스케일에 없는 조합**이고,
    그 바람에 한 화면 안에서 12px 글자의 행간이 16·17·18 셋으로 갈렸다(이번 회차에
    `WriteTextField.labelSuffix` 를 비롯한 나머지는 전부 `cardSub` 로 옮겼다).
    보이는 글자 크기는 그대로고 이름만 정본을 가리킨다 — `TYPE` 표의 "크기를 여기서
    새로 정하지 말라" 는 규칙이 원래 가리키던 자리다.
  */
  hint: { ...TYPE.cardSub },
  /*
    부모 섹션의 가로 여백을 상쇄해 레일만 full-bleed 로 만든다. 상쇄값과 아래
    `paddingHorizontal` 은 같은 상수(`SCREEN_X`)에서 나오므로 정확히 맞물린다 —
    `railInset` 은 "가로 스크롤 첫 항목의 인셋" 이라는 뜻으로 따로 이름이 붙어 있을 뿐
    값은 `screenX` 와 같다.
  */
  rail: {
    flexGrow: 0,
    marginHorizontal: -LAYOUT.screenX,
    /*
      아래 `paddingVertical` 을 되돌려 바깥 세로 리듬(라벨-레일-notice)을 그대로 둔다.
      선례는 `restaurant/components/CategoryChipRail.tsx` — 그쪽도
      `rail: { marginVertical: -12 }` / `content: { paddingVertical: 12 }` 짝이다
      (거기서는 그림자가 잘리는 문제였고 값이 12 인 것도 그 때문이다).
    */
    marginVertical: -CHIP_HIT_SLOP,
  },
  railContent: {
    // 칩 간격 6 은 시안 실측값이다(칩 높이 32 / pill).
    gap: 6,
    alignItems: "center",
    paddingHorizontal: LAYOUT.railInset,
    /*
      **칩의 세로 hitSlop 이 살아 있을 자리.** ScrollView 는 자식이 자기 경계 밖으로
      내민 것을 자르므로, 세로 패딩이 0 이면 `V2Chip` 이 붙여 둔 위아래 6 이 그대로
      잘려 실효 터치가 칩 높이 32 로 되돌아간다(= 44 미달).
    */
    paddingVertical: CHIP_HIT_SLOP,
  },
  // `hint` 와 같은 급이다(위 주석).
  notice: { ...TYPE.cardSub },
})
