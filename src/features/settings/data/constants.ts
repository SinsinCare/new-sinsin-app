// CKD 병기 정보
export const CKD_STAGE_INFO: Record<
  number,
  { label: string; description: string; color: string }
> = {
  1: {
    label: "1단계",
    description: "eGFR 90 이상으로 분류되는 단계",
    color: "#2DB87E",
  },
  2: {
    label: "2단계",
    description: "eGFR 60~89로 분류되는 단계",
    color: "#5BA8E0",
  },
  3: {
    label: "3단계",
    description: "eGFR 30~59로 분류되는 단계",
    color: "#F0A500",
  },
  4: {
    label: "4단계",
    description: "eGFR 15~29로 분류되는 단계",
    color: "#E8622A",
  },
  5: {
    label: "5단계",
    description: "eGFR 15 미만으로 분류되는 단계",
    color: "#D94040",
  },
}

// 주 진단 원인 선택지
export const DIAGNOSIS_CAUSE_OPTIONS = [
  { key: "DIABETIC_KIDNEY_DISEASE", label: "당뇨병성 신장 질환" },
  { key: "HYPERTENSION", label: "고혈압" },
  { key: "GLOMERULONEPHRITIS", label: "사구체신염" },
  { key: "POLYCYSTIC_KIDNEY_DISEASE", label: "다낭성 신장 질환" },
  { key: "OTHER", label: "기타" },
] as const
export const DIAGNOSIS_CAUSES = DIAGNOSIS_CAUSE_OPTIONS.map(
  (option) => option.label,
)

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

// 회원탈퇴 약관
export const WITHDRAWAL_NOTICE =
  "회원 탈퇴 시 계정 정보와 건강 관리 데이터는 복구할 수 없도록 삭제됩니다. 관련 법령에 따라 보관할 의무가 있는 자료와 익명 처리된 커뮤니티 게시글은 정책에 따라 보존될 수 있습니다."

export const WITHDRAWAL_TERMS = [
  '본 약관은 주식회사 메디올로지(이하 "당사")가 회원(이하 "회원")의 탈퇴에 관한 모든 조건을 규정한 것입니다.',
  "탈퇴 시 진행 중인 유료 구독은 자동 해지되지 않을 수 있으며, 앱스토어/플레이스토어를 통해 별도로 해지해야 합니다.",
  '회원은 언제든지 서면, 홈페이지 등 당사가 정하는 방법으로 회원 탈퇴를 요청할 수 있으며, 당사는 회원의 요청에 따라 조속히 회원탈퇴에 필요한 제반 절차를 수행합니다. 본 약관은 주식회사 메디올로지(이하 "당사")가 회원(이하 "회원")의 탈퇴에 관한 모든 조건을 규정한 것입니다.',
]
