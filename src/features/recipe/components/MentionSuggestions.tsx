import { ScrollView, StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import Ionicons from "@expo/vector-icons/Ionicons"
import Animated, {
  FadeIn,
  FadeOut,
  ReduceMotion,
} from "react-native-reanimated"

import { useSurface } from "@/src/hooks/useSurface"
import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import { useTranslation } from "react-i18next"

export interface MentionCandidate {
  nickName: string
  /** 글쓴이는 목록 맨 위에서 따로 표시한다. */
  isPostAuthor: boolean
}

interface MentionSuggestionsProps {
  candidates: MentionCandidate[]
  onSelect: (nickName: string) => void
}

/** 입력창 위에 붙는 멘션 후보 — 이 글에 참여한 사람만 나온다. */
export function MentionSuggestions({
  candidates,
  onSelect,
}: MentionSuggestionsProps) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()

  if (candidates.length === 0) return null

  return (
    <Animated.View
      entering={FadeIn.duration(140).reduceMotion(ReduceMotion.System)}
      exiting={FadeOut.duration(100).reduceMotion(ReduceMotion.System)}
      style={[styles.wrap, { backgroundColor: surface.surface }]}
    >
      <Text
        style={[styles.label, { color: surface.textMuted }]}
        lineBreakStrategyIOS="hangul-word"
      >
        {t("tag.participants")}
      </Text>
      <ScrollView
        style={styles.list}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {candidates.map((candidate) => (
          <SurfacePressable
            key={candidate.nickName}
            onPress={() => onSelect(candidate.nickName)}
            accessibilityLabel={t("tag.mention", {
              name: candidate.nickName,
            })}
            baseColor={surface.surface}
            pressScale={0.99}
            style={styles.row}
          >
            <View
              style={[
                styles.avatar,
                { backgroundColor: surface.isDark ? "#3A3A40" : "#FFFFFF" },
              ]}
            >
              <Ionicons name="person" size={13} color={surface.textWeak} />
            </View>
            <Text
              style={[styles.nickName, { color: surface.textStrong }]}
              numberOfLines={1}
            >
              {candidate.nickName}
            </Text>
            {candidate.isPostAuthor && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: surface.surfaceBrand },
                ]}
              >
                <Text
                  style={[styles.badgeText, { color: surface.brand }]}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {t("tag.author")}
                </Text>
              </View>
            )}
          </SurfacePressable>
        ))}
      </ScrollView>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    paddingTop: 10,
    paddingBottom: 4,
    // 본문 위에 떠 있는 요소다 — 쉐도우리스 규칙의 플로팅 예외.
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    shadowOpacity: 0.14,
    elevation: 6,
  },
  label: {
    paddingHorizontal: 14,
    paddingBottom: 4,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.24,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },
  list: {
    // 세 줄쯤 보이고 나머지는 스크롤 — 입력창을 밀어 올리지 않는다.
    maxHeight: 148,
  },
  row: {
    height: 44,
    borderRadius: 10,
    marginHorizontal: 6,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  nickName: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 20,
    letterSpacing: -0.29,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },
  badge: {
    height: 22,
    borderRadius: 6,
    paddingHorizontal: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },
})
