# `comment-write` — 답글쓰기 (Reply composer screen)

Canvas region: **x 100–3810, y 5840–6910** of `slim.svg` (root viewBox `0 0 4831 14968`).
9 phone frames, all `375 × 932`, all at **y = 5892**, x = `141, 548, 955, 1362, 1769, 2176, 2583, 2990, 3397` (pitch 407).

All numbers below are **@1x px**, measured from the SVG source (rect/path/glyph outline bboxes computed by flattening the path data), not eyeballed.
Font sizes were solved analytically: glyph ink widths/heights were compared against real Pretendard OTF metrics (`assets/fonts/Pretendard-*.otf`, upm 2048, hangul advance 0.864em, cap 0.707em). Every size below fits to ±0.05px, so they are exact, not guesses.

**Frame-relative coordinate system used throughout:** origin = top-left of the 375×932 phone frame. (`frameRelY = svgY − 5892`, `frameRelX = svgX − frameX`.)

---

## 1. Screen inventory

Every frame is the **same screen** (`답글쓰기`) in a different state. There is exactly one screen design here; the 9 frames are its state machine.

| # | SVG (x, y) | Screen | State | Diff vs. neighbour |
|---|---|---|---|---|
| 1 | (141, 5892) | 답글쓰기 | Keyboard up · composer **empty** (placeholder `작성해주세요`, orange caret) · reply list **empty** · only the parent comment shown | baseline |
| 2 | (548, 5892) | 답글쓰기 | Keyboard up · composer **collapsed with a draft** that overflows one line → right-edge fade + **orange ⌀24 chevron-UP button** inside the field | = f1 + draft text + button |
| 3 | (955, 5892) | 답글쓰기 | Keyboard up · composer **expanded** (bar 80→146, field 52→118) showing the *same* draft on 2 lines · **chevron-DOWN button** pinned bottom-right | = f2 expanded; button is the same asset `rotate(180)` |
| 4 | (1362, 5892) | 답글쓰기 | Keyboard up · composer reset to placeholder · **one reply row posted** (grey row, `신신마스터` + `작성자` badge) | = f1 + reply row |
| 5 | (1769, 5892) | 답글쓰기 | **Keyboard dismissed, composer absent**, home indicator visible · **more-menu overlay open** (수정하기 / 삭제하기 / 신고하기) anchored top-right · **수정하기 pressed** (grey rounded highlight) | = f4 minus composer, plus menu |
| 6 | (2176, 5892) | 답글쓰기 | Keyboard up · reply row posted · composer **expanded** with a *longer* draft (`…꼭 부탁드립니다~~~`, still 2 lines) | = f4 + f3's expanded composer |
| 7 | (2583, 5892) | 답글쓰기 | Keyboard dismissed, composer absent · reply row now **2-line body** → row height 98 → **114** | = f5 minus menu, longer reply |
| 8 | (2990, 5892) | 답글쓰기 | Keyboard dismissed, composer absent · menu overlay open · **삭제하기 pressed** | = f7 + menu, highlight moved down 44 |
| 9 | (3397, 5892) | 답글쓰기 | Keyboard dismissed, composer absent · **reply list empty again** (parent comment only) | = f8 after 삭제하기 → the reply is gone |

Duplicate pairs to be aware of:
* **f5 ≡ f8** except which menu row carries the pressed highlight (`y 124–168` vs `y 168–212`) and the reply body length (1 line vs 2 lines).
* **f3 ≡ f6** except the draft string; **the field geometry is identical (118 tall) in both**, so the expanded composer is a *fixed* height, not content-hugged, for ≤2 lines.
* **f1 ≡ f4 ≡ f9** on the parent-comment block; they differ only in what is below it.

⚠️ **f9 keeps the parent's reply counter at `💬 1` even though the reply was deleted.** That is a design oversight, not a spec — decrement it in code.

---

## 2. Layout spec

### 2.1 Screen chrome (identical in all 9 frames)

| Block | Frame-rel Y | Height | Notes |
|---|---|---|---|
| Status bar (mock) | 0 – 50 | 50 | Design assumes **top safe-area = 50**. Time `9:41` ink at x 33.5–61.9. Notch drawn ~177 wide, centered. Use the real `insets.top`. |
| Nav bar | 50 – 94 | **44** | `barHeight.appBarIOS`. Fill `#FFFFFF`. **No bottom hairline / no shadow.** |
| Content (scroll) | 94 – … | flex | Background `#FFFFFF`. |
| Composer bar (keyboard-up frames only) | 560 – 640 (collapsed) / 494 – 640 (expanded) | 80 / 146 | Fill `#FFFFFF`. **No top border.** |
| Keyboard raster (f1,2,3,4,6) | 640 – 932 | **292** | External PNG (`img_*.png`) not shipped with the export — its content (whether the return key reads 전송) is **unreadable**. |
| Home indicator (f5,7,8,9) | 892 – 932 | 40 | White strip 892–925 (33) + bar `134 × 5`, `rx 2.5`, `#191F28`, x 120–254, y 912–917. Bottom safe-area ≈ **34**. |

