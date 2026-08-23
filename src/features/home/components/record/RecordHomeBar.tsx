import { Pressable, StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import Ionicons from "@expo/vector-icons/Ionicons"
import { hapticSelection } from "@/src/lib/haptics"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT } from "@/src/theme/surface"
import { formatDateWithWeekday } from "../../utils/dateUtils"
import { useTranslation } from "react-i18next"

interface RecordHomeBarProps {
  selectedDate: Date
  onPressDate: () => void
  onOpenStats: () => void
}

/**
 * 기록 화면의 컨텍스트 바.
 *
 * 이 화면의 주인은 "언제의 기록인가"다 — 그래서 날짜가 왼쪽 주인 자리에
 * 굵은 필로 앉고, 캐럿(⌄)으로 "바꿀 수 있다"를 말한다. 예전에는 날짜가
 * 오른쪽 회색 캡션이어서 정보인지 버튼인지 알 수 없었다.
 *
 * 통계는 오른쪽 보조 필 — 별도 페이지가 됐으므로 이름표와 화살표(›)를 달아
 * "다른 곳으로 간다"를 말한다. 무명 아이콘 원은 목적지를 숨긴다.
 *
 * 닉네임 칩은 걷어냈다 — 누를 수 없는 장식이 주인 자리를 차지하고 있었고,
 * "나의 기록"이라는 정체성은 위의 캐릭터 섹션이 이미 말한다.
 */
export function RecordHomeBar({
  selectedDate,
  onPressDate,
  onOpenStats,
}: RecordHomeBarProps) {
  const { t, i18n } = useTranslation()
  const surface = useSurface()

  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("home.recordBar.chooseDate")}
        onPress={() => {
          hapticSelection()
          onPressDate()
        }}
        hitSlop={6}
      >
        {({ pressed }) => (
          <View
            style={[
              styles.pill,
              {
                backgroundColor: pressed
                  ? surface.surfacePressed
                  : surface.card,
              },
            ]}
          >
            <Ionicons
              name="calendar-clear-outline"
              size={14}
              color={surface.textMuted}
            />
            <Text style={[styles.dateLabel, { color: surface.textStrong }]}>
              {formatDateWithWeekday(selectedDate, i18n.language)}
            </Text>
            <Ionicons name="chevron-down" size={12} color={surface.textWeak} />
          </View>
        )}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("home.recordBar.viewStats")}
        onPress={() => {
          hapticSelection()
          onOpenStats()
        }}
        hitSlop={6}
      >
        {({ pressed }) => (
          <View
            style={[
              styles.pill,
              {
                backgroundColor: pressed
                  ? surface.surfacePressed
                  : surface.card,
              },
            ]}
          >
            <Ionicons
              name="bar-chart-outline"
              size={14}
              color={surface.textMuted}
            />
            <Text style={[styles.statsLabel, { color: surface.text }]}>
              {t("home.recordBar.stats")}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={12}
              color={surface.textWeak}
            />
          </View>
        )}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    height: 56,
    paddingHorizontal: LAYOUT.screenX,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  // 두 버튼이 같은 필 문법(흰 면·높이 36)을 쓴다 — 위계는 색이 아니라
  // 글자 굵기와 자리(왼쪽=주인)로만 말한다.
  pill: {
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateLabel: {
    fontSize: 14.5,
    lineHeight: 20,
    letterSpacing: -0.29,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  statsLabel: { fontSize: 13.5, lineHeight: 19, fontWeight: "600" },
})
