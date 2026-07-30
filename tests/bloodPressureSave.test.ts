import { buildBloodPressureAutoSaveRequest } from "../src/features/home/utils/bloodPressureSave"

describe("blood pressure auto-save requests", () => {
  it("does not create a request until systolic and diastolic are present", () => {
    expect(
      buildBloodPressureAutoSaveRequest(
        { systolic: "120", diastolic: "", heartRate: "" },
        "2026-07-30",
      ),
    ).toBeNull()
  })

  it("creates a non-notifying partial save before heart rate is entered", () => {
    expect(
      buildBloodPressureAutoSaveRequest(
        { systolic: "120", diastolic: "80", heartRate: "" },
        "2026-07-30",
      ),
    ).toEqual({
      systolic: 120,
      diastolic: 80,
      heartRate: null,
      isComplete: false,
      date: "2026-07-30",
    })
  })

  it("creates a complete save after heart rate is entered", () => {
    expect(
      buildBloodPressureAutoSaveRequest(
        { systolic: "120", diastolic: "80", heartRate: "70" },
        "2026-07-30",
      ),
    ).toEqual({
      systolic: 120,
      diastolic: 80,
      heartRate: 70,
      isComplete: true,
      date: "2026-07-30",
    })
  })
})
