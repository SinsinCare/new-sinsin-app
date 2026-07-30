import { buildBloodPressureAutoSaveRequest } from "../src/features/home/utils/bloodPressureSave"

describe("blood pressure auto-save requests", () => {
  it("creates a partial request when only systolic is present", () => {
    expect(
      buildBloodPressureAutoSaveRequest(
        { systolic: "120", diastolic: "", heartRate: "" },
        "2026-07-30",
      ),
    ).toEqual({ systolic: 120, isComplete: false, date: "2026-07-30" })
  })

  it("creates a partial request when only diastolic is present", () => {
    expect(
      buildBloodPressureAutoSaveRequest(
        { systolic: "", diastolic: "80", heartRate: "" },
        "2026-07-30",
      ),
    ).toEqual({
      diastolic: 80,
      isComplete: false,
      date: "2026-07-30",
    })
  })

  it("does not create a request when every blood pressure field is blank", () => {
    expect(
      buildBloodPressureAutoSaveRequest(
        { systolic: "", diastolic: "", heartRate: "" },
        "2026-07-30",
      ),
    ).toBeNull()
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
