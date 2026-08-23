# 자유글 — 작성자 프로필탭 / 신신이웃 · 픽셀 스펙

Section header on canvas: black bar `자유글-작성자 프로필탭` at x 2031–3632, y ≈ 7022–7148.
Region: x 1950–3710, y 7190–8220. All numbers are **@1x CSS px measured from the SVG source**
(`slim.svg`, viewBox 0 0 4831 14968, 1 unit = 1 px). Frame-local coordinates are given as
`x = frameLeft + n`. Type sizes were derived by rendering the same string in Pretendard at
100 px and dividing ink widths — they are measurements, not guesses.

---

## 0. Method / calibration notes

* Frame background rects are `<rect width="375" height="932" transform="translate(X 7255)">`.
  Four frames in this section: **x = 2035, 2442, 2849, 3256**, all at **y = 7255**, all **375 × 932**.
* Each frame is clipped (`clip318`, `clip331`, …). Content that scrolled above the viewport is
  still in the file but hidden by an opaque overlay — see §1 frame A/B.
* Text is outlined; the exact strings below were read from 4×–8× renders. Nothing in this section
  was unreadable.
* Font-size derivation: ink-width(design) ÷ ink-width(Pretendard @100 px) × 100. Results cluster
  cleanly on **10 / 13 / 15 / 17 px** — the v2 scale.

---

## 1. Screen inventory

| # | Frame origin | Screen | State |
|---|---|---|---|
| A | (2035, 7255) | 작성자 프로필 (author profile) | **Scrolled to the bottom.** Author's post list has ended; sticky white top chrome covers the tail of the list. Shows: `게시글 더보기` pill → `추천 게시글` list (5 rows) → full-width `더보기` row → `이런 작성자도 만나보세요` horizontal card rail (3 cards). |
| B | (2442, 7255) | 작성자 프로필 | **Same scroll position, alternative "more" treatment.** Identical to A above y = 7830. Differences: (1) the 추천 게시글 footer is an outlined pill `인기글 더보기 ›` instead of A's full-width `더보기 ›` row; (2) `이런 작성자도 만나보세요` shows **one** card plus a `더보기 ›` pill to its right instead of a 3-card rail. Everything below y 7830 sits 6 px higher than in A. |
| C | (2849, 7255) | **신신이웃** (author directory) | Default. Centered header title, horizontal category chip rail (nothing selected), 8 user rows. |
| D | (3256, 7255) | 신신이웃 | **`전체` chip selected** (brand outline + brand text + brand tint fill). Only two other deltas vs C: row 2's follow button label flips `팔로우` → `팔로잉` (same tint style). Everything else is pixel-identical. |

A and B are **design alternatives (A/B options) for the same scroll position**, not sequential states.
C and D are a real state pair (chip unselected → selected).

**The profile header itself (아바타 · 닉네임 · 후기/팔로워/팔로잉 counts · 팔로우 버튼) and the
후기/게시글/스토리 tabs are NOT drawn in this section.** They are scrolled off the top in frames A/B.
Do not invent them from this section — take them from whichever section shows the unscrolled profile.

---

## 2. Frames A & B — 작성자 프로필 (scrolled)

Coordinates below are for frame A (`frameLeft = 2035`, `frameTop = 7255`). Frame B = same
`x` offsets at `frameLeft = 2442`.

### 2.1 Chrome

| Block | y (abs) | y (rel) | Size | Notes |
|---|---|---|---|---|
| Status bar | 7255–7302 | 0–47 | 375 × 47 | iOS notch rect 183 × 30 at x = frameLeft+96, y 7253 (bleeds 2 px above the frame). Time `9:41` ink at x+33, y 7272 (~16 px SF). Signal/wifi/battery ink 2328–2392 (frameLeft+293…+357). |
| App bar | 7302–7349 | 47–94 | 375 × 47 | **Opaque white overlay** `rect 375 × 94 @ (frameLeft, 7255)` — it is painted *after* the scroll content, so content scrolls **under** it (the `게시글 더보기` pill below is visibly clipped along its top edge). |
| Bottom safe bar | 8147–8187 | 892–932 | 375 × 40 white | Home indicator 134 × 5, r 2.5, `#191F28`, at x+120, y 8167. The iOS home-indicator container is 375 × 33/34 inside it. Content also scrolls **under** this bar. |

App bar contents (no title in this state):

* **Back chevron** — glyph ink 10.2 × 17.6 at x = frameLeft + 18, y 7318.1–7335.7; ink centre (frameLeft + 23.1, 7326.9). Colour `#2E2F33` @ 0.88. Read as a 24 px icon, left inset ≈ 11–12, vertical centre = bar centre (7325.5).
* **Overflow `⋯`** — 3 dots, ink 12.0 × 2.7 at x = frameLeft + 337 … +349, y 7325.5. Colour `#2E2F33` @ 0.70. Read as a 24 px icon box at 20 px right inset.
* Left/right insets are **asymmetric in the source** (back ink 18 from left, `⋯` ink ends 26 from right). Normalise to a 20 px gutter with 24 px icon boxes.

