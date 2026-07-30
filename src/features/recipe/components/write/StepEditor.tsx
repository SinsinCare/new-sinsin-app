/**
 * 조리 순서 — **폼 안에 인라인**이고 드래그로 순서를 바꾼다.
 *
 * ## 왜 바텀시트를 없앴는가
 * 시안(`Home_Recipes_writing-6/10/13`)은 조리순서를 바텀시트로 띄운다. 시트를 닫으면
 * 폼에는 "조리 순서를 입력해주세요" 플레이스홀더만 남아서(`writing-16`) 자기가 몇
 * 단계를 적었는지, 무슨 내용이었는지 확인할 방법이 없다. 등록 버튼을 누르기 전에
 * 무엇이 올라갈지 볼 수 없는 화면이다. 시트를 없애고 폼에 그대로 둔다.
 *
 * 드래그 재정렬은 시안의 좋은 부분이라 유지한다 — 조리 순서는 쓰다 보면 순서가 바뀐다.
 *
 * ## 드래그 구현
 * 잡은 행만 UI 스레드(reanimated)로 손가락을 따라가고, 나머지 행은 **목표 자리가
 * 바뀔 때만** 다시 그려서 비켜난다. 매 프레임 전체를 다시 그리지 않는다.
 * 자리 판정(`resolveDropIndex`)은 행 높이가 줄마다 다르므로 측정값을 누적해서 한다.
 * 판정 함수는 `writeFormState.ts` 의 순수 함수라 테스트가 붙어 있다.
 */

import { useCallback, useMemo, useRef, useState } from "react"
import { StyleSheet, Text, TextInput, View, Pressable } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated"

import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE } from "@/src/theme/surface"
import { RECIPE_WRITE_LIMITS } from "@/src/features/recipe/types/recipeWrite"
import { resolveDropIndex, type StepRow } from "./writeFormState"

/** 행 사이 간격. 비워진 자리의 크기 = 행 높이 + 이 값이다. */
const ROW_GAP = 10

export interface StepEditorCopy {
  placeholder: (index: number) => string
  add: string
  removeLabel: (index: number) => string
  limitReached: string
  dragHint: string
  dragHandleLabel: (index: number) => string
  moveUp: string
  moveDown: string
}

interface StepEditorProps {
  rows: StepRow[]
  onChangeRow: (id: string, text: string) => void
  onRemoveRow: (id: string) => void
  onAddRow: () => void
  onReorder: (from: number, to: number) => void
  /** 드래그 중에는 스크롤을 멈춘다 — 안 그러면 목록과 화면이 같이 움직여 자리를 못 맞춘다. */
  onDragActiveChange: (active: boolean) => void
  copy: StepEditorCopy
}

export function StepEditor({
  rows,
  onChangeRow,
  onRemoveRow,
  onAddRow,
  onReorder,
  onDragActiveChange,
  copy,
}: StepEditorProps) {
  const s = useSurface()
  const atLimit = rows.length >= RECIPE_WRITE_LIMITS.stepMax

  const drag = useSharedValue(0)
  const heights = useRef<number[]>([])
  const [fromIndex, setFromIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const fromRef = useRef<number | null>(null)
  const dropRef = useRef<number | null>(null)

  const measure = useCallback((index: number, height: number) => {
    heights.current[index] = height + ROW_GAP
  }, [])

  const beginDrag = useCallback(
    (index: number) => {
      fromRef.current = index
      dropRef.current = index
      setFromIndex(index)
      setDropIndex(index)
      onDragActiveChange(true)
    },
    [onDragActiveChange],
  )

  const updateDrag = useCallback(
    (translateY: number) => {
      const from = fromRef.current
      if (from === null) return
      // 줄을 지워도 측정값 배열은 그대로 남는다. 지금 있는 줄까지만 본다 —
      // 안 자르면 목록 끝을 지나 없는 자리로 끌 수 있다.
      const next = resolveDropIndex(
        heights.current.slice(0, rows.length),
        from,
        translateY,
      )
      if (next === dropRef.current) return
      dropRef.current = next
      setDropIndex(next)
    },
    [rows.length],
  )

  const finishDrag = useCallback(() => {
    const from = fromRef.current
    const to = dropRef.current
    fromRef.current = null
    dropRef.current = null
    setFromIndex(null)
    setDropIndex(null)
    onDragActiveChange(false)
    if (from !== null && to !== null && from !== to) onReorder(from, to)
  }, [onDragActiveChange, onReorder])

  useAnimatedReaction(
    () => drag.value,
    (current) => {
      runOnJS(updateDrag)(current)
    },
    [updateDrag],
  )

  const draggedHeight =
    fromIndex === null ? 0 : (heights.current[fromIndex] ?? 0)

  return (
    <View style={styles.wrap}>
      <Text style={[styles.hint, { color: s.textMuted }]}>{copy.dragHint}</Text>
      {rows.map((row, index) => (
        <StepRowView
          key={row.id}
          index={index}
          total={rows.length}
          row={row}
          drag={drag}
          isDragging={fromIndex === index}
          staticOffset={staticOffsetFor(
            index,
            fromIndex,
            dropIndex,
            draggedHeight,
          )}
          onMeasure={measure}
          onBeginDrag={beginDrag}
          onFinishDrag={finishDrag}
          onChangeText={(text) => onChangeRow(row.id, text)}
          onRemove={() => onRemoveRow(row.id)}
          onMoveUp={() => onReorder(index, index - 1)}
          onMoveDown={() => onReorder(index, index + 1)}
          copy={copy}
        />
      ))}

      {atLimit ? (
        <Text style={[styles.limit, { color: s.textMuted }]}>
          {copy.limitReached}
        </Text>
      ) : (
        <Pressable
          onPress={onAddRow}
          accessibilityRole="button"
          accessibilityLabel={copy.add}
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: s.surface },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="add" size={18} color={s.textStrong} />
          <Text style={[styles.addText, { color: s.textStrong }]}>
            {copy.add}
          </Text>
        </Pressable>
      )}
    </View>
  )
}

