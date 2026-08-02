/**
 * 검색 입력 + 필터 진입. 필터로 들어가는 문은 **여기 하나뿐이다**(계약 §6.1).
 *
 * 시안은 필터를 세 군데(상단 칩 · 카테고리 아이콘 캐러셀 · 우측 필터 아이콘 → 시트에 또
 * 같은 3그룹)에서 조작했다. v2 는 이 버튼 하나로만 시트를 열고, 적용된 것은 아래
 * `AppliedFilterRow` 에 항상 보인다. 버튼에 적용 개수를 얹어 시트를 열기 전에도
 * 몇 개가 걸려 있는지 보이게 한다(§6.4 "결과 예측 가능").
 */
import { Pressable, TextInput } from "react-native"
import { XStack, Text, View } from "tamagui"
import { useTranslation } from "react-i18next"

import { Icon } from "@/src/shared/components/Icon"
import { useSurface } from "@/src/hooks/useSurface"
import { tokens } from "@/src/theme/tokens"

interface RecipeSearchFieldProps {
  value: string
  onChangeText: (value: string) => void
  onSubmit: () => void
  onClear: () => void
  onFocus: () => void
  onBlur: () => void
  onOpenFilters: () => void
  appliedFilterCount: number
  /**
   * 자리 문구. **검색 범위가 다른 화면**이 바꿔 준다 — 보관함의 검색은 내가 저장한 것
   * 안에서만 찾으므로 "레시피를 검색해 보세요" 라고 적으면 전체 카탈로그를 찾는 것으로
   * 읽힌다. 기본값은 목록 화면(전체 레시피)의 문구다.
   */
  placeholder?: string
}

export function RecipeSearchField({
  value,
  onChangeText,
  onSubmit,
  onClear,
  onFocus,
  onBlur,
  onOpenFilters,
  appliedFilterCount,
  placeholder,
}: RecipeSearchFieldProps) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()
  const hasFilters = appliedFilterCount > 0

  return (
    <XStack gap={10} alignItems="center">
      <XStack
        flex={1}
        alignItems="center"
        gap={8}
        height={44}
        paddingHorizontal={14}
        borderRadius={14}
        backgroundColor={surface.surface}
      >
        <Icon name="magnifyingglass" size={18} color={surface.textWeak} />
        <TextInput
          style={{
            flex: 1,
            padding: 0,
            fontSize: 15,
            lineHeight: 20,
            fontWeight: "500",
            color: surface.textStrong,
          }}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          onSubmitEditing={onSubmit}
          returnKeyType="search"
          placeholder={placeholder ?? t("feed.recipeSearchPlaceholder")}
          placeholderTextColor={surface.placeholder}
          autoCorrect={false}
          // 한글 입력에서 자동 대문자·완성 보정이 검색어를 바꾸는 것을 막는다.
          autoCapitalize="none"
        />
        {value.length > 0 && (
          <Pressable
            onPress={onClear}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t("feed.clearSearch")}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Icon name="x" size={16} color={surface.textWeak} />
          </Pressable>
        )}
      </XStack>

      <Pressable
        onPress={onOpenFilters}
        accessibilityRole="button"
        accessibilityLabel={
          hasFilters
            ? t("list.filterApplied", { count: appliedFilterCount })
            : t("list.filterOpen")
        }
        accessibilityState={{ selected: hasFilters }}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <XStack
          alignItems="center"
          gap={6}
          height={44}
          paddingHorizontal={14}
          borderRadius={14}
          backgroundColor={hasFilters ? surface.surfaceBrand : surface.surface}
        >
          <Icon
            name="filter"
            size={18}
            color={hasFilters ? tokens.color.primary.val : surface.textMuted}
          />
          <Text
            fontFamily="$body"
            fontSize={14}
            lineHeight={20}
            fontWeight="600"
            color={hasFilters ? tokens.color.primary.val : surface.textMuted}
          >
            {t("list.filterOpen")}
          </Text>
          {hasFilters && (
            <View
              minWidth={18}
              height={18}
              borderRadius={9}
              alignItems="center"
              justifyContent="center"
              paddingHorizontal={5}
              backgroundColor={tokens.color.primary.val}
            >
              <Text
                fontFamily="$body"
                fontSize={11}
                lineHeight={16}
                fontWeight="700"
                color="#FFFFFF"
              >
                {appliedFilterCount}
              </Text>
            </View>
          )}
        </XStack>
      </Pressable>
    </XStack>
  )
}
