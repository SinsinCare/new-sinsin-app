import { useEffect, useRef, useState, type ReactNode } from "react"
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import type { StyleProp, TextInputProps, ViewStyle } from "react-native"
import Animated, {
  Easing,
  ReduceMotion,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { hapticSelection } from "@/src/lib/haptics"
import { useSurface } from "@/src/hooks/useSurface"
import { useTranslation } from "react-i18next"
import { MOTION, TYPE } from "@/src/theme/surface"
import {
  commitSheetNumber,
  sanitizeSheetNumberText,
  type SheetNumberSpec,
} from "../../../utils/sheetNumberInput"

const EASE = Easing.bezier(0.22, 1, 0.36, 1)
const SPRING = { ...MOTION.spring, reduceMotion: ReduceMotion.System }
const TIMING = {
  duration: MOTION.duration.fast,
  easing: EASE,
  reduceMotion: ReduceMotion.System,
}

/**
 * 기록 시트의 부품들. 구현 시트의 "12개 컴포넌트 조합으로 8종 시트" 표를 그대로 옮겼다 —
 * 수치 40~44/700 중앙 · 배지 h28 r9 · 스테퍼 h52 r14(±44) · 칩 h36 · CTA h56 r16.
 * 같은 역할에는 같은 부품만 쓴다. 화면마다 새 입력 방식을 만들지 않는다.
 */

/**
 * 값 입력 시트의 주인공. 값이 없으면 회색 플레이스홀더로 자리만 잡는다.
 *
 * `edit` 를 넘기면 **이 숫자 자체가 입력창이 된다.** 큰 숫자 밑에 입력 필드를 따로
 * 다는 대신 이렇게 한 이유: 같은 값을 두 군데 그리면 어느 쪽이 진짜인지 매 순간
 * 확인해야 하고, 스테퍼로 바꾼 값과 타이핑한 값이 어긋나 보이는 순간이 반드시 생긴다.
 * 주인공은 하나로 두고, 스테퍼는 그 하나를 미세 조정하는 도구로 남긴다.
 */
export function SheetValueDisplay({
  value,
  unit,
  caption,
  edit,
}: {
  value: string | null
  unit: string
  caption?: string
  edit?: SheetValueEdit
}) {
  const surface = useSurface()
  const filled = value !== null && value !== ""

  if (edit) {
    return (
      <SheetEditableValue
        value={value}
        unit={unit}
        caption={caption}
        edit={edit}
      />
    )
  }

  return (
    <View style={styles.displayBlock}>
      {/* 값이 없을 때는 baseline 대신 center 로 맞춘다 — 대시는 베이스라인
          한참 위에 그려져서, baseline 정렬이면 단위만 아래로 떨어져 보인다. */}
      <View
        style={[styles.displayRow, !filled && styles.displayRowPlaceholder]}
      >
        <Text
          style={[
            styles.displayValue,
            { color: filled ? surface.textStrong : surface.placeholder },
          ]}
          numberOfLines={1}
        >
          {filled ? value : "––"}
        </Text>
        <Text style={[styles.displayUnit, { color: surface.textWeak }]}>
          {unit}
        </Text>
      </View>
      {caption ? (
        <Text style={[styles.displayCaption, { color: surface.textWeak }]}>
          {caption}
        </Text>
      ) : null}
    </View>
  )
}

export interface SheetValueEdit {
  spec: SheetNumberSpec
  /**
   * 시트가 열려 있는 동안만 true.
   *
   * Tamagui Sheet 는 `unmountChildrenWhenHidden` 기본값이 false 라 **닫혀도 자식이
   * 살아 있다.** 이걸 안 넘기면 편집 중에 시트를 닫았을 때 draft 가 그대로 남아서,
   * 다음에 열면 부모가 다시 채운 값 대신 지난번에 치다 만 문자열이 보인다.
   * (시트들이 `visible` 마다 상태를 다시 채우는 것도 같은 이유다.)
   */
  active: boolean
  /**
   * 열렸는데 기록이 없으면 **바로 편집 상태로 시작**한다(키패드까지).
   * "숫자를 눌러 직접 입력" 힌트는 발견을 돕지만, 첫 기록 사용자는 애초에
   * 조정할 기준값이 없어서 타이핑이 유일한 길이다 — QA(2026-08-02)
   * "기록하기에서 숫자 키패드 안 올라옴"이 그 사용자다.
   * 판정은 호출부가 **원본 레코드**로 한다(내부 value 상태는 열림 직후
   * 아직 hydrate 전일 수 있다).
   */
  autoStartWhenEmpty?: boolean
  /** 확정된 값. 지우고 나가면 null 이 온다(0 이 아니다). */
  onCommit: (next: number | null) => void
  /** 탭 영역의 접근성 라벨. "체중 직접 입력" 처럼 무엇을 입력하는지 말한다. */
  accessibilityLabel: string
  /** 평소에 보이는 안내 한 줄("눌러서 직접 입력"). */
  hint: string
}

/**
 * 탭하면 편집으로 바뀌는 큰 숫자.
 *
 * 편집 중에는 `draft`(문자열)가 유일한 진실이다. 부모의 숫자 값을 매 글자 되돌려
 * 받으면 "72." 나 빈 문자열 같은 중간 상태가 살아남지 못한다 — 그 규칙은
 * `sheetNumberInput` 에 적어 뒀다.
 */
function SheetEditableValue({
  value,
  unit,
  caption,
  edit,
}: {
  value: string | null
  unit: string
  caption?: string
  edit: SheetValueEdit
}) {
  const { t } = useTranslation("common")
  const surface = useSurface()
  const inputRef = useRef<TextInput>(null)
  const [draft, setDraft] = useState<string | null>(null)
  const editing = draft !== null
  const filled = value !== null && value !== ""

  const commit = () => {
    if (draft === null) return
    edit.onCommit(commitSheetNumber(draft, edit.spec))
    setDraft(null)
  }

  /*
    열림/닫힘 한 곳에서 처리한다.
    - 닫히면 치다 만 문자열을 버린다(확정 안 했으니 저장도 없다).
    - 열렸는데 자동 시작 대상이면 빈 편집으로 들어가 키패드를 올린다.
      300ms 지연은 시트가 올라오는 애니메이션과 키보드가 겹치지 않게 하는
      BloodPressureSheet 의 260ms 와 같은 이유다. startedRef 는 한 번 연 동안
      한 번만 시작하게 막는다 — 없으면 blur 로 편집을 끝낼 때마다 다시 열린다.
  */
  const active = edit.active
  const autoStart = edit.autoStartWhenEmpty === true
  const startedRef = useRef(false)
  useEffect(() => {
    if (!active) {
      startedRef.current = false
      setDraft(null)
      return
    }
    if (!autoStart || startedRef.current) return
    startedRef.current = true
    setDraft("")
    const timer = setTimeout(() => inputRef.current?.focus(), 300)
    return () => clearTimeout(timer)
  }, [active, autoStart])

  return (
    <View style={styles.displayBlock}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={edit.accessibilityLabel}
        onPress={() => {
          if (editing) return
          hapticSelection()
          // 기존 값을 지우고 다시 치는 흐름이 압도적으로 흔하다. 빈 칸에서 시작하면
          // 두 번 치는 셈이 되고, 값을 남겨 두면 커서 위치를 매번 고쳐야 한다.
          // 값을 넣되 전체 선택해 두면 이어 치기도 지우기도 한 번에 된다.
          setDraft(filled ? (value as string) : "")
          requestAnimationFrame(() => inputRef.current?.focus())
        }}
        hitSlop={8}
      >
        <View
          style={[styles.displayRow, !filled && styles.displayRowPlaceholder]}
        >
          {editing ? (
            <TextInput
              ref={inputRef}
              value={draft}
              onChangeText={(text) =>
                setDraft(sanitizeSheetNumberText(text, edit.spec))
              }
              onBlur={commit}
              onSubmitEditing={commit}
              selectTextOnFocus
              keyboardType={
                edit.spec.decimals > 0 ? "decimal-pad" : "number-pad"
              }
              placeholder="0"
              placeholderTextColor={surface.placeholder}
              selectionColor={surface.brand}
              style={[styles.displayValue, { color: surface.textStrong }]}
            />
          ) : (
            <Text
              style={[
                styles.displayValue,
                { color: filled ? surface.textStrong : surface.placeholder },
              ]}
              numberOfLines={1}
            >
              {filled ? value : "––"}
            </Text>
          )}
          <Text style={[styles.displayUnit, { color: surface.textWeak }]}>
            {unit}
          </Text>
        </View>
        {/* 편집 가능하다는 사실을 말해 주는 유일한 단서. 숫자만 크게 그려 두면
            누를 수 있다는 걸 아무도 모른다 — 그게 지금 들어온 요청의 원인이다. */}
        <View
          style={[
            styles.editUnderline,
            {
              backgroundColor: editing ? surface.brand : surface.surfacePressed,
            },
          ]}
        />
      </Pressable>

      {caption ? (
        <Text style={[styles.displayCaption, { color: surface.textWeak }]}>
          {caption}
        </Text>
      ) : null}
      {/*
        평소엔 힌트, 치는 동안엔 완료 — **같은 자리**라 줄이 늘거나 줄지 않는다.

        전역 키보드 툴바가 있는데도 여기에 하나 더 두는 이유: 툴바는 화면 바닥에
        붙고, 시트가 열려 있으면 그 위를 시트·포털이 덮을 여지가 남는다(실제로 그래서
        1.1.24 에서 안 보였다). 이 버튼은 **큰 숫자 바로 아래**, 즉 키패드가 절대
        닿지 않는 위쪽에 있어서 무엇에도 가려지지 않는다. 눌러 blur 시키면
        `onBlur` 가 그대로 commit 을 태우므로 값도 함께 확정된다.
      */}
      {editing ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => inputRef.current?.blur()}
          hitSlop={10}
          style={({ pressed }) => [
            styles.editDone,
            {
              backgroundColor: surface.surface,
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <Text style={[styles.editDoneLabel, { color: surface.textStrong }]}>
            {t("action.done")}
          </Text>
        </Pressable>
      ) : (
        <Text style={[styles.editHint, { color: surface.textMuted }]}>
          {edit.hint}
        </Text>
      )}
    </View>
  )
}

export type JudgmentTone = "normal" | "caution" | "danger"

/**
 * 판정 배지 h28 r9. 정상·주의는 틴트 면, 위험만 채운다 —
 * 색만으로 말하지 않도록 라벨을 항상 함께 쓴다(WCAG 1.4.1).
 */
export function SheetJudgmentBadge({
  label,
  tone,
}: {
  label: string
  tone: JudgmentTone
}) {
  const surface = useSurface()
  const palette =
    tone === "danger"
      ? { bg: surface.danger, fg: "#FFFFFF" }
      : tone === "caution"
        ? { bg: "rgba(232,150,42,0.16)", fg: "#B26A12" }
        : { bg: surface.surface, fg: surface.text }

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeLabel, { color: palette.fg }]}>{label}</Text>
    </View>
  )
}

