# `meal-story` — 자유글 · 오늘의 식단 (스토리) 업로드 플로우

Canvas region: **x 100–4260, y 11170–12120** of `slim.svg` (root viewBox `0 0 4831 14968`, 1 unit = 1 px @1x).
Section header on canvas: **"자유글- 오늘의 식단 (스토리)"** — outlined-path text, ink box x 181.3–763.6, y 11025.5–11077.4 (read visually at 3×).

Ten phone frames, all **375 × 840**, top-aligned at **y = 11214** (frames G and H at 11213 — 1 px Figma slop, ignore).

> ⚠️ Every bitmap fill (`img_N.png`) was stripped from `slim.svg`. Photos, the camera preview and the
> keyboard render **blank white**. White text/UI on those areas is invisible in a naive crop — all copy
> below was read by re-rendering with rect `fill="white"` swapped for grey (`dcrop.py`). Do not read colour
> from any photo/keyboard area.

### 0. Method / calibration

Numbers are **measured from the SVG source** — `<rect>` coordinates and bezier-flattened glyph-ink boxes —
not eyeballed. Font sizes are derived from Pretendard metrics against measured ink:

* hangul advance = **0.8642 em/char**, space = 0.251 em
* hangul ink height = **0.869 × fontSize** (Medium/SemiBold; ~0.891 for Bold)
* latin cap height = **0.715 × fontSize**
* ink width ≈ (advance_em − lsb_first − rsb_last) × fontSize; per-glyph lsb read from the real
  `Pretendard-*.otf` in `assets/fonts/`.

Both width and height agree to <2 % on every string quoted here. `letterSpacing` is **0** everywhere
(no Figma tracking) — consistent with the v2 rule.

**Figma export artefacts that are NOT design** (they repeat on every frame):
* Every filled shape is emitted twice — once with its real fill, once with `fill="white"` (the mask
  reference). The *first* one wins visually. E.g. the 등록 CTA is `#FE7139` + a duplicate white rect.
* Frame A's avatar is emitted 3× (`#F9FAFB` r20, white, white r20).
* A stray `16×16 r8` white rect at (206, 80) in frames C/D (below the album chevron) — orphan icon frame.

---

## 1. Screen inventory

| # | Frame origin (x, y) | Screen | State | Delta vs neighbour |
|---|---|---|---|---|
| **A** | (141, 11214) | **스토리 뷰어** (read) | Default, `저염식` badge present, comment bar idle | Entry/exit context for this flow. Same screen the `story-page` section specs — but with a **different badge treatment** (§2.1, §6 conflict). |
| **B** | (548, 11214) | **인앱 카메라 촬영** | Live preview, nothing captured | New screen. Only `X` + shutter + flip + gallery thumb + `사진` mode label. |
| **C** | (955, 11214) | **갤러리 그리드 피커** | Album `최근항목`, **1 photo selected** (index badge `1`), camera tile in cell 1 | New screen. |
| **D** | (1362, 11214) | 갤러리 그리드 피커 | = C **plus album dropdown open** (`최근 항목` / `비디오` / `즐겨찾기`) | Only difference: the popover; grid, CTA, selection all identical. No scrim behind the popover. |
| **E** | (1769, 11214) | **업로드 편집** (photo + bottom sheet) | Sheet up, **no chip selected**, caption empty, **no 업로드 button in header** | Baseline compose frame. |
| **F** | (2176, 11214) | 업로드 편집 | = E **plus first chip selected** (`CDK3` — typo, see §6) | Only the chip's fill/border/label colour changes. Header still has no 업로드 button. |
| **G** | (2583, 11213) | 업로드 편집 | = F **plus keyboard up**, caption **focused & empty** (orange caret, placeholder still shown) | Sheet is translated up by **292** and docked on the keyboard. Sheet's internal layout is byte-identical. |
| **H** | (2990, 11213) | 업로드 편집 | = G **plus caption typed** (caret at end of the run) | Only the field content changes. |
| **I** | (3397, 11214) | 업로드 편집 | = F **plus caption typed**, keyboard dismissed, **업로드 button appears** (white pill / orange label, 71×38) | This is the "ready to submit" state. |
| **J** | (3804, 11214) | 업로드 편집 + **다이얼로그** | = I **plus** `#171719 @20 %` dim **plus** the "업로드를 취소하시겠어요?" confirm card. The 업로드 button underneath is drawn in a **different variant** (orange fill / white label, 54×32) | The dim covers the whole frame incl. the header button (it is *under* the scrim). |

Flow: **B or C/D → E → F → G/H → I → (X) → J**.

---

## 2. Layout spec

All frames: **status bar 0–50** (white, black glyphs, notch drawn), no home-indicator bar is drawn on any
frame in this section. Safe-area assumption: the 50 px band ≈ `insets.top`; every bottom-anchored block
(comment bar, CTA bar, sheet) must additionally clear `insets.bottom` — the design draws none.

### 2.1 Frame A — 스토리 뷰어 (read)

Vertical bands (frame-relative):

| Band | y | Height | Fill |
|---|---|---|---|
| Status bar | 0–50 | 50 | `#FFFFFF` |
| Nav bar | 50–94 | **44** | `#FFFFFF`, no bottom border, no title |
| Media viewport | 94–760 | **666** | photo (`cover`, edge-to-edge) |
| Comment bar | 760–840 | **80** | `#FFFFFF`, no top divider |

