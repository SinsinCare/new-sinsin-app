# `meal-169` — 자유글 · 오늘의 식단 상세 (이미지 16:9)

**Canvas region** `x 100–4260, y 9890–10820` of `slim.svg` (root viewBox `0 0 4831 14968`, 1 unit = 1 CSS px @1x).
**Section label** — black band `x 141 … w 4038 … y 9718 … h 131`, white text `자유글- 오늘의 식단 (이미지 16:9)`, Pretendard **Bold ~51.5px** (measured ink 697.9 × 51.9 at `181.3, 9762.5`).

> ⚠️ The label says "16:9" but the photo frame measured on canvas is **375 × 666 = 9:16 portrait** (0.5625). Treat "16:9" as the designer naming the *ratio pair*, not the orientation. **Implement 9:16 portrait (`aspectRatio: 9/16`).**

All numbers below are @1x px. Frames are `375 × 840` at `y = 9943`. Frame-relative coordinates use the frame's top-left as origin. Every value is **measured from the SVG geometry** (rect/path/circle attributes, or pixel row/column ink scans at 8–16× zoom) unless marked *derived*.

Method notes (so numbers can be re-verified):
- Font **sizes** solved from glyph advance widths against `assets/fonts/Pretendard-*.otf` (`hmtx`), ±0.05px.
- Font **weights** solved from stroke-stem width ÷ font-size. Calibrated against CFF `StdVW` (Regular 182 / Medium 222 / SemiBold 262 / Bold 302 per 2048 upem) and against a Latin "1" stem in the section header (7.50px at 51.5px = 0.1456 em ⇒ Bold). Hangul stems run 0.867 × the Latin StdVW, giving thresholds **Regular ≈ 0.077 · Medium ≈ 0.094 · SemiBold ≈ 0.111 · Bold ≈ 0.128** (stem ÷ size).
- Hangul ink height ÷ font-size = 0.872 (used to sanity-check sizes).

---

## 1. Screen inventory

Ten `375×840` frames, all at `y = 9943`, pitch 407. **All ten are the same screen** — *오늘의 식단 자유글 상세* — in ten states. (An 11th grid column exists at `x = 4211` but is outside this section.)

| # | x | Screen | State | Diff vs neighbour |
|---|----|--------|-------|-------------------|
| 1 | 141 | 식단 상세 (immersive photo) | **Resting, caption collapsed to 1 line**, not liked | baseline |
| 2 | 548 | same | **Caption expanded to 2 lines**; whole overlay stack shifts up 16px (bottom-anchored) | = F1 + one caption line |
| 3 | 955 | same | **Liked** — bottom-bar heart becomes solid `#FF4242` | = F2, heart color only |
| 4 | 1362 | same + **action sheet** | 관심없음 / 신고하기 / 취소 sheet over F3; scrim `background.dim` | = F3 + detached sheet |
| 5 | 1769 | same + **comment sheet** | Comment sheet open, **empty state** ("아직 등록된 댓글이 없습니다.") | = F2 + full-width sheet |
| 6 | 2176 | same + comment sheet | **Comment list, 5 rows** (1 root + 2 replies + 2 roots), resting input bar | = F5 with content |
| 7 | 2583 | same + comment sheet | **Keyboard up, composer expanded** — 2 lines typed + brand round button; iOS Korean keyboard image (375×292) | = F6 + keyboard + composer |
| 8 | 2990 | same + comment sheet | **List variant**: 3rd row is a 작성자 reply with a **2-line body** (row 114 tall) and **outline** heart/chat icons + `1,124` | = F6, row 3 replaced |
| 9 | 3397 | same + comment sheet | **더보기 popover open** on that row — 수정하기 / 삭제하기 (삭제하기 pressed) | = F8 + popover |
| 10 | 3804 | same + comment sheet | **Duplicate of frame 6**, byte-identical geometry (only the underlying photo differs: `pattern193` vs `pattern188`) | = F6 |

Frames 1–4 render the base screen; frames 5–10 render the base screen **dimmed** (`#171719` @20% over the whole 375×840) with a sheet on top. The status bar and the app bar stay visible (dimmed) behind every sheet.

Photo assets referenced (all `preserveAspectRatio="none"`, stretched to fill): `img_3.png` … `img_6.png` for the post photos, and **`img_4.png` = an iOS Korean 2-set keyboard screenshot, 750×584 native → drawn 375×292** in frame 7.

---

## 2. Layout spec

### 2.1 Base screen (frames 1–4) — immersive photo detail

Frame-relative, 375 wide.

```
0    ┌───────────────────────────── status bar (50)  [mock; real = safe-area top]
50   ├───────────────────────────── app bar (44), bg #FFFFFF
94   ├───────────────────────────── PHOTO 375 × 666  (9:16)
      │   camera glyph, top-right
      │   … bottom 140px = scrim gradient
760  ├───────────────────────────── comment/like bar (80), bg #FFFFFF
840  └─────────────────────────────
```

**App bar** — height **44**, background `#FFFFFF` (opaque, sits above the photo, not over it).
| element | measured | notes |
|---|---|---|
| back chevron | ink `x 18 → 28.2`, `y 63.1 → 80.7` (10.2 × 17.6) | vertically centred on header centre `y = 72`. Glyph centre `x = 23.1` ⇒ a 24×24 icon box at `x ≈ 11–35`. **Left inset ≈ 11–12**. Fill `#2E2F33` @ **0.88**. |
| more `⋯` | ink `x 337 → 349`, `y 70.5 → 73.2` (12 × 2.7) | glyph centre `x = 343` ⇒ 24×24 box `x 331–355`, **right inset 20**. Fill `#2E2F33` @ **0.70**. |

> The two insets are **not symmetric** (≈12 left vs 20 right). Flagged in §6.

**Photo** — `375 × 666` starting at `y = 94`, full-bleed, no corner radius, `contentFit: cover`.

| element | measured |
|---|---|
| camera glyph (multi-photo indicator) | filled camera path, ink `x 329.3 → 352.6`, `y 117.5 → 138.5` (23.3 × 21). Fill `#2E2F33` @ 0.70. ⇒ 24×24 icon at right/top inset ≈ **20–22** from the photo's top-right corner (photo top + 23.5). |
| bottom scrim | rect `375 × 140` at `y = 620`, `fill = linearGradient(top → bottom)` with stops `white @ opacity 0` → `#000000 @ 1`, and the **rect itself at `fill-opacity 0.3`**. Net: transparent → `rgba(0,0,0,0.30)` over 140px, bottom-anchored to the photo bottom (`y = 760`). |

