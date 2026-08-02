import { useEffect, useRef, useState } from "react"
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native"
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
import { AppBottomSheet } from "@/src/shared/components/AppBottomSheet"
import { hapticSelection, hapticStepAdvance } from "@/src/lib/haptics"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, MOTION, TYPE } from "@/src/theme/surface"
import { getHydrationGuidance } from "../../../utils/hydrationGuidance"
import { SheetInfoCard } from "./recordSheetControls"
import { V2DotLoader } from "@/src/design-system-v2"
import { useTranslation } from "react-i18next"

const EASE = Easing.bezier(0.22, 1, 0.36, 1)
const SPRING = { ...MOTION.spring, reduceMotion: ReduceMotion.System }

/** 실물 앵커. ml 은 감이 안 오지만 종이컵은 온다. */
const PRESETS = [
  { amount: 50, anchorKey: "shot" },
  { amount: 100, anchorKey: "halfCup" },
  { amount: 200, anchorKey: "cup" },
  { amount: 500, anchorKey: "bottle" },
] as const

interface WaterSheetProps {
  visible: boolean
  onClose: () => void
  /** 시트가 열리던 시점의 오늘 총량. 열려 있는 동안은 시트가 로그를 직접 더한다. */
  consumed: number
  /** 서버가 등록한 신장 건강 정보로 계산한 하루 참고 기준. */
  limit: number | null
  /** 프로필을 못 받아 일반 참고값을 쓰는 중인지 여부. */
  isReferenceLimit: boolean
  /** 한 잔을 서버에 기록한다. 성공 여부를 돌려준다. */
  onLog: (delta: number) => Promise<boolean>
}

/**
 * 물 기록 시트 — 잔은 **담기고**, 저장은 CTA 한 번이다.
 *
 * 처음에는 "물 한 잔은 검토가 필요한 거래가 아니다"라며 잔을 누르는 순간 서버에
 * 기록했다. 그런데 이 시트만 그랬다 — 체중·혈당·혈압·부종은 전부 값을 고르고
 * CTA 로 확정한다. 같은 홈의 시트인데 물만 규칙이 달라서, 사용자는 눌렀을 때
 * 이미 저장된 줄 모르고 저장 버튼을 찾았다(2026-08-02 피드백: "저장 누르면
 * 저장되어야 하는 것 아님?"). 빠른 손맛보다 **일관된 계약**이 먼저다.
 *
 * 그래서 탭은 로컬 스택에 담기만 하고(햅틱 + 숫자는 여전히 즉시 자란다),
 * 서버 기록은 아래 CTA("+600mL 기록하기")가 합계로 **한 번** 보낸다.
 * 되돌리기는 담긴 잔을 물리는 로컬 조작이 됐다 — 네트워크가 끼지 않으니
 * 실수 복구가 오히려 빨라졌다. 저장 없이 닫으면 담긴 잔은 버려진다
 * (다른 시트들이 입력값을 버리는 것과 같은 규칙).
 *
 * 상한은 가까워졌을 때만 말한다(hydrationGuidance) — 제한을 계속 들이대면
 * 필요한 만큼도 안 마신다는 신장내과 피드백.
 */
