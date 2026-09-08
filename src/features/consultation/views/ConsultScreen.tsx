import { useCallback } from "react"
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ListRenderItemInfo,
} from "react-native"
import Animated, { useReducedMotion } from "react-native-reanimated"
import {
  V2Text,
  V2Icon,
  spacing,
  borderWidth,
  useV2Theme,
} from "@/src/design-system-v2"
import { FeatureIntroSheet } from "@/src/features/coach"
import { chatMessageKey, type Message } from "@/src/types/chat"
import { useChatFollow } from "../hooks/useChatFollow"
import {
  useConsultScreen,
  type ConsultRouteParams,
} from "../hooks/useConsultScreen"
import { ConsultChatHeader } from "../components/ConsultChatHeader"
import { ConsultWelcome } from "../components/ConsultWelcome"
import { ConsultComposer } from "../components/ConsultComposer"
import { ConsultAttachMenu } from "../components/ConsultAttachMenu"
import { UserBubble, AssistantBubble } from "../components/ChatMessageBubble"
import { CopyToast } from "../components/CopyToast"
import { ChatHistorySheet } from "../components/ChatHistorySheet"
import { RenameModal } from "../components/RenameModal"
function MessageSeparator() {
  return <View style={styles.separator} />
}
const keyExtractor = chatMessageKey
export function ConsultScreen({ params }: { params: ConsultRouteParams }) {
  const m = useConsultScreen(params)
  const { colors } = useV2Theme()
  const reduceMotion = useReducedMotion()
  const latestMessage = m.messages.at(-1)
  const follow = useChatFollow({
    listRef: m.listRef,
    followRef: m.isNearBottomRef,
    latestKey: latestMessage ? chatMessageKey(latestMessage) : "",
    streaming: m.isSending,
  })
  const lastAssistant = m.messages.findLast(
    (msg) => msg.role === "assistant",
  )?.id
  const renderMessage = useCallback(
    ({ item }: ListRenderItemInfo<Message>) =>
      item.role === "user" ? (
        <UserBubble message={item} />
      ) : (
        <AssistantBubble
          message={item}
          isLastAssistant={item.id === lastAssistant}
          isStreaming={m.isSending && item.id === lastAssistant}
          actionsDisabled={m.isSending || m.isLoadingConversation}
          onCopy={m.handleCopy}
          onRegenerate={m.regenerateLastMessage}
          onDisclosure={follow.pause}
        />
      ),
    [
      lastAssistant,
      m.isSending,
      m.isLoadingConversation,
      m.handleCopy,
      m.regenerateLastMessage,
      follow.pause,
    ],
  )
  const isIdle = m.messages.length === 0 && !m.isTyping
  const jumpToLatest = () => follow.resume(!reduceMotion)
  return (
    <View
      ref={m.attachmentRootRef}
      collapsable={false}
      style={[
        styles.root,
        {
          backgroundColor: colors.background.default,
          paddingTop: m.insets.top,
        },
      ]}
    >
      <FeatureIntroSheet
        feature="consult"
        visible={m.consultIntro.visible}
        onClose={m.consultIntro.dismiss}
      />
      <View
        style={{ flex: 1 }}
        accessibilityElementsHidden={m.historyOpen}
        importantForAccessibility={
          m.historyOpen ? "no-hide-descendants" : "auto"
        }
      >
        <ConsultChatHeader
          onHistoryPress={m.handleHistoryPress}
          onNewChatPress={m.handleNewChat}
          onClosePress={() => m.router.back()}
        />
        {m.contextLabel && (
          <View
            style={[styles.context, { borderBottomColor: colors.line.normal }]}
          >
            <V2Icon name="info" size={15} color={colors.label.neutral} />
            <V2Text
              token="subtext.medium"
              color={colors.label.neutral}
              style={{ flex: 1 }}
              numberOfLines={1}
            >
              {m.contextLabel}
            </V2Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={m.t("consult.removeContext")}
              onPress={m.dismissContext}
              style={styles.contextClose}
            >
              <V2Icon name="close" size={16} color={colors.label.neutral} />
            </Pressable>
          </View>
        )}
        <Animated.View style={[styles.root, m.bodyStyle]}>
          <View style={styles.root}>
            {isIdle ? (
              <ConsultWelcome
                category={m.category}
                onCategory={m.setCategory}
                onQuestion={m.handleFaqPress}
              />
            ) : (
              <FlatList
                ref={m.listRef}
                data={m.messages}
                ListFooterComponent={
                  !m.isSending &&
                  !m.isLoadingConversation &&
                  latestMessage?.role === "user" ? (
                    <View
                      style={{
                        paddingHorizontal: spacing[20],
                        paddingTop: spacing[20],
                      }}
                    >
                      <V2Text
                        token="subtext.medium"
                        color={colors.label.neutral}
                      >
                        {m.t("consult.unansweredSavedQuestion")}
                      </V2Text>
                    </View>
                  ) : null
                }
                renderItem={renderMessage}
                keyExtractor={keyExtractor}
                ItemSeparatorComponent={MessageSeparator}
                contentContainerStyle={styles.messages}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
                onScroll={(event) => {
                  const { contentOffset, contentSize, layoutMeasurement } =
                    event.nativeEvent
                  follow.onScroll(
                    contentOffset.y,
                    contentSize.height,
                    layoutMeasurement.height,
                  )
                }}
                onScrollBeginDrag={follow.onDragStart}
                onScrollEndDrag={follow.onDragEnd}
                onMomentumScrollBegin={follow.onMomentumStart}
                onMomentumScrollEnd={follow.onMomentumEnd}
                scrollEventThrottle={32}
                onContentSizeChange={(_, height) =>
                  follow.onContentSize(height)
                }
                onLayout={(event) =>
                  follow.onLayout(event.nativeEvent.layout.height)
                }
                initialNumToRender={12}
                maxToRenderPerBatch={8}
                windowSize={7}
                removeClippedSubviews={Platform.OS === "android"}
              />
            )}
            {!isIdle && follow.awayFromBottom && (
              <Pressable
                onPress={jumpToLatest}
                accessibilityRole="button"
                accessibilityLabel={m.t("consult.latestAnswer")}
                style={[
                  styles.latest,
                  {
                    backgroundColor: colors.background.default,
                    borderColor: colors.line.normal,
                  },
                ]}
              >
                <V2Icon
                  name="chevronDown"
                  size={18}
                  color={colors.label.normal}
                />
                <V2Text token="label.xSmall" color={colors.label.normal}>
                  {m.t("consult.latestAnswer")}
                </V2Text>
              </Pressable>
            )}
          </View>
          <ConsultComposer model={m} />
        </Animated.View>
        {m.showToast && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.toast,
              { bottom: m.restBottomInset + 110 },
              m.toastStyle,
            ]}
          >
            <CopyToast message={m.t("consult.copied")} />
          </Animated.View>
        )}
      </View>
      <ChatHistorySheet.Layout
        isOpen={m.historyOpen}
        onClose={() => m.setHistoryOpen(false)}
      >
        <View
          style={{ flex: 1 }}
          accessibilityElementsHidden={m.renameTarget !== null}
          importantForAccessibility={
            m.renameTarget ? "no-hide-descendants" : "auto"
          }
        >
          <ChatHistorySheet.Header
            onClose={() => m.setHistoryOpen(false)}
            onNewChat={m.handleNewChat}
          />
          <ChatHistorySheet.Content
            chats={m.chatHistoryList}
            isLoading={m.isFetching || m.isLoadingConversation}
            error={m.historyError}
            onRetry={() => void m.refetchHistory()}
            currentConversationId={m.conversationId}
            onSelect={m.handleSelectHistory}
            onRename={m.handleRenamePress}
            onDelete={m.handleDeletePress}
          />
        </View>
        <RenameModal
          visible={m.renameTarget !== null}
          currentName={m.renameTarget?.title ?? ""}
          onConfirm={m.handleRenameConfirm}
          onCancel={() => m.setRenameTarget(null)}
        />
      </ChatHistorySheet.Layout>
      <ConsultAttachMenu model={m} />
    </View>
  )
}
const styles = StyleSheet.create({
  context: {
    minHeight: 40,
    paddingLeft: 20,
    paddingRight: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
  },
  contextClose: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  root: { flex: 1 },
  messages: { paddingVertical: spacing[20] },
  separator: { paddingTop: spacing[24] },
  latest: {
    position: "absolute",
    alignSelf: "center",
    bottom: spacing[12],
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
    paddingHorizontal: spacing[12],
    borderWidth: borderWidth.thin,
    borderRadius: 22,
  },
  toast: { position: "absolute", left: 0, right: 0, alignItems: "center" },
})