### 2.2 Header (`답글쓰기`)

* Bar 375 × 44 at y 50, fill `#FFFFFF`.
* **Back chevron** — ink bbox x **18.0 – 28.2** (10.2 w) × y **63.1 – 80.7** (17.6 h); ink centre **(23.1, 71.9)**; bar centre y = 72 ✓ (vertically centred). Filled outline (not a stroke) with round caps, effective stroke ≈ **1.7–2.0**. Colour `#2E2F33` @ **0.88**.
  → A 24-box chevron-left placed at left ≈ 11, or (v2-native) a 44×44 touch target at left 4 whose 24px glyph centre lands at x 26. The 3px difference is inside tolerance.
* **Title `답글쓰기`** — ink x 161.5 – 210.9 (49.4 w) × y 65.6 – 78.8 (13.2 h). Ink centre x = **186.2**, frame centre = 187.5 → **horizontally centred**. `15px SemiBold`, colour `#000000`, lineHeight 19 (line box 62.5–81.5).
* No right-side action of any kind in any frame.

### 2.3 Comment row (parent) — `y 94 – 192`, height **98**

Full-bleed white row, **1px bottom hairline** `#70737C @ 8%` drawn *inside* the row (Figma inner border, masked → exactly 1px at y 191–192).

Horizontal padding: **left 20, right 20** (content left edge = 20; date/`⋯` right edge = 355).

Vertical anchors, measured from the row top (these are exact ink/box centres — build to these):

| Element | Centre Y (row-rel) | Notes |
|---|---|---|
| Name line + `작성자` badge + `⋯` | **+24** | all three share this centre |
| Body line 1 | **+48** | +16 for each further line |
| Meta row (icons + counts + 답글쓰기 + date) | **+77** | |
| Row height | **98** | **+16 per extra body line** (f7 reply = 2 lines = 114) |

Equivalent box recipe that reproduces 98 exactly:
`paddingTop 14 · nameRow 20 (badge 21 overflows ±0.5) · gap 4 · body lineHeight 16 · gap 13 · metaRow 14 · paddingBottom 14`.

Elements:

* **Author name** — `백종원`, ink x 20.9 – 52.6, y 112.7 – 124.1. **13px Medium**, colour `#2E2F33 @ 70%`. Text box starts at x **20**.
* **`⋯` more button** — three dots ⌀2.67, centres at x 338.3 / 343 / 347.7, y 117.85; ink bbox x 337 – 349 × y 116.5 – 119.2. Colour `#37383C @ 51%`. Icon frame **24 × 24** at x 331 – 355, y 105.85 – 129.85 → right inset **20**.
* **Body** — `좋네요 참고하겠습니다`, ink x 20.4 – 135.4 × y 136.6 – 148.1. **13px Medium**, `#2A2A37`, **lineHeight 16**. Text box x 20 → 355 (available width **335**).
* **Meta row** (all colours `#37383C`; text at 51%, the two icons additionally wrapped in `opacity 0.6` → effective **30.6%**):

| Item | Box x | Ink x | Size |
|---|---|---|---|
| Heart (solid, filled) | 20 – 34 | 20.9 – 33.1 | icon ≈ **14 × 14** (ink 12.2 × 11.05) |
| `541` | 36.0 – 57.6 | 36.9 – 55.9 | **13px Regular** |
| Speech bubble (solid, tail bottom-left) | 70 – 84 | 71.1 – 83.0 | icon ≈ **14 × 14** (ink 11.9 × 11.8); a v2 `chat` at 16 matches its ink exactly |
| `1` | 86.0 – 91.7 | 86.7 – 90.1 | **13px Regular** |
| `답글쓰기` | 104.0 – 146.5 | 105.0 – 147.5 | **13px Regular** |
| `2026.07.28` | right-aligned, box right **355** | 289.8 – 353.8 | **13px Regular** |

  Gaps: **icon → its count = 2**, **count → next group = 12**. Date is pushed right (`flex: 1` spacer).

### 2.4 Reply row — `y 192 – 290` (1-line body, height 98) / `192 – 306` (2-line, 114)

Identical anatomy to §2.3 with three differences:

1. **Background** `#70737C @ 5%` (full-bleed, x 0 – 375).
2. **Left padding 32** (content left = 32, i.e. **+12 indent**). Right padding stays **20** — the `⋯`, the date and the body's right wrap edge do **not** indent. Body available width = **323** (verified: f7 line 1 ink = 321.6, wraps after `부탁드`).
3. **`작성자` badge** after the author name.

