# 00-MASTER — 커뮤니티(자유글) 리디자인 구현 정본

12개 구역 스펙(`feed-drag` · `feed-home` · `search` · `popular` · `story-page` · `post-detail` ·
`comment-write` · `detail-drag` · `author-profile` · `compose` · `meal-169` · `meal-story`)을
하나로 합친 **구현용 정본**이다. 이 문서 하나만 읽고 구현할 수 있어야 한다.
개별 구역 스펙은 근거(측정 방법·프레임 좌표)를 확인할 때만 열어라.

---

## 0. 이 문서를 읽는 규칙

### 0.1 판정 규칙 (충돌이 나면 이 순서로 정한다)

1. **토큰은 디자인시스템이 이긴다.** 색·굵기·letterSpacing·radius 사다리·타이포 크기는 v2 토큰으로
   스냅한다. 시안의 오프토큰 값(`#2E2F33@88%`, `#07194C@5%`, 0.66px 스트로크, 0.31 알파)은 버린다.
2. **레이아웃·IA는 디자인이 이긴다.** 여백 20, 행 높이 98/76/101/176, 카드가 아니라 행,
   상단 3탭, 정렬 드롭다운, 댓글 5개 캡 등은 시안대로 만든다.
3. **사용자 취향**: 밀도 최소화 · 화면당 프라이머리 1개 + 나머지는 그레이스케일.
   시안이 같은 화면에 강조를 두 개 그렸으면 하나로 줄인다.
4. **시안이 침묵한 것은 삭제 근거가 아니다.** §6 보존 목록이 최우선이다.

### 0.2 전역 불변식 (모든 화면 공통 · 예외 없음)

| 항목 | 값 |
|---|---|
| `letterSpacing` | **0**. 현행 코드의 `-0.23 … -0.4` 는 전부 제거 |
| 굵기 | **face 로만**(`typography.*` 토큰). `fontWeight` 병기 금지 |
| 폰트 크기 | **정수 10 / 11 / 12 / 13 / 15 / 17 / 20 / 22 만**. 13.5·14.5·15.5 전부 제거 |
| 화면 좌우 여백 | **20** (`COMMUNITY_GUTTER`) — §5.1 |
| 시트 좌우 여백 | **24** (`SHEET_GUTTER`, DS 값 유지) |
| 앱바 | iOS **44** / Android 54 (`V2ScreenHeader`) |
| 상태바 | `insets.top` (시안의 50 을 하드코딩하지 말 것) |
| 하단 CTA 바 | `paddingTop 0` + 36px 페이드, `paddingBottom max(insets.bottom, 20)` |
| 아이콘 | `V2Icon` 만. Ionicons 는 전부 교체 |
| 로딩 | 링 스피너 금지. 스켈레톤 우선, 꼬리 로더는 `V2DotLoader` |
| 다크모드 | 시안은 라이트 전용. **반드시 `useV2Theme()` 토큰으로 그려 다크를 유지**한다 |
| 문자열 | 전부 `t()`. 시안 한국어는 `ko` 값일 뿐 하드코딩 금지 |
| 소유자 판정 | 서버 `isMine`(`utils/contentOwnership.isMyContent`). 닉네임 비교 금지 |

### 0.3 측정 신뢰도

모든 수치는 SVG 원본 실측이고, 폰트 크기는 실제 `Pretendard-*.otf` 메트릭(upem 2048,
한글 advance 0.8643em, cap 0.707em)으로 역산해 오차 <0.5% 로 정수에 수렴했다.
**굵기만** 일부 구역에서 육안 판정이라 ±1단계 오차가 있다 — 아래 표에서 굵기가
구역마다 갈린 항목은 §5 에서 판정을 못박았다.

---

## 1. 화면 지도

### 1.1 전체 화면 목록

| # | 화면 | 라우트 (Expo Router) | 상태 | 상태 목록 |
|---|---|---|---|---|
| S1 | **자유글 피드** | `app/(tabs)/community.tsx` → `FreePostTab` | 개편 | 최상단 · 스크롤중 · 태그필터 · 로딩(스켈레톤) · 에러 · 빈상태 · 다음페이지로딩 |
| S2 | **검색 레이어** | `app/community/search.tsx` | 개편 | 빈 최근검색 · 최근검색 있음 · 입력중 · 결과 · 칩선택 · 정렬열림 · 결과로딩/에러/무결과 |
| S3 | **인기글** | `app/(tabs)/community-popular.tsx` | 개편 | 실시간/주간/월간 × 카테고리칩 · 로딩 · 에러 · 빈상태 |
| S4 | **게시글 상세** | `app/post/[id].tsx` | 개편 | 기본 · 좋아요됨 · 정렬드롭다운 · 정렬결과 · 댓글빈상태 · 로딩 · 에러 · 삭제된글 |
| S5 | **답글쓰기** | **신규** `app/community/reply.tsx?postId=&commentId=` | 신규 | 빈 컴포저 · 초안 · 답글 있음 · 더보기 메뉴 · 삭제 후 · 키보드 업/다운 |
| S6 | **신고하기** | `app/community/report.tsx` | 개편 | 기본(비활성) · 기타시트(빈/입력) · 1선택 · 다중선택 · 제출중 |
| S7 | **글쓰기(작성)** | `app/(write)/free/new.tsx` | 개편 | 빈 · 카테고리시트 · 부분입력 · 태그칩 · 본문입력(CTA활성) · 사진첨부 · 업로드중 · 나가기확인 |
| S8 | **글쓰기(수정)** | `app/(write)/free/[id].tsx` | **S7 로 통합** | 위와 동일 + 소유자 가드 |
| S9 | **작성자 프로필** | `app/community/author/[id].tsx` | 개편 | 후기/게시글/스토리 탭 × 팔로우/팔로잉 · 로딩 · 에러 · 빈상태 |
| S10 | **팔로워/팔로잉** | `app/community/connections.tsx?id=&mode=` | 개편 | 팔로워(버튼 없음) · 팔로잉(행별 버튼) |
| S11 | **신신이웃(작성자 디렉터리)** | **신규** `app/community/neighbors.tsx` | 신규 | 기본 · 카테고리칩 선택 |
| S12 | **스토리 뷰어 (= 오늘의 식단)** | `app/stories.tsx` | 전면개편 | 캡션1줄 · 캡션2줄 · 좋아요 · 액션시트 · 댓글시트(빈/목록/키보드/팝오버) · 레터박스 3종 |
| S13 | **스토리 작성** | `app/(write)/story/new.tsx` | 전면개편 | 편집 기본 · 칩선택 · 키보드 · 캡션입력 · 업로드가능 · 취소확인 |
| S14 | 인앱 카메라 | **신규 · P3 보류** `app/(write)/story/camera.tsx` | 보류 | 라이브 프리뷰만 |
| S15 | 갤러리 그리드 피커 | **신규 · P3 보류** | 보류 | 그리드 · 앨범드롭다운 |
| S16 | 내 활동 / 북마크 | `app/community-library.tsx` | **무변경(보존)** | — |

### 1.2 화면 간 이동

```
[하단탭 · 레시피]
  └ 상단탭  레시피 | 자유글 | 스토리          (+우상단 프로필 아이콘 24)
              │        │        └─ S12 스토리 뷰어
              │        └─ S1 자유글 피드
              │              ├ 검색필드 탭 ─────────► S2 검색 레이어
              │              ├ 행 탭 ──────────────► S4 상세
              │              ├ 행 케밥(⋯) ─────────► 신고 S6 / 차단 (보존)
              │              ├ 작성자 레일 카드 ────► S9 프로필,  더보기 ► S11 신신이웃
              │              └ FAB `글쓰기` ────────► S7 작성
              └ (레시피 탭은 이 리디자인 범위 밖)

S3 인기글  ◄── 홈/피드의 `인기글 더보기`,  헤더 검색 ─► S2

S4 상세
  ├ 앱바 ⋯ ────────► 게시물 액션시트(공유/북마크/수정/삭제/신고/차단) ─► S6
  ├ 정렬 `최신순 ⌄` ─► V2Menu (최신순/인기순)
  ├ 댓글 행 ⋯ ──────► V2Menu (수정/삭제/신고 — isMine 조건부)
  ├ `답글쓰기` ─────► S5 답글쓰기
  ├ `댓글 더보기` ──► 인라인 다음 페이지
  ├ 작성자 행/카드 ─► S9
  ├ 이전/다음 행 ───► 인접 S4
  └ 추천/다른글 행 ─► S4

S9 프로필 ── 팔로워/팔로잉 카운트 ─► S10 ── `이런 작성자도 만나보세요` 더보기 ─► S11

S12 스토리 뷰어
  ├ 앱바 ⋯ ────────► 액션시트(관심없음/신고하기/취소) · 내 스토리면 삭제/수정
  ├ 사진 우상단 카메라 ─► S13 스토리 작성 (→ S14/S15 는 P3)
  ├ 하단 💬 / 입력바 ──► 댓글 시트 (86%)
  └ 댓글 행 ⋯ ────────► V2Menu (수정/삭제)
```

### 1.3 IA 변경 (⚠ 제품 승인 필요 — §5.0)

시안의 하단 탭바는 **홈 · 상담 · 레시피 · 식당 · 전체** 5칸이고 **레시피가 활성**인 상태에서
상단에 **레시피 | 자유글 | 스토리** 3탭이 있다. 즉 시안은:

- 하단탭의 `커뮤니티` 슬롯 → **`상담`** 으로 교체
- `자유글` · `스토리` → **레시피 하단탭 안의 상단탭**으로 이동

이건 커뮤니티만의 변경이 아니라 앱 전체 내비게이션 변경이다. §7 P3 로 분리했고,
**P1 은 현행 `커뮤니티` 하단탭을 유지한 채 그 안에 3탭 스트립을 넣는 것**으로 진행한다
(시각은 시안과 동일, 라우팅만 보수적).

---

## 2. 공유 프리미티브

**배치 위치**: 전부 `src/features/recipe/components/community/` 아래 신규 디렉터리.
(커뮤니티 코드는 이미 `features/recipe` 안에 산다 — 이동시키지 말고 하위 폴더로 모은다.)

### 2.0 `communityLayout.ts` — 레이아웃 상수 정본

```ts
// src/features/recipe/components/community/communityLayout.ts
export const COMMUNITY_GUTTER = spacing[20]      // 20 — §5.1
export const CHIP_GAP = spacing[6]               // 6 (v2 layout.CHIP_GAP=8 과 다름 · §5.2)
export const RAIL_INSET = COMMUNITY_GUTTER       // 가로 스크롤 contentContainerStyle 에만
export const SECTION_BAND = 8                    // 8px background.lower 밴드 (v2 thick=16 아님)
export const ROW = {
  microPill: 21,       // 태그/카테고리/작성자 배지 높이
  chip: 32,            // 필터 칩 = controlHeight.sm
  thumbLarge: 86,      // 피드/인기글 썸네일
  thumbSmall: 60,      // 목록 행 썸네일
  postTextColumn: 74,  // 20 + 4 + 20 + 12 + 18
  compactRow: 76,
  commentRow: 98,      // 본문 한 줄 기준. 줄당 +16
  commentReplyIndent: 12,
  directoryRow: 101,
  connectionRow: 81,
  sectionHeader: 47,
  sortBar: 48,
  tabStrip: 51,
}
```

---

### 2.1 `PostRow` — **피드/검색/인기글 공용 게시글 행** (가장 중요)

> 4개 구역(feed-drag · feed-home · search · popular)에서 측정된 **행 높이 106/118/138/147/176/179가
> 전부 아래 한 공식으로 재현된다.** 행 종류를 나누지 말고 이 컴포넌트 하나로 만든다.

**공식**
```
행 높이 = 16
        + [헤더행 + 8]        헤더행 = 랭크원 24 있으면 24, 없고 카테고리 배지만 있으면 21
        + [태그레일 21 + 8]   태그가 있을 때만
        + max(썸네일 86, 텍스트열 74)
        + 16
```
검증: 176(배지+태그+썸) · 147(태그+썸) · 118(썸만) · 106(썸 없음) ·
179(랭크+배지+태그+썸) · 138(랭크만) — **전부 실측과 일치**.

**치수**
| 항목 | 값 |
|---|---|
| 컨테이너 | 전폭 행. **카드 아님** — radius 0, 배경 `background.default`, 행 간격 0 |
| 좌우 패딩 | 20 |
| 하단 구분선 | 1px **full-bleed(인셋 0)** `line.alternative` (`#70737c14`) |
| 랭크 원 (인기글만) | 24×24 `radius.full`, bg `primary.primaryWeak`, 숫자 `label.xSmall`(13 SemiBold) `primary.primary`, `minWidth 24`(2자리 대비) |
| 카테고리 배지 | `MicroPill face="ink"` — 21h, pill, bg `label.neutral`, 라벨 10 SemiBold `static.white`, padH 7 |
| 랭크↔배지 gap | 6 |
| 태그 칩 | `MicroPill face="neutral"` — 21h, pill, bg `fill.normal`, 라벨 10 SemiBold `label.neutral`, padH 7, **gap 6**, 최대 4개(`tags.slice(0,4)`) |
| 텍스트열 폭 | 썸네일 있으면 **237**, 없으면 **335** (`flex:1` 로 구현) |
| 제목 | **15 Medium / lh 20**, `label.normal`, `numberOfLines={1}` |
| 제목↔요약 | 4 |
| 요약 | **13 Regular / lh 20** (`body.xSmall`), `label.neutral`, `numberOfLines={1}` |
| 요약↔메타 | 12 |
| 메타행 | `MetaRow` (§2.3), lh 18 |
| 썸네일 | **86×86 `radius.sm`(8)**, 우측 인셋 20, 텍스트열과 gap 12, `expo-image` `contentFit="cover"` |
| 썸네일 세로정렬 | 썸네일이 콘텐츠 블록 높이를 정한다 → 텍스트열(74)은 그 안에서 **세로 중앙** |
| 한글 줄바꿈 | `lineBreakStrategyIOS="hangul-word"` · `textBreakStrategy="balanced"` |

**v2 매핑**: `MicroPill`(신규, §2.2) · `V2Text` + `subtext.largeStrong`(신규 토큰, §4-G9) /
`body.xSmall` / `subtext.medium` / `subtext.small` · `V2Divider tone="alternative"` inset 0 ·
`expo-image`.

**Props**
```ts
type PostRowProps = {
  post: CommunityPost
  rank?: number            // 인기글에서만
  onPress: () => void
  onPressTag?: (tag: string) => void
  onPressMore?: () => void // 시안엔 없다 — 보존용 히트영역(§6.1)
}
```
**파일**: `components/community/PostRow.tsx` (+ `PostRowSkeleton.tsx`)

**시안 오류 정정**: search F5 첫 행과 popular 카드1의 상단 패딩 8 → **16 으로 통일**.

---

### 2.2 `MicroPill` — 21px 마이크로 배지 (4면)

v2 `V2Chip` 은 최소 32h 라 쓸 수 없다. **`V2Badge` 계열**이 맞다.