### 2.2 Author-posts list footer — `게시글 더보기 ›` pill

* Pill: **111 × 32**, radius **16 (full)**, at x = frameLeft + 132 … +243 (horizontally centred:
  centre 2222.5 = frame centre), y **7340–7372**.
* Fill `white`; border **1 px `#70737C` @ 0.22**.
* Label `게시글 더보기` — **13 px**, colour `#2E2F33` @ 0.70, ink x+144.8 … +213.6, y 7350.7–7362.1.
* Trailing chevron-right, ink **4.5 × 7.3** at x+224.9, y 7352.3, `#37383C` @ 0.51.
  Label→chevron ink gap 11.3; chevron ink → pill right edge 13.6.
* **The top ~9 px of this pill are hidden under the app bar** (pill top 7340 < app-bar bottom 7349).
  This is the scroll-under proof; in code the pill is an in-list footer, not header chrome.
* 16 px of white below the pill, then:

### 2.3 Section band + section title

| Element | y (abs) | Size | Fill |
|---|---|---|---|
| Grey section band | 7388–7396 | 375 × 8 | `#F7F7F7` |
| (white gap) | 7396–7404 | 8 | white |
| Section title block | 7404–7451 | 375 × 47 white | title ink vertically centred |
| Title `추천 게시글` | ink 7420.4–7435.5 | ink w 76.5 | **17 px Bold**, `#2A2A37`, ink left x = frameLeft + 20.4 |

### 2.4 `추천 게시글` list rows

Five rows, **76 px tall each**, full-bleed white, 1 px hairline `#70737C` @ 0.08 on each row's bottom
edge (no inset). Row tops: **7451, 7527, 7603, 7679, 7755**; hairlines at 7526, 7602, 7678, 7754, 7830.

Row content (relative to row top `T`, frame gutter 20):

| Element | Position | Size / style |
|---|---|---|
| Title | ink x = frameLeft + 20.5, y = T + 18.1 | **15 px**, `#2A2A37`, single line, ellipsised when a thumbnail is present |
| Meta row | ink y = T + 45.7 | **13 px**, `#37383C` @ 0.51 |
| Thumbnail (optional) | x = frameLeft + 295, y = T + 7.5 | **60 × 60, radius 8**, photo fill (right inset 20, vertically centred: (76−60)/2 = 8) |
| Multi-image badge (row 3 only) | circle centre (frameLeft + 337, T + 49.5) | **20 × 20 circle**, fill `#37383C` @ 0.51, label `2` **13 px white**; 8 px inset from the thumbnail's right and bottom edges |

Meta row internals (ink x, frame-relative), all `#37383C`:

| Token | ink x | ink w | Notes |
|---|---|---|---|
| `조회` | +20.5 | 20.5 | @ 0.51 |
| `3,291` | +47.8 | 30.0 | @ 0.51 |
| heart icon | +92.9 | 12.3 × 11.1 | wrapped in `<g opacity="0.6">` → effective alpha 0.51 × 0.6 ≈ **0.31** |
| `541` | +108.9 | 19.0 | @ 0.51 |
| comment-bubble icon | +143.1 | 11.9 × 11.8 | also `opacity 0.6` → ≈ 0.31 |
| `1` | +158.7 | 3.4 | @ 0.51 |

Gaps: 조회→3,291 ≈ 7; number→next icon ≈ 15; icon→its number ≈ 4.

Row inventory in frame A (identical in frame B):

| Row | Title | Thumb | Badge |
|---|---|---|---|
| 1 (7451) | `오늘의 점심 식단 저염식으로 만든 든든한…` (truncated, ink w 249.1) | yes | no |
| 2 (7527) | `오늘의 점심 식단 저염식으로 만든 든든한 한끼` (full, ink w 266.2) | no | no |
| 3 (7603) | `오늘의 점심 식단 저염식으로 만든 든든한…` | yes | **`2`** |
| 4 (7679) | `오늘의 점심 식단 저염식으로 만든 든든한…` | yes | no |
| 5 (7755) | `오늘의 점심 식단 저염식으로 만든 든든한 한끼` | no | no |

Every row's meta is `조회 3,291 · ♥ 541 · 💬 1` (placeholder data).

### 2.5 List footer — frame A: full-width `더보기 ›` row

* Block 7831–7901 (70 tall) between the last row's hairline (7830) and the grey band (7901).
* Pressable box **335 × 38, radius 10**, x = frameLeft + 20 … +355, y **7847–7885** (16 px padding
  above and below). No fill, no border — radius 10 is the press-highlight shape.
* Label `더보기` — **15 px**, `#2E2F33` @ 0.70, ink x+152.1 … +188.4, y 7859.6–7872.9.
  Ink centre x = frameLeft + 170.25, i.e. **17 px left of the frame centre** (it is centred in the
  space left of the chevron, not in the full row).
* Chevron-right ink **4.5 × 7.3** at x + 324.9, y 7862.3, `#37383C` @ 0.51 (right-aligned).

### 2.6 List footer — frame B: `인기글 더보기 ›` pill