**Overlay stack** — left padding **20**, **bottom-anchored** (grows upward; the two caption variants prove it: every gap below is identical in both frames).

| element | 1-line caption (F1) | 2-line caption (F2–F10) | size |
|---|---|---|---|
| category chip | `y 643 → 664` | `y 627 → 648` | `40 × 21`, `x = 20` |
| avatar | `y 670 → 710` | `y 654 → 694` | `40 × 40`, `r = 20`, `x = 20` |
| nickname ink | `y 675.1` | `y 659.1` | `x = 66.5`, w 62.9 |
| time ink | `y 694.7` | `y 678.7` | `x = 66.8`, w 39.8 |
| caption ink | `y 724.7 → 736.1` | `y 708.7 → 736.1` | `x = 20.3`, w ≤ 331.6 |
| page indicator | `y 750 → 752` | `y 750 → 752` | see below |

Derived gaps (identical in both variants): chip-bottom → avatar-top **6**; avatar-bottom → caption ink-top **14.7**; caption ink-bottom → indicator **13.9**; indicator-bottom → photo-bottom **8**. Avatar-right (`x = 60`) → nickname text origin (`65.84`) = **6**. Nickname ink-top → time ink-top = **19.6**.

- **Category chip** `저염식` — pill `40 × 21`, **radius 10.5 (fully rounded)**, fill `#FFFFFF` (opaque), label `#FE7139`, label ink `x 27.2 → 52`, `y 649 → 657.9`. Horizontal padding ≈ 7 each side; text vertically centred on the pill centre.
- **Avatar** — `40 × 40` circle, fill `#F9FAFB`; placeholder person glyph ink `28.6 × 34.3` at `x 25.7`, fill `#37383C` @ 0.28.
- **Page / carousel indicator** — track `335 × 2`, `r = 1`, `x = 20`, fill `#70737C` @ 0.08; thumb `96 × 2`, `r = 1`, `x = 20`, fill `#FFFFFF`. Thumb/track = 0.287 (not an integer fraction of the track ⇒ **fixed-width 96 thumb that slides**, not an N-segment page dot rail).

**Bottom bar** — `y 760 → 840` (**80** tall), background `#FFFFFF`, **no top hairline**.

| element | measured |
|---|---|
| input field | `251 × 44`, **`r = 12`**, `x = 20`, `y = 778`. Fill `#70737C` @ 0.08. |
| placeholder `댓글을 남겨보세요` | ink `x 31 → 136.9`, `y 793.6 → 806.7`. Text origin `x = 29.9` ⇒ **padding-left ≈ 10**. |
| heart (filled) | ink `24.6 × 22.1` at `x 288.7, y 789.3` — centre `(300.9, 800.35)` |
| chat (filled) | ink `23.8 × 23.6` at `x 329.2, y 788.1` — centre `(341.1, 799.9)` |

Icon centres are 40.2 apart ⇒ **24px icons with a 16px gap**. Comment-icon box right edge ≈ 353 ⇒ **right padding ≈ 22**. Both icons are vertically centred on the input's centre (`y = 800`).
Heart **not liked**: fill `#37383C` @ `fill-opacity 0.28` × group `opacity 0.6` = **effective α 0.168**. Heart **liked** (F3, F4, F5…): fill `#FF4242`, α 1, **same filled shape** (no outline↔fill swap).
Chat icon is always the muted filled version (α 0.168).

### 2.2 Action sheet — 관심없음 / 신고하기 (frame 4)

Scrim: `375 × 840` `#171719` @ 0.2 over the whole frame.
Sheet: a **detached / floating card**, not a full-width sheet.

| element | frame-relative | style |
|---|---|---|
| sheet card | `x 10 → 365` (**355**), `y 540 → 830` (**290**) | `r = 28` (all four corners), fill `#FFFFFF`. Side margins **10**, bottom margin **10**. |
| grab handle | `x 163.5 → 211.5`, `y 556 → 560` | `48 × 4`, `r = 2`, fill `#37383C` @ 0.16. Top offset **16** from the card top; centred. |
| option 1 `관심없음` (**selected**) | `x 26 → 349` (**323**), `y 584 → 639` (**55**) | `r = 24`; fill `#FFF4F0` @ 0.6; **1px stroke `#FE7139`**; label ink `x 50.3 → 108.2`, `y 604.5 → 619.4`; label colour `#2A2A37`. Padding-left **24** (= radius). |
| option 2 `신고하기` | `x 26 → 349`, `y 655 → 710` (**55**) | `r = 24`; fill `#F9FAFB`; no border; label ink `x 50.5 → 107.1`, `y 675.5 → 690.5`; colour `#2A2A37`. |
| scroll-edge fade | `x 10 → 365`, `y 718 → 754` (**36**) | linear gradient `white @ 0` → `white @ 1`, top→bottom. Sits directly above the CTA ⇒ the option list is scrollable and fades under the footer. |
| CTA `취소` | `x 30 → 345` (**315**), `y 754 → 810` (**56**) | `r = 16`; fill `#FE7139`; label white, ink `x 173.3 → 201.7`, `y 775 → 790`, horizontally centred (`x-centre 187.5` = frame centre). |

Derived vertical rhythm: card-top **16** → handle **4** → **24** → option 1 (55) → **16** → option 2 (55) → **44** → CTA (56) → **20** → card bottom. Card side padding: **16** for options, **20** for the CTA.

### 2.3 Comment sheet (frames 5–10)

Scrim identical to §2.2. The sheet is **full-width**.

| element | frame-relative | style |
|---|---|---|
| sheet | `x 0 → 375`, `y 119 → 840` (**721 tall = 85.8 % of the frame**) | fill `#FFFFFF`; **top corners `r = 20`**, bottom square. |
| grab handle | `x 163.5`, `y 135 → 139` | `48 × 4`, `r = 2`, `#37383C` @ 0.16. Top offset **16**. |
| content region | `y 139 → 768` | list / empty state |
| composer bar | `y 768 → 840` (**72**) | fill `#FFFFFF` |

There is **no sheet title** (no "댓글 12" header) — the first comment row starts immediately after the handle at `y = 139`.

Sheet top offset 119 = status-bar 50 + app bar 44 + **25** of visible photo.

#### 2.3.1 Composer, resting (frames 5, 6, 8, 9, 10)

