/**
 * 없는 i18n 키는 **아무것도 실패시키지 않는다** — 화면에 키 문자열이 그대로 찍힐 뿐이다.
 *
 * ## 이 파일이 생긴 계기 (실측)
 *
 * 식당 상세의 메뉴 행에 `restaurant.safety.evidence.amountMg` 와
 * `restaurant.safety.evidence.multiple` 이 **키 이름 그대로** 렌더된 채로 발견됐다.
 * 원인은 낡은 번들이었고(키는 있었다, 리로드로 사라졌다) 코드 결함은 아니었지만,
 * 그 화면이 드러낸 사실이 진짜 위험이다:
 *
 * - i18next 는 키가 없으면 **키 문자열을 반환한다.** 예외도, 로그도, 빈 값도 아니다.
 * - `t()` 의 타입 검사(`i18next.d.ts` 의 `resources`)는 **ko 리소스만** 본다.
 *   ko 에 있고 en 에 없는 키는 tsc 를 통과하고, 영어 사용자에게만 깨져 보인다.
 * - 키가 표에서 조립되는 경로(`dynamicKey()`)는 타입이 `string` 으로 넓어져
 *   그 검사마저 꺼진다. `restaurant.region.groups.*` 만 120개가 이 경로다.
 *
 * 즉 "사람이 눈으로 그 화면을 열어 보기" 말고는 잡을 장치가 없었다. 이 테스트가 그 장치다.
 *
 * ## 무엇을 검사하나
 *
 * 1. **정적 스캔**: 식당·레시피 기능의 `.ts/.tsx` 를 TS AST 로 읽어
 *    `t("a.b.c")` · `t(dynamicKey("a.b.c"))` · `labelKey: "a.b.c"` 같은 **리터럴 키**를
 *    모으고, ko·en **양쪽**에 값이 있는지 본다.
 * 2. **동적 키 열거**: `` t(`restaurant.safety.driver.${x}`) `` 처럼 런타임에 조립되는 키는
 *    리터럴로 스캔할 수 없다. 대신 그 키를 만들어 내는 **유한한 정의역**(카탈로그·유니온
 *    타입)을 전부 돌려 실제 키를 생성해 검사한다. 유니온에 값이 늘면 목록의
 *    `Complete<>` 검사가 **컴파일 단계에서** 깨진다.
 * 3. **새 동적 접두어 감시**: 스캔이 발견한 템플릿 키 접두어가 2번 목록에 없으면 실패한다.
 *    새 `` t(`restaurant.무엇.${x}`) `` 를 추가하면서 열거를 빠뜨리는 것이 이 가드를
 *    조용히 무력화하는 유일한 길이라, 그 길을 막아 둔다.
 *
 * 정적 스캔이라 네트워크도 렌더도 없다 — 수백 ms 안에 끝난다.
 */

import fs from "node:fs"
import path from "node:path"

import ts from "typescript"

import enAuth from "../src/i18n/locales/en/auth.json"
import enCommon from "../src/i18n/locales/en/common.json"
import enHealth from "../src/i18n/locales/en/health.json"
import enRecipe from "../src/i18n/locales/en/recipe.json"
import enSettings from "../src/i18n/locales/en/settings.json"
import koAuth from "../src/i18n/locales/ko/auth.json"
import koCommon from "../src/i18n/locales/ko/common.json"
import koHealth from "../src/i18n/locales/ko/health.json"
import koRecipe from "../src/i18n/locales/ko/recipe.json"
import koSettings from "../src/i18n/locales/ko/settings.json"

import {
  CUISINE_TYPES,
  NUTRITION_TAGS,
  REVIEW_KEYWORDS,
  REVIEW_SORT_OPTIONS,
  SORT_OPTIONS,
  cuisineTypeLabelKey,
  nutritionTagLabelKey,
  sortLabelKey,
} from "../src/features/restaurant/data/filterCatalog"
import { RESTAURANT_CONSULT_NUTRIENT_KEYS } from "../src/features/restaurant/consult/restaurantConsultMessage"
import { REGION_CATALOG } from "../src/features/restaurant/data/regionCatalog"
import type {
  Amenity,
  BusinessStatusCode,
  CuisineType,
  NutritionTag,
  PhotoCategory,
  ReviewKeyword,
  ReviewSortOption,
  SafetyDriver,
  SafetyLevel,
  SortOption,
  Weekday,
} from "../src/features/restaurant/types"
import { mapAppLinks } from "../src/features/restaurant/utils/mapAppLinks"
import type { LibraryTab } from "../src/features/recipe/components/community/CommunityLibraryTabs"
import type { CommentOrder } from "../src/features/recipe/utils/commentOrder"
import type { RestaurantReportValidationError } from "../src/features/restaurant/utils/restaurantReportValidation"
import type { ReviewDraftDefect } from "../src/features/restaurant/utils/reviewDraft"
import { reviewDefectMessageKey } from "../src/features/restaurant/utils/reviewDraft"
import { FREE_POST_CATEGORIES } from "../src/features/recipe/data/freePostCategories"

