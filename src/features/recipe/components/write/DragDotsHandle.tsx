/**
 * 조리순서 행을 잡아 끄는 2열 × 3행 점 손잡이.
 *
 * ## 왜 아이콘이 아니라 `View` 6개인가
 * v2 아이콘 레지스트리에 dots/grid/drag 계열 글리프가 **없다**(찾아 봤다). 그래서 선택지는
 * 셋이었다.
 *
 * 1. SVG 자산을 새로 넣는다 — 점 6개짜리 글리프 하나 때문에 아이콘 팩과 그 로딩 경로를
 *    늘리는 것은 비용이 이득보다 크다. 이 모양은 사각형 6개가 전부라 벡터가 표현할 것이
 *    없다.
 * 2. `Ionicons` 에서 비슷한 것(`reorder-three`, `ellipsis-vertical`)을 빌려 온다 —
 *    3줄 막대나 세로 점 3개는 시안의 2×3 격자와 **다른 모양**이다. 손잡이는 "여기를
 *    잡아라" 를 알리는 관습적 기호라, 관습에서 벗어난 대체 글리프는 손잡이로 안 읽힌다.
 * 3. `View` 6개 — 의존성 0, 색은 토큰에서 오고, 크기는 실측값 그대로다. 이것을 골랐다.
 *
 * ## 왜 접근성 요소가 아닌가
 * 점 자체는 아무 의미도 나르지 않는 장식이다. "순서 바꾸기" 라는 뜻과 그 조작 수단은
 * 부모 행이 `accessibilityRole="adjustable"` 로 이미 갖고 있다. 여기에 라벨을 또 달면
 * 스크린리더가 같은 행을 두 번 읽는다.
 *
 * ## 왜 `pointerEvents="none"` 이 없는가
 * 드래그 제스처가 **이 점들 위에서 시작한다.** 터치를 흘려 보내면 손잡이를 정확히 잡은
 * 사용자만 재정렬을 못 하게 된다 — 접근성 숨김과 터치 통과는 별개다.
 */

import { StyleSheet, View } from "react-native"

import { useSurface } from "@/src/hooks/useSurface"

/**
 * 점 지름. 실측(시안 375pt 프레임)에서 지름 3, 간격 3 ⇒ 상자 9 × 15 다.
 *
 * 한때 `DOT = { s: 2, m: 3 }` 표와 `size` prop 으로 두 크기를 고를 수 있었는데,
 * **작은 쪽을 부르는 곳이 하나도 없었다**(유일한 호출부인 `StepSheet` 은 `color` 만
 * 넘긴다). 도달할 수 없는 갈래는 시안에 없는 두 번째 손잡이 크기가 있는 것처럼
 * 보이게 할 뿐이라 상수 하나로 접었다. 작은 손잡이가 실제로 필요해지는 날
 * prop 을 되살리면 된다 — 그때는 부르는 자리가 생긴 뒤다.
 */
const DOT = 3

/** 간격 = 점 지름. 실측 3/3 이 그랬고, 그 비율이라야 격자로 읽힌다. */
const GAP = DOT

const COLUMNS = [0, 1]
const ROWS = [0, 1, 2]

interface DragDotsHandleProps {
  /** 기본은 `useSurface().textWeak`. 들어올린 행에서 브랜드색으로 올릴 때만 넘긴다. */
  color?: string
}

export function DragDotsHandle({ color }: DragDotsHandleProps) {
  const s = useSurface()
  const tint = color ?? s.textWeak

  return (
    <View
      style={styles.box}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {COLUMNS.map((column) => (
        <View key={column} style={styles.column}>
          {ROWS.map((row) => (
            <View key={row} style={[styles.dot, { backgroundColor: tint }]} />
          ))}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    flexDirection: "row",
    gap: GAP,
  },
  column: { gap: GAP },
  // 색만 호출부에서 온다(들어올린 행은 브랜드색). 치수는 상수라 여기 굳혀 둔다.
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
})
