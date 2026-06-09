import { getFormValidationState } from "../src/shared/utils/formValidationState"

describe("form validation display state", () => {
  it("keeps validation state neutral when success display is disabled", () => {
    expect(
      getFormValidationState({
        value: "alloy0301@gmail.com",
        hasError: false,
        showValidState: false,
      }),
    ).toBe("neutral")
  })

  it("treats empty values as empty before showing success or error color", () => {
    expect(
      getFormValidationState({
        value: "",
        hasError: false,
        showValidState: true,
      }),
    ).toBe("empty")
  })

  it("marks fields with validation errors as invalid", () => {
    expect(
      getFormValidationState({
        value: "alloy0301@gmail",
        hasError: true,
        showValidState: true,
      }),
    ).toBe("invalid")
  })

  it("marks non-empty fields without validation errors as valid", () => {
    expect(
      getFormValidationState({
        value: "alloy0301@gmail.com",
        hasError: false,
        showValidState: true,
      }),
    ).toBe("valid")
  })
})
