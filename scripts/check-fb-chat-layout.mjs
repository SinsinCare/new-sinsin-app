// Gate for GATES.fb-chat.md G2 — measures the layout constants from source.
// Prints FB_CHAT_LAYOUT_OK only after every assertion passes.
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = resolve(new URL("..", import.meta.url).pathname)
const read = (p) => readFileSync(resolve(root, p), "utf8")
const fail = (msg) => {
  console.error(`FAIL: ${msg}`)
  process.exit(1)
}
const num = (src, re, label) => {
  const m = src.match(re)
  if (!m) fail(`${label}: pattern not found`)
  return Number(m[1])
}

// --- tokens ---------------------------------------------------------------
const size = read("src/design-system-v2/tokens/size.ts")
const iconMd = num(size, /iconSize = \{[^}]*\bmd:\s*(\d+)/s, "iconSize.md")
const touchMin = num(size, /touchTarget = \{\s*min:\s*(\d+)/, "touchTarget.min")
const spacingSrc = read("src/design-system-v2/tokens/spacing.ts")
const sp = (k) =>
  num(spacingSrc, new RegExp(`\\b${k}:\\s*(\\d+)`), `spacing[${k}]`)

const hib = read("src/shared/components/HeaderIconButton.tsx")
const hitIos = num(
  hib,
  /HEADER_TOUCH_SIZE = Platform\.OS === "android" \? \d+ : (\d+)/,
  "HEADER_TOUCH_SIZE ios",
)
const hitAndroid = num(
  hib,
  /HEADER_TOUCH_SIZE = Platform\.OS === "android" \? (\d+) : \d+/,
  "HEADER_TOUCH_SIZE android",
)

// --- F6: header actions ---------------------------------------------------
const header = read(
  "src/features/consultation/components/ConsultChatHeader.tsx",
)
if (!/CONSULT_HEADER_ACTION_HIT = HEADER_TOUCH_SIZE/.test(header))
  fail("header hit box must be HEADER_TOUCH_SIZE")
if (hitIos < 44 || hitAndroid < 44)
  fail(`header hit box < 44 (ios ${hitIos}, android ${hitAndroid})`)
if (touchMin !== 44) fail(`touchTarget.min is ${touchMin}, expected 44`)
if (!/CONSULT_HEADER_ACTION_GLYPH = iconSize\.md/.test(header))
  fail("header glyph must be iconSize.md")
if (iconMd !== 24) fail(`iconSize.md is ${iconMd}, expected 24`)
const gapKey = num(
  header,
  /CONSULT_HEADER_ACTION_GAP = spacing\[(\d+)\]/,
  "header gap",
)
if (sp(gapKey) < 8) fail(`header gap ${sp(gapKey)} < 8`)
if (!/actions:\s*\{[^}]*gap:\s*CONSULT_HEADER_ACTION_GAP/s.test(header))
  fail("actions row must use CONSULT_HEADER_ACTION_GAP")
const buttons = (header.match(/<HeaderIconButton\b/g) ?? []).length
const sized = (header.match(/visualSize=\{CONSULT_HEADER_ACTION_HIT\}/g) ?? [])
  .length
if (buttons === 0 || buttons !== sized)
  fail(`${sized}/${buttons} header buttons declare the 44pt layout box`)
const glyphs = (header.match(/size=\{CONSULT_HEADER_ACTION_GLYPH\}/g) ?? [])
  .length
if (glyphs !== buttons + 1)
  fail(
    `${glyphs} glyphs sized 24, expected ${buttons + 1} (back branch renders 2)`,
  )

// --- F6: context-row icon --------------------------------------------------
const screen = read("src/features/consultation/views/ConsultScreen.tsx")
if (!/CONTEXT_ICON_GLYPH = iconSize\.md/.test(screen))
  fail("context icon glyph must be iconSize.md")
if (num(screen, /CONTEXT_ICON_BOX = (\d+)/, "context box") !== 32)
  fail("context icon box must be 32")
if (!/size=\{CONTEXT_ICON_GLYPH\}/.test(screen))
  fail("context icon does not use CONTEXT_ICON_GLYPH")
if (!/contextIcon:\s*\{[^}]*width:\s*CONTEXT_ICON_BOX/s.test(screen))
  fail("contextIcon style does not use CONTEXT_ICON_BOX")
if (/name="info"\s+size=\{15\}/.test(screen))
  fail("old 15pt info icon still present")

// --- F7: composer clears keyboard + toolbar ---------------------------------
const hook = read("src/features/consultation/hooks/useConsultScreen.ts")
const appToolbar = num(
  hook,
  /const KEYBOARD_TOOLBAR_HEIGHT = (\d+)/,
  "app toolbar height",
)
const libToolbar = num(
  read(
    "node_modules/react-native-keyboard-controller/src/components/KeyboardToolbar/constants.ts",
  ),
  /KEYBOARD_TOOLBAR_HEIGHT = (\d+)/,
  "lib toolbar height",
)
if (appToolbar !== libToolbar)
  fail(`toolbar height mirror ${appToolbar} != library ${libToolbar}`)
if (
  !/useGlobalKeyboardToolbarVisible\(\)\s*\?\s*KEYBOARD_TOOLBAR_HEIGHT\s*:\s*0/s.test(
    hook,
  )
)
  fail("accessory height must follow global toolbar visibility")
if (
  !/paddingBottom: Math\.max\(\s*restBottomInset,\s*-keyboardOffset\.value \+ keyboardProgress\.value \* accessoryHeight \+ 8,?\s*\)/s.test(
    hook,
  )
)
  fail("bodyStyle paddingBottom must add progress * accessoryHeight")
// Prose may mention the forbidden layers ("do not reintroduce"); only imports/JSX count.
const secondLayer = /(<|import[^\n]*\b)Keyboard(AvoidingView|StickyView)\b/
if (secondLayer.test(hook) || secondLayer.test(screen))
  fail("second keyboard layer reintroduced")

// --- F8: medical reference spacing ---------------------------------------
const med = read("src/features/settings/views/MedicalReferenceScreen.tsx")
if (num(med, /ROW_MIN_HEIGHT = (\d+)/, "row min") !== 56)
  fail("row min height must be 56")
const padV = sp(num(med, /ROW_PADDING_V = spacing\[(\d+)\]/, "row padding"))
if (padV < 12 || padV > 16) fail(`row vertical padding ${padV} outside 12–16`)
if (sp(num(med, /TITLE_TO_CARD = spacing\[(\d+)\]/, "title gap")) !== 16)
  fail("title→card must be 16")
if (sp(num(med, /SECTION_GAP = spacing\[(\d+)\]/, "section gap")) !== 24)
  fail("section gap must be 24")
if (
  !/listItem:\s*\{[^}]*minHeight:\s*ROW_MIN_HEIGHT[^}]*paddingVertical:\s*ROW_PADDING_V/s.test(
    med,
  )
)
  fail("listItem style must use ROW_MIN_HEIGHT and ROW_PADDING_V")
if (
  !/sectionHeader:\s*\{[^}]*paddingTop:\s*SECTION_GAP[^}]*paddingBottom:\s*TITLE_TO_CARD/s.test(
    med,
  )
)
  fail("sectionHeader must use SECTION_GAP / TITLE_TO_CARD")

console.log(
  `header hit ${hitIos}/${hitAndroid} glyph ${iconMd} gap ${sp(gapKey)} · context ${iconMd}/32 · toolbar ${appToolbar} · rows ${56}/${padV}/16/24`,
)
console.log("FB_CHAT_LAYOUT_OK")
