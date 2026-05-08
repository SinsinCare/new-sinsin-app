import { Pressable } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { XStack, Text } from "tamagui"
import { Icon } from "@/src/shared/components/Icon"

const VOTE_CARD_BG = { light: "#D9D9DF", dark: "#36363E" } as const
const VOTE_CARD_TEXT = { light: "#474758", dark: "#F5F6FA" } as const
const VOTE_CARD_ICON = { light: "#17191C", dark: "#17191C" } as const

interface VoteAttachCardProps {
  onEdit: () => void
  onRemove: () => void
}

export function VoteAttachCard({ onEdit, onRemove }: VoteAttachCardProps) {
  const isDark = useAppColorScheme() === "dark"

  return (
    <XStack
      paddingHorizontal={16}
      paddingVertical={14}
      borderRadius={10}
      backgroundColor={isDark ? VOTE_CARD_BG.dark : VOTE_CARD_BG.light}
      alignItems="center"
      gap={10}
    >
      <Icon
        name="vote"
        size={20}
        color={isDark ? VOTE_CARD_ICON.dark : VOTE_CARD_ICON.light}
      />
      <Text
        flex={1}
        fontSize={14}
        fontWeight="500"
        fontFamily="$body"
        color={isDark ? VOTE_CARD_TEXT.dark : VOTE_CARD_TEXT.light}
      >
        투표가 첨부되었습니다.
      </Text>
      <Pressable
        onPress={onEdit}
        hitSlop={8}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Icon
          name="pencil"
          size={20}
          color={isDark ? VOTE_CARD_ICON.dark : VOTE_CARD_ICON.light}
        />
      </Pressable>
      <Pressable
        onPress={onRemove}
        hitSlop={8}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Icon
          name="trashcan"
          size={20}
          color={isDark ? VOTE_CARD_ICON.dark : VOTE_CARD_ICON.light}
        />
      </Pressable>
    </XStack>
  )
}