* Pill **111 × 32, radius 16 (full)**, white fill, 1 px `#70737C` @ 0.22 border, at
  x = frameLeft + 132, y **7847–7879**; horizontally centred.
* Label `인기글 더보기` **13 px** `#2E2F33` @ 0.70, ink x+145.1, y 7857.7.
* Chevron ink 4.5 × 7.3 at x+224.9, y 7859.3, `#37383C` @ 0.51.
* Grey band follows at **7895** (6 px earlier than in A, because this footer block is 6 px shorter).

### 2.7 `이런 작성자도 만나보세요` section

Frame A y-values (frame B = A − 6 for every value in this subsection).

| Element | y | Size / style |
|---|---|---|
| Grey band | 7901–7909 | 375 × 8, `#F7F7F7` |
| (white gap) | 7909–7925 | **16** (note: the equivalent gap in §2.3 is 8 — inconsistent) |
| Title block | 7925–7972 | 375 × 47 white |
| Title `이런 작성자도 만나보세요` | ink 7941.4–7956.5 | **17 px Bold**, `#2A2A37`, ink w 168.2, ink left = frameLeft + 20.9 |
| Card rail container | 7972–8153 | 375 × 181, clipped (`clip320`) → **horizontally scrollable** |
| Cards | 7980–8145 | **137 × 165, radius 8**, white, **shadow `0 1px 3px rgba(0,27,55,0.10)`** (`feOffset dy=1`, `stdDeviation=1.5`, colour 0,27,55 @ 0.1) |

Rail: left inset **20**, card gap **8**. Frame A shows cards at x = frameLeft + 20, +165, +310 —
the third is clipped by the frame edge, proving horizontal scroll.

Card internals (relative to card top `C`, card is 137 wide, everything horizontally centred):

| Element | Position | Size / style |
|---|---|---|
| Avatar | x = card + 44.5, y = C + 12 | **48 × 48, radius 24**, fill `#022047` @ 0.05; person glyph 34.3 × 41.1, `#37383C` @ 0.28 |
| Name `신신마스터` | ink y = C + 67.1 | **15 px**, `#2A2A37`, ink w 62.9 |
| Tag chips | y = C + 87 | height **21**, radius **full (10.5)**, fill `#70737C` @ 0.08, label **10 px** `#2E2F33` @ 0.70, chip gap **6**, label padding ≈ 7 each side. Widths: `CKD 정보` 55, `식단 인증` 51 |
| Follow button | x = card + 41.5, y = C + 116 | **54 × 32, radius 8** |

Card variants shown in frame A:

| Card | Tags | Button | Button style |
|---|---|---|---|
| 1 | `CKD 정보`, `식단 인증` | `팔로잉` | **solid** `#FE7139`, label **13 px white** |
| 2 | `식단 인증` | `팔로우` | **tint** `#FFF4F0` @ 0.6, label **13 px `#FE7139`** |
| 3 (clipped) | none | `팔로우` | tint; button sits at C + **119** (3 px lower — layout drift, not intentional) |

Frame B's single card: 1 tag (`식단 인증`), tint `팔로우` button, plus an outlined
**`더보기 ›` pill 74 × 32, radius full**, white fill / 1 px `#70737C` @ 0.22 border, at
x = frameLeft + 185, y 8041–8073 (vertically centred against the card). Label `더보기` **13 px**
`#2E2F33` @ 0.70 at ink x+198.3; chevron ink 4.5 × 7.3 at x+240.9. Pill padding: 13.3 left,
label→chevron 11.2, chevron→right edge 13.6.

---

## 3. Frames C & D — 신신이웃 (author directory)

`frameLeft = 2849` (C) / `3256` (D), `frameTop = 7255`.

### 3.1 Chrome

| Block | y | Size | Notes |
|---|---|---|---|
| Status bar | 7255–7302 | 375 × 47 | same as A/B |
| App bar | 7302–7349 | 375 × 47 | back chevron ink 10.2 × 17.6 at x = frameLeft + 18, y 7318.1, `#2E2F33` @ 0.88. **No right action.** |
| Title `신신이웃` | ink x = frameLeft + 160.9, y 7320.6–7333.9 | ink w 51.0 | **15 px Bold, `#000000`**, **horizontally CENTERED** (ink centre 3035.4 vs frame centre 3036.5). A 74 × 34 r17 clip box exists around it at x = frameLeft + 148.5, y 7310 |
| Bottom safe bar | 8147–8187 | 375 × 40 white + home indicator 134 × 5 r2.5 `#191F28` at y 8167 | rows scroll under it |

### 3.2 Category chip rail

* Container **7349–7413** (64 tall), white, bottom hairline **1 px `#70737C` @ 0.08** at 7412.
* Chips: **height 32, radius 16 (full)**, y **7365–7397** (16 px above and below inside the container).
* Left inset **20**, **chip gap 6**.
* Unselected chip: fill `#70737C` @ 0.08 **plus** a 0.66 px stroke `#70737C` @ 0.08 (visually just the fill —
  treat as fill-only). Label **13 px**, `#2E2F33` @ 0.70.
* Chips (x relative to frameLeft / width / label):

