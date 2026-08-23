/**
 * 아무것도 안 물어본 상태의 시트 본문 — 두 줄짜리 그라데이션 문구 하나.
 *
 * 문구는 시안(E2_1) 그대로 `궁금한 식단이나 메뉴를 / 편하게 물어보세요.` 다.
 * 22/30 Bold 두 줄이 이 시트의 첫 화면을 통째로 지배하므로, 여기서 문장을 다시 쓰지 않는다 —
 * 바꿀 이유가 생기면 시안을 먼저 바꾸고 그 근거를 이 머리말에 남긴다.
 *
 * ## 그라데이션을 어떻게 그렸나 (판단과 근거)
 *
 * 시안은 22/30 Bold 두 줄이 왼쪽 위 `navy[300]`(#a8c0ed)에서 오른쪽 아래
 * `orange[700]`(#fe7139)으로 넘어간다. 셋 중 하나를 골라야 했다.
 *
 * 1. **마스크 + 그라데이션** — `@react-native-masked-view/masked-view` 가 **설치돼 있지 않다**
 *    (package.json·node_modules 둘 다 확인). 이 문구 하나 때문에 네이티브 의존성을 하나 더
 *    들이는 것은 값이 안 맞는다(리빌드 사이클이 붙는다).
 * 2. **`react-native-svg` 의 `<Text fill="url(#g)">`** — 라이브러리는 있다(15.15.3). 그런데
 *    SVG 텍스트는 **줄바꿈도 축소도 하지 않는다.** 한국어 문구는 `\n` 이 박힌 고정 2줄이라
 *    괜찮지만 영어는 `What would you like to know / about this restaurant?` 로 훨씬 길고,
 *    22pt Bold 에서 327pt 열을 넘긴다 — 그때 **경고도 예외도 없이 글자가 잘린다.** 게다가
 *    SVG 텍스트의 `fontFamily` 는 expo-font 로 올린 Pretendard face 를 플랫폼마다 같은 이름으로
 *    찾아 준다는 보장이 없다(찾지 못하면 조용히 시스템 서체로 그린다). 조용한 고장 둘을
 *    문구 장식 하나와 바꾸지 않는다.
 * 3. **글자마다 색을 옮긴다** ← 채택. 평범한 RN 텍스트 트리를 그대로 쓰므로 줄바꿈·어절
 *    끊기·서체·스크린리더가 전부 살아 있고, 색만 navy → orange 로 걸어간다.
 *    22pt 에서 20자 안팎이면 계단이 눈에 안 보인다.
 *
 * 되돌린다면 3 → 1 이다(마스크가 들어오면 진짜 그라데이션이 된다). 2 로는 가지 말 것.
 *
 * ## 시안의 램프는 읽는 순서가 아니라 **공간**이다 (실측으로 고침)
 *
 * 정본 SVG(`Light.svg` 의 `paint8_linear_4892_103358`)는 userSpace 벡터
 * (618.5, 5119.5) → (632.5, 5168.5) 다 — 길이 51, **수직에서 16° 기운 거의 세로 벡터**다.
 * 문구 열은 200pt 폭이라 한 줄을 가로지르는 것만으로 램프를 다 쓴다. E2_1 픽셀에서 t 를
 * 역산하면(글자 잉크를 흰 바탕과의 알파 합성으로 풀어 FROM→TO 선에 투영):
 *
 * | | 줄 첫 글자 | 줄 끝 글자 |
 * |---|---|---|
 * | 1행 | 0.00 | 1.00 |
 * | 2행 | **0.60** | 1.00 (x≈105pt 에서 이미 도달, 이후 순주황) |
 *
 * 즉 **2행 첫 글자에서 중간톤으로 되돌아간다.** 글자 index 로 단조증가하는 램프는 그
 * 되돌아감을 원리적으로 만들 수 없다 — 예전 머리말이 "대각선이 곧 읽는 순서" 라고 적어 둔 것은
 * 틀렸다. 그래서 t 를 **행 안의 x 진행 + 행 시작값**으로 잡는다(1행 0→1, 2행 0.6→1).
 * 덤으로 잉크가 없는 `\n` 이 램프 한 칸을 먹던 것도 사라진다(공백은 실제로 x 를 차지하므로
 * 계속 센다 — 그게 맞다). 남는 오차는 2행 뒷부분이다: 시안은 거기서 이미 t=1 로 잠기는데
 * 우리는 줄 끝까지 선형으로 익는다. 글자 폭이 아니라 글자 수로 x 를 근사하는 값이라
 * 그 이상 맞출 수 없고, 눈으로는 마지막 두어 글자의 미세한 차이다.
 */

