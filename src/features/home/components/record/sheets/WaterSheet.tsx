import { useEffect, useRef, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { KeyboardController } from "react-native-keyboard-controller"
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
import type { SheetNumberSpec } from "../../../utils/sheetNumberInput"
import { SheetInfoCard, SheetValueDisplay } from "./recordSheetControls"
import { useSheetKeyboardLift } from "./useSheetKeyboardLift"
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

/** 총량 직접 입력 경계. 4자리(9,999mL)면 어떤 하루도 담고, 입력 폭도 안 넘친다. */
const WATER_TOTAL_INPUT: SheetNumberSpec = { min: 0, max: 9999, decimals: 0 }

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
 * 직접 입력도 같은 이유로 다른 시트의 문법을 따른다 — **큰 숫자(오늘 총량)를
 * 누르면 그 자리가 입력창이 된다**(SheetValueEdit). 예전에는 "직접 입력" 행이
 * 따로 접혀 있었는데, 같은 앱에서 체중·혈당은 숫자를 누르고 물만 다른 길을
 * 요구하니 여기서만 길을 다시 배워야 했다(2026-08-03 피드백 "눌러서 수정
 * 부분이 다른 데랑 UX가 다르잖아"). 총량을 고치면 이미 저장된 양(시트를 연
 * 시점의 base) 아래로는 못 내린다 — 서버 기록은 이 시트에서 지울 수 없고,
 * 담긴 잔(세션)만 새 총량에 맞춰 갈아끼운다.
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
  /* 직접 입력의 키패드가 CTA 를 덮지 않게 — 다른 기록 시트와 같은 규칙을 쓴다. */
  const { bodyStyle, snapPoints, keyboardShown } = useSheetKeyboardLift(82)
  /** 이 시트에서 성공적으로 기록한 잔들. 되돌리기용 스택. */
  const [session, setSession] = useState<number[]>([])
  const [isBusy, setIsBusy] = useState(false)
  /** 총량을 치는 도중의 값 — 안내문·게이지·CTA 가 키 입력마다 응답한다(다른 시트와 같은 규칙). */
  const [preview, setPreview] = useState<number | null>(null)
  /** 시트를 연 시점의 총량. 열려 있는 동안 서버 refetch 로 흔들리지 않게 고정. */
  const baseRef = useRef(consumed)

  const pop = useSharedValue(1)

  useEffect(() => {
    if (!visible) return
    baseRef.current = consumed
    setSession([])
    setPreview(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const sessionTotal = session.reduce((sum, amount) => sum + amount, 0)
  const total = baseRef.current + sessionTotal
  const liveTotal = preview ?? total
  /**
   * CTA 가 보낼 증감. **음수도 보낸다** — 총량을 낮추면 그만큼 덜어낸다.
   *
   * 종전에는 `max(0, …)` 로 잘라서 이미 저장된 양은 앱에서 되돌릴 길이 아예 없었다.
   * "마지막 잔 되돌리기" 는 이 시트에서 방금 담은 것만 무르는 로컬 조작이라,
   * 어제·아까 잘못 기록한 물은 지울 수 없었다(2026-08-04 QA 정설아).
   * 서버는 처음부터 뺄 수 있었다 — `PATCH …/extra-water` 의 `deltaWater` 는
   * `[-10,000, +10,000]` 이고 결과를 0 에서 접는다(clinicalBounds·applyExtraWaterDelta).
   * 즉 막고 있던 것은 화면뿐이었다.
   */
  const pendingDelta = liveTotal - baseRef.current
  const guidance = getHydrationGuidance({
    consumed: liveTotal,
    limit,
    isReferenceLimit,
    language,
  })
  const filledRatio =
    limit != null && limit > 0 ? Math.min(1, liveTotal / limit) : 0

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
    // 치는 도중 바로 CTA 를 눌러도 마지막 키 입력까지 반영되게 preview 기준으로
    // 보낸다 — 체중 시트가 liveWeight 를 그대로 제출하는 것과 같은 규칙.
    if (pendingDelta === 0 || isBusy) return
    setIsBusy(true)
    hapticStepAdvance()
    const ok = await onLog(pendingDelta)
    setIsBusy(false)
    // 실패면 담긴 잔을 그대로 두고 시트도 열어 둔다 — 다시 누르면 재시도다.
    if (ok) onClose()
  }

  /**
   * 총량 확정(blur 한 번). 담긴 잔 스택을 "새 총량 − base" 한 덩어리로 갈아끼운다.
   * 낮춰 적으면 그 덩어리가 음수이고, 그대로 CTA 의 증감이 된다(0 으로 적으면 그날 물이 비워진다).
   */
  const commitTotal = (next: number | null) => {
    // 지우고 나가면 null — 값 변경이 아니라 취소다(0 입력과 다르다).
    if (next === null) return
    const delta = next - baseRef.current
    setSession(delta === 0 ? [] : [delta])
    bumpNumber()
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
      /*
        시트를 밀어 올리지는 않는다 — 밀어 올리면 상단이 시계·배터리를 덮는다
        (QA 2026-08-02). 대신 직접 입력의 키패드가 뜨면 시트가 커지고 CTA 가
        키패드 위로 떠오른다(useSheetKeyboardLift 머리말).

        예전 주석은 "입력 줄·담기는 상단쪽이라 키보드 위에 보인다"고 적어 두었는데
        **CTA 는 아래에 있어서 그대로 덮였다** — 값을 치고도 담을 수가 없었다.
      */
      snapPoints={snapPoints}
      contentBottomPadding={false}
    >
      <Animated.View style={[styles.body, bodyStyle]}>
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

        {/* 키보드가 눌러 온 만큼 본문이 좁아진다 — 그 몫을 스크롤이 흡수한다. */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* 오늘 총량 — 기록마다 살짝 튀며 자란다. 이 숫자가 곧 보상이고,
              누르면 그 자리가 입력창이 된다(다른 기록 시트와 같은 문법). */}
          <View style={styles.displayBlock}>
            <Animated.View style={numberStyle}>
              <SheetValueDisplay
                value={formatAmount(liveTotal)}
                unit="mL"
                edit={{
                  spec: WATER_TOTAL_INPUT,
                  active: visible,
                  onCommit: commitTotal,
                  onPreview: setPreview,
                  accessibilityLabel: t("home.sheet.water.typeValue"),
                  hint: t("home.sheet.water.typeHint"),
                }}
              />
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
                  accessibilityLabel={t(
                    "home.sheet.water.presetAccessibility",
                    {
                      anchor,
                      amount,
                    },
                  )}
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
                  {/* 총량을 낮춰 적으면 스택의 한 칸이 음수다. 라벨은 크기만 말한다 —
                      "−400mL 되돌리기" 는 부호가 두 번 겹쳐 방향이 헷갈린다. */}
                  {canUndo
                    ? t("home.sheet.water.undoAmount", {
                        amount: formatAmount(Math.abs(lastAmount)),
                      })
                    : t("home.sheet.water.undoLast")}
                </Text>
              </View>
            )}
          </Pressable>

          <SheetInfoCard>{t("home.sheet.water.info")}</SheetInfoCard>
        </ScrollView>

        {/* 확정 CTA — 다른 기록 시트와 같은 문법(값이 담긴 라벨, h56 r16). */}
        <View style={styles.ctaRow}>
          {/* 숫자 키패드에는 완료 키가 없다. 키보드가 떠 있을 때만 서는 탈출구. */}
          {keyboardShown ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("keyboard.dismiss")}
              onPress={() => KeyboardController.dismiss()}
              hitSlop={6}
            >
              {({ pressed }) => (
                <View
                  style={[
                    styles.dismiss,
                    {
                      backgroundColor: pressed
                        ? surface.surfacePressed
                        : surface.surface,
                    },
                  ]}
                >
                  <Ionicons
                    name="chevron-down"
                    size={22}
                    color={surface.textStrong}
                  />
                </View>
              )}
            </Pressable>
          ) : null}
          <Pressable
            style={styles.ctaWrap}
            accessibilityRole="button"
            accessibilityState={{ disabled: pendingDelta === 0 || isBusy }}
            onPress={() => void commit()}
            disabled={pendingDelta === 0 || isBusy}
          >
            {({ pressed }) => {
              const active = pendingDelta !== 0 && !isBusy
              return (
                <View
                  style={[
                    styles.cta,
                    {
                      backgroundColor: active
                        ? surface.brand
                        : surface.ctaOffBg,
                      opacity: pressed && active ? 0.92 : 1,
                    },
                  ]}
                >
                  {isBusy ? (
                    <V2DotLoader size="s" color={surface.ctaOffText} />
                  ) : null}
                  <Text
                    style={[
                      styles.ctaLabel,
                      { color: active ? surface.onBrand : surface.ctaOffText },
                    ]}
                  >
                    {/* 방향을 라벨이 말한다. 덜어내는 것을 "기록하기" 라고 부르면
                        누르기 전에 무슨 일이 일어날지 알 수 없다. */}
                    {pendingDelta > 0
                      ? t("home.sheet.recordValue", {
                          value: `${formatAmount(pendingDelta)}mL`,
                        })
                      : pendingDelta < 0
                        ? t("home.sheet.water.removeValue", {
                            value: `${formatAmount(-pendingDelta)}mL`,
                          })
                        : t("home.sheet.water.chooseValue")}
                  </Text>
                </View>
              )
            }}
          </Pressable>
        </View>
      </Animated.View>
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
    // 프레임 높이를 채워야 머리·본문·CTA 세로 열이 성립한다(스크롤이 여기서 갈린다).
    flex: 1,
    paddingHorizontal: LAYOUT.screenX,
    paddingTop: 4,
    gap: 16,
  },
  scroll: { flexGrow: 1, flexShrink: 1 },
  scrollContent: { gap: 16, paddingBottom: 2 },
  ctaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ctaWrap: { flex: 1 },
  dismiss: {
    width: LAYOUT.cta.height,
    height: LAYOUT.cta.height,
    borderRadius: LAYOUT.cta.radius,
    alignItems: "center",
    justifyContent: "center",
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
  // 수치 타이포는 SheetValueDisplay 가 그린다(다른 시트와 같은 부품·같은 규격).
  displayBlock: { alignItems: "center", gap: 4 },
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
})
