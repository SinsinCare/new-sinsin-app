/**
 * 자동완성 패널. 계약 §6.1 의 첫 줄을 고치는 화면이다 —
 * 시안은 입력해도 아래가 바뀌지 않았다(`Typing.png` ≡ `Typed.png`).
 *
 * 규칙:
 *  - 입력 즉시(400ms 디바운스) 제안을 띄우고, **확정할 때만** 결과 목록이 바뀐다.
 *  - 제안이 없어도 "그대로 검색" 줄은 항상 남긴다. 제안이 없다고 길이 막히면
 *    사용자는 자기가 뭘 잘못했는지 알 수 없다.
 *  - 제안을 기다리는 동안 이전 글자의 제안을 그리지 않는다(위 훅에서 잘라 준다) —
 *    안 그러면 "밥" 을 지우고 "국" 을 쳤는데 밥 목록이 남아 있다.
 */
import { Pressable, ScrollView } from "react-native"
import { V2Box, V2HStack, V2Text, V2VStack } from "@/src/design-system-v2"
import { useTranslation } from "react-i18next"

import { Icon } from "@/src/shared/components/Icon"
import { useSurface } from "@/src/hooks/useSurface"
import { GUTTER } from "@/src/design-system-v2"

import type { RecipeSuggestion } from "../../types/recipeListV2"

interface RecipeSuggestPanelProps {
  draft: string
  suggestions: readonly RecipeSuggestion[]
  isSuggesting: boolean
  onSelect: (text: string) => void
}

export function RecipeSuggestPanel({
  draft,
  suggestions,
  isSuggesting,
  onSelect,
}: RecipeSuggestPanelProps) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()
  const trimmed = draft.trim()

  return (
    <ScrollView
      style={{ flex: 1 }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/*
        시작선은 `GUTTER`(16)다. 20 을 쓰고 있었는데, 이 패널은 검색 필드 **바로 아래**
        에 열리고 그 필드는 16 에서 시작한다 — 4pt 어긋난 줄이 뜨고 지는 것으로 보였다.
      */}
      <V2VStack paddingHorizontal={GUTTER} gap={2} style={{ paddingTop: 12 }}>
        <V2Text color={surface.textWeak} lineBreakStrategyIOS="hangul-word" style={{ fontSize: 12.5, lineHeight: 18, fontWeight: "600", paddingBottom: 6 }}>
          {t("list.suggestTitle")}
        </V2Text>

        {suggestions.map((suggestion) => (
          <Pressable
            key={`${suggestion.kind}:${suggestion.text}`}
            onPress={() => onSelect(suggestion.text)}
            accessibilityRole="button"
            accessibilityLabel={t("list.searchAccessibility", {
              text: suggestion.text,
            })}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <V2HStack align="center" gap={10} paddingVertical={11}>
              <Icon
                name={suggestion.kind === "recipe" ? "recipe" : "hashtag"}
                size={16}
                color={surface.textWeak}
              />
              <V2Text color={surface.textStrong} numberOfLines={1} style={{ flex: 1, fontSize: 15, lineHeight: 21 }}>
                {suggestion.text}
              </V2Text>
            </V2HStack>
          </Pressable>
        ))}

        {!isSuggesting && suggestions.length === 0 && trimmed.length > 0 && (
          <V2Text color={surface.textWeak} lineBreakStrategyIOS="hangul-word" style={{ fontSize: 13, lineHeight: 19, paddingVertical: 10 }}>
            {t("list.suggestEmpty")}
          </V2Text>
        )}

        {trimmed.length > 0 && (
          <>
            <V2Box style={{ height: 1, backgroundColor: surface.hairline, marginVertical: 6 }}/>
            <Pressable
              onPress={() => onSelect(trimmed)}
              accessibilityRole="button"
              accessibilityLabel={t("list.searchAccessibility", {
                text: trimmed,
              })}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <V2HStack align="center" gap={10} paddingVertical={11}>
                <Icon
                  name="magnifyingglass"
                  size={16}
                  color={surface.textWeak}
                />
                <V2Text color={surface.text} numberOfLines={1} style={{ flex: 1, fontSize: 15, lineHeight: 21, fontWeight: "600" }}>
                  {t("list.suggestKeyword", { text: trimmed })}
                </V2Text>
              </V2HStack>
            </Pressable>
          </>
        )}
      </V2VStack>
    </ScrollView>
  )
}
