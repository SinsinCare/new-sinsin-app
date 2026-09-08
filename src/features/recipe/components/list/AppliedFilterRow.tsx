/**
 * 적용된 필터 줄 — **여기가 필터의 진실이다**(계약 §6.1 "적용된 필터는 항상 상단에
 * 칩으로 보이고 거기서 뺀다").
 *
 * 시안에서는 상단 칩이 장식이었다(`#저염식` `#CKD3` 이 항상 같은 자리에 떠 있고 눌러도
 * 아무 일이 없었다). v2 의 칩은 (a) 실제 선택 상태를 그리고 (b) 누르면 그 필터가 빠진다.
 * 아무것도 적용되지 않았으면 이 줄은 **아예 없다** — 빈 줄이 남으면 사용자는 무언가
 * 걸려 있다고 읽는다.
 */
import { Pressable, ScrollView } from "react-native"
import { V2HStack, V2Text, spacing, borderWidth } from "@/src/design-system-v2"
import { useTranslation } from "react-i18next"

import { Icon } from "@/src/shared/components/Icon"
import { useSurface } from "@/src/hooks/useSurface"

import type {
  AppliedRecipeFilter,
  RecipeFilterGroupKey,
} from "./recipeListFilterModel"

interface AppliedFilterRowProps {
  applied: readonly AppliedRecipeFilter[]
  onRemove: (group: RecipeFilterGroupKey, optionKey: string) => void
  onClearAll: () => void
}

export function AppliedFilterRow({
  applied,
  onRemove,
  onClearAll,
}: AppliedFilterRowProps) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()

  if (applied.length === 0) return null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      bounces={false}
      overScrollMode="never"
      keyboardShouldPersistTaps="handled"
      /*
        좌우 인셋은 **여기**(contentContainerStyle)다. 호출부가 컨테이너에
        `paddingHorizontal` 을 주고 있었는데, 그러면 뷰포트 자체가 좁아져서 칩이 화면
        끝까지 못 가고 16 안쪽에서 잘린다 — 더 있다는 신호가 사라진다.
        `RecipeSortRow` 가 같은 이유로 이미 이렇게 하고 있다.
      */
      contentContainerStyle={{ gap: 8, paddingHorizontal: spacing[20] }}
    >
      {applied.map((filter) => {
        const label = t(filter.labelKey)
        return (
          <Pressable
            key={`${filter.group}:${filter.optionKey}`}
            onPress={() => onRemove(filter.group, filter.optionKey)}
            accessibilityRole="button"
            accessibilityLabel={t("list.filterRemove", { label })}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <V2HStack
              align="center"
              gap={5}
              style={{
                height: 32,
                paddingLeft: 12,
                paddingRight: 9,
                borderRadius: 10,
                backgroundColor: surface.canvas,
                borderWidth: borderWidth.thin,
                borderColor: surface.border,
              }}
            >
              <V2Text
                color={surface.textStrong}
                style={{ fontSize: 13, lineHeight: 18, fontWeight: "600" }}
              >
                {label}
              </V2Text>
              <Icon name="x" size={13} color={surface.textStrong} />
            </V2HStack>
          </Pressable>
        )
      })}

      {applied.length > 1 && (
        <Pressable
          onPress={onClearAll}
          accessibilityRole="button"
          accessibilityLabel={t("list.filterClearAll")}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <V2HStack
            align="center"
            paddingHorizontal={12}
            style={{ height: 32, borderRadius: 10 }}
          >
            <V2Text
              color={surface.textMuted}
              lineBreakStrategyIOS="hangul-word"
              style={{ fontSize: 13, lineHeight: 18, fontWeight: "600" }}
            >
              {t("list.filterClearAll")}
            </V2Text>
          </V2HStack>
        </Pressable>
      )}
    </ScrollView>
  )
}
