import { Pressable, StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import Ionicons from "@expo/vector-icons/Ionicons"

import { useSurface } from "@/src/hooks/useSurface"
import { useTranslation } from "react-i18next"

interface VoteAttachCardProps {
  /** 투표 질문(선택) — 있으면 자리표시 문구 대신 질문을 보여준다. */
  title?: string
  onEdit: () => void
  onRemove: () => void
}

/** 에디터에 붙은 투표 — 회색 면 한 장으로 존재만 알린다. */
export function VoteAttachCard({
  title,
  onEdit,
  onRemove,
}: VoteAttachCardProps) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()

  return (
    <View style={[styles.card, { backgroundColor: surface.surface }]}>
      <Ionicons name="podium-outline" size={18} color={surface.textMuted} />
      <Text
        style={[styles.label, { color: surface.textStrong }]}
        numberOfLines={1}
      >
        {title ?? t("poll.attached")}
      </Text>
      <Pressable
        onPress={onEdit}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t("poll.editAccessibility")}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        <Ionicons name="create-outline" size={20} color={surface.textMuted} />
      </Pressable>
      <Pressable
        onPress={onRemove}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t("poll.deleteAccessibility")}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        <Ionicons name="trash-outline" size={19} color={surface.textMuted} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  label: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.28,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },
})
