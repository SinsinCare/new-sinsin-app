import {
  FONT_SCALE,
  effectiveTextScale,
} from "@/src/design-system-v2/tokens/fontScaling"
import { useMemo, useRef, useState } from "react"
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native"
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"

import { RecordMetricSummary } from "./RecordMetricSummary"
import { WaterGlass } from "./WaterGlass"
import { recordEnter, recordExit, recordLayout } from "./recordMotion"
import { useRecordSaveFeedback } from "../../../hooks/useRecordSaveFeedback"
import { useRecordExitGuard } from "../../../hooks/useRecordExitGuard"

import { Text } from "@/src/shared/components/AppText"
import { V2BottomSheet, V2SheetTextInput } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { fontFamily } from "@/src/design-system-v2/tokens/typography"
import { MOTION } from "@/src/theme/surface"
import { hapticSelection } from "@/src/lib/haptics"
import { roundForDisplay } from "@/src/shared/utils/displayNumber"
import { trackAnalyticsEvent } from "@/src/features/analytics"

import { getHydrationGuidance } from "../../../utils/hydrationGuidance"
import { useHealthEntryInput } from "../../../hooks/useHealthEntryInput"
import type { WaterPageParams } from "../../../stores/recordPageStore"
import { recordInk, recordFieldLabel } from "./recordInk"
import { RecordPageShell } from "./RecordPageShell"
import {
  FORM,
  MIN,
  PAGE_X,
  S,
  WATER_CARD,
  WATER_QUICK,
  WATER_ROW,
} from "./recordPageSpec"

const EASE = Easing.bezier(0.22, 1, 0.36, 1)
const SPRING = { ...MOTION.spring, reduceMotion: ReduceMotion.System }

/** 시안의 빠른 담기 셋(+100 반 컵 / +200 한 컵 / +300 큰 컵). */
const QUICK = [
  { amount: 100, key: "half" },
  { amount: 200, key: "one" },
  { amount: 300, key: "large" },
] as const

/** 직접 입력의 기존 상한. 범위를 넘으면 값을 자르지 않고 입력 안내를 보여 준다. */
const MAX_ONE_POUR = 2000

/**
 * 수분 기록 페이지 — 공통 건강 기록 디자인(2026-09-05).
 *
 * 담기는 로컬, 저장은 CTA 한 번. 프리셋은 페이지에서 바로 선택하고
 * 직접 입력은 보조 시트에서 한다. 담은 잔은 아래 목록에 시각과 함께 쌓인다.
 * 각 행의 삭제 버튼으로 저장 전 추가한 양을 취소할 수 있다.
 */