| face | 배경 | 글자 | 쓰는 곳 |
|---|---|---|---|
| `ink` | `label.neutral` | `static.white` | 카테고리 배지 `질문·상담` (피드/검색/인기글/상세) |
| `neutral` | `fill.normal` | `label.neutral` | 태그 칩, 작성자 카드 배지 칩, 이전/다음 칩 |
| `brandWeak` | `primary.primaryWeak` | `primary.primary` | 댓글 `작성자` 배지 (40×21) |
| `onMedia` | `static.white` | `primary.primary` | 스토리 뷰어 `저염식` 배지 (40×21) |

공통: 높이 **21**, `radius.full`, padH **7**, 라벨 `typography.caption.xSmall`(10 SemiBold).
**v2 매핑**: `V2Badge size="xs"` + §4-G2 추가(`shape="pill"`, padV 4, neutral-weak 를 `fill.normal` 로,
ink/onMedia face). 추가 전까지는 로컬 구현.
**파일**: `components/community/MicroPill.tsx`

---

### 2.3 `MetaRow` — 조회/좋아요/댓글/시각 한 줄

```
[조회 3,291] ─12─ [♥16 ─2─ 541] ─12─ [💬16 ─2─ 77] ─── flex ─── [2시간 전 / 2026.07.28]
```
| 항목 | 값 |
|---|---|
| 높이 | lh 18 |
| `조회 N` | **13 Regular** (`subtext.medium`), `label.alternative`. `viewCount == null` 이면 통째로 생략(하위호환·보존) |
| 아이콘 | `heartFilled` / `chatOutline`|`chat` **16**(`iconSize.xs`), `label.assistive` |
| 수치 | 13 Regular `label.alternative`. **0 도 표시**(댓글 행 규칙) |
| 시각 — 목록 | **12 Regular** (`subtext.small`), `label.alternative`, 우측 정렬 (`marginLeft:"auto"`) — §5.4 |
| 시각 — 상세/댓글 | **절대 날짜 `2026.07.28`**, 13 Regular `label.alternative`, 우측 정렬 |
| 우측 정렬 기준 | **실제 컬럼 우변**(썸네일 있으면 237 컬럼, 없으면 335). 시안이 337 고정폭으로 그린 건 오류 |

**파일**: `components/community/MetaRow.tsx`

---

### 2.4 `CompactPostRow` — 76px 목록 행 (썸네일 60)

쓰는 곳: 상세의 `신신마스터의 다른글` · `추천 게시글`, 작성자 프로필의 `추천 게시글`.

| 항목 | 값 |
|---|---|
| 높이 | **76**, 전폭, 하단 1px full-bleed `line.alternative`, **섹션 첫 행 위엔 선 없음** |
| 좌우 패딩 | 20 |
| 제목 | **15 Medium / lh 19** (`label.smallWeak`), `label.normal`, 1줄 말줄임 |
| 제목↔메타 | 6 |
| 메타 | `MetaRow` (시각 없음 — `조회 N · ♥N · 💬N` 만) |
| 썸네일 | **60×60 `radius.sm`**, 우측 인셋 20, 세로 중앙((76−60)/2=8), 텍스트와 gap 12 |
| 이미지 개수 배지 | 썸네일 **우·하단에서 각 8 안쪽**, **20×20 원**, bg `label.alternative`, 숫자 **13 SemiBold** `static.white`. 이미지 2장 이상일 때만 |
| 제목 최대폭 | 썸네일 있음 263 / 없음 335 (`flex:1`) |

**파일**: `components/community/CompactPostRow.tsx`

---

### 2.5 `CategoryChipRail` — 32px 필터 칩 레일

| 항목 | 값 |
|---|---|
| 컨테이너 | 높이 **64**(padV 16) 또는 **52**(검색 결과 헤더, padV 10), 하단 1px `line.alternative` |
| 칩 | 높이 **32**(`controlHeight.sm`), `radius.full`, padH **12**, 라벨 **13 SemiBold**(`label.xSmall`) |
| gap | **6** |
| 첫 인셋 | 20 — **`contentContainerStyle`** 에 준다(컨테이너 padding 금지) |
| 비선택 | bg `fill.normal`, 글자 `label.neutral`, 테두리 없음(시안의 0.66px 8% 테두리는 무시) |
| 선택 | bg `primary.primaryWeak` + **1px `primary.primary`** + 글자 `primary.primary`. 굵기 안 바뀜 |
| 선택 시 방사형 글로우 | **버린다**(토큰 없음, 32px 에선 시각 차이 없음) |
| 스크롤 | 가로 스크롤(마지막 칩이 화면 밖으로 잘리는 게 어포던스) |
| 단일 선택 | `전체` 가 기본 선택(=`category === null`). "아무것도 선택 안 됨" 상태를 만들지 말 것 |

**v2 매핑**: `V2Chip size="s"` + §4-G3(`tone="brandSoft"`).
**파일**: `components/community/CategoryChipRail.tsx`

---

### 2.6 `SortDropdown` + `V2Menu`

**트리거 (2형태)**
- **필 형** (피드/검색 결과): **70×32**, `radius.full`, bg `background.default`,
  **1px `line.neutral`**, 라벨 **13 Medium**(`label.xSmallWeak`) `label.neutral`,
  trailing `chevronDown` 16 `label.alternative`. 내부: padL 12 / 라벨↔아이콘 6 / padR 8.
- **텍스트 형** (상세 댓글 정렬 바): 라벨 **13 Medium** `label.neutral` + `chevronDown` 16 `label.alternative`, gap 4.

**메뉴(팝오버)** — `V2Menu` (§4-G5)
| 항목 | 값 |
|---|---|
| 카드 | 폭 **180**, `radius.lg`(12), bg `background.default`, **1px `line.neutral`** |
| 그림자 | `elevation[3]` = dy16 / blur30(σ) / `rgba(0,27,55,0.10)` |
| 패딩 | 상하 **10**, 항목 사이 0 |
| 항목 | 높이 **44**, 라벨 좌측 인셋 **20**, **15 Medium**(`label.smallWeak`) `label.neutral` |
| 눌림 | **174×44** `radius.lg` `fill.normal` (좌우 인셋 4/4) |
| 선택 표시 | **없음**(체크 없음, 브랜드색 없음). 현재 값은 트리거 라벨로만 표시 |
| 딤 | **없음**. 바깥 탭으로 닫힘(투명 오버레이) |
| 앵커 | 필 형: 필 하단 +8, 좌변 정렬. 댓글 정렬바: 바 top+40, 좌 20. 행 케밥: 우변 = 화면우 −40, top = 행 top +20 |

옵션 카피: 피드/검색 `최신순 / 조회순 / 인기순` · 상세 댓글 `최신순 / 인기순`.
**파일**: `components/community/SortDropdown.tsx`, DS 쪽 `V2Menu.tsx`

---

### 2.7 `SectionHeader` / `SectionBand` / `MorePill`

**SectionHeader** — 높이 **47**(padV 12), 제목 **17 Bold**(`title.xSmall`) `label.normal`,
좌 20. 우측 `chevronRight` **24** `label.assistive` (있는 섹션만: `{작성자}의 다른글`).
하단 구분선 **없음**.

**SectionBand** — 전폭 **8px** `background.lower`(`#F7F7F7`).
위 **16** / 아래 **8** 의 흰 여백으로 통일(시안이 8/8/16 로 섞여 있다 → 정규화).
v2 `V2Divider variant="thick"` 는 16 고정이라 §4-G4 필요.

**MorePill** — 중앙 정렬 필, 위·아래 여백 각 **16**.
| 카피 | 크기 |
|---|---|
| `댓글 더보기` | 100×32 |
| `게시글 더보기` / `인기글 더보기` | 111×32 |
| `더보기` (작성자 레일) | 74×32 |
공통: `radius.full`, bg `background.default`, **1px `line.normal`**,
라벨 **13 Medium**(`label.xSmallWeak`) `label.neutral`, trailing `chevronRight` 16 `label.alternative`,
padH ~13, 라벨↔아이콘 5.

**파일**: `SectionHeader.tsx` · `SectionBand.tsx` · `MorePill.tsx`

---

### 2.8 `CommentRow` — 댓글/대댓글 행 (98px)

3개 구역(post-detail · comment-write · meal-169)이 독립적으로 **98** 을 측정했다.

**세로 리듬 (정본)**
```
paddingTop     16
이름줄         16   (13 Medium / lh 16)   ← 이름 + 작성자배지 + 우측 ⋯ 이 같은 중심선
gap             8
본문           16   (13 Medium / lh 16)   ← 줄당 +16
gap            12
액션줄         16   (13 Regular / lh 16)
paddingBottom  14
────────────────
합계           98   (2줄 본문이면 114)
```
> `13 Medium / lh 16` 은 `typography.label.xSmallWeak` 와 **정확히 일치**한다.
> post-detail 구역이 lh 20 이라고 적었지만 2:1 로 16 이 이긴다(§5.5).

**가로 구성**
| 요소 | 값 |
|---|---|
| 좌우 패딩 | 부모 댓글 **20 / 20** · 대댓글 **32 / 20** (들여쓰기 +12, 우측은 안 밀림) |
| 대댓글 배경 | `fill.alternative` (`#70737c0d`), **full-bleed** |
| 하단 구분선 | 1px full-bleed `line.alternative` — **모든 행**(마지막 포함) |
| 아바타 | **없음** |
| 작성자 이름 | 13 Medium `label.neutral` |
| `작성자` 배지 | 이름에서 gap **8**, `MicroPill face="brandWeak"` 40×21 |
| 더보기 ⋯ | 24 박스, 우측 인셋 20, 이름줄과 같은 중심, `label.alternative` |
| 본문 | 13 Medium **`label.normal`** (이름보다 진하다) |
| 액션줄 | `♥16 ─2─ N` ─12─ `💬16 ─2─ N` ─12─ `답글쓰기` ── flex ── `2026.07.28` |
| 액션 타이포 | 전부 13 Regular `label.alternative`. 아이콘 `label.assistive` |
| 수치 0 | **표시한다** |
| `답글쓰기` | 부모·대댓글 **둘 다** 노출 |
| 좋아요 눌림 | **`status.negative` `#FF4242`** — 브랜드 주황 아님 |

**파일**: `components/community/CommentRow.tsx`

---

### 2.9 `CommentComposer` — 댓글/답글 입력 바

| 항목 | 접힘 | 펼침(2줄 이상) |
|---|---|---|
| 바 | 전폭 h **80**, bg `background.default`, **상단 보더 없음**, 패딩 14/14 | h **146** (위로 자란다, 하단은 키보드에 고정) |
| 필드 | **343×52**, `radius.lg`(12), bg `fill.normal`, 좌우 마진 **16** | 343×**118** |
| 텍스트 | **17 Medium / lh 21** (`label.mediumWeak`) `label.normal` | 동일 |
| 플레이스홀더 | `작성해주세요` 17 Medium `label.alternative` | 동일 |
| 패딩 | 좌 **10** / 상 **12** (접힘·펼침 통일 — §5.6) | 동일 |
| 캐럿 | `primary.primary` (`cursorColor`/`selectionColor`) | 동일 |
| 액션 버튼 | ⌀**24** 원, `primary.primary`, 필드 **안쪽** 우측 10, 세로중앙 | 우측 10 / **하단 22** |
| 글리프 | **`arrowUp` 흰색 ~18** — 시안의 chevron 은 "접기"로 읽힌다(§5.6) | 동일 |
| 버튼 노출 | 초안이 비면 **버튼 자체가 없다**(회색 비활성 아님) | 동일 |
| 히트영역 | 원은 24 지만 `Pressable` 은 **44** |
| 키보드 | `KeyboardStickyView`(`react-native-keyboard-controller`), `offset.opened = bottomInset` |

- 접힘 상태에서 1줄 초과 초안은 **오른쪽 16px 페이드**로 자른다(말줄임표 아님).
  페이드 색은 `#F2F4F6` 이 아니라 **필드의 합성 배경색**으로.
- 스토리 댓글 시트의 컴포저는 바 **72** / 필드 **343×44 `radius["2xl"]`(16)** (§3.12).

**파일**: `components/community/CommentComposer.tsx`

---

### 2.10 `CommunityAvatar`

| size | 쓰는 곳 |
|---|---|
| 24 | 피드 헤더 우상단 프로필 아이콘 |
| 28 | 게시글 상세 작성자 행 |
| 40 | 스토리 오버레이 |
| 48 | 팔로워/팔로잉 행, 작성자 카드 |
| 56 | 프로필 헤더 / 상세의 작성자 프로필 카드 |
| 60 | 신신이웃 디렉터리 행 |

원형(`radius.full`), 배경 `fill.pressed`(`#0220470d`), 사진 없으면 **채워진** 사람 글리프
`label.assistive`. v2 `icon-profile` 은 **선(stroke)** 이라 §4-G12 로 `profileFilled` 추가 필요.
`V2Avatar` 가 DS 에 들어가면 이 파일은 re-export 로 축소한다.
**파일**: `components/community/CommunityAvatar.tsx`

---

### 2.11 `FollowButton`

| 자리 | 크기 |
|---|---|
| 목록 행 / 카드 | **52×32**(행) · **54×32**(카드), `radius.sm`(8), 라벨 **13 SemiBold**(`label.xSmall`) |
| 프로필 헤더 / 상세 프로필 카드 | **335×38**, `radius.md`(10), 라벨 **15 SemiBold**(`label.small`) |

**상태 매핑 (시안이 자기모순이라 여기서 못박는다 — §5.7)**
- `팔로우`(아직 안 함) = **fill** `primary.primary` / `static.white`
- `팔로잉`(이미 함) = **weak** `primary.primaryWeak` / `primary.primary`

v2 매핑: `V2Button size="s"|"m" color="brand" variant="fill"|"weak"` — 그대로 맞는다.
낙관적 업데이트 + `isFollowingPending` 동안 disable (기존 `useCommunityAuthor` 유지).
**파일**: `components/community/FollowButton.tsx`

---

### 2.12 `AuthorCard` / `AuthorRail` — `이런 작성자도 만나보세요`

| 항목 | 값 |
|---|---|
| 레일 | 높이 **181**(카드 위·아래 8), 가로 스크롤, 첫 인셋 **20**, 카드 gap **8** |
| 카드 | **137×165**, `radius.sm`(8), bg `background.default`, 그림자 **`elevation[2]`(정확 일치)**, 테두리 없음 |
| 아바타 | 48, 카드 top+12, 가로 중앙 |
| 이름 | 아바타 아래 7, **15 SemiBold** `label.normal`, 중앙 |
| 배지 칩 | 카드+87..+108, `MicroPill face="neutral"` 0~2개, gap 6, 중앙 |
| 버튼 | 카드+116, `FollowButton` 54×32 |
| 3번째 카드 | 화면 밖으로 잘려 보이는 peek(가로 스크롤 어포던스) |

**대안안 B**(author-profile 프레임 B): 카드 1장 + 우측 `더보기` 필 74×32 → **신신이웃(S11)** 진입.
→ **판정: A(3카드 레일) 채택 + 레일 끝에 `더보기` 필 1개 추가**. 두 안의 기능을 합친다.
**파일**: `components/community/AuthorCard.tsx`, `AuthorRail.tsx`

---

### 2.13 `AuthorProfileCard` — 146px 프로필 블록

**프로필 화면 헤더**와 **상세 화면 안의 작성자 카드**가 같은 블록이다(둘 다 146). 한 컴포넌트로 만든다.

