import React, { useState } from "react"
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Linking,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"

// ─────────────────────────────────────────────
// 데이터 타입 정의
// ─────────────────────────────────────────────

type BadgeType = "new" | "kdigo" | "pdf"

export interface ReferenceItem {
  id: string
  title: string
  meta: string
  badge: BadgeType
  iconColor: "teal" | "blue" | "orange" | "purple"
  url?: string
}

export interface ReferenceSection {
  id: string
  header: string
  items: ReferenceItem[]
}

// ─────────────────────────────────────────────
// 콘텐츠 데이터
// ─────────────────────────────────────────────

const REFERENCE_SECTIONS: ReferenceSection[] = [
  {
    id: "guidelines",
    header: "진료지침",
    items: [
      {
        id: "g1",
        title: "고혈압콩팥병 진료지침",
        meta: "대한신장학회 · 2025.07",
        badge: "new",
        iconColor: "teal",
        url: "https://ksn.or.kr/bbs/?code=g_guideline",
      },
      {
        id: "g2",
        title: "노인 만성콩팥병 진료지침",
        meta: "대한신장학회 · 2026.01",
        badge: "new",
        iconColor: "teal",
        url: "https://ksn.or.kr/bbs/?code=g_guideline",
      },
      {
        id: "g3",
        title: "당뇨병콩팥병 진료지침",
        meta: "대한신장학회 · 2024.12",
        badge: "pdf",
        iconColor: "teal",
        url: "https://ksn.or.kr/bbs/?code=g_guideline",
      },
      {
        id: "g4",
        title: "지속가능신장치료 (CKRT) 진료지침",
        meta: "대한신장학회 · 2023",
        badge: "pdf",
        iconColor: "teal",
        url: "https://ksn.or.kr/bbs/?code=g_guideline",
      },
      {
        id: "g5",
        title: "신장학 용어집",
        meta: "대한신장학회 · 2024.07",
        badge: "pdf",
        iconColor: "teal",
        url: "https://ksn.or.kr/bbs/?code=g_guideline",
      },
    ],
  },
  {
    id: "international",
    header: "국제 가이드라인",
    items: [
      {
        id: "i1",
        title: "KDIGO Guidelines",
        meta: "KDIGO · 영문",
        badge: "kdigo",
        iconColor: "purple",
        url: "https://kdigo.org/guidelines/",
      },
    ],
  },
  {
    id: "patient",
    header: "환자 교육 자료 / 용어집 / 복지 정보",
    items: [
      {
        id: "p1",
        title: "투석 전 단계 만성콩팥병 영양·식생활 관리",
        meta: "대한신장학회 · 1권 환자용",
        badge: "pdf",
        iconColor: "blue",
        url: "https://ksn.or.kr/general/ebook/",
      },
      {
        id: "p2",
        title: "혈액투석 환자를 위한 영양·식생활 관리",
        meta: "대한신장학회 · 2권 환자용",
        badge: "pdf",
        iconColor: "blue",
        url: "https://ksn.or.kr/general/ebook/",
      },
      {
        id: "p3",
        title: "복막투석 환자를 위한 영양·식생활 관리",
        meta: "대한신장학회 · 3권 환자용",
        badge: "pdf",
        iconColor: "blue",
        url: "https://ksn.or.kr/general/ebook/",
      },
      {
        id: "p4",
        title: "소아청소년 만성콩팥병 바로알기",
        meta: "대한신장학회 · 보호자·환아용",
        badge: "pdf",
        iconColor: "blue",
        url: "https://ksn.or.kr/general/ebook/",
      },
      {
        id: "p5",
        title: "만성콩팥병 바로알기 (당뇨병·고혈압 환자편)",
        meta: "대한신장학회 · 일반인용",
        badge: "pdf",
        iconColor: "blue",
        url: "https://ksn.or.kr/general/ebook/",
      },
      {
        id: "p6",
        title: "만성콩팥병 바로알기 (건강한 성인편)",
        meta: "대한신장학회 · 일반인용",
        badge: "pdf",
        iconColor: "blue",
        url: "https://ksn.or.kr/general/ebook/",
      },
      {
        id: "p7",
        title: "만성콩팥병 환자 복지 정보",
        meta: "대한신장학회 · 2023년도 개정판",
        badge: "pdf",
        iconColor: "blue",
        url: "https://ksn.or.kr/general/ebook/",
      },
    ],
  },
]

