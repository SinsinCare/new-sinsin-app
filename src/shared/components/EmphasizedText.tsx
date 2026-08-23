import { Text } from "@/src/shared/components/AppText"

/**
 * 문장 속 양(量)만 강조하는 텍스트 — 두 리포트(식사·통계)가 같이 쓴다.
 *
 * **줄바꿈이 이 컴포넌트의 진짜 일이다.** "체중이 27│일보다" 처럼 숫자와
 * 단위 사이에서 줄이 갈라지는 문제가 실제로 나왔다(사용자 캡처). 원인은 둘:
 *
 * 1. 숫자→한글 경계는 유니코드 줄바꿈 규칙(UAX#14)상 허용 지점이라
 *    `lineBreakStrategyIOS="hangul-word"` 로도 못 막는다.
 * 2. 중첩 <Text> 스팬의 경계도 줄바꿈 후보가 된다 — "27일"과 "보다"가
 *    스팬이 다르면 한 어절인데도 갈라진다.
 *
 * 둘 다 워드 조이너(U+2060, 폭 0·비줄바꿈)로 봉쇄한다: 토큰 내부의
 * 숫자→문자 전환점과, 공백 없이 붙은 스팬 경계에 심는다.
 * 값은 건드리지 않는다 — 조이너는 보이지 않는 글자다.
 */

//: 강조 대상 — 부호·수·(분수)·단위. 한글 셈 단위(일·끼·회·번·건·주)까지 삼켜
//: "27일" 이 통째로 한 스팬이 되게 한다.
const AMOUNT =
  /([+-]?\d[\d,]*(?:\.\d+)?(?:\/\d[\d,]*)?\s?(?:mmHg|kcal|mg|ml|kg|g|%|일|끼|회|번|건|주)?)/

const WJ = "\u2060"

/** 토큰 내부의 숫자↔문자 전환점을 잇는다: "27일" → "27⁠일", "0.4kg" → "0.4⁠kg". */
function joinInside(token: string): string {
  return token.replace(/(\d)(?=[가-힣A-Za-z%])/g, `$1${WJ}`)
}

export function EmphasizedText({
  children,
  style,
  emphasisColor,
  emphasisWeight = "800",
  ...rest
}: {
  children: string
  style: object | object[]
  emphasisColor: string
  emphasisWeight?: "700" | "800"
} & Record<string, unknown>) {
  // split 에 캡처 그룹을 주면 일치 부분이 홀수 인덱스로 들어온다.
  const parts = children.split(new RegExp(AMOUNT.source, "g"))

  const nodes = parts.map((part, i) => {
    if (i % 2 === 1) {
      // 앞 조각이 공백 없이 끝났으면("총27일" 류) 경계도 잇는다.
      const prev = parts[i - 1] ?? ""
      const lead = prev && !/\s$/.test(prev) ? WJ : ""
      return (
        <Text
          key={i}
          style={{ color: emphasisColor, fontWeight: emphasisWeight }}
        >
          {lead + joinInside(part)}
        </Text>
      )
    }
    // 강조 토큰 뒤에 공백 없이 이어지는 조사("27일보다")는 같은 어절이다 —
    // 경계에 조이너를 붙여 스팬이 달라도 한 덩어리로 줄바꿈되게 한다.
    const followsEmphasis = i > 0 && part && !/^\s/.test(part)
    return (followsEmphasis ? WJ : "") + part
  })

  return (
    <Text
      lineBreakStrategyIOS="hangul-word"
      textBreakStrategy="balanced"
      style={style}
      {...rest}
    >
      {nodes}
    </Text>
  )
}