| Element | Geometry (frame-rel) | Fill / copy |
|---|---|---|
| Back chevron | glyph ink 10.2 × 17.6 at x 18.0–28.2, y 63.1–80.7 → 24×24 box ≈ x 11.2, bar-centred | `#2E2F33` @ **88 %** |
| Overflow `⋯` | 3 dots ⌀2.67, ink 12.0 × 2.7 at x 337–349, y 70.5–73.2 → 24×24 box at x 331 (right inset **20**) | `#2E2F33` @ **70 %** |
| **`저염식` badge** | **60 × 32**, radius **16 (full)**, at **(26, 121)** = photo top + 27, left 26 | bg `#FFFFFF`; label **"저염식"** `#FE7139`, **15 px**, ink 37.1 × 13.2 at x 36.8 → h-padding ≈ **10.5** |
| Bottom scrim | 375 × 140 at y **620** (= media bottom − 140) | `linear(white@0 → #000000)`, layer opacity **0.30** |
| Avatar | **40 × 40** r20 at (20, 670) | bg `#F9FAFB`; person glyph 28.6 × 34.3 `#37383C` @ 28 % |
| Nickname | ink x 66.5–129.4, y 675.1–688.3 | **"신신마스터"**, 15 px, `#FFFFFF` |
| Timestamp | ink x 66.8–106.6, y 694.7–706.1 | **"3시간전"** (no space), 13 px, `#FFFFFF` (renders as ~70 % via group opacity) |
| Caption | ink x 20.3–347.4, y 724.7–736.1, **1 line, tail-ellipsised** | **"저염식으로 만든 든든한 한끼! 오늘도 건강하게 저염식으로 만든…"**, 13 px, `#FFFFFF` |
| Progress track | **335 × 2** r1 at (20, 750) | `#70737C` @ **8 %** |
| Progress fill | **96 × 2** left-aligned | `#FFFFFF` — 96/335 = **28.7 %**, single continuous bar (not segmented) |
| Comment input | **251 × 44** r12 at (20, 778) | `#70737C` @ **8 %**; placeholder **"댓글을 남겨보세요"** 15 px `#37383C` @ 51 %, ink x 31.0 → inset **11** |
| Heart icon | 24×24 box at x 289–313 (ink 24.6 × 22.1), y 788–811 | `#37383C` @ 28 % inside a 0.6-opacity group |
| Comment icon | 24×24 box at x 329–353 (ink 23.3 × 23.3) | same |

Differences from the `story-page` section's viewer frames (same screen, other region):
* badge is **60 × 32 / 15 px** here vs **40 × 21 / 10 px Bold** there;
* there is **no camera glyph** on the photo here (that section draws one at (329.5, 114.5)).
See §6.

### 2.2 Frame B — 인앱 카메라 촬영

Full-bleed camera preview (375 × 840 behind everything). Chrome only:

| Element | Geometry | Fill / copy |
|---|---|---|
| Close `X` | glyph ink **15.2 × 15.2** at x 14.4–29.6, y 64.4–79.6 → 24×24 box at (10, 60), centre (22, 72) | `#2E2F33` @ **70 %** (dark glyph on a photo — see §6) |
| Gallery thumbnail | **circle ⌀40** at (58, 738) (path, r20), image fill at **28 % opacity** | last-photo / open-library shortcut |
| Mode label | ink 21.1 × 11.3 at x 67.1–88.1, y 785.7–797.0, centred under the thumbnail (centre x 77.6 vs 78) | **"사진"**, 13 px, `#FFFFFF` |
| Shutter | outer **ring ⌀76** at (150, 721), `stroke #FFFFFF` width **4**; inner **disc ⌀64** at (156, 727.1), `#E5E8EB` | centre (188, 759) ≈ frame centre 187.5 |
| Camera flip | **circle ⌀40** at (278, 749), fill `#333D4B`; glyph 22.9 × 22.8 at (286.5, 757.6) `#FFFFFF` | two-arrow refresh/flip glyph; right inset **57** (not 20) |

Vertical: shutter centre 759, flip centre 769, thumbnail centre 758 — **the three are not on one baseline**
in the Figma file (10 px drift on the flip button). Implement them centred on a single 76-tall row
(centre y = 759) — see §6.
No mode switcher row (only the single `사진` label), no flash control, no timer, no zoom.

### 2.3 Frames C / D — 갤러리 그리드 피커

| Band | y | Height |
|---|---|---|
| Status bar | 0–50 | 50 |
| Nav bar | 50–94 | **44** (white, no border) |
| Grid | 114 → scrolls | rows of 122.3, pitch 127 |
| Fade | 728–764 | **36**, `linear(white@0 → white)` |
| CTA band | 764–840 | **76**, white |

**Nav bar**
* Back chevron — ink 10.2 × 17.6 at (18, 63.1), `#2E2F33` @ 88 %. (Note: **chevron-left**, not `X`, unlike frame B.)
* Title **"최근항목"** (no space) — ink 50.9 × 13.3 at x 154.5–205.4, **15 px Bold**, `#000000`.
* Album chevron-down — ink 7.3 × 4.5 at x 210.3–217.7, y 69.9–74.4 → **16×16** icon box at (206, 64), `#37383C` @ 51 %. Gap title-ink → chevron-ink = **4.9**.
* Title + chevron are **centred as a group** (group ink 154.5–217.7, centre 186.1 ≈ 187.5), not the title alone.

**Grid** — full-bleed, **3 columns, no outer padding**, cell **122.3 × 122.3**, column x = 0 / 127 / 254,
row y = 114 / 241 / 368 / 495 → **gap 4.7 (≈5)** both axes. Implement as
`cell = (width − 2×5) / 3 = 121.67`. First row starts **20 below the nav bar**. Only 4 rows are drawn
(grid ends at 617); the CTA band is not sticky over any drawn content — the real grid scrolls under it.

