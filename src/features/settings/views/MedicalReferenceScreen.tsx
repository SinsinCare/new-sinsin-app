import React, { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Linking,
} from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppRouter } from "@/src/shared/navigation"
import { useTranslation } from "react-i18next"

import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { useSurface } from "@/src/hooks/useSurface"

// -----------------------------------------
// 데이터 타입 정의
// -----------------------------------------

type BadgeType = "new" | "kdigo" | "pdf"

export interface ReferenceItem {
  id: string
  title: string
  meta: string
  badge: BadgeType
  url?: string
}

export interface ReferenceSection {
  id: string
  header: string
  items: ReferenceItem[]
}

const REFERENCE_SECTIONS = [
  {
    id: "guidelines",
    items: [
      {
        id: "g1",
        badge: "new",
        url: "https://ksn.or.kr/bbs/?code=g_guideline",
      },
      {
        id: "g2",
        badge: "new",
        url: "https://ksn.or.kr/bbs/?code=g_guideline",
      },
      {
        id: "g3",
        badge: "pdf",
        url: "https://ksn.or.kr/bbs/?code=g_guideline",
      },
      {
        id: "g4",
        badge: "pdf",
        url: "https://ksn.or.kr/bbs/?code=g_guideline",
      },
      {
        id: "g5",
        badge: "pdf",
        url: "https://ksn.or.kr/bbs/?code=g_guideline",
      },
    ],
  },
  {
    id: "international",
    items: [
      {
        id: "i1",
        badge: "kdigo",
        url: "https://kdigo.org/guidelines/",
      },
    ],
  },
  {
    id: "patient",
    items: [
      {
        id: "p1",
        badge: "pdf",
        url: "https://ksn.or.kr/general/ebook/",
      },
      {
        id: "p2",
        badge: "pdf",
        url: "https://ksn.or.kr/general/ebook/",
      },
      {
        id: "p3",
        badge: "pdf",
        url: "https://ksn.or.kr/general/ebook/",
      },
      {
        id: "p4",
        badge: "pdf",
        url: "https://ksn.or.kr/general/ebook/",
      },
      {
        id: "p5",
        badge: "pdf",
        url: "https://ksn.or.kr/general/ebook/",
      },
      {
        id: "p6",
        badge: "pdf",
        url: "https://ksn.or.kr/general/ebook/",
      },
      {
        id: "p7",
        badge: "pdf",
        url: "https://ksn.or.kr/general/ebook/",
      },
    ],
  },
] as const

const LAST_UPDATED = "2026.03.01"

const SECTION_HEADER_KEYS = {
  guidelines: "medical.sections.guidelines",
  international: "medical.sections.international",
  patient: "medical.sections.patient",
} as const

const ITEM_TEXT_KEYS = {
  g1: { title: "medical.items.g1.title", meta: "medical.items.g1.meta" },
  g2: { title: "medical.items.g2.title", meta: "medical.items.g2.meta" },
  g3: { title: "medical.items.g3.title", meta: "medical.items.g3.meta" },
  g4: { title: "medical.items.g4.title", meta: "medical.items.g4.meta" },
  g5: { title: "medical.items.g5.title", meta: "medical.items.g5.meta" },
  i1: { title: "medical.items.i1.title", meta: "medical.items.i1.meta" },
  p1: { title: "medical.items.p1.title", meta: "medical.items.p1.meta" },
  p2: { title: "medical.items.p2.title", meta: "medical.items.p2.meta" },
  p3: { title: "medical.items.p3.title", meta: "medical.items.p3.meta" },
  p4: { title: "medical.items.p4.title", meta: "medical.items.p4.meta" },
  p5: { title: "medical.items.p5.title", meta: "medical.items.p5.meta" },
  p6: { title: "medical.items.p6.title", meta: "medical.items.p6.meta" },
  p7: { title: "medical.items.p7.title", meta: "medical.items.p7.meta" },
} as const