```
top +16   아바타 56 r28  (x=20 — 시안의 24 는 시작선 3개를 만든다 → 20 으로 정규화)
          이름  x=104     15 Bold(`label.smallStrong`) label.normal
          숫자행 +53      15 Bold  · 세 컬럼 좌측정렬 x 104 / 187 / 282
          라벨행 +71      13 Regular(`subtext.medium`) label.neutral  — 후기 · 팔로워 · 팔로잉
top +96   FollowButton 335×38 r10
top +134  (아래 여백 12)
```
- 3컬럼은 폭 210 컨테이너의 `space-between` 으로 구현(고정 x 금지).
- 상세 화면 안에 놓일 때만 하단 1px `line.alternative`.
- `팔로워`/`팔로잉` 컬럼 탭 → `S10`. (`후기` 컬럼의 데이터 소스는 §7 서버 항목)

**파일**: `components/community/AuthorProfileCard.tsx`

---

### 2.14 `NeighborRow`(101) / `ConnectionRow`(81)

**NeighborRow — 신신이웃 디렉터리 (101)**
```
좌우 20 · 하단 1px full-bleed line.alternative
아바타 60 r30 @ T+20, x=20
텍스트 컬럼 x = 20 + 60 + 12 = 92 (아바타 우변 + gap 12)
  이름   T+22   15 SemiBold label.normal
  메타   T+43   13 Regular label.alternative  →  `팔로워 1,741`  ─15─  `작성글 83`  (가운뎃점 없음)
  태그   T+60   MicroPill face="neutral" 0~2개, gap 6
FollowButton 52×32 r8 @ (우측 인셋 20, T+16)
태그가 없으면 이름/메타 두 줄이 아바타 60 에 대해 세로 중앙 (행 높이는 101 유지)
```
시안 1행의 52px 아바타 + solid 버튼은 드리프트 → **60 + weak** 로 통일.

**ConnectionRow — 팔로워/팔로잉 (81)**
```
아바타 48 r24 @ (20, T+16)
이름  T+24.6  15 SemiBold label.normal   (이름 x = 80)
메타  T+45    13 Regular label.alternative → `팔로워 1,741` ─14─ `작성글 83`
FollowButton 52×32 @ (우측 20, 세로중앙)  — 팔로잉 목록에만. 팔로워 목록엔 버튼 없음
구분선 full-bleed (현행 marginLeft:80 제거)
```

**파일**: `components/community/NeighborRow.tsx`, `ConnectionRow.tsx`

---

### 2.15 `CommunityTopTabs` — 상단 3탭 + 프로필

| 항목 | 값 |
|---|---|
| 높이 | **51** (`V2Tab size="l"`) |
| 하단선 | 1px full-bleed `line.normal` (`#70737c38`) |
| 아이템 | 좌측 정렬, x=20 시작, 아이템 폭 **77.7** ×3 = 레일 폭 **233** |
| 구현 | 폭 233 컨테이너(`alignSelf:"flex-start"`, `marginLeft:20`) 안에 `V2Tab alignment="fixed"` → 셀 77.67, 인디케이터 인셋 8 → **61.67 ≈ 62** ✔ **DS 변경 불필요** |
| 선택 | 17 Bold(`label.mediumStrong`) `label.normal` · 인디케이터 2px `label.normal` |
| 비선택 | 17 SemiBold(`label.medium`) `label.neutral` |
| 우상단 | 프로필 아이콘 24, 원형 bg `fill.pressed`, 글리프 `label.assistive`, 우측 인셋 20 |
| 카피 | `레시피` · `자유글` · `스토리` |

같은 방식으로 **인기글 기간 탭**(`실시간/주간/월간`)은 `paddingHorizontal:20` 컨테이너 +
`V2Tab alignment="fixed"` → 셀 111.67, 인디케이터 96 ✔.
**프로필 화면 탭**(`후기/게시글/스토리`)도 폭 233 + fixed ✔.

**파일**: `components/community/CommunityTopTabs.tsx`

---

### 2.16 `CommunityFab`

**122×48**, `radius.full`, `primary.primary`, 라벨 **17 SemiBold**(`label.medium`) `static.white`,
**아이콘 없음**, 우측 인셋 20, 탭바 위 **14~20**. 그림자 없음.

⚠ **`FloatingWriteButton` 의 AI-상담 필 스택 산술(`FLOATING_AI_BUTTON_HEIGHT` + `STACK_GAP`)을
반드시 유지한다.** 시안의 "탭바 위 14" 를 하드코딩하면 2026-08-19 에 이미 한 번 난
"글쓰기 버튼이 AI 필에 묻히는" 회귀가 재발한다. 바꾸는 건 필의 **크기·라벨·타이포**뿐이다.

카피: 시안 `글쓰기 작성` / 현행 i18n `글쓰기`. **제품 결정 필요** — 권장 `글쓰기`.
**파일**: `src/shared/components/FloatingWriteButton.tsx` 수정(신규 파일 아님)

---

### 2.17 `CommunityActionSheet` — 분리형 액션시트

쓰는 곳: 스토리/게시글 `⋯` (관심없음·신고하기·취소 / 삭제하기·수정하기·취소).

| 항목 | 값 |
|---|---|
| 딤 | `background.dim` (`#17171933`) |
| 시트 | 시안은 **355 폭 · 좌우/하단 10 인셋 · r28 4모서리**. → **DS 를 따른다**: `V2BottomSheet`(전폭, 상단만 r28). "바텀시트 한 계보" 규칙(§5.8) |
| 그래버 | 48×4 `label.disable`, 상단 16 — `V2BottomSheet` 기본값과 **정확 일치** |
| 옵션 행 | **`V2Option`** — padH 24 + padV 16 + `title.xSmall` → **55 높이 · r24 · 1px 테두리**로 시안과 픽셀 일치 ✔ |
| 옵션 간격 | 16 |
| 강조 옵션 | 선택면 = `primary.primaryWeak` + 1px `primary.primary` |
| 상단 페이드 | 36px `background.default`→투명 (옵션 목록이 CTA 밑으로 스크롤됨을 표현) |
| CTA `취소` | `V2Button size="xl"` 56/r16, `primary.primary` — 시트 푸터 |

⚠ 시안이 `삭제하기`(파괴적)를 중립 회색으로, `수정하기`를 브랜드 강조로 그렸다.
**뒤집는다**: 파괴적 옵션은 강조하지 않고, 브랜드 강조는 화면당 1개(취소 CTA)만 둔다.
(사용자 취향: 1 프라이머리 + 그레이스케일)

**파일**: `components/community/CommunityActionSheet.tsx`

---

### 2.18 상태 프리미티브 — 로딩 / 에러 / 빈상태

시안에는 **어느 구역에도 로딩·에러 프레임이 없다.** 삭제 근거가 아니다.

| 상태 | 구현 |
|---|---|
| 목록 로딩 | `CommunityFeedSkeleton` — **새 행 리듬(176/147/118/106)에 맞춰 재작성**. 링 스피너 금지 |
| 다음 페이지 | 꼬리 `V2LoadingState`(점 로더) + `NextPageErrorRow` |
| 에러 | `V2ErrorState surface=... tone="quiet"` + `resolveError().retryable` 일 때만 재시도. **`isPlaceholderData` 가드 유지**(에러를 빈 상태처럼 그리지 말 것) |
| 목록 빈상태 | `V2EmptyState` (기존 카피 유지) |
| **조용한 빈상태** (댓글 0건) | `QuietEmptyState` — 말풍선 **아웃라인** 71×69(획 4, 라운드조인, `line.normal`) + gap 16 + **15 Medium(`label.smallWeak`) `label.assistive` 2줄 중앙**. 버튼 없음. `V2EmptyState` 는 20 Bold 제목 + 40 아이콘 강제라 못 쓴다 → §4-G11 |

댓글 빈상태 카피: 시안 `아직 등록된 댓글이 없습니다.` / `첫번째 댓글의 주인공이 되어보세요!` (합쇼체).
현행 `ko/common.json` 은 해요체(`아직 댓글이 없어요` / `첫 댓글을 남겨 보세요`).
**판정: 앱의 해요체를 유지**한다(한 화면에 두 어체를 섞지 않는다). 제품이 전환을 원하면 별건.

**파일**: `components/community/QuietEmptyState.tsx`, `CommunityFeedSkeleton.tsx`(수정)

---

### 2.19 `PhotoScrim` / `EdgeFade` — 그라디언트 2종

v2 에 그라디언트 토큰이 없다. `expo-linear-gradient` 로 로컬 구현.

- **`PhotoScrim`**: 높이 **140**, `['transparent', 'rgba(0,0,0,0.30)']`, 미디어 하단 앵커. 스토리 뷰어 전용.
- **`EdgeFade`**: 높이 **36**, `[배경색 0%, 배경색 100%]` 세로. CTA 바 위(글쓰기·신고·피커·액션시트).
  `V2BottomCTA` 에 `fade` prop 이 들어가면(§4-G8) 그쪽으로 흡수.

**파일**: `components/community/PhotoScrim.tsx`, `EdgeFade.tsx`

---

## 3. 화면별 스펙

프리미티브는 §2 를 가리킨다. 여기엔 **화면 고유 레이아웃과 카피**만 적는다.

### 3.1 S1 · 자유글 피드 — `app/(tabs)/community.tsx` + `FreePostTab`

**고정 헤더 = 173** (스크롤 밖, 불투명 흰색, **블러/그림자 없음**, 콘텐츠가 그 밑으로 지나가며 하드컷)
```
insets.top (시안 50)
+ CommunityTopTabs 51                      §2.15
+ 검색 블록 72 (padV 12 — 시안 14 를 토큰으로 스냅)
```
**검색 필드** — `V2SearchField` 와 **정확히 일치**: h44 · `radius.lg`(12) · `fill.normal` ·
아이콘 24 · padH 10 · gap 8 · **17 Medium**(`label.mediumWeak`) · placeholder `label.alternative`.
여기서는 **입력이 아니라 검색 화면 진입구** → `Pressable` 로 감싸고 `editable={false}`.
placeholder: `궁금한 점을 검색해보세요`.

**스크롤 콘텐츠**
```
`게시글` 섹션 제목 행 44   (17 Bold, 좌 20, 세로중앙 — 스티키 아님)
정렬 드롭다운 행 32        (SortDropdown 필 형, 우측 정렬 x285..355)
PostRow × N                (§2.1)
── SectionBand 8 ──
`이런 작성자도 만나보세요` SectionHeader 47 (chevron 없음)
AuthorRail 181             (§2.12)  ← 글 4개 뒤에 1회 삽입. 2회차 주기는 미정(§8)
PostRow × N …
```
**FAB** `CommunityFab` (§2.16) — 스크롤 무관 고정.

**바뀌는 것**
- `PostListItem` 카드(r16/padding16/gap10) → **`PostRow` 플랫 행**으로 전면 교체.
- 정렬 3개 인라인 텍스트(점 포함) → **드롭다운 1개**. `CommunitySortMode` 3값은 유지.
- 검색 필드 radius 14→12, bg 흰색→`fill.normal`, padH 12→10, 아이콘 17→24, 15 Regular→17 Medium.
- 화면 제목 `커뮤니티` 행 + 아이콘 3개 → **탭 스트립 + 프로필 아이콘 1개**로 교체.
  (북마크·알림 진입점은 §6 로 이전 — 삭제 금지)
- 카테고리 필터 칩 레일은 이 화면 시안엔 없다. **인기글/검색 결과에는 있다** → 피드에서는 접되
  `category` 파라미터 기능은 유지(§6).
- `StoryRail` 은 스토리가 상단탭으로 승격되면서 피드에서 빠진다. **기능은 유지**(§6.7).

---

### 3.2 S2 · 검색 레이어 — `app/community/search.tsx`

시안은 **자유글 탭 안의 레이어**다(탭 스트립·하단 탭바·FAB 이 계속 마운트).
현행은 별도 라우트. → **P1 은 라우트 유지 + 라우트 안에서 탭 스트립을 같이 그린다**
(내비 재배선은 위험 대비 이득이 작다 · §8-Q3).

**헤더**
- 입력 상태: 뒤로 chevron 24(박스 x12..36) + 필드 **311**(x44..355). FAB **숨김**, 키보드 업.
- 결과 상태: 키보드 내려감, FAB 복귀, 헤더에 **필터 레일 52** 추가 → 헤더 총 **225**,
  하단 1px `line.alternative`.

**검색 전 패널**
```
[최근 검색 레일 50]  또는  [빈 블록 115]
── SectionBand 8 ──
`전체 삭제` | `자동저장 끄기` 행 44
(흰 여백 30)
`실시간 인기글` 헤더 44 + 랭킹 4행
(흰 여백 20)
`인기 검색어` 헤더 44 + 랭킹 4행
```
| 요소 | 사양 |
|---|---|
| 최근 검색 레일 | 라벨 `최근 검색어` **12 Medium**→ **13 Medium(`label.xSmallWeak`)로 스냅**(§5.9), 칩 **24h** `radius.full` `fill.normal` 13 Medium `label.neutral` padH 7, gap 6, 우측 고정 `전체삭제`, 그 왼쪽 26px 흰 페이드. **가로 스크롤** |
| 빈 카피 | `최근 검색한 내용이 없습니다.` **15 Medium** `label.alternative`, 115 블록 **가로·세로 중앙** |
| 자동저장 행 | `전체 삭제` ｜ `자동저장 끄기` 13 Regular `label.alternative`, 사이 1×12 세로줄 `line.normal` @ x77.5 |
| 섹션 헤더 | **17 SemiBold**(`title.xSmallWeak`) `label.normal` + 우측 `chevronRight` 24 `label.assistive`, 행 44 |
| 랭킹 행 | 44h. 번호 **15 Medium `primary.primary`**, 좌 20, **번호 컬럼 폭 25** → 라벨 x45. 라벨 15 Medium `label.normal`. **4행만** |

**결과**
- 필터 레일 52 (`CategoryChipRail`, 칩 32, 첫 항목이 `SortDropdown` 필 → 그 뒤로 카테고리 칩)
- 결과 행 = **`PostRow`** (§2.1) 그대로.
- 정렬 드롭다운 = `V2Menu`, 필 하단 +8, 좌변 정렬, 딤 없음.

**신규 기능**: `자동저장 끄기` 토글(= 최근검색 저장 중단). `useRecentCommunitySearches` 에 플래그 추가.
**서버**: 검색 API 에 `category` / `sort` 파라미터 필요(§7).

---

### 3.3 S3 · 인기글 — `app/(tabs)/community-popular.tsx`

**고정 헤더 209** = `insets.top` + 앱바 **44** + 기간 탭 **51** + 칩 레일 **64**

| 블록 | 사양 |
|---|---|
| 앱바 | `V2ScreenHeader titleAlign="center"` · 제목 `인기글` **15 SemiBold**(`label.small`) `label.strong` · 우측 검색 `V2IconButton` 24 → S2 |
| 기간 탭 | `V2Tab size="l" alignment="fixed"` in `paddingHorizontal:20` → 셀 111.67 / 인디케이터 96 ✔. 카피 `실시간` `주간` `월간` |
| 칩 레일 | `CategoryChipRail` (padV 16, 하단 1px `line.alternative`) |
| 목록 | **`PostRow` + `rank`** (§2.1) — 랭크 원 24 |