* **Camera tile** = grid cell 1 of row 1: fill `#F9FAFB`; camera glyph **33.3 × 30** inside a 40×40 box at
  (41, 144) (`#37383C` @ 28 %); label **"사진"** ink 21.3 × 11.4 at (49.9, 192.7), **13 px**,
  `#2E2F33` @ 70 %. Icon+label block is vertically centred in the cell (icon 40 + gap ≈5 + label line 18).
* **Selection badge — selected**: filled circle **⌀28** at cell top-right, inset **8 / 8**
  (row 1 col 2 → (212, 122)); fill `#FE7139`; index numeral **"1"** `#FFFFFF`, ink 4.8 × 12.0
  (cap 12.0 ⇒ **≈17 px SemiBold**), centred.
* **Selection badge — unselected**: circle **⌀25.6** fill `#37383C` @ 28 % **+ 2.44 px white stroke**
  → 28 outer. Same position. (The white ring is what makes it readable on a photo.)
* Multi-select is numbered (badge shows an index, not a check).

**CTA** — `등록` button **335 × 56**, radius **16**, at (20, 764) → left/right inset 20, bottom inset **20**.
Fill `#FE7139`; label **"등록"** `#FFFFFF`, **17 px**, ink 28.4 × 14.7 centred (x 173.3–201.7).
Above it a **36 px white bottom-fade** (y 728–764) with **no top padding** between fade and button.
No disabled variant is drawn (the design only shows the ≥1-selected state).

**Frame D — album popover**
* Card **180 × 152** at **(98, 106)**, radius **12**, fill `#FFFFFF`, border **1 px `#70737C` @ 16 %**
  (drawn inset 0.5), shadow **0 16 60 rgba(0, 27, 55, 0.10)** (`feOffset dy=16`, `stdDeviation=30`),
  plus a backdrop-blur clip on the same shape.
* Horizontally centred on the frame (card centre 188). Top edge 106 = **12 above** the grid top,
  i.e. it hangs directly under the nav bar and overlaps the grid; the nav bar itself stays visible.
* **No scrim / no dim** behind the popover.
* 3 rows, **44 px each**, container padding **10 top / 10 bottom** (10 + 3×44 + 10 = 152 exactly).
  Label inset **20** from the card's left edge, left-aligned, ink y 131.5 / 175.6 / 219.6 (pitch 44.05).
* Rows: **"최근 항목"** (with space), **"비디오"**, **"즐겨찾기"** — all **15 px**, `#2E2F33` @ 70 %.
  **No dividers, no checkmark, no selected-row highlight** (even though the nav title says 최근항목).

### 2.4 Frames E–J — 업로드 편집 (photo + bottom sheet)

Photo is **375 × 840 full-bleed** (behind the status bar and behind the sheet). Header chrome floats on it.

**Header**
* Close `X` — same as frame B: ink 15.2 × 15.2 at (14.4, 64.4), 24×24 box at (10, 60), `#2E2F33` @ 70 %.
* **업로드 button — variant I** (frame I): pill **71 × 38**, radius **19 (full)**, at **(284, 53)**
  → right inset **20**, vertically centred on the 44 nav band (53–91, centre 72). Fill `#FFFFFF`;
  label **"업로드"** `#FE7139`, **15 px**, ink 37.8 × 13.0 centred → h-padding ≈ **17**.
* **업로드 button — variant J** (frame J): pill **54 × 32**, radius **16 (full)**, at **(301, 56)**
  → right inset **20**, centre y 72. Fill `#FE7139`; label **"업로드"** `#FFFFFF`, **13 px**,
  ink 32.8 × 11.3 → h-padding ≈ **10.5**.
* Frames E–H have **no** 업로드 button at all.

**Bottom sheet** (identical in every compose frame; only its `top` moves)

| Anchor | E / F / I / J | G / H (keyboard up) |
|---|---|---|
| Sheet top `S` | **701** | **409** |
| Keyboard | — | **375 × 292** at y 548 (= sheet bottom) |

Sheet internals, all relative to `S`:

| Element | y | Geometry | Fill |
|---|---|---|---|
| Sheet surface | S+0 … S+139 | full width, **top radius 20** | `#FFFFFF` |
| Handle bar | **S+16 … S+20** | **48 × 4**, r2 (full), centred (x 163.5) | `#37383C` @ **16 %** |
| Chip rail | **S+31.5 … S+63.5** | height **32**, first chip x **20**, **gap 6**, chip width **52 (fixed)** | see below |
| Caption band top | S+67 | 375 × 72 white | — |
| Caption field | **S+81 … S+125** | **343 × 44**, radius **16**, at x **16** | `#70737C` @ **8 %** |
| Sheet bottom | S+139 | (= frame bottom in E/F/I/J; = keyboard top in G/H) | — |

**Chip rail** — 7 chips at x 20 / 78 / 136 / 194 / 252 / 310 / **368** (the 7th is clipped by the frame
edge and carries **no label** in the file → the rail scrolls horizontally; the 7th label is *unreadable*,
it does not exist as geometry). Labels, all **13 px**, ink height 11.4 (hangul) / cap 9.4 (latin):

| # | x | Label | Ink w |
|---|---|---|---|
| 1 | 20 | **CKD3** (unselected frames) / **CDK3** (selected frames — typo, §6) | 33.1 |
| 2 | 78 | **CKD4** | 33.4 |
| 3 | 136 | **저당** | 22.0 |
| 4 | 194 | **저염** | 20.8 |
| 5 | 252 | **저칼륨** | 33.0 |
| 6 | 310 | **저단백** | 32.3 |
| 7 | 368 | *(clipped, no label drawn)* | — |

