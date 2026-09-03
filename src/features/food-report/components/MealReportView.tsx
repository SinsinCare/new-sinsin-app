import { Ionicons } from "@expo/vector-icons"
import { useMemo, useState } from "react"
import { StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import Animated, { FadeInDown, ReduceMotion } from "react-native-reanimated"

import { useSurface } from "@/src/hooks/useSurface"
import { EmphasizedText } from "@/src/shared/components/EmphasizedText"
import {
  ItemCard,
  REPORT_CARD,
  REPORT_GAP,
  SectionStack,
} from "@/src/shared/components/ReportSection"
import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import { LAYOUT, TYPE, type SurfacePalette } from "@/src/theme/surface"

import type { MealReport, ReportBudget, VerdictLevel } from "../types/report"
import { NutrientDetailSheet } from "./NutrientDetailSheet"
import { useTranslation } from "react-i18next"

/**
 * 한 끼 인사이트 리포트.
 *
 * **판정과 근거가 먼저, 수치는 접어서.** 예전 화면은 큰 칼로리 숫자와 도넛 4개로
 * 시작해서 "그래서 저녁에 뭘 먹지"를 알 수 없었다. 여기서는 한 줄 판정 → 근거 →
 * 남은 예산 → 음식별 이유 → 바꿔 먹기 순으로 읽힌다. 8개 영양소 전체 표는
 * 접힘 패널로 내린다.
 *
 * 화면은 숫자를 만들지 않는다. 서버가 보낸 표시용 문자열을 그대로 쓴다 —
 * 숫자를 **강조**하는 것(굵게, 브랜드색)은 스타일이지 계산이 아니다.
 */
export function MealReportView({ report }: { report: MealReport }) {
  const s = useSurface()
  const { i18n } = useTranslation("common")
  const numberLocale = (i18n.resolvedLanguage ?? i18n.language).startsWith("en")
    ? "en-US"
    : "ko-KR"
  const [detailOpen, setDetailOpen] = useState(false)
  const { facts, prose } = report

  return (
    <Animated.View
      entering={FadeInDown.duration(280).reduceMotion(ReduceMotion.System)}
      // 섹션 사이 24 — 섹션 안 카드 사이(8)와 확실히 달라야 화제 전환이 읽힌다.
      style={{ gap: REPORT_GAP.section }}
    >
      <AnchorCard report={report} s={s} />

      {facts.budgets.length > 0 && (
        <BudgetSection
          budgets={facts.budgets}
          focusNutrient={facts.focus?.nutrient}
          focusLabel={facts.focus?.nutrientLabel}
          energyPercent={facts.energyPercent}
          energyText={formatKcal(facts.mealTotal.calories, numberLocale)}
          detailOpen={detailOpen}
          onToggleDetail={() => setDetailOpen((v) => !v)}
          report={report}
          s={s}
        />
      )}

      {facts.foods.length > 0 && (
        <FoodBreakdownSection
          foods={facts.foods}
          notes={prose.foodNotes}
          s={s}
        />
      )}

      {facts.swaps.length > 0 && (
        <SwapSection
          swaps={facts.swaps}
          tip={prose.swapTip || facts.cookingTip}
          s={s}
        />
      )}
    </Animated.View>
  )
}

/* ─── ④ 앵커 카드 — 한 줄 판정 + 근거 ─────────────────────────── */

function AnchorCard({ report, s }: { report: MealReport; s: Surface }) {
  const { t } = useTranslation("common")
  const { facts, prose } = report
  const tone = verdictTone(facts.mealVerdict.level, s)
  // 화면의 악센트는 하나다. 의미에 따라 색만 바뀐다 —
  // 아직 여유가 있으면 brand("지금 쓸 수 있는 양"), 넘겼으면 danger.
  // 초과 숫자를 CTA 색으로 칠하면 나쁜 소식이 광고처럼 읽힌다.
  const accent = facts.focus?.level === "OVER" ? s.danger : s.brand
  /* 헤드라인이 가리키는 영양소의 하루 한도. 한도를 모르는 영양소면 캡션을 접는다. */
  const focusLimitText =
    facts.budgets.find((b) => b.nutrient === facts.focus?.nutrient)?.limitText ??
    null

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: s.card, borderColor: s.hairline },
      ]}
    >
      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: s.surface }]}>
          <View style={[styles.badgeDot, { backgroundColor: tone.dot }]} />
          <Text
            style={[styles.badgeText, { color: tone.fg }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {facts.focus
              ? `${facts.focus.nutrientLabel} ${facts.mealVerdict.label}`
              : facts.mealVerdict.label}
          </Text>
        </View>
        <Text
          style={[styles.badgeMeta, { color: s.textWeak }]}
          numberOfLines={1}
        >
          {facts.mealName} ·{" "}
          {facts.isRecorded
            ? t("mealReport.recorded")
            : t("mealReport.notRecorded")}
        </Text>
      </View>

      <EmphasizedText
        style={[styles.headline, { color: s.textStrong }]}
        emphasisColor={accent}
        lineBreakStrategyIOS="hangul-word"
        textBreakStrategy="balanced"
      >
        {prose.headline}
      </EmphasizedText>

      {prose.evidence.length > 0 && (
        <View style={{ gap: 2 }}>
          {prose.evidence.map((line) => (
            <Text
              key={line}
              style={[styles.evidence, { color: s.textMuted }]}
              lineBreakStrategyIOS="hangul-word"
              textBreakStrategy="balanced"
            >
              {line}
            </Text>
          ))}
        </View>
      )}

      {facts.split && (
        <MealSplitBar split={facts.split} accent={accent} s={s} />
      )}

      {/*
        하루 권장량은 **헤드라인에서 내려온 문장**이다. 예전에는 서버가 "오늘 더 드실 수
        있는 인은 43mg이에요. 하루 참고 기준은 900mg이에요. 남은 3끼에 나누면…" 세 문장을
        한 줄로 붙여 보냈고, 그 덩어리가 카드 위쪽 세 줄을 먹었다(2026-09-03 PM 피드백).
        헤드라인은 한 문장만 남기고, 한도 숫자는 **읽을 사람만 읽도록** 여기 작은 글씨로
        둔다. 숫자는 서버가 `limitText` 로 이미 보내므로 화면이 다시 만들지 않는다.
      */}
      {focusLimitText !== null && (
        <Text style={[styles.dailyLimit, { color: s.textWeak }]}>
          {t("mealReport.dailyLimit", { limit: focusLimitText })}
        </Text>
      )}

      {!!prose.plainly && (
        <View style={[styles.plainly, { backgroundColor: s.surface }]}>
          <Text style={[styles.plainlyLabel, { color: s.textMuted }]}>
            {t("mealReport.atAGlance")}
          </Text>
          <EmphasizedText
            style={[styles.plainlyText, { color: s.textStrong }]}
            emphasisColor={s.textStrong}
            lineBreakStrategyIOS="hangul-word"
          >
            {prose.plainly}
          </EmphasizedText>
        </View>
      )}
    </View>
  )
}

