/**
 * 약 검색·사진 등록 — 화면 문구를 만드는 순수 함수와, 화면이 지켜야 하는 분기를 소스로 잰다.
 */
import fs from "fs"
import path from "path"
import {
  drugBadge,
  drugIngredientLine,
  drugSummary,
  firstSentence,
} from "@/src/features/medication/data/drugPresentation"
import { mockRecognize } from "@/src/features/medication/data/mockRecognition"
import { getAnalyticsScreenName } from "@/src/features/analytics/events"

const read = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8")

describe("검색 결과 줄 문구 (RQ-15)", () => {
  it("효능군이 있으면 제조사 · 효능군, 없으면 e약은요 첫 문장, 둘 다 없으면 제조사만", () => {
    expect(
      drugSummary({
        manufacturer: "(주)유한양행",
        category: "혈압강하제",
        efficacy: "",
      }),
    ).toBe("(주)유한양행 · 혈압강하제")
    expect(
      drugSummary({
        manufacturer: "동화약품(주)",
        category: "",
        efficacy:
          "이 약은 식욕감퇴(식욕부진), 위부팽만감에 사용합니다. 다음 문장은 안 보여요.",
      }),
    ).toBe("동화약품(주) · 식욕감퇴(식욕부진), 위부팽만감에 사용합니다")
    expect(
      drugSummary({ manufacturer: "제조사", category: "", efficacy: "" }),
    ).toBe("제조사")
  })
  it("첫 문장은 60자에서 자르고 임의 문구를 만들지 않는다", () => {
    expect(firstSentence("")).toBe("")
    expect(firstSentence("가".repeat(80)).length).toBe(60)
  })
  it("배지는 데이터가 있을 때만, 성분 줄은 비어 있으면 그리지 않는다", () => {
    expect(drugBadge({ etcOtc: "전문의약품" })).toBe("rx")
    expect(drugBadge({ etcOtc: "일반의약품" })).toBe("otc")
    expect(drugBadge({ etcOtc: "" })).toBeNull()
    expect(drugBadge({})).toBeNull()
    expect(drugIngredientLine({ ingredients: "  " })).toBe("")
  })
})

describe("사진 인식 목 모드", () => {
  it("사진이 없으면 poor_image, 있으면 실제 항목 모양의 후보를 돌려준다", () => {
    expect(mockRecognize(0).status).toBe("poor_image")
    const result = mockRecognize(2)
    expect(result.status).toBe("candidates")
    expect(result.items[0]).toMatchObject({
      id: "200808877",
      pill: true,
      imprintFront: "YH",
    })
  })
})

describe("화면이 지키는 분기", () => {
  it("사진 화면은 poor_image 를 no_match 와 다른 문구로 보여주고, 촬영은 앱 안 카메라로 보낸다 (AC-18·RQ-50·M9)", () => {
    const src = read("src/features/medication/views/MedicationPhotoScreen.tsx")
    expect(src).toContain('"poorImage"')
    expect(src).toContain('"poorImageBody"')
    expect(src).toContain('router.push("/medication/camera")')
    expect(src).not.toContain("launchCameraAsync")
    expect(src).toContain("preparePillPhoto(")
    // 2회 연속 실패 시 검색을 주 버튼으로 승격(RQ-52)
    expect(src).toContain("failures.current >= 2")
  })
  it("카메라 화면은 앞/뒷면 두 단계, 뒷면 건너뛰기, 용도 고지를 가진다 (AC-01·02·10)", () => {
    const src = read("src/features/medication/views/MedicationCameraScreen.tsx")
    for (const key of [
      "cameraStepFront",
      "cameraStepBack",
      "cameraSkipBack",
      "cameraPurpose",
    ])
      expect(src).toContain(`"${key}"`)
    expect(src).toContain("CameraView")
    expect(
      fs.existsSync(path.join(process.cwd(), "app/medication/camera.tsx")),
    ).toBe(true)
  })
  it("검색 화면은 V2SearchField 를 쓰고 카탈로그가 없으면 검색하지 않으며 출처를 표기한다 (RQ-14·16)", () => {
    const src = read("src/features/medication/views/MedicationSearchScreen.tsx")
    expect(src).toContain("<V2SearchField")
    expect(src).toContain("capability.data?.catalog")
    expect(src).toContain('t("source"')
  })
  it("인식 API 는 목 모드에서 네트워크를 타지 않는다", () => {
    const src = read("src/features/medication/services/medicationApi.ts")
    expect(src).toContain("if (isMockMode())")
  })
  it("약 등록 플로우 화면들이 계측 표에 이름을 가진다", () => {
    for (const [route, name] of [
      ["medication/search", "medication_search"],
      ["medication/photo", "medication_photo"],
      ["medication/camera", "medication_camera"],
      ["medication/candidates", "medication_candidates"],
    ] as const)
      expect(getAnalyticsScreenName(route.split("/"))).toBe(name)
  })
})
