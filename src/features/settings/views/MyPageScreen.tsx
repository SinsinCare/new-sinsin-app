import React, { useCallback } from "react"
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Share,
  Image,
} from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import Constants from "expo-constants"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppRouter } from "@/src/shared/navigation"
import { useFocusEffect } from "@react-navigation/native"
import { useTranslation } from "react-i18next"

import { KidneyProfileCard } from "@/src/features/settings/components"
import { useKidneyProfile } from "@/src/features/settings/hooks/useKidneyProfile"
import { useMyPageProfile } from "@/src/features/settings/hooks/useMyPageProfile"
import { useDateAnalysis } from "@/src/features/home/hooks/useDateAnalysis"
import { useNutrientLimits } from "@/src/features/nutrition/hooks/useNutrientLimits"
import { useSurface } from "@/src/hooks/useSurface"
import { hapticSelection } from "@/src/lib/haptics"
import { formatDiagnosisDate } from "@/src/shared/utils/diagnosisDate"

import { showErrorToast, showInfoToast } from "@/src/lib/toast"
const APP_DOWNLOAD_URL =
  "https://apps.apple.com/us/app/%EC%8B%A0%EC%8B%A0%EB%8B%B9%EB%B6%80/id6758880186"

interface MenuItem {
  icon: React.ComponentProps<typeof Ionicons>["name"]
  title: string
  onPress: () => void
}

function MenuRow({
  item,
  isLast,
  surface,
}: {
  item: MenuItem
  isLast: boolean
  surface: ReturnType<typeof useSurface>
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.title}
      onPress={() => {
        hapticSelection()
        item.onPress()
      }}
      style={({ pressed }) => [
        styles.menuRow,
        pressed && { backgroundColor: surface.surfacePressed },
      ]}
    >
      <View style={[styles.menuIconTile, { backgroundColor: surface.surface }]}>
        <Ionicons name={item.icon} size={18} color={surface.textMuted} />
      </View>
      <Text
        style={[styles.menuTitle, { color: surface.textStrong }]}
        numberOfLines={1}
      >
        {item.title}
      </Text>
      <Ionicons name="chevron-forward" size={15} color={surface.textWeak} />
      {!isLast && (
        <View
          style={[styles.rowHairline, { backgroundColor: surface.hairline }]}
        />
      )}
    </Pressable>
  )
}