export function WaterSheet({
  visible,
  onClose,
  consumed,
  limit,
  isReferenceLimit,
  onLog,
}: WaterSheetProps) {
  const { t, i18n } = useTranslation("common")
  const language = (i18n.resolvedLanguage ?? i18n.language).startsWith("en")
    ? "en"
    : "ko"
  const numberLocale = language === "en" ? "en-US" : "ko-KR"
  const formatAmount = (value: number) => value.toLocaleString(numberLocale)
  const surface = useSurface()
  /** 이 시트에서 성공적으로 기록한 잔들. 되돌리기용 스택. */
  const [session, setSession] = useState<number[]>([])
  const [isBusy, setIsBusy] = useState(false)
  const [isCustomOpen, setIsCustomOpen] = useState(false)
  const [customText, setCustomText] = useState("")
  /** 시트를 연 시점의 총량. 열려 있는 동안 서버 refetch 로 흔들리지 않게 고정. */
  const baseRef = useRef(consumed)

  const pop = useSharedValue(1)

  useEffect(() => {
    if (!visible) return
    baseRef.current = consumed
    setSession([])
    setIsCustomOpen(false)
    setCustomText("")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const sessionTotal = session.reduce((sum, amount) => sum + amount, 0)
  const total = baseRef.current + sessionTotal
  const guidance = getHydrationGuidance({
    consumed: total,
    limit,
    isReferenceLimit,
    language,
  })
  const filledRatio =
    limit != null && limit > 0 ? Math.min(1, total / limit) : 0

  const bumpNumber = () => {
    pop.value = withSequence(
      withTiming(1.06, { duration: 110, easing: EASE }),
      withSpring(1, SPRING),
    )
  }

  /** 로컬에 담기만 한다. 서버는 CTA 의 commit 이 합계로 한 번 부른다. */
  const addPending = (amount: number) => {
    if (isBusy) return
    hapticSelection()
    setSession((prev) => [...prev, amount])
    bumpNumber()
  }

  const undoLast = () => {
    if (session.length === 0 || isBusy) return
    hapticSelection()
    setSession((prev) => prev.slice(0, -1))
    bumpNumber()
  }

  const commit = async () => {
    if (sessionTotal <= 0 || isBusy) return
    setIsBusy(true)
    hapticStepAdvance()
    const ok = await onLog(sessionTotal)
    setIsBusy(false)
    // 실패면 담긴 잔을 그대로 두고 시트도 열어 둔다 — 다시 누르면 재시도다.
    if (ok) onClose()
  }

  const customAmount = (() => {
    const parsed = parseInt(customText, 10)
    return isNaN(parsed) || parsed <= 0 ? 0 : Math.min(parsed, 3000)
  })()

  const submitCustom = () => {
    if (customAmount <= 0) return
    addPending(customAmount)
    setCustomText("")
    setIsCustomOpen(false)
  }

  const canUndo = session.length > 0 && !isBusy
  const lastAmount = session[session.length - 1]

  const numberStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }))

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      /* 직접 입력이 열려도 시트를 키우거나 밀어 올리지 않는다 — 밀어 올리면 상단이
         시계·배터리를 덮는다(QA 2026-08-02). 입력 줄·담기는 상단쪽이라 키보드 위에 보인다. */
      snapPoints={[82]}
    >
      <View style={styles.body}>
        <View style={styles.head}>
          <View style={styles.headText}>
            <Text style={[styles.title, { color: surface.textStrong }]}>
              {t("home.sheet.water.title")}
            </Text>
            <Text style={[styles.subtitle, { color: surface.textMuted }]}>
              {t("home.sheet.water.subtitle")}
              {limit != null && limit > 0
                ? isReferenceLimit
                  ? ` · ${t("home.sheet.water.referenceLimit", {
                      limit: formatAmount(limit),
                    })}`
                  : ` · ${t("home.sheet.water.personalLimit", {
                      limit: formatAmount(limit),
                    })}`
                : ""}
            </Text>
            {/*
              기준을 넘겼을 때의 의료진 안내. 홈 타일 캡션은 한 줄이라 이 문장이
              들어가지 않는데, 수분 제한 환자에게는 "얼마나 넘었나"보다 "그래서
              어떻게 하나"가 더 중요하다. 줄 수에 여유가 있는 이 시트에서 말한다.
            */}
            {limit != null &&
            limit > 0 &&
            !isReferenceLimit &&
            consumed >= limit ? (
              <Text style={[styles.subtitle, { color: surface.danger }]}>
                {t("home.sheet.water.overLimitGuidance")}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("action.close")}
            onPress={onClose}
            hitSlop={10}
          >
            {({ pressed }) => (
              <View
                style={[
                  styles.closeButton,
                  {
                    backgroundColor: pressed
                      ? surface.surfacePressed
                      : surface.surface,
                  },
                ]}
              >
                <Ionicons name="close" size={18} color={surface.textWeak} />
              </View>
            )}
          </Pressable>
        </View>

        {/* 오늘 총량 — 기록마다 살짝 튀며 자란다. 이 숫자가 곧 보상이다. */}
        <View style={styles.displayBlock}>
          <Animated.View style={[styles.displayRow, numberStyle]}>
            <Text style={[styles.displayValue, { color: surface.textStrong }]}>
              {formatAmount(total)}
            </Text>
            <Text style={[styles.displayUnit, { color: surface.textMuted }]}>
              mL
            </Text>
          </Animated.View>
          <Text
            style={[
              styles.displayCaption,
              {
                color:
                  guidance.tone === "relaxed"
                    ? surface.placeholder
                    : surface.brand,
              },
            ]}
          >
            {guidance.message}
          </Text>
        </View>

        <View style={[styles.track, { backgroundColor: surface.surface }]}>
          <View
            style={[
              styles.trackFill,
              { flex: filledRatio, backgroundColor: surface.brand },
            ]}
          />
          <View style={{ flex: Math.max(0, 1 - filledRatio) }} />
        </View>

        {/* 잔 버튼 — 누르면 담긴다(저장은 아래 CTA). 이 시트의 주인공이라 카드 크기다. */}
        <View style={styles.cupRow}>
          {PRESETS.map((preset) => {
            const anchor = t(`home.sheet.water.preset.${preset.anchorKey}`)
            const amount = formatAmount(preset.amount)
            return (
              <CupButton
                key={preset.amount}
                amount={amount}
                anchor={anchor}
                accessibilityLabel={t("home.sheet.water.presetAccessibility", {
                  anchor,
                  amount,
                })}
                disabled={isBusy}
                onPress={() => addPending(preset.amount)}
              />
            )
          })}
        </View>

        {/* 되돌리기 — 담긴 잔을 물리는 로컬 조작. 자리를 상시 확보한다(시프트 금지). */}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canUndo }}
          accessibilityLabel={t("home.sheet.water.undoLast")}
          onPress={undoLast}
          disabled={!canUndo}
        >
          {({ pressed }) => (
            <View
              style={[
                styles.undoButton,
                {
                  backgroundColor: canUndo
                    ? pressed
                      ? surface.surfacePressed
                      : surface.surface
                    : surface.ctaOffBg,
                },
              ]}
            >
              <Ionicons
                name="arrow-undo-outline"
                size={16}
                color={canUndo ? surface.textStrong : surface.ctaOffText}
              />
              <Text
                style={[
                  styles.undoLabel,
                  {
                    color: canUndo ? surface.textStrong : surface.ctaOffText,
                  },
                ]}
              >
                {canUndo
                  ? t("home.sheet.water.undoAmount", {
                      amount: formatAmount(lastAmount),
                    })
                  : t("home.sheet.water.undoLast")}
              </Text>
            </View>
          )}
        </Pressable>

        {isCustomOpen ? (
          <View style={styles.customRow}>
            <View
              style={[styles.customField, { backgroundColor: surface.surface }]}
            >
              <TextInput
                autoFocus
                value={customText}
                onChangeText={setCustomText}
                placeholder="0"
                placeholderTextColor={surface.placeholder}
                selectionColor={surface.brand}
                keyboardType="number-pad"
                maxLength={4}
                style={[styles.customInput, { color: surface.textStrong }]}
                onSubmitEditing={submitCustom}
              />
              <Text style={[styles.customUnit, { color: surface.textMuted }]}>
                mL
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("home.sheet.water.addCustom")}
              onPress={submitCustom}
              disabled={customAmount <= 0 || isBusy}
            >
              {({ pressed }) => (
                <View
                  style={[
                    styles.customSubmit,
                    {
                      backgroundColor:
                        customAmount > 0 && !isBusy
                          ? surface.brand
                          : surface.ctaOffBg,
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.customSubmitLabel,
                      {
                        color:
                          customAmount > 0 && !isBusy
                            ? surface.onBrand
                            : surface.ctaOffText,
                      },
                    ]}
                  >
                    {t("home.sheet.water.addCustom")}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("home.sheet.water.custom")}
            onPress={() => setIsCustomOpen(true)}
          >
            {({ pressed }) => (
              <View
                style={[
                  styles.customToggle,
                  {
                    backgroundColor: pressed
                      ? surface.surfacePressed
                      : surface.surface,
                  },
                ]}
              >
                <Text style={[styles.customLabel, { color: surface.text }]}>
                  {t("home.sheet.water.custom")}
                </Text>
                <Text style={[styles.customHint, { color: surface.textMuted }]}>
                  {t("home.sheet.water.customHint")}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={surface.placeholder}
                />
              </View>
            )}
          </Pressable>
        )}

        {!isCustomOpen ? (
          <SheetInfoCard>{t("home.sheet.water.info")}</SheetInfoCard>
        ) : null}

        {/* 확정 CTA — 다른 기록 시트와 같은 문법(값이 담긴 라벨, h56 r16). */}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: sessionTotal <= 0 || isBusy }}
          onPress={() => void commit()}
          disabled={sessionTotal <= 0 || isBusy}
        >
          {({ pressed }) => (
            <View
              style={[
                styles.cta,
                {
                  backgroundColor:
                    sessionTotal > 0 && !isBusy
                      ? surface.brand
                      : surface.ctaOffBg,
                  opacity: pressed && sessionTotal > 0 ? 0.92 : 1,
                },
              ]}
            >
              {isBusy ? (
                <V2DotLoader size="s" color={surface.ctaOffText} />
              ) : null}
              <Text
                style={[
                  styles.ctaLabel,
                  {
                    color:
                      sessionTotal > 0 && !isBusy
                        ? surface.onBrand
                        : surface.ctaOffText,
                  },
                ]}
              >
                {sessionTotal > 0
                  ? t("home.sheet.recordValue", {
                      value: `${formatAmount(sessionTotal)}mL`,
                    })
                  : t("home.sheet.water.chooseValue")}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </AppBottomSheet>
  )
}

