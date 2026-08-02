/**
 * 재료 입력 — 이름 한 칸 + 분량 한 칸.
 *
 * ## 시안의 3칸(재료명 / 단위 / 수량·개수)을 2칸으로 줄였다
 * 시안은 `저염 간장 | 15ml | 1큰술` 처럼 같은 양을 두 칸에 적게 해서, 어느 쪽이
 * 계산에 쓰이는지 알 수 없다. 서버가 받는 것은 계약 §3.3 의 `amountText` **하나**다.
 * 두 칸을 이어 붙여 보내면 `15ml 1큰술` 이 되어 파서가 앞의 것만 읽고, 사용자는
 * 자기가 적은 `1큰술` 이 무시된 것을 모른다.
 *
 * ## 무게를 모르는 표기를 그 줄에서 말한다
 * `가지 1개` 는 계산에서 빠진다(계약 §4.3: 개수는 환산하지 않는다). 그 사실을 서버
 * 왕복 뒤 목록으로 보여주면 사용자는 어느 줄인지 다시 찾아야 한다. 같은 판정을
 * 입력하는 순간 그 줄 아래에 붙인다.
 */

import { StyleSheet, Text, TextInput, View, Pressable } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"

import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE, singleLineInputText } from "@/src/theme/surface"
import { RECIPE_WRITE_LIMITS } from "@/src/features/recipe/types/recipeWrite"
import { amountHintFor } from "@/src/features/recipe/utils/recipeAmountText"
import type { IngredientRow } from "./writeFormState"

interface IngredientEditorProps {
  rows: IngredientRow[]
  onChangeRow: (id: string, patch: Partial<Omit<IngredientRow, "id">>) => void
  onRemoveRow: (id: string) => void
  onAddRow: () => void
  copy: {
    namePlaceholder: string
    amountPlaceholder: string
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
    <View style={styles.wrap}>
      {rows.map((row) => {
        const hint = amountHintFor(row.name, row.amountText)
        return (
          <View key={row.id} style={styles.rowWrap}>
            <View style={styles.row}>
              <View
                style={[
                  styles.cell,
                  styles.nameCell,
                  { backgroundColor: s.surface },
                ]}
              >
                <TextInput
                  value={row.name}
                  onChangeText={(text) => onChangeRow(row.id, { name: text })}
                  placeholder={copy.namePlaceholder}
                  placeholderTextColor={s.placeholder}
                  maxLength={RECIPE_WRITE_LIMITS.ingredientNameMax}
                  accessibilityLabel={copy.namePlaceholder}
                  style={[styles.input, { color: s.textStrong }]}
                />
              </View>
              <View
                style={[
                  styles.cell,
                  styles.amountCell,
                  { backgroundColor: s.surface },
                ]}
              >
                <TextInput
                  value={row.amountText}
                  onChangeText={(text) =>
                    onChangeRow(row.id, { amountText: text })
                  }
                  placeholder={copy.amountPlaceholder}
                  placeholderTextColor={s.placeholder}
                  maxLength={RECIPE_WRITE_LIMITS.ingredientAmountMax}
                  accessibilityLabel={copy.amountPlaceholder}
                  style={[styles.input, { color: s.textStrong }]}
                />
              </View>
              <Pressable
                onPress={() => onRemoveRow(row.id)}
                accessibilityRole="button"
                accessibilityLabel={copy.removeLabel(row.name)}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.removeButton,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Ionicons name="close" size={18} color={s.textWeak} />
              </Pressable>
            </View>
            {/*
              색을 쓰지 않는다 — 계약 §6.4 는 프라이머리 하나 + 그레이스케일이다.
              고쳐야 하는 줄(무게를 못 읽음)은 본문색 + 굵기로, 아직 안 적은 줄은
              흐린 회색으로 구분한다. 힌트가 그 줄 바로 아래에 붙어 있어서
              색 없이도 어느 줄인지 헷갈리지 않는다.
            */}
            {hint === "ok" ? null : (
              <Text
                style={[
                  styles.hint,
                  hint === "unmeasurable"
                    ? { color: s.text, fontWeight: "600" }
                    : { color: s.textMuted },
                ]}
              >
                {hint === "unmeasurable"
                  ? copy.hintUnmeasurable
                  : copy.hintMissing}
              </Text>
            )}
          </View>
        )
      })}

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

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  rowWrap: { gap: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  cell: {
    borderRadius: LAYOUT.field.radius,
    paddingHorizontal: 14,
    height: 48,
    justifyContent: "center",
  },
  nameCell: { flex: 1.6 },
  amountCell: { flex: 1 },
  input: { ...singleLineInputText(TYPE.value), padding: 0 },
  removeButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: { ...TYPE.caption, fontSize: 12, lineHeight: 17, paddingLeft: 4 },
  addButton: {
    height: 44,
    borderRadius: LAYOUT.field.radius,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addText: { ...TYPE.value, fontWeight: "500" },
  limit: { ...TYPE.caption, fontSize: 12 },
})
