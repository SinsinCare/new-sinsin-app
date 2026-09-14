/**
 * 조리순서 시트의 **한 줄**. 손잡이 · 순번 · 입력 · 삭제가 한 행이다.
 *
 * `StepSheet` 에서 떼어 냈다(2026-08-21). 시트 파일이 두 컴포넌트를 안고 550줄이
 * 됐는데, 둘의 경계는 이미 깨끗했다 — 드래그 상태 기계는 시트가 들고 이 행은
 * `drag`·`isDragging`·`staticOffset` 을 **받기만** 한다. 스타일도 겹치는 키가
 * 하나도 없었다(시트는 `hint`·`list`·`addButton`…, 행은 `row`·`handle`·`box`…).
 * 즉 파일만 컸지 결합은 없었다.
 *
 * **이 행은 자기 위치를 모른다.** 어디로 옮겨질지(`resolveDropIndex`)도, 저장될 때
 * 몇 번이 될지도 시트가 정해서 넘긴다. 그래서 `index`(목록에서의 자리)와
 * `ordinal`(저장될 번호)이 **다른 prop** 이다 — 빈 줄이 섞이면 둘이 갈라진다.
 */

import { useMemo } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import Ionicons from "@expo/vector-icons/Ionicons"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  runOnJS,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated"

import { V2SheetTextInput } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { recordFieldLabel } from "@/src/features/home/components/record/pages/recordInk"
import {
  FIELD,
  FORM,
  S,
} from "@/src/features/home/components/record/pages/recordPageSpec"
import { RECIPE_WRITE_LIMITS } from "@/src/features/recipe/types/recipeWrite"

import { DragDotsHandle } from "./DragDotsHandle"
import { isFilledStep, type StepRow } from "./writeFormState"
import type { StepSheetCopy } from "./StepSheet"

export interface StepSheetRowProps {
  /** 목록에서의 자리. 재정렬·측정이 쓰는 축이다. */
  index: number
  /** **저장될 때의** 단계 번호. 앞쪽의 적힌 줄만 센 값이다(위 `rows.map` 주석). */
  ordinal: number
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
  copy: StepSheetCopy
}