/** 잔 버튼. 누르는 순간 담기라, 눌림이 확실히 보이게 카드 크기로 잡는다. */
function CupButton({
  amount,
  anchor,
  accessibilityLabel,
  disabled,
  onPress,
}: {
  amount: string
  anchor: string
  accessibilityLabel: string
  disabled: boolean
  onPress: () => void
}) {
  const surface = useSurface()
  const press = useSharedValue(0)

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.05 }],
  }))

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        press.value = withTiming(1, { duration: 80, easing: EASE })
      }}
      onPressOut={() => {
        press.value = withSpring(0, SPRING)
      }}
      style={styles.cupCell}
    >
      <Animated.View
        style={[styles.cup, { backgroundColor: surface.surface }, style]}
      >
        <Text style={[styles.cupAmount, { color: surface.textStrong }]}>
          +{amount}
        </Text>
        <Text style={[styles.cupAnchor, { color: surface.textMuted }]}>
          {anchor}
        </Text>
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  // 확정 CTA — RecordSheetShell 의 cta 와 같은 규격.
  cta: {
    height: LAYOUT.cta.height,
    borderRadius: LAYOUT.cta.radius,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaLabel: { fontSize: 17, lineHeight: 24, fontWeight: "700" },
  body: {
    paddingHorizontal: LAYOUT.screenX,
    paddingTop: 4,
    gap: 16,
  },
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headText: { flex: 1, gap: 3 },
  title: { ...TYPE.sheetTitle, fontWeight: "700" },
  subtitle: TYPE.cardSub,
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  displayBlock: { alignItems: "center", gap: 4 },
  displayRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  displayValue: {
    fontSize: 44,
    lineHeight: 52,
    letterSpacing: -1.1,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  displayUnit: { fontSize: 15, lineHeight: 22, fontWeight: "500" },
  displayCaption: { ...TYPE.cardSub, textAlign: "center" },
  track: {
    height: 8,
    borderRadius: 4,
    flexDirection: "row",
    overflow: "hidden",
  },
  trackFill: { height: 8 },
  cupRow: { flexDirection: "row", gap: 8 },
  cupCell: { flex: 1 },
  cup: {
    height: 72,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  cupAmount: { fontSize: 17, lineHeight: 23, fontWeight: "700" },
  cupAnchor: { fontSize: 12, lineHeight: 16 },
  undoButton: {
    height: 44,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  undoLabel: { ...TYPE.caption, fontWeight: "600" },
  customToggle: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  customLabel: { ...TYPE.cardTitle, fontWeight: "600", flex: 1 },
  customHint: TYPE.cardSub,
  customRow: { flexDirection: "row", gap: 8 },
  customField: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  customInput: {
    flex: 1,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    padding: 0,
  },
  customUnit: { fontSize: 15, lineHeight: 22, fontWeight: "500" },
  customSubmit: {
    height: 56,
    borderRadius: 14,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  customSubmitLabel: { fontSize: 16, lineHeight: 22, fontWeight: "700" },
})
