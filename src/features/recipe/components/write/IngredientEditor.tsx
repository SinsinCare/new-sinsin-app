/**
 * 재료 줄 편집기 — 이름 · 무게 · 개수 세 칸 + 삭제. 세 칸은 서버로 갈 때 한 칸으로
 * 합쳐진다(`joinIngredientAmount`, SPEC §6.5).
 *
 * 칸은 키트 텍스트 면과 같은 규칙이다: `s.surfaceSunken` 바탕 · 포커스에 `s.brand`
 * 테두리. 줄마다 붙는 분량 힌트(`amountHintFor`)는 "왜 영양 계산에서 빠지는가" 를
 * 그 자리에서 말한다 — 등록 뒤에 알면 늦다(레시피 수정이 아직 없다).
 */

import { useState } from "react"
import {
  StyleSheet,
  View,
  Pressable,
  type TextInputProps,
  type ViewStyle,
} from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { TextInput } from "@/src/design-system-v2/primitives/NativeText"
import { V2Text } from "@/src/design-system-v2"
import { fontFamily } from "@/src/design-system-v2/tokens/typography"
import { useSurface } from "@/src/hooks/useSurface"
import { recordFieldLabel } from "@/src/features/home/components/record/pages/recordInk"
import {
  FIELD,
  FORM,
  MIN,
  S,
} from "@/src/features/home/components/record/pages/recordPageSpec"
import { RECIPE_WRITE_LIMITS } from "@/src/features/recipe/types/recipeWrite"
import { amountHintFor } from "@/src/features/recipe/utils/recipeAmountText"
import { joinIngredientAmount, type IngredientRow } from "./writeFormState"

interface IngredientEditorProps {
  rows: IngredientRow[]
  onChangeRow: (id: string, patch: Partial<Omit<IngredientRow, "id">>) => void
  onRemoveRow: (id: string) => void
  onAddRow: () => void
  copy: {
    namePlaceholder: string
    unitPlaceholder: string
    countPlaceholder: string
    label: string
    unitLabel: string
    countLabel: string
    add: string
    removeLabel: (name: string) => string
    limitReached: string
    hintMissing: string
    hintUnmeasurable: string
  }
}

export function IngredientEditor({
  rows,
  onChangeRow,
  onRemoveRow,
  onAddRow,
  copy,
}: IngredientEditorProps) {
  const s = useSurface()
  const atLimit = rows.length >= RECIPE_WRITE_LIMITS.ingredientMax
  return (
    <View style={styles.group}>
      <V2Text style={styles.label} color={s.textStrong}>
        {copy.label}
        <V2Text color={s.brand}> *</V2Text>
      </V2Text>
      <View style={styles.rows}>
        {rows.map((row) => {
          const hint = amountHintFor(
            row.name,
            joinIngredientAmount(row.amountText, row.countText),
          )
          return (
            <View key={row.id} style={styles.rowWrap}>
              <View style={styles.row}>
                <Cell
                  cellStyle={styles.nameCell}
                  value={row.name}
                  onChangeText={(text) => onChangeRow(row.id, { name: text })}
                  placeholder={copy.namePlaceholder}
                  maxLength={RECIPE_WRITE_LIMITS.ingredientNameMax}
                  accessibilityLabel={copy.namePlaceholder}
                />
                <Cell
                  cellStyle={styles.sideCell}
                  value={row.amountText}
                  onChangeText={(text) =>
                    onChangeRow(row.id, { amountText: text })
                  }
                  placeholder={copy.unitPlaceholder}
                  maxLength={RECIPE_WRITE_LIMITS.ingredientUnitMax}
                  accessibilityLabel={copy.unitLabel}
                />
                <Cell
                  cellStyle={styles.sideCell}
                  value={row.countText}
                  onChangeText={(text) =>
                    onChangeRow(row.id, { countText: text })
                  }
                  placeholder={copy.countPlaceholder}
                  maxLength={RECIPE_WRITE_LIMITS.ingredientCountMax}
                  accessibilityLabel={copy.countLabel}
                />
                <Pressable
                  onPress={() => onRemoveRow(row.id)}
                  accessibilityRole="button"
                  accessibilityLabel={copy.removeLabel(row.name)}
                  style={({ pressed }) => [
                    styles.removeButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="close" size={18} color={s.textWeak} />
                </Pressable>
              </View>
              {hint === "ok" ? null : (
                <V2Text
                  style={styles.hint}
                  color={hint === "unmeasurable" ? s.textStrong : s.text}
                >
                  {hint === "unmeasurable"
                    ? copy.hintUnmeasurable
                    : copy.hintMissing}
                </V2Text>
              )}
            </View>
          )
        })}
      </View>
      {atLimit ? (
        <V2Text style={styles.hint} color={s.text}>
          {copy.limitReached}
        </V2Text>
      ) : (
        <Pressable
          onPress={onAddRow}
          accessibilityRole="button"
          accessibilityLabel={copy.add}
          style={({ pressed }) => [
            styles.addButton,
            {
              backgroundColor: pressed ? s.surfacePressed : s.surfaceSunken,
              borderColor: s.surfaceSunken,
            },
          ]}
        >
          <Ionicons name="add" size={16} color={s.textStrong} />
          <V2Text style={styles.addText} color={s.textStrong}>
            {copy.add}
          </V2Text>
        </Pressable>
      )}
    </View>
  )
}

/** 한 칸 — 포커스 테두리는 칸이 스스로 든다(줄 단위 상태로 올리면 세 칸이 같이 물든다). */
function Cell({
  cellStyle,
  ...input
}: Omit<TextInputProps, "style"> & { cellStyle: ViewStyle }) {
  const s = useSurface()
  const [focused, setFocused] = useState(false)
  return (
    <View
      style={[
        styles.cell,
        cellStyle,
        {
          backgroundColor: focused ? s.canvas : s.surfaceSunken,
          borderColor: focused ? s.brand : s.surfaceSunken,
        },
      ]}
    >
      <TextInput
        {...input}
        onFocus={(event) => {
          setFocused(true)
          input.onFocus?.(event)
        }}
        onBlur={(event) => {
          setFocused(false)
          input.onBlur?.(event)
        }}
        placeholderTextColor={recordFieldLabel(s)}
        selectionColor={s.brand}
        style={[styles.input, { color: s.textStrong }]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  group: { gap: FORM.labelGap },
  label: FORM.label,
  rows: { gap: S[2] },
  rowWrap: { gap: S[1] },
  row: { flexDirection: "row", alignItems: "center", gap: S[1] },
  cell: {
    borderRadius: FIELD.radius,
    borderWidth: 1,
    height: MIN.TOUCH + S[1],
    justifyContent: "center",
  },
  nameCell: { flex: 1, paddingHorizontal: S[3] },
  sideCell: { width: FIELD.height - S[2], paddingHorizontal: S[2] },
  input: {
    ...FORM.body,
    lineHeight: undefined,
    fontFamily: fontFamily.regular,
    includeFontPadding: false,
    padding: 0,
  },
  removeButton: {
    width: MIN.TOUCH - S[3],
    height: MIN.TOUCH,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -S[2],
  },
  pressed: { opacity: 0.6 },
  hint: { ...FORM.hint, paddingLeft: S[1] },
  addButton: {
    minHeight: FORM.choiceHeight,
    borderRadius: FORM.choiceRadius,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: S[1],
  },
  addText: FORM.option,
})
