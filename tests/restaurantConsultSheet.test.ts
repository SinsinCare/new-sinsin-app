/**
 * 식당 상세 `AI 식단 상담` **시트 UI** 의 계약을 소스에서 고정한다.
 *
 * ## 왜 소스 가드인가 (정직하게)
 *
 * 이 저장소의 jest 는 `testEnvironment: "node"` 이고 `react-native` 는 `{ Platform }` 만
 * 남긴 스텁이다(`tests/helpers/reactNativeStub.js`). `@testing-library/react-native` 도
 * `react-test-renderer` 도 없고, `testMatch` 가 `*.test.ts` 라 `.tsx` 테스트는 **아예
 * 수집되지 않는다.** 즉 **버블이 어떻게 보이는지, 시트가 몇 pt 로 뜨는지, 키보드가 올라왔을 때
 * 입력바가 보이는지는 여기서 못 잡는다.** 그건 실기기 몫이다(iOS 소프트 키패드 ⌘K,
 * 안드로이드 `show_ime_with_hard_keyboard`).
 *
 * 잡을 수 있는 것은 **"우리가 어떤 부품을 쓰기로 했는가"** 이고, 이 기능에서 조용히 고장나는
 * 방식은 전부 그 층에 있다:
 *
 *  - 평범한 `TextInput` 을 쓰면 **경고도 예외도 없이** 시트가 키보드를 안 피한다.
 *  - 시트 안에 키보드 보정을 한 겹 더 얹으면 입력창이 화면 최상단으로 날아간다.
 *  - `Share.share` 를 직접 부르면 iOS 가 **조용히 무시한다.**
 *  - 면책을 조건 안에 넣으면 **한 번도 표시되지 않는 AI 답변 표면**이 생긴다.
 *
 * 넷 다 화면을 보고도 원인을 못 찾는 종류다. 그래서 문법이 아니라 **결정**을 센다.
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { codeOnly } from "./helpers/codeOnly"

const CONSULT_DIR = join(
  __dirname,
  "..",
  "src",
  "features",
  "restaurant",
  "components",
  "consult",
)

const SHEET_FILES = [
  "RestaurantConsultSheetHost.tsx",
  "ConsultSheetHeader.tsx",
  "ConsultSheetEmpty.tsx",
  "ConsultSheetBubbles.tsx",
  "ConsultSheetComposer.tsx",
  "ConsultSheetDisclaimer.tsx",
  "consultSheetMetrics.ts",
] as const

function read(file: string): string {
  return readFileSync(join(CONSULT_DIR, file), "utf8")
}

function code(file: string): string {
  return codeOnly(read(file))
}

const HOST = code("RestaurantConsultSheetHost.tsx")
const COMPOSER = code("ConsultSheetComposer.tsx")
const BUBBLES = code("ConsultSheetBubbles.tsx")
const DISCLAIMER = code("ConsultSheetDisclaimer.tsx")

/**
 * 문자열·템플릿 리터럴 **안의 괄호를 지운다.** 길이와 줄바꿈은 그대로 둔다 —
 * 아래 괄호 세기가 원본 오프셋으로 잘라 내야 하기 때문이다.
 *
 * `codeOnly` 는 주석만 걷어내고 문자열은 일부러 남긴다(그 파일 머리말). 그래서 여기서
 * 한 겹 더 벗긴다 — `t("a(b")` 같은 값 하나가 괄호 균형을 통째로 뒤집는다.
 */
function maskLiterals(source: string): string {
  const out = source.split("")
  let mode: "code" | "'" | '"' | "`" = "code"
  for (let i = 0; i < source.length; i += 1) {
    const c = source[i]
    if (mode === "code") {
      if (c === "'" || c === '"' || c === "`") mode = c
      continue
    }
    if (c === "\\") {
      if (source[i + 1] !== "\n") out[i + 1] = " "
      i += 1
      continue
    }
    if (c === mode) {
      mode = "code"
      continue
    }
    if (c !== "\n") out[i] = " "
  }
  return out.join("")
}