**바뀌는 것** (현행 `CommunityPopularScreen` 의 자체 `renderPost` 를 `PostRow` 로 교체):
헤더 54→44 · 제목 17 Bold→15 SemiBold 중앙 · 기간 탭 텍스트 14→17 · 인디케이터 77→96 ·
칩 gap 8→6 / padH 13→12 / 라벨 12.5→13 SemiBold · 랭크 13 Bold→SemiBold ·
배지 bg `label.alternative`→**`label.neutral`** · 태그 bg → `fill.normal` / 10 SemiBold ·
제목 15 SemiBold lh21 ls−0.3 2줄 → **15 Medium lh20 ls0 1줄** · 요약 12.5→13 ·
썸네일 78 r10 → **86 r8** · 메타 11.5 → 13(시각 12) · 메타 아이콘 12/11 → **16 `label.assistive`**.

**보존 필수**: `rankBadge.minWidth 24`(2자리), `tags.slice(0,4)`, FlashList 설정
(`maintainVisibleContentPosition:{disabled:true}`, `paddingBottom = 180 + insets.bottom`),
차단 사용자 필터, 당겨서 새로고침, 스켈레톤/에러/빈상태, a11y.

⚠ 시안의 칩 카피(`식당 인증`/`질문·상담`/`식당 추천`/`CKD 정보`)는 **목데이터**다.
실제 분류 체계 교체는 §5.10 / §7 서버 항목.

---

### 3.4 S4 · 게시글 상세 — `app/post/[id].tsx`

**골격**
```
insets.top
앱바 44        ← 제목 없음. 좌 back(24, 좌인셋 12) / 우 ⋯(24, 우인셋 20). 하단 보더·그림자 없음
── 본문 블록 (좌우 20) ────────────────────────────
+0    카테고리 칩  MicroPill face="ink" 52×21   (top padding 0 — 앱바에 붙는다)
+8    작성자 행    아바타 28 + gap 8 + 이름 15 Medium(`label.smallWeak`) label.normal
+20   제목        **15 SemiBold / lh 19** (`label.small`) label.normal, 2줄
+4    본문        **13 Regular / lh 20** (`body.xSmall`) label.neutral
+12   이미지 스트립 높이 **180 고정**, 폭 = 원본 비율, `radius.sm`(8), **gap 4**, 가로 스크롤(좌 인셋 20)
+12   [PollCard]  ← 시안에 없음. 위치 유지 (§6)
+12   태그 칩 행   MicroPill face="neutral" ×N, gap 6, `#` 접두사 없음
+12   구분선      1px `line.alternative`, **좌우 20 인셋**
+19   메타 행     `조회 3,291` · ♥541 · 💬77 ── flex ── `2026.07.28`  (전부 13 Regular `label.alternative`)
      좋아요 눌림 = 하트만 **`status.negative`**. 알약 버튼 없음
── SectionBand 8 ──
정렬 바 48    좌 `최신순 ⌄`(13 Medium) / 우 `마지막 댓글로`(**13 Regular** — 시안 12 를 통일, §5.4)
              하단 1px `line.neutral`
CommentRow × **최대 5**   (§2.8)
`댓글 더보기` MorePill 100×32 (위·아래 16)
── SectionBand 8 ──
이전/다음 글 내비 2행 × 46      (§3.4.1)
── SectionBand 8 ──
AuthorProfileCard 146          (§2.13)
SectionHeader `{작성자}의 다른글` 47 (chevron 있음)
CompactPostRow × N
`게시글 더보기` MorePill 111×32
── SectionBand 8 ──
SectionHeader `추천 게시글` 47 (chevron 없음)
CompactPostRow × N
`인기글 더보기` MorePill 111×32
── SectionBand 8 ──
SectionHeader `이런 작성자도 만나보세요` 47
AuthorRail 181
── (하단 고정) CommentComposer  ← 시안엔 없다. 반드시 유지 (§6.3)
```

**3.4.1 이전/다음 내비 행 (각 46)**
좌 칩 `이전`/`다음` **35×22** `radius.full` `fill.normal` **13 Medium**(시안 12 → 스냅, §5.9) padH 8 →
gap 8 → 제목 **13 Medium** `label.normal` 1줄 말줄임(최대폭 243) → 우측 **상대시간** `2시간전`
13 Regular `label.alternative`(우 인셋 20). 두 행 **사이에만** 1px `line.alternative`.

**정렬 드롭다운(F4)**: `V2Menu` 180×108, 앵커 = 정렬 바 top + 40, 좌 20, 딤 없음. 항목 `최신순`/`인기순`.

**댓글 빈상태**: `QuietEmptyState` (§2.18), 정렬 바 하단에서 **위 여백 102**.

**바뀌는 것 (요약)**: 앱바 52→44, 우측 아이콘 3→1 · 제목 20/28 Bold → **15/19 SemiBold** ·
본문 15.5/25 → **13/20** · 아바타 40→28 · 작성자 보조줄 제거(카테고리는 상단 잉크 칩, 시간은 메타행) ·
좋아요 알약 버튼 → 텍스트 메타 · 상대시간 → **절대 날짜** · 댓글 아바타 제거 · 대댓글 40 → **12 + 틴트면** ·
댓글 전체 렌더 → **5개 캡 + 더보기 필** · `댓글 N` 제목 → **정렬 바**.

**F1(변형안 A)은 구현하지 않는다** — 아바타형 대댓글(29px), 날짜-좌측 액션행, 댓글 행 `팔로우` 버튼은
정본(F2~F7)과 모순된다.

---

### 3.5 S5 · 답글쓰기 (신규) — `app/community/reply.tsx`

현재 답글은 상세 화면 인라인(`replyingTo`)이다. 시안은 **별도 화면**.

```
insets.top
앱바 44   V2ScreenHeader titleAlign="center" title=`답글쓰기` (15 SemiBold `label.strong`), 우측 액션 없음
CommentRow (부모 댓글)  98      §2.8 — 부모는 흰 면
CommentRow (답글) × N   98/114  §2.8 — 대댓글 변형(들여쓰기 12 + fill.alternative)
… 남는 공간
CommentComposer (하단 고정, 키보드에 붙음)   §2.9
```
- 답글 행 `⋯` → `V2Menu` **180 × (10 + n×44 + 10)**, 앵커 = 우변 `375−40`, top = 행 top + 20.
  항목은 **소유권 조건부**: 내 것 `수정하기 / 삭제하기`, 남의 것 `신고하기`(+`답글쓰기`).
  시안이 3개를 한 카드에 그렸지만 **서버 `isMine` 기준 분기를 유지**한다(§5.11).
  `삭제하기` 는 빨강 아님(`label.neutral`) + **삭제 확인 다이얼로그 유지**.
- 답글 삭제 시 부모의 `💬 N` **감소**시킨다(시안 f9 는 1로 남아 있는 버그).
- 진입: 상세/답글쓰기 화면의 `답글쓰기` 링크.
- **최상위 댓글 작성 경로는 상세 화면 하단 컴포저로 남는다**(이 화면은 답글 전용).

---

### 3.6 S6 · 신고하기 — `app/community/report.tsx`

```
insets.top
앱바 44   V2ScreenHeader leading="close" titleAlign="center" title=`신고하기`
          ✕ 24(`icon-close`, `label.neutral`), 광학 중심 x26 = spacing[4]+44/2 ✔
+32  헤드라인  `신고하는\n이유를 알려주세요!`  **22/30 Bold** (`title.medium`) `label.normal`
+6   서브      `타당한 근거 없는 신고 내용은 반영되지 않을 수 있습니다.`
                **15 Medium**(`label.smallWeak`) `label.alternative`, 1줄(줄바꿈 금지)
+32  사유 목록  8행, 좌우 20, pitch 56 (행 48 + gap 8)
── EdgeFade 36 ──
CTA 바 76 : `V2BottomCTA primaryLabel="신고하기"` (56/r16, 17 SemiBold, 비활성 fill=`fill.normal`)
```
**사유 행 (`ReportReasonRow`, 로컬)**
335×**48**, `radius.sm`(8), fill **`fill.background`(`#F9FAFB`)**, 테두리 없음, 그림자 없음.
padL 16 → 체크 24 → gap 12 → 라벨 x**72**, **15 Medium**(`label.smallWeak`) `label.normal`.
**선택돼도 행 면은 그대로다** — 아이콘만 바뀐다.
체크 = `V2Checkbox variant="circle" size="m"`: 체크됨 ⌀24 `primary.primary` + 흰 체크(정확 일치).
미체크는 v2 값(0.28) 유지 — 시안의 0.112 는 접근성상 더 나쁘다(§5.12).
`V2Option` 금지(r24/테두리/틴트 = 다른 언어), `V2ListRow` 금지(17 Bold).

**카피(F2~F5 정본 · F1 은 stale)**
1. `음식·식단과 관련 없는 게시글` ← **신규**
2. `허위 또는 잘못된 건강 정보`
3. `욕설·비방 등 불쾌감을 주는 표현` (현행 `·혐오` 제거)
4. `광고·홍보 목적의 게시글`
5. `개인정보 노출`
6. `저작권 침해 또는 무단 도용`
7. `음란성·폭력성 등 부적절한 이미지`
8. `기타 사유 (직접입력)`

**`기타 사유` 시트** — `V2BottomSheet surface="community_report_other"`(⚠ 현행 `community_post_category` 는
분석 오집계 · 반드시 교체), 제목 `기타 사유` **20 Bold**(`title.small`),
입력 = `V2TextField variant="line"` (2px `line.normal` 언더라인, padH 0) — **단 gorhom 시트 안이라
`V2SheetTextInput` 이 필요**(§4-G14). 값 **17 Regular**(`body.mediumWeak`),
placeholder **`입력해주세요`(공백 없음)** `label.alternative`.
값이 있으면 **⌀18 채운 원 `label.assistive` + 흰 ✕** clear 버튼.
푸터 `확인` `V2Button size="xl"`.

**동작**: 다중 선택(Set) · `기타` 탭 → 시트 먼저 열림(행은 아직 미체크) → `확인` 이 텍스트 저장 +
행 체크. CTA 는 `selected.size > 0` (+ `기타` 면 텍스트 비어있지 않음).
시트 `확인` 은 **초안이 비면 비활성 유지**(시안은 브랜드로 그렸지만, 눌러도 아무 일 없는 버튼은
"조용한 폴백" 금지 규칙 위반 · §5.13).

**서버**: 8번째 사유의 enum 매핑 + `description` 첫 줄 `[CODE]` 규약(식당 신고 선례) — §7.

---

### 3.7 S7/S8 · 글쓰기 — `app/(write)/free/new.tsx` (+ `[id].tsx` 통합)

```
insets.top
앱바 44   V2ScreenHeader titleAlign="center" title=`글쓰기`, 테두리 없음
+20  사진 레일  타일 **100×100 `radius.sm`**, gap **8**, 가로 스크롤(첫 인셋 20)
      1번 = 추가 타일: bg `fill.background`, 카메라 글리프 **32** `label.assistive`,
             라벨 `사진/영상` **13 Medium**(`label.xSmallWeak`) `label.neutral`
      나머지 = 사진 + 삭제 배지 **⌀16.4** 원 `label.alternative` + 흰 ✕ 8, 타일 **안쪽** top8/right8
+16  라벨 `카테고리` 13 SemiBold `label.normal` + ` (선택)` 13 `label.alternative`   ← 라벨 박스 x=20
+6   카테고리 셀렉트 **335×54 `radius.xl`(14)**, 흰 면 + 1px `line.normal`,
      값/플레이스홀더 **17 Regular** (`body.mediumWeak`), padH 16,
      우측 `chevronDown` 20박스 `label.assistive`, 우 인셋 16
      placeholder `카테고리 선택해주세요` — **기본값을 넣지 말 것**(현행은 첫 카테고리로 프리셋)
+32  라벨 `제목` + **브랜드 `*`**(`primary.primary`, 앞 공백 없음)
+6   제목 입력 335×54 r14 — 단일행, `singleLineInputText()` 필수(하우스 룰), `maxLength 200`
+32  라벨 `태그 (선택)`
+6   태그 입력 335×54 r14, placeholder `태그 입력 (최대 5개)`
+16  [태그 칩 레일 32]  ← 칩이 생기면 아래가 정확히 **56** 밀린다
+32  라벨 `설명 작성` + 브랜드 `*`
+12  본문 **335×186 `radius["2xl"]`(16)**, fill **`fill.alternative`**, 테두리 없음,
      본문 **15 Regular / lh 20**(시안 23 → v2 사다리로 스냅 · §5.14), padH 16, padTop 16
      카운터 = 필드 **안** 우하단(우 16 / 하 16), 13 Regular 2톤: `145`(`label.normal`) + `/ 700`(`label.alternative`)
      정확한 문자열: **`145/ 700`** (슬래시 앞 공백 없음, 뒤 1칸)
── EdgeFade 36 ──
CTA 바 76 : `V2BottomCTA primaryLabel="등록"` 335×56 r16
```
**태그 칩** — 높이 **32**, `radius.full`, gap 6, 가로 스크롤(**wrap 금지**), 라벨 13 Medium
`label.neutral`, `×` 8px `label.alternative`. 시안은 `fill.background` + 1px `line.normal` 테두리인데
**`V2Chip` 은 의도적으로 테두리가 없다 → DS 를 따른다**(§5.15). `#` 접두사 제거.
**최대 5개**(현행 10 → 5). `mergeCommunityTags` 정규화는 유지.

**카테고리 시트** — `V2BottomSheet title="카테고리"` + `V2Option` ×4 + 푸터 `다음`.
`V2Option` 이 **55 높이 / r24 / padH 24 / 선택=브랜드 테두리+틴트**로 시안과 픽셀 일치 ✔.
현행처럼 탭 즉시 커밋하지 말고 **`다음` 으로 커밋**한다.
카피: `질문·상담` / `식단 인증` / `식당 추천` / `CKD 정보` ⚠ **현행 6종과 완전히 다른 분류다**(§5.10).

**활성 조건**: 시안은 `제목 && 본문`. 현행 `+ responsibilityAgreed` **유지**(법적 게이트 · §6.6).

**사진 피커(F8/F9)** = iOS PHPicker 크롬 그대로다 → **OS 피커 유지**(`expo-image-picker`).
`사진/영상` 타일이 그리드 셀 0,0 을 차지하는 것만 네이티브로 불가능 → 카메라 진입은 별도 버튼.
커스텀 그리드는 P3.

**작성/수정 통합**: `app/(write)/free/[id].tsx` 는 지금 완전히 다른 에디터(우상단 등록 필,
카테고리 칩 행, 밑줄 19px 제목, 카운터·CTA 없음)다. **같은 컴포넌트로 합친다** — 이 구역 최대 구조 델타.

---

### 3.8 S9 · 작성자 프로필 — `app/community/author/[id].tsx`