| x | w | label | label ink w | horizontal padding (ink) |
|---|---|---|---|---|
| +20 | **52** | `전체` | 21.1 | 15.1 / 15.8 — **wider than the others** |
| +78 | 71 | `식당 인증` | 47.2 | 11.9 / 11.9 |
| +155 | 71 | `질문·상담` | 47.8 | 11.7 / 11.5 |
| +232 | 71 | `식당 추천` | 46.7 | 11.9 / 12.4 |
| +309 | 75 | `CKD 정보` | 51.3 | 12.0 / 11.7 — **overflows the frame (ends at +384 > 375) → rail scrolls horizontally** |

* **Selected chip (frame D, `전체` only):** fill **`#FFF4F0` @ 0.6**, border **0.66 px `#FE7139`** (opaque),
  label **`#FE7139`** (same 13 px, same geometry). Nothing else about the chip changes.

### 3.3 User rows

Eight rows, **101 px tall**, full-bleed white, 1 px hairline `#70737C` @ 0.08 at each row's bottom
edge (no inset). Row tops: **7413, 7514, 7615, 7716, 7817, 7918, 8019, 8120** (the last is clipped by
the frame bottom / bottom bar).

Canonical row (row 2 at T = 7514), gutter 20:

| Element | Position | Size / style |
|---|---|---|
| Avatar | x = frameLeft + 20, y = T + 20 | **60 × 60, radius 30**, fill `#022047` @ 0.05; person glyph 42.9 × 51.4, `#37383C` @ 0.28 |
| Name `신신마스터` | ink x = frameLeft + 92.4, y = T + 22.1 | **15 px**, `#2A2A37`, ink w 63.0 (avatar right + **12** gap) |
| Meta `팔로워 1,741` | ink x = +92.4, y = T + 42.7 | **13 px**, `#37383C` @ 0.51 (`팔로워` ink w 32.0, `1,741` ink starts +130.7, ink w 26.9) |
| Meta `작성글 83` | ink x = +172.3, y = T + 42.7 | **13 px**, `#37383C` @ 0.51 (`83` ink starts +210.6, ink w 14.8). Gap between the two metric groups ≈ **15** (`팔로워 1,741` ink ends at +157.6) |
| Tag chips (0–2) | x = +92, y = T + 60 | height **21**, radius full, fill `#70737C` @ 0.08, label **10 px** `#2E2F33` @ 0.70, gap **6**. `CKD3` w 41, `식단 인증` w 51 |
| Follow button | x = frameLeft + 303, y = T + 16 | **52 × 32, radius 8**, right inset **20**; label **13 px**, ink w 32.1 (`팔로잉`) / 33.0 (`팔로우`), ink centred (≈10 px padding) |

**Vertical rule:** the avatar is always at `T + 20`; the text column is **vertically centred against the
avatar**. With tags the column runs `T+22 … T+81`; without tags the name drops to `T + 34.6` and the
meta to `T + 55.2` so the two lines stay centred on the 60 px avatar. Row height stays 101 either way.

**Row 1 is an anomaly:** its avatar is **52 × 52 (radius 26)** at `T + 24`, so its whole text column
starts at `frameLeft + 84` instead of `+92`, and its follow button is the only **solid** one. Every
other row uses 60 × 60 at `T + 20`, column at `+92`, tint button. Treat 60 as canonical.

Row-by-row content (identical in C and D except where noted):

| Row | y | Avatar | Tags | Button label | Button style |
|---|---|---|---|---|---|
| 1 | 7413 | 52 | `CKD3`, `식단 인증` | `팔로잉` | **solid `#FE7139`, white label** |
| 2 | 7514 | 60 | `식단 인증` | C: `팔로우` → **D: `팔로잉`** | tint `#FFF4F0` @ 0.6, `#FE7139` label |
| 3 | 7615 | 60 | — | `팔로잉` | tint |
| 4 | 7716 | 60 | — | `팔로잉` | tint |
| 5 | 7817 | 60 | `CKD3`, `식단 인증` | `팔로잉` | tint |
| 6 | 7918 | 60 | `CKD3`, `식단 인증` | `팔로잉` | tint |
| 7 | 8019 | 60 | `CKD3`, `식단 인증` | `팔로잉` | tint |
| 8 | 8120 | 60 | `CKD3`, `식단 인증` | `팔로잉` | tint (clipped) |

⚠ **Semantic inconsistency in the source design:** the *solid* brand button carries the label
`팔로잉` (row 1, and card 1 in frame A) while *tint* buttons carry both `팔로우` and `팔로잉`.
The app's existing i18n is `follow = 팔로우`, `unfollow = 팔로잉`. Implement the sane mapping —
**`팔로우` = solid brand (`variant="fill"`), `팔로잉` = tint (`variant="weak"`)** — and flag it to design.

---

## 4. Typography table

All faces are Pretendard; v2 sets weight by **face, never by `fontWeight`**. Weights below are read
visually from 4×–8× renders; sizes are measured.