/**
 * 요일 코드 전부. `utils/businessStatus` 는 `restaurant.weekday.<Weekday>` 를 직접
 * 조립하므로 열거는 여기서 한다 — 아래 `Complete` 검사가 `Weekday` 유니온에 값이 더해지면
 * 이 목록도 같이 늘리라고 컴파일에서 알린다.
 */
const WEEKDAYS = [
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN",
] as const satisfies readonly Weekday[]

/* ────────────────────────── 리소스 색인 ────────────────────────── */

const RESOURCES = {
  ko: {
    auth: koAuth,
    common: koCommon,
    health: koHealth,
    recipe: koRecipe,
    settings: koSettings,
  },
  en: {
    auth: enAuth,
    common: enCommon,
    health: enHealth,
    recipe: enRecipe,
    settings: enSettings,
  },
} as const

type Language = keyof typeof RESOURCES
type Namespace = keyof (typeof RESOURCES)["ko"]

const LANGUAGES = ["ko", "en"] as const satisfies readonly Language[]
const NAMESPACES = [
  "auth",
  "common",
  "health",
  "recipe",
  "settings",
] as const satisfies readonly Namespace[]

const PLURAL_SUFFIX = /_(?:zero|one|two|few|many|other)$/

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [prefix]
  }
  return Object.entries(value).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  )
}

/**
 * 언어·네임스페이스별 조회 가능한 키 집합.
 * 복수형(`x_other`)만 있는 키도 `x` 로 조회되므로 접미사를 뗀 형태를 함께 넣는다.
 */
const INDEX: Record<
  Language,
  Record<Namespace, Set<string>>
> = Object.fromEntries(
  LANGUAGES.map((language) => [
    language,
    Object.fromEntries(
      NAMESPACES.map((namespace) => {
        const keys = new Set<string>()
        for (const key of leafKeys(RESOURCES[language][namespace])) {
          keys.add(key)
          if (PLURAL_SUFFIX.test(key)) keys.add(key.replace(PLURAL_SUFFIX, ""))
        }
        return [namespace, keys]
      }),
    ),
  ]),
) as Record<Language, Record<Namespace, Set<string>>>

/** 그 언어의 그 네임스페이스에서 이 키가 값으로 조회되는가. */
function hasKey(
  language: Language,
  namespace: Namespace,
  key: string,
): boolean {
  return INDEX[language][namespace].has(key)
}

/** ko·en 양쪽에 있는가. 한쪽만 있으면 그 언어에서 키 문자열이 렌더된다. */
function missingLanguages(namespace: Namespace, key: string): Language[] {
  return LANGUAGES.filter((language) => !hasKey(language, namespace, key))
}

/* ────────────────────────── 정적 스캔 ────────────────────────── */

const REPO_ROOT = path.resolve(__dirname, "..")

/**
 * 스캔 범위. 저장소 전체로 넓히면 오탐(키처럼 생긴 문자열)이 늘어 가드가 무뎌진다.
 * 식당·레시피 기능을 확실히 덮는 쪽을 택했다 — 사고가 난 곳이고, 동적 키가 사는 곳이다.
 */
const SCAN_ROOTS = [
  "src/features/restaurant",
  "src/features/recipe",
  "app/restaurant",
  "app/recipe",
] as const

/** i18n 키의 모양. 소문자로 시작하고 점으로 이어진다(`restaurant.safety.SAFE`). */
const KEY_SHAPE = /^[a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9_-]+)+$/

/**
 * 동적 키의 앞부분. 템플릿 문자열의 **머리**가 이 모양이면 키를 조립하는 중이다
 * (`` `restaurant.safety.driver.${x}` `` → `restaurant.safety.driver.`).
 * URL 템플릿(`/recipes/${id}`)·딥링크(`sinsin://…`)는 이 모양에 걸리지 않는다.
 */