* Author `신신마스터` — ink x 32.5 – 86.8, 13px Medium, `#2E2F33 @ 70%`; text box 32 → 88.2.
* **`작성자` badge** — pill, x **97 – 137**, y **205.5 – 226.5** → **40 × 21, radius 10.5 (= h/2, full pill)**, fill `#FFF4F0 @ 60%`. Label `작성자` **10px SemiBold**, `#FE7139`, ink x 104.2 – 129.9. Horizontal padding ≈ **7** each side. Gap author→badge = **8**.
  ⚠️ f7 and f8 draw the same badge as **46 × 22 with 12px text** (x 97 – 143, y 205 – 227). Three frames (f4, f5, f6) use 40 × 21 / 10px — **treat 40 × 21 / 10px SemiBold as canonical** and file the other two as designer drift.
* Body — `넵 출처확인 남겨주시면 감사하겠습니다~! 감사합니다` (f4/f5/f6, one line) / `넵 출처확인 남겨주시면 감사하겠습니다~! 감사합니다 꼭 부탁드립니다~~~` (f7/f8, wraps to `…꼭 부탁드` / `립니다~~~`).
* Meta row identical, shifted +12: heart box 32–46, `541` box 48–69.6, bubble box 82–96, `0` box 98–104.4, `답글쓰기` box 116–158.5, date right-aligned at 355.
  Note the reply row **also shows `답글쓰기`** and shows the count as **`0`** (counts are rendered even at zero).

### 2.5 Composer — collapsed (f1, f2, f4)

```
bar   x 0–375   y 560–640   h 80    fill #FFFFFF, no border
field x 16–359  y 574–626   h 52    radius 12, fill #70737C @ 8%
```
* Field side margins **16** (not 20 — the composer does *not* share the list gutter).
* Bar padding: **14 top / 14 bottom** around the 52-tall field.
* **Text row** — clip frame `289 × 28` at x 26, y 586 (field padding **left 10 / top 12 / bottom 12**).
* **Placeholder** `작성해주세요` — **17px Medium**, `#37383C @ 51%`, ink x 27.9 – 115.1 × y 593.0 – 607.9.
* **Caret** — rect `1.5 × 28` at x 26, y 586, fill `#FE7139` (present only in the empty frames f1/f4). → `cursorColor` / `selectionColor` = brand.
* **Draft text** (f2) `넵 출처확인 남겨주시면 감사하겠습니다~! 감사합니다` — **17px Medium**, `#2A2A37`, single line, clipped at x 315.
* **Right fade** — 16-wide linear gradient `#F2F4F6 0% → 100%` (left→right).
  * f2 (button present): x **299 – 315**, y 574 – 618 (44 tall), ending exactly at the button's left edge.
  * f1/f4 (no button): gradient x **327 – 343** *plus* a solid `#F2F4F6` block x **343 – 359**, same y.
* **Action button** (only when the field has text) — `circle ⌀24`, fill `#FE7139`, centre **(337, 600)**; right edge 349 → **10** from the field's right edge; vertically centred in the field. Glyph: white **chevron-up**, ink `10.3 × 6.2`, round caps, stroke ≈ 2, centred in a 24 icon frame. (Equivalent to v2 `chevronDown` rotated, rendered at ~18px.)

### 2.6 Composer — expanded (f3, f6)

```
bar   x 0–375   y 494–640   h 146
field x 16–359  y 508–626   h 118   radius 12, fill #70737C @ 8%
```
* Bar padding unchanged (14 / 14); **the bar grows upward** — its bottom edge stays at 640 (glued to the keyboard).
* **Text block** — measured ink bbox **x 34.6 – 345.1 (310.5 wide), y 523.4 – 559.4 (36.0 tall)**; 36.0 = lineHeight 21 + one line's ink 15.0 → **17px Medium `#2A2A37`, lineHeight 21**, 2 lines. Solving back from the glyph metrics, the text box starts at **x ≈ 33.4 (field + 17.4)** and its first line box top is **≈ 521 (field + 13)**.
  ⚠️ **Padding drift:** the collapsed field puts its text/caret at field + 10/12; the expanded field puts it at field + ~17/13. Nothing else moves. Pick one — recommend **left 10, top 12 in both** (the collapsed numbers are corroborated by an explicit clip frame and the caret rect, so they are the reliable pair).
* Wrap width available in the expanded field = **323** (359 − 26 − 10); the f3/f6 first lines measure 310.5, consistent.
* **Action button** — `circle ⌀24`, `#FE7139`, centre **(337, 592)**: right edge 349 (10 from field right), **bottom edge 604 → 22 above the field bottom**. Glyph: white **chevron-down** — literally the collapsed button's asset with `transform="rotate(180 …)"`.
* Both expanded frames hold exactly 2 lines of text yet are the same 118 tall → **the expanded box is a fixed height for ≤2 lines** (≈ 12 + 2×21 + 16 + 24 + 22). Above 2 lines the design says nothing; grow the box and keep the button pinned bottom-right.

### 2.7 More-menu overlay (f5, f8)