```
insets.top
앱바 44   back 만. **제목 없음**, 우측 액션 없음
          ⚠ 현행 우상단 ⋯(차단)은 시안에 없다 → 유지하되 위치 재배치(§6.2)
AuthorProfileCard 146           §2.13  (아바타 56 / 이름 15 Bold / 후기·팔로워·팔로잉 / 팔로우 335×38)
CommunityTopTabs 51             후기 | 게시글 | 스토리   (폭 233, x20)
SectionHeader `게시글` 47 (pad 16/8, 테두리 없음)
PostRow × N                     §2.1  ← 프로필의 글 목록은 **피드와 같은 행**이다
`게시글 더보기` MorePill 111×32
── SectionBand 8 ──
SectionHeader `추천 게시글` 47
CompactPostRow × 5
`인기글 더보기` MorePill 111×32          ← 대안 A(전폭 `더보기 ›` 행)는 버린다(§5.16)
── SectionBand 8 ──
SectionHeader `이런 작성자도 만나보세요` 47
AuthorRail 181 + 끝에 `더보기` 필 → S11
```
- 스크롤-언더 크롬: 앱바는 불투명 흰 플레이트, 콘텐츠가 그 밑을 지난다.
- **탭 3개 신설**: 후기/게시글/스토리. i18n 키는 이미 있다
  (`community.author.reviews/posts/stories`, `emptyReviews`, `emptyStories`).
  후기·스토리 데이터 소스는 §7.

---

### 3.9 S10 · 팔로워/팔로잉 — `app/community/connections.tsx`

```
앱바 44  V2ScreenHeader titleAlign="center"  title = `팔로워` | `팔로잉`  (15 SemiBold `label.strong`)
ConnectionRow × N (81)     §2.14
```
팔로워 목록엔 트레일링 버튼 **없음**, 팔로잉 목록에만 있다(행 단위 상태).
구분선 full-bleed(현행 `marginLeft:80` 제거).

---

### 3.10 S11 · 신신이웃 (신규) — `app/community/neighbors.tsx`

```
앱바 44  V2ScreenHeader titleAlign="center" title=`신신이웃` (15 SemiBold `label.strong`), back 만
CategoryChipRail 64 (하단 1px line.alternative)   전체 / 식당 인증 / 질문·상담 / 식당 추천 / CKD 정보
NeighborRow × N (101)     §2.14
```
⚠ `connections.tsx` 를 재사용하지 말 것 — 그건 `?id=&mode=` 로 매개된 **작성자별** 목록이고,
신신이웃은 **전역 디렉터리**다. 별도 라우트로 만든다.
**서버**: 디렉터리 API + 목록 응답에 팔로워/작성글 수·배지·팔로우 상태 포함(현행 행마다
`useCommunityAuthor` 호출 = N+1) — §7.

---

### 3.11 S12 · 스토리 뷰어 (= 오늘의 식단) — `app/stories.tsx`

> ⚠ **판정**: `meal-169`(오늘의 식단 상세)와 `story-page`(스토리 뷰어)는 **같은 화면**이다.
> 오버레이 기하가 바이트 단위로 같다(배지 40×21 @ b−117 / 아바타 40 @ b−90 / 닉네임 15 SemiBold /
> `3시간전` 13 / 캡션 13 @ b−38.7 / 진행바 335×2 채움 96 @ b−10 / 하단 바 80 · 입력 251×44 · ♥·💬 24).
> `meal-169` 는 그 화면에 **댓글 시트와 액션시트가 열린 상태**다. §8-Q1 로 확인 필요.

**밴드**
```
insets.top
앱바 44  흰 면, 보더 없음. 좌 back 24 / 우 ⋯ 24(`label.neutral`, 우 인셋 20). **제목 없음**
미디어  flex:1 (시안 666 — 하드코딩 금지)
하단 바 80 (+ insets.bottom)
```
**미디어 2모드**
1. 사진 비율 ≈ 뷰포트 → **edge-to-edge `cover`**
2. 그 외 → **레터박스**: 같은 사진의 `cover` 복사본에 **Gaussian blur σ25(≈Figma blur 50)** +
   `background.dim`(`#171719 20%`) 딤 → 그 위에 전경 사진 **폭 375 고정 / 높이 = 375/aspect / 세로 중앙**.
   **절대 검정 면으로 채우지 않는다.**

**미디어 위 요소**
| 요소 | 위치(미디어 하단 `b` 기준) |
|---|---|
| 카메라 버튼 | 미디어 top+20, 우 20, `V2Icon camera` **24**, `label.neutral`, 배경 없음 → S13 |
| `PhotoScrim` 140 | 미디어 하단 앵커 |
| 카테고리 배지 | `b−117 … b−96`, `MicroPill face="onMedia"` 40×21, 라벨 `저염식` 10 SemiBold `primary.primary` |
| 아바타 | `b−90 … b−50`, 40, bg `fill.background` |
| 닉네임 | 아바타 우변 +6, **15 SemiBold** `static.white` |
| 시각 | **13 Regular** `opacityWhite[700]` — `3시간전` |
| 캡션 | `b−38.7`, **13 Medium** `static.white`, **1줄 말줄임 → 탭하면 2줄로 확장**(바텀 앵커라 위로 자란다) |
| 진행바 | `b−10`, 트랙 **335×2** `radius.full` `fill.normal`, 채움 **`static.white`** — **단일 연속 바**(세그먼트/도트 아님) |

**하단 바 80** — 입력 **251×44 `radius.lg`(12)** `fill.normal` @ x20,
placeholder `댓글을 남겨보세요` **15 Medium** `label.alternative`(좌 인셋 10);
♥ **24** + 💬 **24** `label.assistive`, gap 16, 우 인셋 20, 입력↔아이콘 16.
좋아요 눌림 = **`status.negative`** 채운 하트(모양 안 바뀜, 색만).

**액션시트(앱바 ⋯)** — `CommunityActionSheet`: `관심없음` / `신고하기` / CTA `취소`.
내 스토리면 `수정하기` / `삭제하기` / `취소`.
⚠ `관심없음` 은 앱에 없는 기능 — 서버 필요(§7).

**댓글 시트(💬 또는 입력바 탭)** — `V2BottomSheet`
| 항목 | 값 |
|---|---|
| 높이 | 화면의 **86%** 고정 (top y=119 = 상태바+앱바+사진 25) |
| 상단 radius | 시안 20 → **`radius["3xl"]`(24) 로 스냅**(v2 사다리에 20 없음, 28은 눈에 띄게 둥글다) |
| 제목 | **없음** (`댓글 N` 헤더 없음). 그래버 바로 아래 첫 행 |
| 목록 | `CommentRow` (§2.8) · 대댓글 = 인라인 평탄화(펼치기 없음), 1단계만 |
| 컴포저 | 시트 **푸터**(gorhom `footerComponent`, 키보드 추종), 바 72 / 필드 343×44 `radius["2xl"]`(16) |
| 키보드 업 | 컴포저가 **343×118 `radius.lg`(12)** 로 교체 + ⌀24 브랜드 원(우10/하22) |
| 빈상태 | `QuietEmptyState` (시트 top 에서 **102** 아래) |
| 행 ⋯ | `V2Menu` 180×108, 우변 = 화면우−40, top = 행 top+20. **소유권 조건부** |

**필요한 DS**: `V2BottomSheet` 고정 높이(`snapPoints`) + `footer` 슬롯 (§4-G13).
**필요한 서버**: 스토리 댓글 API, 스토리 태그 필드 (§7).

**현행에서 바뀌는 것**: 다크 릴스형 → **라이트 크롬**; 우측 액션 레일 제거; 세로 도트 진행 →
**가로 연속 바**(⚠ 이건 QA 2026-08-06 에 거부됐던 안의 **역전**이다 · §8-Q2);
정렬 탭(추천/최신) 제거; 아바타 26→40; 캡션 14.5 3줄 → 13 1줄(탭 확장);
카운트다운(`N분 남음`) → 경과시간 `3시간전`.

---

### 3.12 S13 · 스토리 작성 — `app/(write)/story/new.tsx`

```
사진 375×840 full-bleed (상태바 아래까지)
헤더(사진 위에 떠 있음)
  좌 ✕ 24 @ (10,60)  ·  우 `업로드` 버튼
     ⚠ 시안이 같은 상태를 두 변형으로 그림 → **주황 fill 54×32 `radius.full` / 흰 13 SemiBold** 채택(§5.17)
     ⚠ 사진 위 다크 글리프는 대비 미정의 → **`static.white` + `PhotoScrim` 상단 버전**을 같이 쓴다(§5.18)
바텀시트 139 (상단 radius → **24 로 스냅**)
  +16  그래버 48×4 `label.disable`
  +31.5 칩 레일 32h · 첫 인셋 **20** · gap 6 · 가로 스크롤
        CKD3 / CKD4 / 저당 / 저염 / 저칼륨 / 저단백   (⚠ 시안 선택칩의 `CDK3` 는 오타 · **CKD3** 로 구현)
        비선택 bg `fill.background` + 1px `line.neutral`, 라벨 13 Medium `label.alternative`
        선택   bg `primary.primaryWeak` + 1px `primary.primary`, 라벨 `primary.primary`
        폭은 고정 52 대신 **내용 hug** (라벨 폭 차이가 12px 뿐)
  +81  캡션 필드 **343×44 `radius["2xl"]`(16)** `fill.normal`, 좌 **20 으로 통일**(시안 16 — §5.19)
       placeholder `100자 이내로 작성해주세요` 15 Medium `label.alternative`
       값 15 Medium `label.normal`, **1줄 말줄임**, 캐럿 `primary.primary`
키보드 업 → 시트 전체가 키보드 높이만큼 위로 translate. 내부 레이아웃 불변
```
**취소 확인 다이얼로그** — `V2Modal buttonLayout="horizontal"`:
제목 `업로드를 취소하시겠어요?` **20 Bold**(`title.small`) `label.normal`,
본문 `지금 돌아가면 변경 사항이 삭제됩니다.` **15**(`subtext.large`) `label.neutral`,
버튼 48h `radius.xl`(14) gap 8 — `아니요`(`variant="weak" color="neutral"`, `fill.normal`) /
`예`(**brand fill**, 빨강 아님 → 현행 `destructive:true` 제거).

**현행에서 바뀌는 것**: 스크롤 폼(3:4 프리뷰 카드 + 72 타일 레일 + 멀티라인 캡션) → **전면 사진 + 139 시트**.
캡션 멀티라인 200자 → **1줄 100자**(⚠ 콘텐츠 절단 변경 — 서버 검증/기존 데이터 확인 먼저).
`업로드` 필 잉크색 → 브랜드.

**보존 필수(§6.8)**: 오늘/어제 식사 기록 사진 후보 + `isRemote`(서버 사진 재업로드 금지),
서명 URL `id` 식별 수정, `presentCommunityError`, `isSaving` 라벨, 권한 처리 경로.

---

## 4. 디자인시스템 갭 (v2 가 오늘 표현하지 못하는 것)

각 항목: **최소 추가안 + 필요한 화면**.

| # | 갭 | 최소 추가안 | 필요 화면 |
|---|---|---|---|
| **G1** | `more`(가로 점3) 아이콘 없음 | `icons/svg/icon-more.svg` (24 박스, ⌀2.67 점 3개, 간격 4.67, currentColor) → `more` | S1 S4 S5 S9 S12 (**8개 구역 전부**) |
| **G2** | `V2Badge` 로 21px pill 마이크로 배지를 못 만든다. 또 `neutral/weak` 가 `label.disable` 을 쓴다(시안은 `fill.normal`), 잉크 fill(`label.neutral` 면 + 흰 글자)·온미디어(흰 면 + 브랜드 글자) 조합 없음 | `shape?: "rounded" \| "pill"` + xs `paddingVertical: spacing[4]`(→ h21) + `neutral/weak` 면을 `fill.normal` 로 + `color="ink"` / `color="onMedia"` | S1 S2 S3 S4 S5 S9 S11 S12 |
| **G3** | `V2Chip` 선택면이 solid 뿐. 시안은 **틴트 + 브랜드 테두리 + 브랜드 라벨** | `tone="brandSoft"` = `{bg: primary.primaryWeak, fg: primary.primary, border: 1px primary.primary}` | S1 S2 S3 S9 S11 S13 |
| **G4** | `V2Divider variant="thick"` 가 **16 고정**. 시안 섹션 밴드는 **8** | `thick` 에 `size?: 8 \| 16` (기본 16) | 전 화면 |
| **G5** | **앵커드 팝오버/메뉴 컴포넌트가 없다** (시트·모달뿐) | `V2Menu`: 앵커 좌표 + items + 폭 180 + r12 + 1px `line.neutral` + `elevation[3]` + 44 행 + 눌림 174×44 r12 `fill.normal` + 딤 없음 + 바깥탭 닫힘. RN `Modal` 안이면 **`ModalOverlayHost` 필수**(하우스 룰) | S1 S2 S4 S5 S7 S12 (**6곳**) |
| **G6** | `elevation` 이 1·2 뿐. 팝오버 그림자는 dy16/blur60 | `elevation[3] = { shadowColor:"rgb(0,27,55)", shadowOffset:{0,16}, shadowOpacity:0.1, shadowRadius:30, elevation:8 }` | G5 와 동반 |
| **G7** | `V2ScreenHeader` 가 **좌측 정렬 고정**이고 **✕(close) 리딩 액션이 없다** | `titleAlign?: "leading" \| "center"`(기본 leading) + `leading?: "back" \| "close"`(기본 back) | S3 S6 S7 S10 S11 |
| **G8** | `V2BottomCTA` 가 상단 그라디언트를 의도적으로 뺐다(paddingTop 16). 시안은 **paddingTop 0 + 36px 페이드** | `fade?: boolean` | S6 S7 S13 + 액션시트 |
| **G9** | **15 Medium / lh 20** 토큰 없음 (`label.smallWeak` 는 15/19, `subtext.large` 는 15/20 **Regular**). 게시글 제목이 4개 구역에서 이 조합 | `typography.subtext.largeStrong = { medium, 15, 20, 0 }` (기존 `subtext.mediumStrong` 명명 규칙과 동일) | S1 S2 S3 S9 |
| **G10** | `V2ProgressBar` 에 흰 fill 없음(`brand\|danger\|success\|neutral`) | `color="static"` → `colors.static.white` | S12 |
| **G11** | `V2EmptyState` 가 20 Bold 제목 + 40px 아이콘을 강제 → 시안의 "조용한 빈상태"(제목 없음, 15 Medium 2줄 assistive, 71×69 아웃라인 일러스트)를 못 만든다 | `tone?: "loud" \| "quiet"` + `illustration?: ReactNode`(40px 캡 우회) | S4 S5 S12 |
| **G12** | **`V2Avatar` 가 없다**. 또 `icon-profile` 이 **선**인데 시안 글리프는 **채움** | `V2Avatar { size: 24\|28\|40\|48\|56\|60, uri? }` + `icons/icon-profile-filled.svg` → `profileFilled` | S1 S4 S9 S10 S11 S12 |
| **G13** | `V2BottomSheet` 가 `enableDynamicSizing` 전용 → **고정 높이 시트 + 도킹 컴포저**를 못 만든다 | `snapPoints?: (string\|number)[]` 탈출구(주면 dynamic sizing off) + `footer?: ReactNode`(gorhom `footerComponent` — 키보드 추종) | S12 댓글 시트 |
| **G14** | `V2TextField` 가 RN `TextInput` 을 하드코딩 → **gorhom 시트 안에서 못 쓴다**(키보드가 CTA 를 덮는다). 또 채운-원 clear 버튼 없음 | `inputComponent?: ComponentType<TextInputProps>`(기본 `TextInput`) + `clearable?/onClear?` | S6 기타사유 시트 |
| **G15** | `V2TextField` 의 `label` 이 문자열 전용이고 `required` 별표가 **빨강 + 앞 공백**. 시안은 **브랜드 별표 + 공백 없음 + `(선택)` 보조 런** | `label?: string \| ReactNode` (또는 `optional?: boolean` + `requiredColor`) | S7 |
| **G16** | 채운/면(borderless) **텍스트에어리어** 변형 없음 (시안: `fill.alternative` 면 + r16 + 테두리 0) | `V2TextField` 에 `tone?: "outlined" \| "filled"` | S7 |
| **G17** | **select/picker 필드** 컴포넌트 없음 | `V2SelectField` — `V2TextField` 의 box 토큰 재사용 + `TextInput` 대신 `Text` + trailing `chevronDown` | S7 |
| **G18** | 그라디언트 토큰 없음 (사진 스크림 140 / 엣지 페이드 36) | 토큰 추가 대신 `PhotoScrim`·`EdgeFade` 로컬 컴포넌트(§2.19). 두 번째 사용처가 생기면 승격 | S12 S13 + G8 |
| **G19** | 필드 아이콘 하트/말풍선: v2 `heart` 는 **하트+플러스(건강)** 글리프, 아웃라인 변형 없음 | `heartFilled`(민 하트) · `heartOutline` · `chatOutline` 추가. `chat`(둥근사각+좌하단 꼬리)은 시안과 **일치**하므로 유지 | S1 S2 S3 S4 S5 S12 |
| **G20** | `arrowUp`(전송) / `chevronUp` 없음 | `icon-arrow-up.svg` 추가. `chevronUp` 은 `chevronDown` 을 `rotate(180deg)` 로 대체 | S5 S12 |
| **G21** | `iconSize` 에 14 없음(메타 아이콘 실측 12~14) | **토큰 추가하지 말고 `xs`(16) 사용**. gap 을 4→3 으로 줄이면 시각 동일 | 전 목록 화면 |
| **G22** | radius 사다리에 **20** 없음(댓글 시트/스토리 시트 상단) | 토큰 추가하지 말고 **`radius["3xl"]`(24) 로 스냅** | S12 S13 |
| **G23** | `V2Checkbox` 미체크 톤이 0.28, 시안은 0.112 / 링 ⌀22 vs ⌀24 | **DS 값 유지**(접근성). 필요 시 `tone?: "normal" \| "faint"`(faint=`label.disable`) | S6 |
| **G24** | `V2Divider` 의 `inset` 이 **좌측 전용**. 상세 본문 구분선은 **좌우 20** | 부모에 `paddingHorizontal:20` 주고 full-bleed divider 사용 → **DS 변경 불필요** | S4 |