const KEY_PREFIX_SHAPE = /^[a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9_-]+)*\.$/

interface KeyUsage {
  key: string
  file: string
  line: number
  /** 이 파일이 쓰는 네임스페이스 후보. 비어 있으면 전 네임스페이스에서 찾는다. */
  namespaces: readonly Namespace[]
}

interface DynamicUsage {
  /** `` `restaurant.safety.driver.${x}` `` → `restaurant.safety.driver.` */
  prefix: string
  file: string
  line: number
}

function walk(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) return walk(file)
    return /\.tsx?$/.test(entry.name) ? [file] : []
  })
}

function isTranslateCallee(expression: ts.Expression): boolean {
  if (ts.isIdentifier(expression)) return expression.text === "t"
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text === "t"
  }
  return false
}

/** `labelKey` · `AMOUNT_KEY` 처럼 이름이 키라고 말하는 바인딩인가. */
function isKeyNamedBinding(node: ts.Node): boolean {
  if (ts.isPropertyAssignment(node) || ts.isPropertyDeclaration(node)) {
    return /key$/i.test(node.name.getText())
  }
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
    return /keys?$/i.test(node.name.text)
  }
  if (ts.isJsxAttribute(node)) return /key$/i.test(node.name.getText())
  return false
}

function scanFile(file: string): {
  literals: KeyUsage[]
  dynamics: DynamicUsage[]
} {
  const source = fs.readFileSync(file, "utf8")
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const relative = path.relative(REPO_ROOT, file)
  const namespaces = new Set<Namespace>()
  const literals: KeyUsage[] = []
  const dynamics: DynamicUsage[] = []
  /** 이름이 키라고 말하는 바인딩 안이면, 그 아래 리터럴은 전부 키 후보다. */
  let keyNamedDepth = 0

  const lineOf = (node: ts.Node): number =>
    sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1

  const recordLiteral = (
    node: ts.Node,
    key: string,
    callNamespaces: readonly Namespace[] = [],
  ): void => {
    if (!KEY_SHAPE.test(key)) return
    literals.push({
      key,
      file: relative,
      line: lineOf(node),
      namespaces: callNamespaces,
    })
  }

  /**
   * `t("key", { ns: "common" })` 처럼 호출부가 네임스페이스를 직접 말하면 그것이 우선이다.
   * 파일의 `useTranslation("community")` 로 전부 덮으면 이런 호출이 "없음" 으로 거짓
   * 실패한다(`FreePostEditScreen` 의 `community.postDetail.notFound`, 2026-09-09).
   */
  const namespacesOfCall = (node: ts.CallExpression): readonly Namespace[] => {
    const options = node.arguments[1]
    if (!options || !ts.isObjectLiteralExpression(options)) return []
    for (const property of options.properties) {
      if (
        ts.isPropertyAssignment(property) &&
        ts.isIdentifier(property.name) &&
        property.name.text === "ns" &&
        ts.isStringLiteralLike(property.initializer) &&
        (NAMESPACES as readonly string[]).includes(property.initializer.text)
      ) {
        return [property.initializer.text as Namespace]
      }
    }
    return []
  }

  /** `t()` · `dynamicKey()` 의 첫 인자가 리터럴이면 키다. */
  const recordArgument = (
    argument: ts.Expression,
    callNamespaces: readonly Namespace[] = [],
  ): void => {
    if (ts.isStringLiteralLike(argument)) {
      recordLiteral(argument, argument.text, callNamespaces)
    }
  }

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression
      const first = node.arguments[0]
      if (first) {
        if (
          isTranslateCallee(callee) ||
          getCalleeName(callee) === "dynamicKey"
        ) {
          recordArgument(first, namespacesOfCall(node))
        }
        if (
          getCalleeName(callee) === "useTranslation" &&
          ts.isStringLiteralLike(first) &&
          (NAMESPACES as readonly string[]).includes(first.text)
        ) {
          namespaces.add(first.text as Namespace)
        }
      }
    }

    /*
      템플릿 키는 `t()` 인자에만 있지 않다 — `sortLabelKey()` 처럼 유틸이 조립해
      돌려주는 쪽이 더 많다. 그래서 인자 자리가 아니라 **어디서든** 잡는다.
    */
    if (
      ts.isTemplateExpression(node) &&
      KEY_PREFIX_SHAPE.test(node.head.text)
    ) {
      dynamics.push({
        prefix: node.head.text,
        file: relative,
        line: lineOf(node),
      })
    }

    const named = isKeyNamedBinding(node)
    if (named) keyNamedDepth += 1
    if (keyNamedDepth > 0 && ts.isStringLiteralLike(node)) {
      recordLiteral(node, node.text)
    }
    ts.forEachChild(node, visit)
    if (named) keyNamedDepth -= 1
  }

  visit(sourceFile)

  const resolved = [...namespaces]
  return {
    literals: literals.map((usage) => ({
      ...usage,
      namespaces: usage.namespaces.length > 0 ? usage.namespaces : resolved,
    })),
    dynamics,
  }
}

