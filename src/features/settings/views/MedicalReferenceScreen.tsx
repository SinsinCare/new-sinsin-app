import React, { useMemo, useState } from "react"
import { View, StyleSheet, ScrollView, Pressable, Linking } from "react-native"
import { Text, TextInput } from "@/src/shared/components/AppText"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppRouter } from "@/src/shared/navigation"
import { useTranslation } from "react-i18next"

import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { useSurface } from "@/src/hooks/useSurface"
import { spacing } from "@/src/design-system-v2"

import { matchesReferenceQuery } from "@/src/features/settings/utils/referenceSearch"

/*
  ■ 간격 규격 (2026-09-11 피드백 "행이 빽빽하다") — 4pt 그리드, v2 spacing 토큰.

  - 행: 최소 56pt, 세로 패딩 16 (아이콘 36 + 16×2 = 68 이 보통이지만 한 줄 제목만 있는
    행이 56 밑으로 꺼지지 않게 바닥을 둔다)
  - 섹션 제목 → 카드: 16
  - 섹션 사이: 24 (검색창 → 첫 섹션 제목도 같은 24)
*/
const ROW_MIN_HEIGHT = 56
const ROW_PADDING_V = spacing[16]
const TITLE_TO_CARD = spacing[16]
const SECTION_GAP = spacing[24]

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
      <DocIcon barColor={surface.textWeak} tileBg={surface.surfaceSunken} />
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
        <Text
          style={[styles.itemMeta, { color: surface.textMuted }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {item.meta}
        </Text>
      </View>
      <View style={styles.itemRight}>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: isNew
                ? surface.surfaceBrand
                : surface.surfaceSunken,
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

  // 스무 번 남짓의 t() 호출. 검색어를 한 글자 칠 때마다 다시 만들 이유가 없다 —
  // 언어가 바뀌면 `t` 가 바뀌고 그때만 다시 만든다.
  const localizedSections = useMemo<ReferenceSection[]>(
    () =>
      REFERENCE_SECTIONS.map((section) => ({
        ...section,
        header: t(SECTION_HEADER_KEYS[section.id]),
        items: section.items.map((item) => ({
          ...item,
          title: t(ITEM_TEXT_KEYS[item.id].title),
          meta: t(ITEM_TEXT_KEYS[item.id].meta),
        })),
      })),
    [t],
  )

  const filteredSections = localizedSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        matchesReferenceQuery(item, searchQuery),
      ),
    }))
    .filter((section) => section.items.length > 0)

  // 홈과 같은 층 규칙: 라이트는 회색 바닥 위 흰 카드, 다크는 짙은 바닥 위 옅은 카드.
  const screenBg = surface.bed
  const fieldBg = surface.isDark ? surface.surfaceSunken : surface.card

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
        {/* 검색 필드 — 보더 없는 흰 면. 헤더 바로 아래가 첫 줄이다.
            자료 범위 설명은 위가 아니라 목록 아래 푸터로 내렸다: 검색은 화면에
            들어오자마자 손에 닿아야 하고, 설명문은 iOS 그룹 리스트처럼 목록을
            다 본 뒤에 읽는 각주 자리가 맞다. */}
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
                style={[styles.sectionHeader, { color: surface.text }]}
                lineBreakStrategyIOS="hangul-word"
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
          <Text
            style={[styles.emptyText, { color: surface.textMuted }]}
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
          >
            {t("medical.empty")}
          </Text>
        )}

        {/* 범위·면책·갱신 — 하나의 푸터 스택. 카드도 보더도 없이 가운데 정렬 캡션 위계.
            산문(범위 → 면책) 먼저, 헤어라인 뒤에 메타(확인일)와 링크. */}
        <View style={styles.footer}>
          <Text
            style={[styles.scopeText, { color: surface.textMuted }]}
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
          >
            {t("medical.lead")}
          </Text>
          <Text
            style={[styles.disclaimerText, { color: surface.placeholder }]}
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
          >
            {t("medical.disclaimer")}
          </Text>
          <View
            style={[
              styles.footerDivider,
              { backgroundColor: surface.hairline },
            ]}
          />
          <Text
            style={[styles.updateText, { color: surface.placeholder }]}
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
          >
            {t("medical.lastChecked", { date: LAST_UPDATED })}
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
    paddingTop: 8,
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

  /*
    ■ **색은 `surface.text`(= `label.neutral`)다 — `textMuted` 가 아니다** (2026-08-22)

    (B) 섹션 라벨(`SectionHeader` 머리말: 바닥 위 이름표 + 그 아래 흰 카드)이 오래
    `textMuted`(= `label.alternative`)였는데, 화면 바닥 위에서 **2.68:1** 이다 —
    본문 기준 4.5 는커녕 큰 글자 기준 3 에도 못 미친다(13.5 SemiBold 는 큰 글자가
    아니다: 기준은 18.66 이상 또는 14 이상 Bold).

    **값은 안 고쳤다.** `label.alternative` 는 146곳이 보고 식당 상세 시안 실측에
    묶여 있다. 고친 것은 **부르는 쪽의 토큰 선택**이고, 그건 이 감사가 커뮤니티에서
    이미 낸 결론이다(`design-system-v2/tokens/colors.ts` §label 사다리 — "읽혀야 하는
    글자의 바닥은 `neutral`"). 바닥 위 **4.72:1**, 다크도 3.00 → **5.79** 로 같이
    올라간다(거기서도 4.5 밖이었다). 계산은 `tests/lightContrastAudit.test.ts` §11.
  */
  sectionHeader: {
    paddingTop: SECTION_GAP,
    paddingBottom: TITLE_TO_CARD,
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
    minHeight: ROW_MIN_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    paddingHorizontal: spacing[16],
    paddingVertical: ROW_PADDING_V,
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
    marginTop: 32,
    paddingHorizontal: 12,
  },
  // 자료 범위 설명 — 푸터에서 유일하게 조금 진한 줄. 면책·확인일보다 한 단 위.
  scopeText: {
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.26,
    textAlign: "center",
    fontFamily: "Pretendard-Regular",
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