const OPENERS = new Set(["(", "{", "["])
const PAIR: Record<string, string> = { ")": "(", "}": "{", "]": "[" }

/**
 * `marker` 를 **감싸고 있는 JSX 표현식 전체**를 되돌린다. 없으면 빈 문자열이다.
 *
 * ## 왜 "마커 줄 + 바로 앞 한 줄" 로는 안 되나 (실증됨)
 *
 * 검수자가 호스트의 면책을 이렇게 바꿔 보았다:
 *
 * ```
 * {!hasMessages && (
 *   <View>
 *     <ConsultSheetDisclaimer …/>
 *   </View>
 * )}
 * ```
 *
 * 마커 줄은 `<ConsultSheetDisclaimer …/>`, 바로 앞 줄은 `<View>` 다 — **둘 다 깨끗하다.**
 * 조건은 두 줄 위에 있다. 그렇게 **59/59 전부 초록인 채로** "추천 질문으로 열면 면책이
 * 한 번도 안 뜨는" 회귀가 통과했다. 래퍼 하나면 뚫리는 가드는 가드가 아니다.
 *
 * 그래서 줄이 아니라 **괄호 균형**으로 센다. 마커에서 위로 훑으며 짝이 없는 여는 괄호를
 * 찾고, 그중 첫 `{`(= JSX 표현식 컨테이너)까지를 통째로 되돌린다. `cond && (…)` 의 `(` 는
 * 짝이 없지만 그 `&&` 는 바깥 `{` 안에 있으므로, `{` 까지 올라가야 조건이 보인다.
 *
 * 위로 얼마나 올라갈지의 경계는 `return (` · `=> (` 다. 그 위는 컴포넌트 본문이고,
 * 거기까지 딸려 오면 **무관한 삼항**(`{hasMessages ? <FlatList/> : <Empty/>}`)이 잡혀
 * 멀쩡한 코드가 빨개진다 — 통과할 수 없는 검사는 결국 지워진다.
 */
function enclosingExpression(source: string, marker: string): string {
  const at = source.indexOf(marker)
  if (at < 0) throw new Error(`가드를 걸 자리를 못 찾았다: ${marker}`)

  const masked = maskLiterals(source)
  const closers: string[] = []
  for (let i = at - 1; i >= 0; i -= 1) {
    const c = masked[i]
    if (PAIR[c]) {
      closers.push(c)
      continue
    }
    if (!OPENERS.has(c)) continue
    const top = closers[closers.length - 1]
    if (top !== undefined && PAIR[top] === c) {
      closers.pop()
      continue
    }
    // 짝이 없는 여는 괄호 = 마커를 감싸고 있다.
    if (c === "{") return source.slice(i, at + marker.length)
    const before = masked.slice(0, i).trimEnd()
    if (/\breturn$/.test(before) || before.endsWith("=>")) return ""
  }
  return ""
}

/**
 * 면책이 **조건 뒤에 숨었는지** 본다. 비어 있으면 무조건 렌더다.
 *
 * `return null` 은 감싸는 표현식이 아니라 **위**에 있다(`if (!hasMessages) return null`).
 * 괄호 세기로는 안 보이므로 파일 전체에서 따로 센다 — 이 두 파일의 렌더 경로에는
 * 조기 반환이 하나도 없고, 생기면 그것이 곧 "면책이 안 뜨는 표면" 이다.
 */
function guardBreaches(source: string, marker: string): string[] {
  const breaches: string[] = []
  const context = enclosingExpression(source, marker)
  if (context.includes("&&")) breaches.push("&&")
  if (context.includes("?")) breaches.push("?")
  if (/\breturn\s+(null|undefined|false)\b/.test(source)) {
    breaches.push("return null")
  }
  return breaches
}