function getCalleeName(expression: ts.Expression): string | null {
  if (ts.isIdentifier(expression)) return expression.text
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text
  return null
}

const SCANNED = SCAN_ROOTS.flatMap((root) =>
  walk(path.join(REPO_ROOT, root)),
).map(scanFile)

const LITERAL_USAGES: readonly KeyUsage[] = SCANNED.flatMap(
  (result) => result.literals,
)
const DYNAMIC_USAGES: readonly DynamicUsage[] = SCANNED.flatMap(
  (result) => result.dynamics,
)

/**
 * 키를 찾을 네임스페이스 후보.
 *
 * `useTranslation("recipe")` 를 부르는 파일이면 그 네임스페이스에서만 찾는다 —
 * `fallbackNS` 를 켜지 않았으므로 다른 네임스페이스에 있어도 실제로는 못 읽는다.
 * 카탈로그·유틸처럼 `t()` 를 부르지 않는 파일은 소비자를 알 수 없어 전 범위에서 찾는다.
 */
function candidateNamespaces(usage: KeyUsage): readonly Namespace[] {
  return usage.namespaces.length > 0 ? usage.namespaces : NAMESPACES
}

function describe_(usage: KeyUsage, language: Language): string {
  return `${usage.key}  (${language} 없음)  ${usage.file}:${usage.line}`
}

/* ────────────────────────── 동적 키 정의역 ────────────────────────── */

/**
 * 유니온에 값이 추가됐는데 아래 목록에 넣지 않으면 **컴파일이 깨진다**.
 * 실패 메시지에 빠진 값이 그대로 찍힌다.
 */
type Complete<Union extends string, Listed extends string> = [
  Exclude<Union, Listed>,
] extends [never]
  ? true
  : ["열거 누락", Exclude<Union, Listed>]

const SAFETY_DRIVERS = [
  "sodium",
  "potassium",
  "phosphorus",
  "protein",
] as const satisfies readonly SafetyDriver[]
const _driversComplete: Complete<
  SafetyDriver,
  (typeof SAFETY_DRIVERS)[number]
> = true

/* 커뮤니티 동적 키의 정의역 (2026-09-09 추가 — 스캔이 열거 없는 접두어를 찾아냈다). */
/** 작성자 프로필 통계 행 — `CommunityAuthorProfileScreen` 이 `as const` 튜플로 조립한다. */
const AUTHOR_STAT_MODES = ["followers", "following"] as const
/** 내 활동 탭 — `CommunityLibraryTabs.LIBRARY_TABS` 와 같은 값(컴포넌트라 타입만 들여온다). */
const LIBRARY_TAB_KEYS = ["mine", "liked", "bookmarked"] as const
const _libraryTabsComplete: Complete<
  LibraryTab,
  (typeof LIBRARY_TAB_KEYS)[number]
> = true
/** 댓글 정렬 — `PostDetailScreen` 은 `popular` 만 `popularComments` 로 바꿔 조립한다. */
const COMMENT_ORDERS = [
  "oldest",
  "newest",
  "popular",
] as const satisfies readonly CommentOrder[]
const _commentOrdersComplete: Complete<
  CommentOrder,
  (typeof COMMENT_ORDERS)[number]
> = true
const commentOrderLabelKey = (order: CommentOrder): string =>
  `community.refresh.${order === "popular" ? "popularComments" : order}`

const SAFETY_LEVELS = [
  "SAFE",
  "CAUTION",
  "RESTRICTED",
  "UNKNOWN",
] as const satisfies readonly SafetyLevel[]
const _levelsComplete: Complete<SafetyLevel, (typeof SAFETY_LEVELS)[number]> =
  true

