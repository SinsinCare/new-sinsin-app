import { borderWidth } from "@/src/design-system-v2/tokens/size"
import { StyleSheet } from "react-native"
import {
  fontFamily,
  typography,
} from "@/src/design-system-v2/tokens/typography"
import {
  FIELD,
  FORM,
  MIN,
  PAGE_X,
  S,
} from "@/src/features/home/components/record/pages/recordPageSpec"

/**
 * 자유글 작성·수정 두 화면이 나눠 쓰는 편집기 스타일 — 치수는 **홈 건강기록 6페이지 키트**
 * (`recordPageSpec`)에서 받고, 모양은 **커뮤니티 앱의 글쓰기 관습**을 따른다
 * (2026-09-12 Mobbin 조사: 당근 동네생활 글쓰기 · Reddit 새 글 · Threads · X).
 *
 * 조사한 네 앱의 공통점: ① 제목·본문은 **상자 없이** 흰 면 위에 바로 쓴다(제목은 굵고 크게,
 * 본문은 본문 글자, 섹션 라벨 없음) ② 주제는 위에 **한 줄 행**으로 접혀 있다 ③ 첨부 도구는
 * 키보드 위 도크에 라벨 아이콘으로 선다. 예전 우리 화면은 숫자 칸의 회색 상자를 제목·본문에
 * 그대로 씌워 "폼" 처럼 보였다 — 글쓰기는 폼이 아니라 종이다.
 *
 * 이 두 화면은 자기 도크 때문에 `RecordPageShell` 뼈대는 쓰지 않는다. 간격(`S[n]`) ·
 * 힌트(`FORM.hint`) · 좌우 `PAGE_X` · 터치 규격(`MIN.TOUCH`)은 키트 그대로다.
 * 화면 파일에 치수를 다시 적지 않는다 — 여기서 한 번만.
 *
 * ── 간격·정렬·위계 규칙(2026-09-12 정리) ─────────────────────────────────────
 *  · 격자: 4pt(`S`). 세로 리듬은 8 의 배수 — 붙은 것 12(제목↔태그 칩), 같은 덩어리 16,
 *    다른 덩어리 24(`FORM.sectionGap`).
 *  · 정렬선: 왼쪽 가장자리는 `PAGE_X` **하나**. 상자 안쪽 여백으로 정렬선을 깨는 요소
 *    (배경 있는 안내 박스)는 두지 않는다 — 안내는 한 줄 텍스트다.
 *  · 경계: 선은 **정보의 종류가 바뀌는 곳**에만(헤더 아래 · 주제 행 아래 · 도크 위).
 *    제목·본문·첨부 사이는 여백으로 가른다(근접성). 상자·테두리 없음.
 *  · 위계: 20 semibold(제목) → 15 regular(본문) → 13(캡션·칩·카운터·안내) 세 단.
 *  · 터치: 모든 누르는 것은 44 상자(칩·pill 은 hitSlop 으로 채운다).
 */

/** 본문의 최소 높이 — 키보드가 올라와도 서너 줄은 보이게. 큰 숫자 칸 하나 분량(카운터가 붕 뜨지 않게 더 키우지 않는다). */
const BODY_FIELD_MIN_HEIGHT = FIELD.heroHeight

/** 헤더 높이. `V2ScreenHeader` 와 같은 56(= `MIN.TOUCH` + 위아래 `S[2]` 여백 + 4). */
const HEADER_HEIGHT = MIN.TOUCH + S[3]