export function WaterRecordPage({
  params,
  onBack,
}: {
  params: WaterPageParams
  onBack: () => void
}) {
  const { t, i18n } = useTranslation("common")
  const language = (i18n.resolvedLanguage ?? i18n.language).startsWith("en")
    ? "en"
    : "ko"
  const numberLocale = language === "en" ? "en-US" : "ko-KR"
  const s = useSurface()
  const ink = recordInk(s.isDark)
  const { fontScale: systemFontScale } = useWindowDimensions()
  const fontScale = effectiveTextScale(systemFontScale, FONT_SCALE.body)
  const markInput = useHealthEntryInput("water", true)

  /*
    mL 은 정수로 보여준다. 서버 값이 double 이라 그대로 두면 누적 합이 `1,860.9` 처럼
    의미 없는 소수를 달고 나온다 — 0.9mL 를 구분해 마시는 사람은 없다.
  */
  const formatAmount = (value: number) =>
    roundForDisplay(value).toLocaleString(numberLocale)

  /** 이 페이지에서 담은 잔들. 저장 전까지는 로컬이다. */
  const [session, setSession] = useState<
    { id: number; amount: number; at: Date }[]
  >([])
  const nextId = useRef(0)
  const save = useRecordSaveFeedback()
  const isBusy = save.isSaving
  const [isSheetOpen, setSheetOpen] = useState(false)
  const [isInfoOpen, setInfoOpen] = useState(false)
  const [draft, setDraft] = useState("")
  const pop = useSharedValue(1)

  const sessionTotal = session.reduce((sum, row) => sum + row.amount, 0)
  const { leaveAfterSave } = useRecordExitGuard({
    hasChanges: session.length > 0 || draft.length > 0,
    isSaving: isBusy,
    onBack,
  })
  const total = params.consumed + sessionTotal
  const guidance = getHydrationGuidance({
    consumed: total,
    limit: params.limit,
    isReferenceLimit: params.isReferenceLimit,
    language,
  })
  const hasLimit = params.limit != null && params.limit > 0
  const percent = hasLimit ? Math.round((total / params.limit!) * 100) : 0

  const bump = () => {
    pop.value = withSequence(
      withTiming(1.02, {
        duration: 110,
        easing: EASE,
        reduceMotion: ReduceMotion.System,
      }),
      withSpring(1, SPRING),
    )
  }

  const addPour = (amount: number, method: "preset" | "keypad" = "preset") => {
    if (amount <= 0 || isBusy) return
    markInput(method)
    hapticSelection()
    const id = nextId.current++
    setSession((prev) => [...prev, { id, amount, at: new Date() }])
    bump()
    setDraft("")
    setSheetOpen(false)
  }

  const removePour = (id: number) => {
    if (isBusy) return
    hapticSelection()
    setSession((prev) => prev.filter((row) => row.id !== id))
    bump()
  }

  const draftAmount = useMemo(() => {
    const parsed = Number(draft.replace(/[^0-9]/gu, ""))
    return Number.isFinite(parsed) && parsed > 0 && parsed <= MAX_ONE_POUR
      ? parsed
      : null
  }, [draft])

  const commit = async () => {
    if (sessionTotal === 0 || isBusy) return
    /*
      CTA 를 누른 순간. 이 화면만 서버 요청이 잔마다가 아니라 여기 한 번이라
      `item_count`(이번에 담은 잔 수)를 여기서만 알 수 있다 — 다른 지표는 언제나 1이다.
    */
    const ok = await save.run(() => {
      trackAnalyticsEvent("health_entry_save_started", {
        metric: "water",
        item_count: session.length,
      })
      return params.onLog(sessionTotal)
    })
    // 실패면 담긴 잔을 그대로 두고 화면도 그대로 둔다 — 다시 누르면 재시도다.
    if (ok) leaveAfterSave()
  }

  const numberStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }))

  return (
    <>
      <RecordPageShell
        title={t("home.recordPage.water.title")}
        intro={t("home.recordPage.water.intro")}
        subtitle={params.date?.replace(/-/gu, ".")}
        onBack={onBack}
        onInfo={() => setInfoOpen(true)}
        ctaLabel={
          sessionTotal > 0
            ? t("home.recordPage.water.saveAmount", {
                amount: formatAmount(sessionTotal),
              })
            : t("home.recordPage.water.save")
        }
        ctaDisabled={sessionTotal === 0}
        ctaLoading={isBusy}
        keyboardEnabled={false}
        onCtaPress={() => void commit()}
      >
        <Animated.View style={[styles.cardWrap, numberStyle]}>
          <RecordMetricSummary
            label={t("home.recordPage.water.totalLabel")}
            value={formatAmount(total)}
            unit="mL"
            artwork={
              <View style={styles.glass}>
                <WaterGlass
                  size={WATER_CARD.glassSize}
                  percent={percent}
                  amount={formatAmount(total)}
                  hasLimit={hasLimit}
                  ink={ink}
                  textColor={s.textStrong}
                  showLabels={false}
                />
              </View>
            }
          />
        </Animated.View>

        <Text
          style={[
            styles.guidance,
            { minHeight: FORM.hint.lineHeight * 2 * fontScale },
            { color: guidance.tone === "relaxed" ? s.text : s.textStrong },
          ]}
        >
          {guidance.message}
        </Text>

        <View style={styles.quickSection}>
          <View style={styles.quickHeading}>
            <Text style={[FORM.label, { color: s.textStrong }]}>
              {t("home.recordPage.water.quickTitle")}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("home.recordPage.water.custom")}
              disabled={isBusy}
              onPress={() => setSheetOpen(true)}
              style={styles.customButton}
            >
              <Text style={[FORM.option, { color: s.text }]}>
                {t("home.recordPage.water.custom")}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={s.text}
                accessible={false}
              />
            </Pressable>
          </View>
          <View style={styles.quickRow}>
            {QUICK.map((preset) => (
              <Pressable
                key={preset.amount}
                accessibilityRole="button"
                accessibilityLabel={t("home.recordPage.water.cupLabel", {
                  amount: preset.amount,
                  anchor: t(
                    `home.recordPage.water.quick.${preset.key}` as never,
                  ),
                })}
                disabled={isBusy}
                onPress={() => addPour(preset.amount)}
                style={({ pressed }) => [
                  styles.quick,
                  styles.quickCell,
                  {
                    backgroundColor: pressed
                      ? s.surfacePressed
                      : s.surfaceSunken,
                  },
                ]}
              >
                <Text style={[styles.quickAmount, { color: s.textStrong }]}>
                  + {preset.amount} mL
                </Text>
                <Text
                  style={[styles.quickAnchor, { color: recordFieldLabel(s) }]}
                >
                  {t(`home.recordPage.water.quick.${preset.key}` as never)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.listHeading}>
          <Text style={[styles.listTitle, { color: s.textStrong }]}>
            {t("home.recordPage.water.pendingTitle")}
          </Text>
          {session.length > 0 && (
            <Text style={[styles.listTotal, { color: s.text }]}>
              +{formatAmount(sessionTotal)} mL
            </Text>
          )}
        </View>
        {session.length === 0 ? (
          <Text style={[styles.empty, { color: s.text }]}>
            {t("home.recordPage.water.empty")}
          </Text>
        ) : (
          session.map((row) => {
            const label = `${formatAmount(row.amount)} mL`
            return (
              <Animated.View
                key={row.id}
                entering={recordEnter}
                exiting={recordExit}
                layout={recordLayout}
                style={[styles.row, { borderBottomColor: s.border }]}
              >
                <Ionicons
                  accessible={false}
                  name="water-outline"
                  size={18}
                  color={s.text}
                />
                <Text style={[styles.rowLabel, { color: s.textStrong }]}>
                  {label}
                </Text>
                <View style={styles.rowChip}>
                  <Text style={[styles.rowChipLabel, { color: s.text }]}>
                    {clockLabel(row.at)}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("home.recordPage.water.removeRow", {
                    label,
                  })}
                  disabled={isBusy}
                  onPress={() => removePour(row.id)}
                  style={styles.removeButton}
                >
                  <Ionicons name="close" size={16} color={s.text} />
                </Pressable>
              </Animated.View>
            )
          })
        )}
      </RecordPageShell>

      {/* 제목 옆 i — 수분 권장량이 신장 상태에 따라 다르다는 사실을 여기서 말한다. */}
      <V2BottomSheet
        surface="home_water_info"
        visible={isInfoOpen}
        onClose={() => setInfoOpen(false)}
      >
        <View style={styles.sheet}>
          <Text style={[styles.sheetTitle, { color: s.textStrong }]}>
            {t("home.recordPage.water.title")}
          </Text>
          <Text
            style={[styles.infoBody, { color: s.text }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("home.recordPage.water.info")}
          </Text>
        </View>
      </V2BottomSheet>

      {/* 담기 시트 — 직접 입력에 집중한다. 빠른 추가는 페이지에 있으므로 중복하지 않는다. */}
      <V2BottomSheet
        surface="home_water_record"
        visible={isSheetOpen}
        onClose={() => {
          setSheetOpen(false)
          setDraft("")
        }}
      >
        <View style={styles.sheet}>
          <Text style={[styles.sheetTitle, { color: s.textStrong }]}>
            {t("home.recordPage.water.add")}
          </Text>
          <View
            style={[
              styles.sheetInput,
              {
                borderBottomColor:
                  draft.length > 0 && draftAmount === null
                    ? s.danger
                    : s.border,
              },
            ]}
          >
            <V2SheetTextInput
              value={draft}
              onChangeText={(text) => {
                if (text.length > 0) markInput("keypad")
                setDraft(text.replace(/[^0-9]/gu, ""))
              }}
              accessibilityLabel={t("home.recordPage.water.amountPlaceholder")}
              placeholder={t("home.recordPage.water.amountPlaceholder")}
              placeholderTextColor={s.text}
              selectionColor={s.brand}
              keyboardType="number-pad"
              maxLength={4}
              style={[styles.sheetInputText, { color: s.textStrong }]}
            />
            <Text style={[styles.sheetUnit, { color: s.text }]}>mL</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("home.recordPage.water.clear")}
              disabled={draft.length === 0}
              accessibilityElementsHidden={draft.length === 0}
              importantForAccessibility={
                draft.length === 0 ? "no-hide-descendants" : "auto"
              }
              onPress={() => setDraft("")}
              style={[
                styles.clearTarget,
                { opacity: draft.length > 0 ? 1 : 0 },
              ]}
            >
              <View style={[styles.clear, { backgroundColor: s.surface }]}>
                <Ionicons name="close" size={14} color={s.text} />
              </View>
            </Pressable>
          </View>

          <Text
            accessible={draft.length > 0 && draftAmount === null}
            accessibilityElementsHidden={
              draft.length === 0 || draftAmount !== null
            }
            importantForAccessibility={
              draft.length > 0 && draftAmount === null
                ? "auto"
                : "no-hide-descendants"
            }
            accessibilityLiveRegion="polite"
            style={[
              styles.inputHint,
              {
                color: ink.errorText,
                opacity: draft.length > 0 && draftAmount === null ? 1 : 0,
              },
            ]}
          >
            {t("home.recordPage.water.inputRange")}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: draftAmount === null }}
            onPress={() => {
              if (draftAmount !== null) addPour(draftAmount, "keypad")
            }}
            disabled={draftAmount === null}
          >
            {({ pressed }) => (
              <View
                style={[
                  styles.sheetCta,
                  {
                    backgroundColor:
                      draftAmount === null ? s.surfaceSunken : s.brand,
                    opacity: pressed && draftAmount !== null ? 0.92 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sheetCtaLabel,
                    { color: draftAmount === null ? s.textMuted : s.onBrand },
                  ]}
                >
                  {t("home.recordPage.water.confirm")}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </V2BottomSheet>
    </>
  )
}

/** 담은 시각. 아직 서버에 없는 잔이라 기기 시계를 그대로 쓴다. */
function clockLabel(at: Date): string {
  return `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`
}

const styles = StyleSheet.create({
  cardWrap: { paddingHorizontal: PAGE_X },
  glass: { width: WATER_CARD.glassSize, height: WATER_CARD.glassSize },
  quickSection: { paddingHorizontal: PAGE_X, marginTop: S[2], gap: S[2] },
  quickHeading: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: S[2],
  },
  customButton: {
    minHeight: MIN.TOUCH,
    flexDirection: "row",
    alignItems: "center",
    gap: S[1],
  },
  guidance: {
    paddingHorizontal: PAGE_X,
    marginTop: S[2],
    marginBottom: 0,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "left",
  },
  empty: {
    paddingHorizontal: PAGE_X,
    paddingVertical: S[5],
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  listHeading: {
    paddingHorizontal: PAGE_X,
    marginTop: FORM.sectionGap,
    marginBottom: S[2],
    flexDirection: "row",
    flexWrap: "wrap",
    gap: S[2],
    alignItems: "center",
    justifyContent: "space-between",
  },
  listTitle: FORM.label,
  listTotal: { fontSize: 13, lineHeight: 20, fontVariant: ["tabular-nums"] },
  removeButton: {
    width: MIN.TOUCH,
    height: MIN.TOUCH,
    alignItems: "center",
    justifyContent: "center",
  },
  inputHint: { fontSize: 13, lineHeight: 20, marginTop: -S[3] },
  row: {
    minHeight: WATER_ROW.height,
    paddingVertical: S[2],
    gap: S[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: PAGE_X,
  },
  rowLabel: {
    flex: 1,
    fontVariant: ["tabular-nums"],
    fontSize: WATER_ROW.fontSize,
    lineHeight: 22,
    fontWeight: "700",
  },
  rowChip: {
    minWidth: WATER_ROW.chipWidth,
    minHeight: WATER_ROW.chipHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  rowChipLabel: {
    fontSize: WATER_ROW.chipFontSize,
    lineHeight: 18,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
  sheet: { paddingHorizontal: PAGE_X, gap: S[5] },
  sheetTitle: { fontSize: 20, lineHeight: 26, fontWeight: "700" },
  infoBody: { fontSize: 15, lineHeight: 22 },
  sheetUnit: { fontSize: 15, lineHeight: 20 },
  clearTarget: {
    width: MIN.TOUCH,
    height: MIN.TOUCH,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: S[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: S[3],
  },
  sheetInputText: {
    flex: 1,
    minHeight: MIN.TOUCH,
    fontSize: 17,
    fontFamily: fontFamily.semibold,
    includeFontPadding: false,
    padding: 0,
  },
  clear: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  quickRow: { flexDirection: "row", gap: WATER_QUICK.gap },
  quickCell: { flex: 1 },
  quick: {
    minHeight: WATER_QUICK.height,
    paddingHorizontal: S[2],
    paddingVertical: S[2],
    borderRadius: WATER_QUICK.radius,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  quickAmount: FORM.option,
  quickAnchor: { ...FORM.hint, textAlign: "center" },
  sheetCta: {
    minHeight: 56,
    paddingHorizontal: S[4],
    paddingVertical: S[3],
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCtaLabel: { fontSize: 17, lineHeight: 24, fontWeight: "700" },
})