const BUSINESS_STATUSES = [
  "OPEN",
  "BEFORE_OPEN",
  "BREAK_TIME",
  "CLOSED",
  "DAY_OFF",
  "UNKNOWN",
] as const satisfies readonly BusinessStatusCode[]
const _statusesComplete: Complete<
  BusinessStatusCode,
  (typeof BUSINESS_STATUSES)[number]
> = true

const AMENITIES = [
  "RESERVATION",
  "RESTROOM_GENDERED",
  "WIFI",
  "GROUP_SEAT",
  "BABY_CHAIR",
  "PRIVATE_ROOM",
] as const satisfies readonly Amenity[]
const _amenitiesComplete: Complete<Amenity, (typeof AMENITIES)[number]> = true

const PHOTO_CATEGORIES = [
  "OWNER",
  "MENU",
  "MENUBOARD",
  "NUTRITION",
  "REVIEW",
] as const satisfies readonly PhotoCategory[]
const _photoComplete: Complete<
  PhotoCategory,
  (typeof PHOTO_CATEGORIES)[number]
> = true

const REPORT_VALIDATION_ERRORS = [
  "nameRequired",
  "categoryRequired",
  "tooManyPhotos",
] as const satisfies readonly RestaurantReportValidationError[]
const _reportComplete: Complete<
  RestaurantReportValidationError,
  (typeof REPORT_VALIDATION_ERRORS)[number]
> = true

const REVIEW_DEFECTS = [
  "RATING_MISSING",
  "CONTENT_EMPTY",
  "CONTENT_TOO_LONG",
] as const satisfies readonly ReviewDraftDefect[]
const _defectsComplete: Complete<
  ReviewDraftDefect,
  (typeof REVIEW_DEFECTS)[number]
> = true

/** 카탈로그가 가진 값이 타입 유니온을 전부 덮는지도 함께 본다. */
const _cuisineComplete: Complete<
  CuisineType,
  (typeof CUISINE_TYPES)[number]["value"]
> = true
const _nutritionComplete: Complete<
  NutritionTag,
  (typeof NUTRITION_TAGS)[number]["value"]
> = true
const _sortComplete: Complete<
  SortOption,
  (typeof SORT_OPTIONS)[number]["value"]
> = true
const _reviewSortComplete: Complete<
  ReviewSortOption,
  (typeof REVIEW_SORT_OPTIONS)[number]["value"]
> = true
const _keywordComplete: Complete<
  ReviewKeyword,
  (typeof REVIEW_KEYWORDS)[number]["value"]
> = true
const _weekdayComplete: Complete<Weekday, (typeof WEEKDAYS)[number]> = true

void [
  _driversComplete,
  _levelsComplete,
  _statusesComplete,
  _amenitiesComplete,
  _photoComplete,
  _reportComplete,
  _defectsComplete,
  _cuisineComplete,
  _nutritionComplete,
  _sortComplete,
  _reviewSortComplete,
  _keywordComplete,
  _weekdayComplete,
]

/**
 * 런타임에 조립되는 키를 정의역 전체로 펼친 목록.
 * 값이 카탈로그에서 나오는 것은 **카탈로그를 그대로 돌린다** — 손으로 옮겨 적으면
 * 카탈로그가 늘 때 이 목록만 뒤처진다.
 */
/** 좌표가 있는 목적지 하나면 링크 목록이 나온다(값 자체는 이 검사와 무관하다). */
const ROUTE_TARGET = { lat: 37.4979, lng: 127.0276, name: "신신국밥" }