| Size | Weight | Colour | Where |
|---|---|---|---|
| **17** | Bold | `#2A2A37` | Section titles `추천 게시글`, `이런 작성자도 만나보세요` |
| **15** | Bold | `#000000` | Screen header title `신신이웃` (frames C/D) |
| **15** | Regular/Medium | `#2A2A37` | Post row titles (`오늘의 점심 식단…`) |
| **15** | SemiBold | `#2A2A37` | User name `신신마스터` (directory rows and rail cards) |
| **15** | Medium | `#2E2F33` @ 0.70 | Frame A full-width `더보기` label |
| **13** | Regular | `#37383C` @ 0.51 | Post meta `조회 3,291 / 541 / 1`; directory meta `팔로워 1,741`, `작성글 83` |
| **13** | Medium | `#2E2F33` @ 0.70 | Pill labels `게시글 더보기`, `인기글 더보기`, `더보기`; category chip labels `전체`, `식당 인증`, `질문·상담`, `식당 추천`, `CKD 정보` |
| **13** | Medium | `#FE7139` | Selected chip label `전체` (frame D); tint follow-button labels `팔로우` / `팔로잉` |
| **13** | Medium | `#FFFFFF` | Solid follow-button label `팔로잉`; multi-image badge `2` |
| **10** | Medium/SemiBold | `#2E2F33` @ 0.70 | Tag chips `CKD3`, `CKD 정보`, `식단 인증` |
| ~16 | SemiBold | `#000000` | OS status bar `9:41` (not app UI) |

`letterSpacing` is 0 everywhere in the design — consistent with the v2 rule.

---

## 5. Colour table

| Hex + alpha | v2 token | Used for |
|---|---|---|
| `#FFFFFF` | `background.default` / `static.white` | screen, rows, cards, pills, top/bottom bars |
| `#F7F7F7` | `background.lower` | 8 px section band |
| `#2A2A37` | `label.normal` | post titles, user names, section titles |
| `#000000` | `label.strong` | 신신이웃 header title |
| `#2E2F33` @ 0.70 (`#2e2f33b3`) | `label.neutral` | pill labels, chip labels, tag labels, `⋯` icon |
| `#2E2F33` @ 0.88 | *(none)* | back chevron — **off-token**, see §7 |
| `#37383C` @ 0.51 (`#37383c82`) | `label.alternative` | meta text, chevrons, `2` badge circle |
| `#37383C` @ 0.51 × 0.6 ≈ 0.31 | *(none exactly)* | heart / comment-bubble icons (nested `opacity 0.6`) |
| `#37383C` @ 0.28 (`#37383c47`) | `label.assistive` | avatar placeholder person glyph |
| `#70737C` @ 0.08 (`#70737c14`) | `fill.normal` / `line.alternative` | chip fill, tag fill, all row hairlines |
| `#70737C` @ 0.22 (`#70737c38`) | `line.normal` | outlined-pill border (1 px) |
| `#022047` @ 0.05 (`#0220470d`) | `fill.pressed` | avatar circle background |
| `#FE7139` | `primary.primary` | solid follow button, selected chip border + label |
| `#FFF4F0` @ 0.6 (`#fff4f099`) | `primary.primaryWeak` | tint follow button, selected chip fill |
| `rgba(0,27,55,0.10)` | *(elevation)* | rail-card drop shadow `0 1px 3px` |
| `#191F28` | — | OS home indicator |

Every colour in this section maps onto an existing semantic token except the 0.88-alpha back chevron
and the 0.31-alpha meta icons.

---

## 6. State machine / interactions

1. **Scroll-under chrome (A/B).** The app bar is an *opaque* 375 × 94 white plate (status bar + 47 px
   bar); list content passes beneath it. There is **no header title** on the author-profile screen in
   this state and no title fade-in is drawn. The bottom 40 px white bar behaves the same way.
2. **`게시글 더보기 ›`** — footer of the author's own post list; navigates to the author's full post
   list. Rendered as an in-list footer (proved by the clipped top edge), not as sticky chrome.
3. **`추천 게시글` footer** — two competing designs: A = full-width text row with a right chevron and a
   10 px press-highlight radius; B = centred outlined pill `인기글 더보기 ›`. Pick one; A reads as
   "load more inline", B reads as "navigate away".
4. **`이런 작성자도 만나보세요`** — A: horizontally scrolling card rail (3rd card clipped at the frame
   edge = affordance). B: one card + a `더보기 ›` pill that navigates to **신신이웃**. That is the
   entry point into frames C/D.
5. **Follow toggle.** Two visual states only: **solid brand** and **brand tint**. Frame C→D shows row 2
   flipping label `팔로우` → `팔로잉` *without* changing the button's fill — i.e. the design's toggle
   changes only the word. Combined with row 1 (solid + `팔로잉`) the source is self-contradictory;
   ship `팔로우 = fill`, `팔로잉 = weak` (see §3.3 warning).
6. **Category chip selection (C→D).** Unselected = grey fill, neutral label. Selected = brand tint fill
   + brand 0.66 px border + brand label. **Single-select** (only `전체` is on in D). The rail scrolls
   horizontally (`CKD 정보` bleeds past the right edge in both frames).