**갭이 아닌 것 (오해 정정)**
- `V2Tab` — 변경 불필요. 폭 233 / `paddingHorizontal:20` 컨테이너로 인디케이터 62 / 96 이 정확히 나온다.
- `V2SearchField` — 시안이 곧 이 컴포넌트다(h44/r12/`fill.normal`/24 아이콘/padH10/gap8/17 Medium/브랜드 캐럿).
- `V2Option` — 시트 옵션 55/r24/padH24/선택틴트가 픽셀 일치.
- `V2BottomSheet` 그래버 — 48×4 / `label.disable` / 16+24 블록이 정확 일치.
- `elevation[2]` — 작성자 카드 그림자(dy1/blur3/rgba(0,27,55,.1))와 바이트 일치.
- 나머지 색 — **커뮤니티 시안 전체에서 오프토큰은 back chevron `#2E2F33@88%` 하나**뿐이다.

---

## 5. 충돌과 판정

### 5.0 IA — 하단탭/상단탭 재배치 ⚠ 제품 승인
시안: 하단탭 `홈·상담·레시피·식당·전체`, 자유글/스토리는 레시피 밑 상단탭.
현행: 하단탭 `홈·커뮤니티·레시피·식당·전체`.
**판정**: P1 에서는 **현행 하단탭을 건드리지 않고** `커뮤니티` 탭 안에 3탭 스트립을 넣는다.
전면 이동은 P3(§7) — 딥링크·analytics route·`routeGraph`·홈 진입 경로가 전부 걸린다.

### 5.1 화면 좌우 여백 20 vs `layout.GUTTER` 16
**판정: 20.** 12개 구역 전부가 20 이고, 현행 커뮤니티 코드와 `theme/surface.ts SCREEN_X` 도 20 이며,
`V2BottomCTA` 자체가 `spacing[20]` 을 쓴다. 16 을 섞으면 `layout.ts` 가 경고하는
"세 번째 시작선"이 생긴다. → `communityLayout.COMMUNITY_GUTTER = spacing[20]` 로 **명시 상수화**
(리터럴 20 금지). `layout.GUTTER` 는 건드리지 않는다.
예외 정규화: 상세 프로필 카드 아바타 x24 → **20**, 스토리 캡션 필드 x16 → **20**.

### 5.2 칩 간격 6 vs `layout.CHIP_GAP` 8
**판정: 6.** 8개 구역이 6 이고 `spacing[6]` 은 실재 토큰이다. 커뮤니티 로컬 상수로 둔다.

### 5.3 게시글 제목 lineHeight — 19 / 20 / 22 3파전
**판정: 목록은 15 Medium / lh 20, 상세 제목은 15 SemiBold / lh 19.**
- 목록: `20 + gap 4 + 20` 과 `22 + 22`(gap 0)는 **둘 다 44** 라 블록 높이가 같다.
  행 높이 공식(74 텍스트열)을 재현하는 20/4/20 을 채택 → 토큰 `subtext.largeStrong`(G9).
- 상세: `post-detail` 이 폭·높이 동시 적합(±0.05px)으로 **SemiBold 15/19** 를 냈다.
  `detail-drag`·`feed-home` 의 "Bold" 는 더 거친 방법의 판정 → **`label.small` 채택**.

### 5.4 같은 줄의 13 vs 12
- **목록 메타행의 시각은 12** (`subtext.small`). feed-drag·feed-home·popular·search **4개 구역이 일치** → 의도로 본다.
- **상세 정렬바의 `마지막 댓글로` 는 13 으로 통일**. 이건 한 줄 안에서만 어긋난 단발 슬립이다.
- 상세/댓글의 날짜는 **13** (절대 날짜).

### 5.5 댓글 본문 lineHeight 16 vs 20
**판정: 16** (`label.xSmallWeak` 13 Medium/16 정확 일치).
`comment-write` 는 "본문 한 줄 늘 때마다 행이 정확히 +16" 으로 증명했고 `meal-169` 도 16.
`post-detail` 의 20 은 소수 의견.

### 5.6 컴포저 — 전송 어포던스가 없다 / 패딩이 두 값
- 9프레임 어디에도 **전송 버튼이 없다**(오렌지 원은 chevron = 펼침/접힘).
  **판정: 원 = 전송(`arrowUp`)** 으로 만든다. 펼침/접힘 토글은 **없앤다**(필드가 내용에 따라 자람 —
  밀도 최소화). 시안 그대로 내면 답글을 보낼 수단이 없다.
- 접힘 padL10/padTop12 vs 펼침 padL17/padTop13 → **10 / 12 로 통일**(접힘 쪽이 클립 프레임과
  캐럿 rect 두 증거로 뒷받침된다).

### 5.7 팔로우/팔로잉 ↔ solid/tint 매핑이 시안 안에서 모순
4개 프레임이 서로 어긋난다(solid 인데 `팔로잉`, tint 인데 `팔로우`/`팔로잉` 둘 다).
**판정: `팔로우` = fill(brand) · `팔로잉` = weak(tint).** 관례 + 기존 i18n(`follow=팔로우`,
`unfollow=팔로잉`)과 일치. 디자이너에게 통보.

### 5.8 분리형(플로팅) 바텀시트 vs 한 계보 규칙
시안 액션시트/신고 시트는 좌우·하단 10 인셋 + 4모서리 r28.
**판정: DS 를 따른다** — `V2BottomSheet` 전폭·상단만 r28. 메모리 규칙 "바텀시트 한 계보"
(정본 `V2BottomSheet`)를 10px 플로팅 때문에 포크하지 않는다.

### 5.9 12px Medium 토큰이 없다
쓰이는 곳: 최근검색 레일 라벨/칩/전체삭제, 이전/다음 칩.
**판정: `label.xSmallWeak`(13 Medium)로 스냅.** 12 Medium 토큰을 새로 만들지 않는다
(`subtext.small` 은 12 **Regular**). 밀도 최소화 관점에서도 크기 단계가 하나 주는 게 낫다.

### 5.10 카테고리 분류 체계가 완전히 다르다 ⚠ 제품+서버
- 시안(글쓰기 시트): `질문·상담 / 식단 인증 / 식당 추천 / CKD 정보` (4)
- 시안(필터 칩): `전체 / 식당 인증 / 질문·상담 / 식당 추천 / CKD 정보`
- 현행 `FREE_POST_CATEGORIES`: `식단 / 수치 변화 / 증상 고민 / 약물 / 외식 후기 / 일상 공감` (6)

**판정: 스타일 작업이 아니다.** 조용히 매핑하지 말 것. 서버 enum + 기존 행 마이그레이션 +
피드/인기글 필터가 전부 걸린 **제품 결정**이다(§7-E10). 결정 전까지는 현행 6종으로 UI 를 만들고
칩/시트 컴포넌트만 새 스펙으로 교체한다.

### 5.11 팝오버 메뉴가 3항목 고정 vs 소유권 분기
시안은 `수정하기/삭제하기/신고하기` 를 한 카드에 다 그렸다.
**판정: 코드가 맞다.** 서버 `isMine` 기준으로 내 것 `[수정, 삭제]`, 남의 것 `[신고]`(+`답글쓰기`).
카드 높이는 행 수에 맞춰 `10 + n×44 + 10`. 삭제 확인 다이얼로그 유지.

### 5.12 미체크 체크박스 알파 0.112 vs DS 0.28
**판정: DS(0.28).** 시안 값은 대비가 낮아 접근성이 나쁘다. 디자이너에게 통보.
`opacity:0.4` 로 컴포넌트를 감싸는 방식은 **금지**(체크된 브랜드 상태까지 흐려진다).

### 5.13 시트 `확인` 이 빈 값에서도 브랜드
**판정: 비활성 유지.** 눌러도 아무 일 없는 브랜드 버튼은 "예측 가능한 UX > 조용한 폴백" 규칙 위반.

### 5.14 글쓰기 본문 15 / lh 23
v2 사다리에 없다(`subtext.large` 15/20, `label.smallWeak` 15/19).
**판정: 15/20 으로 스냅**(`subtext.large`). 필드 높이 186 은 유지된다. 토큰을 늘리지 않는다.

### 5.15 태그 칩에 1px 테두리
`V2Chip` 은 **의도적으로 테두리가 없다**(DS 주석 명시).
**판정: DS 를 따른다**(테두리 없음, `fill.normal`). 디자이너에게 통보.
예외: **스토리 작성 칩 레일**은 사진 위가 아니라 흰 시트 위이고 미선택/선택 대비가
테두리로만 구분되므로 `tone="brandSoft"`(G3) + 미선택 `fill.background` 로 간다.

### 5.16 `추천 게시글` 푸터 2안 (전폭 `더보기 ›` 행 vs `인기글 더보기` 필)
**판정: 필(111×32).** 화면 안의 다른 3개 푸터가 전부 필이다 — 한 화면에 두 어포던스 언어를 섞지 않는다.

### 5.17 `업로드` 버튼 2변형 (흰 필 71×38 / 주황 필 54×32)
**판정: 주황 fill 54×32.** 사진 위에서 항상 읽히고, "화면당 프라이머리 1개" 와 맞다.

### 5.18 사진 위의 다크 글리프 (✕ / 카메라 / 백)
`#2E2F33@70%` 를 임의의 사진 위에 놓으면 대비가 정의되지 않는다(어두운 사진에서 나가는 유일한 길이 사라진다).
**판정: 사진 위 컨트롤은 `static.white` + 상단 스크림.** 흰 크롬 바 위(스토리 뷰어 앱바)는 시안대로 다크.

### 5.19 한 표면에 시작선 2개 (칩 레일 20 / 캡션 필드 16)
**판정: 20 으로 통일.** `layout.ts` 가 금지하는 패턴.

### 5.20 오프토큰 값 일괄 처리
| 시안 값 | 대체 |
|---|---|
| back chevron `#2E2F33@88%` (캔버스 전체 80회) | **`label.normal`** (`#2a2a37`) |
| 메타 아이콘 실효 α 0.306 / 0.168 | `label.assistive` (0.278) / `label.disable` (0.161) |
| 비활성 CTA fill `#07194C@5%` | `fill.normal` (`#70737c14`) |
| 비활성 CTA 라벨 α 0.264 | `label.disable` (0.161) |
| 선택 칩 방사형 글로우 `#FFEBE4→white` | **버림** |
| 0.66px / 0.8px 스트로크 | `borderWidth.thin`(1) |
| 앱바 타이틀 `#000000` | `label.strong` — **이미 토큰이다**(오프토큰 아님) |
| 셔터 안쪽 `#E5E8EB`, 카메라 전환 `#333D4B` | P3(인앱 카메라)로 이연 |

### 5.21 시안 자체 오류 (그대로 구현하지 말 것)
1. 스토리 작성 선택칩 **`CDK3`** → **`CKD3`**.
2. 신고 F1 의 3번 사유 `욕설·비방·혐오 표현`(stale) → F2~F5 카피 사용.
3. 첫 행 상단 패딩 8 (feed R1 · search 행(a) · popular 카드1) → **16**.
4. 스토리 촬영 원형 버튼 2개의 라벨이 둘 다 `전체` (더미 중복) → 실제 카피 필요.
5. 글쓰기 `설명 작성` 라벨만 x20, 나머지 x24 → **전부 20**(사실은 글리프 사이드베어링 차이).
6. 답글 삭제 후 부모의 `💬 1` 이 그대로 → 감소시킨다.
7. `작성자` 배지가 40×21/10px 과 46×22/12px 두 벌 → **40×21/10 SemiBold**(3프레임 다수).
8. 스토리 배지가 40×21/10 과 60×32/15 두 벌 → **40×21/10**(32는 컨트롤 높이지 태그 높이가 아니다).
9. 메타행이 썸네일 없는 카드에서도 237 고정폭 → **실제 컬럼에 우측 정렬**.
10. 섹션 밴드 위/아래 여백 8/8/16 혼재 → **위 16 / 아래 8**.

---

## 6. 보존 목록 — 시안에 없지만 **반드시 살아남아야 하는 것**

> 시안은 해피패스만 그린다. 아래는 전부 현행 구현에 있고, **삭제하면 기능 회귀**다.
> 새 레이아웃에 자리가 없으면 **다른 진입점을 먼저 만들고** 옮긴다. 그냥 지우지 않는다.