/**
 * 목표 구간 바 — 시트 목업 그대로. 트랙은 회색, 위험 구간만 레드 면,
 * 현재 값은 마커 하나. 목표는 색이 아니라 가운데 라벨이 말한다 —
 * 정상까지 색으로 칠하면 아무것도 강조되지 않는다(주의 배분).
 */
export function SheetRangeBar({
  min,
  max,
  targetMin,
  targetMax,
  value,
  dangerFrom,
}: {
  min: number
  max: number
  targetMin: number
  targetMax: number
  value: number | null
  /** 이 값부터 트랙 오른쪽 끝까지 레드 면. */
  dangerFrom?: number
}) {
  const { t } = useTranslation("common")
  const surface = useSurface()
  const span = Math.max(max - min, 1)
  const pct = (n: number): `${number}%` =>
    `${Math.min(100, Math.max(0, ((n - min) / span) * 100))}%`

  return (
    <View style={styles.rangeBlock}>
      <View style={[styles.rangeTrack, { backgroundColor: surface.surface }]}>
        {dangerFrom !== undefined ? (
          <View
            style={[
              styles.rangeDanger,
              {
                left: pct(dangerFrom),
                width:
                  `${Math.max(0, ((max - dangerFrom) / span) * 100)}%` as const,
                backgroundColor: surface.danger,
              },
            ]}
          />
        ) : null}
        {value !== null ? (
          <View
            style={[
              styles.rangeMarker,
              { left: pct(value), backgroundColor: surface.textStrong },
            ]}
          />
        ) : null}
      </View>
      <View style={styles.rangeLabels}>
        <Text style={[styles.rangeEdge, { color: surface.textMuted }]}>
          {min}
        </Text>
        <Text style={[styles.rangeEdge, { color: surface.textMuted }]}>
          {t("home.sheet.target")} {targetMin}–{targetMax}
        </Text>
        <Text style={[styles.rangeEdge, { color: surface.textMuted }]}>
          {max}
        </Text>
      </View>
    </View>
  )
}

