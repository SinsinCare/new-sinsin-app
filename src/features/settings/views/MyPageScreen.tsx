import React, { useCallback } from "react"
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Share,
  Alert,
  Image,
} from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useFocusEffect } from "@react-navigation/native"

import { ThemedText } from "@/components/themed-text"
import { KidneyProfileCard } from "@/src/features/settings/components"
import { useKidneyProfile } from "@/src/features/settings/hooks/useKidneyProfile"
import { useMyPageProfile } from "@/src/features/settings/hooks/useMyPageProfile"
import { useDateAnalysis } from "@/src/features/home/hooks/useDateAnalysis"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"
import { useNutrientLimits } from "@/src/features/nutrition/hooks/useNutrientLimits"
import { tokens } from "@/src/theme/tokens"

function formatDiagnosisDate(iso: string | null): string | null {
  if (!iso) return null
  const [year, month] = iso.split("-")
  if (!year || !month) return null
  return `${year}년 ${parseInt(month)}월`
}

const APP_DOWNLOAD_URL =
  "https://apps.apple.com/us/app/%EC%8B%A0%EC%8B%A0%EB%8B%B9%EB%B6%80/id6758880186"

const COMORBIDITY_LABEL: Record<string, string> = {
  DIABETES: "당뇨",
  HYPERTENSION: "고혈압",
  HEART_DISEASE: "심장질환",
  GOUT: "통풍",
  ANEMIA: "빈혈",
  BONE_MINERAL: "골미네랄 장애",
}

const DIAGNOSIS_CAUSE_LABEL: Record<string, string> = {
  DIABETIC_KIDNEY_DISEASE: "당뇨병성 신장 질환",
  HYPERTENSION: "고혈압",
  GLOMERULONEPHRITIS: "사구체신염",
  POLYCYSTIC_KIDNEY_DISEASE: "다낭성 신장 질환",
  OTHER: "기타",
}

const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: "아침",
  LUNCH: "점심",
  DINNER: "저녁",
  SNACKS: "간식",
}

