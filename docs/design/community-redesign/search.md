# 자유글 — 검색 진입 · 입력 · 결과 (section key: `search`)

Canvas region x 1300–4310 / y 460–1840 of `slim.svg` (root viewBox `0 0 4831 14968`).
All numbers below are **@1x CSS px measured from the SVG source** (rect/path coordinates), not eyeballed.
Every frame is 375 × 1283 at y = 512. 375 wide = iPhone 375pt, so 1 SVG unit = 1pt.
Frames are **taller than a device** (1283 vs 932): the artboard is stretched so the whole scroll
column + the pinned bottom chrome are visible at once. Treat y > ~932 as "below the fold".

Text is outlined; sizes/weights below were derived by fitting the measured ink box
(width **and** height) and the filled-ink **area** against the real `Pretendard-{Regular,Medium,SemiBold,Bold}.otf`
metrics — every one of them landed on an integer px with <1% error, so the sizes/weights are
exact, not estimates.

Coordinates are given as **rel = absolute − frame origin** (frame origin = top-left of the
status bar). `rel x 20` therefore means "20px from the screen's left edge".

---

## 1. Screen inventory

| # | frame x | screen | state | delta vs neighbour |
|---|---------|--------|-------|--------------------|
| F1 | 1362 | 자유글 피드 (커뮤니티 탭) | default, search bar is an **entry button** | — (entry point; the feed body itself belongs to the feed section spec) |
| F2 | 1769 | 자유글 **검색 레이어** | focused, empty query, **no recent searches** → empty copy; keyboard up | F1 + back chevron, field shrinks, feed body replaced by search panel |
| F3 | 2176 | 자유글 검색 레이어 | focused, empty query, **3 recent chips**; keyboard up | = F2 but the 115px empty block is replaced by a 50px chip rail |
| F4 | 2583 | 자유글 검색 레이어 | **typing** — query `밥` + brand caret; keyboard up | = F3 + query text/caret in field (recent panel unchanged; no clear-X) |
| F5 | 2990 | 자유글 **검색 결과** | submitted `밥`, keyboard dismissed, **no filter chip selected** | = F4 but the recent/ranking panel is replaced by filter rail + result list; FAB + bottom tab bar reappear |
| F6 | 3397 | 자유글 검색 결과 | **`전체` chip selected** (brand tint) | = F5, one chip's fill/border/text turn brand |
| F7 | 3804 | 자유글 검색 결과 | **sort dropdown open** (최신순/조회순/인기순, `조회순` row pressed) | = F6 + popover under the sort pill |

Frames F5/F6/F7 contain **byte-identical result rows** (same 6 rows: 168 / 106 / 147 / 118 / 176 / 147 px tall).
Frames F2/F3/F4 contain an identical ranking panel (실시간 인기글 + 인기 검색어, 4 rows each).

---

## 2. Shared chrome (identical in all 7 frames)

### 2.1 Status bar — rel y 0–50 (h 50)
iOS mock (9:41, signal/wifi/battery, notch). Not app-owned. On device this is the safe-area top
inset (44–59); implement as `insets.top`, do not hardcode 50.

### 2.2 커뮤니티 탭 스트립 — rel y 50–101 (h **51**), white, 1px bottom border `#70737C @0.22` (= line.normal)
| element | rel x | ink | type |
|---|---|---|---|
| `레시피` | ink 37.6–79.1 | h 15.0 | **17 SemiBold**, `#2E2F33 @0.7` |
| `자유글` | ink 114.3–157.9 | h 15.1 | **17 Bold**, `#2A2A37` |
| `스토리` | ink 192.2–234.1 | h 15.0 | **17 SemiBold**, `#2E2F33 @0.7` |
| selected indicator | rect **105.5–167.5** (w 62) × y rel 99–101 (h **2**, r 1) | | fill `#2A2A37` |
| profile avatar | 331–355, y rel 63.5–87.5 → **24×24, r 12** | | bg `#022047 @0.05`, glyph `#37383C @0.28` |

Derived item boxes (label ink ± 9): 28.6–88.1 / 105.3–166.9 / 183.2–243.1 → **gap ≈ 16–17**, first item left ≈ 28.6.
The tab strip **stays mounted in every search state** — search is a layer inside the 자유글 tab, not a pushed route.

### 2.3 검색 행 — rel y 101–173 (h 72), white
* Field: **h 44, r 12, fill `#70737C @0.08`** (= fill.normal).
  * F1 (no back button): rel x **20 → 355** (w 335).
  * F2–F7 (back button): rel x **44 → 355** (w 311).