/** 지난 끼니 / 이 끼니 / 남은 몫. 세그먼트 사이를 2pt 띄워 마디가 읽히게 한다. */
function MealSplitBar({
  split,
  accent,
  s,
}: {
  split: MealReport["facts"]["split"]
  accent: string
  s: Surface
}) {
  const widths = useMemo(() => {
    if (!split) return null
    const total = split.past + split.current + split.remaining
    if (total <= 0) return null
    return {
      past: (split.past / total) * 100,
      current: (split.current / total) * 100,
      remaining: (split.remaining / total) * 100,
    }
  }, [split])

  if (!split || !widths) return null

  return (
    <View style={styles.splitWrap}>
      <View style={styles.splitTrack}>
        {widths.past > 0 && (
          <View
            style={[
              styles.splitSeg,
              { flex: widths.past, backgroundColor: s.surfacePressed },
            ]}
          />
        )}
        <View
          style={[
            styles.splitSeg,
            { flex: Math.max(widths.current, 4), backgroundColor: accent },
          ]}
        />
        {widths.remaining > 0 && (
          <View
            style={[
              styles.splitSeg,
              { flex: widths.remaining, backgroundColor: s.surface },
            ]}
          />
        )}
      </View>
      <View style={styles.splitLabels}>
        <SplitLabel
          title={split.pastLabel}
          value={split.pastText}
          color={s.textWeak}
          hidden={split.past <= 0}
        />
        <SplitLabel
          title={split.currentLabel}
          value={split.currentText}
          color={accent}
          strong
        />
        <SplitLabel
          title={split.remainingLabel}
          value={split.remainingShareText}
          color={s.textWeak}
          hidden={split.isLastMeal}
          align="right"
        />
      </View>
    </View>
  )
}