/** 스테퍼 ±버튼. 최소 터치 44 를 지킨다. */
export function SheetStepButton({
  label,
  onPress,
  accessibilityLabel,
}: {
  label: string
  onPress: () => void
  accessibilityLabel: string
}) {
  const surface = useSurface()
  const press = useSharedValue(0)

  const style = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      press.value,
      [0, 1],
      [surface.surface, surface.surfacePressed],
    ),
    transform: [{ scale: 1 - press.value * 0.05 }],
  }))

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        hapticSelection()
        onPress()
      }}
      onPressIn={() => {
        press.value = withTiming(1, { duration: 80, easing: EASE })
      }}
      onPressOut={() => {
        press.value = withSpring(0, SPRING)
      }}
    >
      <Animated.View style={[styles.stepButton, style]}>
        <Text style={[styles.stepLabel, { color: surface.textStrong }]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  )
}

/** 스테퍼 한 줄 — 좌 −, 중앙 값, 우 +. */
export function SheetStepper({
  onDecrease,
  onIncrease,
  decreaseLabel,
  increaseLabel,
  children,
}: {
  onDecrease: () => void
  onIncrease: () => void
  decreaseLabel: string
  increaseLabel: string
  children: ReactNode
}) {
  return (
    <View style={styles.stepperRow}>
      <SheetStepButton
        label="−"
        accessibilityLabel={decreaseLabel}
        onPress={onDecrease}
      />
      <View style={styles.stepperCenter}>{children}</View>
      <SheetStepButton
        label="+"
        accessibilityLabel={increaseLabel}
        onPress={onIncrease}
      />
    </View>
  )
}

