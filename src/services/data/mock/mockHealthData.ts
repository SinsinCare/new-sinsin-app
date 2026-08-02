/**
 * 건강검진 조회·분석의 목 데이터.
 *
 * 왜 필요한가: `nhisService` 에는 목이 없어서 `EXPO_PUBLIC_USE_MOCK_MODE=true` 로 띄우면
 * 검진 목록·상세·분석 화면이 전부 빈 채로 열렸다. 실서버는 실제 간편인증(카카오/PASS)을
 * 거쳐야 데이터가 생기므로, 목 없이는 이 화면들을 **볼 방법 자체가 없다.**
 *
 * 값은 그럴듯한 만성신장질환 경과를 흉내 낸다 — eGFR 이 서서히 떨어지고 크레아티닌이
 * 서서히 오른다. 화면의 추세 문장과 델타 표시가 의미 있게 보이려면 단조로운 값이면 안 된다.
 */

import { DASHBOARD_MODULES } from "@/src/features/health/data/dashboardMetrics"
import type {
  AuthMethodRs,
  HealthCheckResultDetailRs,
  HealthCheckResultsRs,
} from "@/src/types/nhis"

interface Seed {
  resultId: number
  checkupDate: string
  checkupPlace: string
  gfr: string
  serumCreatinine: string
  systolic: string
  diastolic: string
  fastingBloodSugar: string
  totalCholesterol: string
  hdl: string
  ldl: string
  triglyceride: string
  hemoglobin: string
  ast: string
  alt: string
  ggt: string
}

/** 과거 → 현재 순. 화면이 알아서 뒤집는다. */
const SEEDS: Seed[] = [
  {
    resultId: 9001,
    checkupDate: "2024.03.14",
    checkupPlace: "서울대학교병원",
    gfr: "88",
    serumCreatinine: "0.9",
    systolic: "118",
    diastolic: "76",
    fastingBloodSugar: "94",
    totalCholesterol: "186",
    hdl: "62",
    ldl: "112",
    triglyceride: "128",
    hemoglobin: "14.2",
    ast: "24",
    alt: "22",
    ggt: "31",
  },
  {
    resultId: 9002,
    checkupDate: "2025.04.02",
    checkupPlace: "서울삼성병원",
    gfr: "74",
    serumCreatinine: "1.05",
    systolic: "126",
    diastolic: "82",
    fastingBloodSugar: "103",
    totalCholesterol: "204",
    hdl: "55",
    ldl: "134",
    triglyceride: "162",
    hemoglobin: "13.8",
    ast: "29",
    alt: "27",
    ggt: "44",
  },
  {
    // 최근 회차. eGFR 이 주의 구간으로 내려오고 혈압이 위험까지 간다 —
    // 요약 타일의 위험/주의/정상이 전부 0 이 아니어야 화면을 제대로 볼 수 있다.
    resultId: 9003,
    checkupDate: "2026.05.21",
    checkupPlace: "서울삼성병원",
    gfr: "58",
    serumCreatinine: "1.24",
    systolic: "146",
    diastolic: "94",
    fastingBloodSugar: "118",
    totalCholesterol: "232",
    hdl: "48",
    ldl: "151",
    triglyceride: "188",
    hemoglobin: "12.9",
    ast: "35",
    alt: "41",
    ggt: "68",
  },
]

function toDetail(seed: Seed): HealthCheckResultDetailRs {
  return {
    resultId: seed.resultId,
    checkupDate: seed.checkupDate,
    checkupPlace: seed.checkupPlace,
    height: "168",
    weight: "63",
    bmi: "22.3",
    waistCircumference: "80",
    bloodPressureSystolic: seed.systolic,
    bloodPressureDiastolic: seed.diastolic,
    fastingBloodSugar: seed.fastingBloodSugar,
    totalCholesterol: seed.totalCholesterol,
    hdlCholesterol: seed.hdl,
    ldlCholesterol: seed.ldl,
    triglyceride: seed.triglyceride,
    hemoglobin: seed.hemoglobin,
    serumCreatinine: seed.serumCreatinine,
    gfr: seed.gfr,
    astSgot: seed.ast,
    altSgpt: seed.alt,
    gammaGtp: seed.ggt,
    judgement: "질환의심",
    judgementCode: "DISEASE_SUSPECTED",
    judgementDescription: "신장 기능 확인이 필요합니다.",
    createdAt: `${seed.checkupDate.replace(/\./g, "-")}T09:00:00`,
  }
}