7. **No pressed, disabled, empty, loading, error or keyboard states are drawn in this section.**
   Nothing here dictates them — use v2 defaults (skeleton-first, no ring spinners).
8. **Multi-image badge.** A `2` in a 20 px grey circle over the thumbnail's bottom-right = "this post
   has 2 images". Only appears on rows with a thumbnail.

---

## 7. v2 mapping

| Design element | v2 implementation | Notes / deltas |
|---|---|---|
| Screen frame | `V2Screen` | background `background.default`; the design's section bands are the only `background.lower` surfaces |
| App bar (A/B: back + `⋯`) | `V2ScreenHeader onBack right={<V2IconButton …/>}` | bar height token `barHeight.appBarIOS = 44`; **design measures 47** → keep 44 (2–3 px, within noise) or add a 47 variant. Header must render **no title** in this state |
| App bar (C/D: centred `신신이웃`) | `V2ScreenHeader title` | ⚠ **Conflict:** `V2ScreenHeader` is deliberately Toss-style **left-aligned**; the design centres the title. Title style already matches exactly (`typography.label.small` = 15 SemiBold, `colors.label.strong` = `#000000`). **Smallest addition: a `titleAlign?: "leading" \| "center"` prop** (default `leading`), used only by this screen |
| Section band (8 px) | `V2Divider variant="thick"` is **16 px** | ⚠ Design uses **8**. Smallest addition: `V2Divider variant="thick" size?: 8 \| 16`, or a `V2Divider variant="band"` at 8 |
| Row hairline | `V2Divider variant="hairline" tone="alternative"` | `line.alternative` = `#70737c14` = the measured `#70737C` @ 0.08 ✔ full-bleed (no inset) |
| Section title (17 Bold) | `V2Text` with `typography.title.xSmall` (17 Bold) + `colors.label.normal` | exact match |
| Post row (title + meta + 60 thumb) | **new component** `RecommendedPostRow` | Not `V2ListRow` — that one is 44-min-height with `title.xSmall`/`subtext.medium` and 16/20 side padding. Design is a fixed 76 px row, 20 gutter, 15 px title, 13 px meta, 60 × 60 r8 thumbnail. Build it in `features/recipe/components/` on v2 tokens |
| Meta counts (`조회`/♥/💬) | `V2Text` `typography.subtext.medium` (13 Regular) + `colors.label.alternative`; icons `V2Icon size="xs"` (16) | ⚠ the design's icons are at ≈0.31 alpha (nested opacity). Use `colors.label.assistive` (`#37383c47` ≈ 0.28) — closest on-system value |
| Outlined pills (`게시글 더보기`, `인기글 더보기`, `더보기`) | **gap** | `V2Button` has no outlined/`variant="outline"` face and no `radius.full` size. Smallest addition: `V2Button variant="outline"` (bg `background.default`, 1 px `line.normal` border, fg `label.neutral`) **plus** a `pill?: boolean` (or `shape="pill"`) that swaps `borderRadius` for `radius.full`. Size `s` already gives h 32 / 13 px text |
| Trailing `›` in pills and rows | `V2Icon name="chevronRight" size="xs"` (16), `colors.label.alternative` | ink measured 4.5 × 7.3 → 16 px box |
| Category chip rail | `V2Chip size="s"` in a horizontal `ScrollView`, `contentContainerStyle={{ paddingHorizontal: 20, gap: 6 }}` | `V2Chip size="s"` = h 32, padH 12, `label.xSmall` (13), `radius.full`, bg `fill.normal`, fg `label.neutral` — **exact match for the unselected chip** |
| Selected chip | **gap** | v2's `selected` face is `bg: primary.primary` + white fg (solid). Design is **tint fill + brand border + brand fg**. Smallest addition: `V2Chip selectedVariant?: "fill" \| "weak"` where `weak` = `bg primary.primaryWeak`, `fg primary.primary`, `borderWidth 1` `borderColor primary.primary`. Do **not** hand-roll a chip |
| Tag chips (`CKD3`, `식단 인증`) | closest is `V2Badge size="xs"` (10 SemiBold, padH 8, padV 2, **radius `sm` = 8**) | ⚠ two mismatches: design radius is **full** and design height is **21** (badge xs computes ≈19), and the design fill is `fill.normal` (`#70737c14`) while `V2Badge color="neutral" variant="weak"` uses `label.disable` (`#37383c29`). Smallest addition: `V2Badge shape?: "rounded" \| "pill"` + a `neutralWeak` face on `fill.normal`. Chip gap 6 |
| Follow button | `V2Button size="s" color="brand" variant="fill" \| "weak"` | `size s` = radius `sm` (8), padH 10, `label.xSmall` (13); fill = `primary.primary`/white, weak = `primary.primaryWeak`/`primary.primary` — **exact match**. Design widths 52 (rows) / 54 (cards) fall out of hug + padH 10 |
| Avatar (48 / 52 / 60, circle, placeholder) | **gap — no `V2Avatar` exists** | Design: circle, bg `fill.pressed` (`#0220470d`), placeholder person glyph at `label.assistive`. Smallest addition: `V2Avatar` with `size: 32 \| 40 \| 48 \| 60` + `uri?`; sizes 48 and 60 are the ones this section needs |
| Rail card | `V2Card variant="elevated"` | ⚠ `V2Card` radius is `radius["2xl"]` (16); design is **8** (`radius.sm`). Add a `radius?: Radius` prop or a `variant="elevated" size="s"`. Check `elevation` token vs measured `0 1px 3px rgba(0,27,55,0.10)` |
| Card rail | plain horizontal `ScrollView` (`FlashList` is overkill for ≤10 cards) | left inset 20, gap 8, no snap in the design |
| Directory user row | **new** `NeighborRow` on v2 tokens | 101 px, 20 gutter, `V2Avatar 60`, name `label.small`(15 SemiBold)/`label.normal`, meta `subtext.medium`(13)/`label.alternative`, tags, `V2Button size="s"` |
| Multi-image badge | `V2Badge` cannot do a 20 px circle | Smallest addition: reuse `V2Avatar`-style circle or a local 20 px `View` with `radius.full`, bg `label.alternative`, `caption`-13 white label. Not worth a DS component |
| Gutter | design = **20**; `layout.ts GUTTER = spacing[16]` | ⚠ **Conflict.** The whole section is on a 20 px gutter (rows, section titles, chips, cards, buttons). Either accept 20 for community screens and document it, or renegotiate the design to 16. Do **not** mix — that is exactly the "여러 개의 시작선" failure `layout.ts` warns about |
| Chip gap | design = **6**; `layout.ts CHIP_GAP = spacing[8]` | ⚠ minor conflict — snap to `spacing[6]` (a real token) or to 8 |