* **Card** — `180 × 152`, `radius 12`, x **155 – 335**, y **114 – 266**.
  * Fill `#FFFFFF` (opaque).
  * Border `1px` inset stroke `#70737C @ 16%` (drawn at x 155.5, y 114.5, 179 × 151, r 11.5).
  * Drop shadow: `dy 16, blur stdDeviation 30 (= Figma blur 60), colour rgba(0, 27, 55, 0.10)`.
  * A Figma `backdrop-filter: blur(11px)` is attached to the same node but is **invisible** under the opaque white fill — ignore it.
* **Position**: right edge = 375 − **40**; top = **114** = exactly the header's bottom (94) + 20 = the parent row's top + 20. The `⋯` icon frame that logically opens it spans x 331–355, y 105.9–129.9, so the card is *not* right-aligned to the button (it sits 20px further left) — treat 155/114 as "anchored under the top-right ⋯, offset (−20, +20)".
* **Items** — 3 × `44` tall, full-width inside the card:
  * `수정하기` y 124 – 168, `삭제하기` y 168 – 212, `신고하기` y 212 – 256.
  * Card padding **10 top / 10 bottom**, **0** between items.
  * Label x box **174.75** (ink 175.5 – 225.3); i.e. **card padding-left ≈ 20**, or item padding-left 16 relative to the highlight rect.
  * Type: **15px Medium**, colour `#2E2F33 @ 70%`. All three the same colour — **삭제하기 is NOT red** in this design.
* **Pressed highlight** — `rect 174 × 44, radius 12, fill #70737C @ 8%`, x **159 – 333** (left inset 4, right inset 2 — asymmetric in the source; use 4/4). f5 highlights row 1, f8 highlights row 2.
* **No scrim/dim** is drawn behind the card: the list underneath is fully visible at full opacity.

---

## 3. Typography table

All Pretendard, **letterSpacing 0** everywhere (nothing in this region uses tracking).

| # | Line / element | Size | Weight (verified against OTF metrics) | lineHeight | Colour | v2 token |
|---|---|---|---|---|---|---|
| T1 | Header title `답글쓰기` | **15** | SemiBold | 19 | `#000000` | `typography.label.small` + `colors.label.strong` |
| T2 | Comment/reply author name (`백종원`, `신신마스터`) | **13** | Medium | 16–18 | `#2E2F33` @70% | `typography.label.xSmallWeak` (13/16 medium) + `colors.label.neutral` |
| T3 | Comment/reply body | **13** | Medium | **16** (proved: row grows exactly 16 per wrapped line) | `#2A2A37` | `typography.label.xSmallWeak` + `colors.label.normal` |
| T4 | Meta counts `541` / `1` / `0` | **13** | Regular | 18 | `#37383C` @51% | `typography.subtext.medium` + `colors.label.alternative` |
| T5 | Meta action `답글쓰기` | **13** | Regular | 18 | `#37383C` @51% | same as T4 |
| T6 | Meta date `2026.07.28` | **13** | Regular | 18 | `#37383C` @51% | same as T4 |
| T7 | `작성자` badge label | **10** | SemiBold | ~15 | `#FE7139` | `typography.caption.xSmall` + `colors.primary.primary` |
| T7b | (f7/f8 variant of the same badge) | 12 | Regular | — | `#FE7139` | off-system drift, do not implement |
| T8 | Composer placeholder `작성해주세요` | **17** | Medium | 21 (28-tall row) | `#37383C` @51% | `typography.label.mediumWeak` + `colors.label.alternative` |
| T9 | Composer draft text | **17** | Medium | **21** | `#2A2A37` | `typography.label.mediumWeak` + `colors.label.normal` |
| T10 | Menu items `수정하기 / 삭제하기 / 신고하기` | **15** | Medium | ~19 | `#2E2F33` @70% | `typography.label.smallWeak` + `colors.label.neutral` |
| T11 | Status-bar `9:41` (system mock) | ~16 | — | — | `#000000` | n/a |

**Note the two-tier scale:** everything in the *list* is 13px; everything in the *composer* is 17px. That 4px jump is deliberate and is the loudest thing in this design.

---

## 4. Color table