const GENERATED_KEYS: readonly {
  label: string
  namespace: Namespace
  keys: readonly string[]
}[] = [
  {
    // 글쓰기·글수정 본문 플레이스홀더가 주제별로 갈린다(2026-09-12, 당근 방식).
    label: "글 주제별 본문 플레이스홀더",
    namespace: "recipe",
    keys: FREE_POST_CATEGORIES.map(
      (category) => `freePost.bodyPlaceholderByTopic.${category.key}`,
    ),
  },
  {
    label: "안전도 등급",
    namespace: "common",
    keys: SAFETY_LEVELS.map((level) => `restaurant.safety.${level}`),
  },
  {
    // `RestaurantCard`·`SafetyBadge` 가 이 모양으로 직접 조립한다.
    label: "안전도 근거 영양소",
    namespace: "common",
    keys: SAFETY_DRIVERS.map((driver) => `restaurant.safety.driver.${driver}`),
  },
  {
    /*
      길찾기 지도 앱. 목록은 플랫폼에 따라 갈리므로(iOS 애플 / 안드로이드 구글) 두
      플랫폼의 합집합을 열거한다 — 한쪽만 검사하면 나머지 플랫폼에서 키 문자열이 그대로
      화면에 뜬다.
    */
    label: "길찾기 지도 앱",
    namespace: "common",
    keys: [
      ...mapAppLinks(ROUTE_TARGET, "ios"),
      ...mapAppLinks(ROUTE_TARGET, "android"),
    ].map((link) => `restaurant.route.app.${link.key}`),
  },
  {
    label: "음식 종류",
    namespace: "common",
    keys: CUISINE_TYPES.map((item) => cuisineTypeLabelKey(item.value)),
  },
  {
    label: "영양 기준 태그",
    namespace: "common",
    keys: NUTRITION_TAGS.map((item) => nutritionTagLabelKey(item.value)),
  },
  {
    label: "목록 정렬",
    namespace: "common",
    keys: SORT_OPTIONS.map((item) => sortLabelKey(item.value)),
  },
  {
    label: "후기 정렬",
    namespace: "common",
    keys: REVIEW_SORT_OPTIONS.map(
      (item) => `restaurant.reviewSort.${item.value}`,
    ),
  },
  {
    label: "후기 키워드",
    namespace: "common",
    keys: REVIEW_KEYWORDS.map(
      (item) => `restaurant.review.keywords.${item.value}`,
    ),
  },
  {
    label: "영업 상태",
    namespace: "common",
    keys: BUSINESS_STATUSES.map((code) => `restaurant.businessStatus.${code}`),
  },
  {
    label: "요일",
    namespace: "common",
    keys: [
      ...WEEKDAYS.map((weekday) => `restaurant.weekday.${weekday}`),
      ...WEEKDAYS.map((weekday) => `restaurant.weekdayShort.${weekday}`),
    ],
  },
  {
    label: "편의시설",
    namespace: "common",
    keys: AMENITIES.map((amenity) => `restaurant.amenity.${amenity}`),
  },
  {
    label: "사진 분류",
    namespace: "common",
    keys: PHOTO_CATEGORIES.map(
      (category) => `restaurant.photo.categories.${category}`,
    ),
  },
  {
    label: "제보 검증 오류",
    namespace: "common",
    keys: REPORT_VALIDATION_ERRORS.map(
      (error) => `restaurant.report.validation.${error}`,
    ),
  },
  {
    label: "후기 작성 안내",
    namespace: "common",
    keys: REVIEW_DEFECTS.map((defect) => reviewDefectMessageKey(defect)),
  },
  {
    label: "지역 시도",
    namespace: "common",
    keys: REGION_CATALOG.map((sido) => sido.labelKey),
  },
  {
    label: "지역 그룹",
    namespace: "common",
    keys: REGION_CATALOG.flatMap((sido) =>
      sido.groups.map((group) => group.labelKey),
    ),
  },
  {
    /*
      식당 AI 상담이 프롬프트에 싣는 영양소 라벨. 식사 리포트와 **같은 키**를 쓴다
      (`mealReport.nutrients.*`) — 같은 낱말을 두 벌 번역할 이유가 없다. 다만 그
      키가 `restaurant.` 밖에 있어서, 여기 열거하지 않으면 이 파일의 스캔이
      "열거되지 않은 접두어" 로 잡는다. 정의역은 빌더가 단독으로 소유한다.
    */
    label: "상담 프롬프트 영양소",
    namespace: "common",
    keys: RESTAURANT_CONSULT_NUTRIENT_KEYS.map(
      (key) => `mealReport.nutrients.${key}`,
    ),
  },
  {
    label: "작성자 프로필 통계",
    namespace: "common",
    keys: AUTHOR_STAT_MODES.map((mode) => `community.author.${mode}`),
  },
  {
    label: "내 활동 탭",
    namespace: "common",
    keys: LIBRARY_TAB_KEYS.map((tab) => `community.library.tabs.${tab}`),
  },
  {
    label: "내 활동 빈 상태",
    namespace: "common",
    keys: LIBRARY_TAB_KEYS.flatMap((tab) => [
      `community.library.empty.${tab}.title`,
      `community.library.empty.${tab}.body`,
    ]),
  },
  {
    label: "댓글 정렬",
    namespace: "common",
    keys: COMMENT_ORDERS.map(commentOrderLabelKey),
  },
]

