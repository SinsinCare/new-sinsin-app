/**
 * 식사 시트에서 카메라·앨범을 열 때 **모달 전이가 끝난 뒤** 네이티브 피커를 띄우는지
 * 소스 순서로 지킨다 (`RecordView.handleMealGallery` 머리말).
 *
 * 시트를 내리는 틱에 피커를 present 하면 iOS 에서 시트는 닫히고 앨범은 안 뜨며 홈이
 * 터치를 안 받는다 — 사용자에게는 앱이 얼어붙은 것이다. 런타임 테스트로는 RN Modal 의
 * 네이티브 전이를 재현할 수 없어서, 핸들러 본문 안에서 `afterSiblingModalsGone()` 이
 * 피커 호출보다 **앞에** 있는지를 본다.
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

describe("식사 시트 → 네이티브 피커는 모달 전이 뒤에", () => {
  test("앨범: 시트를 내린 뒤 afterModalTransitions 를 기다리고 나서 앨범을 연다", () => {
    const body = handlerBody("handleMealGallery")
    const close = body.indexOf("setOpenSheet(null)")
    const wait = body.indexOf("await afterSiblingModalsGone()")
    const open = body.indexOf("openMealGallery(")
    expect(close).toBeGreaterThan(-1)
    expect(wait).toBeGreaterThan(close)
    expect(open).toBeGreaterThan(wait)
  })

  test("카메라: 같은 순서다", () => {
    const body = handlerBody("handleMealCamera")
    const close = body.indexOf("setOpenSheet(null)")
    const wait = body.indexOf("await afterSiblingModalsGone()")
    const open = body.indexOf("takePhoto(")
    expect(close).toBeGreaterThan(-1)
    expect(wait).toBeGreaterThan(close)
    expect(open).toBeGreaterThan(wait)
  })

  test("음성 대조 — 순서를 뒤집은 가짜 본문은 실패해야 한다", () => {
    const fake =
      "const handleX = async () => {\n    await openMealGallery(m)\n    setOpenSheet(null)\n    await afterModalTransitions()\n  }"
    expect(fake.indexOf("openMealGallery(")).toBeLessThan(
      fake.indexOf("await afterModalTransitions()"),
    )
  })
})