* Field vertical: rel y **115–159** (44) → 14px above and below inside the 72 row.
* Back chevron (F2–F7 only): ink rel x 18–28.2, y rel 128.1–145.7 (10.2 × 17.6) → **24×24 icon box at rel x 12–36**, vertically centered on the field. Color `#2E2F33 @0.88` ⚠️ off-token (see §6).
* Search glyph: ink 17.6 × 17.6 at field_left + 13 → **24×24 icon box at field_left + 10**, color `#2E2F33 @0.7` (label.neutral).
* Gap icon box → text: **8**.
* Placeholder `궁금한 점을 검색해보세요` — **17 Medium**, `#37383C @0.51` (label.alternative), ink w 168.8.
* Typed value `밥` (F4–F7) — **17 Medium**, `#2A2A37` (label.normal).
* Caret (F4 only): rect **1.5 × 28**, fill **`#FE7139`**, immediately right of the last glyph.
* ⚠️ **No clear (×) affordance appears even when the field has text** (F4–F7).
* F1 only: a 16px `transparent → #F2F4F6` gradient + 16px solid `#F2F4F6` at the field's right end — a Figma text-truncation fade. Do not implement; use `numberOfLines={1}`.

### 2.4 바텀 탭바 — rel y 1199–1283 (h **84** = 60 bar + 24 home-indicator area)
White, top hairline `#70737C @0.08`. 5 items, **20px horizontal inset, 5 × 67px columns**,
centers at rel x 53.5 / 120.5 / 187.5 / 254.5 / 321.5. Icon ink ≈ 20 tall at rel y 1210–1231,
label ink 9.6 tall at rel y 1237–1247 (≈ **11–12px**). Labels: `홈 · 상담 · 레시피 · 식당 · 전체`; 레시피 active (dark `#2E2F33 @0.7`), others `#37383C @0.16/0.51`. Home indicator: 134 × 5, r 2.5, `#191F28`.
**Hidden behind the keyboard in F2–F4.**

### 2.5 글쓰기 FAB — F1, F5, F6, F7 only
Pill **122 × 48, r 24** (`radius.full`), fill **`#FE7139`**, rel x **233–355** (20 from the right edge),
rel y **1131–1179** → **20px above the tab bar top**. Label `글쓰기 작성` — **17 SemiBold, white**, ink w 75.4.
**Absent in F2–F4** (search-input state hides the FAB).

### 2.6 Keyboard (F2, F3, F4)
iOS Korean 2-bul keyboard bitmap, **375 × 292**, pinned to the frame bottom (rel y 991–1283),
covering the bottom tab bar. Implies: the search layer autofocuses and the panel scrolls above the keyboard.

---

## 3. Screen A — F1: 자유글 피드 with search entry (context only)

Below the search row:
* `게시글` section header row: rel y **173–217 (h 44)**, title ink at rel x 20.3, **17 Bold** `#2A2A37`.
* Sort pill row: rel y **217–249**; pill rel x **285–355 (70 × 32, r 16)**, white fill + **1px `#70737C @0.16`** border, label `최신순` **13 SemiBold** `#2E2F33 @0.7` at rel x 32.6, chevron-down ink 6.1 × 3.7 centered at rel x 56.
  ⚠️ In F1 the feed has **no category chip rail** — only this sort pill. The chip rail exists only in the results state (§7).
* Then post rows (same anatomy as §7.3), an `이런 작성자도 만나보세요` author carousel (137 × 165 cards, r 8, 48px avatar, `팔로잉` 54 × 32 r 8 `#FE7139` / `팔로우` `#FFF4F0 @0.6`), 8px `#F7F7F7` bands between blocks.
* **Tapping the field opens F2** (it is a `Pressable`, not an input).

---

## 4. Screen B — F2: search layer, empty recents

Stack below the search row (rel y 173 onward):

| block | rel y | h | content |
|---|---|---|---|
| empty recent block | **173–288** | 115 | one centered line |
| band | 288–296 | **8** | `#F7F7F7` (background.lower) |
| auto-save row | **296–340** | 44 | `전체 삭제` ｜ `자동저장 끄기` |
| gap | 340–370 | **30** | white |
| `실시간 인기글` header | **370–414** | 44 | title + chevron |
| rank rows ×4 | 414–590 | 4 × **44** | |
| gap | 590–610 | **20** | |
| `인기 검색어` header | **610–654** | 44 | title + chevron |
| rank rows ×4 | 654–830 | 4 × **44** | |
| white | 830–991 | 161 | (frame is over-tall; on device this is the scroll tail) |
| keyboard | 991–1283 | 292 | |

**Empty copy** (exact): `최근 검색한 내용이 없습니다.`
— **15 Medium**, `#37383C @0.51`, ink w 169.0, **horizontally centered** (ink center = rel 187.1 ≈ 187.5)
and **vertically centered** in the 115px block (ink center rel 230.7 = block center 230.5).

**Auto-save row** (identical in F2/F3/F4, always present):
* `전체 삭제` — **13 Regular**, `#37383C @0.51`, ink rel x **20.5–67.1**
* vertical rule — **1px × 12px**, `#70737C @0.22`, at rel x **77.5**, y ink-aligned (rel 311–323)
* `자동저장 끄기` — **13 Regular**, `#37383C @0.51`, ink rel x **85.3–154.2**
* Both texts vertically centered in the 44 row (ink center = row center, exactly).
* ⚠️ This row duplicates the `전체삭제` action that also sits inside the chip rail (§5). See §8.

