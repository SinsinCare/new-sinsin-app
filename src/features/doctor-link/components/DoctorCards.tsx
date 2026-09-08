import { Text } from "@/src/design-system-v2/primitives/NativeText"
/**
 * 의사 카드 3종. 세 화면(연결 확인 · 공유 설정 · 연결 목록)이 같은 의사를 각각 다른 무게로 보여 준다.
 *
 * - `DoctorHeroCard`  중립 면(`fill.background`). 연결 확인 화면.
 * - `DoctorBrandCard` 따뜻한 브랜드 틴트. 공유 설정 화면 — 여기서만 색을 올리는 이유는
 *   그 화면이 "이 사람에게 무엇을 연다" 는 결정을 받는 자리이기 때문이다. 결정의 대상이 화면 위에
 *   또렷하게 남아 있어야 한다.
 * - `DoctorRow`       목록의 한 줄.
 *
 * 마스코트 이미지는 두 벌이다: 전신(`doctor-character.png`)은 온보딩 히어로, 반신
 * (`doctor-character-bust.png`)은 카드 우측. 카드에 전신을 넣으면 얼굴이 너무 작아진다.
 */

import { Image, Pressable, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"

import {
  V2Icon,
  radius,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import type { DoctorCard } from "@/src/types/doctorLink"

const BUST = require("@/assets/images/doctor-character-bust.png")

/** 병원명이 없는 의사가 실제로 있다(조직 미연결). 자리를 비우지 말고 그렇다고 말한다. */
function useOrganizationLabel(doctor: DoctorCard | null): string {
  const { t } = useTranslation("settings")
  if (!doctor) return ""
  return doctor.organizationName ?? t("doctorLink.search.noOrganization")
}

export function DoctorHeroCard({ doctor }: { doctor: DoctorCard | null }) {
  const { colors } = useV2Theme()
  const organization = useOrganizationLabel(doctor)
  if (!doctor) return null

  return (
    <View style={[styles.hero, { backgroundColor: colors.fill.background }]}>
      <View style={styles.heroText}>
        <Text style={[styles.name, { color: colors.label.normal }]}>
          {doctor.name}
        </Text>
        <Text
          style={[styles.organization, { color: colors.label.alternative }]}
        >
          {organization}
        </Text>
      </View>
      <Image source={BUST} style={styles.bust} resizeMode="contain" />
    </View>
  )
}

export function DoctorBrandCard({ doctor }: { doctor: DoctorCard | null }) {
  const { colors } = useV2Theme()
  const organization = useOrganizationLabel(doctor)
  if (!doctor) return null

  return (
    <View
      style={[styles.hero, { backgroundColor: colors.primary.primaryWeak }]}
    >
      <View style={styles.heroText}>
        <Text style={[styles.name, { color: colors.label.normal }]}>
          {doctor.name}
        </Text>
        <Text
          style={[styles.organization, { color: colors.label.alternative }]}
        >
          {organization}
        </Text>
      </View>
      <Image source={BUST} style={styles.bust} resizeMode="contain" />
    </View>
  )
}

export function DoctorRow({
  doctor,
  trailing,
  onPress,
}: {
  doctor: DoctorCard | null
  /** 상태 배지 등. 없으면 chevron 을 그린다. */
  trailing?: React.ReactNode
  onPress?: () => void
}) {
  const { colors } = useV2Theme()
  const organization = useOrganizationLabel(doctor)
  if (!doctor) return null

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.fill.background },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.rowText}>
        <Text style={[styles.name, { color: colors.label.normal }]}>
          {doctor.name}
        </Text>
        <Text
          style={[styles.organization, { color: colors.label.alternative }]}
        >
          {organization}
        </Text>
      </View>
      {trailing ?? (
        <V2Icon name="chevronRight" size={20} color={colors.label.assistive} />
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: spacing[20],
    paddingRight: spacing[12],
    paddingVertical: spacing[16],
    borderRadius: radius.lg,
    // 반신 마스코트가 카드 높이를 정한다. 텍스트만 있을 때와 높이가 튀지 않게 최소값을 준다.
    minHeight: 96,
  },
  heroText: {
    flex: 1,
    gap: spacing[4],
  },
  bust: {
    width: 84,
    height: 84,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[20],
    borderRadius: radius.lg,
    gap: spacing[12],
  },
  rowText: {
    flex: 1,
    gap: spacing[4],
  },
  pressed: { opacity: 0.85 },
  name: {
    ...typography.title.xSmallWeak,
  },
  organization: {
    ...typography.label.small,
  },
})