const BADGE_LABEL_KEYS: Record<BadgeType, `medical.badge.${BadgeType}`> = {
  new: "medical.badge.new",
  kdigo: "medical.badge.kdigo",
  pdf: "medical.badge.pdf",
}

// -----------------------------------------
// 서브 컴포넌트 — 서피스 시스템 문법.
// 색 아이콘·보더 대신 회색 면과 글자 위계로만 말하고,
// 포인트(브랜드 틴트)는 "최신" 배지 하나에만 준다.
// -----------------------------------------

function DocIcon({ barColor, tileBg }: { barColor: string; tileBg: string }) {
  return (
    <View style={[styles.itemIcon, { backgroundColor: tileBg }]}>
      <View
        style={[styles.iconBar, { width: 14, backgroundColor: barColor }]}
      />
      <View
        style={[styles.iconBar, { width: 10, backgroundColor: barColor }]}
      />
      <View
        style={[styles.iconBar, { width: 12, backgroundColor: barColor }]}
      />
    </View>
  )
}

function ReferenceRow({
  item,
  isLast,
  surface,
}: {
  item: ReferenceItem
  isLast: boolean
  surface: ReturnType<typeof useSurface>
}) {
  const isNew = item.badge === "new"
  const { t } = useTranslation("settings")
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("medical.open", { title: item.title })}
      onPress={() => {
        if (item.url) Linking.openURL(item.url)
      }}
      style={({ pressed }) => [
        styles.listItem,
        pressed && { backgroundColor: surface.surfacePressed },
      ]}
    >
      <DocIcon barColor={surface.textWeak} tileBg={surface.surface} />
      <View style={styles.itemBody}>
        <Text
          style={[styles.itemTitle, { color: surface.textStrong }]}
          numberOfLines={2}
          // 한국어가 단어 중간("관/리")에서 꺾이지 않게 어절 단위로 줄바꿈한다.
          lineBreakStrategyIOS="hangul-word"
          textBreakStrategy="balanced"
        >
          {item.title}
        </Text>
        <Text style={[styles.itemMeta, { color: surface.textMuted }]}>
          {item.meta}
        </Text>
      </View>
      <View style={styles.itemRight}>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: isNew ? surface.surfaceBrand : surface.surface,
            },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: isNew ? surface.brand : surface.textMuted },
            ]}
          >
            {t(BADGE_LABEL_KEYS[item.badge])}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={15} color={surface.textWeak} />
      </View>
      {!isLast && (
        <View
          style={[styles.rowHairline, { backgroundColor: surface.hairline }]}
        />
      )}
    </Pressable>
  )
}

// -----------------------------------------
// 메인 스크린
// -----------------------------------------