### 6.1 신고 · 차단 · 소유권 (스토어 심사·운영 필수)
1. **피드 행 케밥(⋯) → `신고하기` / `차단하기`**. 시안의 `PostRow` 에는 케밥이 없다.
   → **대체 진입점을 반드시 마련**한다(권장: 행 롱프레스 또는 상세로 이관 + 상세 앱바 ⋯).
   진입점 없이 케밥만 지우면 목록에서 신고·차단 경로가 **완전히 끊긴다**.
2. `isMine` 이면 케밥 숨김(자기 신고 방지, QA 2026-08-06).
3. `isWithdrawnAuthor` → `탈퇴한 사용자` 표기 + 프로필 진입 차단 + 케밥 숨김.
4. `authorName === "나"` → `freePost.selfName` 치환.
5. 차단 사용자 **클라이언트 필터**(`useBlockedUsers` + `visiblePosts`) — 서버 재조회 전 한 박자를 메운다.
6. 신고 에러 코드 분기(`COMMUNITY_ERROR_011` 이미 신고함, `008` 댓글 사라짐, `010` 부모 댓글 삭제됨).
7. `afterModalTransitions()` — 시트 닫고 `router.push` 하기 전 게이트. 지우면 "공유/신고가 조용히 안 되는" 버그 재발.
8. **소유자 판정은 서버 `isMine`**(`isMyContent`). 닉네임 비교로 되돌리지 말 것.

### 6.2 상세 화면 액션
9. **공유** (`shareContent` + `communityPostDeepLink` + `STORE_REDIRECT_URL`) — 앱바에서 사라졌다 → **⋯ 메뉴로 이동**.
10. **북마크** (`togglePostBookmark`) — 같은 이유로 ⋯ 또는 메타행으로 이동.
11. **좋아요 토글** + 하트 스프링 애니메이션(`HEART_SPRING`, `ReduceMotion.System`) + `hapticSelection`.
    (시안은 정적 카운트만 보여줄 뿐 기능 삭제 근거가 아니다)
12. **투표/설문** `PollCard` · `VoteSheet` · `VoteAttachCard` · `castVoteAsync` · 투표 4종 에러 분기.
13. **이미지 전체보기 오버레이**(`previewImage` + `AppModal`).
14. **태그 → 태그 검색** (`/community?tag=`), `TagChips`.
15. **작성자 프로필 진입** (`/community/author/{id}`) — 시안엔 chevron 이 없지만 탭 동작은 남긴다(a11y 라벨 포함).
16. **이어 읽을 글 / 관련 글** (`rankRelatedPosts`) — 시안의 `추천 게시글` 로 대체 가능하되 랭킹 로직은 유지.

### 6.3 댓글 · 멘션
17. **하단 최상위 댓글 입력 바 전체**. 시안 어디에도 최상위 댓글 작성 진입점이 없다 —
    지우면 **댓글을 아예 못 단다**. `답글쓰기` 화면은 답글 전용.
18. **@멘션 일습**: `commentMentions.ts`(`findMentionQuery`/`applyMention`/`removeMention`/`retainedMentions`),
    `MentionSuggestions` 플로팅 패널, 입력바 안의 `@닉네임` 칩 행, `MentionText` 렌더,
    `startReplyTo()` 의 `@상대닉 ` 시딩. 시안의 빈 placeholder 를 "시딩 삭제"로 읽지 말 것.
19. **답글/수정 컨텍스트 바** (`replyingTo` / `editingCommentId` + `×` 취소).
20. **댓글 수정** (`editingCommentId` → `updateComment`).
21. **삭제된 댓글 플레이스홀더** (`comment.isDeleted` → 문구 대체, 메타/⋯ 숨김).
22. **댓글 로딩/에러/빈 상태 3분기** + 재시도.
23. `maxLength={2000}` + `isCreatingComment || isUpdatingComment` 중복 제출 가드.
24. **중첩 `comment.replies` 재귀** — 시안이 1단계만 보여준다고 깊이 1로 하드코딩하지 말 것(API 확인).

### 6.4 목록 · 데이터
25. **당겨서 새로고침** (`useRefreshable` + 스코프 `COMMUNITY_FEED_REFRESH`/`COMMUNITY_POST_REFRESH`/
    `COMMUNITY_POPULAR_REFRESH`) + `useRevalidateOnReturn` + `trimFeedCacheToFirstPage`.
26. **무한 스크롤** (`onEndReached`, `hasNextPage`, `isPlaceholderData` 가드) + 꼬리 로더 + `NextPageErrorRow`.
27. **스켈레톤 / 에러(`retryable` 분기) / 빈 상태** 전부.
    **"에러를 빈 상태처럼 그리지 않는다"** 는 의도적 규칙이다.
28. **태그 필터 진입 상태** (`tagFilter` — `#태그` 칩 + 닫기, 태그 중엔 카테고리 미전송).
29. **카테고리 필터 기능** (서버 `category` 파라미터) — 피드 시안에 칩 레일이 없어도 기능은 남긴다.
30. **인기글 레일 + `/community-popular` 더보기**.
31. `viewCount == null` 이면 조회 표시 자체를 안 그리는 하위호환.
32. FlashList 설정(`maintainVisibleContentPosition:{disabled:true}`, `keyExtractor`, paddingBottom 산술).
33. `keyboardShouldPersistTaps="handled"`, `keyboardDismissMode`, `autoFocus`, `returnKeyType="search"`.
34. `lineBreakStrategyIOS="hangul-word"` / `textBreakStrategy="balanced"`.

### 6.5 검색
35. 필드 **clear ✕** (시안에 없다 — 실재 어포던스다).
36. **칩별 × 개별 삭제** (`removeRecentSearch` + `hapticSelection`).
37. `MAX_QUERY_LENGTH = 100` (서버 계약 q ≤ 100).
38. 결과 스켈레톤 / 에러+재시도 / **무결과 빈상태**(`community.search.noResultsTitle/Body`).
39. 커서 페이지네이션.
40. 커밋 시 최근검색에 추가 / 필드 비면 `submitted` 해제.

### 6.6 글쓰기
41. **`ContentResponsibilityCheck`** — "다른 사람의 권리를 침해하지 않는…" 체크. **법적 게이트**.
    `canSubmit` 의 `responsibilityAgreed` 항 유지.
42. **에디터 툴바** (이미지·투표 버튼 + `KeyboardDismissButton`) + `KeyboardStickyView`/`KeyboardAwareScrollView`
    + Android `bottomInset = max(insets.bottom, 24)`.
43. **`ConfirmExitModal`** + `hasContent` 초안 감지 + `afterModalTransitions()`.
44. **순차 업로드 진행 표시** (`freePost.photoProgress` `{current}/{total}`) + **all-or-nothing**(1장 실패 시 게시 중단).
45. `presentError(..., { scope:"community-post-create", retry })`.
46. `MAX_IMAGES = 5` + 초과 시 `showInfoToast`(`photoLimitTitle/Body`).
47. **`mergeCommunityTags` 정규화** (소문자화, `#` 제거, 공백/과길이 거부, 중복 제거). 개수 상한만 10→5.
48. 제목 `maxLength 200`, `singleLineInputText()`.
49. 수정 라우트의 소유권 가드(`isConfidentlyNotMine`, `usePostDetail`, `presentCommunityError`).
50. `hapticSelection`(시트 열기/옵션 선택).

### 6.7 스토리
51. **정렬 탭 `추천 / 최신`** (`SORTS`, `?sort=`, 전환 시 `viewedRef.clear()`) — 뷰어 앱바에 자리가 없다 →
    **스토리 상단탭 목록 화면 또는 ⋯ 메뉴로 이동**. 기능은 유지.
52. **조회수 / 좋아요 수** — 시안은 둘 다 안 보여준다. 데이터는 계속 받고 `recordView` 도 호출한다.
    UI 를 지우면 "안 보이는" 것이지 "없어지는" 게 아니다 → 어디에 둘지 결정 필요.
53. **만료 카운트다운** `formatRemaining()` (`expiringSoon`/`expiresInMinutes`/`expiresInHours`).
    스토리는 24h 뒤 사라진다. 시안의 `3시간전` 은 **경과**지 **잔여**가 아니다.
    잃으면 "곧 사라진다"는 유일한 신호가 없어진다.
54. `isMine` → 나의 스토리 + 삭제 플로우 / 남의 것 → 신고 + 차단.
55. `initialScrollIndex` / `?index=` 딥링크, `getItemLayout`, `windowSize`, `viewabilityConfig`, 세로 페이징.
56. `StoryRail` 자체 빈상태("첫 스토리를 올려보세요") + `+ 만들기` → `/story/new`.
57. `presentCommunityError` (일반 "인터넷 연결" 폴백 금지 — 403/`COMMUNITY_ERROR_014`/`FOOD_CAMERA_002` 를 가렸던 이력).

### 6.8 스토리 작성
58. **오늘/어제 식사 기록 사진 후보** (`useDateAnalysis` → `mealCandidates`) + `isRemote`
    (서버 사진은 URL 그대로, **재업로드 금지**). "오늘의 식단" 의 존재 이유다.
59. **서명 URL 식별 수정**: 후보 키는 `uri` 가 아니라 `id`(`날짜-끼니`/로컬 URI), `selectedCandidate` 는
    매 렌더 최신 URL 재해석. 지우면 "고른 사진이 사라진다" 버그 재발.
60. `imageUploadService.uploadImage(uri, "community")` → `objectPath` 제출 경로.
61. `isSaving`(`isCreating || isUploading`) + 저장중 라벨.
62. `imagePickerService.ensurePermission` (권한 다이얼로그 + 설정 딥링크 + `afterModalTransitions`).

### 6.9 신고
63. **`더보기` 액션시트의 `차단하기`** — 시안은 신고만 그렸다.
64. `postId` 가드 + `submitting` 재진입 가드.
65. **성공 토스트** `신고를 접수했어요` / `신고 내용을 확인할게요.` + `router.back()`.
    시안엔 성공 상태가 없다 — 토스트가 없으면 화면이 그냥 사라진다.
66. `presentCommunityError(scope:"community-report-form")`, `maxLength 300` / `slice(0,500)` 클램프.
67. **`기타` 행의 입력값 인라인 프리뷰** — 다시 열지 않고 뭘 썼는지 볼 유일한 방법. 시안엔 없지만 유지하고
    타이포 토큰(`subtext.medium` + `label.alternative`)만 정돈.

### 6.10 프로필 · 팔로우
68. 낙관적 팔로우 (`onMutate` 카운트 보정, 롤백, `isFollowingPending` disable).
69. `profile.isMine` → 팔로우 버튼 숨김 + 차단 비활성.
70. `profile.badges` 렌더.
71. 팔로워/팔로잉 카운트 → `/community/connections` 이동.
72. 프로필 화면의 프로비저닝된 i18n 키(`reviews`/`stories`/`emptyReviews`/`emptyStories`/`openProfile`/`otherPosts`).

### 6.11 전역
73. **내 활동 / 북마크 진입점** (`/community-library`, `?tab=bookmarked`) — 시안 헤더에서 아이콘 2개가
    사라졌다. 진입점을 **먼저 옮기고** 지운다(권장: 우상단 프로필 아이콘 → 내 페이지).
74. **알림 진입점** (현행 헤더 3번째 아이콘).
75. **i18n** — 전 문자열 `t()`. 시안 한국어는 `ko` 값. `en` 도 같이 채운다.
76. **a11y** — `accessibilityRole` / `accessibilityLabel` / `accessibilityState`(탭·칩·좋아요·팔로우), `hitSlop`.
77. **다크모드** — 시안은 라이트 전용. `useV2Theme()` 로만 색을 잡아 다크를 유지한다.
78. `useAppRouter` / `routeGraph` 등록(신규 라우트 3개도 등록해야 analytics 화면명이 붙는다).
79. **AI-상담 필 스택 산술** (`FLOATING_AI_BUTTON_HEIGHT` + `STACK_GAP`) — §2.16.

---

## 7. 구현 순서 (P1 WBS)

각 항목은 **한 번에 하나의 집중 변경**이고, 의존은 `←` 로 표시했다.
`SRV` 표시는 **없는 서버 엔드포인트를 기다린다**는 뜻이다.

### Phase 0 — 토대 (전부 additive · 기존 화면 무변경)

| # | 작업 | 산출물 | 의존 |
|---|---|---|---|
| 0.1 | `communityLayout.ts` 상수 파일 | §2.0 | — |
| 0.2 | 아이콘 6종 추가 — `more`, `heartFilled`, `heartOutline`, `chatOutline`, `arrowUp`, `profileFilled` | G1 G19 G20 G12 | — |
| 0.3 | 토큰 추가 — `typography.subtext.largeStrong`(15 Med/20), `elevation[3]` | G9 G6 | — |
| 0.4 | `V2Badge` 확장 — `shape="pill"`, xs padV 4, neutral/weak→`fill.normal`, `color="ink"\|"onMedia"` | G2 | — |
| 0.5 | `V2Chip tone="brandSoft"` | G3 | — |
| 0.6 | `V2Divider variant="thick" size={8\|16}` | G4 | — |
| 0.7 | `V2ScreenHeader` — `titleAlign`, `leading="close"` | G7 | — |
| 0.8 | `V2BottomCTA fade` | G8 | — |
| 0.9 | `V2ProgressBar color="static"` | G10 | — |
| 0.10 | `V2EmptyState tone="quiet" + illustration` | G11 | — |
| 0.11 | **`V2Menu`** (앵커드 팝오버 + `ModalOverlayHost`) ⚠ DS 오너 승인 필요(§5.8 인접) | G5 | 0.3 |
| 0.12 | `V2Avatar` | G12 | 0.2 |
| 0.13 | `V2TextField` — `inputComponent`, `clearable`, `label: ReactNode`, `tone="filled"` | G14 G15 G16 | — |
| 0.14 | `V2SelectField` | G17 | 0.13 |
| 0.15 | `V2BottomSheet` — `snapPoints` 탈출구 + `footer` 슬롯 | G13 | — |

### Phase 1 — 공유 프리미티브 (화면 코드 아직 안 건드림)

| # | 작업 | 의존 |
|---|---|---|
| 1.1 | `MicroPill` + `MetaRow` | 0.1 0.2 0.4 |
| 1.2 | **`PostRow`** (§2.1 공식) + `PostRowSkeleton` | 1.1 0.3 |
| 1.3 | `CompactPostRow` + 이미지 개수 배지 | 1.1 |
| 1.4 | `SectionHeader` / `SectionBand` / `MorePill` | 0.6 |
| 1.5 | `CategoryChipRail` | 0.5 |
| 1.6 | `SortDropdown` | 0.11 |
| 1.7 | `CommentRow` (+대댓글 변형) | 1.1 0.2 |
| 1.8 | `CommentComposer` | 0.2 |
| 1.9 | `QuietEmptyState` | 0.10 |
| 1.10 | `FollowButton` + `CommunityAvatar` | 0.12 |
| 1.11 | `AuthorCard` / `AuthorRail` / `AuthorProfileCard` | 1.10 1.1 |
| 1.12 | `NeighborRow` / `ConnectionRow` | 1.10 1.1 |
| 1.13 | `CommunityTopTabs` | — |
| 1.14 | `CommunityActionSheet` | 0.8 |
| 1.15 | `PhotoScrim` / `EdgeFade` | — |