| Hex (+alpha) | Composited over white | Used by | v2 token |
|---|---|---|---|
| `#FFFFFF` | — | screen bg, header bar, composer bar, parent comment row, menu card | `background.default` / `static.white` |
| `#70737C` @ **5%** (`0d`) | ≈ `#F7F8F8` | **reply row background** | `fill.alternative` (`#70737c0d`) ✔ exact |
| `#70737C` @ **8%** (`14`) | ≈ `#F4F4F5` | composer field fill, menu pressed-item fill | `fill.normal` (`#70737c14`) ✔ exact |
| `#70737C` @ **8%** | — | 1px row bottom hairline | `line.alternative` (`#70737c14`) ✔ exact |
| `#70737C` @ **16%** (`29`) | — | menu card 1px border | `line.neutral` (`#70737c29`) ✔ exact |
| `#2A2A37` | — | comment body, composer draft text | `label.normal` ✔ exact |
| `#2E2F33` @ **70%** (`b3`) | — | author name, menu item labels | `label.neutral` (`#2e2f33b3`) ✔ exact |
| `#2E2F33` @ **88%** | — | **back chevron only** | ✘ **no v2 token** (see §6 gaps) |
| `#37383C` @ **51%** (`82`) | — | meta text, placeholder, `⋯` dots | `label.alternative` (`#37383c82`) ✔ exact |
| `#37383C` @ 51% × group `opacity .6` = **30.6%** | — | heart & speech-bubble icons | closest: `label.assistive` (`#37383c47` = 27.8%) — 3pt lighter, acceptable |
| `#FE7139` | — | composer action circle, text caret, `작성자` label | `primary.primary` ✔ exact |
| `#FFF4F0` @ **60%** (`99`) | — | `작성자` badge background | `primary.primaryWeak` (`#fff4f099`) ✔ exact |
| `#000000` | — | header title | `label.strong` ✔ exact |
| `#F2F4F6` (0 → 100%) | — | composer right-edge fade gradient | ✘ **off-system here** — this is `grayscale.100`/the canvas colour, not the field fill. Should fade to the field's composited colour instead. |
| `rgba(0,27,55,0.10)`, dy 16, blur 60 | — | menu card drop shadow | check `tokens/elevation.ts`; if absent, add. |
| `#191F28` | — | home-indicator bar (system chrome) | n/a |

Palette sanity: **every single UI colour in this region resolves to a v2 semantic token except the back-chevron alpha and the fade gradient.**

---

## 5. State machine / interactions

```
                       ┌──────────────────────────────────────────┐
     (enter screen)    │ f1  empty draft, keyboard up             │
        ───────────────▶  · placeholder 작성해주세요 + orange caret │
                       │  · no action button                      │
                       └───────────┬──────────────────────────────┘
                                   │ type text
                                   ▼
                       ┌──────────────────────────────────────────┐
                       │ f2  collapsed draft (1 line + right fade)│
                       │     orange ⌀24 chevron-UP appears        │
                       └───────┬───────────────────────▲──────────┘
                        tap ^  │                       │ tap ⌄
                               ▼                       │
                       ┌──────────────────────────────────────────┐
                       │ f3 / f6  expanded draft, field 52 → 118  │
                       │          bar 80 → 146, chevron-DOWN      │
                       └──────────────────────────────────────────┘
                                   │ submit (affordance NOT DRAWN)
                                   ▼
                       ┌──────────────────────────────────────────┐
                       │ f4  reply posted → grey reply row added; │
                       │     composer resets to placeholder       │
                       └───────────┬──────────────────────────────┘
                    dismiss keyboard│
                                   ▼
                       ┌──────────────────────────────────────────┐
                       │ f7  keyboard down, composer NOT DRAWN    │
                       │     (long reply → row 98 → 114)          │
                       └───────────┬──────────────────────────────┘
                            tap ⋯  │
                                   ▼
                       ┌──────────────────────────────────────────┐
                       │ f5 / f8  menu card: 수정하기·삭제하기·신고하기│
                       │ pressed row = grey 174×44 r12 highlight   │
                       └───────────┬──────────────────────────────┘
                          삭제하기  │
                                   ▼
                       ┌──────────────────────────────────────────┐
                       │ f9  reply gone (parent only)             │
                       │     ⚠ parent still reads 💬1 (design bug)│
                       └──────────────────────────────────────────┘
```

Derived behaviour rules:

1. **The action button is presence-gated by text.** Empty draft (f1, f4) → no circle at all. Non-empty (f2, f3, f6) → orange circle. There is no greyed/disabled variant anywhere in this region.
2. **Chevron direction encodes expand/collapse.** f2 (`^`) and f3 (`⌄`) contain the *identical* draft string — f2 clips it with a fade, f3 shows all of it. The f3 glyph is literally the f2 glyph under `rotate(180)`. So: `^` = expand, `⌄` = collapse.
3. ⚠️ **No send affordance exists anywhere in the 9 frames.** Either the keyboard's return key submits (the keyboard raster is an external PNG that was not exported, so this is **unreadable**), or the design is incomplete. **Do not delete the existing send button** — see §7.
4. **A long single-line draft is clipped with a 16px fade, not an ellipsis.** Implement as `numberOfLines={1}` + a gradient overlay, or accept `…`; the fade is the designed look.
5. **Row height is content-driven:** 98 for a 1-line body, +16 per wrapped line (114 at 2 lines). No max-lines / "더보기" truncation appears.
6. **Counts render at zero** (`💬 0` on the reply). Do not hide a zero.
7. **`답글쓰기` appears on the reply row too**, not just on the parent.
8. **Menu is a plain anchored popover**: no dim/scrim, no bottom sheet, no animation cue. Pressed state = grey rounded fill on the item. `삭제하기` is *not* tinted red.
9. **Menu shows all three actions at once** — see §6/§7: this conflicts with the server-authoritative ownership rule and must be made conditional.
10. **No empty state, no skeleton, no error state, no loading state** is drawn. f1/f9 are simply "no replies yet" with blank space — the design does not supply an empty-state illustration or copy. Supply one from v2 (`V2EmptyState`) or leave blank per product call; **do not add a ring spinner** (v2 rule) — use `V2Skeleton` rows if a loading state is needed.
11. **Composer visibility is ambiguous.** 5 frames have it, 4 don't (and f7 has neither a menu nor a keyboard, so "menu open" doesn't explain its absence). Recommendation: keep the composer docked above the safe area at all times — the design gives no affordance to bring it back once hidden.
12. **Keyboard layout:** the composer bar's *bottom* edge is glued to the keyboard top (640) in every keyboard-up frame; when the field grows, the bar grows **upward**. The list is not padded/inset in the design — it simply sits behind. Use `KeyboardStickyView` (already in the codebase) with `offset.opened = bottomInset`.