export function MyPageScreen() {
  const { t, i18n } = useTranslation("common")
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
  const surface = useSurface()
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
      showInfoToast(t("myPage.share.emptyTitle"), t("myPage.share.emptyBody"))
      return
    }

    const today = new Date()
    const currentLanguage = i18n.resolvedLanguage ?? i18n.language
    const dateLabel = new Intl.DateTimeFormat(
      currentLanguage.startsWith("en") ? "en-US" : "ko-KR",
      { year: "numeric", month: "long", day: "numeric" },
    ).format(today)

    const lines: string[] = [
      t("myPage.share.titleLine", {
        name: profile?.nickName ?? t("myPage.userFallback"),
      }),
      t("myPage.share.asOf", { date: dateLabel }),
      "",
    ]

    if (kidneyProfile) {
      lines.push(t("myPage.share.kidneyProfile"))
      if (kidneyProfile.isDialysis) {
        lines.push(`• ${t("myPage.share.onDialysis")}`)
      } else {
        const stageCode = kidneyProfile.ckdStage
          ?.match(/^STAGE_(\d[A-B]?)$/i)?.[1]
          ?.toLowerCase()
        const stageLabel = currentLanguage.startsWith("en")
          ? stageCode
            ? t("kidneyProfile.stageValue", { stage: stageCode })
            : t("myPage.share.stageNotRecorded")
          : (kidneyProfile.ckdStageLabel ?? t("myPage.share.stageNotRecorded"))
        lines.push(`• ${stageLabel}`)
      }
      if (kidneyProfile.heightCm) {
        lines.push(
          `• ${t("myPage.share.height")}: ${kidneyProfile.heightCm} cm`,
        )
      }
      if (kidneyProfile.weightKg) {
        lines.push(
          `• ${t("myPage.share.weight")}: ${kidneyProfile.weightKg} kg`,
        )
      }
      if (
        kidneyProfile.diagnosisCauses?.length ||
        kidneyProfile.diagnosisCauseOther
      ) {
        const labels = [
          ...(kidneyProfile.diagnosisCauses ?? []).map((key) =>
            t(`medical.diagnosisCause.${key.toUpperCase()}`, key),
          ),
          ...(kidneyProfile.diagnosisCauseOther
            ? [kidneyProfile.diagnosisCauseOther]
            : []),
        ]
        lines.push(`• ${t("myPage.share.primaryCause")}: ${labels.join(", ")}`)
      }
      if (kidneyProfile.comorbidities?.length) {
        const labels = kidneyProfile.comorbidities.map((key) =>
          t(`medical.comorbidity.${key.toUpperCase()}`, key),
        )
        lines.push(
          `• ${t("myPage.share.otherConditions")}: ${labels.join(", ")}`,
        )
      }
      lines.push("")
    }

    const analysis = todayAnalysis?.result
    if (analysis?.diets?.length) {
      const mealNames = analysis.diets.map((d) =>
        t(`meal.${d.mealType}`, d.mealType),
      )
      lines.push(t("myPage.share.todaysMeals"))
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
      const limitText = (value: number | null, unit: string) =>
        value != null
          ? ` / ${value}${unit}`
          : ` · ${t("myPage.share.limitUnknown")}`
      lines.push(t("myPage.share.todaysNutrients"))
      lines.push(
        `• ${t("nutrient.protein")}: ${a.protein.toFixed(1)}g${limitText(proteinLimit, "g")}`,
      )
      lines.push(
        `• ${t("nutrient.sodium")}: ${Math.round(a.sodium)}mg${limitText(nutrientLimits.sodiumMg, "mg")}`,
      )
      lines.push(
        `• ${t("nutrient.potassium")}: ${Math.round(a.potassium)}mg${limitText(nutrientLimits.potassiumMg, "mg")}`,
      )
      lines.push(
        `• ${t("nutrient.phosphorus")}: ${Math.round(a.phosphorus)}mg${limitText(nutrientLimits.phosphorusMg, "mg")}`,
      )
      lines.push(
        `• ${t("nutrient.fluids")}: ${Math.round(
          a.water + a.extraWater,
        ).toLocaleString(
          currentLanguage.startsWith("en") ? "en-US" : "ko-KR",
        )} mL`,
      )
      if (a.cautionFoods?.length) {
        lines.push("")
        lines.push(
          `⚠️ ${t("myPage.share.foodsToWatch")}: ${a.cautionFoods.join(", ")}`,
        )
      }
      if (a.dietaryGuide) {
        lines.push("")
        lines.push(`💬 ${a.dietaryGuide}`)
      }
      lines.push("")
    }

    lines.push(t("myPage.share.footer"))
    lines.push(`📲 ${t("myPage.share.download")}: ${APP_DOWNLOAD_URL}`)

    try {
      await Share.share({
        title: t("myPage.share.sheetTitle"),
        message: lines.join("\n"),
      })
    } catch {
      showErrorToast(t("myPage.share.errorTitle"), t("myPage.share.errorBody"))
    }
  }, [
    profile,
    kidneyProfile,
    todayAnalysis,
    nutrientLimits,
    t,
    i18n.language,
    i18n.resolvedLanguage,
  ])

  const age = profile?.birthYear
    ? new Date().getFullYear() - profile.birthYear
    : null
  const genderLabel =
    profile?.gender === "MALE"
      ? t("profile.gender.male")
      : profile?.gender === "FEMALE"
        ? t("profile.gender.female")
        : null
  const profileSub =
    [age ? t("profile.age", { age }) : null, genderLabel]
      .filter(Boolean)
      .join(" · ") || null

  const healthMenu: MenuItem[] = [
    {
      icon: "medkit-outline",
      title: t("myPage.menu.doctor"),
      // 연결된 기관 목록이 이 기능의 홈이다. 비어 있으면 그 화면이 온보딩으로 안내한다.
      // (옛 `/(settings)/ask-doctor` 는 초대코드 경로라 남겨 두되 여기서 열지 않는다.)
      onPress: () => router.push("/(settings)/doctor-connections"),
    },
    {
      icon: "clipboard-outline",
      title: t("myPage.menu.healthData"),
      // 목록이 진입점이다 — 불러온 검진이 없으면 목록 화면이 본인인증으로 보낸다.
      // 매번 인증 폼부터 열면 이미 불러온 사람에게 군더더기다.
      onPress: () => router.push("/(settings)/checkup-list"),
    },
    {
      icon: "share-outline",
      /**
       * 라벨이 "공유" 에서 "내보내기" 로 바뀌었다.
       *
       * 이건 OS 공유 시트로 요약 텍스트를 **아무 앱에나** 내보내는 동작이지, 담당 의사와
       * 공유하는 것이 아니다. 바로 위 행("의사 연결하고 데이터 공유하기")이 진짜 공유
       * 기능이 되면서 두 행이 같은 의미로 읽히게 됐다 — 수신자도 범위도 감사 기록도 없는
       * 쪽이 "공유" 를 차지하고 있으면 사용자가 잘못 고른다.
       */
      title: t("myPage.menu.share"),
      onPress: handleShareData,
    },
  ]

  const supportMenu: MenuItem[] = [
    {
      icon: "megaphone-outline",
      title: t("myPage.menu.announcements"),
      onPress: () => router.push("/(settings)/announcements"),
    },
    {
      icon: "chatbubble-outline",
      title: t("myPage.menu.inquiry"),
      onPress: () => router.push("/(settings)/inquiry"),
    },
    {
      icon: "book-outline",
      title: t("myPage.menu.references"),
      onPress: () => router.push("/(settings)/medical-reference"),
    },
  ]

  // 층 규칙: 라이트는 회색 바닥 위 흰 카드, 다크는 짙은 바닥 위 옅은 카드.
  const screenBg = surface.isDark ? surface.canvas : surface.surface
  const appVersion = Constants.expoConfig?.version

  return (
    <View style={[styles.container, { backgroundColor: screenBg }]}>
      {/* 헤더 — 탭 이름과 같은 "전체". */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.headerTitle, { color: surface.textStrong }]}>
          {t("myPage.title")}
        </Text>
        <Pressable
          onPress={() => router.push("/(settings)")}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("myPage.openSettings")}
        >
          {({ pressed }) => (
            <Ionicons
              name="settings-outline"
              size={22}
              color={surface.textMuted}
              style={{ opacity: pressed ? 0.5 : 1 }}
            />
          )}
        </Pressable>
      </View>

      <ScrollView
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 112 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 프로필 카드 — 카드 전체가 프로필 수정 진입점. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("myPage.editProfile")}
          onPress={() => {
            hapticSelection()
            router.push("/(settings)/profile-edit")
          }}
          style={({ pressed }) => [
            styles.profileCard,
            {
              backgroundColor: pressed ? surface.surfacePressed : surface.card,
            },
          ]}
        >
          {profile?.profileImage ? (
            <Image
              source={{ uri: profile.profileImage }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: surface.surface }]}>
              <Ionicons name="person" size={24} color={surface.textWeak} />
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text
              style={[styles.userName, { color: surface.textStrong }]}
              numberOfLines={1}
            >
              {profile?.nickName ?? t("myPage.userFallback")}
            </Text>
            <Text style={[styles.profileSub, { color: surface.textMuted }]}>
              {profileSub
                ? `${profileSub} · ${t("myPage.editProfile")}`
                : t("myPage.editProfile")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={surface.textWeak} />
        </Pressable>

        {/* 신장 프로필 */}
        <Text style={[styles.sectionHeader, { color: surface.textMuted }]}>
          {t("myPage.kidneyHealth")}
        </Text>
        {!kidneyProfile ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("myPage.addKidneyProfile")}
            onPress={() => {
              hapticSelection()
              router.push("/(settings)/kidney-profile-edit")
            }}
            style={({ pressed }) => [
              styles.kidneyEmptyCard,
              {
                backgroundColor: surface.surfaceBrand,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Ionicons name="pulse" size={18} color={surface.brand} />
            <Text
              style={[styles.kidneyEmptyText, { color: surface.brand }]}
              lineBreakStrategyIOS="hangul-word"
              textBreakStrategy="balanced"
            >
              {t("myPage.addKidneyProfile")}
            </Text>
            <Ionicons name="chevron-forward" size={15} color={surface.brand} />
          </Pressable>
        ) : (
          <KidneyProfileCard
            ckdStage={kidneyProfile.ckdStage}
            ckdStageLabel={kidneyProfile.ckdStageLabel}
            isDialysis={kidneyProfile.isDialysis}
            heightCm={kidneyProfile.heightCm}
            weightKg={kidneyProfile.weightKg}
            diagnosisDate={formatDiagnosisDate(
              kidneyProfile.diagnosisDate,
              i18n.resolvedLanguage ?? i18n.language,
            )}
            diagnosisTiming={kidneyProfile.diagnosisTiming}
            diagnosisCauses={kidneyProfile.diagnosisCauses}
            diagnosisCauseOther={kidneyProfile.diagnosisCauseOther}
            comorbidities={kidneyProfile.comorbidities}
            onEditPress={() => router.push("/(settings)/kidney-profile-edit")}
          />
        )}

        {/* 메뉴 — 헤어라인으로만 나눈 카드 그룹. */}
        <Text style={[styles.sectionHeader, { color: surface.textMuted }]}>
          {t("myPage.healthManagement")}
        </Text>
        <View style={[styles.menuGroup, { backgroundColor: surface.card }]}>
          {healthMenu.map((item, index) => (
            <MenuRow
              key={item.title}
              item={item}
              isLast={index === healthMenu.length - 1}
              surface={surface}
            />
          ))}
        </View>

        <Text style={[styles.sectionHeader, { color: surface.textMuted }]}>
          {t("myPage.support")}
        </Text>
        <View style={[styles.menuGroup, { backgroundColor: surface.card }]}>
          {supportMenu.map((item, index) => (
            <MenuRow
              key={item.title}
              item={item}
              isLast={index === supportMenu.length - 1}
              surface={surface}
            />
          ))}
        </View>

        {/* 푸터 — 버전 캡션 하나만 조용히. */}
        {appVersion && (
          <Text style={[styles.versionText, { color: surface.placeholder }]}>
            {t("brand.name")} {appVersion}
          </Text>
        )}
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
    lineHeight: 30,
    letterSpacing: -0.44,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    padding: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileInfo: {
    flex: 1,
    gap: 3,
  },
  userName: {
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.36,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },
  profileSub: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.26,
    fontFamily: "Pretendard-Regular",
  },

  sectionHeader: {
    paddingTop: 24,
    paddingBottom: 10,
    fontSize: 13.5,
    lineHeight: 19,
    letterSpacing: -0.27,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },
  kidneyEmptyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  kidneyEmptyText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.3,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },

  menuGroup: {
    borderRadius: 16,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuIconTile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.3,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },
  rowHairline: {
    position: "absolute",
    left: 64,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },

  versionText: {
    marginTop: 32,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: -0.24,
    fontFamily: "Pretendard-Regular",
  },
})
