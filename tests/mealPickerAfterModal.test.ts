/**
 * 식사 시트에서 **모달 전이가 끝난 뒤** 다음 표면을 띄우는지 소스 순서로 지킨다
 * (`RecordView.handleMealCamera` 머리말).
 *
 * 시트를 내리는 틱에 네이티브 표면을 present 하면 iOS 에서 시트는 닫히고 다음 표면은
 * 안 뜨며 홈이 터치를 안 받는다 — 사용자에게는 앱이 얼어붙은 것이다. 2026-09-04 부터
 * 사진은 OS 카메라(피커)가 아니라 **앱 안의 푸드 카메라 페이지**로 가는데, 페이지를 미는
 * 것도 시트가 사라진 뒤여야 같은 결함을 피한다. 런타임 테스트로는 RN Modal 의 네이티브
 * 전이를 재현할 수 없어서, 핸들러 본문 안의 순서를 본다.
 */
import fs from "fs"
import path from "path"

const SOURCE = fs.readFileSync(
  path.join(__dirname, "../src/features/home/components/record/RecordView.tsx"),
  "utf8",
)

function handlerBody(name: string): string {
  const start = SOURCE.indexOf(`const ${name} = async (`)
  expect(start).toBeGreaterThan(-1)
  const next = SOURCE.indexOf("\n  const ", start + 1)
  return SOURCE.slice(start, next === -1 ? undefined : next)
}

/** 시트를 내리고 → 전이를 기다리고 → 다음 표면을 여는 순서인가. 검사와 대조가 함께 쓴다. */
function opensAfterTransition(body: string): boolean {
  const close = body.indexOf("setOpenSheet(null)")
  const wait = body.indexOf("await afterModalTransitions()")
  const open = body.indexOf('router.push("/food-camera")')
  return close > -1 && wait > close && open > wait
}

describe("식사 시트 → 다음 표면은 모달 전이 뒤에", () => {
  test("카메라: 시트를 내린 뒤 afterModalTransitions 를 기다리고 나서 카메라 페이지를 민다", () => {
    const body = handlerBody("handleMealCamera")
    const close = body.indexOf("setOpenSheet(null)")
    const wait = body.indexOf("await afterModalTransitions()")
    const open = body.indexOf('router.push("/food-camera")')
    expect(close).toBeGreaterThan(-1)
    expect(wait).toBeGreaterThan(close)
    expect(open).toBeGreaterThan(wait)
  })

  test("카메라 페이지의 셔터는 여는 쪽의 onCapture 로 분석을 시작한다", () => {
    const body = handlerBody("handleMealCamera")
    expect(body).toMatch(/onCapture: \(uri\) => analyzeImage\(uri, mealType\)/u)
    /*
      취소는 왔던 시트로 되돌린다 — 막다른 길을 두지 않는다. 다만 **카메라가 내려가는
      전이 뒤**여야 한다: 네이티브 전체화면 모달이 사라지는 같은 틱에 RN Modal 시트를
      올리면 화면이 먹통이 된다(2026-09-05 검수, 글 기록 경로와 같은 규칙).
    */
    expect(body).toMatch(
      /onCancel: \(\) => \{[\s\S]*afterModalTransitions\(\)[\s\S]*openMealSheet\(mealType\)/u,
    )
  })

  test("음성 대조 — 순서를 뒤집은 가짜 본문은 규칙에 걸린다", () => {
    // 위 검사와 **같은 판정**을 가짜 본문에 건다. 정규식을 다시 적으면 대조만 통과한다.
    const fake =
      'const handleX = async () => {\n    router.push("/food-camera")\n    setOpenSheet(null)\n    await afterModalTransitions()\n  }'
    expect(opensAfterTransition(fake)).toBe(false)
    expect(opensAfterTransition(handlerBody("handleMealCamera"))).toBe(true)
  })
})

test("글 입력도 식단 메뉴가 닫힌 뒤 연다", () => {
  const body = handlerBody("handleMealText")
  const close = body.indexOf("setOpenSheet(null)")
  const wait = body.indexOf("await afterModalTransitions()")
  const open = body.indexOf("setIsTextRecordOpen(true)")
  expect(close).toBeGreaterThan(-1)
  expect(wait).toBeGreaterThan(close)
  expect(open).toBeGreaterThan(wait)
})
