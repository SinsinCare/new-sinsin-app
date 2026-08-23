# 인기글 (Community Popular) — pixel spec

Section key: `popular` · canvas region x 100–1810, y 2180–3190 of `slim.svg` (root viewBox `0 0 4831 14968`, 1 unit = 1 px @1x).
Frames: 375 × 932, tops at y = 2226, lefts at x = 141 / 548 / 955 / 1362.
All numbers below are **measured from the SVG source** (px @1x) unless marked *(derived)* or *(recommended)*.

Font-size derivation method (so numbers can be re-checked): Pretendard Hangul advance = 1770/2048 em = **0.86426 em**; font-size = measured syllable advance ÷ 0.86426, cross-checked against full-string ink width rendered from `assets/fonts/Pretendard-*.otf`. Weight derived from vertical-stem width normalised to em (Regular ≈ 0.0754 em, Medium ≈ 0.0927, SemiBold ≈ 0.1093, Bold ≈ 0.1259 — ratios match Pretendard StdVW 182/222/262/302).

---

## 1. Screen inventory

All four frames are **the same screen** (인기글 / Community Popular), same scroll position (list starts flush under the header, no scroll offset), same 5 post cards, same FAB, same global tab bar. Only the selection state differs.

| # | Frame origin (x, y) | Screen | State | Difference vs neighbour |
|---|---|---|---|---|
| A | 141, 2226 | 인기글 | Period tab **실시간** selected, no category chip selected | baseline |
| B | 548, 2226 | 인기글 | Period tab **주간** selected | only the underline moves (rel x 28 → 139.67) and the two labels swap Bold↔SemiBold / `label.normal`↔`label.neutral` |
| C | 955, 2226 | 인기글 | Period tab **월간** selected | underline at rel x 251.33 |
| D | 1362, 2226 | 인기글 | **월간** selected **+ 전체 chip selected** | identical to C except chip 1 (`전체`) becomes brand-tinted (fill `#FFF4F0` @60% + radial gradient + `#FE7139` border + `#FE7139` label) |

A byte-level normalised diff of the four frame subtrees shows **no other differences** — no loading, empty, error, pressed, sheet, keyboard or modal state is drawn anywhere in this section. Card content (titles, counts, timestamps) is identical across periods, i.e. the design does not illustrate per-period content.

---

## 2. Layout spec (one screen, all frames)

### 2.1 Screen frame
- Frame 375 × 932, background `#FFFFFF` (`background.default`).
- Status bar block: y 2226–2276 → **height 50** (notch graphic x 237–420, i.e. 183 wide centred). Treat as `insets.top` (safe area), do not hard-code 50.
- **Header stack is sticky**: a single white rect 375 × **209** at (141, 2226) is painted over the scrolled list. Header = status bar 50 + nav bar 44 + period tabs 51 + chip rail 64 = 209. List content begins at y 2435 (rel 209).
- Horizontal content padding everywhere: **20** (content width 335).