* **Unselected chip**: 52 × 32, radius **16 (full)**, fill **`#F9FAFB`**, border **0.8 px `#70737C` @ 16 %**
  (stroke path inset 0.4), label `#37383C` @ **51 %**, Medium. Label is centred (h-padding ≈ 9.5).
* **Selected chip**: same box, fill **`#FFF4F0` @ 60 %**, border **1 px `#FE7139`**, label **`#FE7139`**.
  Weight does not change.
* Only **one** chip is ever selected in the design (single-select is implied, not proven).

**Caption field** (single line)

| State | Frame | Content |
|---|---|---|
| Empty, unfocused | E, F | placeholder **"100자 이내로 작성해주세요"**, 15 px, `#37383C` @ 51 %, ink x 26.8 → text inset **10** from field left (16) |
| Empty, focused | G | same placeholder **plus caret**: `1.5 × 28` rect at (26, S+89), `#FE7139`; placeholder shifts to ink x 28.2. A **16 × 44 right-edge fade** (`#F2F4F6` 0 % → 100 %) sits at x 327 |
| Typed, focused | H | **"저염식으로 만든 든든한 한끼! 오늘도 건강하게 저염…"** (tail-ellipsised), 15 px, `#2A2A37`, ink x 26.3–335.2; caret at x **347.5** |
| Typed, unfocused | I, J | **"저염식으로 만든 든든한 한끼! 오늘도 건강하게 저염식…"**, 15 px, `#2A2A37`, ink x 26.3–348.2; no caret, no fade |

Text is vertically centred in the 44 field (ink y = fieldTop + 15.6 … + 28.8).
The copy is one line that **ellipsises**, never wraps — the field never grows. **No character counter is drawn**
anywhere, even though the placeholder states the 100-char limit.

**Frame J — confirm dialog**

* Scrim: `375 × 932` **`#171719` @ 20 %** over the whole frame (covers the header 업로드 pill too).
* Card **311 × 161** at **(32, 379)**, radius **24**, fill `#FFFFFF`, **no shadow**.
  (311 = 375 − 2 × 32 → screen padding **32**.)
* Title **"업로드를 취소하시겠어요?"** — **20 px Bold**, `#2A2A37`, ink 203.9 × 17.8 at x 54.7, y 406.0
  → text box left ≈ 53.9 ⇒ **padding-left 22**; ink top = card + 27. One line.
* Body **"지금 돌아가면 변경 사항이 삭제됩니다."** — **15 px**, `#2E2F33` @ 70 %, ink 224.8 × 13.1 at
  x 54.5, y 439.1. Gap title-ink-bottom → body-ink-top = **15.3** (≈ `gap 8` between 27/20 line boxes).
* Buttons, both **48 tall, radius 14**, side padding **16**, gap **7.5 (≈8)**, bottom padding **16**:
  * **아니요** — 136 × 48 at (48, 476), fill `#70737C` @ **8 %**, label `#2E2F33` @ 70 %, **17 px**, ink 43.0 × 15.0 centred.
  * **예** — 135.5 × 48 at (191.5, 476), fill **`#FE7139`**, label `#FFFFFF`, **17 px**, ink 12.8 × 15.0 centred.
  * Order is **secondary left / primary right**; the primary (destructive "yes, discard") is the **brand orange**, not red.

---

## 3. Typography table

| # | Line | Size | v2 line-height | Weight (face) | Colour | Measured ink |
|---|---|---|---|---|---|---|
| T1 | Dialog title `업로드를 취소하시겠어요?` | **20** | 27 | **Bold** | `#2A2A37` | 203.9 × 17.8 |
| T2 | Dialog body `지금 돌아가면 변경 사항이 삭제됩니다.` | **15** | 20 | Medium | `#2E2F33` @ 70 % | 224.8 × 13.1 |
| T3 | Dialog buttons `아니요` / `예` | **17** | 21 | SemiBold | `#2E2F33` @ 70 % / `#FFFFFF` | 43.0 × 15.0 / 12.8 × 15.0 |
| T4 | Picker CTA `등록` | **17** | 21 | SemiBold | `#FFFFFF` | 28.4 × 14.7 |
| T5 | Picker nav title `최근항목` | **15** | 19 | **Bold** | `#000000` | 50.9 × 13.3 |
| T6 | Album menu rows `최근 항목` `비디오` `즐겨찾기` | **15** | 19–20 | Medium | `#2E2F33` @ 70 % | 54.4 / 37.2 / 49.8 × 13.1–13.3 |
| T7 | Camera-tile label `사진` (picker) | **13** | 18 | Medium | `#2E2F33` @ 70 % | 21.3 × 11.4 |
| T8 | Camera-screen mode label `사진` | **13** | 18 | Medium | `#FFFFFF` | 21.1 × 11.3 |
| T9 | Selection index `1` | **≈17** | — | SemiBold | `#FFFFFF` | 4.8 × 12.0 (cap) |
| T10 | Chip labels `CKD3` `CKD4` `저당` `저염` `저칼륨` `저단백` | **13** | 16–18 | Medium | `#37383C` @ 51 % (unsel) / `#FE7139` (sel) | 20.8–33.4 × 9.4–11.4 |
| T11 | Caption placeholder `100자 이내로 작성해주세요` | **15** | 20 | Medium | `#37383C` @ 51 % | 161.0 × 13.2 |
| T12 | Caption value `저염식으로 만든 …` | **15** | 20 | Medium | `#2A2A37` | 308.9 / 321.9 × 13.2 |
| T13 | Header button `업로드` (variant I) | **15** | 19 | SemiBold | `#FE7139` | 37.8 × 13.0 |
| T14 | Header button `업로드` (variant J) | **13** | 16 | SemiBold | `#FFFFFF` | 32.8 × 11.3 |
| T15 | Viewer badge `저염식` (frame A) | **15** | 19 | SemiBold | `#FE7139` | 37.1 × 13.2 |
| T16 | Viewer nickname `신신마스터` | **15** | 19 | SemiBold | `#FFFFFF` | 62.9 × 13.2 |
| T17 | Viewer timestamp `3시간전` | **13** | 18 | Regular | `#FFFFFF` (≈70 % rendered) | 39.8 × 11.4 |
| T18 | Viewer caption (1 line, ellipsis) | **13** | 18 | Medium | `#FFFFFF` | 327.1 × 11.4 |
| T19 | Comment placeholder `댓글을 남겨보세요` | **15** | 20 | Medium | `#37383C` @ 51 % | 105.9 × 13.1 |