const LAST_UPDATED = "2026.03.01"

// ─────────────────────────────────────────────
// 서브 컴포넌트
// ─────────────────────────────────────────────

const ICON_BG: Record<ReferenceItem["iconColor"], string> = {
  teal: "#E0FFF7",
  blue: "#E8F0FB",
  orange: "#FFF0E0",
  purple: "#F0EEFF",
}

const ICON_STROKE: Record<ReferenceItem["iconColor"], string> = {
  teal: "#44AF94",
  blue: "#1E6FBF",
  orange: "#C47A1A",
  purple: "#7C5CBF",
}

const BADGE_STYLE: Record<
  BadgeType,
  { bg: string; color: string; label: string }
> = {
  new: { bg: "#E0FFF7", color: "#028A67", label: "최신" },
  kdigo: { bg: "#F0EEFF", color: "#7C5CBF", label: "KDIGO" },
  pdf: { bg: "#F0F2F5", color: "#64748B", label: "PDF" },
}

function ItemIcon({ color }: { color: ReferenceItem["iconColor"] }) {
  return (
    <View style={[styles.itemIcon, { backgroundColor: ICON_BG[color] }]}>
      <View
        style={[styles.iconBar1, { backgroundColor: ICON_STROKE[color] }]}
      />
      <View
        style={[styles.iconBar2, { backgroundColor: ICON_STROKE[color] }]}
      />
      <View
        style={[styles.iconBar3, { backgroundColor: ICON_STROKE[color] }]}
      />
    </View>
  )
}

function Badge({ type }: { type: BadgeType }) {
  const { bg, color, label } = BADGE_STYLE[type]
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <ThemedText style={[styles.badgeText, { color }]}>{label}</ThemedText>
    </View>
  )
}

function ReferenceRow({ item }: { item: ReferenceItem }) {
  const handlePress = () => {
    if (item.url) Linking.openURL(item.url)
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.listItem,
        pressed && styles.listItemPressed,
      ]}
      onPress={handlePress}
    >
      <ItemIcon color={item.iconColor} />
      <View style={styles.itemBody}>
        <ThemedText style={styles.itemTitle} numberOfLines={2}>
          {item.title}
        </ThemedText>
        <ThemedText style={styles.itemMeta}>{item.meta}</ThemedText>
      </View>
      <View style={styles.itemRight}>
        <Badge type={item.badge} />
        <Ionicons name="chevron-forward" size={16} color="#C5C8CE" />
      </View>
    </Pressable>
  )
}

function SectionGroup({ section }: { section: ReferenceSection }) {
  return (
    <>
      <ThemedText style={styles.sectionHeader}>{section.header}</ThemedText>
      <View style={styles.listGroup}>
        {section.items.map((item, index) => (
          <View key={item.id}>
            <ReferenceRow item={item} />
            {index < section.items.length - 1 && (
              <View style={styles.divider} />
            )}
          </View>
        ))}
      </View>
    </>
  )
}

// ─────────────────────────────────────────────
// 메인 스크린
// ─────────────────────────────────────────────