function SplitLabel({
  title,
  value,
  color,
  strong,
  hidden,
  align = "left",
}: {
  title: string
  value: string
  color: string
  strong?: boolean
  hidden?: boolean
  align?: "left" | "right"
}) {
  if (hidden) return <View style={{ flex: 1 }} />
  return (
    <View
      style={{
        flex: 1,
        alignItems: align === "right" ? "flex-end" : "flex-start",
      }}
    >
      <Text style={[styles.splitTitle, { color }]} numberOfLines={1}>
        {title}
      </Text>
      <Text
        style={[
          styles.splitValue,
          styles.tabular,
          { color, fontWeight: strong ? "800" : "600" },
        ]}
      >
        {value}
      </Text>
    </View>
  )
}

/* ─── ⑤ 남은 예산 ──────────────────────────────────────────── */

function BudgetSection({
  budgets,
  focusNutrient,
  focusLabel,
  energyPercent,
  energyText,
  detailOpen,
  onToggleDetail,
  report,
  s,
}: {
  budgets: ReportBudget[]
  focusNutrient?: string
  focusLabel?: string
  energyPercent: number | null
  energyText: string
  detailOpen: boolean
  onToggleDetail: () => void
  report: MealReport
  s: Surface
}) {
  const { t } = useTranslation("common")
  // 한도를 모르는 영양소(체중 미기록 → 단백질)는 카드를 만들지 않는다.
  const shown = budgets.filter((b) => b.limit !== null)

  return (
    <SectionStack
      title={
        focusLabel
          ? t("mealReport.focus", { nutrient: focusLabel })
          : t("mealReport.comparison")
      }
      caption={t("mealReport.profileReference")}
    >
      {shown.map((b) => (
        <ItemCard key={b.nutrient}>
          <BudgetRow budget={b} isFocus={b.nutrient === focusNutrient} s={s} />
        </ItemCard>
      ))}

      {/* 열량은 한도가 아니라 참고값이다 — 예산 카드들과 같은 무게로 두지 않는다. */}
      <View style={styles.energyRow}>
        <Text style={[styles.energyLabel, { color: s.textWeak }]}>
          {t("mealReport.nutrients.calories")}
        </Text>
        <Text
          style={[styles.energyValue, styles.tabular, { color: s.textMuted }]}
        >
          {energyText}
          {energyPercent !== null
            ? ` · ${t("mealReport.energyReferencePercent", {
                percent: energyPercent,
              })}`
            : ""}
        </Text>
      </View>

      <ItemCard style={styles.detailCard}>
        <SurfacePressable
          onPress={onToggleDetail}
          baseColor={s.card}
          pressedColor={s.surfacePressed}
          style={styles.detailLink}
          accessibilityLabel={
            detailOpen
              ? t("mealReport.hideDetails")
              : t("mealReport.showDetails")
          }
          accessibilityState={{ selected: detailOpen }}
        >
          <Text style={[styles.detailLinkText, { color: s.textStrong }]}>
            {detailOpen
              ? t("mealReport.hideDetails")
              : t("mealReport.showDetails")}
          </Text>
          <Ionicons
            name={detailOpen ? "chevron-up" : "chevron-down"}
            size={16}
            color={s.textWeak}
          />
        </SurfacePressable>

        <NutrientDetailSheet open={detailOpen} report={report} />
      </ItemCard>
    </SectionStack>
  )
}