interface ChipProps {
  label: string
  /** 칩 아래 작은 실물 앵커("종이컵", "양말 자국이 남아요"). */
  anchor?: string
  selected: boolean
  onPress: () => void
  /** 회색 카드 위에 놓일 때는 흰 면으로 뜬다. */
  onCard?: boolean
  /** 복수 선택 칩은 체크로도 표시한다(색 단독 사용 금지). */
  showCheck?: boolean
  style?: StyleProp<ViewStyle>
}

/** 선택 칩 h36~. 선택은 브랜드 면으로 "채운다". */
export function SheetChip({
  label,
  anchor,
  selected,
  onPress,
  onCard = false,
  showCheck = false,
  style,
}: ChipProps) {
  const surface = useSurface()
  const selection = useSharedValue(selected ? 1 : 0)
  const press = useSharedValue(0)

  useEffect(() => {
    selection.value = withTiming(selected ? 1 : 0, TIMING)
  }, [selected, selection])

  const base = onCard ? surface.card : surface.surface
  const chipStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      selection.value,
      [0, 1],
      [base, surface.brand],
    ),
    transform: [{ scale: 1 - press.value * 0.03 }],
  }))
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      selection.value,
      [0, 1],
      [surface.text, surface.onBrand],
    ),
  }))
  const anchorStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      selection.value,
      [0, 1],
      [surface.textWeak, "rgba(255,255,255,0.86)"],
    ),
  }))

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={anchor ? `${label} ${anchor}` : label}
      onPress={() => {
        hapticSelection()
        onPress()
      }}
      onPressIn={() => {
        press.value = withTiming(1, { duration: 80, easing: EASE })
      }}
      onPressOut={() => {
        press.value = withSpring(0, SPRING)
      }}
      style={style}
    >
      <Animated.View style={[styles.chip, chipStyle]}>
        <Animated.Text style={[styles.chipLabel, labelStyle]}>
          {showCheck && selected ? "✓ " : ""}
          {label}
        </Animated.Text>
        {anchor ? (
          <Animated.Text style={[styles.chipAnchor, anchorStyle]}>
            {anchor}
          </Animated.Text>
        ) : null}
      </Animated.View>
    </Pressable>
  )
}

