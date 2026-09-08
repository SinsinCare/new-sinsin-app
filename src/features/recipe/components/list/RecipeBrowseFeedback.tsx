import { StyleSheet } from "react-native"
import { useTranslation } from "react-i18next"
import { V2EmptyState, V2ErrorState, spacing } from "@/src/design-system-v2"
import type { V2ErrorStateRetry } from "@/src/design-system-v2"
import type { RecipeBrowseScreenModel } from "../../hooks/useRecipeBrowseScreen"
import { RecipeListSkeleton } from "./RecipeSkeletons"

export function RecipeBrowseFeedback({
  model: m,
}: {
  model: RecipeBrowseScreenModel
}) {
  const { t } = useTranslation("recipe")
  if (m.list.isLoading || m.refreshable.isRunning) return <RecipeListSkeleton />
  const retry: V2ErrorStateRetry = m.listFailure.retryable
    ? { onRetry: () => void m.list.refetch(), retryLabel: t("list.retry") }
    : {}
  if (m.list.isError)
    return (
      <V2ErrorState
        surface="recipe_list"
        tone="quiet"
        title={m.listFailure.title}
        description={m.listFailure.body}
        style={styles.state}
        {...retry}
      />
    )
  return (
    <V2EmptyState
      surface="recipe_list"
      tone="quiet"
      icon="search"
      style={styles.state}
      description={`${t(m.search.isSearching ? "feed.noResultsTitle" : "list.emptyTitle")}\n${t(m.search.isSearching ? "feed.noResultsBody" : "list.emptyBody")}`}
      {...(m.search.isSearching || m.appliedCount > 0
        ? { actionLabel: t("browse.clearSearch"), onAction: m.clearAll }
        : {})}
    />
  )
}
const styles = StyleSheet.create({
  state: { paddingVertical: spacing[32], paddingHorizontal: spacing[20] },
})
