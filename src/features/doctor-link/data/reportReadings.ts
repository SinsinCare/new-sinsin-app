/**
 * 리포트 상세의 **순수 계산**. 화면이 아닌 여기에 두는 이유는 판정 기준(칼륨 5.0 ·
 * 인 4.5 · eGFR 하락)이 문구와 함께 바뀌는 값이라 테스트로 붙잡아 두어야 하기 때문이다.
 *
 * 기준은 콘솔의 임계값(`doctorconsole` thresholds)과 **같은 숫자를 손으로 적은 것**이다 —
 * 리포트 스냅숏에는 임계값이 굳혀지지 않아 앱이 스스로 판단한다. 콘솔 기본값이 바뀌면
 * 여기도 같이 바꿔야 한다.
 */

import type {
  DoctorReportLabPanel,
  DoctorReportNextVisit,
} from "@/src/types/doctorLink"

export type LabVerdict = "good" | "watch"

export interface LabReading {
  key: "egfr" | "potassium" | "phosphorus"
  verdict: LabVerdict
  /** i18n 키(`doctorLink.report.*`)의 마지막 조각. */
  messageKey:
    | "egfrDown"
    | "egfrStable"
    | "potassiumHigh"
    | "phosphorusHigh"
    | "withinRange"
  /** 최신 값과 단위, 비교할 지난 값(없으면 null). 줄의 두 번째 행이 "42 mL/min · 지난번 45" 로 그린다. */
  value: number
  previous: number | null
  unit: string
}

/** 혈중 칼륨 상한(mmol/L). 이상이면 살펴봐요. */
export const POTASSIUM_WATCH_AT = 5.0
/** 혈중 인 상한(mg/dL). 초과면 살펴봐요. */
export const PHOSPHORUS_WATCH_ABOVE = 4.5

/**
 * 패널(최신순)에서 세 줄을 만든다. 값이 없는 줄은 뺀다 — "모른다" 를 "좋아요" 로 그리면
 * 안 된다. eGFR 은 비교할 지난 패널이 없으면 하락을 판정할 수 없으므로 "비슷하거나
 * 좋아졌어요" 쪽이 된다(단독 수치 하나로 나쁘다고 말하지 않는다).
 */
export function readLabPanels(
  labs: readonly DoctorReportLabPanel[],
): LabReading[] {
  const latest = labs[0]
  if (!latest) return []
  const previous = labs[1] ?? null
  const out: LabReading[] = []

  if (latest.egfr !== null) {
    const down =
      previous !== null && previous.egfr !== null && latest.egfr < previous.egfr
    out.push({
      key: "egfr",
      verdict: down ? "watch" : "good",
      messageKey: down ? "egfrDown" : "egfrStable",
      value: latest.egfr,
      previous: previous?.egfr ?? null,
      unit: "mL/min",
    })
  }
  if (latest.potassium !== null) {
    const high = latest.potassium >= POTASSIUM_WATCH_AT
    out.push({
      key: "potassium",
      verdict: high ? "watch" : "good",
      messageKey: high ? "potassiumHigh" : "withinRange",
      value: latest.potassium,
      previous: previous?.potassium ?? null,
      unit: "mmol/L",
    })
  }
  if (latest.phosphorus !== null) {
    const high = latest.phosphorus > PHOSPHORUS_WATCH_ABOVE
    out.push({
      key: "phosphorus",
      verdict: high ? "watch" : "good",
      messageKey: high ? "phosphorusHigh" : "withinRange",
      value: latest.phosphorus,
      previous: previous?.phosphorus ?? null,
      unit: "mg/dL",
    })
  }
  return out
}

/** `YYYY-MM-DD` 를 **기기 시간대의 그 날 0시**로. 일정은 날짜이지 시각이 아니다. */
export function localDateOf(isoDate: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(isoDate)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

/** 서버의 naive UTC(`2026-09-11T02:43:50`)를 Date 로. 이미 오프셋이 붙어 있으면 그대로. */
export function parseServerTimestamp(raw: string): Date | null {
  const date = new Date(/(Z|[+-]\d\d:\d\d)$/u.test(raw) ? raw : `${raw}Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * 오늘 기준 D-day. 양수 = 남은 날(D-n), 0 = 당일, 음수 = 지난 날(D+n).
 * 두 날의 **자정**을 빼므로 시각은 영향이 없다.
 */
export function daysUntil(target: Date, today: Date = new Date()): number {
  const a = new Date(target.getFullYear(), target.getMonth(), target.getDate())
  const b = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((a.getTime() - b.getTime()) / 86_400_000)
}

/** 인사이트 창(일) → 주. 7로 나눠 반올림, 최소 1. */
export function windowWeeksOf(windowDays: number | null): number | null {
  if (windowDays === null || windowDays <= 0) return null
  return Math.max(1, Math.round(windowDays / 7))
}

/** 화면이 그릴 "다음 진료" 한 줄. 날짜가 깨져 있으면 카드를 숨긴다. */
export function nextVisitDate(
  visit: DoctorReportNextVisit | null,
): { date: Date; time: string | null } | null {
  if (!visit) return null
  const date = localDateOf(visit.date)
  if (!date) return null
  const time = visit.time && /^\d{2}:\d{2}/u.test(visit.time) ? visit.time.slice(0, 5) : null
  return { date, time }
}