Other on-system snaps: card/tag/pill vertical rhythm uses 12 / 16 / 20 — all `spacing` tokens.
Row heights 76 and 101 are *content-derived*, not tokens; implement as padding + content, not magic numbers
(76 = 18 + 15-line + 12 + 13-line + 18; 101 = 20 + 60 avatar + 21).

---

## 8. Delta vs current implementation

Files read: `src/features/recipe/views/CommunityAuthorProfileScreen.tsx`,
`src/features/recipe/views/CommunityConnectionsScreen.tsx`,
`src/features/recipe/components/PostListItem.tsx`,
`src/features/recipe/hooks/useCommunityAuthor.ts`, `src/features/recipe/types/index.ts`,
`src/i18n/locales/ko/common.json`.

### 8.1 Already matches

* `CommunityAuthorProfileScreen` app bar already uses **20 px horizontal padding** and a
  back-chevron + `ellipsis-horizontal` pair — same anatomy as the design.
* Follow copy already exists and is correct: `community.author.follow = 팔로우`,
  `community.author.unfollow = 팔로잉`.
* `community.author.suggested = "이런 작성자도 만나보세요"` **already exists in ko/common.json**
  (currently unused) — the design's section title needs no new string.
* The follow button already renders two colour faces (brand vs surfaceBrand).
* `CommunityConnectionsScreen` already has the right row anatomy for 신신이웃: avatar + name + meta +
  follow button, hairline separators, FlashList.

### 8.2 Must change

**Author profile (`CommunityAuthorProfileScreen.tsx`)**

1. **Everything is off-token typography.** `fontSize: 16 / 14 / 11.5 / 13.5`, `letterSpacing: -0.24…`,
   and `fontWeight` set *alongside* `fontFamily`. Replace with `typography.*` tokens; drop every
   `fontWeight` (v2 rule: face carries weight) and every negative `letterSpacing` (v2 letterSpacing = 0).
2. **App bar**: `height: 54` + `fontSize 16 Bold` title showing the author's nickname, `justifyContent:
   "space-between"`. Design: **47 px bar, no title at all** on the author profile; the nickname lives in
   the (unscrolled) profile header. Move to `V2ScreenHeader`.
3. **Post list**: currently renders `PostListItem` — a 16 px-padded, 16-radius white *card* with
   category · time-ago, 2-line title (15.5 Bold), 2-line summary, 64 × 64 r12 thumb, tag chips, author
   name and three counts, with a `⋯` report/block kebab, separated by 10 px gaps inside a 20 px wrap.
   The design's `추천 게시글` rows are **flat 76 px full-bleed rows**: title (15, 1 line) + meta
   (`조회 n · ♥ n · 💬 n`) + optional 60 × 60 r8 right thumbnail + hairline. Build the new row; do not
   restyle `PostListItem` (it is shared by the feed).
4. **Missing sections**: `추천 게시글`, its `더보기`/`인기글 더보기` footer, and
   `이런 작성자도 만나보세요` (card rail) do not exist at all. `게시글 더보기` footer pill also missing.
   New data needed: recommended/popular posts for an author, and suggested authors.
5. **Section bands**: the screen has none; design separates blocks with an 8 px `#F7F7F7` band + a
   47 px title row.
6. **Avatar/counters**: profile avatar is 64 px with a 28 px Ionicon; design uses 48/52/60 with a
   `#022047` @ 0.05 circle and a `label.assistive` glyph. Unify through the proposed `V2Avatar`.
