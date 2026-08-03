import { useEffect, useRef, useState, type ReactNode } from "react"
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import type {
  StyleProp,
  TextInputProps,
  TextStyle,
  ViewStyle,
} from "react-native"
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
      <ValueUnitRow unit={unit} placeholder={!filled}>
        <Text
          style={[
            styles.displayValue,
            { color: filled ? surface.textStrong : surface.placeholder },
          ]}
          numberOfLines={1}
        >
          {filled ? value : "––"}
        </Text>
      </ValueUnitRow>
      {caption ? (
        <Text style={[styles.displayCaption, { color: surface.textWeak }]}>
          {caption}
        </Text>
      ) : null}
    </View>
  )
}

/**
 * 수치 한 줄 — **숫자가 화면 한가운데 오고**, 단위는 그 오른쪽에 매달린다.
 *
 * 종전에는 `[값][단위]` 를 한 줄로 묶어 가운데 정렬했다. 그러면 가운데에 오는 것은
 * 값+단위의 **합**이라, 정작 사람이 보는 숫자는 단위 폭의 절반만큼 왼쪽으로 밀린다
 * (2026-08-04 "0 이 중간에 오도록"). 단위와 같은 폭의 빈 칸을 왼쪽에 두어 좌우를
 * 대칭으로 만든다 — 폭은 단위 텍스트가 실제로 그려진 뒤 `onLayout` 으로 받는다.
 * "mg/dL"·"kg"·"mL" 처럼 단위마다, 로케일마다 폭이 달라서 상수로 박을 수 없다.
 */