export function MedicalReferenceScreen() {
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
  const surface = useSurface()
  const { t } = useTranslation("settings")
  const [searchQuery, setSearchQuery] = useState("")

  const localizedSections: ReferenceSection[] = REFERENCE_SECTIONS.map(
    (section) => ({
      ...section,
      header: t(SECTION_HEADER_KEYS[section.id]),
      items: section.items.map((item) => ({
        ...item,
        title: t(ITEM_TEXT_KEYS[item.id].title),
        meta: t(ITEM_TEXT_KEYS[item.id].meta),
      })),
    }),
  )

  const filteredSections = localizedSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.title
            .toLocaleLowerCase()
            .includes(searchQuery.toLocaleLowerCase()) ||
          item.meta
            .toLocaleLowerCase()
            .includes(searchQuery.toLocaleLowerCase()),
      ),
    }))
    .filter((section) => section.items.length > 0)

  // 홈과 같은 층 규칙: 라이트는 회색 바닥 위 흰 카드, 다크는 짙은 바닥 위 옅은 카드.
  const screenBg = surface.isDark ? surface.canvas : surface.surface
  const fieldBg = surface.isDark ? surface.surface : surface.card

  return (
    <View style={[styles.container, { backgroundColor: screenBg }]}>
      <ScreenHeader
        title={t("medical.title")}
        paddingTop={insets.top + 8}
        onBack={() => router.back()}
      />

      <ScrollView
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 리드 문장 — 카드 없이 조용한 본문 한 단락. */}
        <Text
          style={[styles.lead, { color: surface.textMuted }]}
          lineBreakStrategyIOS="hangul-word"
          textBreakStrategy="balanced"
        >
          {t("medical.lead")}
        </Text>

        {/* 검색 필드 — 보더 없는 흰 면. */}
        <View style={[styles.searchBar, { backgroundColor: fieldBg }]}>
          <Ionicons name="search" size={17} color={surface.textWeak} />
          <TextInput
            style={[styles.searchInput, { color: surface.textStrong }]}
            placeholder={t("medical.search")}
            placeholderTextColor={surface.placeholder}
            selectionColor={surface.brand}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {/* 섹션 목록 — 헤어라인으로만 나눈 카드 그룹. */}
        {filteredSections.length > 0 ? (
          filteredSections.map((section) => (
            <View key={section.id}>
              <Text
                style={[styles.sectionHeader, { color: surface.textMuted }]}
              >
                {section.header}
              </Text>
              <View
                style={[styles.listGroup, { backgroundColor: surface.card }]}
              >
                {section.items.map((item, index) => (
                  <ReferenceRow
                    key={item.id}
                    item={item}
                    isLast={index === section.items.length - 1}
                    surface={surface}
                  />
                ))}
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: surface.textMuted }]}>
            {t("medical.empty")}
          </Text>
        )}

        {/* 갱신·면책 — 하나의 푸터 스택. 카드도 보더도 없이 가운데 정렬 캡션 위계. */}
        <View style={styles.footer}>
          <Text
            style={[styles.updateText, { color: surface.placeholder }]}
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
          >
            {t("medical.lastChecked", { date: LAST_UPDATED })}
          </Text>
          <View
            style={[
              styles.footerDivider,
              { backgroundColor: surface.hairline },
            ]}
          />
          <Text
            style={[styles.disclaimerText, { color: surface.placeholder }]}
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
          >
            {t("medical.disclaimer")}
          </Text>
          <Pressable
            onPress={() =>
              Linking.openURL(
                "https://healthier.notion.site/2fe91d1eca7780a7877cfd2692b4be3f",
              )
            }
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("medical.privacyAccessibility")}
          >
            {({ pressed }) => (
              <Text
                style={[
                  styles.footerLink,
                  { color: surface.textMuted, opacity: pressed ? 0.5 : 1 },
                ]}
              >
                {t("medical.privacy")}
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  )
}

// -----------------------------------------
// 스타일
// -----------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  lead: {
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: -0.28,
    fontFamily: "Pretendard-Regular",
    marginBottom: 16,
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 15.5,
    letterSpacing: -0.31,
    fontFamily: "Pretendard-Regular",
    padding: 0,
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
  listGroup: {
    borderRadius: 16,
    overflow: "hidden",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowHairline: {
    position: "absolute",
    left: 64,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },

  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  iconBar: { height: 2, borderRadius: 1 },

  itemBody: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.3,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },
  itemMeta: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.26,
    fontFamily: "Pretendard-Regular",
    marginTop: 2,
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  badge: {
    height: 22,
    borderRadius: 7,
    paddingHorizontal: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },

  emptyText: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Pretendard-Regular",
    marginTop: 48,
  },

  updateText: {
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: -0.24,
    textAlign: "center",
    fontFamily: "Pretendard-Regular",
  },
  footerDivider: {
    width: 40,
    height: StyleSheet.hairlineWidth,
    marginVertical: 6,
  },

  footer: {
    alignItems: "center",
    gap: 8,
    marginTop: 28,
    paddingHorizontal: 12,
  },
  disclaimerText: {
    fontSize: 11.5,
    lineHeight: 17,
    letterSpacing: -0.23,
    textAlign: "center",
    fontFamily: "Pretendard-Regular",
  },
  footerLink: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },
})