function BudgetRow({
  budget,
  isFocus,
  s,
}: {
  budget: ReportBudget
  isFocus: boolean
  s: Surface
}) {
  const { t } = useTranslation("common")
  // 한도를 모르면(체중 미기록 → 단백질) 행 자체를 그리지 않는다. 지어내지 않는다.
  if (budget.limit === null) return null

  const ratio = Math.min(1, Math.max(0, budget.usedRatio ?? 0))
  // 색이 지는 역할은 하나뿐이다 — "오늘 조심할 것" 한 줄만 브랜드,
  // 넘긴 줄만 danger. 나머지는 그레이가 진다. 바 네 개가 전부 주황이면
  // 어느 것도 주황이 아니다.
  const tone = budget.isOver ? s.danger : isFocus ? s.brand : s.placeholder

  return (
    <View style={styles.budgetRow}>
      <View style={styles.budgetHead}>
        <View style={styles.budgetLabelRow}>
          <Text style={[styles.budgetLabel, { color: s.text }]}>
            {budget.label}
          </Text>
          {budget.isReference && (
            <Text style={[styles.referenceTag, { color: s.placeholder }]}>
              {t("stats.reference")}
            </Text>
          )}
        </View>
        <Text
          style={[
            styles.budgetValue,
            styles.tabular,
            { color: budget.isOver ? s.danger : s.textStrong },
          ]}
        >
          {budget.isOver
            ? t("mealReport.over", { amount: budget.overText })
            : budget.isReference
              ? t("mealReport.untilLimit", {
                  amount: budget.remainingText,
                })
              : t("mealReport.remaining", {
                  amount: budget.remainingText,
                })}
        </Text>
      </View>
      <View style={[styles.budgetTrack, { backgroundColor: s.surface }]}>
        <View
          style={{
            width: `${Math.max(ratio * 100, 2)}%`,
            height: "100%",
            backgroundColor: tone,
            borderRadius: 999,
          }}
        />
      </View>
      {/* 기준이 얼마인지 화면에 있어야 한다. 예전에는 "9.6g 초과" 만 있어서
          한도(0.6 × 50kg = 30g)가 어디에도 보이지 않았다 — 넘긴 양만으로는
          많이 넘긴 건지 조금인지 환자가 판단할 수 없다.

          `null` 비교가 아니라 truthy 검사다: 이 필드가 없던 시절에 저장된 리포트가
          섞여 들어오면 `undefined` 라, `!== null` 로 걸면 "하루 기준 undefined 중
          undefined" 가 그려진다. 서버는 정책 버전을 올려 옛 리포트를 다시 만들지만
          (`POLICY_VERSION` v8), 화면이 그 약속에 기대야 할 이유는 없다. */}
      {budget.limitText && budget.consumedText && (
        <Text
          style={[styles.budgetScale, styles.tabular, { color: s.textWeak }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {t(
            budget.isReference
              ? "mealReport.scaleReference"
              : "mealReport.scaleDaily",
            { limit: budget.limitText, consumed: budget.consumedText },
          )}
        </Text>
      )}
    </View>
  )
}

/* ─── ⑥ 음식별로 보면 ───────────────────────────────────────── */

function FoodBreakdownSection({
  foods,
  notes,
  s,
}: {
  foods: MealReport["facts"]["foods"]
  notes: Record<string, string>
  s: Surface
}) {
  const { t } = useTranslation("common")
  return (
    <SectionStack
      title={t("mealReport.byFood")}
      caption={t("mealReport.relevantNutrients")}
    >
      {foods.map((food, index) => {
        const tone = verdictTone(food.level, s)
        return (
          <ItemCard key={`${food.name}-${index}`}>
            <View style={styles.foodHead}>
              <Text
                style={[styles.foodName, { color: s.textStrong }]}
                numberOfLines={1}
              >
                {food.name}
                {food.grams !== null && (
                  <Text style={[styles.foodGrams, { color: s.textWeak }]}>
                    {" "}
                    {food.grams}g
                  </Text>
                )}
              </Text>
              <View style={[styles.levelBadge, { backgroundColor: s.surface }]}>
                <View
                  style={[styles.badgeDot, { backgroundColor: tone.dot }]}
                />
                <Text style={[styles.levelText, { color: tone.fg }]}>
                  {food.levelLabel}
                </Text>
              </View>
            </View>

            {/* 앵커는 하루 기준이다. "이 식사의 93%" 는 끼니가 작으면 무의미해서
                환자가 행동할 수 없다(실제 피드백: "뭐라는지 모르겠어"). */}
            {food.nutrientLabel && food.amountText && (
              <Text
                style={[
                  styles.foodMetric,
                  styles.tabular,
                  { color: s.textWeak },
                ]}
                lineBreakStrategyIOS="hangul-word"
              >
                {food.dailyPercent !== null
                  ? t("mealReport.foodDailyPercent", {
                      nutrient: food.nutrientLabel,
                      amount: food.amountText,
                      percent: food.dailyPercent,
                    })
                  : `${food.nutrientLabel} ${food.amountText}`}
              </Text>
            )}

            {!!notes[food.name] && (
              <Text
                style={[styles.foodNote, { color: s.text }]}
                lineBreakStrategyIOS="hangul-word"
              >
                {notes[food.name]}
              </Text>
            )}
          </ItemCard>
        )
      })}
    </SectionStack>
  )
}

/* ─── ⑦ 이렇게 바꾸면 편해요 ─────────────────────────────────── */

function SwapSection({
  swaps,
  tip,
  s,
}: {
  swaps: MealReport["facts"]["swaps"]
  tip: string
  s: Surface
}) {
  const { t } = useTranslation("common")
  return (
    <SectionStack title={t("mealReport.swaps")}>
      {swaps.map((swap, index) => (
        <ItemCard key={`${swap.fromName}-${index}`} style={styles.swapCard}>
          <View style={styles.swapNames}>
            <Text
              style={[styles.swapFrom, { color: s.textMuted }]}
              numberOfLines={1}
            >
              {swap.fromName}
            </Text>
            <Ionicons name="arrow-forward" size={13} color={s.textWeak} />
            <Text
              style={[styles.swapTo, { color: s.textStrong }]}
              numberOfLines={1}
            >
              {swap.toName}
            </Text>
          </View>
          <Text style={[styles.swapDelta, styles.tabular, { color: s.brand }]}>
            {swap.nutrientLabel} {swap.deltaText} ↓
          </Text>
        </ItemCard>
      ))}

      {!!tip && (
        <View style={styles.swapTipRow}>
          <Ionicons name="bulb-outline" size={14} color={s.textWeak} />
          <Text
            style={[styles.swapTip, { color: s.textMuted }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {tip}
          </Text>
        </View>
      )}
    </SectionStack>
  )
}

/* ─── 공통 ───────────────────────────────────────────────────── */

type Surface = SurfacePalette & { isDark: boolean }

/**
 * 판정 표시는 토스식 절제를 따른다 — 상태색은 6px 도트에만 얹고
 * 면과 글자는 그레이스케일이 진다. 틴트 면을 늘어놓으면 화면이
 * 경고로 얼룩져서 정작 큰 경고가 묻힌다.
 */
function verdictTone(level: VerdictLevel, s: Surface) {
  if (level === "RESTRICTED") return { dot: s.danger, fg: s.textStrong }
  if (level === "CAUTION") return { dot: s.caution, fg: s.textStrong }
  return { dot: s.placeholder, fg: s.textMuted }
}

function formatKcal(value: number | undefined, locale: string) {
  if (!value) return "0kcal"
  return `${Math.round(value).toLocaleString(locale)}kcal`
}

const styles = StyleSheet.create({
  tabular: { fontVariant: ["tabular-nums"] },

  card: { ...REPORT_CARD, gap: 12 },

  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    // 배지 문구는 서버가 준다 — 영어("Potassium Needs a quick check")는
    // 한국어("칼륨 주의")의 4배다. 고정 높이·무제한 폭이면 옆의 끼니 메타가
    // "Breakfast · Lo…" 로 뭉개진다.
    minHeight: LAYOUT.badge.height,
    flexShrink: 1,
    borderRadius: LAYOUT.badge.radius,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeDot: { width: 5, height: 5, borderRadius: 999 },
  badgeText: { ...TYPE.cardSub, fontWeight: "700", flexShrink: 1 },
  badgeMeta: { ...TYPE.cardSub, flexShrink: 0 },

  headline: {
    fontSize: 21,
    lineHeight: 30,
    letterSpacing: -0.42,
    fontWeight: "800",
  },
  evidence: { ...TYPE.caption },
  dailyLimit: { ...TYPE.caption, marginTop: -2 },

  splitWrap: { gap: 7, marginTop: 2 },
  splitTrack: { flexDirection: "row", height: 8, gap: 2 },
  splitSeg: { borderRadius: 999 },
  splitLabels: { flexDirection: "row", gap: 8 },
  splitTitle: { ...TYPE.cardSub },
  splitValue: { fontSize: 13.5, lineHeight: 19, letterSpacing: -0.27 },

  plainly: { borderRadius: 12, padding: 14, gap: 3 },
  plainlyLabel: { ...TYPE.cardSub, fontWeight: "700" },
  plainlyText: { ...TYPE.cardTitle, fontWeight: "600" },

  budgetRow: { gap: 6 },
  budgetHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  budgetLabelRow: { flexDirection: "row", alignItems: "baseline", gap: 5 },
  budgetLabel: { ...TYPE.caption, fontWeight: "600" },
  referenceTag: { fontSize: 11, lineHeight: 15, letterSpacing: -0.22 },
  budgetValue: { ...TYPE.caption, fontWeight: "700" },
  budgetTrack: { height: 6, borderRadius: 999, overflow: "hidden" },
  budgetScale: { ...TYPE.cardSub },

  // 열량은 카드 밖 한 줄 — 예산 카드와 같은 무게로 서면 안 된다.
  energyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingTop: 2,
  },
  energyLabel: { ...TYPE.cardSub, fontWeight: "600" },
  energyValue: { ...TYPE.cardSub },

  // 접힘 패널을 품는 카드 — 링크 줄이 카드 패딩을 직접 갖는다.
  detailCard: { paddingVertical: 6, paddingHorizontal: 12, gap: 0 },
  detailLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    height: LAYOUT.control.height,
    borderRadius: LAYOUT.control.radius,
  },
  detailLinkText: { ...TYPE.caption, fontWeight: "600" },

  foodHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  foodName: { ...TYPE.cardTitle, fontWeight: "700", flex: 1 },
  foodGrams: { ...TYPE.cardSub, fontWeight: "500" },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: LAYOUT.badge.radius,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  levelText: { ...TYPE.cardSub, fontWeight: "700" },
  foodMetric: { ...TYPE.cardSub },
  foodNote: { ...TYPE.caption },

  swapCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 14,
  },
  swapNames: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  swapFrom: { ...TYPE.caption, flexShrink: 1 },
  swapTo: { ...TYPE.caption, fontWeight: "700", flexShrink: 1 },
  swapDelta: { ...TYPE.cardSub, fontWeight: "800" },

  swapTipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingTop: 2,
  },
  swapTip: { ...TYPE.cardSub, flex: 1 },
})