export function MyPageScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const c = useSettingsColors()
  const { data: profile, refetch: refetchProfile } = useMyPageProfile()
  const { data: kidneyProfile } = useKidneyProfile()
  // 같은 ["kidneyProfile"] 캐시를 공유하므로 요청이 늘지 않는다.
  const nutrientLimits = useNutrientLimits()
  const { data: todayAnalysis } = useDateAnalysis(new Date())

  useFocusEffect(
    useCallback(() => {
      refetchProfile()
    }, [refetchProfile]),
  )

  const handleShareData = useCallback(async () => {
    const hasData = kidneyProfile || todayAnalysis?.result?.analysis
    if (!hasData) {
      Alert.alert(
        "공유할 데이터가 없습니다",
        "신장 프로필을 입력하거나 오늘 식사를 기록한 후 공유해주세요.",
      )
      return
    }

    const today = new Date()
    const dateLabel = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

    const lines: string[] = [
      `[신신당부] ${profile?.nickName ?? "사용자"}님의 건강 데이터`,
      `📅 ${dateLabel} 기준`,
      "",
    ]

    if (kidneyProfile) {
      lines.push("👤 신장 프로필")
      lines.push(
        `• ${kidneyProfile.ckdStageLabel ?? "신장 병기 미입력"}${kidneyProfile.isDialysis ? " | 투석 중" : ""}`,
      )
      if (kidneyProfile.heightCm) {
        lines.push(`• 키: ${kidneyProfile.heightCm}cm`)
      }
      if (kidneyProfile.weightKg) {
        lines.push(`• 체중: ${kidneyProfile.weightKg}kg`)
      }
      if (
        kidneyProfile.diagnosisCauses?.length ||
        kidneyProfile.diagnosisCauseOther
      ) {
        const labels = [
          ...(kidneyProfile.diagnosisCauses ?? []).map(
            (key) =>
              DIAGNOSIS_CAUSE_LABEL[key] ??
              DIAGNOSIS_CAUSE_LABEL[key.toUpperCase()] ??
              key,
          ),
          ...(kidneyProfile.diagnosisCauseOther
            ? [kidneyProfile.diagnosisCauseOther]
            : []),
        ]
        lines.push(`• 주 진단 원인: ${labels.join(", ")}`)
      }
      if (kidneyProfile.comorbidities?.length) {
        const labels = kidneyProfile.comorbidities.map(
          (key) =>
            COMORBIDITY_LABEL[key] ??
            COMORBIDITY_LABEL[key.toUpperCase()] ??
            key,
        )
        lines.push(`• 동반질환: ${labels.join(", ")}`)
      }
      lines.push("")
    }

    const analysis = todayAnalysis?.result
    if (analysis?.diets?.length) {
      const mealNames = analysis.diets.map(
        (d) => MEAL_LABELS[d.mealType] ?? d.mealType,
      )
      lines.push("🍽️ 오늘 식사 기록")
      lines.push(`• ${mealNames.join(", ")}`)
      lines.push("")
    }

    if (analysis?.analysis) {
      const a = analysis.analysis
      // 서버가 이미 proteinGPerKg × 체중을 계산해 준다. 여기서 다시 곱하면
      // 화면마다 다른 숫자가 나온다(예전에 실제로 세 가지가 있었다).
      const proteinLimit =
        nutrientLimits.proteinGDay != null
          ? Math.round(nutrientLimits.proteinGDay)
          : null
      lines.push("📊 오늘 영양소 섭취")
      lines.push(
        `• 단백질: ${a.protein.toFixed(1)}g${proteinLimit ? ` / ${proteinLimit}g` : ""}`,
      )
      lines.push(
        `• 나트륨: ${Math.round(a.sodium)}mg / ${nutrientLimits.sodiumMg}mg`,
      )
      lines.push(
        `• 칼륨: ${Math.round(a.potassium)}mg / ${nutrientLimits.potassiumMg}mg`,
      )
      lines.push(
        `• 인: ${Math.round(a.phosphorus)}mg / ${nutrientLimits.phosphorusMg}mg`,
      )
      lines.push(`• 수분: ${Math.round(a.water + a.extraWater)}ml`)
      if (a.cautionFoods?.length) {
        lines.push("")
        lines.push(`⚠️ 주의 식품: ${a.cautionFoods.join(", ")}`)
      }
      if (a.dietaryGuide) {
        lines.push("")
        lines.push(`💬 ${a.dietaryGuide}`)
      }
      lines.push("")
    }

    lines.push("신신당부 앱에서 건강을 관리하세요.")
    lines.push(`📲 다운로드: ${APP_DOWNLOAD_URL}`)

    try {
      await Share.share({
        title: "나의 신장 건강 데이터",
        message: lines.join("\n"),
      })
    } catch {
      Alert.alert("공유 실패", "데이터 공유 중 오류가 발생했습니다.")
    }
  }, [profile, kidneyProfile, todayAnalysis])

  const age = profile?.birthYear
    ? new Date().getFullYear() - profile.birthYear
    : null
  const genderLabel =
    profile?.gender === "MALE"
      ? "남"
      : profile?.gender === "FEMALE"
        ? "여"
        : null
  const ageGenderLabel = age
    ? genderLabel
      ? `${age}세·${genderLabel}`
      : `${age}세`
    : null

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <ThemedText style={[styles.headerTitle, { color: c.text }]}>
          마이페이지
        </ThemedText>
        <Pressable onPress={() => router.push("/(settings)")} hitSlop={8}>
          <Ionicons name="settings-outline" size={24} color={c.textSub} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: 20, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 프로필 행 */}
        <View style={styles.profileRow}>
          {profile?.profileImage ? (
            <Image
              source={{ uri: profile.profileImage }}
              style={[styles.avatar, styles.avatarImage]}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: c.avatarBg }]}>
              <Ionicons name="person" size={28} color={c.textTertiary} />
            </View>
          )}
          <View style={styles.profileInfo}>
            <ThemedText style={[styles.userName, { color: c.text }]}>
              {profile?.nickName ?? "사용자"}
            </ThemedText>
            {ageGenderLabel && (
              <View style={styles.infoLabel}>
                <ThemedText style={styles.infoLabelText}>
                  {ageGenderLabel}
                </ThemedText>
              </View>
            )}
          </View>
          <Pressable
            onPress={() => router.push("/(settings)/profile-edit")}
            style={[styles.editButton, { borderColor: c.border }]}
          >
            <ThemedText style={[styles.editButtonText, { color: c.textSub }]}>
              프로필 수정
            </ThemedText>
          </Pressable>
        </View>

        {/* 구분선 */}
        <View style={[styles.divider, { backgroundColor: c.divider }]} />

        {/* 신장 프로필 영역 */}
        {!kidneyProfile ? (
          <Pressable
            style={styles.kidneyEmptyButton}
            onPress={() => router.push("/(settings)/kidney-profile-edit")}
          >
            <Ionicons name="bar-chart-outline" size={18} color="#FFFFFF" />
            <ThemedText style={styles.kidneyEmptyButtonText}>
              신장 건강 정보를 입력해주세요
            </ThemedText>
          </Pressable>
        ) : (
          <KidneyProfileCard
            ckdStageLabel={kidneyProfile.ckdStageLabel}
            isDialysis={kidneyProfile.isDialysis}
            heightCm={kidneyProfile.heightCm}
            weightKg={kidneyProfile.weightKg}
            diagnosisDate={formatDiagnosisDate(kidneyProfile.diagnosisDate)}
            diagnosisCauses={kidneyProfile.diagnosisCauses}
            diagnosisCauseOther={kidneyProfile.diagnosisCauseOther}
            comorbidities={kidneyProfile.comorbidities}
            onEditPress={() => router.push("/(settings)/kidney-profile-edit")}
          />
        )}

        {/* 전체 너비 구분선 */}
        <View
          style={[styles.fullWidthDivider, { backgroundColor: c.secondaryBg }]}
        />

        {/* 메뉴 버튼 */}
        {[
          {
            icon: "medkit-outline" as const,
            title: "의사 연결하기",
            onPress: () => router.push("/(settings)/ask-doctor"),
          },
          {
            icon: "clipboard-outline" as const,
            title: "건강검진 데이터 불러오고 분석하기",
            onPress: () => router.push("/(settings)/health-data"),
          },
          {
            icon: "share-outline" as const,
            title: "나의 데이터 공유하기",
            onPress: handleShareData,
          },
          {
            icon: "megaphone-outline" as const,
            title: "공지사항",
            onPress: () => router.push("/(settings)/announcements"),
          },
          {
            icon: "chatbubble-outline" as const,
            title: "1:1 문의",
            onPress: () => router.push("/(settings)/inquiry"),
          },
          {
            icon: "book-outline" as const,
            title: "의료 참고 문헌",
            onPress: () => router.push("/(settings)/medical-reference"),
          },
        ].map(({ icon, title, onPress }) => (
          <Pressable
            key={title}
            style={({ pressed }) => [
              styles.navButton,
              pressed && [
                styles.navButtonPressed,
                { backgroundColor: c.pressedBg },
              ],
            ]}
            onPress={onPress}
          >
            <Ionicons name={icon} size={24} color={c.icon} />
            <ThemedText style={[styles.navButtonText, { color: c.text }]}>
              {title}
            </ThemedText>
            <Ionicons name="chevron-forward" size={20} color={c.iconLight} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
    marginBottom: 20,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    overflow: "hidden",
  },
  profileInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  userName: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "700",
  },
  infoLabel: {
    backgroundColor: "#FE713929",
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  infoLabelText: {
    fontSize: 13,
    color: "#2E7D6B",
    fontWeight: "500",
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    marginBottom: 20,
  },
  kidneyEmptyButton: {
    height: 56,
    backgroundColor: tokens.color.sub6.val,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
  },
  kidneyEmptyButtonText: {
    flex: 1,
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  fullWidthDivider: {
    height: 12,
    marginHorizontal: -20,
    marginBottom: 4,
  },
  navButton: {
    height: 64,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  navButtonPressed: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  navButtonText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
  },
})