export const communityEditorStyles = StyleSheet.create({
  /* ── 헤더: 닫기 · 제목 · 등록/저장 ─────────────────────────────────────── */
  header: {
    minHeight: HEADER_HEIGHT,
    paddingHorizontal: PAGE_X,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: borderWidth.thin,
  },
  headerTitle: {
    ...typography.title.xSmall,
    position: "absolute",
    left: PAGE_X + MIN.TOUCH,
    right: PAGE_X + MIN.TOUCH,
    textAlign: "center",
  },
  /* 등록/저장 — Reddit·X 의 "Post" pill: 32 높이, 13 semibold. 터치는 hitSlop 으로 44. */
  submit: {
    minHeight: 32,
    paddingHorizontal: S[4],
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  submitLabel: typography.label.xSmall,

  /* ── 본문 스크롤: 섹션 리듬은 키트 그대로 ─────────────────────────────── */
  /* 주제 행은 가장자리까지 닿으므로 `content` 에 좌우 여백이 없고, 그 아래 글쓰기 면(`page`)에만 있다. */
  content: { paddingBottom: S[6] },
  /* 안내 → 제목 → 태그 칩 → 본문 → 첨부(당근 + Reddit). 세로 간격은 덩어리 사이 24, 덩어리 안 12/16. */
  page: { paddingHorizontal: PAGE_X, paddingTop: S[5], gap: FORM.sectionGap },
  /* 제목 → 태그 칩 → 본문: 한 덩어리(글). 제목·칩은 12, 칩·본문은 16. */
  paper: { gap: S[4] },
  paperHead: { gap: S[3] },
  /* 당근의 '안내' — 상자 없이 한 줄(정렬선을 지킨다). 굵은 '안내' + 13 글자, 모두 PAGE_X 에서 시작. */
  notice: { flexDirection: "row", alignItems: "flex-start", gap: S[2] },
  noticeLabel: { ...FORM.hint, fontFamily: fontFamily.bold },
  noticeBody: { ...FORM.hint, flex: 1 },
  /* Reddit 의 "Add tags (optional)" 칩 — 28 높이, 13 글자, 회색 pill. 터치는 hitSlop 으로 44. */
  tagChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: S[1],
    minHeight: 28,
    paddingHorizontal: S[3],
    borderRadius: 999,
  },
  tagChipLabel: typography.label.xSmall,
  /** 첨부(사진 레일·투표 카드·태그)처럼 이름이 필요한 덩어리만 라벨을 단다. */
  group: { gap: FORM.labelGap },
  label: FORM.label,
  hint: FORM.hint,

  /* ── 글쓰기 면: 상자 없음. 제목은 굵고 크게, 본문은 본문 글자 ───────────── */
  field: { justifyContent: "center" },
  titleField: { minHeight: 28 },
  bodyField: { minHeight: BODY_FIELD_MIN_HEIGHT, justifyContent: "flex-start" },
  titleInput: {
    ...typography.title.smallWeak,
    lineHeight: 28,
    padding: 0,
    includeFontPadding: false,
  },
  bodyInput: {
    ...FORM.body,
    fontFamily: fontFamily.regular,
    flex: 1,
    padding: 0,
    includeFontPadding: false,
  },
  /** 글자 수 카운터 — 도크 오른쪽, 키보드 내리기 옆(X 의 진행 원 자리). 본문 아래 붕 뜨지 않는다. */
  counter: { ...FORM.hint, textAlign: "right" },

  /* ── 첨부 줄(사진 레일 · 투표 카드) ────────────────────────────────────── */
  photoRail: { gap: S[3], alignItems: "center" },
  photoRailScroll: { flexGrow: 0 },

  /* ── 하단 도크: 면·해어라인은 여기서 한 번만 ───────────────────────────── */
  dock: { borderTopWidth: borderWidth.thin },
  toolbar: {
    paddingHorizontal: PAGE_X,
    flexDirection: "row",
    alignItems: "center",
  },
  toolbarActions: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: S[5],
  },
  toolbarTrailing: { flexDirection: "row", alignItems: "center", gap: S[2] },
  /* 당근의 "사진 · 장소 · 투표 · 태그" 줄 — 아이콘+라벨, 44 상자. */
  tool: {
    minHeight: MIN.TOUCH,
    minWidth: MIN.TOUCH,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: S[1],
  },
  toolLabel: FORM.hint,

  /* ── 실패·없는 글 상태 화면(수정 화면) ─────────────────────────────────── */
  stateScreen: {
    flex: 1,
    paddingHorizontal: PAGE_X,
    justifyContent: "center",
    gap: S[3],
  },
  stateTitle: { ...FORM.label, textAlign: "center" },
  stateAction: { ...FORM.option, textAlign: "center" },
})