export function MedicalReferenceScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  const filteredSections: ReferenceSection[] = REFERENCE_SECTIONS.map(
    (section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.title.includes(searchQuery) || item.meta.includes(searchQuery),
      ),
    }),
  ).filter((section) => section.items.length > 0)

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title="의료 참고 문헌"
        paddingTop={insets.top + 8}
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 안내 배너 */}
        <View style={styles.infoBanner}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color="#44AF94"
            />
          </View>
          <View style={styles.infoTextWrap}>
            <ThemedText style={styles.infoTitle}>
              근거 기반 의료 정보 제공
            </ThemedText>
            <ThemedText style={styles.infoDesc}>
              이 앱의 모든 영양·의료 권고사항은 아래 공인 학회 지침 및
              진료지침을 기반으로 합니다. 개인 치료 결정은 반드시 담당 의료진과
              상의하세요.
            </ThemedText>
          </View>
        </View>

        {/* 검색바 */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="문헌 검색"
            placeholderTextColor="#C5C8CE"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {/* 섹션 목록 */}
        {filteredSections.length > 0 ? (
          filteredSections.map((section) => (
            <SectionGroup key={section.id} section={section} />
          ))
        ) : (
          <ThemedText style={styles.emptyText}>
            검색 결과가 없습니다.
          </ThemedText>
        )}

        {/* 업데이트 안내 */}
        <View style={styles.updateNotice}>
          <View style={styles.updateDot} />
          <ThemedText style={styles.updateText}>
            <ThemedText style={styles.updateBold}>
              문헌은 최신 학회 발표 기준으로 업데이트
            </ThemedText>
            됩니다. 마지막 갱신: {LAST_UPDATED}
          </ThemedText>
        </View>

        {/* 면책 문구 */}
        <View style={styles.disclaimer}>
          <ThemedText style={styles.disclaimerText}>
            이 앱의 정보는 의학적 진단이나 치료를 대체하지 않습니다.{"\n"}
            구체적인 치료 계획은 반드시 담당 의료진과 상의하세요.
          </ThemedText>
          <View style={styles.disclaimerLinks}>
            <Pressable
              onPress={() =>
                Linking.openURL(
                  "https://healthier.notion.site/2fe91d1eca7780a7877cfd2692b4be3f",
                )
              }
            >
              <ThemedText style={styles.disclaimerLink}>
                개인정보 처리방침
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  )
}

// ─────────────────────────────────────────────
// 스타일
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  // 스크롤
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // 안내 배너
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#E0FFF7",
    alignItems: "center",
    justifyContent: "center",
  },
  infoTextWrap: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#17191C",
    marginBottom: 4,
  },
  infoDesc: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },

  // 검색바
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#17191C",
    padding: 0,
  },

  // 섹션
  sectionHeader: {
    paddingTop: 20,
    paddingBottom: 8,
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
    letterSpacing: 0.3,
  },
  listGroup: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    overflow: "hidden",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  listItemPressed: {
    backgroundColor: "#F0F2F5",
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F2F5",
    marginLeft: 60,
  },

  // 아이템 아이콘
  itemIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    padding: 8,
  },
  iconBar1: { width: 14, height: 2, borderRadius: 1 },
  iconBar2: { width: 10, height: 2, borderRadius: 1 },
  iconBar3: { width: 8, height: 2, borderRadius: 1 },

  // 아이템 본문
  itemBody: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#17191C",
    lineHeight: 20,
  },
  itemMeta: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  // 뱃지
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },

  // 빈 결과
  emptyText: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 14,
    marginTop: 40,
  },

  // 업데이트 안내
  updateNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 14,
  },
  updateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#44AF94",
  },
  updateText: {
    flex: 1,
    fontSize: 12,
    color: "#64748B",
    lineHeight: 17,
  },
  updateBold: {
    fontSize: 14,
    fontWeight: "600",
    color: "#17191C",
  },

  // 면책 문구
  disclaimer: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  disclaimerText: {
    fontSize: 12,
    color: "#94A3B8",
    lineHeight: 17,
    textAlign: "center",
  },
  disclaimerLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  disclaimerLink: {
    fontSize: 12,
    color: "#44AF94",
  },
  disclaimerSep: {
    fontSize: 12,
    color: "#94A3B8",
  },
})