Weight column is read visually (Pretendard's hangul advance is nearly weight-invariant, so geometry
cannot prove it): `최근항목` and the dialog title are unmistakably Bold; chip labels are unmistakably
light (Regular/Medium); `등록`, `업로드`, `아니요`/`예` sit at SemiBold.

---

## 4. Colour table

| Element | Hex + alpha (from SVG) | v2 token | Exact? |
|---|---|---|---|
| All bars / sheet / cards / picker bg | `#FFFFFF` | `background.default` · `static.white` | ✅ |
| CTA `등록`, dialog `예`, selection badge, caret, chip border (sel), chip label (sel), `저염식` label, 업로드 label (I) / fill (J) | `#FE7139` | `primary.primary` | ✅ |
| Selected chip fill | `#FFF4F0` @ **60 %** | `primary.primaryWeak` = `#fff4f099` | ✅ **exact** |
| Unselected chip fill · camera tile cell | `#F9FAFB` | `fill.background` (`grayscale.50`) | ✅ |
| Unselected chip border · album card border | `#70737C` @ **16 %** | `line.neutral` `#70737c29` | ✅ |
| Caption field fill · comment input fill · dialog `아니요` fill · viewer progress track | `#70737C` @ **8 %** | `fill.normal` `#70737c14` | ✅ |
| Sheet handle | `#37383C` @ **16 %** | `label.disable` `#37383c29` | ✅ (same value `V2BottomSheet` already uses) |
| Chip label (unselected) · placeholder · comment placeholder · album chevron | `#37383C` @ **51 %** | `label.alternative` `#37383c82` | ✅ |
| Camera glyph (picker tile) · unselected selection circle · avatar glyph · heart/chat glyphs | `#37383C` @ **28 %** | `label.assistive` `#37383c47` | ✅ |
| Close `X` · overflow `⋯` · camera-tile label · album rows · dialog body · `아니요` label | `#2E2F33` @ **70 %** | `label.neutral` `#2e2f33b3` | ✅ |
| Back chevron | `#2E2F33` @ **88 %** | — (nearest `label.normal` `#2a2a37`) | ❌ off-token |
| Caption value · dialog title | `#2A2A37` | `label.normal` | ✅ |
| Picker nav title `최근항목` | `#000000` | `label.strong` | ⚠️ pure black — should be `label.normal` (§6) |
| Dim behind dialog | `#171719` @ **20 %** | `background.dim` `#17171933` | ✅ |
| Shutter inner disc | `#E5E8EB` | — (`grayscale.200`-ish; no semantic) | ⚠️ off-token |
| Camera-flip circle | `#333D4B` | — | ❌ off-token (nowhere else in v2) |
| Camera shutter ring, mode label, story nickname/caption/progress fill | `#FFFFFF` | `static.white` | ✅ |
| Story bottom scrim | `linear(white@0 → #000000)` × 0.3 | — no gradient token | ❌ missing |
| Picker bottom fade | `linear(white@0 → #FFFFFF)`, 36 tall | — no gradient token | ❌ missing |
| Caption right-edge fade (focused, G) | `linear(#F2F4F6@0 → #F2F4F6)`, 16 × 44 | — | ❌ missing (and the hex ≠ the field's own fill) |
| Album popover shadow | `0 16 60 rgba(0,27,55,0.10)` | `elevation[2]` is `0 1 3 rgba(0,27,55,0.10)` | ⚠️ same colour, much larger blur/offset |
| Canvas background (not UI) | `#F2F4F6` | — | n/a |

---

## 5. State machine / interactions

1. **Entry.** Two capture routes are drawn and they are *different screens*:
   * **B (camera)** — leading control is an `X` (dismiss the whole flow);
   * **C/D (library grid)** — leading control is a **back chevron** (pop back to the camera).
   The gallery circle at the camera's bottom-left is the B → C link; the camera tile at grid cell 1
   is the C → B link. So the two form a loop, and only the camera can close the flow.
2. **Album switching.** Tapping the nav title (`최근항목` + chevron) opens the popover (D). It is a
   plain anchored menu — no scrim, no dim, no selected-state marker. Three fixed rows
   (`최근 항목`/`비디오`/`즐겨찾기`), which implies **video is a supported media type in the picker**
   even though nothing else in the flow shows video.
3. **Selection is numbered, not boolean.** Selected cells get an orange ⌀28 badge containing the
   1-based pick index; unselected cells get a grey/white-ringed empty circle. Multi-select is therefore
   implied even though only `1` is ever shown. `등록` is drawn only in its enabled state — no disabled/
   empty-selection frame exists, so the 0-selected treatment is **undefined** by this design.
4. **Compose is a photo + a docked sheet.** After 등록 the picked photo becomes a full-bleed background
   and the editing surface is a 139-tall sheet pinned to the bottom. The sheet has a drag handle,
   which implies it can be dragged — but **no expanded snap point is drawn**, so treat the handle as
   decoration/affordance only unless a second snap is added deliberately.
5. **Chip rail = one meal-type tag.** Unselected → `#F9FAFB` + hairline border; selected → orange-tinted
   fill + orange border + orange label. Exactly one chip is selected in every frame that has one, and
   selecting a chip does **not** change any other element (no counter, no header change).
6. **Keyboard.** Focusing the caption raises the sheet by exactly the keyboard height (292) and docks it
   on top; the sheet's internal layout does not change and the photo is not resized or scrolled.
   Focus is shown by an **orange caret**, not by a border/background change on the field — there is no
   focused-field style. The placeholder stays visible while focused-and-empty.
7. **The 업로드 button appears late.** Frames E–H (no caption typed / keyboard up) have **no** submit
   control at all; it appears only in I/J after a caption exists and the keyboard is down. Read this as
   *"submit is enabled once the required inputs are present"* — but note the design never draws a
   **disabled** submit, it draws **no** submit. Implementing it as "always present, disabled until valid"
   is the safer, more predictable reading (see §6).
8. **Cancel confirm.** Tapping `X` with work in progress dims the screen and shows the confirm card
   (J): `업로드를 취소하시겠어요?` / `지금 돌아가면 변경 사항이 삭제됩니다.` — `아니요` (left, grey,
   stay) / `예` (right, orange, discard). No frame shows the confirm for an *empty* draft, and no
   destructive-red variant is used.
9. **Loading / error / empty.** **None are drawn** in this section — no upload progress, no skeleton for
   the grid, no permission-denied state, no "no photos" empty state. They must be designed from v2
   defaults (skeleton-first, `V2DotLoader` only where a skeleton is impossible).
10. **Viewer (A).** After upload the story is read in the viewer: one continuous progress bar at 28.7 %
    (position in the story set, at the **bottom** of the media), a comment bar with input + heart + chat,
    the `저염식` tag rendered as a white pill at the photo's top-left, and `⋯` for the report/delete menu.

---

## 6. v2 mapping — components, tokens, gaps and conflicts

### 6.1 Direct mappings (no new code)

| Design element | v2 |
|---|---|
| Sheet surface + handle | `V2BottomSheet` — handle is already **48 × 4 / `label.disable` / `radius.full`**, identical to the design |
| Dialog | `V2Modal` `buttonLayout="horizontal"`, title → `typography.title.small` (20 Bold ✅), body → `typography.subtext.large` (15 ✅), buttons → `V2Button size="l"` (48 tall, `radius.xl`=14 ✅, `label.medium`=17 SemiBold ✅), primary `color="brand" variant="fill"`, secondary `variant="weak" color="neutral"` (`fill.normal` ✅), scrim `background.dim` ✅ |
| Picker CTA `등록` | `V2BottomCTA` `layout="single"` → `V2Button size="xl"` (56 tall, `radius["2xl"]`=16 ✅, label 17 ✅), `paddingHorizontal: 20` ✅ |
| Header `업로드` (variant J) | `V2Button size="s"`… ⚠️ s is 32 tall ✅ but `radius.sm`=8 ≠ 16, and `paddingHorizontal` 10 ✅. Use `V2Button size="s"` + `style={{ borderRadius: radius.full }}` |
| Close / back / chevron-down / camera / heart / chat / refresh icons | `V2Icon` with `icon-close`, `icon-chevron-left`, `icon-chevron-down`, `icon-camera`, `icon-heart`, `icon-chat`, `icon-refresh` — all exist in `icons/svg/` |
| Caption field | `V2SheetTextInput` (it exists precisely for inputs inside a gorhom sheet) with `fill.normal` bg, `radius["2xl"]`=16 |
| Comment bar input (frame A) | same, `radius.lg`=12 |
| Dim | `colors.background.dim` |
| Colours | see §4 — 15 of 22 UI fills are token-exact |

### 6.2 Gaps — what v2 cannot express today

1. **Outlined / tinted chip.** `V2Chip` is deliberately **borderless**, unselected = `fill.normal`,
   selected(brand) = **solid orange + white label**. The design's rail is
   `fill.background` + 0.8 px `line.neutral` border, selected = `primary.primaryWeak` + 1 px
   `primary.primary` border + orange label — a third look that the component's `tone` axis
   (`brand` | `neutral`) cannot produce.
   **Smallest addition:** a third tone `tone="brandSoft"` →
   `{ bg: colors.primary.primaryWeak, fg: colors.primary.primary, borderColor: colors.primary.primary }`,
   plus an `outlined?: boolean` that gives the *unselected* state
   `bg: fill.background, borderWidth: 1, borderColor: line.neutral`. Both are additive and default-off,
   so no existing chip changes.
2. **Fixed-width chips.** The design's chips are **52 wide regardless of label** (`저칼륨` and `CKD3` are
   the same width). `V2Chip` sizes by padding. Either accept the intrinsic width (recommended — the
   labels differ by only 12 px of ink) or pass `style={{ width: 52 }}`. Do **not** add a `fixedWidth`
   prop for this.