**Section header** (both 실시간 인기글 / 인기 검색어, h 44):
* Title ink at rel x **20.5**, **17 SemiBold**, `#2A2A37`. Copy: `실시간 인기글` (w 91.2), `인기 검색어` (w 75.1).
* Chevron-right ink **6.6 × 10.8**, ink right edge at rel **354.3** → **24×24 icon box, right-aligned to the 20px gutter**, color `#37383C @0.28` (label.assistive).
* Chevron ⇒ the header is tappable ("see all").

**Rank row** (h 44, no divider, rows are contiguous):
* Rank number: **15 Medium**(digit height 10.6 → 15px), **`#FE7139`**, left edge at rel x **20** for every rank (1–4 all orange — no top-3-only rule).
* Label: left edge at rel x **45** → number column = **25px** (gutter 20 + 25). **15 Medium**, `#2A2A37`.
* Copy in both lists (identical mock data): `5분 레시피` / `초간단 식단` / `바나나` / `단백질`.
* **4 rows shown** (not 5).

---

## 5. Screen C — F3: search layer with recent searches

Same as F2 except the 115px empty block is replaced by a **50px recent-chip rail** at rel y **173–223**
(then band 223–231, auto-save row 231–275, gap 30, 실시간 인기글 header at **305**, …; everything below shifts up 65).

Recent rail, all vertically centered on rel y **198**:
| element | rel x | size | style |
|---|---|---|---|
| label `최근 검색어` | ink **20.6–73.7** | — | **12 Medium**, `#2A2A37` |
| chip `저염식` | **87–133** | 46 × **24**, r 12 (full) | fill `#70737C @0.08`, text **12 Medium** `#2E2F33 @0.7`, padding ≈ **7** |
| chip `CKD3` | **139–188** | 49 × 26 ⚠️ | same (the 26 height is a Figma inconsistency — use 24) |
| chip `CKD4` | **194–240** | 46 × 24 | same |
| scroll fade | **281–307** | 26 × 24 | linear `white → transparent` (right→left), sits over the rail |
| action `전체삭제` | ink **313.4–353.5** | — | **12 Medium**, `#37383C @0.51`, right-aligned to the 20 gutter |

Chip gap **6**. Label→first chip gap **13.3**. The fade proves the chip rail **scrolls horizontally under a pinned `전체삭제`**.
⚠️ **No per-chip × (remove-one) affordance** in the design.

---

## 6. Screen D — F4: typing

Identical to F3 (recent rail block is 48 tall instead of 50 — 2px Figma drift; the ranking panel
sits 2px higher) plus:
* Field value `밥` — **17 Medium** `#2A2A37`, ink rel x **301.1–314.4** (i.e. right after the 8px gap from the search icon box).
* Caret **1.5 × 28** `#FE7139` at rel x 315, vertically centered on the field.
* Recent/ranking panel is **unchanged while typing** — no suggestion/autocomplete list exists in this design.
* Keyboard still up. So: **query is only submitted on the return key / tapping a chip / tapping a ranking row.**

---

## 7. Screens E/F/G — F5/F6/F7: results

### 7.1 Sticky header — rel y 0–225, bottom hairline `#70737C @0.08` (line.alternative) at rel y 224
= status(50) + tab strip(51) + search row(72) + **filter rail(52)**. The whole block reads as one
pinned header (the hairline runs full-bleed 0→375).

### 7.2 Filter rail — rel y **173–225 (h 52)**, items **32 tall, vertically centered (rel y 179–211)**
Horizontal rail, first item at rel x **20**, gap **6**, last chip overflows the right edge (rel 312–379) ⇒ **scrolls horizontally**, `contentContainer` left inset 20.

| # | item | rel x | w × h | fill | border | label |
|---|---|---|---|---|---|---|
| 1 | sort pill `최신순 ⌄` | 20–90 | 70 × 32, r 16 | **white** | **1px `#70737C @0.16`** | `최신순` 13 SemiBold `#2E2F33 @0.7` at rel x 32.6; chevron-down ink 6.1 × 3.7 centered rel x 56 (≈12–16px icon box), color `#37383C @0.51` |
| 2 | chip `전체` | 96–148 | 52 × 32, r 16 | `#70737C @0.08` | 0.66px `#70737C @0.08` | 13 SemiBold `#2E2F33 @0.7` |
| 3 | chip `CKD 정보` | 154–229 | 75 × 32 | same | same | same |
| 4 | chip `질문·상담` | 235–306 | 71 × 32 | same | same | same |
| 5 | chip `식단인증` | 312–379 (clipped) | 67 × 32 | same | same | same |

Chip horizontal padding = (w − text advance)/2 → **11.0–11.3** for CKD 정보/질문·상담/식단인증;
`전체` is 14.8 ⇒ the chip has a **min-width ≈ 52**.
Border stroke exports as `0.66` with `r 15.67` — that is a 1px inset stroke scaled by Figma; implement as **1px**.

