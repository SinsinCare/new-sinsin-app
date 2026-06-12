/**
 * 디자인 시스템 추출 스크립트.
 *
 * src/theme/{tokens,themes,fonts}.ts를 직접 import해서 값을 풀어내고,
 * components.meta.ts의 수동 메타데이터를 병합해
 * design-system/design-system.json으로 내보냅니다.
 *
 * 실행: npm run design:export
 * 출력은 결정적(deterministic)이어야 합니다 — 같은 커밋에서 두 번 실행하면
 * 같은 내용이 나오도록 generatedAt은 HEAD 커밋 시각을 사용합니다.
 */
import { execSync } from "child_process"
import * as fs from "fs"
import * as path from "path"

import { tokens } from "../../src/theme/tokens"
import { lightTheme, darkTheme } from "../../src/theme/themes"
import { bodyFont, headingFont } from "../../src/theme/fonts"
import { componentsMeta, ComponentMeta } from "./components.meta"

const REPO_ROOT = path.resolve(__dirname, "../..")
const OUTPUT_PATH = path.join(REPO_ROOT, "design-system", "design-system.json")

/* ── 컬러 카테고리 ── */

const COLOR_CATEGORY_RULES: [RegExp, string][] = [
  [/^(black|white|offWhite|pureWhite)$/, "base"],
  [/^primary/, "primary"],
  [/^sub\d/, "sub"],
  [/^grey\d/, "greyscale"],
  [
    /^(appBgDark|cardBgDark|inputBgDark|borderDark|textDark|textDarkSub)$/,
    "semantic-dark",
  ],
  [
    /^(appBg|textLight|textLightSub|textLightMuted|borderLight)$/,
    "semantic-light",
  ],
  [/^(restrictionBg|restrictionText|error)$/, "status"],
  [/^water/, "hydration"],
  [/^deleteBg$/, "ui"],
]

function colorCategory(name: string): string {
  for (const [pattern, category] of COLOR_CATEGORY_RULES) {
    if (pattern.test(name)) return category
  }
  console.warn(
    `[design-export] 분류되지 않은 컬러 토큰: ${name} → "uncategorized"`,
  )
  return "uncategorized"
}

/* ── 타입 스케일 이름 (fonts.ts 주석의 디자인 시스템 매핑) ── */

const TYPE_SCALE_NAMES: Record<
  string,
  { designName: string; defaultWeight: string }
> = {
  "3": { designName: "Body 3", defaultWeight: "600" },
  "4": { designName: "Body 2", defaultWeight: "500" },
  "5": { designName: "Body 1", defaultWeight: "500" },
  "6": { designName: "Title 3", defaultWeight: "600" },
  "7": { designName: "Title 2", defaultWeight: "600" },
  "8": { designName: "Title 1", defaultWeight: "600" },
  "9": { designName: "Heading 2", defaultWeight: "600" },
  "10": { designName: "Heading 1", defaultWeight: "600" },
}

/* ── 헬퍼 ── */

type TokenLike = { val: string | number; key?: string }

function isTokenLike(value: unknown): value is TokenLike {
  return (
    typeof value === "object" && value !== null && "val" in (value as object)
  )
}

function unwrap(value: TokenLike | string | number): string | number {
  return isTokenLike(value) ? value.val : value
}

/** 숫자 키 오름차순, "true"는 마지막 */
function scaleKeyOrder(a: string, b: string): number {
  if (a === "true") return 1
  if (b === "true") return -1
  return parseFloat(a) - parseFloat(b)
}

function git(command: string): string {
  return execSync(command, { cwd: REPO_ROOT }).toString().trim()
}

/* ── colors.palette ── */

const paletteEntries = Object.entries(tokens.color).map(([name, token]) => ({
  id: `color.${name}`,
  name,
  value: String(unwrap(token as TokenLike)),
  category: colorCategory(name),
}))

const CATEGORY_ORDER = [
  "base",
  "primary",
  "sub",
  "greyscale",
  "semantic-light",
  "semantic-dark",
  "status",
  "hydration",
  "ui",
  "uncategorized",
]
paletteEntries.sort((a, b) => {
  const byCategory =
    CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
  return byCategory !== 0
    ? byCategory
    : a.name.localeCompare(b.name, "en", { numeric: true })
})

/* ── colors.themes — 토큰 객체 동일성으로 tokenRef 역추적 ── */

const tokenIdByObject = new Map<object, string>()
for (const [name, token] of Object.entries(tokens.color)) {
  tokenIdByObject.set(token as object, `color.${name}`)
}

function buildTheme(
  themeName: "light" | "dark",
  theme: Record<string, TokenLike | string>,
) {
  return Object.entries(theme).map(([name, value]) => ({
    id: `theme.${themeName}.${name}`,
    name,
    tokenRef: isTokenLike(value)
      ? (tokenIdByObject.get(value as object) ?? null)
      : null,
    value: String(unwrap(value)),
  }))
}