describe("상담 시트는 gorhom 의 키보드 처리를 혼자 쓴다", () => {
  /*
    `app/consult.tsx` 가 "되돌리지 말 것" 으로 못 박은 자리다. 그 화면은 본문 열의
    `paddingBottom` **하나**만 움직이는데, 시트는 gorhom 이 이미 (i) 위치 (ii) 콘텐츠 상자
    높이 (iii) `paddingBottom = 키보드 높이` 셋을 움직인다. 얹는 순간 두 겹 보정이고,
    2026-08-03 QA 에서 실제로 입력창이 화면 최상단으로 날아갔다.
  */
  const FORBIDDEN =
    /KeyboardAvoidingView|KeyboardStickyView|useReanimatedKeyboardAnimation|keyboard-controller/

  it.each(SHEET_FILES)("%s 에 키보드 보정 계보가 없다", (file) => {
    expect(code(file)).not.toMatch(FORBIDDEN)
  })

  it("바닥 여백은 키보드 유무 boolean 하나로만 갈린다", () => {
    // 위치를 만드는 값이 아니라 여백 하나 — 그래서 두 겹이 아니다.
    expect(HOST).toMatch(/Keyboard\.addListener\("keyboardWillShow"/)
    expect(HOST).toMatch(/Keyboard\.addListener\("keyboardDidShow"/)
    expect(HOST).toMatch(/Keyboard\.addListener\("keyboardWillHide"/)
    expect(HOST).toMatch(/Keyboard\.addListener\("keyboardDidHide"/)
  })
})

describe("시트 안의 입력은 V2SheetTextInput 이다", () => {
  /*
    평범한 `TextInput` 이면 gorhom 의 `useAnimatedKeyboard` 가 포커스 `target` 을 못 받아
    키보드는 뜨고 시트는 제자리에 남는다 — 경고도 예외도 없다.
  */
  it("컴포저가 V2SheetTextInput 을 쓴다", () => {
    expect(COMPOSER).toMatch(/<V2SheetTextInput\b/)
  })

  it.each(SHEET_FILES)("%s 가 맨 TextInput 을 그리지 않는다", (file) => {
    expect(code(file)).not.toMatch(/<TextInput\b/)
  })
})

describe("공유는 shareContent 를 탄다", () => {
  /*
    공유 시트는 RN 모달이 아니라 네이티브 present 다. iOS 는 present/dismiss 가 진행 중이면
    새 present 를 **조용히 거부한다**. `shareContent` 가 `afterModalTransitions()` 를 먼저
    기다리고, 그 대기를 호출부에 맡기면 공유 버튼이 늘어날 때마다 또 빠진다.
  */
  it("호스트가 shareContent 를 부른다", () => {
    expect(HOST).toMatch(/shareContent\(\{/)
    expect(HOST).toMatch(/scope: "restaurant-consult-answer"/)
  })

  it.each(SHEET_FILES)("%s 가 Share.share 를 직접 부르지 않는다", (file) => {
    expect(code(file)).not.toMatch(/Share\.share\(/)
    expect(code(file)).not.toMatch(/from "react-native"[^\n]*Share/)
  })
})

describe("면책은 조건 없이 뜬다", () => {
  /*
    이번 작업의 가장 구체적인 안전 회귀 지점이다. `/consult` 는 같은 문구를 `isIdle`
    참 가지 안에서만 그리는데, 이 시트는 추천 질문을 누르면 **처음부터 대화가 있는 상태**로
    열려 `isIdle` 이 한 번도 참이 되지 않는다. 그대로 옮겼으면 면책이 단 한 번도 안 뜨는
    AI 답변 표면이 하나 생겼을 것이다.
  */
  it("호스트가 면책 블록을 삼항·&&·조기반환 없이 그린다", () => {
    expect(guardBreaches(HOST, "<ConsultSheetDisclaimer")).toEqual([])
  })

  it("면책 컴포넌트가 대화 상태를 아예 보지 않는다", () => {
    expect(DISCLAIMER).not.toMatch(/isIdle|messages|isTyping|useChat|visible/)
  })

  it("면책 문구와 참고문헌이 둘 다 있다", () => {
    expect(DISCLAIMER).toMatch(/t\("consult\.disclaimer"\)/)
    expect(DISCLAIMER).toMatch(/t\("consult\.references"\)/)
  })

  it("면책 문구 자체에도 조건이 붙어 있지 않다", () => {
    expect(guardBreaches(DISCLAIMER, 't("consult.disclaimer")')).toEqual([])
  })
})

describe("면책 가드가 실제로 문다 — 래퍼 하나로 뚫리지 않는다", () => {
  /*
    가드는 **회귀를 실제로 빨갛게 만들 때만** 가드다. 아래 판본들은 전부 "추천 질문으로
    열면 면책이 한 번도 안 뜨는" 같은 결함이고, 하나라도 초록이면 이 파일의 다른 검사가
    전부 무의미해진다. 그래서 결함 판본을 여기 박아 두고 매번 물어 보게 한다.
    (`restaurantConsultQuestions.test.ts` 의 "가드가 실제로 문다" 와 같은 수법이다.)
  */
  const shell = (block: string) => `
function RestaurantConsultSheetHost() {
  const hasMessages = messages.length > 0
  return (
    <V2BottomSheet layout="fill">
      <ConsultSheetHeader onClose={onClose} />
      <View style={styles.body}>
        {hasMessages ? <FlatList data={messages} /> : <ConsultSheetEmpty />}
      </View>
${block}
      <ConsultSheetComposer value={input} canSend={input.length > 0} />
    </V2BottomSheet>
  )
}
`

  const HEALTHY = "      <ConsultSheetDisclaimer onOpenReferences={handle} />"

  it("정본 모양(조건 없음)은 통과한다 — 통과할 수 없는 검사는 결국 지워진다", () => {
    expect(guardBreaches(shell(HEALTHY), "<ConsultSheetDisclaimer")).toEqual([])
  })

  it.each([
    [
      "래퍼 한 겹 — 마커 줄도 그 앞 줄도 깨끗하다(검수자가 실증한 판본)",
      `      {!hasMessages && (
        <View>
          <ConsultSheetDisclaimer onOpenReferences={handle} />
        </View>
      )}`,
    ],
    [
      "래퍼 두 겹",
      `      {!hasMessages && (
        <View>
          <V2VStack>
            <ConsultSheetDisclaimer onOpenReferences={handle} />
          </V2VStack>
        </View>
      )}`,
    ],
    [
      "한 줄짜리 &&",
      `      {!hasMessages && <ConsultSheetDisclaimer onOpenReferences={handle} />}`,
    ],
    [
      "삼항의 거짓 가지",
      `      {hasMessages ? null : (
        <ConsultSheetDisclaimer onOpenReferences={handle} />
      )}`,
    ],
    [
      "삼항의 참 가지(/consult 를 그대로 옮긴 모양)",
      `      {isIdle ? (
        <ConsultSheetDisclaimer onOpenReferences={handle} />
      ) : null}`,
    ],
  ])("%s → 빨개진다", (_label, block) => {
    expect(
      guardBreaches(shell(block), "<ConsultSheetDisclaimer"),
    ).not.toHaveLength(0)
  })

  it("조기 반환으로 시트째 지우는 판본도 빨개진다", () => {
    const early = shell(HEALTHY).replace(
      "  return (",
      "  if (!hasMessages) return null\n  return (",
    )
    expect(guardBreaches(early, "<ConsultSheetDisclaimer")).toContain(
      "return null",
    )
  })

  it("면책 컴포넌트 안에서 문구만 감춰도 빨개진다", () => {
    const hidden = DISCLAIMER.replace(
      't("consult.disclaimer")',
      'isIdle && t("consult.disclaimer")',
    )
    expect(guardBreaches(hidden, 't("consult.disclaimer")')).toContain("&&")
  })
})

describe("계측은 이 시트만의 서페이스를 쓴다", () => {
  it("surface 가 restaurant_ai_consult 다", () => {
    expect(HOST).toMatch(/surface="restaurant_ai_consult"/)
  })

  it("지도 AI 검색 시트의 서페이스를 재사용하지 않는다", () => {
    // 재사용하면 두 시트의 `sheet_opened`/`sheet_dismissed` 가 한 덩어리가 되어
    // 어느 쪽 체류인지 영원히 못 가른다.
    expect(HOST).not.toMatch(/restaurant_ai_search/)
  })

  it("턴이 나갈 때 restaurant_ai_consult_send 를 센다", () => {
    expect(HOST).toMatch(/trackAnalyticsEvent\("restaurant_ai_consult_send"/)
  })
})

describe("시트는 화면을 채우는 고정 스냅으로 산다", () => {
  it("V2BottomSheet 에 layout='fill' 을 넘긴다", () => {
    // `enableDynamicSizing` 으로 되돌리면 빈 채팅이 쪼그라들고, 키보드가 뜰 때
    // 콘텐츠 상자만 줄어들어 입력바가 키보드 밑으로 사라진다.
    expect(HOST).toMatch(/layout="fill"/)
  })

  it("목록·빈 상태가 같은 flex 상자를 쓴다", () => {
    expect(HOST).toMatch(/body: \{ flex: 1 \}/)
  })

  it("목록은 평범한 RN FlatList 다", () => {
    // `BottomSheetFlatList` 는 콘텐츠 팬이 켜진 다중 스냅 시트(지도)의 물건이다.
    // 이 시트는 `enableContentPanningGesture={false}` 라 스크롤과 시트가 다투지 않는다.
    expect(HOST).not.toMatch(/BottomSheetFlatList|BottomSheetScrollView/)
    expect(HOST).toMatch(/from "react-native"/)
    expect(HOST).toMatch(/bounces=\{false\}/)
    expect(HOST).toMatch(/overScrollMode="never"/)
    expect(HOST).toMatch(/keyboardShouldPersistTaps="handled"/)
  })
})

describe("대화는 시트가 아니라 호스트가 소유한다", () => {
  /*
    `V2BottomSheet` 은 `!rendered` 에서 `return null` 이라 children 이 통째로 언마운트된다.
    `useChat` 이 그 안에 있으면 닫을 때마다 정리 이펙트가 `abort()` 하고 대화가 사라진다.
  */
  it("useChat 을 부르는 파일은 호스트 하나뿐이다", () => {
    expect(HOST).toMatch(/useChat\(\)/)
    const others = SHEET_FILES.filter(
      (file) => file !== "RestaurantConsultSheetHost.tsx",
    )
    for (const file of others) {
      expect(code(file)).not.toMatch(/useChat/)
    }
  })

  it("두 번째 질문은 대화를 리셋하지 않는다", () => {
    // 리셋하면 앞 대화를 버리는데 시안에 그런 신호가 없다. 같은 대화에 한 턴 더다.
    expect(HOST).not.toMatch(/resetChat|startNewChat/)
  })
})

describe("전송은 분류가 반영된 다음 렌더에 일어난다", () => {
  /*
    `useChat` 의 `categoryRef.current = category` 는 **렌더 중** 갱신된다. 같은 틱에
    보내면 이전 category 가 실려 나간다 — 그래서 문장을 `pending` 에 얹고 다음 렌더에 보낸다.
  */
  it("setCategory 와 전송이 같은 이펙트에 있지 않다", () => {
    const blocks = HOST.split("useEffect(")
    for (const block of blocks) {
      if (!block.includes("setCategory(")) continue
      expect(block).not.toMatch(/sendMessage\(/)
      expect(block).not.toMatch(/\bsend\(/)
    }
  })

  it("분류는 FOOD_DIET 다", () => {
    // 서버 `QUESTION_CATEGORIES` 에 식당용 값이 없고, 분류는 주입 컨텍스트를 하나도
    // 바꾸지 않는다 — 새 값을 만들면 DB 대화 행에 남아 `NONE` 으로 눕는다.
    expect(HOST).toMatch(/CONSULT_CATEGORY = "FOOD_DIET"/)
  })

  it("손으로 친 문장도 같은 통로를 탄다 — 빈 상태로 연 대화가 NONE 으로 눕지 않는다", () => {
    /*
      `질문하기`(빈 상태)로 열면 `request` 가 없어 1단계 이펙트가 안 돈다. 컴포저가
      곧장 보내면 그 대화는 `setCategory` 를 한 번도 타지 않아 서버에 `NONE` 으로
      생성된다 — 같은 시트에서 시작한 대화인데 추천 질문으로 연 것과 분류가 갈린다.
      그렇다고 같은 틱에 `setCategory` + 전송을 하면 이번엔 **이전 분류**가 실려 나간다.
      그래서 컴포저도 `pending` 에 얹는다.
    */
    const from = HOST.indexOf("const handleSend")
    expect(from).toBeGreaterThanOrEqual(0)
    const body = HOST.slice(from, HOST.indexOf("}, [", from))

    expect(body).toMatch(/setCategory\(CONSULT_CATEGORY\)/)
    expect(body).toMatch(/setPending\(text\)/)
    expect(body).not.toMatch(/\bsend\(|sendMessage\(/)
  })
})

describe("스트리밍 중에 눌린 질문을 버리지 않는다", () => {
  /*
    이 기능에서 **가장 조용한** 고장이다. `useChat.sendMessage` 는 `inFlightRef.current` 가
    서 있으면 첫 줄에서 return 한다(`useChat.ts`) — 그 플래그는 SSE 가 끝나는 `finally`
    까지 서 있다. 2단계 이펙트가 그걸 모르고 `send(pending)` 뒤에 무조건 `setPending(null)`
    을 하면, 스트리밍 중에 누른 추천 질문은 **전송도 안 되고 대기열에도 안 남는다.**
    경고도 오류도 없고, `handledRef` 는 1단계에서 이미 소비됐고 `requestId` 도 그대로라
    다시 눌러도 아무 일이 일어나지 않는다.
  */

  /** 2단계 이펙트에서 **`send` 이전까지**. 가드가 여기 없으면 이미 늦었다. */
  const BEFORE_SEND = enclosingExpression(HOST, "send(pending)")

  /** `send(pending)` 부터 이펙트가 닫히는 의존성 배열까지. */
  const AFTER_SEND = (() => {
    const tail = HOST.slice(HOST.indexOf("send(pending)"))
    const closing = /\},\s*\[([^\]]*)\]\)/.exec(tail)
    if (!closing) throw new Error("2단계 이펙트의 의존성 배열을 못 찾았다")
    return {
      text: tail.slice(0, closing.index + closing[0].length),
      deps: closing[1],
    }
  })()

  it("전송 앞에 isSending 가드가 있다", () => {
    expect(BEFORE_SEND).toMatch(/if \(isSending\) return/)
  })

  it("가드에 걸리면 pending 을 **비우지 않고** 남긴다", () => {
    // `setPending(null)` 은 `send` 뒤에 있어야 한다 — 가드 앞에 있으면 그것이 곧
    // "질문이 사라지는" 판본이다.
    expect(BEFORE_SEND).not.toMatch(/setPending\(/)
    expect(AFTER_SEND.text).toMatch(/setPending\(null\)/)
  })

  it("다음 렌더에 다시 시도한다 — deps 에 isSending 이 있다", () => {
    // 없으면 `isSending` 이 내려가도 이펙트가 다시 돌지 않아 pending 이 영영 남는다.
    expect(AFTER_SEND.deps).toContain("isSending")
    expect(AFTER_SEND.deps).toContain("pending")
    expect(AFTER_SEND.deps).toContain("category")
  })

  it("계측은 실제로 나간 턴만 센다", () => {
    /*
      `restaurant_ai_consult_send` 를 전송 성립과 무관하게 쏘면 "열림 대비 전송" 지표가
      거짓이 된다 — 스트리밍 중 연타가 전부 전송으로 집계된다. 계측은 `send` 안에 있고,
      `send` 로 가는 길은 **위 가드 하나뿐**이다. 그래서 통로가 하나여야 한다.
    */
    expect(HOST.match(/trackAnalyticsEvent\(/g)).toHaveLength(1)
    expect(HOST.match(/sendMessage\(/g)).toHaveLength(1)
    expect(HOST.match(/\bsend\(/g)).toHaveLength(1)
    expect(BEFORE_SEND).toMatch(/isSending/)
  })
})

describe("`답변 다시 받기` 는 마지막 답변에만 붙는다", () => {
  /*
    스트림이 끊기면 `useChat` 이 세우는 실패 말풍선이 전부 "아래 ‘답변 다시 받기’ 를 눌러
    주세요" 로 끝난다(`chatFailureCopy.ts`). 버튼을 안 달면 **없는 버튼을 누르라고 안내하는**
    의료 답변 표면이 된다. `ConsultAssistantBubble` 은 `onRegenerate` 유무로만 그릴지 말지를
    정하므로(그 파일 머리말), "마지막인가" 판정은 호스트에 있어야 한다.
  */
  it("호스트가 useChat 의 regenerateLastMessage 를 넘긴다", () => {
    expect(HOST).toMatch(/regenerateLastMessage/)
  })

  it("마지막 어시스턴트 메시지에만 넘긴다", () => {
    expect(HOST).toMatch(
      /findLast\(\(message\) => message\.role === "assistant"\)/,
    )
    expect(HOST).toMatch(
      /onRegenerate=\{[\s\S]{0,120}?lastAssistantId \? regenerateLastMessage : undefined/,
    )
  })

  it("인라인 화살표로 감싸지 않는다 — 감싸면 버블 memo 가 죽는다", () => {
    expect(HOST).not.toMatch(/onRegenerate=\{\(\) =>/)
  })
})

describe("재주입 방지 키는 requestId 다", () => {
  it("프롬프트 문자열이 아니라 requestId 를 기억한다", () => {
    // 문자열을 키로 쓰면 **같은 질문을 두 번 눌렀을 때 두 번째가 조용히 무시된다.**
    expect(HOST).toMatch(/handledRef\.current === request\.requestId/)
    expect(HOST).toMatch(/handledRef\.current = request\.requestId/)
  })
})

describe("사용자 버블에 컨텍스트 블록이 새지 않는다", () => {
  it("파서가 되돌린 질문만 그린다", () => {
    /*
      전송 원문에는 `[식당]`/`[분류]`/`[메뉴]` 블록이 붙어 있다. 그대로 그리면 버블에
      메뉴 영양소 숫자가 통째로 뜬다. 파싱이 안 되면(손으로 친 후속 질문) 원문이 곧 질문이다.
    */
    expect(BUBBLES).toMatch(
      /parseRestaurantConsultMessage\(message\.content\)\?\.question \?\?[\s\n]*message\.content/,
    )
  })
})

describe("답변 렌더는 /consult 정본을 나눠 쓴다", () => {
  const CANONICAL = join(
    __dirname,
    "..",
    "src",
    "features",
    "consultation",
    "components",
    "ChatMessageBubble.tsx",
  )
  const canonical = codeOnly(readFileSync(CANONICAL, "utf8"))

  it.each([
    "markdownItInstance",
    "markdownRules",
    "useSmoothStreamingText",
    "makeMarkdownStyles",
    "AssistantAvatar",
  ])("%s 가 export 되어 있다", (symbol) => {
    // 마크다운 파서 정본은 `utils/chatMarkdown.ts` 로 옮겨졌고(2026-09-02, 두 표면이
    // 같은 파서·정규화를 쓰게), ChatMessageBubble 은 `export { … }` 로 다시 내보낸다.
    // 어느 꼴이든 이 파일에서 가져갈 수 있으면 된다.
    expect(canonical).toMatch(
      new RegExp(`export (const|function) ${symbol}\\b|export \\{[^}]*\\b${symbol}\\b[^}]*\\}`),
    )
  })

  it("시트가 그 다섯을 실제로 들여온다", () => {
    // MarkdownIt 인스턴스를 새로 만들면 cjk-friendly 를 빠뜨린 판이 생기고,
    // 그때 별표가 리터럴로 새는 화면은 상담 화면이 아니라 시트 쪽이다.
    expect(BUBBLES).toMatch(
      /from "@\/src\/features\/consultation\/components\/ChatMessageBubble"/,
    )
    expect(BUBBLES).toMatch(/markdownItInstance/)
    expect(BUBBLES).toMatch(/markdownRules/)
    expect(BUBBLES).toMatch(/useSmoothStreamingText/)
    expect(BUBBLES).toMatch(/AssistantAvatar/)
  })

  it("정본 버블의 시각·파서 체인이 그대로 남아 있다", () => {
    /*
      `/consult` 화면의 정본이다. 시안에 맞춰 여기를 고치면 상담 화면이 같이 바뀐다.
      시트는 export 만 늘렸다.
    */
    expect(canonical).toMatch(/USER_BUBBLE_BG\[scheme\]/)
    expect(canonical).toMatch(/parseFoodConsultMessage\(message\.content\)/)
    expect(canonical).toMatch(/parseExamConsultMessage\(/)
    expect(canonical).toMatch(/export const UserBubble = memo\(/)
    expect(canonical).toMatch(/export const AssistantBubble = memo\(/)
  })

  it("마스코트 자산을 복제하지 않는다", () => {
    // 표면마다 require 하면 다크 자산이 갈리고, 그때 어느 쪽이 정본인지 아무도 모른다.
    for (const file of SHEET_FILES) {
      expect(code(file)).not.toMatch(/Sin_(dark|light)\.png/)
    }
  })
})

describe("버블 마크다운은 자기 팔레트를 쓴다", () => {
  it("전폭 배경용 팔레트를 그대로 쓰지 않는다", () => {
    /*
      상담 화면의 `surface`/`codeBg` 는 #F5F6F8 / #F2F3F5 인데 이 시트의 버블 면은
      `background.lower` = #f7f7f7 이다 — 그대로 쓰면 인용과 코드가 배경과 같은 색이 되어
      화면에서 사라진다.
    */
    expect(BUBBLES).toMatch(/makeMarkdownStyles\(\{/)
    expect(BUBBLES).toMatch(/surface: colors\.background\.default/)
    expect(BUBBLES).toMatch(/codeBg: colors\.background\.default/)
  })
})

describe("동작 없는 버튼을 만들지 않는다", () => {
  it("컴포저에 마이크가 없다", () => {
    // 음성 입력 구현이 앱 어디에도 없다. 눌러도 아무 일이 없는 버튼 대신 아예 안 그린다.
    expect(COMPOSER).not.toMatch(/name="mic"/)
  })

  it("컴포저에 첨부(＋)가 없다", () => {
    // `/consult` 의 첨부 메뉴는 iOS 제약 때문에 화면 내 오버레이다. 시트 안은 더 좁고,
    // 시안 목업에도 첨부 흐름이 없다.
    expect(COMPOSER).not.toMatch(/name="plus"|paperclip|ImagePicker/)
  })

  it("전송 버튼은 보낼 것이 있을 때만 눌린다", () => {
    expect(COMPOSER).toMatch(/disabled=\{!canSend\}/)
    expect(COMPOSER).toMatch(/accessibilityState=\{\{ disabled: !canSend \}\}/)
  })
})

describe("리터럴 색을 새로 만들지 않는다", () => {
  /*
    시안의 색은 전부 v2 토큰에 있다(연분홍 = `primary.primaryWeak`, 회색 버블 =
    `background.lower`, 그라데이션 양 끝 = `primitives.navy[300]`·`primitives.orange[700]`).
    eslint 도 경고하지만, 경고는 쌓이면 안 보인다.
  */
  it.each(SHEET_FILES)("%s 에 리터럴 hex 가 없다", (file) => {
    expect(code(file)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})