/** 칩 한 줄. 균등 분할이 필요하면 grow. */
export function SheetChipRow({
  children,
  grow = false,
}: {
  children: ReactNode
  grow?: boolean
}) {
  return (
    <View style={[styles.chipRow, grow && styles.chipRowGrow]}>{children}</View>
  )
}

/**
 * 선택 카드(부종 정도 등). 라벨 + 상황 서술 —
 * 추상 척도보다 "양말 자국이 남아요" 같은 서술이 응답 일관성을 높인다.
 */
export function SheetOptionCard({
  label,
  description,
  selected,
  onPress,
}: {
  label: string
  description: string
  selected: boolean
  onPress: () => void
}) {
  const surface = useSurface()
  const selection = useSharedValue(selected ? 1 : 0)
  const press = useSharedValue(0)

  useEffect(() => {
    selection.value = withTiming(selected ? 1 : 0, TIMING)
  }, [selected, selection])

  const cardStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      selection.value,
      [0, 1],
      [surface.surface, surface.brand],
    ),
    transform: [{ scale: 1 - press.value * 0.015 }],
  }))
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      selection.value,
      [0, 1],
      [surface.textStrong, surface.onBrand],
    ),
  }))
  const descStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      selection.value,
      [0, 1],
      [surface.textWeak, "rgba(255,255,255,0.86)"],
    ),
  }))

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label} ${description}`}
      onPress={() => {
        hapticSelection()
        onPress()
      }}
      onPressIn={() => {
        press.value = withTiming(1, { duration: 90, easing: EASE })
      }}
      onPressOut={() => {
        press.value = withSpring(0, SPRING)
      }}
      style={styles.optionCardWrap}
    >
      <Animated.View style={[styles.optionCard, cardStyle]}>
        <Animated.Text style={[styles.optionLabel, labelStyle]}>
          {label}
        </Animated.Text>
        <Animated.Text style={[styles.optionDesc, descStyle]} numberOfLines={2}>
          {description}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  )
}

/** 도메인 지식 한 줄(국물 반 그릇 = 100ml 같은). 회색 면 위 보조 텍스트. */
export function SheetInfoCard({ children }: { children: string }) {
  const surface = useSurface()
  return (
    <View style={[styles.infoCard, { backgroundColor: surface.surface }]}>
      <Text style={[styles.infoText, { color: surface.text }]}>{children}</Text>
    </View>
  )
}

/** 어제·차이 같은 짧은 수치 나열. */
export function SheetStatRow({
  items,
}: {
  items: { label: string; value: string }[]
}) {
  const surface = useSurface()
  return (
    <View style={styles.statRow}>
      {items.map((item) => (
        <View key={item.label} style={styles.statItem}>
          <Text style={[styles.statLabel, { color: surface.textWeak }]}>
            {item.label}
          </Text>
          <Text style={[styles.statValue, { color: surface.textStrong }]}>
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  )
}

export function SheetFieldLabel({ children }: { children: string }) {
  const surface = useSurface()
  return (
    <Text style={[styles.fieldLabel, { color: surface.textWeak }]}>
      {children}
    </Text>
  )
}

/** 시트 안의 숫자 입력(혈압 수축기/이완기). 값은 수치 스케일로 크게 잡는다. */
export function SheetNumericField({
  label,
  unit,
  value,
  onChangeText,
  placeholder,
  containerStyle,
  ...inputProps
}: {
  label: string
  unit?: string
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  containerStyle?: StyleProp<ViewStyle>
} & Omit<TextInputProps, "value" | "onChangeText" | "placeholder">) {
  const surface = useSurface()
  return (
    <View style={[styles.fieldGroup, containerStyle]}>
      <SheetFieldLabel>{label}</SheetFieldLabel>
      <View style={[styles.fieldBox, { backgroundColor: surface.surface }]}>
        <TextInput
          {...inputProps}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={surface.placeholder}
          selectionColor={surface.brand}
          keyboardType={inputProps.keyboardType ?? "number-pad"}
          style={[styles.fieldInput, { color: surface.textStrong }]}
        />
        {unit ? (
          <Text style={[styles.fieldUnit, { color: surface.textWeak }]}>
            {unit}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  // 수치 디스플레이 40~44/700 · 단위 15/500 · 중앙 정렬
  displayBlock: { alignItems: "center", gap: 6 },
  displayRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  displayRowPlaceholder: { alignItems: "center" },
  displayValue: {
    fontSize: 44,
    lineHeight: 52,
    letterSpacing: -1.1,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    // 값이 들어와도 단위가 옆으로 튀지 않게 세 자리 폭을 미리 잡는다.
    minWidth: 84,
    textAlign: "center",
  },
  displayUnit: { fontSize: 15, lineHeight: 22, fontWeight: "500" },
  displayCaption: { ...TYPE.cardSub, textAlign: "center" },

  // 편집 가능 표시. 밑줄 하나로만 말한다 — 큰 숫자 옆에 연필 아이콘을 붙이면
  // 시선이 숫자에서 아이콘으로 갈라진다.
  editUnderline: {
    height: 2,
    borderRadius: 1,
    marginTop: 4,
    alignSelf: "center",
    width: 96,
  },
  editHint: { fontSize: 11.5, lineHeight: 16, textAlign: "center" },
  // 힌트와 같은 높이(16 + 위아래 4)로 잡아 편집 진입 때 아래가 밀리지 않게 한다.
  editDone: {
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignSelf: "center",
  },
  editDoneLabel: { fontSize: 11.5, lineHeight: 16, fontWeight: "700" },

  // 판정 배지 h28 r9
  badge: {
    height: 28,
    borderRadius: 9,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  badgeLabel: { ...TYPE.caption, fontWeight: "600" },

  // 목표 구간 바
  rangeBlock: { gap: 8 },
  rangeTrack: {
    height: 6,
    borderRadius: 3,
    justifyContent: "center",
    overflow: "hidden",
  },
  rangeDanger: { position: "absolute", height: 6 },
  rangeMarker: {
    position: "absolute",
    width: 3,
    height: 14,
    borderRadius: 2,
    marginLeft: -1.5,
  },
  rangeLabels: { flexDirection: "row", justifyContent: "space-between" },
  rangeEdge: { fontSize: 11.5, lineHeight: 16 },

  // 스테퍼 h52 · ±버튼 44
  stepperRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepperCenter: { flex: 1, alignItems: "center" },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: { fontSize: 24, lineHeight: 28, fontWeight: "600" },

  // 칩 h36(앵커가 있으면 두 줄)
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  // 균등 분할 줄에서는 칩 높이를 서로 맞춘다. 라벨이 한 줄이라는 보장이 없다 —
  // 같은 화면도 영어에서는 "Before a meal" 처럼 두 줄이 되어, stretch 가 없으면
  // 그 칩만 커지고 옆 칩들은 36 에 머물러 줄이 어긋난다.
  chipRowGrow: { flexWrap: "nowrap", alignItems: "stretch" },
  chip: {
    minHeight: 36,
    flexGrow: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  chipLabel: { ...TYPE.caption, fontWeight: "600", textAlign: "center" },
  chipAnchor: { fontSize: 11, lineHeight: 15 },

  // 선택 카드(부종 정도)
  optionCardWrap: { flex: 1 },
  optionCard: {
    minHeight: 86,
    borderRadius: 14,
    padding: 14,
    justifyContent: "center",
    gap: 3,
  },
  optionLabel: { ...TYPE.cardTitle, fontWeight: "700" },
  optionDesc: { fontSize: 11.5, lineHeight: 16 },

  // 도메인 안내
  infoCard: { borderRadius: 14, padding: 14 },
  infoText: { ...TYPE.cardSub, lineHeight: 19 },

  // 짧은 수치 나열
  statRow: { flexDirection: "row", gap: 12 },
  statItem: { flex: 1, gap: 2 },
  statLabel: { fontSize: 11.5, lineHeight: 16 },
  statValue: { ...TYPE.cardTitle, fontWeight: "700" },

  fieldLabel: { ...TYPE.label, fontWeight: "500" },
  fieldGroup: { gap: 8 },
  fieldBox: {
    height: 56,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fieldInput: {
    flex: 1,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.5,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    padding: 0,
  },
  fieldUnit: { fontSize: 15, lineHeight: 22, fontWeight: "500" },
})