/**
 * 위 목록이 덮는 동적 접두어. 스캔이 여기 없는 접두어를 찾으면 실패한다 —
 * 새 `` t(`restaurant.무엇.${x}`) `` 가 열거 없이 들어오는 것을 막는 유일한 장치다.
 */
const ENUMERATED_PREFIXES: readonly string[] = [
  /*
    `restaurant.safety.` 와 `restaurant.filter.regions.` 는 여기 없다. 그 접두어를 동적으로
    조립하던 곳(`safetyAccessibilityKeys`, 선택 트레이의 `selectionChips`)이 호출부 없이
    남아 있다가 지워졌다. 등급 라벨은 위 표(`안전도 등급`)가, 시도 라벨은
    `regionCatalog` 의 리터럴 키가 각각 리터럴 검사로 계속 덮인다.
  */
  "freePost.bodyPlaceholderByTopic.",
  "restaurant.safety.driver.",
  "restaurant.cuisine.",
  "restaurant.nutritionTag.",
  "restaurant.sort.",
  "restaurant.reviewSort.",
  "restaurant.review.keywords.",
  "restaurant.businessStatus.",
  "restaurant.weekday.",
  "restaurant.weekdayShort.",
  "restaurant.amenity.",
  "restaurant.photo.categories.",
  // `restaurant.report.validation.` 은 없다 — 폼이 리터럴 키로만 부르므로 리터럴 검사가 덮는다.
  "restaurant.region.groups.",
  "restaurant.route.app.",
  "mealReport.nutrients.",
  "community.author.",
  "community.library.tabs.",
  "community.library.empty.",
  "community.refresh.",
]

/* ────────────────────────── 검사 ────────────────────────── */

describe("i18n 키 존재 보증 (식당·레시피)", () => {
  it("스캔이 실제로 키를 모은다", () => {
    // 스캐너가 조용히 0건이 되면 아래 검사가 전부 통과해 버린다.
    expect(LITERAL_USAGES.length).toBeGreaterThan(300)
  })

  it("리터럴로 쓰인 키가 ko·en 양쪽에 있다", () => {
    const failures: string[] = []
    for (const usage of LITERAL_USAGES) {
      const candidates = candidateNamespaces(usage)
      for (const language of LANGUAGES) {
        const found = candidates.some((namespace) =>
          hasKey(language, namespace, usage.key),
        )
        if (!found) failures.push(describe_(usage, language))
      }
    }
    expect([...new Set(failures)].sort()).toEqual([])
  })

  it("표에서 조립되는 키가 정의역 전체에서 ko·en 양쪽에 있다", () => {
    const failures: string[] = []
    for (const group of GENERATED_KEYS) {
      for (const key of group.keys) {
        for (const language of missingLanguages(group.namespace, key)) {
          failures.push(`${group.label}: ${key} (${language} 없음)`)
        }
      }
    }
    expect([...new Set(failures)].sort()).toEqual([])
  })

  it("모든 동적 키 접두어가 열거 대상이다", () => {
    const unenumerated = DYNAMIC_USAGES.filter(
      (usage) => !ENUMERATED_PREFIXES.includes(usage.prefix),
    ).map((usage) => `${usage.prefix}\${…}  ${usage.file}:${usage.line}`)
    // 새 접두어가 보이면 GENERATED_KEYS 에 정의역을 추가하고 여기에도 적는다.
    expect([...new Set(unenumerated)].sort()).toEqual([])
  })

  it("열거 목록에 죽은 접두어가 남아 있지 않다", () => {
    const used = new Set(DYNAMIC_USAGES.map((usage) => usage.prefix))
    const stale = ENUMERATED_PREFIXES.filter((prefix) => !used.has(prefix))
    expect(stale).toEqual([])
  })

  it("ko 에만 있는 식당·레시피 문구가 없다", () => {
    const missingInEnglish = [
      ...leafKeys(koCommon.restaurant, "restaurant")
        .filter((key) => !hasKey("en", "common", key))
        .map((key) => `common:${key}`),
      ...leafKeys(koRecipe)
        .filter((key) => !hasKey("en", "recipe", key))
        .map((key) => `recipe:${key}`),
    ]
    expect(missingInEnglish.sort()).toEqual([])
  })
})
