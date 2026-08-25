import { TouchableOpacity, StyleSheet } from "react-native"
// 원격 사진은 expo-image — 디스크 캐시·다운스케일 디코드로 목록 스크롤이 가볍다
import { Image } from "expo-image"
import { useTranslation } from "react-i18next"

import { useV2Theme, V2Text, V2VStack } from "@/src/design-system-v2"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { remoteImageSource } from "@/src/shared/images/remoteImageSource"
import { MealRecord } from "../../data/dietaryRecord"

interface DietaryRecordCardProps {
  mealData: MealRecord
  onPress: () => void
}

export function DietaryRecordCard({
  mealData,
  onPress,
}: DietaryRecordCardProps) {
  const { t } = useTranslation()
  const { colors } = useV2Theme()
  /*
    다크에서는 테두리를 지운다 — 면 자체가 한 단계 떠 있어 선이 이중으로 보인다.
    이건 색이 아니라 **구성** 판단이라 v2 토큰으로 접히지 않는다. 스킴을 계속 본다.
  */
  const isDarkMode = useAppColorScheme() === "dark"
  const hasPhoto = Boolean(mealData.imageUri)

  return (
    <TouchableOpacity onPress={onPress} style={styles.touch}>
      <V2VStack
        flex={1}
        justify="flex-end"
        style={[
          styles.card,
          {
            backgroundColor: colors.background.default,
            borderWidth: isDarkMode ? 0 : 1,
            borderColor: colors.line.normal,
          },
        ]}
      >
        {mealData.imageUri && (
          <Image
            source={remoteImageSource(mealData.imageUri)}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
        )}
        <V2VStack padding={8}>
          {/* 사진 위에서는 흰 글자 — 면 색과 무관하게 사진 대비를 따른다. */}
          <V2Text
            color={hasPhoto ? colors.static.white : colors.label.strong}
            style={styles.label}
          >
            {mealData.label}
          </V2Text>
          <V2Text
            color={hasPhoto ? colors.static.white : colors.label.neutral}
            style={styles.time}
          >
            {mealData.time ?? t("stats.dietary.noRecord")}
          </V2Text>
        </V2VStack>
      </V2VStack>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  touch: { flex: 1 },
  // tamagui `borderRadius="$6"` = radius 스케일 12.
  card: { height: 100, borderRadius: 12, overflow: "hidden" },
  label: { fontSize: 14, fontWeight: "500" },
  time: { fontSize: 12, fontWeight: "500" },
})