7. **`Ionicons` everywhere** → `V2Icon`.
8. Post-count/follower/following triple currently uses `stat` columns (number over label, gap 22).
   The **directory** rows in this design use an inline `팔로워 1,741  작성글 83` form instead — that is
   a different component; do not conflate. (The profile header's own count row is not in this section.)

**신신이웃 (new screen, closest existing = `CommunityConnectionsScreen.tsx`)**

9. Header title is 17 Bold and sits in a `space-between` row with a 24 px spacer; design is **15 Bold,
   truly centred**, back-only.
10. **No category chip rail exists.** Add the horizontally scrolling `전체 / 식당 인증 / 질문·상담 /
    식당 추천 / CKD 정보` rail (single-select, `전체` default) in a 64 px white container with a bottom
    hairline. Needs a category filter on the author-list query.
11. Row height `minHeight: 80` → design **101**; avatar 48 → **60**; name 14.5 SemiBold → **15**;
    meta 11.5 Regular joined with `·` → **13 px, two groups (`팔로워 1,741`, `작성글 83`) separated by
    ~15 px whitespace, no middot**; follow button 34 × r10 padH 14 → **52 × 32, r8**.
12. Divider `marginLeft: 80` → design hairlines are **full-bleed**.
13. **Tag chips per row (`CKD3`, `식단 인증`) do not exist** — `CommunityAuthorSummary` only carries
    `{id, nickName, profileImageUrl}`. Either extend the summary type/endpoint with `badges: string[]`
    (the profile type already has `badges`) or fetch per row. Note the current row already does a
    per-row `useCommunityAuthor(author.id)` query just to show counts — that is N+1; folding counts and
    badges into the list response fixes both.
14. Follow button in `ConnectionRow` always uses `surface.brand` **text** with a swapped background;
    the design needs a real fill/weak pair (white label on `#FE7139` for the fill state).
15. Route: the design's `더보기` in `이런 작성자도 만나보세요` needs a 신신이웃 destination. Existing
    `app/community/connections.tsx` is parameterised by `?id=&mode=followers|following`; 신신이웃 is a
    *global directory*, not a per-author follower list — add a separate route rather than overloading it.

### 8.3 Present in current code, ABSENT from the design — **must be preserved**

* **Report / block flow.** `CommunityAuthorProfileScreen`'s `⋯` opens a `showConfirm` block dialog
  (`community.stories.block*`) and calls `blockUser`; `PostListItem`'s per-post `⋯` opens an action
  sheet (신고하기 / 차단하기) that routes to `/community/report?postId=`. The design draws a bare `⋯`
  with no menu — **keep the whole flow**, including `isMine` suppression of the kebab and
  `afterModalTransitions()` before navigation.
* **`profile.isMine` handling** — the follow button is hidden and the block action disabled for one's
  own profile. Nothing in the design shows this.
* **Withdrawn-author handling** (`isWithdrawnAuthor` → `post.withdrawnUser`) and the `"나"` →
  `freePost.selfName` substitution in `PostListItem`.
* **Loading and error states**: `ArticleSkeleton` while loading, `ErrorMessage` + `onRetry` on failure,
  `community.author.emptyPosts` empty state. The design shows none of these; keep them (and keep them
  skeleton-first — no ring spinners).
* **Optimistic follow** in `useCommunityAuthor` (`onMutate` count adjust, rollback on error,
  `isFollowingPending` disabling) — the design shows no pending state; keep the disable.
* **Followers / following navigation** — the count columns push to
  `/community/connections?id=…&mode=followers|following`. Not visible in this section (the profile
  header is scrolled away); do not delete.
* **`profile.badges`** rendering on the profile header (24 px pills) — the design's directory tags are a
  different surface; keep the profile-header badges.
* **i18n keys already provisioned but unused** — `community.author.reviews`, `.stories`,
  `.emptyReviews`, `.emptyStories`, `.openProfile`, `.otherPosts`. These imply a **후기 / 게시글 /
  스토리 tab set** on the author profile that this section does not show (it is scrolled past). Do not
  conclude from these frames that tabs are gone.
* **`useCommunityPosts` client-side filtering** of the author's posts and `FlashList` usage — keep
  FlashList (v2 frontier stack rule).

### 8.4 Open questions for design

1. Which `추천 게시글` footer wins — A's full-width row or B's `인기글 더보기` pill? (And is the list
   "추천" or "인기"? The title and B's footer disagree.)
2. Which `이런 작성자도 만나보세요` layout wins — 3-card rail or 1 card + `더보기`?
3. Row 1 of the directory has a 52 px avatar and a solid button while rows 2–8 have 60 px and tint.
   Intentional ("first/featured") or drift? Assumed drift.
4. `팔로우`/`팔로잉` ↔ solid/tint mapping is inconsistent across all four frames. Assumed
   `팔로우 = solid`, `팔로잉 = tint`.
5. Gutter 20 vs `layout.ts` GUTTER 16 — which one moves?
6. The gap above the section title is 8 px in `추천 게시글` and 16 px in `이런 작성자도 만나보세요`.
   Assumed 16 for both.