---

## 6. v2 mapping

| Element | v2 component | Tokens | Gap / conflict |
|---|---|---|---|
| Screen shell | `V2Screen` | `background.default` | — |
| Header | `V2ScreenHeader title="답글쓰기" onBack` | `barHeight.appBarIOS` (44), `typography.label.small`, `label.strong` — **all three already match the measured design exactly** | ⚠️ **Conflict:** `V2ScreenHeader` puts the title *left-aligned next to the back button* (deliberate "Toss style", see its header comment). The design **centres** it. → smallest addition: a `titleAlign?: "left" \| "center"` prop on `V2ScreenHeader` (default stays `left`). Do **not** hand-roll a second header. |
| Back icon | `V2Icon name="chevronLeft" size="md"` | design colour `#2e2f33e0` | ⚠️ **no token for 88% alpha.** Use `colors.label.normal` (`#2a2a37`, marginally darker) — do not hardcode `#2E2F33E0`. If the 88% grey is systematic (it is: 80 occurrences across the whole canvas), propose adding `label.strongWeak = "#2e2f33e0"` to `semanticLight/Dark`. |
| Comment / reply row | no v2 component fits — build `CommentRow` in `features/recipe/components/`. `V2ListRow` is a label+value/chevron row, wrong shape. | padding 20/20 (parent) · 32/20 (reply); bg `fill.alternative` for replies | ⚠️ **Conflict with `layout.ts`:** v2 `GUTTER = spacing[16]`, but this screen (and `theme/surface.ts` `SCREEN_X = 20`) uses **20**. The design is consistent with the legacy 20, not with v2's 16. Flag for the DS owner; implement 20 and note it. |
| Row bottom hairline | `V2Divider` | `line.alternative` (`#70737c14`) — exact | Confirm `V2Divider` renders a 1px (not hairline 0.5) line; the design is 1.0. |
| `작성자` badge | `V2Badge size="xs" color="brand" variant="weak"` | `caption.xSmall` (10 SemiBold) ✔, `primary.primaryWeak` bg ✔, `primary.primary` fg ✔ | Two small deltas: v2 xs uses `radius.sm` (8) and `paddingHorizontal spacing[8]`; design is a **full pill (r 10.5)** with **7** px padding → renders ~42 × 19 instead of 40 × 21. Accept, or add `radius="full"`/`size="xs"` pill variant. |
| `⋯` more button | `V2IconButton` (24 frame, 44 hit area) | `label.alternative` | ⚠️ **`ellipsis`/`more` is NOT in `icons/registry.ts`** (registry has heart, chat, chevron*, trash, report, … but no ellipsis). → add `icon-more-horizontal.svg`: three ⌀2.67 dots, pitch 4.67, centred in a 24 viewBox. |
| Like icon | `V2Icon name="heart" size={14}` | icon colour ≈ `label.assistive` | ⚠️ **v2 `heart` is a heart-with-a-plus (health icon)** — the design uses a plain solid heart. → add `icon-heart-filled.svg` (plain) for likes, and keep `heart` for the health meaning. Also add the outline variant if an un-liked state is needed (design only shows filled). |
| Reply-count icon | `V2Icon name="chat" size={14}` | `label.assistive` | ✔ Shape matches exactly (solid bubble, tail bottom-left). Rendered at 16 its ink is 12 × 12 vs. the design's 11.9 × 11.8 → `size={14}`…`16` both fine. |
| Meta text/date | `V2Text` w/ `typography.subtext.medium`, `label.alternative` | — | — |
| Composer bar + field | no v2 component fits. **`V2TextField` is wrong**: it is `radius.xl` (14), `paddingHorizontal 16`, `typography.body.mediumWeak` (17/26) — the design is r12 / pad 10 / 17-21. Build a `CommentComposer` in the feature, using raw tokens. | field `fill.normal`, `radius.lg` (12) ✔, text `label.mediumWeak` (17/21) ✔ exact, placeholder `label.alternative` ✔, caret `primary.primary` | Field height 52 is not on the `controlHeight` ladder (32/38/48/56). Use the literal 52 — do not snap to 48 or 56, it changes the keyboard-adjacent rhythm. |
| Composer action button | `V2IconButton` in a `⌀24 primary.primary` circle | `radius.full`, `static.white` glyph | ⚠️ **`chevronUp` is not in the registry** (only `chevronDown`). Either add `icon-chevron-up.svg` or render `chevronDown` with `transform:[{rotate:'180deg'}]` — which is exactly what the Figma file itself does. Glyph size ≈ **18** (`V2Icon` accepts a numeric `size`). Hit area must still be ≥44 → wrap in a 44 `Pressable` with the visual circle centred. |
| Right-edge fade | none | — | ⚠️ Needs `expo-linear-gradient` (already a dep? verify). If not worth a dependency, fall back to `numberOfLines={1}` + `ellipsizeMode="tail"` and flag the visual delta. **Fade to the field's composited fill, not `#F2F4F6`.** |
| More-menu popover | ⚠️ **no v2 popover/anchored-menu component exists.** `V2BottomSheet` (the canonical sheet, per house rule) and `V2Modal` are both wrong shapes. | card: `background.default`, `line.neutral` border, `radius.lg` (12); item pressed `fill.normal`, `radius.lg`; labels `label.smallWeak` + `label.neutral` | → smallest addition: a `V2Menu` (anchored popover) = absolutely-positioned card + `Modal transparent` backdrop for outside-press dismissal. **Must host it inside `ModalOverlayHost`** if it goes in an RN `Modal` (house rule). Shadow `dy16 / blur60 / rgba(0,27,55,.10)` → add to `tokens/elevation.ts` if not already there. |
| Keyboard docking | `KeyboardStickyView` (`react-native-keyboard-controller`, already used) | — | — |
| Loading | `V2Skeleton` rows | — | House rule: **no ring spinners.** The design draws none. |

