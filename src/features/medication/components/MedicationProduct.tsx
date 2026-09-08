import { Image, Pressable, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"
import { V2Text } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { medStyles, FORM, S } from "./medicationStyles"
import {
  drugBadge,
  drugIngredientLine,
  drugSummary,
} from "../data/drugPresentation"
import type { Drug } from "../types"
/**
 * 약 한 줄(RQ-15): 왼쪽 낱알 썸네일, 가운데 이름(용량 포함) · 제조사와 효능군 · 주성분,
 * 오른쪽 담기(>) 또는 선택 표시. 썸네일이 없으면 자리는 비우되 줄 높이는 같다 —
 * 이름을 헷갈리는 사용자가 실물과 눈으로 대조하는 자리라 크기를 줄이지 않는다.
 */
export function MedicationProduct({
  drug,
  onPress,
  trailing,
}: {
  drug: Drug
  onPress?: () => void
  trailing?: string
}) {
  const s = useSurface()
  const { t } = useTranslation("medication")
  const badge = drugBadge(drug)
  const ingredients = drugIngredientLine(drug)
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={[drug.name, drugSummary(drug), ingredients]
        .filter(Boolean)
        .join(", ")}
      disabled={!onPress}
      onPress={onPress}
      style={[
        medStyles.row,
        {
          alignItems: "flex-start",
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: s.border,
        },
      ]}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          backgroundColor: s.surfaceSunken,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {drug.imageUrl ? (
          <Image
            accessible={false}
            source={{ uri: drug.imageUrl }}
            style={{ width: 56, height: 56 }}
            resizeMode="contain"
          />
        ) : (
          <Ionicons name="medical-outline" size={24} color={s.textMuted} />
        )}
      </View>
      <View style={[medStyles.grow, { gap: 4 }]}>
        <View style={[medStyles.row, { gap: S[2], alignItems: "center" }]}>
          <V2Text style={[FORM.option, medStyles.grow]} color={s.textStrong}>
            {drug.name}
          </V2Text>
          {badge ? (
            <View
              style={{
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 6,
                backgroundColor: s.surfaceSunken,
              }}
            >
              <V2Text token="caption.small" color={s.text}>
                {t(badge === "rx" ? "rx" : "otc")}
              </V2Text>
            </View>
          ) : null}
        </View>
        <V2Text style={FORM.hint} color={s.text}>
          {drugSummary(drug)}
        </V2Text>
        {ingredients ? (
          <V2Text style={FORM.hint} color={s.textMuted}>
            {t("ingredients", { name: ingredients })}
          </V2Text>
        ) : null}
      </View>
      {trailing ? (
        <V2Text style={FORM.hint} color={s.textStrong}>
          {trailing}
        </V2Text>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={18} color={s.textMuted} />
      ) : null}
    </Pressable>
  )
}