/* ── typography ── */

function buildFontFaces(font: { face?: Record<string, { normal?: string }> }) {
  const faces: Record<string, string> = {}
  for (const [weight, face] of Object.entries(font.face ?? {})) {
    if (face?.normal) faces[weight] = face.normal
  }
  return faces
}

const typeScale = Object.keys(bodyFont.size as Record<string, number>)
  .filter((key) => key !== "true")
  .sort(scaleKeyOrder)
  .map((key) => ({
    id: `type.${key}`,
    key,
    designName: TYPE_SCALE_NAMES[key]?.designName ?? null,
    fontSize: (bodyFont.size as Record<string, number>)[key],
    lineHeight: (bodyFont.lineHeight as Record<string, number>)[key] ?? null,
    defaultWeight: TYPE_SCALE_NAMES[key]?.defaultWeight ?? null,
  }))

const letterSpacingScale = Object.entries(
  bodyFont.letterSpacing as Record<string, number>,
)
  .filter(([key]) => key !== "true")
  .sort(([a], [b]) => scaleKeyOrder(a, b))
  .map(([key, value]) => ({ id: `letterSpacing.${key}`, key, value }))

/* ── space / size / radius / zIndex ── */

function buildScale(scaleName: string, scale: Record<string, TokenLike>) {
  return Object.entries(scale)
    .sort(([a], [b]) => scaleKeyOrder(a, b))
    .map(([key, token]) => ({
      id: `${scaleName}.${key}`,
      key,
      value: Number(unwrap(token)),
    }))
}

/* ── components — 메타데이터 검증 ── */

/** 소스에 존재 여부를 따질 수 없는 합성 변형명 */
const SKIP_VARIANT_NAMES = new Set(["default", "true", "false"])

function validateComponent(meta: ComponentMeta): string[] {
  const errors: string[] = []
  const absolutePath = path.join(REPO_ROOT, meta.filePath)
  if (!fs.existsSync(absolutePath)) {
    return [`${meta.name}: 소스 파일 없음 — ${meta.filePath}`]
  }
  const source = fs.readFileSync(absolutePath, "utf8").toLowerCase()
  if (!source.includes(meta.name.toLowerCase())) {
    errors.push(`${meta.name}: 컴포넌트 이름이 ${meta.filePath} 안에 없음`)
  }
  for (const axis of meta.variants ?? []) {
    for (const value of axis.values) {
      if (SKIP_VARIANT_NAMES.has(value.name)) continue
      if (!source.includes(value.name.toLowerCase())) {
        errors.push(
          `${meta.name}: variant "${axis.axis}=${value.name}"이 ${meta.filePath} 안에 없음 — ` +
            "컴포넌트가 변경되었다면 components.meta.ts를 갱신하세요",
        )
      }
    }
  }
  return errors
}

const validationErrors = componentsMeta.flatMap(validateComponent)
if (validationErrors.length > 0) {
  console.error("[design-export] 메타데이터 검증 실패:")
  for (const error of validationErrors) console.error(`  - ${error}`)
  process.exit(1)
}

/* ── 조립 + 출력 ── */

const designSystem = {
  meta: {
    schemaVersion: 1,
    generatedAt: git("git show -s --format=%cI HEAD"),
    source: {
      repo: "sinsin-rn",
      branch: git("git rev-parse --abbrev-ref HEAD"),
      commit: git("git rev-parse --short HEAD"),
    },
  },
  colors: {
    palette: paletteEntries,
    themes: {
      light: buildTheme(
        "light",
        lightTheme as Record<string, TokenLike | string>,
      ),
      dark: buildTheme("dark", darkTheme as Record<string, TokenLike | string>),
    },
  },
  typography: {
    fonts: [
      {
        id: "font.body",
        name: "bodyFont",
        family: bodyFont.family,
        faces: buildFontFaces(bodyFont),
      },
      {
        id: "font.heading",
        name: "headingFont",
        family: headingFont.family,
        faces: buildFontFaces(headingFont),
      },
    ],
    scale: typeScale,
    letterSpacing: letterSpacingScale,
  },
  tokens: {
    space: buildScale(
      "space",
      tokens.space as unknown as Record<string, TokenLike>,
    ),
    size: buildScale(
      "size",
      tokens.size as unknown as Record<string, TokenLike>,
    ),
    radius: buildScale(
      "radius",
      tokens.radius as unknown as Record<string, TokenLike>,
    ),
    zIndex: buildScale(
      "zIndex",
      tokens.zIndex as unknown as Record<string, TokenLike>,
    ),
  },
  components: componentsMeta,
}

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(designSystem, null, 2) + "\n")

console.log(
  `[design-export] ${path.relative(REPO_ROOT, OUTPUT_PATH)} 생성 완료 — ` +
    `컬러 ${paletteEntries.length}개, 타입 스케일 ${typeScale.length}단계, 컴포넌트 ${componentsMeta.length}개`,
)
