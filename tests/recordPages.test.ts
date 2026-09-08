/**
 * 물·혈압·체중은 **페이지**다(2026-09-05 시안). 시트로 되돌아가지 않게 구조를 못 박는다.
 *
 * 여기서 지키는 것:
 *   1. 라우트 세 장이 있고 각자 자기 종류만 그린다(딥링크로 남의 페이지가 열리면 안 된다).
 *   2. 세 시트 파일은 사라졌고, 홈이 그것들을 다시 import 하지 않는다.
 *   3. 라우트는 `router.back()` 을 직접 부르지 않고, 언마운트 정리로 스토어를 비운다.
 */
import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"

const root = join(__dirname, "..")
const read = (relative: string) => readFileSync(join(root, relative), "utf8")

const ROUTES = [
  {
    file: "app/record/water.tsx",
    kind: "water",
    page: "WaterRecordPage",
    screen: "WaterRecordScreen",
  },
  {
    file: "app/record/blood-pressure.tsx",
    kind: "bloodPressure",
    page: "BloodPressureRecordPage",
    screen: "BloodPressureRecordScreen",
  },
  {
    file: "app/record/weight.tsx",
    kind: "weight",
    page: "WeightRecordPage",
    screen: "WeightRecordScreen",
  },
] as const

describe("기록 페이지 라우트", () => {
  it.each(ROUTES)("$file 이 있고 $page 를 그린다", ({ file, page, screen }) => {
    expect(existsSync(join(root, file))).toBe(true)
    expect(read(file)).toContain(`${screen} as default`)
    expect(read(`src/features/home/views/${screen}.tsx`)).toContain(`<${page}`)
  })

  it.each(ROUTES)("$file 은 자기 종류만 그린다", ({ kind, screen }) => {
    // 세 라우트가 한 스토어를 공유한다 — 종류를 확인하지 않으면 물 페이지 주소로
    // 혈압 재료가 그려진다(딥링크·연속 열기).
    expect(read(`src/features/home/views/${screen}.tsx`)).toContain(
      `useHealthRecordRoute("${kind}")`,
    )
  })

  it.each(ROUTES)(
    "$file 은 useGoBack 을 쓰고 언마운트에 스토어를 비운다",
    ({ file }) => {
      const source = read(file)
      const lifecycle = read("src/features/home/hooks/useHealthRecordRoute.ts")
      expect(lifecycle).toContain("useGoBack")
      expect(source).not.toMatch(/router\.back\(\)/u)
      expect(lifecycle).toContain("useRecordPageStore.getState().clear()")
    },
  )
})

describe("시트는 은퇴했다", () => {
  it.each([
    "src/features/home/components/record/sheets/WaterSheet.tsx",
    "src/features/home/components/record/sheets/BloodPressureSheet.tsx",
    "src/features/home/components/record/sheets/WeightSheet.tsx",
    "src/features/home/components/record/sheets/BloodGlucoseSheet.tsx",
    "src/features/home/components/record/sheets/EdemaSheet.tsx",
  ])("%s 파일이 없다", (file) => {
    expect(existsSync(join(root, file))).toBe(false)
  })

  it("홈이 그 시트들을 import 하지 않는다", () => {
    const source = read("src/features/home/components/record/RecordView.tsx")
    expect(source).not.toMatch(
      /from "\.\/sheets\/(Water|BloodPressure|Weight|BloodGlucose|Edema)Sheet"/u,
    )
  })

  it("홈의 다섯 건강 타일은 페이지를 연다", () => {
    const source = read("src/features/home/components/record/RecordView.tsx")
    expect(source).toContain("openWaterPage")
    expect(source).toContain("openBloodPressurePage")
    expect(source).toContain("openWeightPage")
    expect(source).toContain('kind: "bloodGlucose"')
    expect(source).toContain('kind: "edema"')
  })
})

describe("시트 전용 부품을 페이지에서 쓰지 않는다", () => {
  /*
    `V2SheetTextInput` 은 gorhom 의 `BottomSheetTextInput` 이다 — 시트 **안**에서만 살고,
    페이지에서 쓰면 렌더가 통째로 터진다("useBottomSheetInternal cannot be used out of the
    BottomSheet", 2026-09-05 실측). 페이지 본문은 일반 `TextInput` 을 쓴다.
  */
  it.each([
    "src/features/home/components/record/pages/BloodPressureRecordPage.tsx",
    "src/features/home/components/record/pages/WeightRecordPage.tsx",
  ])("%s 는 V2SheetTextInput 을 쓰지 않는다", (file) => {
    expect(read(file)).not.toContain("V2SheetTextInput")
  })

  it("물 페이지의 시트 안 입력은 그대로 시트용이다 (대조)", () => {
    const source = read(
      "src/features/home/components/record/pages/WaterRecordPage.tsx",
    )
    expect(source).toContain("V2SheetTextInput")
    // 그 입력은 V2BottomSheet 안에 있다.
    const sheetStart = source.indexOf("<V2BottomSheet")
    expect(sheetStart).toBeGreaterThan(-1)
    expect(source.indexOf("<V2SheetTextInput")).toBeGreaterThan(sheetStart)
  })
})

describe("혈압 페이지는 격자를 고른다", () => {
  const source = read(
    "src/features/home/components/record/pages/BloodPressureRecordPage.tsx",
  )

  it("취침 전에는 시점 선택 위치를 유지하고 비활성화한다", () => {
    expect(source).toContain("value={slot === TIMELESS_SLOT ? null : timing}")
    expect(source).toContain(
      "save.isSaving || params.isSaving || slot === TIMELESS_SLOT",
    )
  })

  it("취침 전은 timing 을 싣지 않는다 — 서버가 400 으로 막는 조합이다", () => {
    expect(
      read("src/features/home/hooks/useBloodPressureRecordForm.ts"),
    ).toContain("context.slot === TIMELESS_SLOT ? null : context.timing")
  })
})
