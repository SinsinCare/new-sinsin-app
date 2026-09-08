import { useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import {
  V2Icon,
  V2Text,
  spacing,
  useV2Theme,
  type V2IconName,
} from "@/src/design-system-v2"
import type { ConsultActivity } from "@/src/types/chat"
import { consultProgress } from "../lib/consultProgress"
import { ConsultCompanion } from "./ConsultCompanion"
import { ConsultShimmerText } from "./ConsultShimmerText"
import Animated, { FadeIn } from "react-native-reanimated"
import { ConsultChevron, ConsultDisclosure } from "./ConsultDisclosure"
import { useStableConsultStatus } from "../hooks/useConsultPresentation"
import { useConsultMotion } from "../hooks/useConsultMotion"

const readIcons: Partial<Record<ConsultActivity["action"], V2IconName>> = {
  profile: "profile",
  intake: "report",
  recipes: "search",
  recipe: "book",
}

export function ConsultActivityTrail({
  activities = [],
  active = false,
  deliveryState,
  answerStarted = false,
  onDisclosure,
}: {
  activities?: ConsultActivity[]
  active?: boolean
  deliveryState?: "failed" | "stopped"
  answerStarted?: boolean
  onDisclosure?: () => void
}) {
  const { colors } = useV2Theme()
  const { t } = useTranslation("common")
  const [expanded, setExpanded] = useState(false)
  const motion = useConsultMotion(active || expanded)
  const { tools, headlineKey, canExpand } = consultProgress(
    activities,
    active,
    deliveryState,
    answerStarted,
  )
  const stableKey = useStableConsultStatus(headlineKey, active)
  const label = t(stableKey, { count: tools.length })
  const headingContent = (
    <>
      <ConsultCompanion size={32} />
      <View style={styles.copy}>
        <V2Text token="label.xSmall" color={colors.label.normal}>
          {t("consult.assistantLabel")}
        </V2Text>
        <ConsultShimmerText label={label} active={active} />
      </View>
      <View style={styles.disclosure}>
        {canExpand && (
          <Animated.View entering={motion ? FadeIn.duration(160) : undefined}>
            <ConsultChevron open={expanded} />
          </Animated.View>
        )}
      </View>
    </>
  )
  const headingLabel = `${t("consult.assistantLabel")}, ${label}`

  return (
    <View style={styles.root}>
      <Pressable
        accessibilityRole={canExpand ? "button" : "text"}
        accessibilityLabel={headingLabel}
        accessibilityState={canExpand ? { expanded } : undefined}
        disabled={!canExpand}
        onPress={() => {
          onDisclosure?.()
          setExpanded((value) => !value)
        }}
        style={({ pressed }) => [
          styles.heading,
          { opacity: pressed ? 0.65 : 1 },
        ]}
      >
        {headingContent}
      </Pressable>
      <ConsultDisclosure open={expanded && canExpand}>
        <View style={styles.details}>
          {tools.map((item) => {
            const name =
              item.action === "recipe" && item.sources?.[0]
                ? item.sources[0].title
                : t(`consult.activity.labels.${item.action}`)
            const status =
              item.status === "complete" && item.outcome === "empty"
                ? t(
                    item.action === "recipes"
                      ? "consult.activity.noRecipes"
                      : "consult.activity.empty",
                  )
                : item.status === "complete" && item.resultCount !== undefined
                  ? t("consult.activity.results", { count: item.resultCount })
                  : t(`consult.activity.states.${item.status}`)
            const showStatus =
              item.status !== "complete" ||
              item.outcome === "empty" ||
              item.resultCount !== undefined
            const statusColor =
              item.status === "error"
                ? colors.status.negative
                : colors.label.neutral
            return (
              <Animated.View
                entering={motion ? FadeIn.duration(160) : undefined}
                key={item.id}
                style={styles.row}
                accessible
                accessibilityLabel={`${name}, ${status}`}
              >
                <V2Icon
                  name={readIcons[item.action] ?? "info"}
                  size={16}
                  color={statusColor}
                />
                <V2Text
                  token="subtext.medium"
                  color={colors.label.neutral}
                  style={styles.rowLabel}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {name}
                </V2Text>
                {showStatus && (
                  <V2Text
                    token="subtext.small"
                    color={statusColor}
                    style={styles.rowStatus}
                  >
                    {status}
                  </V2Text>
                )}
              </Animated.View>
            )
          })}
        </View>
      </ConsultDisclosure>
    </View>
  )
}
const styles = StyleSheet.create({
  root: { width: "100%" },
  heading: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
  },
  copy: { flex: 1, gap: spacing[4], paddingVertical: spacing[4] },
  disclosure: { width: spacing[20], alignItems: "flex-end" },
  details: {
    marginLeft: spacing[32] + spacing[8],
    paddingVertical: spacing[4],
    gap: spacing[2],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: spacing[28],
    gap: spacing[8],
    paddingVertical: spacing[4],
  },
  rowLabel: { flex: 1 },
  rowStatus: { flexShrink: 1, maxWidth: "40%", textAlign: "right" },
})