function ValueUnitRow({
  unit,
  placeholder,
  children,
}: {
  unit: string
  /** 값이 없을 때(`––`). 대시는 베이스라인 위에 그려져 center 정렬이 맞다. */
  placeholder: boolean
  children: ReactNode
}) {
  const surface = useSurface()
  const [unitWidth, setUnitWidth] = useState(0)

  return (
    <View style={[styles.displayRow, placeholder && styles.displayRowCenter]}>
      <View style={{ width: unitWidth }} />
      {children}
      <Text
        style={[styles.displayUnit, { color: surface.textWeak }]}
        onLayout={(event) => {
          const next = Math.round(event.nativeEvent.layout.width)
          setUnitWidth((current) => (current === next ? current : next))
        }}
      >
        {unit}
      </Text>
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
  /**
   * 치는 도중의 값(경계로 클램프된 미리보기). 판정 배지·구간 바·CTA 라벨이
   * **키 입력마다** 응답하게 한다 — 확정(onCommit)은 여전히 blur 한 번뿐이다.
   * 미리보기와 확정을 한 콜백으로 합치면 "72." 같은 중간 상태가 확정으로 새어
   * 들어간다. 호출부는 미리보기를 별도 상태로 들고, liveValue = preview ?? value 로 읽는다.
   */
  onPreview?: (next: number | null) => void
  /** 탭 영역의 접근성 라벨. "체중 직접 입력" 처럼 무엇을 입력하는지 말한다. */
  accessibilityLabel: string
  /** 평소에 보이는 안내 한 줄("눌러서 직접 입력"). */
  hint: string
  /**
   * **바깥에서 값을 바꿨다**는 신호. 호출부가 스테퍼(±)로 값을 고칠 때마다 이 값을
   * 바꾸면, 치던 문자열을 버리고 확정된 숫자를 그린다.
   *
   * `value` 가 바뀌는 것만 봐서는 판별할 수 없다 — `onPreview` 때문에 **타이핑 중에도**
   * 매 글자 `value` 가 바뀌기 때문이다. 그걸 외부 변경으로 오인하면 한 글자마다
   * 편집이 꺼져 아예 칠 수 없게 된다. 그래서 신호를 따로 받는다.
   *
   * 없으면 종전 그대로다. 스테퍼가 없는 시트(혈당)는 넘기지 않는다.
   */
  resetKey?: number
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
  const surface = useSurface()
  const inputRef = useRef<TextInput>(null)
  const [draft, setDraft] = useState<string | null>(null)
  const editing = draft !== null
  const filled = value !== null && value !== ""

  const commit = () => {
    if (draft === null) return
    edit.onCommit(commitSheetNumber(draft, edit.spec))
    edit.onPreview?.(null)
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

  /*
    ± 를 눌렀다 → 타이핑은 끝났다. 치던 문자열을 버려야 큰 숫자가 확정값을 그린다.
    없던 시절: 기록이 없어 빈 편집으로 시작한 상태에서 + 를 누르면 화면의 큰 숫자는
    빈 draft 의 자리표시자(`0`)를, CTA 는 `62.8 kg 기록하기` 를 보여 줬다 — 같은 값을
    두 얼굴로 말하는 셈이라 어느 쪽이 저장될지 알 수 없었다(2026-08-04 보고).
  */
  const resetKey = edit.resetKey
  const seenResetRef = useRef(resetKey)
  useEffect(() => {
    if (seenResetRef.current === resetKey) return
    seenResetRef.current = resetKey
    setDraft(null)
  }, [resetKey])

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
        <ValueUnitRow unit={unit} placeholder={!filled && !editing}>
          {/* 숫자와 밑줄을 **한 칸에** 담는다. 밑줄을 줄 바깥에 두면 값+단위 전체의
              가운데에 그려져서, 숫자와 어긋난 채 폭도 제각각이었다(2026-08-04
              "혈당 숫자 입력 부분 라인 잘림"). 이제 밑줄은 숫자 칸의 폭을 그대로
              따르므로 어떤 자릿수에서도 숫자 아래에 정확히 눕는다. */}
          <View style={styles.valueSlot}>
            {editing ? (
              <TextInput
                ref={inputRef}
                value={draft}
                onChangeText={(text) => {
                  const sanitized = sanitizeSheetNumberText(text, edit.spec)
                  setDraft(sanitized)
                  edit.onPreview?.(commitSheetNumber(sanitized, edit.spec))
                }}
                onBlur={commit}
                onSubmitEditing={commit}
                selectTextOnFocus
                keyboardType={
                  edit.spec.decimals > 0 ? "decimal-pad" : "number-pad"
                }
                placeholder="0"
                placeholderTextColor={surface.placeholder}
                selectionColor={surface.brand}
                style={[
                  styles.displayValueInput,
                  { color: surface.textStrong },
                ]}
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
            {/* 편집 가능하다는 사실을 말해 주는 유일한 단서. 숫자만 크게 그려 두면
                누를 수 있다는 걸 아무도 모른다 — 그게 이 밑줄이 있는 이유다. */}
            <View
              style={[
                styles.editUnderline,
                {
                  backgroundColor: editing
                    ? surface.brand
                    : surface.surfacePressed,
                },
              ]}
            />
          </View>
        </ValueUnitRow>
      </Pressable>

      {caption ? (
        <Text style={[styles.displayCaption, { color: surface.textWeak }]}>
          {caption}
        </Text>
      ) : null}
      {/*
        발견을 돕는 한 줄. 편집 중에는 같은 높이의 빈 줄로 두어 아래 블록(배지·바)이
        밀리지 않게 한다. 완료·저장은 키보드 위 도킹 바가 맡는다(KeyboardDock 머리말) —
        예전의 인라인 "완료" 필은 도크가 생기며 물러났다. 같은 일을 하는 버튼이
        두 곳이면 어느 쪽이 저장인지부터 다시 읽어야 한다.
      */}
      <Text style={[styles.editHint, { color: surface.textMuted }]}>
        {editing ? " " : edit.hint}
      </Text>
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

export interface SheetTrendPoint {
  /** 그 날의 값. null 이면 기록 없는 날 — 낮은 스텁이 아니라 빈 표시로 그린다. */
  value: number | null
  /** 오늘 칸. 지금 고르는 값이 실시간으로 반영된다 — 브랜드 틴트 + 점선 테두리. */
  live?: boolean
}

/**
 * 7일 추세 미니 바 — 시트 시안(2026-08-03)의 체중 추세 카드.
 * 단일 값의 노이즈에 반응하지 않도록 흐름을 함께 보여준다. 기준선(점선)은
 * 최근 평균 하나뿐이고 축·눈금은 없다 — 시트 안에서 차트는 문장 하나 몫이다.
 */
export function SheetTrendBars({
  points,
  baseline,
  baselineLabel,
  startLabel,
  midLabel,
  endLabel,
}: {
  points: SheetTrendPoint[]
  baseline: number | null
  baselineLabel?: string | null
  startLabel?: string | null
  midLabel?: string | null
  endLabel?: string | null
}) {
  const surface = useSurface()
  const values = points
    .map((point) => point.value)
    .filter((value): value is number => value !== null)
  const pool = baseline !== null ? [...values, baseline] : values

  // 체중은 하루 변화가 전체 대비 1% 안팎이라, 0 부터 그리면 모든 막대가 같아 보인다.
  // 값들 주변만 확대하되 여유를 둬서 최솟값 막대도 바닥에 붙지 않게 한다.
  const rawMin = pool.length > 0 ? Math.min(...pool) : 0
  const rawMax = pool.length > 0 ? Math.max(...pool) : 1
  const pad = Math.max((rawMax - rawMin) * 0.35, 0.4)
  const lo = rawMin - pad
  const hi = rawMax + pad
  const ratio = (value: number) =>
    Math.min(1, Math.max(0, (value - lo) / (hi - lo)))

  const CHART_HEIGHT = 64
  const baselineBottom =
    baseline !== null ? ratio(baseline) * CHART_HEIGHT : null

  return (
    <View style={[trendStyles.card, { backgroundColor: surface.surface }]}>
      {baselineLabel ? (
        <Text style={[trendStyles.baselineLabel, { color: surface.textWeak }]}>
          {baselineLabel}
        </Text>
      ) : null}
      <View style={[trendStyles.chart, { height: CHART_HEIGHT }]}>
        {baselineBottom !== null ? (
          <DashedLine
            color={surface.placeholder}
            style={[trendStyles.baselineLine, { bottom: baselineBottom }]}
          />
        ) : null}
        {points.map((point, index) => (
          <View key={index} style={trendStyles.barSlot}>
            {point.value === null ? (
              <View
                style={[
                  trendStyles.barEmpty,
                  { backgroundColor: surface.surfacePressed },
                ]}
              />
            ) : (
              <View
                style={[
                  trendStyles.bar,
                  { height: Math.max(ratio(point.value) * CHART_HEIGHT, 8) },
                  point.live
                    ? {
                        backgroundColor: surface.surfaceBrand,
                        borderWidth: 1.2,
                        borderStyle: "dashed",
                        borderColor: surface.brand,
                      }
                    : { backgroundColor: surface.surfacePressed },
                ]}
              />
            )}
          </View>
        ))}
      </View>
      {startLabel || midLabel || endLabel ? (
        <View style={trendStyles.axisRow}>
          <Text style={[trendStyles.axisLabel, { color: surface.textMuted }]}>
            {startLabel ?? ""}
          </Text>
          <Text style={[trendStyles.axisLabel, { color: surface.textMuted }]}>
            {midLabel ?? ""}
          </Text>
          <Text style={[trendStyles.axisLabel, { color: surface.textMuted }]}>
            {endLabel ?? ""}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

/**
 * 점선 한 줄. RN 의 한 면짜리 dashed 보더는 iOS 에서 실선으로 그려지는 일이 있어
 * 작은 조각을 이어 붙인다 — 넘치는 조각은 overflow 로 잘린다.
 */
function DashedLine({
  color,
  style,
}: {
  color: string
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View pointerEvents="none" style={[trendStyles.dashRow, style]}>
      {Array.from({ length: 80 }).map((_, index) => (
        <View
          key={index}
          style={[trendStyles.dash, { backgroundColor: color }]}
        />
      ))}
    </View>
  )
}

const trendStyles = StyleSheet.create({
  card: { borderRadius: 14, padding: 14, gap: 8 },
  baselineLabel: { fontSize: 11.5, lineHeight: 16 },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  baselineLine: { position: "absolute", left: 0, right: 0 },
  barSlot: { flex: 1, justifyContent: "flex-end" },
  bar: { borderRadius: 5, width: "100%" },
  barEmpty: { height: 4, borderRadius: 2, opacity: 0.7 },
  axisRow: { flexDirection: "row", justifyContent: "space-between" },
  axisLabel: { fontSize: 11, lineHeight: 15 },
  dashRow: {
    flexDirection: "row",
    gap: 3,
    overflow: "hidden",
    height: 1.2,
  },
  dash: { width: 3, height: 1.2, borderRadius: 1 },
})

/**
 * 큰 수치의 글자 모양. Text(보기)와 TextInput(편집)이 **같은 자리에서 서로를 대체**하므로
 * 줄높이를 뺀 나머지는 반드시 한 곳에서 나와야 한다 — 두 벌로 두면 편집을 켤 때 숫자가 튄다.
 */
const DISPLAY_VALUE = {
  fontSize: 44,
  letterSpacing: -1.1,
  fontWeight: "700",
  fontVariant: ["tabular-nums"],
  // 값이 들어와도 단위가 옆으로 튀지 않게 세 자리 폭을 미리 잡는다.
  minWidth: 84,
  textAlign: "center",
} satisfies TextStyle

const styles = StyleSheet.create({
  // 수치 디스플레이 40~44/700 · 단위 15/500 · 중앙 정렬
  displayBlock: { alignItems: "center", gap: 6 },
  displayRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  displayRowCenter: { alignItems: "center" },
  /** 숫자 + 밑줄 한 칸. 폭은 숫자가 정한다(minWidth 84, 자릿수가 늘면 함께 는다). */
  valueSlot: { alignItems: "center" },
  // Text 로 보여줄 때. 편집으로 바뀌면 아래 displayValueInput 이 같은 자리에 선다.
  displayValue: { ...DISPLAY_VALUE, lineHeight: 52 },
  /**
   * 같은 수치를 **입력으로** 그릴 때. `lineHeight` 만 빠진다 —
   * 단일행 TextInput 에 lineHeight 가 있으면 iOS 가 글자를 세로 가운데가 아니라 문단
   * 기준으로 앉혀서, 편집을 켜는 순간 숫자가 아래로 내려앉는다(`singleLineInputText` 머리말).
   * 44pt 폰트의 자연 줄높이가 52 와 거의 같아 두 상태의 높이는 그대로 맞는다.
   */
  displayValueInput: { ...DISPLAY_VALUE, includeFontPadding: false },
  displayUnit: { fontSize: 15, lineHeight: 22, fontWeight: "500" },
  displayCaption: { ...TYPE.cardSub, textAlign: "center" },

  // 편집 가능 표시. 밑줄 하나로만 말한다 — 큰 숫자 옆에 연필 아이콘을 붙이면
  // 시선이 숫자에서 아이콘으로 갈라진다.
  editUnderline: {
    height: 2,
    borderRadius: 1,
    marginTop: 4,
    // 숫자 칸(`valueSlot`)의 폭을 그대로 받는다 — 고정 96 이던 시절에는 세 자리
    // 숫자가 밑줄 밖으로 삐져나왔다.
    alignSelf: "stretch",
  },
  editHint: { fontSize: 11.5, lineHeight: 16, textAlign: "center" },

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
    letterSpacing: -0.5,
    // 단일행 입력엔 lineHeight 를 주지 않는다 — iOS 가 글자를 문단 기준으로 앉혀
    // 상하 여백이 어긋난다(surface.ts `singleLineInputText` 머리말).
    includeFontPadding: false,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    padding: 0,
  },
  fieldUnit: { fontSize: 15, lineHeight: 22, fontWeight: "500" },
})
