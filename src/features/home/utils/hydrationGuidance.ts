/**
 * 수분 안내 문구. "얼마 남았는지"를 늘 보여주지 않는다.
 *
 * 신장내과 피드백: 제한을 계속 강조하면 환자가 필요한 만큼도 안 마신다.
 * 잔여 예산 프레임은 넘치는 것만 막고 모자라는 것은 못 막는다 — 한 방향으로만
 * 미는 화면이다.
 *
 * 그래서 상한은 "가까워졌을 때만" 말한다.
 *  - 여유 구간: 남은 양을 아예 꺼내지 않는다(마시는 걸 막지 않는다)
 *  - 근접 구간: 개인 기준과 현재 기록의 차이만 중립적으로 알린다
 *  - 초과 구간: 감량을 지시하지 않고 의료진 안내를 확인하도록 돕는다
 *
 * 하한(최소 섭취량)은 만들지 않는다. 근거가 될 서버 값이 없고, 지어낸 숫자로
 * "더 마셔야 한다"고 말하면 이번엔 반대쪽으로 미는 화면이 된다.
 */

export type HydrationTone = "relaxed" | "near" | "over"

export interface HydrationGuidance {
  tone: HydrationTone
  /** 타일·시트에 그대로 쓰는 한 줄. */
  message: string
}

/** 이 비율을 넘어서야 개인 기준과의 차이를 말한다. */
export const HYDRATION_NEAR_RATIO = 0.7

export function getHydrationGuidance({
  consumed,
  limit,
  isReferenceLimit = false,
  language = "ko",
}: {
  consumed: number
  limit: number | null
  isReferenceLimit?: boolean
  language?: "ko" | "en"
}): HydrationGuidance {
  // 홈 타일은 한 줄이다(폭 ≈ 140pt → 한글 10자·영문 21자). 여기 문구가 길어지면
  // 타일마다 줄 수가 달라져 큰 숫자들이 서로 어긋나 보인다. 짧게 유지할 것.
  const english = language === "en"
  if (limit == null || limit <= 0) {
    return {
      tone: "relaxed",
      message: english ? "Set your fluid limit" : "프로필에서 기준 확인",
    }
  }

  if (isReferenceLimit) {
    return {
      tone: "relaxed",
      message: english ? "No personal limit yet" : "내 기준 미설정",
    }
  }

  const remaining = limit - consumed

  if (remaining <= 0) {
    return {
      tone: "over",
      message:
        remaining === 0
          ? english
            ? "At your limit"
            : "기준에 딱 맞아요"
          : english
            ? `${Math.abs(remaining)} mL over your limit`
            : `기준보다 ${Math.abs(remaining)}ml 많아요`,
    }
  }

  if (consumed / limit >= HYDRATION_NEAR_RATIO) {
    return {
      tone: "near",
      message: english
        ? `${remaining} mL to go`
        : `${remaining}ml 남았어요`,
    }
  }

  return {
    tone: "relaxed",
    message: english ? "Water logged today" : "오늘 마신 물이에요",
  }
}