### Phase 2 — 화면

| # | 작업 | 의존 | SRV |
|---|---|---|---|
| 2.1 | **S1 피드** — 헤더(탭+검색) · `게시글` 행 · 정렬 드롭다운 · `PostRow` 교체 · FAB 치수 | 1.2 1.4 1.6 1.13 2.16 | — |
| 2.2 | S1 — 작성자 추천 레일 삽입 | 1.11 | **E1** |
| 2.3 | **S2 검색** — 필드 `V2SearchField` 교체 · 최근검색 레일 · 자동저장 행 · 랭킹 행 | 1.4 | — |
| 2.4 | S2 — 결과 헤더(필터 레일 + 정렬) + `PostRow` 결과 | 1.2 1.5 1.6 | **E6** |
| 2.5 | **S3 인기글** — 헤더/기간탭/칩레일 + `PostRow rank` | 1.2 1.5 1.13 | — |
| 2.6 | **S4 상세 상단** — 앱바 · 카테고리 칩 · 작성자 행 · 제목/본문 타이포 · 이미지 스트립 · 태그 · 구분선 · 메타행 | 1.1 | — |
| 2.7 | S4 댓글부 — 정렬 바 + `V2Menu` + `CommentRow` + 5개 캡 + `댓글 더보기` + 빈상태 | 1.6 1.7 1.9 | E5(정렬은 클라 폴백 가능) |
| 2.8 | S4 하단부 — 이전/다음 · `AuthorProfileCard` · `{작성자}의 다른글` · `추천 게시글` · 작성자 레일 | 1.3 1.4 1.11 | **E1 E3 E4** |
| 2.9 | **S5 답글쓰기(신규)** — 라우트 + 부모/답글 목록 + 컴포저 + `V2Menu` | 1.7 1.8 0.11 | — |
| 2.10 | **S6 신고** — 헤더 ✕/중앙 · 헤드라인 블록 · 8행 · 기타 시트 · CTA 페이드 · analytics surface 수정 · `[CODE]` 규약 | 0.7 0.8 0.13 | **E11** |
| 2.11 | **S7 글쓰기** — 폼 치수/타이포 · 셀렉트 · 태그 칩 · 본문 면 · 카테고리 시트(`다음` CTA) · CTA 페이드 | 0.8 0.13 0.14 1.5 | E10(분류체계) |
| 2.12 | S8 → S7 **작성/수정 에디터 통합** | 2.11 | — |
| 2.13 | **S9 프로필** — 헤더/`AuthorProfileCard`/3탭/섹션 | 1.11 1.13 1.2 1.3 1.4 | **E12 E13 E1 E4** |
| 2.14 | **S10 팔로워/팔로잉** — 헤더 중앙 · `ConnectionRow` 81 · full-bleed 선 | 1.12 0.7 | — |
| 2.15 | **S11 신신이웃(신규)** — 라우트 + 칩 레일 + `NeighborRow` | 1.12 1.5 0.7 | **E2** |
| 2.16 | FAB 치수/카피 (`FloatingWriteButton`) — 스택 산술 유지 | — | — |
| 2.17 | **S12 스토리 뷰어** — 라이트 크롬 · 레터박스 2모드 · 오버레이 · 진행바 · 하단 바 · 액션시트 | 1.14 1.15 0.9 1.1 | E9(관심없음) |
| 2.18 | S12 — 댓글 시트(고정 86% + 도킹 컴포저 + 행 팝오버) | 2.17 0.15 1.7 1.8 1.9 | **E8** |
| 2.19 | **S13 스토리 작성** — 전면 사진 + 139 시트 + 칩 레일 + 캡션 + 취소 다이얼로그 | 1.5 1.15 | **E7** |
| 2.20 | 스켈레톤 3종을 새 행 리듬으로 재작성 | 1.2 1.3 1.7 | — |
| 2.21 | i18n 키 추가(ko+en) 일괄 | 2.1–2.19 | — |

### Phase 3 — 보류 / 별건

| # | 작업 | 사유 |
|---|---|---|
| 3.1 | 하단탭 IA 이동(자유글/스토리를 레시피 밑으로, 커뮤니티 슬롯→상담) | 앱 전역 · 제품 승인(§5.0) |
| 3.2 | S14 인앱 카메라 (`expo-camera`) | 새 화면 + 권한 |
| 3.3 | S15 커스텀 갤러리 그리드 | **`expo-media-library` 미설치** — 새 네이티브 의존 + 권한 |
| 3.4 | `관심없음` 기능 | 서버 E9 |
| 3.5 | 카테고리 분류 체계 교체 + 데이터 마이그레이션 | 서버 E10 · 제품 결정 |

### 7.1 없는 서버 엔드포인트 (구현 전 반드시 확보)

| ID | 필요한 것 | 막는 항목 |
|---|---|---|
| **E1** | `GET /community/authors/suggested` — 추천 작성자 (`이런 작성자도 만나보세요`) | 2.2 2.8 2.13 |
| **E2** | `GET /community/authors?category=&cursor=` — **신신이웃 전역 디렉터리**. 응답에 `followerCount`, `postCount`, `badges`, `isFollowing` 포함(현행 행마다 `useCommunityAuthor` = N+1) | 2.15 |
| **E3** | `GET /community/posts/{id}/adjacent` — 이전/다음 글 | 2.8 |
| **E4** | `GET /community/posts/{id}/related` (또는 `/recommended`) — 서버 추천 게시글. 없으면 클라 `rankRelatedPosts` 유지 | 2.8 2.13 |
| **E5** | `GET /community/posts/{id}/comments?sort=recent\|popular` — 댓글 정렬. **없으면 클라 정렬(좋아요 desc, 동률 최신)로 대체 가능** | 2.7 |
| **E6** | `GET /community/posts/search?category=&sort=` — 검색 결과 필터/정렬 (현행 `q` 만) | 2.4 |
| **E7** | 스토리 태그 — `CreateCommunityStoryInput.tags` + `CommunityStory.tags`. **현행 모델에 필드 자체가 없다** (칩 레일·뷰어 `저염식` 배지의 유일한 출처) | 2.17 2.19 |
| **E8** | 스토리 댓글 — `GET/POST /community/stories/{id}/comments`, `PUT/DELETE .../{commentId}`, `POST .../like`. **현행 `communityStoryService` 에 댓글 개념이 없다** | 2.18 |
| **E9** | `POST /community/posts/{id}/not-interested` (`관심없음`) — 앱에 없는 기능 | 3.4 |
| **E10** | 게시글 `category` enum 교체 (`질문·상담`/`식단 인증`/`식당 추천`/`CKD 정보`) + 기존 행 마이그레이션 + 피드/인기글 필터 | 3.5 |
| **E11** | 신고 사유 8번째(`음식·식단과 관련 없는 게시글`) enum 매핑 + `description` 첫 줄 `[CODE]` 규약(식당 신고 선례) | 2.10 |
| **E12** | 작성자 프로필 **`후기(reviews)` 카운트** — 현행은 `postCount` 뿐. **값을 지어내지 말 것**(없으면 라벨을 `게시글` 로 유지) | 2.13 |
| **E13** | 프로필 `후기` / `스토리` 탭 데이터 소스 | 2.13 |
| **E14** | 최근검색 `자동저장 끄기` — **클라 전용 플래그로 충분**(서버 불필요) | 2.3 |

---

## 8. 미해결 / 디자이너·제품 확인 필요

| Q | 질문 | 영향 |
|---|---|---|
| **Q1** | `meal-169`(오늘의 식단 상세)가 **스토리 뷰어 + 댓글 시트**가 맞나? 오버레이 기하가 `story-page` 와 바이트 동일하다. 아니면 사진형 게시글이라는 **별도 화면**인가? | 화면 하나를 통째로 잘못 만들 수 있다. E7/E8 필요 여부가 갈린다 |
| **Q2** | 스토리 진행 표시를 **세로 도트 → 가로 연속 바**로 되돌리는 게 맞나? 현행 코드 주석에 "가로 바는 QA 2026-08-06 에 거부됨"이 있다 | S12 |
| **Q3** | 검색이 **탭 안 레이어**인가 **푸시 라우트**인가? 시안은 탭 스트립·하단 탭바가 계속 마운트된다 | S2 내비 구조 |
| **Q4** | 피드 행에서 케밥이 사라진다면 **신고/차단 진입점**은 어디인가? | 6.1 — 스토어 심사 |
| **Q5** | 작성자 추천 레일의 **두 번째 삽입 지점(주기)** | S1 |
| **Q6** | 게시글 제목/요약이 **1줄 말줄임**이 맞나, 목데이터가 짧아서 그렇게 보이는 것뿐인가 | `PostRow` |
| **Q7** | `댓글 더보기` 가 **인라인 다음 페이지**인가 **댓글 전용 화면**인가 | S4 |
| **Q8** | FAB 카피 `글쓰기 작성` vs 현행 `글쓰기` | 카피 |
| **Q9** | 스토리 촬영 화면의 좌·우 원형 버튼 라벨(시안은 둘 다 `전체` = 더미) | S14 |
| **Q10** | 글쓰기 설명 본문 **6번째 줄**(CTA/페이드에 가려 판독 불가) | 목데이터일 뿐 — 영향 없음 |
| **Q11** | 스토리 작성 칩 레일 **7번째 칩** 라벨(파일에 글리프 없음) | S13 |
| **Q12** | 스토리 캡션 **200자 멀티라인 → 100자 1줄**은 콘텐츠 절단 변경. 기존 데이터/서버 검증 확인 필요 | S13 |
| **Q13** | 프로필 통계 3열의 우측 여백 60.7 과 탭 레일 폭 233(전폭 아님)이 의도인가 | S9 |
| **Q14** | 신고 시트 `확인` 을 빈 값에서도 브랜드로 그린 것이 의도인가(§5.13) | S6 |
| **Q15** | 시안 카피가 **합쇼체**, 앱은 **해요체**. 전환할 것인가(별건) | 전역 |

---

## 부록 A — 타이포 토큰 빠른 참조 (커뮤니티에서 실제로 쓰는 것만)

| 쓰임 | 크기/굵기/LH | v2 토큰 |
|---|---|---|
| 상단탭 선택 / FAB / 시트 옵션 / CTA | 17 Bold / 23 · 17 SemiBold / 21 | `label.mediumStrong` · `label.medium` |
| 상단탭 비선택 | 17 SemiBold / 21 | `label.medium` |
| 검색 필드 값·플레이스홀더 / 컴포저 | 17 Medium / 21 | `label.mediumWeak` |
| 폼 필드 값·플레이스홀더 / 신고 기타 입력 | 17 Regular / 26 | `body.mediumWeak` |
| 섹션 제목 | 17 Bold / 23 | `title.xSmall` |
| 검색 패널 섹션 헤더 | 17 SemiBold / 23 | `title.xSmallWeak` |
| 신고 헤드라인 | 22 Bold / 30 | `title.medium` |
| 시트 제목 / 다이얼로그 제목 | 20 Bold / 27 | `title.small` |
| **게시글 제목(목록)** | **15 Medium / 20** | **`subtext.largeStrong` (신규 G9)** |
| 게시글 제목(상세) / 작성자 이름(카드·행) | 15 SemiBold / 19 | `label.small` |
| 프로필 이름·스탯 숫자 | 15 Bold / 19 | `label.smallStrong` |
| 상세 작성자 이름 / 신고 사유 / 메뉴 항목 / 빈상태 / 랭킹 행 | 15 Medium / 19 | `label.smallWeak` |
| 다이얼로그 본문 / 글쓰기 본문 | 15 Regular / 20 | `subtext.large` |
| 게시글 요약 / 상세 본문 | 13 Regular / 20 | `body.xSmall` |
| 메타 수치 · 날짜 · `답글쓰기` · 스탯 라벨 | 13 Regular / 18 | `subtext.medium` |
| **댓글 이름 · 댓글 본문 · 캡션** | **13 Medium / 16** | **`label.xSmallWeak`** |
| 정렬 라벨 / 더보기 필 / 이전다음 칩 / 최근검색 칩 | 13 Medium / 16 | `label.xSmallWeak` |
| 필터 칩 / 팔로우 버튼 / 랭크 숫자 / 이미지 개수 배지 | 13 SemiBold / 16 | `label.xSmall` |
| 목록 시각 (`2시간 전`) | 12 Regular / 16 | `subtext.small` |
| 하단 탭바 라벨 | 11 Medium / 14 | `caption.small` |
| **마이크로 배지 · 태그 칩 · `작성자` · 스토리 배지** | **10 SemiBold / 15** | **`caption.xSmall`** |

## 부록 B — 색 토큰 빠른 참조

| 시안 원값 | v2 | 쓰임 |
|---|---|---|
| `#FFFFFF` | `background.default` / `static.white` | 화면·행·바·시트·카드 |
| `#F7F7F7` | `background.lower` | 8px 섹션 밴드 |
| `#F9FAFB` | `fill.background` | 시트 옵션 면, 사진 타일, 신고 사유 행, 아바타(스토리) |
| `#2A2A37` | `label.normal` | 제목·이름·본문 강조·탭 인디케이터 |
| `#2E2F33` @0.70 | `label.neutral` | 요약·비선택 탭·칩 라벨·정렬·**카테고리 배지 면** |
| `#37383C` @0.51 | `label.alternative` | 메타·날짜·플레이스홀더·⋯·개수 배지 원 |
| `#37383C` @0.28 | `label.assistive` | 아바타 글리프·섹션 chevron·메타 아이콘 |
| `#37383C` @0.16 | `label.disable` | 시트 그래버·비선택 탭바 아이콘 |
| `#70737C` @0.08 | `fill.normal`(면) / `line.alternative`(선) | 검색필드·태그칩 면 · **행 구분선** |
| `#70737C` @0.05 | `fill.alternative` | 대댓글 배경 · 글쓰기 본문 면 |
| `#70737C` @0.16 | `line.neutral` | 정렬 필/팝오버 테두리 · 정렬 바 하단선 |
| `#70737C` @0.22 | `line.normal` | 탭 하단선 · 폼 필드 테두리 · 더보기 필 테두리 · 빈상태 일러스트 획 |
| `#022047` @0.05 | `fill.pressed` | 아바타 플레이스홀더 면 |
| `#FE7139` | `primary.primary` | CTA · FAB · 랭크 숫자 · 캐럿 · 필수 `*` · 선택칩 테두리/라벨 |
| `#FFF4F0` @0.60 | `primary.primaryWeak` | 랭크 원 · `작성자` 배지 · 선택칩 면 · 팔로잉 버튼 |
| `#171719` @0.20 | `background.dim` | 시트/다이얼로그 딤 · 스토리 레터박스 딤 |
| `#FF4242` | `status.negative` | **좋아요 눌림 하트** (브랜드 주황 아님) |
| `#FFFFFF` @0.70 | `primitives.opacityWhite[700]` | 스토리 시각 (시맨틱 없음 — 프리미티브 직접) |
| `#2E2F33` @0.88 | ❌ **오프토큰** → `label.normal` | back chevron (캔버스 전체 유일한 오프토큰) |
