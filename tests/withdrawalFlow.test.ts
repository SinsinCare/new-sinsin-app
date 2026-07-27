import {
  WITHDRAWAL_OTHER_CODE,
  WITHDRAWAL_OTHER_MAX_LENGTH,
  WITHDRAWAL_OTHER_MIN_LENGTH,
  WITHDRAWAL_REASON_OPTIONS,
} from "../src/features/settings/data/constants"
import {
  clearWithdrawalDraft,
  getWithdrawalDraft,
  saveWithdrawalDraft,
} from "../src/features/settings/services/withdrawalDraft"

describe("withdrawal reason contract", () => {
  afterEach(() => {
    clearWithdrawalDraft()
  })

  it("uses stable backend reason codes while preserving the Korean labels", () => {
    expect(WITHDRAWAL_REASON_OPTIONS).toEqual([
      { code: "LOW_USAGE", label: "자주 이용하지 않아요" },
      {
        code: "NOT_HELPFUL_FOR_HEALTH_MANAGEMENT",
        label: "질병 관리에 도움이 되지 않는 것 같아요",
      },
      {
        code: "UNSATISFACTORY_SERVICE_OR_SUPPORT",
        label: "서비스 및 고객지원이 만족스럽지 않아요",
      },
      { code: "TOO_MANY_NOTIFICATIONS", label: "광고성 알림이 너무 많이 와요" },
      { code: "OTHER", label: "기타(직접 작성)" },
    ])
  })

  it("keeps the OTHER detail in transient memory, not route parameters", () => {
    const detail =
      "검사 결과를 정리하는 기능이 제 생활 방식에는 맞지 않았습니다."
    expect(detail.trim().length).toBeGreaterThanOrEqual(
      WITHDRAWAL_OTHER_MIN_LENGTH,
    )
    expect(detail.trim().length).toBeLessThanOrEqual(
      WITHDRAWAL_OTHER_MAX_LENGTH,
    )

    saveWithdrawalDraft({
      reasonCode: WITHDRAWAL_OTHER_CODE,
      otherDetail: detail,
      deleteMyPosts: false,
    })

    expect(getWithdrawalDraft()).toEqual({
      reasonCode: "OTHER",
      otherDetail: detail,
      deleteMyPosts: false,
    })

    clearWithdrawalDraft()
    expect(getWithdrawalDraft()).toBeNull()
  })
})