| element | measured |
|---|---|
| field | `343 × 44`, **`r = 16`**, `x = 16`, `y = 782`. Fill `#70737C` @ 0.08. |
| placeholder `댓글을 남겨보세요` | ink `x 27 → 132.9`, `y 797.6 → 810.7`; text origin `x ≈ 25.9` ⇒ padding-left **≈ 10**. |

Bar padding: **14 top, 14 bottom, 16 horizontal**. No send button, no icons in the resting state.

#### 2.3.2 Empty state (frame 5)

| element | measured |
|---|---|
| illustration | speech-bubble **outline**: rounded rect `x 151.5 → 222.5`, `y 241 → 297` (**71 × 56**, corner `r = 10`) + a downward tail to `y = 310`; three inner rules at `y 256`, `y ~271`, `y ~286`, each ~42 wide. **All strokes `#70737C` @ `stroke-opacity 0.22`, `stroke-width 4`, round caps.** Total ink box **71 × 69**, horizontally centred (`x-centre ≈ 187`). |
| line 1 `아직 등록된 댓글이 없습니다.` | ink `x 100.6 → 269.6` (w 169.0), `y 329.5 → 342.9` |
| line 2 `첫번째 댓글의 주인공이 되어보세요!` | ink `x 82.75 → 290.75` (w 208.0), `y 348.5 → 361.9` |

Both lines centred; **line spacing 19**. Illustration bottom (310) → line-1 ink top (329.5) = **19.5**. The block is **not** vertically centred in the sheet body — its top sits 102 below the sheet top (`y 241`), i.e. roughly one-third down.

#### 2.3.3 Comment row

Row height **98** for a 1-line body, **114** for a 2-line body (Δ = exactly one 16px line). Full-bleed background; **1px bottom border** `#70737C` @ 0.08 drawn *inside* the row (Figma inside-border), edge to edge (x 0 → 375), on **every** row including the last.

| variant | background | content padding-left |
|---|---|---|
| root comment | `#FFFFFF` | **20** |
| reply | `#70737C` @ **0.05** | **32** (= 20 + **12 indent**) |

Right padding is **20** for both variants (date + `⋯` are right-aligned regardless of indent). There is **no avatar** in comment rows.

Vertical structure — three 13 px / 16 lh lines:

```
+0      padding-top 16
+16     ─ line 1: nickname [+ 작성자 badge]        (16)
+32     gap 8
+40     ─ line 2: body                             (16 per line)
+56     gap 13
+69     ─ line 3: meta                             (16)
+85     padding-bottom 13
+98
```
Measured ink tops (root row): nickname **18.7**, body **42.7**, meta labels **71.7** (all = box top + 2.34, the 13/16 ink offset; the whole content is +0.365 off the integer grid — rounding in the export).

Line 1:
- nickname ink `x 20.5`, w 54.4 (`신신마스터`) / 65.6 (`신신부마스터`) / 31.7 (`백종원`).
- `작성자` badge — pill **`40 × 21`**, `r` fully rounded, at `x 83, y 13.5 → 34.5`; fill `#FFF4F0` @ **0.6**; label `#FE7139`, ink `x 90.2 → 115.9`, `y 19.5 → 28.4`. Gap nickname-advance-end → badge = **8**.
- `⋯` more button — ink `x 337 → 349`, `y 22.5 → 25.2`; fill `#37383C` @ 0.51 ⇒ 24×24 box at `x 331–355`, vertically centred on line 1.

Line 2 (body): ink `x 20.4`, colour `#2A2A37`. Wraps at `x ≈ 341.6` (measured longest line 321.6 wide starting at 20.5 → available width 375 − 20 − 20 = **335** for root, 323 for replies).

Line 3 (meta) — root row, ink positions:

| item | ink x | ink y | size |
|---|---|---|---|
| heart icon | 20.9 → 33.2 | 71.6 → 82.7 | **12 × 12** box |
| like count `541` | 36.9 → 55.9 | 72.8 → 82.1 | |
| chat icon | 71.1 → 83.0 | 71.0 → 82.9 | **12 × 12** box |
| reply count `2` / `0` | 86.8 → 92.8 | 72.7 → 82.1 | |
| `답글쓰기` | 107.0 → 149.5 | 71.7 → 83.0 | |
| date `2026.07.28` | 289.8 → 353.7 | 72.7 → 82.1 | right-aligned, right padding 20 |

Derived gaps: icon → its count **4**; count → next group **13.5–14**. Icons vertically centred on the meta line.
Reply rows: identical, all x + 12 (except the date and `⋯`, which stay right-aligned).

**Icon style variants observed** (this is a real inconsistency in the mock, §5):
- Frames 6, 7, 9, 10 and all rows except one: **filled** heart & chat, `#37383C` @ 0.51 × group 0.6 = α **0.306**.
- Frame 8 / frame 9 row 3 only: **outline** heart & chat — `stroke #37383C`, `stroke-width 1.33`, no fill, with `1,124` / `0`.

#### 2.3.4 Comment content (exact copy, in list order)

| # | kind | author | badge | body | likes | replies | date |
|---|------|--------|-------|------|-------|---------|------|
| 1 | root | 신신마스터 | 작성자 | `좋은 레시피에용~` | 541 | 2 | 2026.07.28 |
| 2 | reply | 신신부마스터 | — | `역시 마스터이십니다` | 541 | 0 | 2026.07.28 |
| 3 | reply | 백종원 | — | `좋네요 참고하겠습니다` | 541 | 0 | 2026.07.28 |
| 4 | root | 백종원 | — | `좋네요 참고하겠습니다` | 541 | 0 | 2026.07.28 |
| 5 | root | 백종원 | — | `좋네요 참고하겠습니다` | 541 | 0 | 2026.07.28 |

Frame 8/9 replace row 3 with: **reply · 신신마스터 · `작성자` · `넵 출처확인 남겨주시면 감사하겠습니다~! 감사합니다 꼭 부탁드립니다~~~` (2 lines) · 1,124 · 0 · 2026.07.28**, row height **114**.

Post overlay copy: chip `저염식`, author `신신마스터`, time `3시간전`, caption `저염식으로 만든 든든한 한끼! 오늘도 건강하게 저염식으로 만든 든든한 한끼! 오늘도 건강하게` (F1 truncates after `…만든…`; F2+ shows both lines).

#### 2.3.5 Keyboard-up composer (frame 7)

```
402  ┌──────────────── composer container 375 × 146, bg #FFFFFF
416  │  ┌──────────── input box 343 × 118, r 12, fill #70737C @ 0.08, x 16
     │  │  text (2 lines, 17/21)
     │  │                                   ● send 24⌀
534  │  └────────────
548  ├──────────────── keyboard image 375 × 292 (iOS Korean 2-set + home indicator)
840  └────────────────
```

