import { TextInput } from "@/src/design-system-v2/primitives/NativeText"
import { useMemo, useState } from "react"
import {
  Keyboard,
  Pressable,
  SectionList,
  StyleSheet,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import {
  V2Icon,
  V2Text,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import type { Chat } from "@/src/types/chat"
import { presentChatHistory } from "../lib/chatHistoryPresentation"
import { ConsultHistoryRow } from "./ConsultHistoryRow"
import { ConsultHistoryActions } from "./ConsultHistoryActions"

export interface ConsultHistoryListProps {
  chats: Chat[]
  isLoading: boolean
  error?: unknown
  onRetry?: () => void
  currentConversationId?: number | null
  onSelect: (id: number) => void
  onRename: (chat: Chat) => void
  onDelete: (chat: Chat) => void
}
export function ConsultHistoryList({
  chats,
  isLoading,
  error,
  onRetry,
  currentConversationId,
  onSelect,
  onRename,
  onDelete,
}: ConsultHistoryListProps) {
  const { colors } = useV2Theme()
  const { t } = useTranslation("common")
  const insets = useSafeAreaInsets()
  const [query, setQuery] = useState("")
  const [target, setTarget] = useState<Chat | null>(null)
  const [now] = useState(() => new Date())
  const grouped = useMemo(
    () => presentChatHistory(chats, query, now),
    [chats, query, now],
  )
  const hasQuery = query.trim().length > 0
  const count = grouped.reduce((sum, section) => sum + section.data.length, 0)
  return (
    <View style={styles.grow}>
      <View
        style={styles.grow}
        accessibilityElementsHidden={!!target}
        importantForAccessibility={target ? "no-hide-descendants" : "auto"}
      >
        <View
          style={[
            styles.search,
            {
              backgroundColor: colors.fill.alternative,
              borderColor: colors.line.normal,
            },
          ]}
        >
          <V2Icon name="search" size={18} color={colors.label.neutral} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("consult.history.search")}
            accessibilityLabel={t("consult.history.search")}
            placeholderTextColor={colors.label.neutral}
            style={[styles.input, { color: colors.label.normal }]}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="never"
            onSubmitEditing={Keyboard.dismiss}
          />
          {!!query && (
            <Pressable
              onPress={() => setQuery("")}
              accessibilityRole="button"
              accessibilityLabel={t("consult.history.clearSearch")}
              style={styles.iconButton}
            >
              <V2Icon name="close" size={16} color={colors.label.neutral} />
            </Pressable>
          )}
        </View>
        {hasQuery && (
          <V2Text
            token="subtext.small"
            color={colors.label.neutral}
            style={styles.resultCount}
          >
            {t("consult.history.resultCount", { count })}
          </V2Text>
        )}
        {error != null && !isLoading && (
          <View style={styles.error}>
            <V2Text token="label.small">
              {t("consult.history.loadFailed")}
            </V2Text>
            <Pressable
              accessibilityRole="button"
              onPress={onRetry}
              style={styles.retry}
            >
              <V2Text token="label.xSmall">{t("consult.history.retry")}</V2Text>
            </Pressable>
          </View>
        )}
        <SectionList
          sections={grouped}
          keyExtractor={(chat) => String(chat.id)}
          extraData={currentConversationId}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          maxToRenderPerBatch={8}
          windowSize={7}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + spacing[20] },
          ]}
          renderSectionHeader={({ section }) => (
            <V2Text
              accessibilityRole="header"
              token="subtext.small"
              color={colors.label.neutral}
              style={styles.section}
            >
              {t(`consult.history.${section.key}`)}
            </V2Text>
          )}
          renderItem={({ item }) => (
            <ConsultHistoryRow
              chat={item}
              now={now}
              selected={currentConversationId === item.id}
              onSelect={onSelect}
              onManage={setTarget}
            />
          )}
          ListEmptyComponent={
            isLoading ? (
              <View>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={styles.skeleton}>
                    <View
                      style={[
                        styles.skeletonLine,
                        { backgroundColor: colors.fill.normal },
                      ]}
                    />
                    <View
                      style={[
                        styles.skeletonMeta,
                        { backgroundColor: colors.fill.alternative },
                      ]}
                    />
                  </View>
                ))}
              </View>
            ) : !error ? (
              <View style={styles.empty}>
                <V2Icon
                  name={hasQuery ? "search" : "chat"}
                  size={24}
                  color={colors.label.neutral}
                />
                <V2Text token="label.small">
                  {t(
                    hasQuery
                      ? "consult.history.noResults"
                      : "consult.history.emptyTitle",
                  )}
                </V2Text>
                <V2Text
                  token="subtext.medium"
                  color={colors.label.neutral}
                  style={styles.emptyCopy}
                >
                  {t(
                    hasQuery
                      ? "consult.history.searchHint"
                      : "consult.history.emptyBody",
                  )}
                </V2Text>
                {hasQuery && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setQuery("")}
                    style={styles.retry}
                  >
                    <V2Text token="label.xSmall">
                      {t("consult.history.clearSearch")}
                    </V2Text>
                  </Pressable>
                )}
              </View>
            ) : null
          }
        />
      </View>
      {target && (
        <ConsultHistoryActions
          target={target}
          onClose={() => setTarget(null)}
          onRename={onRename}
          onDelete={onDelete}
        />
      )}
    </View>
  )
}
const styles = StyleSheet.create({
  grow: { flex: 1 },
  search: {
    marginHorizontal: spacing[20],
    marginTop: spacing[12],
    marginBottom: spacing[4],
    minHeight: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: spacing[12],
    gap: spacing[8],
  },
  input: {
    ...typography.subtext.large,
    flex: 1,
    paddingVertical: spacing[10],
    paddingRight: spacing[12],
    textAlignVertical: "center",
  },
  iconButton: {
    width: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  resultCount: { paddingHorizontal: spacing[24], paddingTop: spacing[8] },
  list: { paddingHorizontal: spacing[16], flexGrow: 1 },
  section: {
    paddingHorizontal: spacing[8],
    paddingTop: spacing[20],
    paddingBottom: spacing[8],
  },
  empty: {
    alignItems: "center",
    paddingTop: spacing[24] * 2,
    paddingHorizontal: spacing[24],
    gap: spacing[12],
  },
  emptyCopy: { textAlign: "center" },
  retry: { minHeight: 44, justifyContent: "center" },
  error: { padding: spacing[20], gap: spacing[8] },
  skeleton: {
    paddingVertical: spacing[20],
    paddingHorizontal: spacing[8],
    gap: spacing[10],
  },
  skeletonLine: { width: "72%", height: 14, borderRadius: 4 },
  skeletonMeta: { width: "24%", height: 10, borderRadius: 4 },
})