**Selected chip (F6/F7, `전체`)**
* fill **`#FFF4F0 @0.6`** (= primary.primaryWeak) **+ a radial gradient** `#FFEBE4 → white` (center at the chip's bottom-center, rx 46 / ry 38, clipped to the chip) layered inside.
* border **1px `#FE7139`**
* label **13 SemiBold `#FE7139`** (weight does **not** change between states).
* Only **one** chip is selected; the sort pill keeps its white/outline look.

### 7.3 Result rows — flat white sheet, **full-bleed 1px `#70737C @0.08` divider between rows** (no cards, no grey gutter)
Content column: rel x **20 → 355**. With a thumbnail the text column is **20 → 257 (237 wide)**; the thumbnail is **86 × 86, r 8**, at rel x **269–355**.
The thumbnail is **vertically centered on the whole text block** (title+body+meta), i.e. its top is ~6px above the title box.

Six rows in the mock, three anatomies:

**(a) Full row — 168 tall** (badge + tags + title/body + meta + thumb). Offsets from row top:
| element | offset | size |
|---|---|---|
| category badge `질문·상담` | **+8 → +29** | 52 × **21**, r full (10.5), fill `#2E2F33 @0.7`, text **10 SemiBold white**, padding ≈ 7.4 |
| tag chips row | **+37 → +58** | h 21, r full, fill `#70737C @0.08`, text **10 SemiBold** `#2E2F33 @0.7`, padding ≈ 7, **gap 6** — `CKD 정보`(55) `식단 인증`(51) `저염식`(40) `칼륨 낮은 식단`(71) |
| text block | **+72 → +116** | 237 × 44 = 2 lines × **22** |
| ├ title ink | +76.6 → +89.8 | **15 Medium**, `#2A2A37`, 1 line, ellipsis `…` |
| └ body ink | +101.2 → +114.1 | **13 Regular**, `#2E2F33 @0.7`, 1 line, ellipsis `…` |
| meta line ink | **+131.5 → +144.6** | see below |
| thumbnail | +66 → +152 | 86 × 86, r 8 |

**(b) Compact row — 106 tall** (no badge, no tags, **no thumbnail**): text block **+16 → +60** (full width **335**), meta ink **+75.6 → +88.6**, bottom padding ≈ 16.

**(c) Tagged row — 147 tall** (tags + text + meta + thumb): tags **+16 → +37**, text block **+51 → +95**, meta ≈ **+110 → +123**, thumb +45 → +131.

⚠️ Row (a) starts its first element at **+8** while (b)/(c) start at **+16** — a Figma inconsistency.
Recommend normalizing to padding **16 / 16** with gaps badge→tags **8**, tags→text **14**, text→meta **12**.

**Meta line** (all `#37383C @0.51`, both text and icons):
`조회 3,291` (**13 Regular**, one string incl. the space) ┈ gap **12** ┈ [filled heart icon **16×16** (ink 12.3 × 11.1) ┈ gap **2** ┈ `541` 13 Regular] ┈ gap **12** ┈ [filled speech-bubble icon **16×16** (ink 11.9 × 11.8) ┈ gap 2 ┈ `1`] ┈ *flex* ┈ `2시간 전` (**12 Regular**), **right-aligned to the text column** (rel x 355 when there is no thumb, rel x 257 when there is).
⚠️ Author name and the ⋯ (kebab) are **not drawn** in this design.

### 7.4 Sort dropdown (F7)
Popover anchored under the sort pill:
* Card rel x **20–200**, rel y **219–370** → **180 × 151, r 12**, white, **1px `#70737C @0.16`** border.
* Opens **8px below the pill** (pill bottom rel 211 → card top 219), **left edges aligned**.
* Shadow: `offsetY 16, blur stdDeviation 30 (≈ CSS 60), color rgba(0,27,55,0.10)` + `backdrop-filter: blur(11px)` behind the card.
* Three rows, **44 tall each**, first row top ≈ card top + 10: `최신순` (+10→+54), `조회순` (+54→+98), `인기순` (+98→+142); card bottom padding ≈ 9.
* Row label at **rel x 20 from the card left**, **15 Medium**, `#2E2F33 @0.7` — **all three identical**, i.e. the popover does **not** mark which option is active.
* Pressed/hovered row (`조회순` in the mock): rect **174 × 44, r 12**, inset **~3–4px from the card sides**, fill `#70737C @0.08`.
* The rest of the screen is **not dimmed** and the underlying content is fully visible.

---

## 8. Typography table (all letterSpacing 0 — none of the outlines shows tracking)

| # | line | px / weight | color | where |
|---|---|---|---|---|
| T1 | `자유글` (active tab) | 17 **Bold** | `#2A2A37` | tab strip |
| T2 | `레시피` `스토리` | 17 **SemiBold** | `#2E2F33 @0.7` | tab strip |
| T3 | `궁금한 점을 검색해보세요` | 17 **Medium** | `#37383C @0.51` | search placeholder |
| T4 | `밥` | 17 **Medium** | `#2A2A37` | search value |
| T5 | `게시글` | 17 **Bold** | `#2A2A37` | F1 feed section title |
| T6 | `실시간 인기글` `인기 검색어` | 17 **SemiBold** | `#2A2A37` | search-panel section headers |
| T7 | `글쓰기 작성` | 17 **SemiBold** | `#FFFFFF` | FAB |
| T8 | `5분 레시피` etc. | 15 **Medium** | `#2A2A37` | ranking row label |
| T9 | `1` `2` `3` `4` | 15 **Medium** | `#FE7139` | ranking row number |
| T10 | `최근 검색한 내용이 없습니다.` | 15 **Medium** | `#37383C @0.51` | empty recents |
| T11 | post title | 15 **Medium** | `#2A2A37` | result/feed row (lineHeight 22) |
| T12 | `최신순`/`조회순`/`인기순` | 15 **Medium** | `#2E2F33 @0.7` | sort dropdown rows |
| T13 | `최신순` (pill), `전체`, `CKD 정보`, `질문·상담`, `식단인증` | 13 **SemiBold** | `#2E2F33 @0.7` (selected: `#FE7139`) | sort pill + filter chips |
| T14 | post body/summary | 13 **Regular** | `#2E2F33 @0.7` | result row (lineHeight 22) |
| T15 | `조회 3,291` `541` `1` | 13 **Regular** | `#37383C @0.51` | meta counts |
| T16 | `전체 삭제` `자동저장 끄기` | 13 **Regular** | `#37383C @0.51` | auto-save row |
| T17 | `최근 검색어` | 12 **Medium** | `#2A2A37` | recent rail label |
| T18 | `전체삭제` | 12 **Medium** | `#37383C @0.51` | recent rail action |
| T19 | `저염식` `CKD3` `CKD4` | 12 **Medium** | `#2E2F33 @0.7` | recent chips |
| T20 | `2시간 전` | 12 **Regular** | `#37383C @0.51` | meta timestamp |
| T21 | `질문·상담` (badge) | 10 **SemiBold** | `#FFFFFF` | category badge |
| T22 | `CKD 정보` `식단 인증` `저염식` `칼륨 낮은 식단` | 10 **SemiBold** | `#2E2F33 @0.7` | tag chips |
| T23 | 탭바 라벨 `홈…전체` | ≈11–12 | `#37383C @0.51` / active `#2E2F33 @0.7` | bottom tab bar |

Line heights that can be read off the SVG: post title/body **22 each** (44px 2-line box);
ranking/dropdown rows are 44px boxes with vertically centered single lines.

---

## 9. Color table

| hex (+alpha) | v2 semantic (light) | used for |
|---|---|---|
| `#FFFFFF` | background.default | screen/panel/rows, sort pill, dropdown card |
| `#F7F7F7` | background.lower | 8px section band |
| `#F2F4F6` | primitives.grayscale.100 | canvas behind frames; search-field fade (artifact) |
| `#2A2A37` | label.normal | active tab, titles, ranking labels, tab indicator |
| `#2E2F33 @0.7` (`b3`) | label.neutral | inactive tabs, body text, chip labels, **category badge fill** |
| `#2E2F33 @0.88` (`e0`) | ⚠️ **no token** | back chevron only |
| `#37383C @0.51` (`82`) | label.alternative | placeholder, meta line + icons, 전체 삭제/자동저장 끄기, 전체삭제 |
| `#37383C @0.28` (`47`) | label.assistive | section-header chevron, avatar glyph |
| `#37383C @0.16` (`29`) | label.disable | inactive tab-bar icons |
| `#70737C @0.08` (`14`) | fill.normal **and** line.alternative | search field, chips, tag chips, row dividers, pressed dropdown row, header hairline |
| `#70737C @0.16` (`29`) | line.neutral | sort pill border, dropdown card border |
| `#70737C @0.22` (`38`) | line.normal | tab-strip bottom border, `｜` rule in the auto-save row |
| `#FE7139` | primary.primary | rank numbers, caret, selected chip text+border, FAB |
| `#FFF4F0 @0.6` (`99`) | primary.primaryWeak | selected chip fill |
| `#FFEBE4 → #FFFFFF` radial | ⚠️ no token | glow inside the selected chip |
| `#022047 @0.05` (`0d`) | fill.pressed | avatar placeholder background |
| `rgba(0,27,55,0.10)` | ≈ elevation.2 color | dropdown drop shadow |
| `#191F28` | — (iOS chrome) | home indicator |

---

## 10. State machine / interactions

```
F1 자유글 피드
 └─ tap search field ─────────────► F2/F3 검색 레이어 (autofocus, keyboard up, FAB hidden,
                                     tab strip STAYS, back chevron appears, field shrinks 335→311)
F2 (recent = ∅)  ⇄  F3 (recent > 0)      ← same screen, data-driven
F3 ── type ──► F4 (value + brand caret; panel unchanged, NO autocomplete)
F4 ── submit (return key) ───────────────► F5 결과
F3/F4 ── tap recent chip ────────────────► F5 결과 (query = chip)
F3/F4 ── tap ranking row (인기 검색어) ──► F5 결과 (query = keyword)
F3/F4 ── tap ranking row (실시간 인기글) ─► post detail (title → 글)
F2..F4 ── tap section-header chevron ────► "see all" list (인기글 / 인기 검색어)
F3 ── tap 전체삭제 (rail) or 전체 삭제 (row) ─► F2 (empty)
F3 ── tap 자동저장 끄기 ─────────────────► stop persisting recents (copy is a toggle verb; the "on" copy is not drawn)
F2..F4 ── back chevron ──────────────────► F1
F5 ── tap chip ──► F6 (chip = brand tint; only one selected)
F5/F6 ── tap sort pill ──► F7 (popover, 8px below, left-aligned, no scrim, no dim)
F7 ── tap a row ──► popover closes, pill label becomes that option, list re-sorts
```

Observations the frames force:
* Search is a **layer inside the 자유글 tab**, not a pushed full-screen route — the tab strip and the
  bottom tab bar belong to the same screen.
* **Keyboard up** in F2–F4, **down** in F5–F7 ⇒ submit dismisses the keyboard.
* **FAB is hidden** during search input and returns with results.
* No loading/skeleton, no error, no "no results" frame is drawn — those states must be designed by us
  (keep the current implementations; see §12).
* Pressed state that IS drawn: dropdown row = `fill.normal` rounded 12 rect. Nothing else shows press/disabled.
* The dropdown does **not** indicate the current sort — the pill label is the only signal.

---

## 11. v2 mapping

| design element | v2 component + tokens | fit |
|---|---|---|
| 탭 스트립 | `V2Tab` `size="l"` (minHeight **51** ✔, selected `label.mediumStrong` 17 Bold ✔, unselected `label.medium` 17 SemiBold ✔, indicator 2px ✔, bottom border 1px `line.normal` ✔) | **exact**; only the indicator inset differs (design 9, V2Tab fixed 8 / fluid 12) |
| 검색 필드 | `V2SearchField` (h 44 ✔, `radius.lg`=12 ✔, `fill.normal` ✔, icon `md`=24 ✔, paddingHorizontal 10 ✔, gap 8 ✔, `label.mediumWeak` 17 Medium ✔, placeholder `label.alternative` ✔, caret `primary.primary` ✔) | **exact — the design IS V2SearchField**. Only difference: design shows no clear-×; keep V2SearchField's × (it is a real affordance the design forgot). |
| 뒤로 버튼 | `V2IconButton` / `V2Icon name="chevronLeft" size="md"`, color `label.neutral` | color in design is `@0.88`, off-token → use `label.neutral` |
| 최근 검색 칩 | `V2Chip size="s"` is 32 tall; design is **24** → **gap**: add a `size="xs"` (h 24, paddingHorizontal 8, `caption.small`/12 Medium) or accept 32 | gap |
| 필터 칩 | `V2Chip size="s"` (h 32 ✔, `label.xSmall` 13 SemiBold ✔, `radius.full` ✔, unselected `fill.normal` + `label.neutral` ✔) | **dimensions exact**; selected look is a gap (below) |
| 선택된 필터 칩 | design = `primary.primaryWeak` fill + 1px `primary.primary` border + `primary.primary` text. `V2Chip tone="brand"` = solid orange + white; `tone="neutral"` = ink + white. → **gap: add `tone="brandSoft"`** (bg `primary.primaryWeak`, fg `primary.primary`, 1px `primary.primary` border). This is exactly the same face `V2Badge tone="brand" variant="weak"` already uses, so the token pair exists. | gap |
| 정렬 pill | white fill + 1px `line.neutral` + `label.xSmall` + chevronDown. No v2 component has a white/outlined pill (V2Chip is borderless by rule). → **gap: `V2Chip variant="outline"`** or a small `V2SelectButton`. | gap |
| 정렬 드롭다운 | **no anchored-popover component in v2**. House rule (memory: 알림 표면 통일) says a 3-choice picker is a **bottom sheet**. → either (a) implement as `V2BottomSheet` with 3 `V2Option` rows (on-system, recommended) or (b) add `V2Menu` (card `radius.lg`, 1px `line.neutral`, `elevation` with `offsetY 16 / radius 60 / rgba(0,27,55,.1)`, 44px rows, pressed = `fill.normal` r 12). | gap |
| 섹션 헤더 (`실시간 인기글`) | `V2Text` `typography.title.xSmallWeak` (17/23 SemiBold) or `label.medium` (17/21) + `V2Icon chevronRight size="md"` `label.assistive`; row h 44, gutter 20 | ok |
| 랭킹 행 | `V2ListRow` or plain Pressable h 44; number `label.smallWeak` 15 Medium `primary.primary`, width 25; label `label.smallWeak` `label.normal` | ok |
| 빈 상태 문구 | **not** `V2EmptyState` (that draws an icon/title/body block). Design is a single centered `subtext.large` (15 Regular) / `label.smallWeak` (15 Medium) line in a 115px box. Use `V2Text` + a fixed-height centered `View`. | ok |
| 카테고리 배지 (`질문·상담`) | `V2Badge size="sm" tone="neutral" variant="fill"` → bg `label.neutral`, fg `static.white`, `caption.xSmall` 10 SemiBold — **exact color/typo match**. Shape differs: V2Badge uses `radius.sm`(8) + padding 8/2 (h ≈ 19); design is **r full, padding 7, h 21**. | near-exact; needs `radius.full` + h 21 |
| 태그 칩 (`CKD 정보`) | design bg is `fill.normal`; `V2Badge tone="neutral" variant="weak"` uses `label.disable`. → use `V2Badge` with a `fill.normal` surface or the existing `TagChips`, restyled: h 21, r full, `caption.xSmall`, `label.neutral`. | small gap |
| 결과 행 | plain row on `background.default` + `V2Divider` (1px `line.alternative`), **full-bleed** | ok |
| 썸네일 | `expo-image` 86 × 86, `radius.sm` (8) | ok |
| 메타 아이콘 | `V2Icon name="heart"` / `"chat"` at `iconSize.xs`(16), color `label.alternative` — both registry glyphs are **filled**, matching the design | ok |
| FAB | `V2Button` variant primary, h 48 (`controlHeight.lg` ✔), `radius.full` ✔, `label.medium` 17 SemiBold ✔, `primary.primary` ✔ | ok |
| 8px 밴드 | `V2Divider variant="thick"` is **16**; design is **8** → use a plain `View {height:8, backgroundColor: background.lower}` or add a `thin-band` variant | small gap |

### Token gaps / conflicts to flag
1. **12px Medium has no token** (T17/T18/T19). Nearest: `subtext.small` = 12 **Regular**, `caption.small` = 11 Medium, `label.xSmallWeak` = 13 Medium. → Either add `caption.smallStrong = 12 Medium/16` or snap these three lines to `label.xSmallWeak` (13 Medium).
2. **Horizontal gutter is 20 everywhere in this design**, but `layout.GUTTER = 16`. The whole community area already uses 20 in code. → keep 20 and add a `COMMUNITY_GUTTER`/relax the token, but do not mix 16 and 20 on one screen.
3. **lineHeight 22** for the 15px title and the 13px body. v2 has `label.smallWeak` 15/19 and `subtext.medium` 13/18. Using v2 line heights shrinks the 2-line block 44 → 37. Decide once: either accept v2 rhythm (row heights drop ~7px) or add a `post` text pair at /22.
4. **Back chevron `#2E2F33 @0.88`** is off-palette → `label.neutral` (`@0.7`).
5. **Selected-chip radial glow** (`#FFEBE4 → white`) is not expressible with tokens. Drop it; flat `primary.primaryWeak` reads the same at 32px.
6. **Chip border 0.66px** is a Figma export artifact → 1px `borderWidth.thin`.
7. Design's `#70737C @0.08` is simultaneously `fill.normal` and `line.alternative` (same hex). Use `fill.normal` for surfaces, `line.alternative` for the row dividers/hairline so intent stays readable.
8. **Design lacks any loading/error/no-result state.** v2 rule (no ring spinners) still applies — keep `V2Skeleton` for results and `V2ErrorState` for failure.
9. Chip heights in the recent rail are 24/26 in the same row — normalize to 24.
10. Row top padding 8 (badge row) vs 16 (others) — normalize to 16.

---

## 12. Delta vs current implementation

Files: `src/features/recipe/views/CommunitySearchScreen.tsx` (583 L), `src/features/recipe/components/FreePostTab.tsx` (710 L), `src/features/recipe/components/PostListItem.tsx` (265 L).

### 12.1 Already matches
* Search **entry** in the feed is a `Pressable` that navigates, not an input (`FreePostTab` §searchWrap) — same intent as F1.
* Field height 44, `paddingHorizontal 12`, gap 8, magnifier + text — close to the design (radius 14 vs **12**, padding 12 vs **10**, icon 17 vs **24**, font 15 Regular vs **17 Medium**).
* Submit-only search (no per-keystroke query) — matches F4 (no autocomplete panel drawn).
* Empty state = 최근 검색어 + 실시간 인기글 + 인기 검색어, in this order — matches F2/F3.
* Ranking rows: number (brand) + label, `minHeight 44`, gutter 20 — matches §4 except the number is 14 **Bold** width 18 (design: **15 Medium**, column 25) and the label is 14.5 Medium (design **15 Medium**).
* Recent chips are a wrapping pill row with `radius 16`, gap 6 — design uses gap 6 too, but a **single horizontally-scrolling line** with a leading `최근 검색어` label.
* `V2Skeleton` for results loading, `V2ErrorState` for failure, brand caret is implicit via `V2SearchField`… (current screen uses a raw `TextInput`, so `selectionColor` is **not** set → the brand caret in F4 is missing today).

### 12.2 Must change
1. **Structure**: search is currently a separate route (`/community/search`) with its own back+field header and **no community tab strip**. The design keeps 레시피/자유글/스토리 + avatar + the bottom tab bar mounted. → either render the search layer inside `FreePostTab` (state-driven) or make the route render the same tab strip. This is the biggest change; confirm with design before rewiring navigation.
2. **Search field**: swap the hand-rolled `TextInput` for `V2SearchField` (radius 12, padding 10, icon 24, **17 Medium**, `fill.normal`, placeholder `label.alternative`, caret `primary.primary`). Removes the `letterSpacing: -0.3` violation.
3. **Back button**: 24px `chevronLeft`, box at x 12–36, gap 8 to the field (today: gutter 16 + gap 8).
4. **Recent block**: horizontal scroll rail (h 50) with a leading `최근 검색어` **12 Medium** label, chips **h 24 / 12 Medium / padding 7 / r full**, a 26px white fade, and a pinned `전체삭제` (12 Medium, `label.alternative`) — today it is a section header (`최근 검색어` 13.5 SemiBold + `전체 삭제` 12.5 Medium) over a wrapping chip cloud with 32-tall chips.
5. **New row**: `전체 삭제 ｜ 자동저장 끄기` (44 tall, 13 Regular, 1×12 rule at x 77.5) under an 8px `#F7F7F7` band. **`자동저장 끄기` is a new feature** — a toggle that stops persisting recents. `useRecentCommunitySearches` has no such flag today.
6. **Empty recents**: today the recent section is simply hidden when empty. Design shows a **115px block with a centered `최근 검색한 내용이 없습니다.` (15 Medium, `label.alternative`)** and still shows the 전체 삭제/자동저장 row below it.
7. **Section headers**: 17 SemiBold (today 13.5 SemiBold) + a **chevron-right** on both `실시간 인기글` and `인기 검색어` (today: no chevron, no destination). Needs a "see all" target for both.
8. **Ranking rows**: show **4** (today `slice(0,5)` and all popular keywords); number 15 Medium in a 25px column at the gutter (today 14 Bold width 18 + gap 12).
9. **Results header**: add the **filter chip rail + sort pill** above the result list (today the results list has no filters at all — filters live only in the feed). Server support: `useCommunityPostSearch(query)` takes no category/sort params.
10. **Sort control**: design is a pill + popover with `최신순 / 조회순 / 인기순`. Today `FreePostTab` renders three inline text buttons with a 4px dot, right-aligned, and the **search screen has no sort at all**. Per house rule prefer a bottom sheet over the popover (§11).
11. **Filter chips**: 32 tall / r full / 13 SemiBold / gap 6 / selected = brand tint+border+brand text. Today: 36 tall, `radius 10`, padding 14, gap 8, selected = **solid ink fill + white bold text**. Also today the selected label switches Bold — the design keeps SemiBold in both states.
12. **Result row**: today `PostListItem` is a rounded card (r 16, padding 16) on grey with `category · 시간` at the top, a kebab, author name, `eye/heart/chat` **outline** icons at 14, 64×64 r12 thumb. Design: **flat white row + full-bleed hairline**, order **badge → tag chips → title → body → meta**, `조회 N` as a word, **filled** heart/chat at 16, timestamp right-aligned, **86×86 r8** thumb, title **15 Medium/22** (today 15.5 Bold/22), body **13 Regular/22** (today 13.5/20).
13. **Kill all fractional type**: `fontSize: 13.5/12.5/14.5/15.5`, `letterSpacing: -0.24…-0.31` across all three files violate the v2 rule (letterSpacing 0, integer token sizes).
14. **FAB** must be hidden while the search input is focused and visible on the results screen.

### 12.3 Present in code, ABSENT from the design — **preserve, do not delete**
* **Clear (×) button** inside the field when the query is non-empty (`CommunitySearchScreen` + `V2SearchField`).
* **Per-chip × remove** for a single recent keyword (`removeRecentSearch`, with `hapticSelection`).
* `MAX_QUERY_LENGTH = 100` (server contract q ≤ 100).
* **Blocked-user filtering** (`useBlockedUsers` + client-side re-filter after block) and `isWithdrawnAuthor` handling.
* **`isMine` gating of the kebab menu**, the kebab itself (신고 → `/community/report`, 차단 → confirm dialog) — the design draws no kebab but removing it would remove the only report/block path in the list.
* **Author name** in the row footer (design omits it).
* **Result skeleton** (`V2SkeletonGroup`, 4 × 104px) and the **error state with retry** (`V2ErrorState`, `resolveError`) — no ring spinners.
* **No-results empty state** (`community.search.noResultsTitle` / `noResultsBody`).
* **Cursor pagination** (`onEndReached`, `hasNextPage`, footer `V2LoadingState`).
* `keyboardShouldPersistTaps="handled"` + `keyboardDismissMode="on-drag"`, `autoFocus`, `returnKeyType="search"`.
* Tag press → `/community?tag=…`, `PostListItem` tag chips via `TagChips`.
* `singleLineInputText()` usage (house rule: single-line inputs must not carry a lineHeight).
* Adding the submitted keyword to recents on commit; clearing `submitted` when the field is emptied.
* Dark mode: everything currently comes from `useSurface`; the design is light-only. Any rewrite must keep dark mode working via `useV2Theme`.

### 12.4 Unreadable / undecided in the design
* Nothing was illegible — every Korean string above was read at ≥6× zoom and cross-checked against Pretendard metrics.
* Not shown anywhere in this section, so still undesigned: results **loading**, results **error**, **no-results**, the **"on" copy** of `자동저장 끄기`, the destination of the two section-header chevrons, multi-select vs single-select semantics for the filter rail, and 2-digit rank numbers (only 1–4 are drawn).