| element | measured |
|---|---|
| container | `375 × 146` at `y = 402` |
| input box | `343 × 118`, **`r = 12`**, `x = 16`, `y = 416 → 534`; fill `#70737C` @ 0.08 |
| typed text | ink `x 34.6`, line-1 ink `y 431.4 → 442.7`, line-2 ink `y 452.4 → 463.7` ⇒ **line spacing 21**. Text origin `x ≈ 33.2` ⇒ padding-left **≈ 18**; padding-top ≈ 12 (line box top ≈ 428). Wrap width ≈ 311. Colour `#2A2A37`. |
| send button | circle **d = 24** (`r = 12`) centred `(337, 500)` ⇒ box `x 325 → 349`, `y 488 → 512`; fill `#FE7139`. Right margin from the box **10**, bottom margin **22**. |
| send glyph | white **chevron pointing DOWN**, ink `10.3 × 6.2`, centred in the circle. |
| keyboard | `375 × 292` at `y = 548` (asset `img_4.png`, 750×584 @2x) |

The resting `343 × 44` bar is still in the file underneath the keyboard image — it is **replaced**, not stacked.

#### 2.3.6 더보기 popover (frame 9)

Anchored to the `⋯` of comment row 3.

| element | frame-relative | style |
|---|---|---|
| card | `x 155 → 335` (**180**), `y 355 → 463` (**108**) | `r = 12`, fill `#FFFFFF`, **1px border `#70737C` @ 0.16** (inset stroke `r 11.5`). No shadow in the export. |
| item 1 `수정하기` | row `y 365 → 409` (**44**) | label ink `x 175.4 → 225.2`, `y 380.6 → 393.7`; colour `#2E2F33` @ 0.70 |
| item 2 `삭제하기` (**pressed**) | row `x 159 → 333` (**174**), `y 409 → 453` (**44**) | `r = 12`, fill `#70737C` @ 0.08; label ink `x 175.4`, `y 424.6 → 437.7`; colour `#2E2F33` @ 0.70 |

Card padding: **10 top / 10 bottom**, **3–4 horizontal**; rows are 44 tall with **no gap**; row padding-left **16**.
Anchor geometry: card **right edge `x = 335`** (= 40 from the screen right edge, i.e. 8 px left of the `⋯` ink); card **top `y = 355` = the row's top + 20**, roughly level with the `⋯` glyph (`y 357.5`).
`삭제하기` is **not** tinted red — same neutral colour as `수정하기`.

---

## 3. Typography table

`face` = the Pretendard file that must be set via `fontFamily` (never `fontWeight`).

| # | Line / element | Size | Face (measured stem/size) | Line height | Colour |
|---|---|---|---|---|---|
| T1 | Section label `자유글- 오늘의 식단 (이미지 16:9)` (canvas chrome, not UI) | 51.5 | Bold (0.132) | — | `#FFFFFF` on black |
| T2 | Overlay chip `저염식` | **10** | SemiBold (0.112) | — (ink 8.9, centred in a 21 pill) | `#FE7139` |
| T3 | Overlay nickname `신신마스터` | **15** | SemiBold (0.113) | — (ink 13.2) | `#FFFFFF` |
| T4 | Overlay time `3시간전` | **13** | Regular (0.082) | — (ink 11.4) | `#FFFFFF` @ **0.70** |
| T5 | Overlay caption | **13** | Medium (0.096) | **16** | `#FFFFFF` |
| T6 | Bottom-bar placeholder `댓글을 남겨보세요` (base screen **and** sheet) | **15** | Medium (0.092) | — (ink 13.1) | `#37383C` @ 0.51 |
| T7 | Action-sheet option `관심없음` / `신고하기` | **17** | SemiBold (0.114) | — (ink 14.9); row 55 tall | `#2A2A37` |
| T8 | Action-sheet CTA `취소` | **17** | SemiBold (0.111) | — (ink 15.0) | `#FFFFFF` |
| T9 | Empty state, both lines | **15** | Medium (0.092) | **19** | `#37383C` @ 0.28 |
| T10 | Comment nickname | **13** | Medium (0.096) | **16** | `#2E2F33` @ 0.70 |
| T11 | Comment badge `작성자` | **10** | SemiBold (0.112) | — (ink 8.9, centred in a 21 pill) | `#FE7139` |
| T12 | Comment body | **13** | Medium (0.096) | **16** | `#2A2A37` |
| T13 | Comment like/reply counts (`541`, `2`, `1,124`) | **13** | Regular (0.092 — digits; Latin threshold, = Regular) | 16 | `#37383C` @ 0.51 |
| T14 | Comment action `답글쓰기` | **13** | Regular (0.077) | 16 | `#37383C` @ 0.51 |
| T15 | Comment date `2026.07.28` | **13** | Regular (0.092 digits) | 16 | `#37383C` @ 0.51 |
| T16 | Popover item `수정하기` / `삭제하기` | **15** | Medium (0.096) | — (ink 13.1); row 44 tall | `#2E2F33` @ 0.70 |
| T17 | Composer typed text (keyboard up) | **17** | Medium (0.092) | **21** | `#2A2A37` |

