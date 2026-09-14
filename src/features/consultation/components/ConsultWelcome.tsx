import { useState } from "react"
import { Pressable, ScrollView, StyleSheet, View } from "react-native"
import { ConsultCompanion } from "./ConsultCompanion"
import {
  V2Text,
  V2Icon,
  spacing,
  borderWidth,
  useV2Theme,
} from "@/src/design-system-v2"
import { useTranslation } from "react-i18next"
import {
  CATEGORY_LIST,
  getLocalizedFrequentlyAskedQuestions,
} from "../data/mockData"
import type { ChatCategory } from "@/src/types/chat"
import type { FaqCardEntry } from "../types"

export function ConsultWelcome({
  category,
  onCategory,
  onQuestion,
}: {
  category: ChatCategory | null
  onCategory: (category: ChatCategory | null) => void
  onQuestion: (entry: FaqCardEntry) => void
}) {
  const { t, i18n } = useTranslation("common")
  const { colors } = useV2Theme()
  const [page, setPage] = useState(0)
  const all = getLocalizedFrequentlyAskedQuestions(
    i18n.resolvedLanguage ?? i18n.language,
  )
  const questions = category ? all.filter((q) => q.category === category) : all
  const start = (page * 3) % Math.max(questions.length, 1)
  const visible = [
    ...questions.slice(start),
    ...questions.slice(0, start),
  ].slice(0, 3)
  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.intro}>
        <ConsultCompanion size={64} />
        <V2Text
          token="title.small"
          color={colors.label.normal}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("consult.heroTitle")}
        </V2Text>
        <V2Text
          token="subtext.medium"
          color={colors.label.neutral}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("consult.heroBody")}
        </V2Text>
      </View>
      <View style={styles.quickTools}>
        {(["intake", "targets", "recipe"] as const).map((key) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityHint={t("consult.questionDraftHint")}
            onPress={() =>
              onQuestion({
                id: `tool-${key}`,
                category: "FOOD_DIET",
                title: t(`consult.quickTools.${key}`),
                description: t(`consult.quickTools.${key}Prompt`),
              })
            }
            style={({ pressed }) => [
              styles.quickTool,
              {
                backgroundColor: colors.fill.alternative,
                borderColor: colors.line.normal,
                opacity: pressed ? 0.55 : 1,
              },
            ]}
          >
            <V2Text token="label.xSmall" color={colors.label.normal}>
              {t(`consult.quickTools.${key}`)}
            </V2Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.sectionHead}>
        <V2Text token="label.small" color={colors.label.normal}>
          {t("consult.questionIdeas")}
        </V2Text>
        {questions.length > 3 && (
          <Pressable
            accessibilityRole="button"
            onPress={() => setPage((p) => p + 1)}
            style={styles.more}
          >
            <V2Text token="subtext.medium" color={colors.label.neutral}>
              {t("consult.moreQuestions")}
            </V2Text>
            <V2Icon name="refresh" size={14} color={colors.label.neutral} />
          </Pressable>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.categories}
      >
        {[
          { key: null, label: t("consult.allTopics") },
          ...CATEGORY_LIST.map((key) => ({
            key,
            label: t(`consult.categories.${key}`),
          })),
        ].map((c) => {
          const selected = category === c.key
          return (
            <Pressable
              key={c.key ?? "all"}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                onCategory(c.key)
                setPage(0)
              }}
              style={styles.categoryTarget}
            >
              <View
                style={[
                  styles.category,
                  {
                    borderColor: selected
                      ? colors.label.normal
                      : colors.line.normal,
                    backgroundColor: selected
                      ? colors.label.normal
                      : colors.background.default,
                  },
                ]}
              >
                <V2Text
                  token={selected ? "label.xSmall" : "subtext.medium"}
                  color={
                    selected ? colors.background.default : colors.label.neutral
                  }
                >
                  {c.label}
                </V2Text>
              </View>
            </Pressable>
          )
        })}
      </ScrollView>
      <View style={styles.questions}>
        {visible.map((q) => (
          <Pressable
            key={q.id}
            onPress={() => onQuestion(q)}
            accessibilityRole="button"
            accessibilityLabel={q.description}
            accessibilityHint={t("consult.questionDraftHint")}
            style={({ pressed }) => [
              styles.question,
              {
                borderBottomColor: colors.line.normal,
                opacity: pressed ? 0.55 : 1,
              },
            ]}
          >
            <View style={styles.questionBody}>
              <V2Text token="subtext.small" color={colors.label.neutral}>
                {q.title}
              </V2Text>
              <V2Text
                token="subtext.large"
                color={colors.label.normal}
                lineBreakStrategyIOS="hangul-word"
              >
                {q.description}
              </V2Text>
            </View>
            <V2Icon
              name="arrowUp"
              size={18}
              color={colors.label.neutral}
              style={{ transform: [{ rotate: "45deg" }] }}
            />
          </Pressable>
        ))}
        {visible.length === 0 && (
          <V2Text
            token="subtext.medium"
            color={colors.label.neutral}
            style={styles.empty}
          >
            {t("consult.writeOwnQuestion")}
          </V2Text>
        )}
      </View>
    </ScrollView>
  )
}
const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: spacing[16], paddingBottom: spacing[20] },
  intro: {
    paddingHorizontal: spacing[20],
    gap: spacing[8],
    paddingBottom: spacing[24],
  },
  avatar: { width: 40, height: 40, marginBottom: spacing[4] },
  sectionHead: {
    paddingHorizontal: spacing[20],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  quickTools: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing[20],
    paddingBottom: spacing[16],
    gap: spacing[8],
  },
  quickTool: {
    minHeight: 44,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[12],
    borderWidth: borderWidth.thin,
    borderRadius: 12,
    justifyContent: "center",
  },
  more: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
  },
  categories: { paddingHorizontal: spacing[20], gap: spacing[8] },
  categoryTarget: { paddingVertical: spacing[6] },
  category: {
    minHeight: 32,
    borderWidth: borderWidth.thin,
    borderRadius: 16,
    paddingHorizontal: spacing[12],
    justifyContent: "center",
  },
  questions: { paddingHorizontal: spacing[20] },
  question: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[16],
    paddingVertical: spacing[16],
    borderBottomWidth: borderWidth.thin,
  },
  questionBody: { flex: 1, gap: spacing[4] },
  empty: { paddingVertical: spacing[20] },
})