3. **Numbered selection badge on a photo tile.** Nothing in v2 draws "orange filled circle with an index"
   or "grey circle with a white ring". `V2Badge` is a *label* pill (max radius 12, padding-based).
   **Smallest addition:** a local `PhotoSelectBadge` in the feature folder (28 circle, two states) —
   this is picker-specific and should not enter the DS.
4. **Bottom fade gradient.** `V2BottomCTA` explicitly documents that it *omits* the Figma top gradient and
   uses `paddingTop: 16` instead. The design uses a **36 px white fade with 0 top padding**.
   **Smallest addition:** optional `fadeHeight?: number` on `V2BottomCTA` rendering an
   `expo-linear-gradient` above the bar. Requires `expo-linear-gradient` (already a transitive Expo dep —
   verify before relying on it). If we don't want the dep, keep `paddingTop: 16` and accept the delta.
5. **Story scrim gradient** (frame A) — same problem, no gradient token. Flagged already by `story-page`.
6. **Avatar** (frame A, 40 circle with placeholder person glyph) — no `V2Avatar`; `author-profile` already
   proposes one. Reuse that proposal, add `size: 40`.
7. **Overflow `⋯` icon** — there is no ellipsis-horizontal icon in `icons/svg/`. Add `icon-more.svg`
   (3 dots ⌀2.67, 4.67 apart, 24 box) or keep the current `Ionicons` usage in `stories.tsx`.