/**
 * 회차 하나의 상태 개수. 서버 `getResults` 와 **같은 카탈로그·같은 임계값**을 쓴다 —
 * `DASHBOARD_MODULES` 에서 바로 읽으므로 숫자를 두 곳에 적지 않는다.
 */
function countStatuses(detail: HealthCheckResultDetailRs): {
  normal: number
  caution: number
  warning: number
} {
  const counts = { normal: 0, caution: 0, warning: 0 }
  for (const config of DASHBOARD_MODULES.flatMap((m) => m.metrics)) {
    const raw = detail[config.key]
    const text = raw == null ? "" : String(raw).trim()
    if (text === "") continue
    const value = Number(text.replace(/[^0-9.\-]/g, ""))
    if (!Number.isFinite(value)) continue
    counts[config.evaluate(value)] += 1
  }
  return counts
}

export const mockHealth = {
  /**
   * 간편인증 수단.
   *
   * 이게 없으면 목 모드에서 본인인증 화면이 **영영 "간편인증 방법을 불러오지 못했어요"** 만
   * 보여 준다 — 수단 목록이 비면 폼을 채워도 제출 버튼이 활성화되지 않기 때문이다.
   * 화면 자체를 볼 수 없게 되므로 목 데이터의 일부다.
   *
   * PASS 만 `requiresTelecom: true` 인 것은 정본 계약 그대로다. 카카오에는 통신사 선택이
   * 없어서, 두 수단을 오가며 통신사 행이 나타났다 사라지는 동작을 목에서도 확인할 수 있다.
   */
  authMethods(): AuthMethodRs[] {
    return [
      {
        key: "kakao",
        displayName: "카카오",
        requiresTelecom: false,
        telecomOptions: [],
      },
      {
        key: "pass",
        displayName: "Pass",
        requiresTelecom: true,
        telecomOptions: [
          { code: "S", label: "SKT" },
          { code: "K", label: "KT" },
          { code: "L", label: "LG U+" },
        ],
      },
    ]
  },

  /**
   * 목록. **상태 개수를 함께 싣는다** — 새 서버가 그렇게 준다(`getResults`).
   *
   * 개수는 지어내지 않고 같은 판정 로직으로 센다. 목이 서버와 다른 숫자를 말하면
   * 목으로 확인한 화면이 실서버에서 다르게 보인다.
   */
  results(): HealthCheckResultsRs[] {
    return SEEDS.map((s) => {
      const counts = countStatuses(toDetail(s))
      return {
        resultId: s.resultId,
        checkupDate: s.checkupDate,
        checkupPlace: s.checkupPlace,
        createdAt: `${s.checkupDate.replace(/\./g, "-")}T09:00:00`,
        normalCount: counts.normal,
        cautionCount: counts.caution,
        warningCount: counts.warning,
      }
    }).sort((a, b) => b.checkupDate.localeCompare(a.checkupDate))
  },

  detail(resultId: number): HealthCheckResultDetailRs | null {
    const seed = SEEDS.find((s) => s.resultId === resultId)
    return seed ? toDetail(seed) : null
  },

  /** 분석 목이 쓰는, 날짜 오름차순 상세 목록. */
  ascendingDetails(resultIds: number[]): HealthCheckResultDetailRs[] {
    return SEEDS.filter((s) => resultIds.includes(s.resultId)).map(toDetail)
  },

  allResultIds(): number[] {
    return SEEDS.map((s) => s.resultId)
  },
}