### 2.2 Nav bar — y 2276–2320, height **44**
- No bottom border.
- **Back chevron**: ink bbox x 159.0–169.2 (rel 18.0–28.2), y 2289.1–2306.7 (rel 63.1–80.7), 10.2 × 17.6, fill `#2E2F33` @ 88%. Consistent with a 24 px chevron-left centred in a 44 × 44 touch target flush to the frame's left edge (icon centre rel x 23.1, rel y 71.9 = bar centre).
- **Title** `인기글`: **centred** (ink x 308.67–346.47, centre 327.6 vs frame centre 328.5). Ink y 2291.56–2304.80. Size **15**, **SemiBold**, fill **`black` (#000000)** — the only off-token colour in the section (see §6).
- **Search icon**: ink x 475.0–492.57 (17.58 sq), y 2289.0–2306.58, fill `#2E2F33` @ 70%. = 24 px magnifier, icon-box centre rel x 342.8 → **right inset 20** for a 24 box.

### 2.3 Period tab strip — y 2320–2371, height **51**
- Bottom border 1 px `#70737C` @ 22% (`line.normal`), drawn inside at y 2370–2371.
- 3 equal cells over the padded content width: cell = (375 − 40)/3 = **111.67**, first cell starts rel x 20.
- Labels centred in the cell, ink y 2338.42–2353.56 (cell centre 2345.5). Size **17**.
  - selected: **Bold**, `#2A2A37` (`label.normal`)
  - unselected: **SemiBold**, `#2E2F33` @70% (`label.neutral`)
- Copy: `실시간` · `주간` · `월간`
- **Indicator**: rect **96 × 2**, `rx 1`, fill `#2A2A37`, y 2369–2371 (flush to the strip bottom, painted over the divider). Rel x: 28 / 139.67 / 251.33 → centred in its cell with an **8 px inset each side** (111.67 − 2×8 = 95.67 ≈ 96).

### 2.4 Category chip rail — y 2371–2435, height **64**
- Bottom border 1 px `#70737C` @ 8% (`line.alternative`), y 2434–2435.
- Chips: height **32**, `rx 16` (pill), vertical padding 16 top / 16 bottom, first chip x 161 (rel 20), **gap 6**.
- Unselected chip: fill `#70737C` @ 8% (`fill.normal`) + a 0.66 px inside stroke `#70737C` @ 8%. Label size **13**, **SemiBold**, `#2E2F33` @70%.
- Chip widths / labels (measured): `전체` 52 · `식당 인증` 71 · `질문·상담` 71 · `식당 추천` 71 · `CKD 정보` 75 (clipped by the frame right edge → the rail scrolls horizontally).
  - Horizontal padding is **~11.5–12** for chips 2–5; `전체` is ~14.8 (i.e. it looks like a min-width/hand-tweak). Use **paddingHorizontal 12** everywhere.
- **Selected chip (frame D only)**: fill `#FFF4F0` @ 60% (`primary.primaryWeak`), plus a decorative radial gradient ellipse (`cx` rel 20, `cy` chip-top +22, rx 46 ry 38, `#FFEBE4` → `white`) clipped to the pill; border 0.66 px `#FE7139` (100%); label `#FE7139`, same 13 SemiBold. The gradient is cosmetic — a flat `primaryWeak` fill is visually equivalent.

### 2.5 Post list — full-bleed rows, 1 px `#70737C` @ 8% bottom divider per row
Row bounds (absolute y): 2435–2606 (171) · 2606–2785 (179) · 2785–2923 (138) · 2923–3102 (179) · 3102–3252 (150, clipped).

Four card variants are shown:
| card | rank | category badge | tags | thumbnail | height |
|---|---|---|---|---|---|
| 1 | ● | ● | ● | ● | 171 (top padding 8 — see note) |
| 2 | ● | – | ● | ● | 179 |
| 3 | ● | – | – | – | 138 |
| 4 | ● | ● | ● | ● | 179 |

**Canonical vertical rhythm (relative to row top; card 2/4):**
| element | rel y | size |
|---|---|---|
| padding-top | 0 → 16 | |
| rank circle (+ badge, same row) | 16 → 40 | 24 |
| gap | 40 → 48 | 8 |
| tag pill row | 48 → 69 | 21 |
| gap | 69 → 83 | 14 |
| title line box | 83 → 105 | lh 22 |
| excerpt line box | 105 → 127 | lh 22 (ink 107.2–120.5) |
| gap | 127 → 139 | 12 |
| meta row (lh 18) | 139 → 157 | ink 142.2–153.1 |
| padding-bottom | 157 → 179 | 16 (from meta box bottom) |
| thumbnail | 77 → 163 | 86, bottom-aligned to the content box |

Card 3 (no badge/tags): rank 16→40, copy block 48→92, meta ink 107→120.6, height 138 — i.e. the same rhythm with the tag row removed and the rank→copy gap = 8.
Card 1: identical to card 4 but **shifted up 8 px** (rank at rel 8, height 171). Its top padding is 8, not 16. Treat as a Figma slip; **use 16**.

**Row internals (absolute x, card 1 as reference):**
- **Rank circle**: x 161–185 (rel 20), 24 × 24, `r 12`, fill `#FFF4F0` @ 60% (`primary.primaryWeak` = `surfaceBrand`). Digit centred, size **13**, **SemiBold**, `#FE7139`.
- **Category badge**: x 191–243 (gap **6** after the circle), y 2444.5–2465.5 → **52 × 21**, `r 10.5` (pill), fill `#2E2F33` @ 70% (`label.neutral`). Label `질문·상담`, size **10**, **SemiBold**, `#FFFFFF`, horizontal padding **~8** (ink 198.71–235.49). Vertically centred on the rank circle.
- **Tag pills**: y 2475–2496 → **21 tall**, `r 10.5` (pill), fill `#70737C` @ 8% (`fill.normal`), gap **6**, starting x 161.
  Widths / copy: `CKD 정보` 55 · `식단 인증` 51 · `저염식` 40 · `칼륨 낮은 식단` 71. Label size **10**, **SemiBold**, `#2E2F33` @70%, horizontal padding **~7**.
- **Copy block**: white text container 237 × 44 at (161, 2510) when a thumbnail exists; **335 × 44** at (161, 2833) when it does not.
  - **Title**: 1 line, truncated with `…` (three dots). Size **15**, **Medium**, `#2A2A37` (`label.normal`), line-height **22**, letterSpacing 0. Copy: `오늘의 점심 식단 저염식으로 만든 든든…` (card 3, full width: `오늘의 점심 식단 저염식으로 만든 든든한 한끼 식단 공…`). Baseline measured at y 2527.5.
  - **Excerpt**: 1 line, truncated. Size **13**, **Regular**, `#2E2F33` @70% (`label.neutral`), line-height ≈ **20–22** (measured baseline delta title→excerpt = **22.8**). Copy: `칼륨 수치가 높아 식단 조절 중인데, 오늘은…` (card 3: `…오늘은 저염식 위주로 구성해…`).
- **Meta row** (all `#37383C` @ 51% = `label.alternative` for text; icons `#37383C` @ 51% inside a `g opacity=0.6` → effective **≈ 31%** ≈ `label.assistive`):
  | item | ink x | size |
  |---|---|---|
  | `조회 3,291` | 161.46–218.81 | 13 Regular |
  | heart icon | 233.86–246.14 (12.28 × 11.05) | 14 px icon box *(derived)* |
  | `541` | 249.88–268.86 | 13 Regular |
  | comment icon | 284.08–295.97 (11.89 × 11.83) | 14 px icon box *(derived)* |
  | `1` | 299.67–303.11 | 13 Regular |
  | `2시간 전` | 356.79–396.15 | **12** Regular |
  Gaps: label→number inside a stat ≈ 5 (`조회`/number), icon→number ≈ 4, stat→stat ≈ 12–13, timestamp right-aligned at x 396 (= 398 = the 237-wide column's right edge).
  **Inconsistency:** in card 3 (no thumbnail, copy runs to x 494) the meta row still ends at x 396.1 — the meta component keeps a fixed 237 width. Recommend right-aligning the timestamp to the actual column instead (what the current code does).
- **Thumbnail**: `rect 86 × 86, rx 8` at x 410 (right inset **20**), gap **12** from the copy column (161 + 237 = 398 → 410). Bottom-aligned with the row's content box. Image fill (Figma pattern) — corner radius 8.

### 2.6 FAB — `글쓰기 작성`
- Pill path x **374–496**, y **3012–3060** → **122 × 48**, `r 24` (pill), fill **`#FE7139`**, no shadow/stroke in the SVG.
- Right inset **20**; bottom edge sits **14 px above the tab bar top** (3060 → 3074), i.e. 98 above the frame bottom.
- Label centred (ink x 396.8–472.2, y 3029–3044): size **17**, **SemiBold**, `#FFFFFF`, horizontal padding ≈ 22. **No leading icon in the design.**

### 2.7 Global tab bar (shared component, recorded for completeness)
- Surface y 3074–3158 (**84** = `barHeight.tabBarSafe`), white, top corners `r 24`, 1 px top border `#70737C` @ 8%, backdrop blur (`data-figma-bg-blur-radius` 32 / 40) behind it.
- 5 items, centres at rel x 53.5 / 120.9 / 187.5 / 254.9 / 321.6 (spacing **67**, i.e. 335 content width / 5, 20 side padding).
- Icons 20 × 20 at rel y 858–878; labels ≈ 10 px at rel y 886–896. Copy: `홈 · 상담 · 레시피 · 식당 · 전체`. Active item (`레시피`) `#2E2F33` @70%, inactive `#37383C` @16%.
- Home-indicator zone: white rect 375 × 33 at y 3125; indicator `134 × 5, r 2.5`, `#191F28`, at (261, 3145).

---

## 3. Typography table

| Line / element | size | weight (face) | lineHeight | colour | v2 token |
|---|---|---|---|---|---|
| Nav title `인기글` | 15 | SemiBold | – (bar 44) | `#000000` ⚠ | `label.small` (+ colour → `label.normal`) |
| Period tab, selected `실시간` | 17 | Bold | – (strip 51) | `#2A2A37` | `label.mediumStrong` |
| Period tab, unselected `주간`/`월간` | 17 | SemiBold | – | `#2E2F33` @70% | `label.medium` |
| Category chip label | 13 | SemiBold | – (chip 32) | `#2E2F33` @70% (sel. `#FE7139`) | `label.xSmall` |
| Rank digit `1`…`4` | 13 | SemiBold | – (circle 24) | `#FE7139` | `label.xSmall` |
| Category badge `질문·상담` | 10 | SemiBold | – (pill 21) | `#FFFFFF` | `caption.xSmall` |
| Tag pill `CKD 정보` … | 10 | SemiBold | – (pill 21) | `#2E2F33` @70% | `caption.xSmall` |
| Card title | 15 | **Medium** | 22 | `#2A2A37` | `label.smallWeak` (lh 19 ≠ 22) |
| Card excerpt | 13 | Regular | ≈20–22 | `#2E2F33` @70% | `body.xSmall` (13/20) |
| Meta stats `조회 3,291` `541` `1` | 13 | Regular | 18 | `#37383C` @51% | `subtext.medium` (13/18) ✔ exact |
| Meta timestamp `2시간 전` | **12** | Regular | 16 | `#37383C` @51% | `subtext.small` (12/16) ✔ exact |
| FAB label `글쓰기 작성` | 17 | SemiBold | – (pill 48) | `#FFFFFF` | `label.medium` |
| Tab-bar labels | ≈10 | Medium/SemiBold | – | active `#2E2F33`@70% / inactive `#37383C`@16% | (shared component) |

letterSpacing is **0** everywhere (verified: predicted vs measured string ink widths agree within 0.3 px with 0 tracking).

---

## 4. Colour table

| Hex + alpha | Composite over white | Used by | v2 token |
|---|---|---|---|
| `#FFFFFF` | – | screen bg, nav/tab/chip header bg, tab bar, card bg | `background.default` |
| `#2A2A37` 100% | `#2A2A37` | card title, selected tab label, tab indicator | `label.normal` |
| `#2E2F33` 70% (`b3`) | `#8C8D90` | excerpt, chip label, tag label, unselected tab label, badge **fill**, search icon | `label.neutral` |
| `#2E2F33` 88% | – | back chevron | (≈ `label.normal`) |
| `#37383C` 51% (`82`) | `#999A9C` | meta text | `label.alternative` |
| `#37383C` ≈31% (51% × g-opacity 0.6) | `#C2C2C3` | heart / comment icons | ≈ `label.assistive` (`#37383c47`) |
| `#70737C` 8% (`14`) | `#F2F3F4` | tag pill fill, chip fill, chip rail bottom border, card dividers, tab-bar top border | `fill.normal` / `line.alternative` |
| `#70737C` 22% (`38`) | `#D5D6D8` | tab strip bottom border | `line.normal` |
| `#FE7139` 100% | – | rank digit, FAB fill, selected chip border + label | `primary.primary` |
| `#FFF4F0` 60% (`99`) | `#FFF8F5` | rank circle fill, selected chip fill | `primary.primaryWeak` / `surfaceBrand` |
| `#FFEBE4` → `white` radial | – | decorative glow inside the selected chip | (none — drop it) |
| `#000000` | – | nav title ⚠ off-token | should be `label.normal` |
| `#191F28` | – | home indicator | (system) |

---

## 5. State machine / interactions

- **Period tabs (실시간 / 주간 / 월간)** — a 3-way exclusive selector inside the sticky header. Selecting moves the 96 × 2 underline to the tapped cell and swaps that label to Bold/`label.normal` while the previous one returns to SemiBold/`label.neutral`. No animation is specified; slide the indicator. The list content is redrawn (frames B/C show identical mock data, so nothing about per-period content can be inferred).
- **Category chip rail** — horizontally scrollable, single-select. Frames A–C show *no* chip selected (`전체` sits in the unselected style); frame D shows `전체` selected. So "no selection" and "전체 selected" are **distinct visual states** in the design; in the current code `전체` is `category === null` and is always selected at rest. Decide: either (a) make `전체` selected by default (then frames A–C are simply "the designer forgot"), or (b) allow a no-filter state distinct from `전체`. **(a) is recommended** — a rail with nothing selected reads as broken.
- **Selected chip look** = brand tint fill + 1 px brand border + brand label (never a solid brand fill). Unselected keeps its 8 % grey fill and a near-invisible 8 % border, so the pill never changes size when selected.
- **Rows** — whole row is one tap target → post detail. No pressed state drawn (use the existing `opacity 0.66` / `SurfacePressable`).
- **Rank badge** — decorative, always present, 1…N; the badge and tag pills are optional per post (cards 2/3 prove both can be absent). A post with neither badge nor tags collapses the row to 138 px.
- **Thumbnail optional** — absence widens the copy column from 237 to 335 (card 3).
- **Search icon** → community search screen. **Back** → pop.
- **FAB** → write. It floats above the list and over the tab bar's blur; it does not hide on scroll in any frame.
- **Not drawn anywhere in this section:** loading skeletons, empty state, error state, refresh spinner, sheet, modal, keyboard, pressed/disabled variants. Everything the current code has for those must be preserved as-is.

---

## 6. v2 mapping

| Design element | v2 component + tokens | fit |
|---|---|---|
| Header stack (status+nav) | `V2ScreenHeader` `os="ios"` (bar = `barHeight.appBarIOS` 44 ✔), title = `typography.label.small` (15 SemiBold ✔), back = `V2Icon chevronLeft size="md"` in a 44 touch target ✔ | **gap: title alignment.** `V2ScreenHeader` deliberately left-aligns the title ("Toss style"); the design **centres** it. Smallest addition: `titleAlign?: "leading" \| "center"` (default `leading`). Otherwise the on-system choice is to keep it left-aligned and flag the design. |
| Search action | `V2IconButton` (24 icon) in the header `right` slot; design's icon centre is 20 from the right edge — `V2ScreenHeader` pads 4 + 44 touch target → centre 26 from the right, ~6 px off. Acceptable; do not hand-position. |
| Period tabs | **`V2Tab size="l" alignment="fixed"`** — exact match: minHeight 51 ✔, selected `label.mediumStrong` 17 Bold ✔, unselected `label.medium` 17 SemiBold ✔, indicator `label.normal` 2 px with inset `spacing[8]` ✔, frame border `line.normal` ✔. **Wrap it with `paddingHorizontal: 20`** so the cells are 111.67 and the indicator lands at 96 (default full-bleed gives cells 125 / indicator 109). |
| Category rail | `V2Chip size="s"` (height 32 = `controlHeight.sm` ✔, `paddingHorizontal spacing[12]` ✔, `label.xSmall` 13 SemiBold ✔, `radius.full` ✔, unselected `fill.normal` + `label.neutral` ✔). Rail: horizontal `ScrollView`, `paddingHorizontal 20`, `paddingVertical 16`, **`gap 6`** (`spacing[6]` ✔). | **gap: selected style.** `V2Chip` selected = solid `primary.primary` (brand) or solid `label.normal` (neutral). The design wants a *tinted* selected chip. Smallest addition: `tone="brandWeak"` (or `variant="tinted"`) → `bg primary.primaryWeak`, `border 1px primary.primary`, `fg primary.primary`. |
| Rank badge | `View` 24×24 `radius.full`, bg `surfaceBrand`/`primary.primaryWeak`, text `label.xSmall` (13 SemiBold) `primary.primary`. No v2 component needed (or `V2Badge` cannot do a fixed circle). |
| Category badge | `V2Badge size="xs" color="neutral" variant="fill"` → `caption.xSmall` 10 SemiBold on `label.neutral` with white text ✔ exact colours/type. **gap: radius.** `V2Badge.xs` uses `radius.sm` (8); the design is a pill (10.5 = height/2). Smallest addition: allow `radius.full` on `V2Badge` (e.g. `shape?: "rounded" \| "pill"`). Height: v2 gives 10·1.5 lh + 2+2 padding = 19 vs design 21 → add `paddingVertical spacing[4]` for this size or accept 19. |
| Tag pills | same as above but `variant="weak"`-ish: bg `fill.normal`, fg `label.neutral`, 10 SemiBold, pill. `V2Badge color="neutral" variant="weak"` uses `label.disable` bg — **not** `fill.normal`; either extend the map or build a 5-line local `TagPill`. Row: `flexDirection row`, `gap 6`, wrap. |
| Card title | `V2Text` with `typography.label.smallWeak` (15 Medium) — **lineHeight is 19, design is 22**. Either accept 19 or add `label.smallWeakRelaxed` (15/22). Colour `label.normal`. `numberOfLines={1}`. |
| Card excerpt | `typography.body.xSmall` (13 Regular / 20) — design ≈ 22. Colour `label.neutral`. `numberOfLines={1}`. |
| Meta stats | `typography.subtext.medium` (13 Regular / 18) ✔ exact, colour `label.alternative`. Icons: `V2Icon` at 14 — **`iconSize` has no 14** (xs = 16). Either use `xs` 16 (2 px larger than the design) or add `iconSize.xxs = 14`. Icon colour `label.assistive`. |
| Meta timestamp | `typography.subtext.small` (12/16) ✔ exact, `marginLeft: "auto"`. |
| Thumbnail | `expo-image` 86×86, `radius.sm` (8) ✔, aligned to the content bottom. |
| Row divider | `V2Divider` / `borderBottomWidth: StyleSheet.hairlineWidth`, `line.alternative` ✔. |
| FAB | `V2Button`-shaped pill: height 48 (`controlHeight.lg` ✔), `radius.full` ✔, bg `primary.primary` ✔, label `label.medium` (17 SemiBold ✔) on `static.white`. The app's `FloatingWriteButton` is the real owner — see §7. |
| Tab bar | existing `V2TabBar` (84 = `barHeight.tabBarSafe` ✔). Nothing to change. |

**v2 rule conflicts found in the design**
1. Nav title is pure `#000000` → use `label.normal` (`#2A2A37`).
2. Selected-chip radial gradient → not expressible with tokens and not needed; use a flat `primary.primaryWeak`.
3. Chip / pill strokes are `0.66 px` → use `StyleSheet.hairlineWidth` (or `borderWidth.thin` 1).
4. Card title/excerpt line-heights (22) are off the v2 ladder (19 / 20). Flagged above.
5. Card 1's 8 px top padding contradicts the other three cards' 16 → use 16.
6. Chip `전체` is ~3 px wider than its content implies → use uniform `paddingHorizontal 12`.
7. Meta row keeps a fixed 237 width even in a full-width card → right-align the timestamp to the real column instead.

---

## 7. Delta vs current implementation

Files: `src/features/recipe/views/CommunityPopularScreen.tsx` (screen + bespoke row renderer), `src/shared/components/FloatingWriteButton.tsx` (FAB).
The row here is **not** `PostListItem.tsx` — the popular screen renders its own `renderPost`.

### Already matches
- Screen skeleton: fixed header + fixed period row + fixed horizontal chip rail + `FlashList` + floating write button. Sticky-header structure is right.
- Copy and i18n keys: `community.popular.title` `인기글`, `realtime/week/month` = `실시간/주간/월간`, `community.popular.all` = `전체`, `community.postDetail.viewCount` = `조회 {{count}}`, `formatTimeAgo` → `2시간 전`.
- Chip selected semantics: `surfaceBrand` background + `surface.brand` border + `surface.brand` label — matches the design's tinted-selected exactly (only the border width/gradient differ).
- Rank badge: 24 / radius 12 / `surfaceBrand` bg / `brand` text ✔; `minWidth: 24` handles 2-digit ranks (design only shows 1 digit — keep it).
- Category-badge and tag pill *shapes* (pill, ~21–22 tall) are within a pixel.
- Thumbnail on the right of the copy column with `gap: 12` ✔.
- Timestamp `marginLeft: "auto"` ✔ (better than the design's fixed 237 meta row).
- `paddingHorizontal: 20` on rows and rail ✔.

### Must change
| Where | Now | Design |
|---|---|---|
| `styles.header.height` | 54 | **44** (iOS) — or use `V2ScreenHeader` |
| `styles.headerTitle` | 17 / Bold / `fontWeight:"700"` | **15 SemiBold**, and it is **centred** (currently `space-between` puts it in the middle only by accident of equal side widths — with a 2-digit locale it drifts; make it explicitly centred) |
| header search icon | `Ionicons search 22` | **24** |
| `styles.periodRow.height` | 52 | **51** |
| period cells | `flex:1` full-bleed (cell 125) | row has **paddingHorizontal 20** → cell 111.67 |
| `styles.periodText` | 14 SemiBold both states | **17**; selected **Bold** `label.normal`, unselected **SemiBold** `label.neutral` |
| `styles.periodIndicator` | `left/right: 24` → 77 wide | inset **8** → **96 wide**, `height 2`, `radius 1` ✔ |
| `categoryRail.paddingVertical` | 14 | **16** |
| `categoryRail.gap` | 8 | **6** |
| `categoryChip.paddingHorizontal` | 13 | **12** |
| `categoryText` | 12.5 / Medium / `letterSpacing` implicit | **13 SemiBold**, letterSpacing 0 |
| unselected chip border | `transparent` | hairline `#70737C` @8% (optional, near-invisible) |
| `rankRow.paddingVertical` | 14 | **16** |
| `rankRow.gap` | 8 (uniform) | rank→tags **8**, tags→copy **14**, copy→meta **12** |
| `rankText` | 13 **Bold** | 13 **SemiBold** |
| `categoryBadge` | h 22, r 11, padH 9, bg `surface.textMuted` (`label.alternative`) | h **21**, r 10.5 (pill), padH **8**, bg **`label.neutral`** (darker than now) |
| `categoryBadgeText` | 10.5 SemiBold | **10** SemiBold |
| `tags.gap` | 5 | **6** |
| `tag` | h 22, r 11, padH 8, bg `surface.surface` | h **21**, pill, padH **7**, bg **`fill.normal`** (`#70737C` 8%) |
| `tagText` | 10.5 **Regular**, `surface.text` | **10 SemiBold**, `label.neutral` |
| `title` | 15 **SemiBold**, lh 21, **letterSpacing −0.3**, `numberOfLines={2}` | 15 **Medium**, lh **22**, **letterSpacing 0** (v2 rule), **`numberOfLines={1}`** (every card in the design truncates on line 1) |
| `summary` | 12.5 Regular, lh 18, **letterSpacing −0.25** | **13** Regular, lh ~20–22, **letterSpacing 0** |
| `postCopy.gap` | 4 | 0 between title and excerpt (line boxes are contiguous, baseline delta 22.8); 12 before the meta row |
| `thumbnail` | 78 × 78, radius 10 | **86 × 86, radius 8**, bottom-aligned to the content box |
| `metrics.gap` | 4 uniform | 4 inside a stat, **12–13** between stats |
| `metric` | 11.5 | **13** |
| `metricTime` | 11.5 | **12** |
| meta icons | `heart 12`, `chatbubble 11`, colour `surface.text` (`label.neutral`) | **14 / 14**, colour ≈ `label.assistive` (much lighter than the numbers) |
| meta text colour | `surface.text` (`label.neutral`, 70%) | **`label.alternative`** (51%) |
| FAB (`FloatingWriteButton`) | h **44**, padL 12 / padR 16, `Ionicons add 18` + label **14 SemiBold**, stacked above the AI-상담 pill | h **48**, padH ~22, **no icon**, label **17 SemiBold**, right 20, 14 above the tab bar |
| FAB copy | `community.popular.write` = `글쓰기` | design shows **`글쓰기 작성`** — product decision, do not change the string silently |
| nav title colour | `surface.textStrong` | design's `#000000` is off-token; **keep `textStrong`** |

### Present in code, absent from the design — **PRESERVE**
1. **Blocked-author filtering** (`useBlockedUsers` + client-side `visiblePosts` filter with the `isWithdrawnAuthor` exception) — the one-beat gap before the server refetch.
2. **Pull-to-refresh** (`useRefreshable`, `COMMUNITY_POPULAR_REFRESH`) and **`useRevalidateOnReturn`**.
3. **Loading skeleton** — `V2SkeletonGroup` with 5 × `V2Skeleton height 104 radius="xl"` (no ring spinner — house rule). The design draws no loading state; do not delete this.
4. **Error state** — `PopularErrorState` → `V2ErrorState surface="community_popular" tone="quiet"`, message from `resolveError`, retry only when `resolved.retryable`. The rule "an error must not render as an empty state" is deliberate.
5. **Empty state** — `community.popular.empty` (`아직 인기글이 없어요`).
6. **i18n** — every string goes through `t()`; the design's Korean is the ko value only.
7. **The real category taxonomy** — `FREE_POST_CATEGORIES` = 식단 / 수치 변화 / 증상 고민 / 약물 / 외식 후기 / 일상 공감. The design's chips (`식당 인증`, `질문·상담`, `식당 추천`, `CKD 정보`) are **mock labels that do not exist in the app**; do not rewrite the taxonomy from this mock.
8. **`rankBadge.minWidth: 24`** (2-digit ranks), `item.rank ?? 0`, `item.tags.slice(0, 4)` (the design shows exactly 4 tags — the slice is what produces that).
9. **`FlashList` config** — `maintainVisibleContentPosition: { disabled: true }`, `contentContainerStyle.paddingBottom = 180 + insets.bottom` (clears both the FAB and the AI pill), `keyExtractor`.
10. **Accessibility** — `accessibilityRole="button"`, `accessibilityLabel={item.title}`, `accessibilityState={{ selected }}` on tabs and chips, `hitSlop` on the header buttons.
11. **The global AI-상담 pill stack** (`floatingAiButtonBottomInScreen` + `FLOATING_AI_BUTTON_HEIGHT` + `STACK_GAP`) — the design draws the FAB 14 px above the tab bar with no AI pill underneath. If you hard-code the design's offset you will bury the write button behind the pill again (it already happened 2026-08-19). Keep the stacking arithmetic; only the pill's size/label/typography change.
12. **`lineBreakStrategyIOS="hangul-word"`** on the title, and `SurfacePressable` press feedback (`pressScale`, `pressedColor`).