export function StepSheetRow({
  index,
  ordinal,
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
}: StepSheetRowProps) {
  const s = useSurface()
  const filled = isFilledStep(row)

  const pan = useMemo(
    () =>
      Gesture.Pan()
        // 시트 안이라 임계값이 밖(5)보다 크다 — 머리말 §드래그 재정렬.
        .activeOffsetY([-12, 12])
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

  // 애니메이션 스타일에는 매 프레임 바뀌는 것만 둔다. zIndex 는 잡을 때 한 번
  // 바뀌므로 평범한 스타일이다(reanimated 가 매 프레임 다시 계산하지 않게).
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: isDragging ? drag.value : staticOffset }],
  }))

  return (
    <Animated.View
      style={[isDragging && styles.rowDragging, animatedStyle]}
      onLayout={(event) => onMeasure(index, event.nativeEvent.layout.height)}
    >
      <View style={styles.row}>
        <GestureDetector gesture={pan}>
          {/*
            점 6개는 9 × 15 라 손가락에 한참 못 미친다. 이 `View` 가 44 × 44 과녁을
            만든다(점 자체는 장식이고 접근성은 여기 붙는다 — DragDotsHandle 머리말).
            제스처·접근성이 같은 요소에 있어야 "잡는 곳"과 "조작하는 곳"이 안 갈린다.
            여기가 재정렬을 **시작할 유일한 손가락 경로**라 hitSlop 이 아니라 실제 폭으로
            채운다 — 이 안에서 팬이 시작되므로 과녁이 곧 제스처 영역이어야 한다.
          */}
          <View
            accessible
            accessibilityRole="adjustable"
            /*
              여기만 저장 번호(`ordinal`)가 아니라 **자리 번호**다. 이 손잡이가 옮기는
              것은 "몇 단계" 가 아니라 목록의 몇 번째 줄이고, 빈 줄이 섞이면 저장 번호는
              이웃과 겹쳐서("2번째" 가 둘) 어느 줄에 서 있는지 말해 주지 못한다.
              아래 increment/decrement 도 같은 축(`index`)으로 움직인다.
            */
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
            <DragDotsHandle color={isDragging ? s.textStrong : undefined} />
          </View>
        </GestureDetector>

        {/*
          순번은 시안에 없다. 그래도 남긴다 — 끌어 놓은 뒤 **순서가 실제로 바뀌었는지**
          확인할 수 있는 단서가 이것뿐이다. 조리 순서는 내용이 서로 비슷해서
          ("볶는다" / "끓인다") 본문만 봐서는 두 줄이 자리를 바꿨는지 알기 어렵다.

          빈 줄은 번호를 비운다. 아직 저장되지 않을 줄에 번호를 달면 그 번호가
          **다음 줄의 번호와 같아져** 화면이 스스로 거짓말을 한다(1·2·2).
          자리(`minWidth`)는 남으므로 글자만 사라지고 행은 안 흔들린다.

          스크린리더에서는 숨긴다. 이 `Text` 는 행의 형제라 독립 요소로 읽히는데,
          앞의 손잡이("n번째 순서 옮기기")도 뒤의 입력("n번째로 무엇을 하나요?")도
          이미 자기 라벨에 번호를 싣고 있다 — 사이에 낀 맨숫자는 문맥 없는 "3" 하나가
          더 읽힐 뿐이다. 같은 이유로 점 손잡이도 숨어 있다(`DragDotsHandle`).
        */}
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.ordinal,
            { color: isDragging ? s.textStrong : s.textMuted },
          ]}
        >
          {filled ? ordinal : ""}
        </Text>

        <View
          style={[
            styles.box,
            {
              backgroundColor: s.surfaceSunken,
              borderColor: isDragging ? s.textStrong : s.surfaceSunken,
            },
          ]}
        >
          <V2SheetTextInput
            value={row.text}
            onChangeText={onChangeText}
            placeholder={copy.placeholder(ordinal)}
            placeholderTextColor={recordFieldLabel(s)}
            maxLength={RECIPE_WRITE_LIMITS.stepTextMax}
            multiline
            /*
              여러 줄인데 `done` 인 이유: 한 단계는 문단이 아니라 한 문장이고, 여기서
              필요한 것은 줄바꿈이 아니라 **키패드를 내려 CTA 를 보는 것**이다.
              `submitBehavior` 를 같이 주지 않으면 iOS 에서 `Done` 이 줄바꿈만 넣어
              버튼 이름이 거짓말이 된다. 줄바꿈은 새 단계를 추가하는 쪽이 맞다.
            */
            returnKeyType="done"
            submitBehavior="blurAndSubmit"
            accessibilityLabel={copy.placeholder(ordinal)}
            style={[styles.input, { color: s.textStrong }]}
          />
        </View>

        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={copy.removeLabel(ordinal)}
          /*
            사방 8 이었다. 두 방향이 서로 **다른 방식으로** 틀려 있었다.

             · 왼쪽 8 — 옆 칸과의 간격이 `gap: 2` 뿐이라 나머지 6 이 **입력 상자 위에
               눕는다**. 그리고 이 ✕ 가 행의 마지막 형제라 겹친 자리의 터치를 가져간다
               (RN `ViewPropTypes.d.ts`: "the Z-index of sibling views always takes
               precedence if a touch hits two overlapping views"). 본문 끝에 커서를
               놓으려던 탭이 **단계 삭제**가 되고, 되돌리기도 수정 API 도 없다.
               그래서 왼쪽만 `gap` 과 같은 2 로 깎는다 — 간격을 정확히 채우고 상자
               경계에서 멈춘다.
             · 오른쪽 8 — ✕ 가 행의 마지막 자식이고 왼쪽의 `box` 가 `flex: 1` 로 남는
               폭을 다 먹어서 버튼의 오른쪽 모서리 = 행 프레임의 모서리다. 밖으로 내민
               슬롭은 전달되지 않으므로("The touch area never extends past the parent
               view bounds") 이 8 은 **통째로 죽어 있었다**. 값은 그대로 두고
               `styles.row` 가 같은 8 을 자기 안쪽 여백으로 들고 있게 했다.

            세로 8 은 원래 맞았다 — 행 높이 48 에 버튼 28 이라 위아래로 10 씩 남는다.
            모자란 6 을 오른쪽에 몰아 44 를 채우는 길(`right: 14`)은 버렸다. 과녁이
            ✕ 오른쪽의 **빈 여백까지** 14pt 뻗어서, 되돌릴 수 없는 삭제를 글리프에서
            한참 떨어진 아무것도 없는 자리가 받게 된다.
          */
          hitSlop={{ top: 8, bottom: 8, left: 2, right: 8 }}
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
  rowDragging: { zIndex: 5 },
  /*
    `gap` 이 6 → 2 다. 손잡이 과녁을 28 → 44 로 키우면서 늘어난 16pt 를 행 안에서
    되돌린 몫으로, 세 칸의 gap 에서 12 를 빼고 남은 4 만 입력 상자가 낸다
    (375pt 프레임 기준 239 → 235).

    2 가 바닥인 이유는 이웃들이 이미 자기 여백을 들고 있기 때문이다 — 순번은 minWidth
    14 안에 가운데 정렬이고, 입력 상자는 안쪽 패딩이 14, ✕ 는 28 상자 안의 18 아이콘이다.
    ✕ 상자를 24 로 줄여 4 를 더 짜내는 길은 버렸다: 44 를 유지하려면 hitSlop 을 10 으로
    키워야 하는데, 그 10 이 입력 상자의 오른쪽 패딩을 덮어서 커서를 놓으려던 탭이
    **행 삭제**가 된다. 손잡이를 음수 마진으로 목록 패딩 쪽에 내미는 길도 버렸다 —
    안드로이드는 부모 경계 밖의 터치를 잘라서 넓힌 만큼이 그대로 죽는다.

    **그 예언은 슬롭 10 이 아니라 8 에서 이미 실현돼 있었다.** gap 을 6 에서 2 로
    줄이면서 ✕ 의 사방 8 을 손대지 않은 것이 실수였다 — 간격이 6 일 때 2 만 넘치던
    왼쪽 슬롭이, 2 로 줄자 6 을 입력 상자 위에 얹었다. ✕ 상자를 24 로 줄이지 않으려고
    피했던 바로 그 오작동을 이미 하고 있었던 셈이다. 지금은 왼쪽 슬롭을 `gap` 과 같은
    2 로 묶는다(위 `hitSlop` 주석). **이 `gap` 을 다시 만지면 그 2 도 같이 고쳐야
    한다 — 둘은 늘 같은 값이어야 한다.**

    `paddingRight`/`marginRight` 는 배치가 아니라 **과녁**이다. ✕ 의 오른쪽 모서리가
    곧 행 프레임의 모서리라 바깥으로 내민 슬롭이 전달되지 않는다. 그래서 넓히려는 8 을
    행의 안쪽 여백으로 만들어 두고 같은 값의 음수 마진으로 바깥 배치를 되돌린다 —
    같은 화면의 `IngredientEditor` 가 삭제 ✕(`row`)와 `+` 줄(`wrap`)에 쓰는 장치와
    같은 짝이다. 안쪽 폭은 327 그대로라 세 칸의 폭·위치도 1pt 도 안 움직인다.
    늘어난 8 은 목록의 가로 여백(`StepSheet` 의 `list` = `spacing[24]`) 안이라
    시트 밖으로 나가지 않는다.

    375pt 프레임에서 각 칸이 **실제로** 손가락에 내주는 과녁(목록 가로 여백 24 × 2 를
    뺀 327 을 나눈 값 + 슬롭):
     · 손잡이  44 × 44 — 슬롭이 아니라 실제 폭이다(아래 `handle`). 팬이 이 안에서 시작한다.
     · 입력 상자 235 × 48 — ✕ 에게 뺏기던 오른쪽 6pt 를 되찾았다(229 → 235).
     · ✕      38 × 44 — 가로 2 + 28 + 8, 세로 8 + 28 + 8.
  */
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingRight: 8,
    marginRight: -8,
  },
  /**
   * 점 손잡이의 터치 과녁 44 × 44. 세로는 행 높이(≥48)가 이미 채우고, 가로가 28 이라
   * 모자랐다 — 재정렬을 시작할 손가락 경로가 여기 하나뿐이라 폭으로 채운다.
   * 점(9 × 15)은 이 안에서 가운데 정렬이므로 행 왼쪽 여백이 8pt 만큼 넓어 보인다.
   */
  handle: {
    width: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  ordinal: {
    ...FORM.option,
    minWidth: 14,
    textAlign: "center",
  },
  box: {
    flex: 1,
    // 재료 칸과 같은 규격(높이 48 / radius.lg). 높이 48 짜리 상자에
    // `LAYOUT.field.radius`(14)를 주면 알약처럼 부푼다(IngredientEditor 머리말).
    minHeight: 48,
    justifyContent: "center",
    borderRadius: FIELD.radius,
    borderWidth: 1,
    paddingHorizontal: S[3],
    paddingVertical: S[2],
  },
  /*
    여기만 `TYPE.value` 가 아니라 v2 토큰을 직접 편다. 둘은 크기·행간이 같은 값이지만
    (`TYPE.value = sizeOf(typography.subtext.large)`) `sizeOf()` 가 **`fontFamily` 를
    떼어낸다** — 그 face 는 원래 `AppText` 가 다시 붙여 주는데, 이 입력은 gorhom 의
    `BottomSheetTextInput` 이라 그 경로를 타지 않는다. `TYPE.value` 를 그대로 주면
    조리 순서 본문만 OS 기본 서체로 그려진다(경고 없이, 시트를 열어 봐야 보인다).
    시트 안 입력의 선례도 같다 — `ReviewReportSheet` 가 `typography.subtext.large` 를
    편다.

    여러 줄이라 `lineHeight` 를 남긴다. 여기서는 그게 줄 간격이라는 제 역할을 한다
    (`singleLineInputText()` 는 한 줄 칸 전용이다).
  */
  input: {
    ...FORM.body,
    padding: 0,
    textAlignVertical: "top",
  },
  removeButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
})
