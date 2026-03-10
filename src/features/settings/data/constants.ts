// CKD 병기 정보
export const CKD_STAGE_INFO: Record<
  number,
  { label: string; description: string; color: string }
> = {
  1: {
    label: "1단계",
    description: "신기능 정상 또는 증가 (GFR ≥ 90)",
    color: "#2DB87E",
  },
  2: {
    label: "2단계",
    description: "신기능 경미한 감소 (GFR 60~89)",
    color: "#5BA8E0",
  },
  3: {
    label: "3단계",
    description: "신기능 중등도 감소 (GFR 30~59)",
    color: "#F0A500",
  },
  4: {
    label: "4단계",
    description: "신기능 심한 감소 (GFR 15~29)",
    color: "#E8622A",
  },
  5: { label: "5단계", description: "신부전 (GFR < 15)", color: "#D94040" },
}

// 주 진단 원인 선택지
export const DIAGNOSIS_CAUSES = [
  "당뇨병성 신장 질환",
  "고혈압",
  "사구체신염",
  "다낭성 신장 질환",
  "기타",
]

// 진단 시기 날짜 선택용
export const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
export const CURRENT_YEAR = new Date().getFullYear()
export const YEARS = Array.from(
  { length: CURRENT_YEAR - 1990 + 1 },
  (_, i) => 1990 + i,
).reverse()

// 공지사항 mock 데이터
export type Announcement = {
  id: string
  title: string
  date: string
  content: string
}

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "1",
    title: "신신당부에 오신 것을 진심으로 환영해요!",
    date: "2026.03.01",
    content:
      "안녕하세요.\n\n만성신장질환 환자를 위한 맞춤형 관리 서비스 신신당부에 오신 것을 환영합니다.\n\n신신당부는 신장내과 특화 AI를 기반으로,\n만성신장질환(CKD) 환자분들이 일상 속에서 식이·생활습관·건강 수치를 체계적으로 관리할 수 있도록 돕는 통합 케어 서비스입니다.\n\n신장질환은 증상이 없더라도 서서히 진행될 수 있어,\n정확한 정보와 꾸준한 관리가 무엇보다 중요합니다.\n\n신신당부는 여러분이 병원 외 시간에도 스스로 건강을 이해하고 관리할 수 있도록 돕는 든든한 파트너가 되겠습니다.\n\n저희 신신당부 팀은 신장질환 환자분들의 삶의 질 향상을 위해 의료진 자문과 최신 가이드라인을 기반으로 서비스를 지속적으로 개선하고 있습니다.\n\n서비스 이용 중 궁금한 점이나 도움이 필요하시면 언제든지 고객지원팀으로 문의해 주세요.\n\n신신당부와 함께, 오늘부터 더 안전한 일상을 시작해보세요.\n\n감사합니다.\n\n\n신신당부 팀 드림",
  },
  {
    id: "2",
    title: "개인정보 처리방침개정 안내",
    date: "2026.03.01",
    content:
      "안녕하세요, 신신당부입니다.\n\n2026년 3월 1일부로 개인정보 처리방침이 일부 개정되었습니다.\n\n주요 변경 사항을 확인하시고 궁금하신 점은 고객지원팀으로 문의해 주세요.\n\n감사합니다.\n\n\n신신당부 팀 드림",
  },
  {
    id: "3",
    title: "제3자 동의 처리방침개정 안내",
    date: "2026.03.01",
    content:
      "안녕하세요, 신신당부입니다.\n\n2026년 3월 1일부로 제3자 정보 제공 동의 처리방침이 일부 개정되었습니다.\n\n변경된 내용을 확인하시고 궁금하신 점은 고객지원팀으로 문의해 주세요.\n\n감사합니다.\n\n\n신신당부 팀 드림",
  },
]

// 회원탈퇴 이유 선택지
export const WITHDRAWAL_REASONS = [
  "자주 이용하지 않아요",
  "질병 관리에 도움이 되지 않는 것 같아요",
  "서비스 및 고객지원이 만족스럽지 않아요",
  "광고성 알림이 너무 많이 와요",
  "기타(직접 작성)",
]
export const WITHDRAWAL_OTHER_INDEX = 4

// 회원탈퇴 약관
export const WITHDRAWAL_NOTICE =
  "회원 탈퇴 시 회사가 보관하고 있는 회원의 계정 및 서비스 이용 기록은 모두 영구적으로 삭제 되며 복구 할 수 없습니다. 다만, 관련 법령에 따라 회사가 보관할 의무가 있는 정보 또는 자료는 일정 기간동안 보관됩니다."

export const WITHDRAWAL_TERMS = [
  '본 약관은 주식회사 메디올로지(이하 "당사")가 회원(이하 "회원")의 탈퇴에 관한 모든 조건을 규정한 것입니다.',
  "탈퇴 시 진행 중인 유료 구독은 자동 해지되지 않을 수 있으며, 앱스토어/플레이스토어를 통해 별도로 해지해야 합니다.",
  '회원은 언제든지 서면, 홈페이지 등 당사가 정하는 방법으로 회원 탈퇴를 요청할 수 있으며, 당사는 회원의 요청에 따라 조속히 회원탈퇴에 필요한 제반 절차를 수행합니다. 본 약관은 주식회사 메디올로지(이하 "당사")가 회원(이하 "회원")의 탈퇴에 관한 모든 조건을 규정한 것입니다.',
]