/**
 * 잡히지 않은 행이 비켜나는 거리. 잡은 행이 지나간 만큼만 반대로 움직인다 —
 * 비워지는 자리의 크기는 언제나 잡은 행의 높이다.
 */
function staticOffsetFor(
  index: number,
  fromIndex: number | null,
  dropIndex: number | null,
  draggedHeight: number,
): number {
  if (fromIndex === null || dropIndex === null) return 0
  if (index === fromIndex) return 0
  if (fromIndex < dropIndex && index > fromIndex && index <= dropIndex) {
    return -draggedHeight
  }
  if (dropIndex < fromIndex && index >= dropIndex && index < fromIndex) {
    return draggedHeight
  }
  return 0
}

interface StepRowViewProps {
  index: number
  total: number
  row: StepRow
  drag: SharedValue<number>
  isDragging: boolean
  staticOffset: number
  onMeasure: (index: number, height: number) => void
  onBeginDrag: (index: number) => void
  onFinishDrag: () => void
  onChangeText: (text: string) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  copy: StepEditorCopy
}

function StepRowView({
  index,
  total,
  row,
  drag,
  isDragging,
  staticOffset,
  onMeasure,
  onBeginDrag,
  onFinishDrag,
  onChangeText,
  onRemove,
  onMoveUp,
  onMoveDown,
  copy,
}: StepRowViewProps) {
  const s = useSurface()

  const pan = useMemo(
    () =>
      Gesture.Pan()
        // 수직 5px 부터 잡는다. 그 아래는 스크롤에 양보한다.
        .activeOffsetY([-5, 5])
        .failOffsetX([-20, 20])
        .onStart(() => {
          drag.value = 0
          runOnJS(onBeginDrag)(index)
        })
        .onUpdate((event) => {
          drag.value = event.translationY
        })
        .onEnd(() => {
          runOnJS(onFinishDrag)()
          drag.value = 0
        })
        .onFinalize(() => {
          drag.value = 0
        }),
    [drag, index, onBeginDrag, onFinishDrag],
  )

  // 애니메이션 스타일에는 실제로 프레임마다 바뀌는 것만 둔다. zIndex 는 잡을 때
  // 한 번 바뀌므로 평범한 스타일로 둔다(reanimated 가 매 프레임 다시 계산하지 않게).
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: isDragging ? drag.value : staticOffset }],
  }))

  return (
    <Animated.View
      style={[
        styles.rowOuter,
        isDragging && styles.rowOuterDragging,
        animatedStyle,
      ]}
      onLayout={(event) => onMeasure(index, event.nativeEvent.layout.height)}
    >
      <View
        style={[
          styles.row,
          {
            backgroundColor: isDragging ? s.surfacePressed : s.surface,
          },
        ]}
      >
        <GestureDetector gesture={pan}>
          <View
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={copy.dragHandleLabel(index + 1)}
            accessibilityActions={[
              { name: "increment", label: copy.moveDown },
              { name: "decrement", label: copy.moveUp },
            ]}
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName === "increment") {
                if (index < total - 1) onMoveDown()
              } else if (event.nativeEvent.actionName === "decrement") {
                if (index > 0) onMoveUp()
              }
            }}
            style={styles.handle}
          >
            <Ionicons name="reorder-three" size={20} color={s.textWeak} />
          </View>
        </GestureDetector>

        <Text style={[styles.ordinal, { color: s.textMuted }]}>
          {index + 1}
        </Text>

        <TextInput
          value={row.text}
          onChangeText={onChangeText}
          placeholder={copy.placeholder(index + 1)}
          placeholderTextColor={s.placeholder}
          maxLength={RECIPE_WRITE_LIMITS.stepTextMax}
          multiline
          accessibilityLabel={copy.placeholder(index + 1)}
          style={[styles.input, { color: s.textStrong }]}
        />

        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={copy.removeLabel(index + 1)}
          hitSlop={8}
          style={({ pressed }) => [
            styles.removeButton,
            pressed && { opacity: 0.6 },
          ]}
        >
          <Ionicons name="close" size={18} color={s.textWeak} />
        </Pressable>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: ROW_GAP },
  hint: { ...TYPE.caption, fontSize: 12 },
  rowOuter: {},
  rowOuterDragging: { zIndex: 5 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: LAYOUT.field.radius,
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 8,
  },
  handle: {
    width: 28,
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  ordinal: {
    ...TYPE.value,
    fontWeight: "700",
    minWidth: 16,
    lineHeight: 28,
    textAlign: "center",
  },
  input: {
    flex: 1,
    ...TYPE.value,
    padding: 0,
    paddingTop: 4,
    minHeight: 28,
    textAlignVertical: "top",
  },
  removeButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: { ...TYPE.value, fontWeight: "500" },
  addButton: {
    height: 44,
    borderRadius: LAYOUT.field.radius,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  limit: { ...TYPE.caption, fontSize: 12 },
})