---

## 7. Delta vs. current implementation

Current code: **there is no 답글쓰기 screen.** Replies live inline inside `app/post/[id].tsx` (1577 lines) via `renderComment(comment, isReply)` (line 512) and a `replyingTo` state, with the composer at the bottom of the post-detail screen. `src/features/recipe/components/FreePostTab.tsx` / `PostListItem.tsx` are the list, not this screen.

### 7.1 Already matches

* Screen gutter **20** — `styles.commentsSection.paddingHorizontal: 20` ✔ (and `theme/surface.ts SCREEN_X = 20`).
* Reply indentation exists (`commentReply.marginLeft: 40`) — the *idea* matches, the value doesn't (design = **+12**, not +40).
* Author name is 13px ✔ (but SemiBold today; design is Medium).
* Meta row = heart + count + reply action, `⋯` on the right ✔.
* Send button is a circle with an up-glyph on the right of the field ✔ (but 36 not 24, outside the field not inside, ink-black not brand-orange).
* `KeyboardStickyView` keyboard docking with `bottomInset` ✔.
* Menu actions are exactly 수정/삭제/신고 (+답글) ✔ in substance.

### 7.2 Must change

| # | Now | Design |
|---|---|---|
| 1 | Replies rendered inline in post detail; no dedicated screen | **New route** `답글쓰기` with a centred-title header, showing the parent comment as row 1 and its replies below |
| 2 | Comment row has a **32px circular avatar** with an `Ionicons person` glyph (`styles.commentAvatar`) | **No avatar at all.** Text starts at the gutter |
| 3 | `commentContent` 14.5 / 22 / `letterSpacing -0.29` Regular | **13 / 16 / 0 Medium**, `label.normal` |
| 4 | `commentName` 13 / 18 / `-0.26` **SemiBold** | 13 / 16 / 0 **Medium**, `label.neutral` |
| 5 | `commentActionText` 12 / 16 / `-0.24` Medium; `commentTime` 11.5 | all meta **13 Regular / 0**, `label.alternative` |
| 6 | **Every text style carries `letterSpacing` and `fontWeight` alongside `fontFamily`** (violates two v2 rules: v2 letterSpacing is 0, and weight must come from the face only) | drop both; use `typography.*` tokens |
| 7 | `commentTime` = `formatTimeAgo(...)` ("3시간 전") | **absolute date `2026.07.28`**, right-aligned |
| 8 | Reply indent 40 | **12** (content left 20 → 32) |
| 9 | Reply row has no background | **`fill.alternative` full-bleed grey** |
| 10 | No `작성자` badge | **pill badge next to the author name** on the post author's comments |
| 11 | No row separators | **1px `line.alternative` bottom border on every row** |
| 12 | Like count hidden when 0; reply count not shown at all | **both counts always rendered, including `0`**; the reply-count bubble icon is new |
| 13 | `답글쓰기` action only on top-level comments (`{!isReply && …}`) | shown on **replies too** |
| 14 | Input field r20, pad 14/9, text 14.5/20, minHeight 22 / maxHeight 96, always multiline | **r12, pad 10/12, 17/21, collapsed 52 (1 line + fade) ↔ expanded 118** with an explicit expand/collapse toggle |
| 15 | Send button **36 × 36**, outside the field, `inkBg` (near-black) / `ctaOffBg` when disabled, `Ionicons arrow-up 17` | **24 × 24 circle inside the field**, `#FE7139`, **chevron** ~18, and it **disappears** (not greys out) when the draft is empty |
| 16 | Caret is default colour | **`#FE7139` caret** (`cursorColor`/`selectionColor`) |
| 17 | Input bar has `borderTopWidth: hairline` | **no top border** |
| 18 | Input bar `paddingHorizontal: 16`, field `flex:1` beside a separate button | field is a fixed-inset **343-wide** box (16/16) with the button **inside** it |
| 19 | More-menu is `showActionSheet` (native/bottom action sheet) | **anchored popover card** 180 × 152 at (155, 114), r12, 1px border, `dy16/blur60` shadow, 44-tall rows, grey pressed highlight |
| 20 | All icons are `Ionicons` | `V2Icon` (+ 3 missing assets, §6) |