8. **Custom camera & custom gallery grid.** `expo-camera` is installed (~55.0.21) so frame B is buildable,
   but the app's photo flow goes through **`expo-image-picker`'s OS picker**
   (`imagePickerService.pickMultipleImages` → `launchImageLibraryAsync`). Frames C/D require reading the
   device library ourselves → **`expo-media-library` is NOT in `package.json`**. Building C/D means a new
   native dep + a new permission prompt + album enumeration. Budget for that or reduce C/D to the OS picker.
9. **Shadow.** The album popover's `0 16 60 rgba(0,27,55,0.10)` has no token (`elevation[2]` is
   `0 1 3`). Either add `elevation[3]` or accept `elevation[2]` — the DS head-note says this system is
   deliberately near-flat, so **prefer the border-only popover with `elevation[2]`**.

### 6.3 Conflicts with v2 rules — flag and fix

| Design | Rule it breaks | On-system equivalent |
|---|---|---|
| `최근항목` in **pure `#000000`** | v2 uses `label.normal` `#2a2a37` for titles; `label.strong` is reserved | Use `label.normal` |
| Back chevron `#2E2F33` @ **88 %** | not a token (0.70 and 1.0 exist) | `label.normal` (or `label.neutral` to match the other nav glyphs) |
| Chip border **0.8 px** | `borderWidth.thin` = 1 | 1 px hairline |
| Dark `X` (`#2E2F33` @70 %) and dark camera glyph **on top of a photo** | contrast is undefined against arbitrary photos | Use `static.white` with a scrim/blur puck, or keep dark + add a top gradient. **Must be decided** — as drawn, a dark photo hides the only way out of the compose screen |
| Chip rail inset **20** but caption field inset **16** in the same sheet | v2 `SHEET_GUTTER` = 24, `GUTTER` = 16; two start lines in one surface is exactly what `layout.ts` forbids | Pick **one**: 20 for both (matches the CTA/rail insets elsewhere in this section) or 16 for both |
| Dialog card **311** wide / text padding **22** | `V2Modal` = maxWidth 320, padding 24 | Use `V2Modal` as-is; the 9 px / 2 px difference is invisible |
| Dialog sheet **top radius 20** | `V2BottomSheet` uses `radius["4xl"]` = 28 | Use 28 (or add `radius["2xl"]` as a prop) — do not hardcode 20 |
| **Two `업로드` variants** (71×38 white/orange in I, 54×32 orange/white in J) for the *same* state | — | **Pick one.** Recommendation: the **orange-fill 54×32** (variant J): brand-coloured, legible over any photo, and matches "one primary per screen". The white pill reads as secondary. |
| Chip label **`CDK3`** in every selected frame (`CKD3` when unselected) | — | **Typo in the design.** Implement `CKD3`. |
| `100자 이내로 작성해주세요` but **no counter drawn** | — | Keep the 100-char limit (`maxLength`), show a counter only if product wants one; the placeholder already states it |
| Camera flip button right inset **57**, shutter/flip/thumb centres 10 px apart | — | Lay the three out on one row, centres at y = 759, flip right inset 20 |

---

## 7. Delta vs the current implementation

Files read: `app/(write)/story/new.tsx` (606 L), `app/stories.tsx` (523 L),
`src/features/recipe/services/imagePickerService.ts`, `src/features/recipe/types/story.ts`,
`src/features/recipe/components/write/writeCopy.ts`.

### 7.1 업로드 편집 — `app/(write)/story/new.tsx`

**Already matches**
* It is a full-screen `X` + centred-ish header + submit-pill layout with a confirm-on-close.
* Confirm-on-close already exists (`showConfirm`, `community.newStory.discardTitle/discardBody`).
* Submit is disabled until a photo is selected — the same intent as the design's late-appearing button.
* Caption placeholder + `maxLength` already exist.

**Must change**
1. **Layout is completely different.** Current: scrolling form (3:4 preview card `marginHorizontal 20`,
   `borderRadius 18`, 72×72 horizontal tile rail, multiline caption box, notice text). Design: full-bleed
   photo + 139-tall docked sheet with a chip rail and a single-line field. This is a rewrite of the
   screen body, not a restyle.
