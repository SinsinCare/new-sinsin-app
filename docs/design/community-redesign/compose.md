# `compose` — 자유글 게시물 작성 (글쓰기 폼 + 카테고리 시트 + 사진 피커)

Region on canvas: x 100–4260, y 8570–9560. Section header: **"자유글- 게시물 작성"**.
All numbers below are **measured from the SVG** (path/rect bbox, Bézier-flattened) in **@1x px**.
Font sizes are solved against the real Pretendard OTFs (`assets/fonts/Pretendard-*.otf`) by
rendering each string and matching ink width/height — they are measurements, not guesses.

Canvas geometry facts used throughout:

- 10 phone frames, all `375 × 902`, all at `y = 8618`, white background
  (`<rect width="375" height="902" transform="translate(<x> 8618)" fill="white"/>`).
- Frame x: `141, 548, 955, 1362, 1769, 2176, 2583, 2990, 3397, 3804` (pitch 407, gap 32).
- **Frame-local coordinate = absolute − (frameX, 8618).** Every local number below uses this.
- Every frame contains a `375 × 50` white rect at local y 0 (**status bar band = 50**) and a
  `375 × 94` white rect at local y 0 (**status bar + nav bar = 94 ⇒ nav bar height 44**).
- Every frame contains a `375 × 76` white rect at local y 826 (**bottom CTA bar = 56 button + 20 bottom inset**).

---

## 1. Screen inventory

| # | Frame x | Local origin | Screen | State |
|---|---------|--------------|--------|-------|
| F1 | 141 | (141, 8618) | 글쓰기 (compose form) | **Empty / pristine.** No photos, category = placeholder, title empty, tag empty, body empty (`0/ 700`), 등록 **disabled**. NOTE: everything from the photo tile down is **2px lower** than in F2–F10 (tile at local y 116 instead of 114) — Figma sloppiness, not a design decision. Use F2–F10 numbers. |
| F2 | 548 | (548, 8618) | 글쓰기 + **카테고리 바텀시트 열림** | Scrim `#171719` @20 % over the whole frame; floating sheet card. `질문·상담` pre-selected. Sheet CTA `다음` (brand, enabled). Underlying form still shows the *placeholder* in the category field (i.e. the sheet is showing a pending choice, not yet committed). |
| F3 | 955 | (955, 8618) | 글쓰기 | **Category chosen + title typed.** Category = `질문·상담` (value colour, not placeholder), 제목 = `칼륨 수치가 올라갔는데 어떤 음식이 좋을까요?`, tag placeholder, body empty. 등록 still **disabled**. |
| F4 | 1362 | (1362, 8618) | 글쓰기 | **Tag being typed.** Identical to F3 except the tag field holds the raw draft text `저단백` (value colour) and **no chip row exists yet**. 등록 disabled. |
| F5 | 1769 | (1769, 8618) | 글쓰기 | **Tags committed to chips.** Tag field is back to placeholder; a **horizontally-scrolling chip row** appears under it: `저단백 ×`, `저염식 ×`, `간단 ×`, `점심식 ×`, `레시…`(5th chip clipped by the frame edge). Body still empty (`0/ 700`). 등록 disabled. Content below the chip row shifts down by exactly **56 px**. |
| F6 | 2176 | (2176, 8618) | 글쓰기 | **Body filled → CTA enabled.** Same as F5 plus 6 lines of body copy, counter `145/ 700`, 등록 **enabled** (brand fill, white label). |
| F7 | 2583 | (2583, 8618) | 글쓰기 | **Byte-for-byte duplicate of F6** (diffed every rect/path after normalising x; only the gradient `id` differs). Treat as a redundant copy — no extra state. |
| F8 | 2990 | (2990, 8618) | **사진 피커 — 최근항목** | Grid picker, album menu **closed** (`최근항목 ›`). One asset selected → orange badge `1` on row 1 / col 2. Bottom CTA `등록` **enabled**. |
| F9 | 3397 | (3397, 8618) | **사진 피커 — 최근항목** | Same as F8 but the **album dropdown is open** (`최근항목 ⌄`): a 180×152 floating menu with `최근 항목 / 비디오 / 즐겨찾기`. No scrim — only the menu's drop shadow + backdrop-blur. |
| F10 | 3804 | (3804, 8618) | 글쓰기 | **Photos attached.** Same as F6/F7 plus a horizontal photo rail: the `사진/영상` add-tile followed by **3 attached photos**, each with a circular `×` remove badge at its top-right; the 3rd photo runs off the frame edge (rail scrolls). Everything else identical to F6. |

Duplicate/near-duplicate map: F6 ≡ F7. F3→F4 differ only by the tag field content. F5→F6 differ only by body text + CTA enablement. F6→F10 differ only by the photo rail. F8→F9 differ only by chevron direction + the open menu.

---

## 2. Layout spec

### 2.0 Shared chrome (all 8 compose frames + both picker frames)