### 7.3 Design conflicts that the CODE is right about — do not "fix" the code to match the design

* **The menu must stay conditional.** The design draws 수정하기 + 삭제하기 + 신고하기 in one card. The code (`handleCommentMore`, line 461) already does the right thing: `mine ? [답글, 수정, 삭제] : [답글, 신고]`, with `mine` decided by the **server's `isMine`** (`utils/contentOwnership.isMyContent`) — this is a standing house rule ("소유자 판정은 서버 권한", nickname comparison is banned). Keep it: render 2 or 3 rows depending on ownership, and size the card to the row count (`10 + n×44 + 10`).
* **삭제 needs a confirm.** `handleDeleteComment` shows `showConfirm` before deleting. The design jumps straight from f8 to f9; keep the confirmation.
* **Ownership-aware 답글 entry.** The design's menu has no 답글 row (the row's own `답글쓰기` link covers it); the code's action sheet has one. Fine either way — but do not lose `startReplyTo`'s mention seeding (below).

### 7.4 Features present in the CURRENT code that the design does NOT show — **PRESERVE ALL OF THESE**

1. **@mentions, end to end.** `commentMentions.ts` (`findMentionQuery`/`applyMention`/`removeMention`/`retainedMentions`), the `MentionSuggestions` floating list above the input bar, the removable `@nickname` chips row inside the input bar, and `MentionText` rendering inside comment bodies. `startReplyTo()` seeds the draft with `@상대닉 ` — the design's blank `작성해주세요` placeholder must not be read as "delete mention seeding".
2. **Edit mode.** `editingCommentId` + the context strip above the field (`수정 중` / `@X 에게 답장`) with its `×` cancel button. The design has no such strip; it must survive.
3. **Deleted-comment placeholder** (`comment.isDeleted` → muted "삭제된 댓글" text, no meta row, no `⋯`).
4. **Withdrawn author** (`isWithdrawnAuthor` → `탈퇴한 사용자`, and mention seeding suppressed for them).
5. **Like toggling** with `hapticSelection()`, optimistic state and `presentCommunityError` recovery.
6. **Report flow** (`handleCommentReport`, `reportComment`) including the "already reported" (`COMMUNITY_ERROR_011`) and "comment gone" (`008`) paths — the design's `신고하기` row is only the entry point.
7. **Community error mapping** (`presentCommunityError` with `COMMUNITY_ERROR_010` = "the parent comment was deleted while you were replying"), plus `refetchComments()` recovery.
8. **Blocked-user filtering** (`useBlockedUsers` / `blockedNickNames`).
9. **Pull-to-refresh + `useRevalidateOnReturn`** on `COMMUNITY_POST_REFRESH`.
10. **`maxLength={2000}`** on the composer, and the `isCreatingComment || isUpdatingComment` in-flight guard.
11. **Nested `comment.replies` recursion.** The design shows a single reply level; do not hard-code depth 1 without checking the API.
12. **Accessibility labels** on every Pressable (`likeComment`, `commentMore`, `cancelReply`, `removeMention`, …) and `lineBreakStrategyIOS="hangul-word"` on Korean text.
13. **i18n.** Every string above is Korean copy from the design; the code goes through `t("community.postDetail.*")`. Add keys, don't hardcode.

### 7.5 Open questions for the designer

1. **How is a reply sent?** No send affordance is drawn. (Keyboard return key? The keyboard raster is an unexported external PNG.)
2. **Why does the composer vanish in f5/f7/f8/f9?** No affordance re-opens it.
3. `작성자` badge: 40 × 21 / 10px (f4-f6) or 46 × 22 / 12px (f7-f8)?
4. Empty state for "no replies yet" (f1, f9 are blank) — copy + illustration?
5. Loading and error states for the reply list.
6. Un-liked (outline) heart state — only the filled heart appears.
7. f9's stale `💬 1` after deletion — confirm it should decrement.