2. **No category chip rail exists.** Add `CKD3 / CKD4 / 저당 / 저염 / 저칼륨 / 저단백` (+1 clipped, unknown).
   ⚠️ **The API has no field for it** — `CreateCommunityStoryInput` is
   `{ imageUri?, imageObjectPath?, caption? }` and `CommunityStory` has no tag/category. A server field
   (and the viewer's badge source) must be added before this rail can do anything. Also note the labels
   **do not match the existing recipe taxonomy** in `writeCopy.ts` (`CKD 3기`/`CKD 4기`/`저인`/`고열량`,
   and no `저당`) — decide whether stories get their own enum or reuse/extend the recipe one.
3. **Caption: multiline 200 → single line 100.** Current `maxLength={200}`, `multiline`, `minHeight 88`,
   counter `{caption.length}/200`. Design: one line, `100자` limit, ellipsis, **no counter**.
   Changing 200 → 100 is a **content-truncating change** — check existing stories/server validation first.
4. **Submit pill.** Current: ink-coloured (`#1D1E20`/`#F4F4F6`) 34 × r17, label 14 px Bold, using
   `SurfacePressable` + legacy `useSurface`. Design: orange (or white) 32–38 pill, 13–15 px, brand colour.
5. **Typography rule violations to fix while rewriting**: every style in this file sets **both**
   `fontWeight` and `fontFamily` and uses negative `letterSpacing` (−0.23 … −0.34) and fractional sizes
   (13.5 / 12.5 / 11.5 / 10.5). v2: face-only weight, `letterSpacing: 0`, integer sizes.
6. **Legacy `useSurface` → `useV2Theme`** and v2 tokens.
7. **Confirm dialog copy.** Design: `업로드를 취소하시겠어요?` / `지금 돌아가면 변경 사항이 삭제됩니다.` /
   `아니요` / `예`, primary = **brand orange**. Current call passes `destructive: true` (danger red) and
   different i18n keys. Update the keys and drop `destructive` — or keep red and flag the design.
8. **Photo source.** Design's route is camera → in-app grid picker. Current route is
   "today/yesterday meal photos rail + OS gallery picker". See 7.3 — the meal-photo rail must survive.

**Must be PRESERVED (not in the design — do not delete)**
* **오늘/어제 식사 기록 사진 후보** (`useDateAnalysis` → `mealCandidates`) and the rule that a server photo
  is sent as a URL and **never re-uploaded** (`isRemote`). This is the whole point of "오늘의 식단".
* The **signed-URL identity fix**: candidates are keyed by `id` (`날짜-끼니` / local URI), not `uri`,
  and `selectedCandidate` re-resolves the freshest URL each render. Deleting this reintroduces the
  "고른 사진이 사라진다" bug (documented in the file header).
* `presentCommunityError(error, { scope: "community-story-create", retry })` — no generic
  "인터넷 연결" fallback (documented decision: it masked 403/`COMMUNITY_ERROR_014`/`FOOD_CAMERA_002`).
* `imageUploadService.uploadImage(uri, "community")` → `objectPath` submit path.
* `isSaving` (`isCreating || isUploading`) with a **saving label** on the submit button.
* The "no meal photos" hint and the `notice` line.
* `hapticSelection()` on tile pick; all `accessibilityRole`/`accessibilityLabel`/`accessibilityState`.
* `KeyboardAwareScrollView` behaviour → must become the sheet-docks-on-keyboard behaviour, but the
  Android `bottomInset = max(insets.bottom, 24)` handling must not be lost.
* Permission handling inside `imagePickerService.ensurePermission` (dialog + settings deep-link +
  `afterModalTransitions`) — any new in-app camera/library must route through the same guarantee.

### 7.2 스토리 뷰어 — `app/stories.tsx` (frame A)

The detailed viewer spec belongs to the `story-page` section; only this section's deltas:

* **Badge:** this section draws the tag as a **60 × 32 / 15 px white pill** at the photo's top-left;
  `story-page` draws **40 × 21 / 10 px Bold**. Pick one (recommend the smaller one — 32 px is a control
  height, not a tag height) and note that **no such tag field exists in `CommunityStory`** today.
* Current viewer is a **black-background, vertically-paged, dark-chrome** screen with a right-side action
  rail (heart + count, eye + views, `⋯`), a **vertical dot column** progress indicator, sort tabs
  (`추천`/`최신`) in the top bar, and a camera button. The design shows a **light** nav bar, a
  **horizontal single continuous progress bar at the bottom of the photo**, and a **comment bar** with
  input + heart + chat.
* **Preserve regardless:** `expiresAt` remaining-time label (`formatRemaining`), views counter,
  like toggle with the spring animation, `useBlockedUsers` / `reportService` / delete-my-story action
  sheet, `V2DotLoader` loading state, empty state, `viewedRef` view-tracking, `initialIndex`/`sort`
  params. **None of these appear in the design** — the design shows only a comment affordance.
* The design's **comment bar implies story comments**, which the current story model does not have
  (`CommunityStory` has likes/views only). New API surface.

### 7.3 카메라 / 피커 — frames B, C, D

* **No equivalent screens exist.** The app uses the OS picker (`launchImageLibraryAsync`,
  `launchCameraAsync`) via `imagePickerService`.
* Building B needs `expo-camera` (present) + a permission path; building C/D needs
  **`expo-media-library` (absent)** for album enumeration (`최근 항목`/`비디오`/`즐겨찾기`) and thumbnails.
* Recommendation: ship E–J against the **existing OS picker** first (zero new native deps, permission
  handling already hardened), and treat B/C/D as a separate, later piece of work.
* If C/D is built: the design's numbered multi-select contradicts the current single-photo story model
  (`pickMultipleImages(1)`, one `imageUri` per story). Decide the max before implementing the badge.

### 7.4 Unreadable / undefined in this design

* The **7th chip's label** (clipped at x 368; the file contains the pill shape but no glyphs) — unknown.
* The **disabled/0-selected** state of `등록`, the **empty/loading/permission-denied** states of the grid,
  any **upload progress** treatment, and the **pressed** state of every control: not drawn.
* Whether the sheet has a second (expanded) snap point: not drawn.
