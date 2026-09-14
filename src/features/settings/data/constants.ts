// 주 진단 원인 선택지
export const DIAGNOSIS_CAUSE_OPTIONS = [
  { key: "DIABETIC_KIDNEY_DISEASE", label: "당뇨병성 신장 질환" },
  { key: "HYPERTENSION", label: "고혈압" },
  { key: "GLOMERULONEPHRITIS", label: "사구체신염" },
  { key: "POLYCYSTIC_KIDNEY_DISEASE", label: "다낭성 신장 질환" },
  { key: "OTHER", label: "기타" },
] as const

// 진단 시기 날짜 선택용
export const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
export const CURRENT_YEAR = new Date().getFullYear()
export const YEARS = Array.from(
  { length: CURRENT_YEAR - 1990 + 1 },
  (_, i) => 1990 + i,
).reverse()

// 공지사항 fallback 데이터 (공지 API 실패 시 표시)
export type Announcement = {
  id: string
  title: string
  date: string
  content: string
}

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "1",
    title: "신신당부에 오신 걸 환영해요",
    date: "2026.03.01",
    content:
      "안녕하세요, 신신당부예요.\n\n식단, 수분, 체중 같은 건강 기록을 한곳에서 관리하고 내 기록에 맞는 안내를 받아볼 수 있어요.\n\n처음이라면 오늘 먹은 식사나 체중부터 기록해 보세요. 궁금한 점은 언제든 고객지원팀에 문의해 주세요.\n\n신신당부 팀 드림",
  },
  {
    id: "2",
    title: "개인정보 처리방침 개정 안내",
    date: "2026.03.01",
    content:
      "안녕하세요, 신신당부예요.\n\n2026년 3월 1일부터 개인정보 처리방침 일부가 바뀌었어요.\n\n주요 변경 사항을 확인해 주세요. 궁금한 점은 고객지원팀에 문의해 주세요.\n\n신신당부 팀 드림",
  },
  {
    id: "3",
    title: "제3자 정보 제공 동의 처리방침 개정 안내",
    date: "2026.03.01",
    content:
      "안녕하세요, 신신당부예요.\n\n2026년 3월 1일부터 제3자 정보 제공 동의 처리방침 일부가 바뀌었어요.\n\n변경된 내용을 확인해 주세요. 궁금한 점은 고객지원팀에 문의해 주세요.\n\n신신당부 팀 드림",
  },
]

// 회원탈퇴 이유 선택지
export const WITHDRAWAL_REASONS = [
  "자주 이용하지 않아요",
  "질병 관리에 도움이 되지 않아요",
  "앱이나 고객지원이 마음에 들지 않아요",
  "마케팅 알림이 너무 자주 와요",
  "기타 (직접 작성)",
]
export const WITHDRAWAL_OTHER_INDEX = 4

/** "기타" 상세 사유 하한. 이 값 미만이면 다음 버튼이 잠긴다. */
export const WITHDRAWAL_DETAIL_MIN = 20
/** 상세 사유 상한. 서버 `detail` 스키마(maxLength 500)와 같은 값이어야 한다. */
export const WITHDRAWAL_DETAIL_MAX = 500
