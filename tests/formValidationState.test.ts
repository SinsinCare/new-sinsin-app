import {
  getFormValidationState,
  toFormValidationFailure,
} from "../src/shared/utils/formValidationState"

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

/*
  `first_fail` 은 이 이벤트의 유일한 구분축이다 — "어느 칸에서 막히는가" 가 곧 고칠 대상이고,
  그 판정이 틀리면 대시보드가 엉뚱한 칸을 가리킨다. react-hook-form 의 `errors` 는 키 순서가
  폼 정의 순서가 아닐 수 있어서, 화면이 준 필드 순서로 고른다는 것이 이 함수의 계약이다.
*/
describe("toFormValidationFailure", () => {
  const FIELDS = ["password", "passwordConfirm"] as const

  it("먼저 막힌 칸은 errors 의 키 순서가 아니라 화면이 준 필드 순서로 고른다", () => {
    const failure = toFormValidationFailure("signup_password", FIELDS, {
      passwordConfirm: { type: "required" },
      password: { type: "required" },
    })
    expect(failure).toEqual({
      form: "signup_password",
      first_fail: "password",
      fail_count: 2,
    })
  })

  it("폼 순서에 없는 실패(루트 에러 등)도 센다 — 빠지면 fail_count 가 거짓말이 된다", () => {
    const failure = toFormValidationFailure("signup_password", FIELDS, {
      passwordConfirm: { type: "validate" },
      root: { type: "server" },
    })
    expect(failure?.first_fail).toBe("passwordConfirm")
    expect(failure?.fail_count).toBe(2)
  })

  it("폼 순서에 없는 실패뿐이면 그것이 first_fail 이다", () => {
    const failure = toFormValidationFailure("signup_password", FIELDS, {
      root: { type: "server" },
    })
    expect(failure).toEqual({
      form: "signup_password",
      first_fail: "root",
      fail_count: 1,
    })
  })

  it("실패가 없으면 null — 이벤트를 만들지 않는다", () => {
    expect(toFormValidationFailure("signup_password", FIELDS, {})).toBeNull()
  })

  it("undefined 로 들어온 칸은 실패가 아니다", () => {
    expect(
      toFormValidationFailure("signup_password", FIELDS, {
        password: undefined,
      }),
    ).toBeNull()
  })
})