| Element | Geometry (local) | Fill / notes |
|---|---|---|
| Status bar band | 0 → 50, full width | white. `9:41` glyphs ink at y 17.2–28.3. Treat as `insets.top`. |
| Nav bar | 50 → 94, height **44**, full width | white |
| Back chevron | glyph ink x **18.0 → 27.9** (w 9.9), y **63.2 → 80.7** (h 17.5); centre (23.0, 71.9) | `#2E2F33` @ **0.88**. Nominal 24×24 icon box ⇒ box ≈ x 11–35. |
| Nav title | ink w 37.0 × h 13.2, centred: ink x 167.4 → 204.4, centre x **185.9** (frame centre 187.5), y 65.6 → 78.8 | `black` (#000000). **Centre-aligned** — see §6 conflict. |
| Bottom fade | full width, y **790 → 826** (h 36) | `linearGradient` vertical, `white @0` → `white @1`. Sits directly on top of the scroll content. |
| Bottom CTA bar | full width, y **826 → 902** (h 76) | white; contains the button + 20 px bottom inset. `paddingTop: 0`. |
| Primary CTA | x **20 → 355** (w 335), y **826 → 882** (h **56**), radius **16** | Enabled: `#FE7139`, label white. Disabled: white base + `#07194C` @ **5 %** overlay, label `#2E2F33` @0.88 × extra `opacity .3` (≈ 26 % ink). |
| CTA label `등록` | ink w 28.4 × h 14.7, centred in the button (centre x 187.5, ink y 847.3–862.0) | **17 px semibold** |

Safe-area assumptions: top inset = 50 in the mock (drawn as an iPhone status band); bottom inset = 20
(there is **no** home-indicator layer in the frames — the 20 px is the CTA bar's own bottom padding).
Implement as `insets.top` for the header and `Math.max(insets.bottom, 20)` for the CTA bar.

### 2.1 글쓰기 form — vertical rhythm (canonical = F2…F10; F1 is +2 from y 114 down)

| y (local) | Block |
|---|---|
| 94 | content / scroll top |
| **114 → 214** | photo rail (tile 100×100) |
| 231.4 → 249.4 | `카테고리 (선택)` label line box (13/18); **ink 233.7 → 245.1** |
| **254 → 308** | category select field (335 × 54) |
| 341.4 → 359.4 | `제목*` label line box; **ink 343.7 → 355.1** |
| **364 → 418** | 제목 input (335 × 54) |
| 451.4 → 469.4 | `태그 (선택)` label line box; **ink 453.7 → 465.1** |
| **474 → 528** | 태그 input (335 × 54) |
| *(only when chips exist)* **544 → 576** | tag chip rail (h 32) |
| 552.4 → 570.4 / **608.4 → 626.4** | `설명 작성*` label line box; ink 555.7 / **611.7** |
| **582 → 768** / **638 → 824** | body text area (335 × **186**) |
| 741.4 / **795.4** → +11 | character counter ink (bottom-right inside the text area) |
| 790 → 826 | white fade |
| 826 → 882 | 등록 CTA |

Derived gaps (use these when implementing):

- Screen horizontal padding: **20** (every field spans x 20 → 355).
- header bottom (94) → photo rail (114): **20**
- photo rail bottom (214) → first label box (231.4): **≈17** (use 16)
- label box → its field: **≈6** (exactly `V2TextField`'s internal `gap: spacing[6]`) — except the
  `설명 작성` label → text area gap which is **≈12**.
- field bottom → next label box: **≈32** (308→341.4, 418→451.4)
- 태그 field bottom (528) → `설명 작성` label box (552.4) when **no chips**: **≈24**
- 태그 field bottom (528) → chip rail (544): **16**; chip rail bottom (576) → `설명 작성` label box (608.4): **≈32**
- Total shift caused by the chip rail: **exactly 56 px** (16 + 32 + 32 − 24).
- The scroll container itself is drawn as `375 × 654` at y 114 (no chips) / `375 × 710` at y 114 (with chips) —
  i.e. the content *ends flush at the text area's bottom edge*; the fade + CTA overlay it.

### 2.2 Photo rail

| Item | Geometry (local) | Style |
|---|---|---|
| `사진/영상` add tile | x **20 → 120**, y **114 → 214** (100 × 100), radius **8** | fill `#F9FAFB` |
| camera glyph | ink **33.3 × 30.0**, x 53.3 → 86.6, y 138 → 168 (F2+ coords) | `#37383C` @ **0.28**. Nominal icon box **32×32**, horizontally centred in the tile. |
| `사진/영상` label | ink w **49.2** × h 11.7, x 45.4 → 94.6 (centred), ink y **181.6 → 193.3** | **13 px medium**, `#2E2F33` @ **0.7** |
| Attached photo tile (F10) | 100 × 100, radius **8**, at x **128 / 236 / 344** (gap **8** from the add tile and between photos) | image fill; the 3rd runs past x 375 ⇒ **horizontal scroll** |
| Remove badge (F10) | **16.36 × 16.36 circle** (r 8.18) at tile-relative **(76, 8)** ⇒ 8 px inset from the tile's top and right edges | fill `#37383C` @ **0.51**; `×` glyph **7 × 7**, white @ **0.9**, centred |

Rail order: add-tile first, then photos, left-to-right. Rail left inset 20; it scrolls horizontally
(so use `contentContainerStyle` padding, not container padding).

### 2.3 Field labels

Pattern: `<강한 라벨><빨간별 or (선택)>` on one line, then the field.

| Frame text | Ink | Style |
|---|---|---|
| `카테고리` | x 24.5, w 43.1, h 11.4 | **13 px semibold**, `#2A2A37` |
| `(선택)` | x 73.2 (gap **≈5** after the label ink), w 29.6, h 12.9 | **13 px**, `#37383C` @ **0.51** |
| `제목` | x 24.3, w 21.8 | 13 semibold `#2A2A37` |
| `*` (제목) | x 47.2 (gap **≈1**, no space), **5.0 × 5.2** | **`#FE7139`** (brand, *not* red) |
| `태그` | x 24.9, w 21.2 | 13 semibold `#2A2A37` |
| `(선택)` (태그) | x 50.7, w 29.6 | 13 / `#37383C` @0.51 |
| `설명 작성` | x 20.4, w 46.4 | 13 semibold `#2A2A37` |
| `*` (설명) | x 68.8, 5.0 × 5.2 | `#FE7139` |

Note: `카테고리`/`제목`/`태그` ink starts ≈24.3–24.9 while `설명 작성` ink starts **20.4**. That is a
glyph side-bearing artefact (설 / 카 have different left bearings), **not** a second indent line —
all four label text boxes start at x **20**.

### 2.4 Category select (a *pressable field*, not a TextInput)

- Box: x **20 → 355** (335), y **254 → 308** (**54**), radius **14**
  (`M175 8874.5 … C489.456 8874.5 495.5 8880.54 495.5 8888` ⇒ r = 13.5 on the stroke centreline = **14** outer).
- Fill `#FFFFFF`, border **1 px** `#70737C` @ **0.22**.
- Placeholder `카테고리 선택해주세요` — ink x 36.7, y 275.6 (h 14.8), **17 px regular**, `#37383C` @ **0.51**.
- Value `질문·상담` — ink x 36.8, w 61.9, h 14.7, **17 px regular**, `#2A2A37`.
- Text left padding **16**; the value/placeholder line box is **26 px** tall (17/26).
- Chevron-down glyph: ink x **324.6 → 333.7** (w 9.1), h 5.3, vertical centre = field centre (281).
  Glyph centre x = **329.15** ⇒ a **20 × 20** icon box spans 319.2 → 339.2, i.e. **right padding ≈ 16**
  (field right edge 355). Colour `#37383C` @ **0.28**.

### 2.5 제목 input

- Same box as §2.4 (335 × 54, r 14, white, 1 px `#70737C`@0.22), text padding 16, 17/26.
- Placeholder `제목을 입력해주세요` (ink x 36.4, w 135.5) — `#37383C`@0.51.
- Value `칼륨 수치가 올라갔는데 어떤 음식이 좋을까요?` (ink x 36.8, w 307.2, h 14.9) — `#2A2A37`, **17 regular**.
- **Single line with a right-edge fade.** Figma exports three white mask rects over the text row:
  `x 28 w 295 h 26` (solid), `x 323 w 20 h 26` (fade), `x 343 w 4 h 26` — i.e. the text is clipped at
  x ≈ 347 with a 20 px fade-out. Implement as a single-line input that truncates/fades, never wraps.

### 2.6 태그 input + chip rail

- Input box: identical to §2.5 (335 × 54, r 14, 1 px border), same mask rects.
- Placeholder `태그 입력 (최대 5개)` — ink x 37.2, w 134.7, h 16.8, **17 regular**, `#37383C`@0.51.
- Draft value (F4) `저단백` — ink x 36.5, w 42.1, **17 regular**, `#2A2A37`.
- **Chip rail** (F5/F6/F7/F10), y **544 → 576** (h **32**), first chip at x **20**, gap **6**:

| # | Label | x | width | 
|---|---|---|---|
| 1 | `저단백` | 20 | 68 |
| 2 | `저염식` | 94 | 68 |
| 3 | `간단` | 168 | 57 |
| 4 | `점심식` | 231 | 68 |
| 5 | `레시…` **(clipped by the frame at x 375 — the full string is NOT readable; do not invent it)** | 305 | 94 |

  Chip anatomy (measured on `저단백` / `간단`):
  - height **32**, radius **16** (`full` pill), fill **`#F9FAFB`**, border **1 px `#70737C` @ 0.22**.
  - label **13 px medium**, `#2E2F33` @ **0.7**, ink starts **8.4** from the chip's left edge.
  - gap label → `×` glyph: **≈6.4**
  - `×` glyph **8.2 × 8.2**, `#37383C` @ **0.51**, its right edge **11.9** from the chip's right edge,
    vertically centred.
  - ⇒ effective padding: **left 8 / right 12**.
  - The rail overflows the frame ⇒ **horizontally scrollable**, no wrap.

### 2.7 본문 (body) text area

- Box: x **20 → 355** (335), height **186**, radius **16**, fill **`#70737C` @ 0.05**, **no border**.
- Placeholder `내용을 입력해주세요.` — ink x 35.1 (⇒ padding-left **16**), ink y **603.1** (F2 coords,
  i.e. **19.1** below the box top), w 122.3, h 13.1 → **15 px regular**, `#37383C` @ **0.51**.
- Filled body (F6) — ink x 34.3, first-line ink top **12.1** below the box top, block ink height
  **128.2** over **6 lines** ⇒ **line height ≈ 23**, font **15 px regular**, `#2A2A37`.
  (Placeholder sits ~7 px lower than the first filled line — a Figma inconsistency; pick one, 16 px
  padding-top, for the implementation.)
- Body copy verbatim (F6/F7/F10), wrapped as drawn:
  ```
  안녕하세요. 최근 건강검진에서 칼륨 수치가 높게 나
  와 식단을 조절하고 있습니다.
  평소에는 국이나 찌개를 자주 먹는 편인데 어떤 음식
  을 위주로 먹으면 도움이 될까요? 피해야 하는 음식이
  나 추천해 주실 만한 식단이 있다면 경험과 함께 알려
  주시면 감사하겠습니다.
  ```
  (145 characters — matches the counter.)
- **Counter**, bottom-right *inside* the box: right edge of ink **16** from the box's right edge,
  ink bottom **17.6** above the box's bottom edge. **13 px**, two-tone:
  - current count (`0`, `145`) → `#2A2A37`
  - `/ 700` → `#37383C` @ **0.51**
  - Exact string: **`0/ 700`** / **`145/ 700`** — no space before the slash, one space after.

### 2.8 카테고리 바텀시트 (F2)

| Element | Geometry (local) | Style |
|---|---|---|
| Scrim | full frame 375 × 902 | `#171719` @ **0.2** |
| Sheet card | x **10 → 365** (**355** wide), y **413 → 892** (**479** tall), radius **28** | `#FFFFFF`. **Floating**: inset 10 left/right/bottom, all four corners rounded. |
| Grabber | 48 × 4, radius 2 (=full), x 163.5 (centred), y **429** (**16** below the sheet top) | `#37383C` @ **0.16** |
| Title `카테고리` | ink x 34.4 (⇒ sheet padding **24**), ink y **458 → 475.8** (w 66.8, h 17.8) | **20 px bold**, `#2A2A37` |
| Option row (unselected) | x **26 → 349** (w **323**, = **16** inset inside the sheet), h **55**, radius **24** | fill `#F9FAFB`, no border |
| Option row (selected) | same box | fill `#FFF4F0` @ **0.6**, **1 px `#FE7139`** border |
| Option label | ink x **50.5** (⇒ **24** inside the row), vertically centred, h 15 | **17 px semibold/bold**, `#2A2A37` |
| Option pitch | tops at y **504.5 / 575 / 646 / 717** ⇒ **pitch 71** = 55 + **gap 16** | |
| Sheet CTA `다음` | x **30 → 345** (w **315**, = **20** inside the sheet), y **816 → 872** (h **56**), radius **16** | `#FE7139`, label **17 px semibold** white (ink 27.8 × 15, centred) |
| Last option bottom (772) → CTA top (816) | **44** | |
| CTA bottom (872) → sheet bottom (892) | **20** | |

Option copy, top to bottom, verbatim:

1. `질문·상담` — **selected**
2. `식단 인증`
3. `식당 추천`
4. `CKD 정보`

(The `·` is U+00B7 / middle dot, not a bullet list marker.)

### 2.9 사진 피커 (F8, F9)

Header:

- Nav bar 50 → 94 as usual, back chevron at the same place.
- Title `최근항목` (**no space**) — ink x 152.5, w **50.9**, h 13.4 ⇒ **15 px semibold**, `black`.
- Trailing chevron, ink 4.4 × 7.3 (F8, **pointing right `›`**) / 7.3 × 4.4 (F9, **pointing down `⌄`**),
  `#37383C` @ **0.51**, inside a 16×16 box at x **224 → 240** (F8) / **208 → 224** (F9).
  ⇒ the title + chevron together are the dropdown trigger.

Grid:

- **3 columns, full-bleed** (no horizontal screen padding). Cell **122.3 × 122.3**, column x at
  **0 / 127 / 254**, row y at **114 / 241 / 368 / 495** ⇒ **pitch 127, gutter 4.7**.
  (The mock was authored at 393 pt and scaled to 375: 393 → cell 128.33, gutter 4. Implement as
  `cell = (width − 2 × 4) / 3`, gutter **4**.)
- **Cell (0,0) is the `사진/영상` camera tile**: `122 × 122`, fill `#F9FAFB`, **square (no radius)**,
  camera glyph 33.3 × 30 at ink y 149 → 179, label `사진/영상` ink y 192.6 → 204.3 (13 px medium,
  `#2E2F33`@0.7). Same tokens as the compose add-tile, resized to the grid cell.
- Selection marker, **unselected**: circle **d ≈ 25.56**, fill `#37383C` @ **0.28**, stroke **white
  2.445**, top-right of the cell at cell-relative **(86.2, 9.2)** ⇒ ≈10 px inset from the top and right.
- Selection marker, **selected** (F8/F9 row 1 col 2): **28 px** circle, fill `#FE7139`, no white ring;
  cell-relative **(85, 8)**. Digit `1` ink **4.8 × 12.0**, white, centred ⇒ **≈16 px semibold**.
  ⇒ multi-select with **selection-order numbers**.
- Bottom CTA `등록` — identical to §2.0, **enabled** (brand fill).

Album dropdown (F9 only):

| Element | Geometry (local) | Style |
|---|---|---|
| Menu card | x **98 → 278** (w **180**), y **103 → 255** (h **152**), radius **12** | fill `#FFFFFF`, border **1 px `#70737C` @ 0.16**, drop shadow (`filter16_d`), plus a `backdrop-filter: blur(22)` layer that is invisible under the opaque white fill. Horizontally **centred** on the frame (menu centre x 188 vs frame centre 187.5), **9 px** below the nav bar. |
| Rows | 3 × **44** tall, menu padding-vertical **10** (10 + 3×44 + 10 = 152 ✓) | |
| Row label | ink x **118.6** ⇒ padding-left **20**; ink heights 13.1–13.2 | **15 px**, `#2E2F33` @ **0.7** |
| Row 1 | `최근 항목` (**with** a space, unlike the header) | |
| Row 2 | `비디오` | |
| Row 3 | `즐겨찾기` | |

No dim/scrim behind the menu — only its shadow.

---

## 3. Typography table

Weight column: `w` values are read visually (Pretendard's hangul advance barely changes with weight,
so width-matching cannot distinguish 500 vs 600); sizes are solved to ±0.15 px.

| Line | String(s) | Size | Weight | Colour | Where |
|---|---|---|---|---|---|
| Nav title | `글쓰기`, `최근항목` | **15** (solved 14.98 / 15.06) | semibold | `#000000` | all frames |
| Sheet title | `카테고리` | **20** (solved 20.0) | bold | `#2A2A37` | F2 |
| Field label | `카테고리` `제목` `태그` `설명 작성` | **13** (12.85–12.96) | semibold | `#2A2A37` | compose |
| Field label suffix | `(선택)` | **13** (12.65–13.16) | regular/medium | `#37383C` @0.51 | compose |
| Required mark | `*` | glyph 5.0 × 5.2 (≈13 px asterisk) | — | **`#FE7139`** | 제목 / 설명 작성 |
| Field placeholder | `카테고리 선택해주세요` `제목을 입력해주세요` `태그 입력 (최대 5개)` | **17** (16.94–17.01) | regular | `#37383C` @0.51 | compose |
| Field value | `질문·상담`, title text, tag draft | **17** (16.9–17.08) | regular | `#2A2A37` | compose |
| Sheet option | `질문·상담` `식단 인증` `식당 추천` `CKD 정보` | **17** (17.0–17.1) | semibold/bold | `#2A2A37` | F2 |
| Body placeholder | `내용을 입력해주세요.` | **15** (14.99) | regular | `#37383C` @0.51 | compose |
| Body text | 145-char paragraph | **15**, **line-height 23** | regular | `#2A2A37` | F6/F7/F10 |
| Counter (count) | `0`, `145` | **13** (12.87–13.06) | regular | `#2A2A37` | compose |
| Counter (max) | `/ 700` | **13** | regular | `#37383C` @0.51 | compose |
| Tile label | `사진/영상` | **13** (13.3) | medium | `#2E2F33` @0.7 | compose, picker cell |
| Tag chip label | `저단백` etc. | **13** (13.02) | medium | `#2E2F33` @0.7 | F5–F7, F10 |
| CTA label | `등록`, `다음` | **17** (16.95–17.01) | semibold | white (enabled) / `#2E2F33`@0.88×0.3 (disabled) | all |
| Picker menu row | `최근 항목` `비디오` `즐겨찾기` | **15** (14.9) | regular/medium | `#2E2F33` @0.7 | F9 |
| Selection badge | `1` | **≈16** | semibold | white | F8/F9 |

All lines are `letterSpacing: 0` in the export (v2 rule satisfied — no negative tracking anywhere).

---

## 4. Colour table

| Hex (+alpha) | Used by | v2 token (exact match unless noted) |
|---|---|---|
| `#FFFFFF` | screen bg, field fill, sheet fill, menu fill, CTA label (enabled) | `background.default` / `static.white` |
| `#000000` | nav title | `label.strong` |
| `#2A2A37` | field values, labels, sheet options, body text, counter count | `label.normal` (grayscale 900) |
| `#2E2F33` @ 0.70 | tile label, chip label, picker menu rows | `label.neutral` (`#2e2f33b3` = .70) |
| `#2E2F33` @ 0.88 | back chevron; disabled CTA label (× extra `opacity .3`) | **no token** — closest `label.neutral` (.70). See §6. |
| `#37383C` @ 0.51 | placeholders, `(선택)`, `/ 700`, chip `×`, header chevron, remove badge fill | `label.alternative` (`#37383c82` = .5098) |
| `#37383C` @ 0.28 | camera glyph, select chevron, picker unselected marker | `label.assistive` (`#37383c47` = .278) |
| `#37383C` @ 0.16 | sheet grabber | `label.disable` (`#37383c29` = .161) |
| `#70737C` @ 0.22 | field borders, chip borders | `line.normal` (`#70737c38` = .2196) |
| `#70737C` @ 0.16 | dropdown menu border | `line.neutral` (`#70737c29` = .161) |
| `#70737C` @ 0.05 | body text area fill | `fill.alternative` (`#70737c0d` = .051) |
| `#F9FAFB` | photo tile, tag chips, unselected sheet options, picker camera cell | `fill.background` (grayscale 50) |
| `#FE7139` | CTA fill, selected option border, required `*`, selection badge | `primary.primary` |
| `#FFF4F0` @ 0.60 | selected sheet option fill | `primary.primaryWeak` (`#fff4f099` = .60) |
| `#171719` @ 0.20 | sheet scrim | `background.dim` (`#17171933` = .20) |
| `#07194C` @ 0.05 | **disabled CTA fill** | **near-miss**: `fill.pressed` is `#0220470d` (.051, different hue). See §6. |
| `white 0% → 100%` | 36 px fade above the CTA | no token (gradient) |

---

## 5. State machine / interactions

```
                       ┌────────────────────────── 글쓰기 (compose) ──────────────────────────┐
   [사진/영상 tile] ───▶ OS/photo picker (F8) ──(dropdown ›/⌄)──▶ album menu (F9) ──▶ back with
                       │        selection order badges 1..n, CTA 등록                          │
                       │◀──────────── returns with photos → rail shows tiles + × (F10) ────────┘
                       │
   [category field] ──▶ 카테고리 bottom sheet (F2): scrim + floating card, one option
                       selected (brand tint + brand border), CTA 다음 commits → field
                       switches from placeholder colour (#37383C@.51) to value colour (#2A2A37)
                       │
   [제목 field] ───────▶ single-line input, value truncates with a 20px right fade
                       │
   [태그 field] ───────▶ typing (F4: raw text in the field, no chip yet)
                        └─ commit (space / return) → chip appears in the rail below (F5),
                           field returns to placeholder. Max 5 (placeholder says 최대 5개).
                           Chip `×` removes that tag. Rail scrolls horizontally, never wraps.
                           Adding the first chip pushes everything below down by 56 px.
                       │
   [본문] ─────────────▶ multiline, counter `n/ 700`, max 700
                       │
   등록 CTA: disabled  ← while required fields are empty (F1, F3, F4, F5 — all have an empty body)
             enabled   ← as soon as the body has content (F6/F7/F10)
```

Read-outs from the frames:

- **Enablement rule (as drawn):** F3 has a category **and** a title but 등록 is still disabled; F6 adds
  only the body and it turns brand. ⇒ the gate is `제목` **and** `설명 작성` (both marked `*`).
  Category and 태그 are marked `(선택)` and never gate the CTA. Photos never gate it (F1 vs F8/F9 —
  the picker shows an enabled CTA because that state comes from the form behind it).
- **Selected chip / option look:** brand-tinted fill (`primary.primaryWeak`) + 1 px brand border +
  unchanged text colour. There is no checkmark.
- **Pressed states:** none are drawn in this section.
- **Empty states / loading states:** none are drawn. F1 *is* the empty form. There is no skeleton and
  no spinner anywhere in the section — keep it that way (v2 rule: skeleton-first, never a ring spinner).
- **Keyboard-up layout:** **not drawn in this section.** Do not infer one; keep the existing
  keyboard handling (see §7).
- **Scroll behaviour:** the content block ends flush at the text area's bottom edge and the 36 px
  white fade + CTA bar sit on top of it ⇒ the CTA is **pinned**, content scrolls under it.
- **Picker:** multi-select with visible selection order; the album name is a dropdown
  (`최근 항목 / 비디오 / 즐겨찾기`); confirm with the bottom `등록`.

---

## 6. v2 mapping

| Design element | v2 component + tokens | Notes / gaps |
|---|---|---|
| Screen shell | `V2Screen` | horizontal padding **20**, not `layout.GUTTER` (16). See gap #1. |
| Header | `V2ScreenHeader title="글쓰기" onBack` — `barHeight.appBarIOS` 44 ✓, title `typography.label.small` (15 semibold) ✓, colour `label.strong` (#000) ✓ | **CONFLICT:** `V2ScreenHeader` left-aligns the title (Toss rule); the design centres it in **all 10 frames**. Smallest fix: add `align?: "left" \| "center"` (default `"left"`) to `V2ScreenHeader`. Do **not** hand-roll a header. |
| Back icon | `V2Icon name="chevronLeft" size="md"` (24) ✓ | Design colour `#2E2F33`@0.88; use `colors.label.normal` (`#2A2A37`) — 1-step difference, invisible. |
| Photo add-tile | plain `Pressable` + `V2Icon name="camera" size="xl"` (32) + `V2Text` | 100×100, `radius.sm` (8) ✓, `colors.fill.background` ✓, label `typography.label.xSmallWeak` (13 medium) + `label.neutral` ✓ |
| Attached photo tile | `expo-image` + `radius.sm` (8) | remove badge = 16 circle `label.alternative` fill + `V2Icon name="close"` 8 px glyph. **Gap #2:** there is no v2 "image remove badge"; the closest is `V2IconButton`, which is too big. Keep it local. |
| Field label + `(선택)` / `*` | `V2TextField`'s `label` + `required` — **partially** | `V2TextField` renders `label` as one string and the `*` in `status.negative` **with a leading space**. Design: `*` is **`primary.primary`** and has **no space**, and `(선택)` is a second run in `label.alternative`. **Gap #3:** widen `V2TextField` to accept `label?: string \| ReactNode` (or add `optional?: boolean` + `requiredColor`), or render the label row yourself above a `V2TextField` with `label` omitted. |
| 카테고리 select | **no v2 component**. Compose `Pressable` + `V2Text` + `V2Icon name="chevronDown" size="sm"` (20) with `V2TextField`'s box style (h 54, `radius.xl`=14, `borderWidth.thin`, `line.normal`, `paddingHorizontal: spacing[16]`) | **Gap #4:** v2 has no *select / picker field*. Smallest addition: a `V2SelectField` that reuses `V2TextField`'s box tokens and swaps the `TextInput` for a `Text` + trailing chevron. Everything it needs already exists as tokens. |
| 제목 / 태그 inputs | `V2TextField variant="box"` — **exact match**: minHeight 54 ✓, `radius.xl` 14 ✓, 1 px `line.normal` ✓, `paddingHorizontal spacing[16]` ✓, value `body.mediumWeak` 17 ✓ + `label.normal` ✓, placeholder `label.alternative` ✓, internal `gap: spacing[6]` ✓ | Only the label composition (gap #3) differs. |
| Tag chips | `V2Chip size="s"` + `onRemove` — height 32 ✓, `radius.full` ✓, gap 6 ✓, label `label.xSmallWeak` 13 medium ✓, unselected fg `label.neutral` ✓ | **CONFLICT:** design chips are `fill.background` (#F9FAFB) **with a 1 px `line.normal` border**; `V2Chip` is deliberately borderless with `fill.normal`. Recommendation: **use `V2Chip` as-is** (the DS comment is explicit that the app is borderless) and flag the deviation to design. If design insists, add `variant?: "plain" \| "outlined"` to `V2Chip` (outlined = `fill.background` + 1 px `line.normal`) — that is the only new axis needed. Also pass the `×` as `iconSize.xs` (16) rather than `sm` (20) to match the 8 px glyph. |
| Chip rail | horizontal `ScrollView`, `contentContainerStyle: { paddingHorizontal: 20, gap: 6 }` | Design gap **6**, not `layout.CHIP_GAP` (8). Use 6 — see gap #1. |
| 본문 text area | `V2TextField multiline` **does not match**: it draws a white box with a border. Design is a borderless filled surface (`fill.alternative`, `radius["2xl"]`=16, fixed height 186). | **Gap #5:** add a `surface` (or `tone="filled"`) variant to `V2TextField` — `backgroundColor: fill.alternative`, `borderWidth: 0`, `borderRadius: radius["2xl"]` — or build a small local `BodyField`. Also the body type is **15/23**, which is **not a v2 token**: `subtext.large` is 15/20 and `label.smallWeak` is 15/19. **Gap #6:** propose `typography.body.small = { regular, 15, 23, 0 }` (15 × 1.5 → 23, consistent with the existing ×1.5 ladder: 17/26, 19/29). Until then use `subtext.large` and accept 20 vs 23. |
| Counter | `V2Text` ×2 in one line, `typography.subtext.mediumStrong`/`medium` (13) with `label.normal` + `label.alternative` | positioned absolute inside the field, right 16 / bottom 16 |
| 카테고리 sheet | `V2BottomSheet title="카테고리"` + `V2Option` rows + sheet `primaryLabel="다음"` | **Near-perfect:** sheet radius 28 = `radius["4xl"]` ✓, grabber 48×4 `label.disable` ✓ and its 16-top/24-bottom block ✓, title `typography.title.small` 20 bold ✓ + `label.normal` ✓, `paddingHorizontal spacing[24]` ✓, scrim `background.dim` ✓, footer button `V2Button size="xl"` 56/r16 ✓. `V2Option`: `paddingHorizontal 24` ✓, `radius["3xl"]`=24 ✓, `borderWidth 1` toggled to `primary.primary` ✓, selected bg `primary.primaryWeak` ✓, unselected bg `fill.background` ✓, and 16+23+16 = **55 px tall = the design's 55** ✓. |
| — sheet float inset | **CONFLICT (accept the DS):** the design draws a *floating* card inset 10 px on the left/right/bottom with all four corners rounded; `V2BottomSheet` is edge-to-edge with only the top corners rounded. Per the "바텀시트 한 계보" rule, **use `V2BottomSheet` unchanged** and let the option rows sit at `spacing[24]` from the screen edge (design: 26). Do not fork the sheet for a 10 px float. |
| — sheet option gap | design 16 between rows; use `spacing[16]` ✓ |
| Bottom CTA | `V2BottomCTA primaryLabel="등록"` + `primaryProps={{ disabled }}` — `V2Button size="xl"` = 56 h, `radius["2xl"]` 16, `label.medium` 17 semibold, `paddingBottom max(insets.bottom, 20)` ✓, `paddingHorizontal spacing[20]` ✓ | Two deltas: (a) `V2BottomCTA` uses `paddingTop: spacing[16]`; the design has **`paddingTop: 0` plus a 36 px white→transparent fade** above the bar (`V2BottomCTA`'s header comment says the gradient was intentionally dropped). **Gap #7:** add an optional `fade?: boolean` that renders a 36 px `background.default`→transparent `LinearGradient` above the bar and drops `paddingTop` to 0. (b) disabled fill is `fill.normal` (#70737c14) vs the design's `#07194C`@5 %, and the disabled label is `label.disable` (16 %) vs ≈26 % — **use the v2 values**, the difference is imperceptible and the design hex is off-token. |
| Picker (F8/F9) | **Recommend: do not rebuild.** Keep `expo-image-picker` (`pickMultipleImages`) — it already gives multi-select with order badges, the `최근 항목/비디오/즐겨찾기` album menu and the `최근항목` header verbatim, because those frames **are** iOS PHPicker chrome. | The only non-native element is the `사진/영상` tile occupying grid cell (0,0), which PHPicker cannot host. **Decision needed:** either (a) native picker + a separate camera entry point (recommended — matches today's code), or (b) build a custom grid (spec is complete in §2.9: 3 cols, gutter 4, square cells, 25.6 marker / 28 brand order-badge, 44 px menu rows, 180×152 r12 menu). Flag this to the design owner rather than silently choosing. |
| Icons needed | `camera`, `close`, `chevronDown`, `chevronLeft` — **all already in `design-system-v2/icons/registry.ts`** ✓ | no new icons |

**Gap #1 (spacing):** the screen gutter here is **20**, but `layout.GUTTER` = 16 and the DS text says
"화면 좌우 16". Every frame in this section uses 20 (fields x 20→355, CTA x 20→355, rail inset 20), and
`V2BottomCTA` itself already uses `spacing[20]`. Recommendation: keep **20** for this screen (it matches
the CTA and therefore keeps a single left edge), and raise the 16-vs-20 inconsistency with design rather
than mixing the two inside one screen. `spacing[20]` and `spacing[6]` both exist as tokens — no additions needed.

**Off-token values to flag:** `#2E2F33`@0.88 (back chevron, disabled label), `#07194C`@0.05 (disabled CTA fill),
body line-height 23, chip padding 8/12. All four have on-system substitutes listed above.

---

## 7. Delta vs the current implementation

Files read: `src/features/recipe/components/FreePostEditor.tsx` (741 L), `TagInput.tsx`, `TagChips.tsx`,
`PostCategorySheet.tsx`, `ImageThumbnailCard.tsx`, `ContentResponsibilityCheck.tsx`,
`src/features/recipe/data/freePostCategories.ts`, `app/(write)/free/[id].tsx`, `src/i18n/locales/ko/recipe.json`.

### 7a. Already matches

- Structure of the form: photo rail → 카테고리 → 제목 → 태그 → 설명 작성 → bottom 등록 — same order.
- Screen horizontal padding **20** (`editorBody.paddingHorizontal: 20`) ✓.
- Category opens a bottom sheet (`PostCategorySheet` already sits on `V2BottomSheet`) ✓.
- Body max length **700** ✓, counter present ✓, single-line title input ✓.
- Photo rail is a horizontal `ScrollView` with the add-tile first, then thumbnails with a remove badge ✓.
- Tags are typed then committed to chips with `×` ✓.
- The required-mark `*` is already brand-coloured (`surface.brand`) ✓ — matches the design, and is the
  reason not to reach for `V2TextField`'s `required` (which is red).
- CTA is full-width at the bottom with a disabled/enabled split ✓.
- `pickMultipleImages` already uses the native picker, i.e. exactly the chrome drawn in F8/F9 ✓.

### 7b. Must change

| # | Current | Design |
|---|---|---|
| 1 | Header **h 54**, `paddingHorizontal 20`, hairline bottom border, title **17 bold**, back `Ionicons chevron-back` 24, title centred via a spacer `View` | Header **h 44** (+ status band), **no bottom border**, title **15 semibold `#000`**, centred. Move to `V2ScreenHeader` (+ centre-align prop). |
| 2 | Everything is hand-rolled with `useSurface()` + literal font sizes (`13.5`, `14.5`, `12.5`, `11.5`) and **negative letterSpacing** (`-0.3`, `-0.28`, `-0.26`, `-0.34`) | v2 tokens; **letterSpacing 0** everywhere. The literal sizes also violate the "weight = face only" rule in three places (`fontWeight` + `fontFamily` both set). |
| 3 | Fields: `height 54`, **radius 12**, **paddingHorizontal 14**, value **14.5 px** | radius **14**, padding **16**, value **17 px**. Switch to `V2TextField variant="box"`. |
| 4 | Body: `descriptionField` minHeight **190**, radius 12, padding 14/14/10, `bodyInput` **14 px / lh 22**, counter **11.5 px** single-colour, string `` `${n} / 700` `` | box **186 h**, radius **16**, fill `fill.alternative`, body **15 / lh 23**, counter **13 px two-tone**, string `` `${n}/ 700` `` (no space before the slash). |
| 5 | Photo tile **96 × 96**, radius **10**, gap **10**, camera glyph 25, label **12.5** | **100 × 100**, radius **8**, gap **8**, camera glyph **32**, label **13**. Thumbnails are **72 × 72 r12** with a **20 px `#1D1E20`** badge overhanging at (−6, −6) → design is **100 × 100 r8** with a **16.4 px `label.alternative`** badge **inside** at (+8, +8). |
| 6 | Tag chips: **h 28**, **radius 8**, `#`-prefixed label, `flexWrap: "wrap"`, gap 6, no border, `×` 13 | **h 32**, **radius full**, **no `#` prefix**, **no wrap — horizontal scroll**, border 1 px `line.normal`, fill `fill.background`, `×` glyph 8. |
| 7 | `TagInput` is a bordered-top block with a hashtag icon, an inline `+` button, `MAX_COMMUNITY_TAGS = 10`, `maxLength 21`, **auto-focuses on mount** (`setTimeout(focus, 50)`) | A plain boxed field identical to 제목, placeholder `태그 입력 (최대 5개)` ⇒ **max 5**, no hashtag icon, no `+` button. The auto-focus is not implied by any frame and steals focus from 제목 — remove it. Chips render **below** the field, not above it. |
| 8 | Category: `selectField` **radius 12 / padding 14**, chevron `Ionicons chevron-down` **16**, and **defaults to `FREE_POST_CATEGORIES[0]`** so the field is never empty | radius 14 / padding 16, chevron glyph 9.1 × 5.3 in a 20 box, and there **is an empty state**: placeholder `카테고리 선택해주세요` in `label.alternative`. Category must start **unset**. |
| 9 | Category taxonomy: `diet 식단 / numbers 수치 변화 / symptoms 증상 고민 / medicine 약물 / dining-out 외식 후기 / daily 일상 공감` (6) | **`질문·상담 / 식단 인증 / 식당 추천 / CKD 정보` (4)** — a completely different taxonomy. **This is a product + server change (post `category` values, feed filters, existing rows), not a styling change.** Do not silently remap; raise it. |
| 10 | Sheet: title `글 주제` **17 bold**, rows **h 52 / radius 12 / padding 8**, label **15.5 medium**, selection shown with an orange **checkmark**, `paddingHorizontal 12`, **selecting closes the sheet immediately** | Title **`카테고리` 20 bold**, rows **h 55 / radius 24 / padding 24**, label **17**, selection shown as **brand tint + brand border, no checkmark**, and a **`다음` CTA** commits the choice. Replace the hand-rolled rows with `V2Option`; add the footer button. |
| 11 | CTA: `submitFull` **h 54 / radius 14**, label **15 bold**, `submitBar paddingTop 4 / paddingBottom 14 + inset`, colours from `surface.ctaOffBg` / `surface.ctaOffText` | **h 56 / radius 16**, label **17 semibold**, bar `paddingTop 0` + a **36 px white fade** above it, `paddingBottom 20`. Use `V2BottomCTA`. |
| 12 | Enablement: `canSubmit = title && body && responsibilityAgreed` | Frames show `title && body`. The `responsibilityAgreed` term is **extra** — see 7c #1, keep it. |
| 13 | Copy: `제목을 적어 주세요`, `내용을 입력해 주세요.`, `태그를 적어 주세요`, sheet title `글 주제` | `제목을 입력해주세요`, `내용을 입력해주세요.`, `태그 입력 (최대 5개)`, `카테고리`. (Add `freePost.categoryPlaceholder = 카테고리 선택해주세요`.) |
| 14 | `app/(write)/free/[id].tsx` (**edit** screen) is a *different* editor: 52 px header with a small `등록` **pill on the right**, a category **chip row**, an underlined **19 px bold** title input, a borderless body, **no tag label, no counter, no bottom CTA** | The design shows one form. Edit and create should share the same component. This is the largest structural delta in the section. |

### 7c. Present in the CURRENT code but NOT in the design — **PRESERVE, do not delete**

1. **`ContentResponsibilityCheck`** — the "다른 사람의 권리를 침해하지 않는 내용인지 확인했어요." checkbox
   below the body, and its `responsibilityAgreed` term in `canSubmit`. Legal/compliance gate. Not drawn.
2. **Vote / poll attachment** — `VoteSheet`, `VoteAttachCard`, `votes` state, the 투표 toolbar button,
   `handleOpenVoteSheet / handleEditVote / handleRemoveVote / handleVoteComplete`, `vote` in the create payload.
3. **The editor toolbar** (`styles.toolbar`) — image button, poll button, and `KeyboardDismissButton`
   (`react-native-keyboard-controller`), sitting in a `KeyboardStickyView` above the CTA. The design has
   no keyboard-up frame, so **keep the existing keyboard behaviour verbatim**
   (`KeyboardAwareScrollView` + `KeyboardStickyView` + `bottomOffset`, Android `Math.max(insets.bottom, 24)`).
4. **Image preview modal** — tapping a thumbnail opens a full-screen `AppModal` preview with a close button.
5. **`ConfirmExitModal`** with `hasContent` draft detection, and the `afterModalTransitions()` gate before
   `onClose` (see the "네이티브 present 는 모달 전환 뒤에" rule).
6. **Sequential image upload with progress** — `freePost.photoProgress` status text in the CTA label
   (`{current}/{total}`) and the all-or-nothing rule (one failed upload aborts the post).
7. **`presentError(..., { scope: "community-post-create", retry })`** error handling, and the
   `MAX_IMAGES = 5` limit with the `showInfoToast` over-limit notice (`freePost.photoLimitTitle/Body`).
8. **`mergeCommunityTags` normalisation** — lowercase, strip leading `#`, reject whitespace/over-length,
   de-duplicate. Only the *count* cap changes (10 → 5); the normalisation must survive.
9. **Haptics** (`hapticSelection` on opening the category sheet and on selecting a row).
10. **Ownership / edit guards** in `app/(write)/free/[id].tsx` (`isConfidentlyNotMine`, `usePostDetail`,
    `ArticleSkeleton` loading, `presentCommunityError`) — the server is the authority on `isMine`.
11. **`maxLength` on the title (200)** — the design shows no cap but silently dropping it would let
    over-long titles reach the server.
12. **i18n** — every string goes through `react-i18next`; the design's Korean copy is the `ko` value,
    not a literal to hard-code.

### 7d. Unreadable / undecidable

- The 5th tag chip in F5/F6/F7/F10 is clipped by the frame edge: only **`레시`** is legible.
  Reported as `레시…` — **not** guessed.
- Weight for `사진/영상`, chip labels and picker menu rows is read visually as medium (500); Pretendard's
  hangul advance is nearly weight-invariant so this cannot be confirmed from geometry.
- Whether F8/F9 are a **screenshot of the OS picker** or a **custom picker to build** is ambiguous
  (iOS chrome verbatim, but with the `사진/영상` tile occupying grid cell 0,0). Needs a design/product call.