`letterSpacing` is 0 everywhere (no tracking is expressible in outlined paths, but no optical tracking is visible; v2's rule of 0 holds).

---

## 4. Color table

Every fill in the section, with the v2 token it maps to (α of the token's hex verified against the measured `fill-opacity`).

| Hex + α (measured) | Where | v2 token | exact? |
|---|---|---|---|
| `#FFFFFF` | app bar, photo-bar bg, sheet bg, popover bg, chip fill, overlay text, CTA label, indicator thumb, send glyph | `background.default` / `static.white` | ✅ |
| `#FFFFFF` @ 0.70 | `3시간전` | `primitives.opacityWhite[700]` (`#ffffffb3`) | ✅ |
| `#FE7139` | chip label, badge label, option border, CTA fill, send circle | `primary.primary` | ✅ |
| `#FFF4F0` @ 0.60 | selected option fill, `작성자` badge fill | `primary.primaryWeak` (`#fff4f099`) | ✅ |
| `#2A2A37` | option labels, comment body, composer text | `label.normal` | ✅ |
| `#2E2F33` @ 0.70 | header `⋯`, camera glyph, comment nickname, popover labels | `label.neutral` (`#2e2f33b3`) | ✅ |
| `#2E2F33` @ 0.88 | back chevron | **none** — closest `label.normal` | ❌ off-token |
| `#37383C` @ 0.51 | placeholders, comment meta text, comment `⋯` | `label.alternative` (`#37383c82`) | ✅ |
| `#37383C` @ 0.28 | avatar person glyph, empty-state text | `label.assistive` (`#37383c47`) | ✅ |
| `#37383C` @ 0.28 × 0.6 = **0.168** | unliked bottom-bar heart, chat icon | `label.disable` (`#37383c29` = 0.161) | ≈ ✅ |
| `#37383C` @ 0.51 × 0.6 = **0.306** | comment meta icons (filled) | **none** — between `alternative` (.51) and `assistive` (.28) | ❌ off-token |
| `#37383C` @ 0.16 | sheet grab handle | `label.disable` (`#37383c29`) | ✅ |
| `#70737C` @ 0.08 | input fields, row bottom border, indicator track, pressed popover row | `fill.normal` / `line.alternative` (`#70737c14`) | ✅ |
| `#70737C` @ 0.16 | popover border | `line.neutral` (`#70737c29`) | ✅ |
| `#70737C` @ 0.05 | reply row background | `fill.alternative` (`#70737c0d`) | ✅ |
| `#70737C` @ 0.22 (stroke) | empty-state bubble illustration | `line.normal` (`#70737c38`) | ✅ |
| `#70737C` (stroke 1.33) | outline heart/chat in frame 8 | — (opacity carried by `stroke-opacity`, ≈ `label.alternative`) | ≈ |
| `#F9FAFB` | avatar circle, unselected option fill | `fill.background` | ✅ |
| `#FF4242` | liked heart | `status.negative` | ✅ |
| `#171719` @ 0.20 | scrim behind both sheets | `background.dim` (`#17171933`) | ✅ |
| `white 0% → #000000 100%`, rect α 0.30 | photo bottom scrim | **none** (gradient) | ❌ |
| `white 0% → white 100%` | action-sheet scroll fade | **none** (gradient) | ❌ |

---

## 5. State machine / interactions

```
                 ┌─────────────────────────────────────────────┐
                 │ F1  resting, caption 1 line, not liked      │
                 └──┬──────────────┬───────────────┬───────────┘
    tap caption ────┘              │ tap ♥         │ tap ⋯ (app bar)
                 ┌─────────────────▼──┐            │
                 │ F2 caption 2 lines │            │
                 └──┬─────────────────┘            │
        tap ♥ ──────▼                              ▼
                 ┌────────────────┐        ┌─────────────────────────┐
                 │ F3 liked (red) │───────▶│ F4 action sheet         │
                 └──┬─────────────┘  ⋯     │  관심없음 / 신고하기 / 취소 │
     tap 💬 or bar ─┘                      └─────────────────────────┘
                 ┌───────────────────────────────────────────────┐
                 │ F5 comment sheet — EMPTY                      │
                 │ F6/F10 comment sheet — LIST                   │
                 └──┬────────────────┬───────────────────────────┘
     tap input ─────▼                │ tap row ⋯ (own comment)
                 ┌──────────────────┐│
                 │ F7 keyboard up,  ││
                 │ composer 118 tall││
                 └──────────────────┘▼
                                   ┌───────────────────────────┐
                                   │ F9 popover 수정하기/삭제하기 │
                                   └───────────────────────────┘
```

What each frame proves:

1. **Caption is expandable.** F1 truncates to one line with `…`; F2 shows two. All other overlay elements are **bottom-anchored** — they translate up by exactly one line height (16), the photo and the indicator do not move.
2. **Like is a colour swap on a filled glyph.** Not-liked = filled grey at α 0.168; liked = filled `#FF4242`. No outline state anywhere on the post-level heart. There is **no like count** on the post-level bar.
3. **The app-bar `⋯` opens a detached action sheet** with two options and a brand `취소` CTA. `관심없음` is drawn in the **selected** look (brand border + brand-weak fill) — with a `취소`-only footer this reads as *pressed/highlighted*, i.e. tapping an option is the commit. There is no `확인` button, so **the option row itself is the action**; the selected look is the press feedback.
4. **The option list is scrollable** — the 36px white fade above the CTA only makes sense if the list can exceed the sheet.
5. **The chat icon (or the input bar) opens the comment sheet**, which covers 86 % of the screen and dims everything behind it. The base screen's app bar stays visible but dimmed.
6. **Empty state**: 72px outline speech bubble + a 2-line muted paragraph, centred, no CTA button. No loading/skeleton frame exists in this section — **loading is unspecified here**; per house rules use a skeleton, never a ring spinner.
7. **Replies are flattened inline** — no "답글 N개 보기" expander. A reply is signalled by (a) a `fill.alternative` row background and (b) a 12px left indent. Only one nesting level appears.
8. **`답글쓰기` is on every row**, root and reply alike — so replying to a reply is allowed (and lands at the same depth).
9. **`작성자` badge** marks the post author, on root comments and replies alike.
10. **Tapping the input raises the keyboard** and swaps the 44-tall single-line bar for a 118-tall multi-line box (`r 16 → r 12`), which grows text to 17/21 and reveals a 24px brand round button. The keyboard is 292 tall; the composer container sits directly on it.
11. **Row `⋯` opens a small popover** (not a bottom sheet) anchored under the button, with `수정하기` / `삭제하기`. `삭제하기` is drawn pressed (`fill.normal` behind it). This popover is only shown on the 작성자 row ⇒ **it's the "my comment" menu**; the design does not show the other-people menu (신고/차단).
12. **F10 = F6** — the flow returns to the resting list after the popover closes.
13. No disabled state is drawn anywhere (the send button is drawn only in the "has text" state).

---

## 6. v2 mapping

### Direct hits (use as-is)

| Design element | v2 |
|---|---|
| Action-sheet option rows | **`V2Option`** — its metrics are an exact match: `paddingHorizontal 24` + `paddingVertical 16` + `title.xSmall` (17/23) ⇒ **55 tall**, `borderRadius radius["3xl"] = 24`, `borderWidth 1`, selected = `primary.primary` border + `primary.primaryWeak` fill, unselected = `fill.background`. ✅ Only deviation: v2 uses `title.xSmall` = 17 **Bold**, design measures **SemiBold** ⇒ `title.xSmallWeak` is Medium, so use `label.medium` (17 SemiBold) if the weight matters, otherwise accept Bold. |
| `취소` CTA | **`V2Button size="xl" variant=fill color=brand`** — `controlHeight.xl = 56`, `radius["2xl"] = 16`, `label.medium` (17 SemiBold), `primary.primary`. Exact match. |
| Sheet grab handle | **`V2BottomSheet`'s handle** — `48 × 4`, `radius.full`, `label.disable`; `handleArea` `paddingTop 16 / paddingBottom 24`. The design's 16 top and 24 gap to the first option are **exactly** these values. |
| Scrim | `V2BottomSheet` backdrop = `background.dim`. Exact. |
| Comment row divider | `V2Divider variant="hairline" tone="alternative"` (`#70737c14`, 1px) — full-bleed, on the row's bottom edge. |
| Reply row background | `colors.fill.alternative`. |
| Input field fills | `colors.fill.normal`, `radius["2xl"] = 16` (sheet bar) / `radius.lg = 12` (base bar and expanded composer). |
| Popover border | `colors.line.neutral`, `borderWidth.thin`, `radius.lg = 12`. |
| Page indicator track | **`V2ProgressBar size="s"`** — height 2, track `fill.normal`, radius 2.5. Exact for the track. |
| Avatar circle | `40 × 40`, `radius.full`, `fill.background`, `V2Icon name="profile"`. |
| Post-level heart / chat | `V2Icon size="md"` (24) `name="heart" | "chat"`; colours `label.disable` → `status.negative`. |
| Camera badge | `V2Icon name="camera" size="md"`, colour `label.neutral`. |
| Back chevron | `V2ScreenHeader` back → `V2Icon name="chevronLeft"`, colour `label.normal`. |
| Send-button glyph | `V2Icon name="chevronDown" size="xs"` (16) inside a 24 circle — the drawn glyph is 10.3 wide, which is what `chevronDown` renders at 16. |
| All typography | see the table below — every style has an exact v2 token. |

### Typography → token map (all exact)

| Design | v2 token |
|---|---|
| 10 SemiBold (chip, 작성자) | `typography.caption.xSmall` (10/15 SemiBold) |
| 13 Regular (`3시간전`, counts, `답글쓰기`, date) | `typography.subtext.medium` (13/18 Regular) — **but the design's meta line is 16, not 18**; if the 98px row height must hold, use `{...subtext.medium, lineHeight: 16}` or `label.xSmallWeak` with the Regular face. |
| 13 Medium, lh 16 (caption, comment nickname, comment body) | `typography.label.xSmallWeak` (13/16 Medium) — **exact, including the 16 line height** |
| 15 Medium, lh 19 (placeholders, empty state, popover items) | `typography.label.smallWeak` (15/19 Medium) — exact |
| 15 SemiBold (overlay nickname) | `typography.label.small` (15/19 SemiBold) — exact |
| 17 SemiBold (option labels, CTA) | `typography.label.medium` (17/21 SemiBold) — exact |
| 17 Medium, lh 21 (composer text) | `typography.label.mediumWeak` (17/21 Medium) — exact |

### Spacing / radius → token map

| Measured | Token |
|---|---|
| 20 (overlay + comment-row gutter) | `spacing[20]` |
| 16 (sheet composer gutter, option inset, meta paddings) | `spacing[16]` = `layout.GUTTER` |
| 12 (reply indent, gap) | `spacing[12]` |
| 8 (nickname→body, nickname→badge) | `spacing[8]` |
| 6 (chip→avatar, avatar→name) | `spacing[6]` |
| 4 (icon→count) | `spacing[4]` |
| 13 (body→meta, row padding-bottom), 14 (meta group gap), 10 (input padding-left), 22 (send bottom margin) | **off-grid** → snap to `spacing[12]` / `spacing[16]` / `spacing[10]` / `spacing[24]` |
| r 12 | `radius.lg` |
| r 16 | `radius["2xl"]` |
| r 24 (option rows) | `radius["3xl"]` |
| r 28 (action-sheet card) | `radius["4xl"]` |
| r 10.5 / full (pills, avatar) | `radius.full` |
| **r 20 (comment-sheet top)** | **no token** — ladder jumps 16 → 24 |

### Gaps — what v2 is missing, and the smallest addition

| # | Gap | Smallest fix |
|---|---|---|
| G1 | **No `⋯` (ellipsis / more) icon** in `icons/registry.ts` (there is no ellipsis glyph at all). Used in the app bar and on every comment row. | Add `svg/icon-more-horizontal.svg` (three 2.7⌀ dots spanning 12 across a 24 box) → `more`. |
| G2 | **No outline heart / outline chat.** `icon-heart.svg` and `icon-chat.svg` are both filled. Frame 8 draws outline versions (`stroke-width 1.33` at 12px ⇒ 2.67 at 24). | Add `heartOutline` + `chatOutline` to the registry (mirrors the existing `bookmark` / `bookmarkFilled` pair). |
| G3 | **`iconSize` has no 12.** Comment-meta icons are 12×12; the smallest token is `xs = 16`. | Add `"2xs": 12` to `tokens/size.ts` — or accept 16 and re-space the meta row (this changes the 98px row height). |
| G4 | **`V2BottomSheet` has no detached/floating variant.** The action sheet is a card inset 10 on the sides and 10 from the bottom, `r 28` on **all four** corners. v2's sheet is full-width with only top corners rounded. | Add `floating?: boolean` → pass gorhom's `detached` + `bottomInset={10 + insets.bottom}` + `style={{ marginHorizontal: 10 }}` + `backgroundStyle.borderRadius = radius["4xl"]`. |
| G5 | **`V2BottomSheet` cannot be a fixed-height sheet.** The comment sheet is a fixed **86 % of the screen** with an internal scroll and a docked composer; v2's sheet is `enableDynamicSizing` only. | Add an optional `snapPoints?: (string|number)[]` escape hatch that turns off `enableDynamicSizing`, plus a `footer` slot for the composer (gorhom's `footerComponent` already keyboard-follows). |
| G6 | **Radius 20 is not on the ladder** (comment-sheet top corners). | Snap to `radius["3xl"] = 24` (a 4px difference on a 375-wide sheet is imperceptible) rather than adding a token. Do **not** use v2's default 28 — that's visibly rounder than drawn. |
| G7 | **No scroll-edge fade primitive** (36px `white 0 → white 1` above the action-sheet CTA). | Inline `expo-linear-gradient` in the sheet footer; not worth a component until a second use appears. |
| G8 | **`V2EmptyState` shape doesn't match.** It renders `title` in `title.small` (20 **Bold**, `label.normal`) + `description` in `body.mediumWeak` (17 Regular), with a 40px `V2Icon`. The design is a **72px outline illustration** + a **single 2-line 15 Medium `label.assistive` paragraph with no bold title**. | Either (a) add `variant="quiet"` to `V2EmptyState` (title → `label.smallWeak` + `label.assistive`, no separate description) and an `illustration?: ReactNode` slot that bypasses the 40px icon cap; or (b) compose this one inline. (a) is preferable — this "muted paragraph" empty state will recur. |
| G9 | **`V2ProgressBar` has no white fill.** The indicator thumb is `#FFFFFF` (it sits on a photo); the component's `color` union is brand/danger/success/neutral. | Add `"static"` to `V2ProgressBarColor` → `colors.static.white`. |
| G10 | **No "text over photo" scrim primitive.** | Inline `expo-linear-gradient` (`transparent → rgba(0,0,0,0.3)`, 140 tall). Consider a shared `V2PhotoScrim` if the story/feed sections need the same. |
| G11 | **No anchored popover / dropdown component.** `V2Modal` and `V2BottomSheet` are both centred/bottom surfaces. Frame 9 needs a 180×108 card anchored to a row's `⋯`. | Small new `V2Popover` (measure the anchor, render in a `Modal` with a transparent backdrop). Alternatively route this to `showActionSheet` — but that changes the interaction the design specifies. |

### v2-rule conflicts to fix on the way in

| Conflict | On-system equivalent |
|---|---|
| Back chevron `#2E2F33` @ **0.88** — no token. | `colors.label.normal` (`#2a2a37`). |
| Comment-meta filled icons at **α 0.306** — between `alternative` and `assistive`. | `colors.label.assistive` (0.278) — matches the neighbouring text weight better than `alternative`. |
| Base bottom-bar input `r 12` vs sheet input `r 16` vs expanded composer `r 12`. | Pick **one**: `radius["2xl"] = 16` for both resting bars, `radius.lg = 12` for the expanded multi-line box (the design's own split), or unify all three at 16. |
| Composer typed text **17**/21 but the placeholder is **15**/19 ⇒ the text jumps a size when you start typing. | Use **15/19 (`label.smallWeak`)** for both, or 17 for both. 15 matches the resting bar and the rest of the sheet. |
| App-bar insets 12 (left) vs 20 (right). | `V2ScreenHeader`'s own symmetric gutter (`layout.GUTTER = 16`). |
| Header height **44** — matches `barHeight.appBarIOS`; Android should use 54. | `V2ScreenHeader`. |
| Row padding-bottom 13 / meta gap 13–14 / input padding-left 10 / send bottom margin 22. | `spacing[12]` / `spacing[16]` / `spacing[12]` / `spacing[24]`. Re-derive the row height afterwards (98 → 100 if padding-bottom goes 13→16 and the gap 13→12; decide once and keep the two-line delta at exactly one 16px line). |
| The **chevron-DOWN** send glyph reads as "collapse/dismiss", not "send". | Use `arrowBack` rotated, or add an `arrowUp`/`send` icon. Do **not** ship a down-chevron as the submit affordance. |
| Copy voice: the design uses 합쇼체 (`아직 등록된 댓글이 없습니다.`, `첫번째 댓글의 주인공이 되어보세요!`), while the shipped `ko/common.json` is 해요체 (`아직 댓글이 없어요`, `첫 댓글을 남겨 보세요`). | Keep the app's 해요체 unless product explicitly wants the switch; **do not mix the two in one screen.** |

---

## 7. Delta vs the current implementation

Current code: **`app/post/[id].tsx`** (1606 lines) is the whole screen — app bar, scroll body, comment list, and sticky composer. Supporting: `src/features/recipe/components/{MentionText,MentionSuggestions,PollCard,TagChips}.tsx`, `hooks/usePostDetail.ts`, `utils/{commentMentions,timeAgo,postRanking,contentOwnership}.ts`.

### Already matches

- Avatar sizes 40 (author) / comment rows use 32 — the 40 is right for the overlay.
- Comment nickname is 13px; the reply indent exists (`commentReply.marginLeft: 40`).
- Comment more (`⋯`) exists per row, and post-level `⋯` exists in the app bar.
- Like/heart animates with a spring on tap (`HEART_SPRING`) — keep; the design doesn't contradict it.
- Comment likes and reply affordances exist per row.
- Sticky composer already keyboard-follows (`KeyboardStickyView` with `bottomInset`).

### Must change

| # | Now | Design |
|---|---|---|
| D1 | Vertical **scroll page**: app bar (52) → author row → title → body → images → tags → poll → like row → grey band → comments inline → related posts → sticky input. | **Immersive photo screen**: 44 app bar over an opaque white bar, then a **full-bleed 375×666 (9:16) photo** occupying the rest, with an overlay stack at the bottom and an 80px action bar. Everything textual lives on the photo or in a sheet. |
| D2 | App bar 52 tall, `paddingHorizontal 16`, right cluster = share + bookmark + `⋯` (gap 18). | App bar **44**; right cluster is **`⋯` only**. (Share/bookmark must move — see "preserve" below.) |
| D3 | Post images: `aspectRatio 4/3`, `borderRadius 14`, inside `paddingHorizontal 20`; multiple images = a horizontal 200×200 strip. | Single **full-bleed 9:16** photo, no radius, with a **96/335 progress-style indicator** for a swipeable carousel and a **camera glyph** at the top-right. |
| D4 | Title (20 Bold) + body (15.5 Regular) as separate blocks in the scroll. | **No title field is drawn.** One 13px caption line, expandable to N lines, over the photo, `#FFFFFF`. |
| D5 | Author row: avatar 40 + name 14.5 SemiBold + `카테고리 · 시간` 12.5 Medium + chevron, on the canvas. | Avatar 40 + name **15 SemiBold white** + `3시간전` **13 Regular white@70 %**, **over the photo**, with a separate **category chip pill above the avatar** (white pill, brand label, 40×21). |
| D6 | Like is a pill button with a count (`좋아요 {n}`) next to a view count. | **No count, no pill** — a bare 24px filled heart in the bottom bar; liked = `#FF4242`. A 24px chat icon sits next to it. |
| D7 | Comments are **inline in the page scroll**, under a `댓글 {n}` heading, indented replies with 32px avatars. | Comments live in a **86 %-height bottom sheet** with no heading and **no avatars**; replies are full-bleed rows with `fill.alternative` background + 12px indent. |
| D8 | Comment row: avatar + [name · time] + body + [♥ n · 답글]; `⋯` at the row's right. | Row is **98 tall** (114 for 2-line): line 1 `nickname [작성자]` + `⋯`; line 2 body; line 3 `♥ n · 💬 n · 답글쓰기` (left) and the **date `2026.07.28`** (right). No avatar, no relative time — an **absolute date**. |
| D9 | Reply indent `marginLeft 40`, same white background. | Indent **12**, background `fill.alternative`. |
| D10 | `⋯` on a comment opens **`showActionSheet`** with `답글 / 수정 / 삭제` (mine) or `답글 / 신고` (others'). | An **anchored popover** (180×108, `r 12`, 1px border) with `수정하기 / 삭제하기`. |
| D11 | Post `⋯`: mine → action sheet `수정 / 삭제`; others' → jumps straight to the 5-reason report sheet. | A **detached bottom sheet** `관심없음 / 신고하기` + brand `취소`. **`관심없음` (not interested / mute) does not exist in the app at all** — new behaviour, needs an API. |
| D12 | Empty comments: `아직 댓글이 없어요` (14.5 SemiBold) + `첫 댓글을 남겨 보세요` (12.5 Regular), `paddingVertical 36`. | 72px outline speech-bubble illustration + 2 lines at 15 Medium `label.assistive`, spacing 19, and the copy is different (§6 voice conflict). |
| D13 | Composer: `inputField` `r 20`, `paddingH 14/ paddingV 9`, `commentInput` 14.5/20, `maxHeight 96`, plus a 36⌀ ink-coloured **send button with `arrow-up`** always visible. | Resting = a **343×44 `r 16`** field with **no button**; focused = **343×118 `r 12`** with 17/21 text and a **24⌀ brand circle** button at the bottom-right (10 right / 22 bottom). |
| D14 | Bottom bar sits directly on the page; `borderTopWidth: hairline`. | **No top hairline** on either bar. |
| D15 | Screen gutters are 20 in the body, 16 in the input bar. | Overlay + comment rows **20**; sheet composer **16**. Same split, but make it deliberate. |
| D16 | Ionicons throughout (`chevron-back`, `ellipsis-horizontal`, `heart`, `heart-outline`, `person`, `share-outline`, `bookmark`, `arrow-up`, `close`). | v2 `V2Icon` set — needs G1/G2 additions before the swap is complete. |
| D17 | Fonts are hand-rolled (`fontSize 14.5`, `letterSpacing -0.29`, `fontWeight` + `fontFamily` both set). | **v2 typography tokens, `letterSpacing 0`, face-only weights.** Every negative tracking in `app/post/[id].tsx` must go. |

### Present in the code, absent from the design — **PRESERVE, do not delete**

The design frames show a stripped "오늘의 식단" happy path. Everything below is live behaviour that the mock simply doesn't depict:

1. **Share** (`handleShare`, `shareContent`, `communityPostDeepLink`, `STORE_REDIRECT_URL`) and the app-bar share button.
2. **Bookmark** (`togglePostBookmark`, filled/outline bookmark icon).
3. **View count** (`community.postDetail.viewCount`).
4. **Post title and body text** — the design shows only a caption; the data model still carries `post.title` / `post.description`.
5. **Tags** (`TagChips`) and tag navigation (`handleTagPress` → `/community?tag=`).
6. **Polls / votes** (`PollCard`, `castVoteAsync`, `isVoting`, the 4-way vote error taxonomy in `handleVote`).
7. **이어 읽을 글 / related posts** (`rankRelatedPosts`, `relatedPosts` section).
8. **@Mentions end-to-end**: `MentionSuggestions` float above the bar, confirmed mention chips inside the bar, `applyMention` / `removeMention` / `findMentionQuery` / `retainedMentions`, and the "reply seeds `@name `" behaviour in `startReplyTo`.
9. **Reply / edit context strip** above the composer (`답글 쓰는 중` / `수정 중` + an ✕ to cancel).
10. **Full-screen image preview modal** (`previewImage`, `AppModal`, 92 % black overlay, close ✕). The design's carousel does not replace it.
11. **Comment report** with the 5-reason sheet (`SPAM / HARASSMENT / INAPPROPRIATE_CONTENT / FALSE_INFORMATION / OTHER`) and the "이미 신고함" (`011`) path.
12. **Delete confirmations** (`showConfirm`, destructive) for both post and comment.
13. **Ownership rules** — `isMyContent` (server `isMine`, never nickname comparison), `WITHDRAWN_AUTHOR_NAME` / `isWithdrawnAuthor` rendering, `삭제된 댓글이에요` placeholder for `comment.isDeleted`, and the "no `⋯`, no actions on deleted comments" rule.
14. **Blocked users** (`useBlockedUsers`) filtering related-post candidates.
15. **Pull-to-refresh** (`useRefreshable`, `COMMUNITY_POST_REFRESH`, `useRevalidateOnReturn`) and the deliberate "feed is *not* in this scope" decision documented in the file header.
16. **Error resilience**: `isError && post` keeps the article visible instead of swapping in an error screen; `presentCommunityError` maps each community error code to a refresh action.
17. **Comment loading / comment-error / retry** states inside the comment section.
18. **i18n** — every string goes through `t()`. The Korean copy in this spec is the *ko* value; add matching *en*.
19. `keyboardShouldPersistTaps="handled"` + `keyboardDismissMode` interactive/on-drag, and the Android `bottomInset = max(insets.bottom, 16)` fix.
20. `afterModalTransitions()` before `router.push` / `router.back()` after any sheet dismiss (the native-modal serialization gate).

### Suggested implementation order

1. Land the token/icon additions (G1, G2, G3, G9) — they're additive and unblock everything.
2. Rebuild the photo screen (§2.1) behind a flag: app bar, 9:16 carousel + indicator + camera badge, scrim, overlay stack, action bar. Keep the existing data plumbing.
3. Move the comment list into a fixed-height `V2BottomSheet` (G5) with the docked composer; port `renderComment` to the 98/114 row (§2.3.3), keeping mentions, deleted-comment, withdrawn-author and ownership rules.
4. Swap the two menus: `V2Option`-based detached sheet for the post `⋯` (G4), and a `V2Popover` for the comment `⋯` (G11) — or keep `showActionSheet` for the comment menu and note the deviation.
5. Relocate share / bookmark / tags / poll / related posts / title / body — the design gives them no home, so this needs a product decision **before** step 2, not after.