import { StyleSheet } from "react-native"
import { useTranslation } from "react-i18next"

import { V2Text, V2VStack } from "@/src/design-system-v2"
import { primitives, SHEET_GUTTER } from "@/src/design-system-v2/tokens"

import { CONSULT_TOP_GAP } from "./consultSheetMetrics"

/** 시안 실측: 벡터 시작점 `primitives.navy[300]`. */
const FROM = primitives.navy[300]
/** 시안 실측: 벡터 끝점 `primitives.orange[700]`(= `colors.primary.primary`). */
const TO = primitives.orange[700]

/**
 * 두 번째 줄이 다시 출발하는 t. 시안 실측 0.60.
 *
 * 3행 이상은 시안에 없다. 램프가 그만큼 더 빨리 소진된다는 뜻이므로 `row * 0.6` 을 1 에서
 * 자른다 — 3행부터는 통째로 순주황이다. 문구가 세 줄이 될 일이 생기면 그때 시안을 다시 잰다.
 */
const ROW_START = 0.6

function channels(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ]
}

const FROM_RGB = channels(FROM)
const TO_RGB = channels(TO)

/**
 * 두 색 사이 `ratio`(0..1) 지점. sRGB 선형 보간이다 — 파랑↔주황은 색상환을 반 바퀴 도는
 * 짝이라 어떤 보간을 써도 중간이 탁해지는데, 시안의 중간색(살구빛)이 정확히 sRGB 보간의
 * 중간이다. 색 공간을 바꾸면 시안과 다른 색이 나온다.
 */
function mix(ratio: number): string {
  const rgb = FROM_RGB.map((from, index) =>
    Math.round(from + (TO_RGB[index] - from) * ratio),
  )
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
}

export function ConsultSheetEmpty() {
  const { t } = useTranslation()
  const text = t("restaurant.consult.emptyTitle")

  return (
    <V2VStack style={styles.body}>
      {/*
        스크린리더는 중첩 텍스트를 이어 읽지만, 글자 단위로 끊어 읽는 판이 있어
        부모에 완성 문장을 한 번 더 박아 둔다.
      */}
      <V2Text
        token="title.medium"
        accessibilityLabel={text}
        lineBreakStrategyIOS="hangul-word"
      >
        {text.split("\n").flatMap((row, rowIndex) => {
          // 서로게이트 쌍을 쪼개지 않게 코드포인트로 자른다. 지금 문구는 전부 BMP 지만,
          // 문구는 바뀌고 쪼개진 글자는 화면에서 ▯ 로 보인다.
          const glyphs = [...row]
          const last = Math.max(1, glyphs.length - 1)
          const start = Math.min(1, rowIndex * ROW_START)
          const painted = glyphs.map((glyph, index) => (
            <V2Text
              key={`${rowIndex}-${index}-${glyph}`}
              color={mix(start + (1 - start) * (index / last))}
            >
              {glyph}
            </V2Text>
          ))
          // 개행은 색을 입히지 않는다 — 잉크가 없는 글자에 램프를 한 칸 쓰면 그만큼 흐려진다.
          return rowIndex === 0 ? painted : ["\n", ...painted]
        })}
      </V2Text>
    </V2VStack>
  )
}

const styles = StyleSheet.create({
  body: {
    // 빈 상태 문구만 24 다(시안 실측 잉크 x=24.33 = `SHEET_GUTTER`). 대화가 시작되면
    // 본문은 채팅 거터 20 으로 바뀐다 — 두 상태는 서로 다른 판이고 시안도 그렇게 그렸다.
    paddingHorizontal: SHEET_GUTTER,
    paddingTop: CONSULT_TOP_GAP,
  },
})
