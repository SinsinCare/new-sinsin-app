import type { StatsReport } from "../../src/features/stats-report/types/report"

/** Synthetic examples only. Never saved, sent to analytics, or inserted into a query cache. */
export const emptyStatsReport: StatsReport = {
  period: "day",
  startDate: "2026-09-07",
  endDate: "2026-09-07",
  title: "9월 7일",
  reliability: {
    mealsRecorded: 0,
    mealsExpected: 3,
    ratePercent: 0,
    level: "LOW",
  },
  conclusion: {
    badge: "기록 부족",
    headline: "기록이 더 필요해요",
    support: "아직 기록이 없어요.",
    action: "식사를 기록해 보세요.",
    actionCaption: "",
    source: "FALLBACK",
  },
  overlapSignals: null,
  maintainCard: null,
  nutrients: null,
  nutrientsFootnote: null,
  foods: null,
  vitals: null,
  weekCharts: null,
  averages: null,
  weeklyCompare: null,
  clinicNote: null,
  disclaimer:
    "이 기록만으로 약 종류·복용량이나 투석 일정을 바꾸지 마세요. 처방한 의료진과 상의해 주세요.",
}
export const dailyStatsReport: StatsReport = {
  ...emptyStatsReport,
  reliability: {
    mealsRecorded: 3,
    mealsExpected: 3,
    ratePercent: 100,
    level: "HIGH",
  },
  conclusion: {
    badge: "확인할 영양소 2개",
    headline: "나트륨이 개인 기준을 넘었어요",
    support:
      "기록한 세 끼의 나트륨은 총 2,430mg이에요. 점심과 저녁의 국물 요리를 함께 살펴보세요.",
    action: "다음 식사에서는 국물과 소스를 덜어보세요.",
    actionCaption:
      "식사 기록을 함께 보면 어느 음식에서 섭취했는지 확인할 수 있어요.",
    source: "FALLBACK",
  },
  nutrients: [
    {
      key: "potassium",
      label: "칼륨",
      isReference: true,
      badgeLevel: "OK",
      badgeLabel: "기준 안",
      valueText: "1,850",
      limitText: "3,000mg",
      remainLine: "개인 참고 기준보다 1,150mg 적게 기록했어요.",
    },
    {
      key: "sodium",
      label: "나트륨",
      isReference: false,
      badgeLevel: "DANGER",
      badgeLabel: "기준 초과",
      valueText: "2,430",
      limitText: "2,000mg",
      remainLine: "개인 기준보다 430mg 많아요. 국물과 소스 양을 살펴보세요.",
    },
    {
      key: "phosphorus",
      label: "인",
      isReference: true,
      badgeLevel: "CAUTION",
      badgeLabel: "확인 필요",
      valueText: "890",
      limitText: "1,000mg",
      remainLine: "개인 참고 기준에 가까워요. 가공식품 섭취 기록을 살펴보세요.",
    },
    {
      key: "protein",
      label: "단백질",
      isReference: false,
      badgeLevel: "OK",
      badgeLabel: "기준 안",
      valueText: "46.5",
      limitText: "50g",
      remainLine: "오늘 기록한 식사의 단백질을 합친 값이에요.",
    },
  ],
  nutrientsFootnote:
    "예시 수치예요. 실제 개인 기준은 검사 결과와 의료진의 안내를 따라요.",
  foods: [
    {
      analysisId: -1,
      title: "달걀찜과 흰쌀밥",
      timeText: "08:10",
      metricText: "나트륨 480mg",
      badgeLevel: "OK",
      badgeLabel: "기준 안",
    },
    {
      analysisId: -2,
      title: "소고기뭇국과 나물 반찬",
      timeText: "12:30",
      metricText: "나트륨 1,120mg",
      badgeLevel: "CAUTION",
      badgeLabel: "나트륨 확인",
    },
    {
      analysisId: -3,
      title: "맑은 생선국과 채소 반찬",
      timeText: "18:40",
      metricText: "나트륨 830mg",
      badgeLevel: "CAUTION",
      badgeLabel: "나트륨 확인",
    },
  ],
  vitals: [
    {
      key: "water",
      label: "수분",
      valueText: "900",
      unit: "mL",
      badgeLevel: "OK",
      badgeLabel: "기록됨",
      interpret:
        "08:00부터 기록한 수분이에요. 식사에 포함된 수분은 별도로 확인해 주세요.",
    },
  ],
}
export const weeklyStatsReport: StatsReport = {
  ...emptyStatsReport,
  period: "week",
  startDate: "2026-08-31",
  endDate: "2026-09-06",
  reliability: {
    mealsRecorded: 16,
    mealsExpected: 21,
    ratePercent: 76,
    level: "MEDIUM",
  },
  conclusion: {
    badge: "주간 변화",
    headline: "칼륨 기준을 넘긴 날이 늘었어요",
    support:
      "지난주 1일에서 이번 주 2일로 늘었어요. 기록한 6일을 비교한 결과예요.",
    action: "기준을 넘긴 날의 식사 구성을 살펴보세요.",
    actionCaption: "날짜를 누르면 그날의 영양소와 식사 기록을 볼 수 있어요.",
    source: "FALLBACK",
  },
  weekCharts: {
    potassium: {
      limitText: "개인 참고 기준 3,000mg",
      days: [0.5, 0.7, 1.1, 0, 0.8, 1.8, 0.6].map((ratio, i) => ({
        day: i === 0 ? 31 : i,
        ratio,
        over: ratio > 1,
        empty: i === 3,
      })),
      caption:
        "2일과 5일에 개인 참고 기준을 넘었어요. 기록 없는 3일은 비교에서 제외했어요.",
    },
    weight: {
      baselineText: "8월 31일 기준",
      days: [0.4, 0.5, 0.6, 0, 0.7, 0.6, 0.8].map((ratio, i) => ({
        day: i === 0 ? 31 : i,
        ratio,
        over: false,
        empty: i === 3,
      })),
      deltaText: "+0.4",
      deltaUnit: "kg · 첫 기록 대비",
      badgeLevel: "OK",
      caption:
        "기록한 기간의 체중 변화예요. 측정 시간과 조건도 함께 살펴보세요.",
    },
  },
  averages: [
    {
      key: "sodium",
      label: "나트륨",
      valueText: "2,130",
      unit: "mg 평균",
      deltaText: null,
      badgeLevel: "CAUTION",
      badgeLabel: "확인 필요",
      interpret:
        "기록한 6일 중 3일 개인 기준을 넘었어요. 평균만으로 하루 상태를 판단하지 않아요.",
    },
  ],
}
export const monthlyStatsReport: StatsReport = {
  ...emptyStatsReport,
  period: "month",
  startDate: "2026-08-01",
  endDate: "2026-08-31",
  reliability: {
    mealsRecorded: 72,
    mealsExpected: 93,
    ratePercent: 77,
    level: "MEDIUM",
  },
  conclusion: {
    badge: "월간 변화",
    headline: "기준을 넘긴 날이 점차 줄었어요",
    support:
      "월초보다 월말에 칼륨 기준을 넘긴 날이 줄었어요. 기록한 끼니가 달라 주별 기록량도 함께 봐주세요.",
    action: "꾸준히 이어온 식사 구성을 기록해 두세요.",
    actionCaption: "다음 달에도 같은 조건으로 비교하면 흐름을 보기 쉬워요.",
    source: "FALLBACK",
  },
  weeklyCompare: {
    title: "주별 변화",
    caption: "칼륨 기준 초과일과 체중 변화",
    weeks: [4, 3, 1, 0, 0].map((n, i) => ({
      label: `${i + 1}주`,
      overDays: n,
      daysInWeek: i === 4 ? 3 : 7,
      weightDeltaText: i === 4 ? null : "-0.2kg",
    })),
    note: "초과일 수는 기록이 있는 날만 집계해요. 기록이 없던 날을 기준 안으로 해석하지 마세요.",
  },
  averages: [
    {
      key: "potassium",
      label: "칼륨",
      valueText: "2,380",
      unit: "mg 평균",
      deltaText: "-420mg",
      badgeLevel: "GOOD",
      badgeLabel: "줄어듦",
      interpret:
        "지난달보다 하루 평균 420mg 적게 기록했어요. 검사 결과와 함께 참고해 주세요.",
    },
  ],
}
