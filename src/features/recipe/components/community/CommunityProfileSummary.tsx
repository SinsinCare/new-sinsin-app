import type { ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import {
  V2Avatar,
  V2Skeleton,
  V2Text,
  radius,
  spacing,
  useV2Theme,
} from "@/src/design-system-v2"
import { COMMUNITY_GUTTER } from "./communityLayout"

/** Shared identity rhythm for my activity and another member's profile. */
export function CommunityProfileSummary({
  name,
  avatarUri,
  badges = [],
  action,
  children,
}: {
  name?: string
  avatarUri?: string | null
  badges?: readonly string[]
  action?: ReactNode
  children?: ReactNode
}) {
  const { colors } = useV2Theme()
  return (
    <View style={styles.summary}>
      <View style={styles.identityRow}>
        <V2Avatar size={48} uri={avatarUri} />
        <View style={styles.identity}>
          {name ? (
            <V2Text
              token="label.smallStrong"
              color={colors.label.normal}
              numberOfLines={2}
              lineBreakStrategyIOS="hangul-word"
            >
              {name}
            </V2Text>
          ) : (
            <V2Skeleton width="56%" height={20} radius="xs" />
          )}
          {badges.length > 0 && (
            <View style={styles.badges}>
              {badges.map((badge) => (
                <View
                  key={badge}
                  style={[
                    styles.badge,
                    { backgroundColor: colors.fill.control },
                  ]}
                >
                  <V2Text token="caption.small" color={colors.label.neutral}>
                    {badge}
                  </V2Text>
                </View>
              ))}
            </View>
          )}
        </View>
        {action}
      </View>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  summary: {
    paddingHorizontal: COMMUNITY_GUTTER,
    paddingTop: spacing[20],
    paddingBottom: spacing[20],
    gap: spacing[12],
  },
  identityRow: { flexDirection: "row", alignItems: "center", gap: spacing[12] },
  identity: { flex: 1, minWidth: 0, gap: spacing[6] },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing[6] },
  badge: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    borderRadius: radius.xs,
  },
})
