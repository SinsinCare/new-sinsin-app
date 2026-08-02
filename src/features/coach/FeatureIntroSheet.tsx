/**
 * 기능 첫 진입 안내 하프시트.
 *
 * 형식을 하프시트 하나(제목 + 줄 3개 + CTA)로 못 박은 이유:
 *  - 풀스크린 캐러셀은 읽지 않고 넘기는 물건이 된 지 오래고, 이 앱의 밀도 원칙
 *    (한 화면 한 주제)과도 어긋난다.
 *  - 요소를 짚는 스포트라이트 툴팁은 스크롤 목록 위 좌표 측정이 깨지기 쉽다 —
 *    안내가 엉뚱한 곳을 가리키는 순간 신뢰를 잃는다.
 *  - 줄은 **최대 3개**다. 넷부터는 읽지 않는다. 넷이 필요하면 안내가 아니라
 *    화면 설계가 문제다.
 *
 * 부품은 기록 시트와 같은 문법을 쓴다 — 제목 sheetTitle, 줄 아이콘은 rowMarker,
 * CTA h56 r16. 새 문법을 만들면 안내 시트만 다른 앱처럼 보인다.
 */

import type { ComponentProps } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"

import { AppBottomSheet } from "@/src/shared/components/AppBottomSheet"
import { hapticStepAdvance } from "@/src/lib/haptics"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE } from "@/src/theme/surface"
import type { FeatureIntroKey } from "./storage"

type IoniconName = ComponentProps<typeof Ionicons>["name"]

/**
 * 기능별 줄 아이콘. 문구는 전부 i18n(`coach.<feature>.*`)에 있고 여기는 그림만 —
 * 아이콘 이름은 언어와 무관하다.
 */
const ROW_ICONS: Record<
  FeatureIntroKey,
  readonly [IoniconName, IoniconName, IoniconName]
> = {
  restaurant: [
    "shield-checkmark-outline",
    "options-outline",
    "sparkles-outline",
  ],
  recipe: ["time-outline", "person-outline", "bookmark-outline"],
  consult: [
    "document-text-outline",
    "chatbubble-ellipses-outline",
    "medkit-outline",
  ],
}

interface FeatureIntroSheetProps {
  feature: FeatureIntroKey
  visible: boolean
  onClose: () => void
}

export function FeatureIntroSheet({
  feature,
  visible,
  onClose,
}: FeatureIntroSheetProps) {
  const { t } = useTranslation("common")
  const surface = useSurface()
  const icons = ROW_ICONS[feature]

  return (
    <AppBottomSheet visible={visible} onClose={onClose} snapPoints={[56]}>
      <View style={styles.body}>
        <View style={styles.headText}>
          <Text style={[styles.title, { color: surface.textStrong }]}>
            {t(`coach.${feature}.title`)}
          </Text>
          <Text style={[styles.subtitle, { color: surface.textWeak }]}>
            {t(`coach.${feature}.subtitle`)}
          </Text>
        </View>

        <View style={styles.rows}>
          {(["row1", "row2", "row3"] as const).map((row, index) => (
            <View key={row} style={styles.row}>
              <View
                style={[styles.marker, { backgroundColor: surface.surface }]}
              >
                <Ionicons name={icons[index]} size={16} color={surface.brand} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: surface.textStrong }]}>
                  {t(`coach.${feature}.${row}.title`)}
                </Text>
                <Text style={[styles.rowBody, { color: surface.textWeak }]}>
                  {t(`coach.${feature}.${row}.body`)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            hapticStepAdvance()
            onClose()
          }}
        >
          {({ pressed }) => (
            <View
              style={[
                styles.cta,
                { backgroundColor: surface.brand, opacity: pressed ? 0.92 : 1 },
              ]}
            >
              <Text style={[styles.ctaLabel, { color: surface.onBrand }]}>
                {t("coach.confirm")}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </AppBottomSheet>
  )
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: LAYOUT.screenX, paddingTop: 4, gap: 20 },
  headText: { gap: 4 },
  title: { ...TYPE.sheetTitle, fontWeight: "700" },
  subtitle: TYPE.cardSub,
  rows: { gap: 14 },
  row: {
    flexDirection: "row",
    gap: LAYOUT.rowMarkerGap,
    alignItems: "flex-start",
  },
  marker: {
    width: LAYOUT.rowMarker,
    height: LAYOUT.rowMarker,
    borderRadius: LAYOUT.rowMarker / 2,
    alignItems: "center",
    justifyContent: "center",
    // 아이콘 원과 첫 줄 글자의 세로 중심을 맞춘다.
    marginTop: 1,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { ...TYPE.cardTitle, fontWeight: "600" },
  rowBody: TYPE.cardSub,
  cta: {
    height: LAYOUT.cta.height,
    borderRadius: LAYOUT.cta.radius,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaLabel: { fontSize: 17, lineHeight: 24, fontWeight: "700" },
})
