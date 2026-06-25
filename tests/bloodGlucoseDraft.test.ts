import { mergeBloodGlucoseDraftFromAnalysis } from "../src/features/home/utils/bloodGlucoseDraft"

describe("blood glucose draft", () => {
  it("keeps local same-date edits ahead of late server hydration", () => {
    const draft = mergeBloodGlucoseDraftFromAnalysis(
      [
        {
          value: 110,
          timing: "AFTER_MEAL",
          elapsed: "30M",
          recordDate: "2026-06-25",
        },
      ],
      {
        AFTER_MEAL: {
          value: "110",
          elapsed: "2H",
        },
      },
      { isNewDate: false },
    )

    expect(draft.AFTER_MEAL).toEqual({
      value: "110",
      elapsed: "2H",
    })
  })

  it("replaces the draft when the selected date changes", () => {
    const draft = mergeBloodGlucoseDraftFromAnalysis(
      [
        {
          value: 98,
          timing: "FASTING",
          elapsed: null,
          recordDate: "2026-06-26",
        },
      ],
      {
        AFTER_MEAL: {
          value: "140",
          elapsed: "1H",
        },
      },
      { isNewDate: true },
    )

    expect(draft).toEqual({
      FASTING: {
        value: "98",
        elapsed: "2H",
      },
    })
  })
})
