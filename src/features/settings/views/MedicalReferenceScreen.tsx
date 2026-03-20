import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';

// ─────────────────────────────────────────────
// 📌 데이터 타입 정의
// ─────────────────────────────────────────────

type BadgeType = 'new' | 'kdigo' | 'pdf';

export interface ReferenceItem {
  id: string;
  title: string;
  meta: string;
  badge: BadgeType;
  iconColor: 'teal' | 'blue' | 'orange' | 'purple';
  url?: string;
}

export interface ReferenceSection {
  id: string;
  header: string;
  items: ReferenceItem[];
}

// ─────────────────────────────────────────────
// 📌 콘텐츠 데이터 — 여기만 수정하세요
// ─────────────────────────────────────────────

const REFERENCE_SECTIONS: ReferenceSection[] = [
  {
    id: 'guidelines',
    header: '진료지침',
    items: [
      {
        id: 'g1',
        title: '고혈압콩팥병 진료지침',
        meta: '대한신장학회 · 2025.07',
        badge: 'new',
        iconColor: 'teal',
        url: 'https://www.ksn.or.kr',
      },
      {
        id: 'g2',
        title: '노인 만성콩팥병 진료지침',
        meta: '대한신장학회 · 2026.01',
        badge: 'new',
        iconColor: 'teal',
        url: 'https://www.ksn.or.kr',
      },
      {
        id: 'g3',
        title: '당뇨병콩팥병 진료지침',
        meta: '대한신장학회 · 2024.12',
        badge: 'pdf',
        iconColor: 'teal',
        url: 'https://www.ksn.or.kr',
      },
      {
        id: 'g4',
        title: '지속가능신장치료 (CKRT) 진료지침',
        meta: '대한신장학회 · 2023',
        badge: 'pdf',
        iconColor: 'teal',
        url: 'https://www.ksn.or.kr',
      },
    ],
  },
  {
    id: 'international',
    header: '국제 가이드라인',
    items: [
      {
        id: 'i1',
        title: 'KDIGO 2025 ADPKD Guideline',
        meta: 'KDIGO · 2025 · 영문',
        badge: 'kdigo',
        iconColor: 'purple',
        url: 'https://kdigo.org',
      },
    ],
  },
  {
    id: 'patient',
    header: '환자 교육 자료',
    items: [
      {
        id: 'p1',
        title: '투석 전 단계 만성콩팥병 영양·식생활 관리',
        meta: '대한신장학회 · 1권 환자용',
        badge: 'pdf',
        iconColor: 'blue',
        url: 'https://www.ksn.or.kr',
      },
      {
        id: 'p2',
        title: '혈액투석 환자를 위한 영양·식생활 관리',
        meta: '대한신장학회 · 2권 환자용',
        badge: 'pdf',
        iconColor: 'blue',
        url: 'https://www.ksn.or.kr',
      },
      {
        id: 'p3',
        title: '복막투석 환자를 위한 영양·식생활 관리',
        meta: '대한신장학회 · 3권 환자용',
        badge: 'pdf',
        iconColor: 'blue',
        url: 'https://www.ksn.or.kr',
      },
      {
        id: 'p4',
        title: '소아청소년 만성콩팥병 바로알기',
        meta: '대한신장학회 · 보호자·환아용',
        badge: 'pdf',
        iconColor: 'blue',
        url: 'https://www.ksn.or.kr',
      },
      {
        id: 'p5',
        title: '만성콩팥병 바로알기 (당뇨병·고혈압 환자편)',
        meta: '대한신장학회 · 일반인용',
        badge: 'pdf',
        iconColor: 'blue',
        url: 'https://www.ksn.or.kr',
      },
      {
        id: 'p6',
        title: '만성콩팥병 바로알기 (건강한 성인편)',
        meta: '대한신장학회 · 일반인용',
        badge: 'pdf',
        iconColor: 'blue',
        url: 'https://www.ksn.or.kr',
      },
    ],
  },
  {
    id: 'misc',
    header: '용어집 및 복지 정보',
    items: [
      {
        id: 'm1',
        title: '신장학 용어집',
        meta: '대한신장학회 · 2024.07',
        badge: 'pdf',
        iconColor: 'orange',
        url: 'https://www.ksn.or.kr',
      },
      {
        id: 'm2',
        title: '만성콩팥병 환자 복지 정보',
        meta: '2023년도 개정판',
        badge: 'pdf',
        iconColor: 'orange',
        url: 'https://www.ksn.or.kr',
      },
    ],
  },
];

const LAST_UPDATED = '2026.03.01';

// ─────────────────────────────────────────────
// 📌 서브 컴포넌트
// ─────────────────────────────────────────────

const ICON_BG: Record<ReferenceItem['iconColor'], string> = {
  teal:   '#E1F5EE',
  blue:   '#E8F0FB',
  orange: '#FFF0E0',
  purple: '#F0EEFF',
};

const ICON_STROKE: Record<ReferenceItem['iconColor'], string> = {
  teal:   '#1D9E75',
  blue:   '#1E6FBF',
  orange: '#C47A1A',
  purple: '#7C5CBF',
};

const BADGE_STYLE: Record<BadgeType, { bg: string; color: string; label: string }> = {
  new:   { bg: '#E8F5E9', color: '#2E7D32', label: '최신' },
  kdigo: { bg: '#EDE7F6', color: '#4527A0', label: 'KDIGO' },
  pdf:   { bg: '#F3F3F3', color: '#6C6C70', label: 'PDF' },
};

function ItemIcon({ color }: { color: ReferenceItem['iconColor'] }) {
  return (
    <View style={[styles.itemIcon, { backgroundColor: ICON_BG[color] }]}>
      <View style={[styles.iconBar1, { backgroundColor: ICON_STROKE[color] }]} />
      <View style={[styles.iconBar2, { backgroundColor: ICON_STROKE[color] }]} />
      <View style={[styles.iconBar3, { backgroundColor: ICON_STROKE[color] }]} />
    </View>
  );
}

function Badge({ type }: { type: BadgeType }) {
  const { bg, color, label } = BADGE_STYLE[type];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function ReferenceRow({ item }: { item: ReferenceItem }) {
  const handlePress = () => {
    if (item.url) Linking.openURL(item.url);
  };

  return (
    <TouchableOpacity style={styles.listItem} onPress={handlePress} activeOpacity={0.6}>
      <ItemIcon color={item.iconColor} />
      <View style={styles.itemBody}>
        <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.itemMeta}>{item.meta}</Text>
      </View>
      <View style={styles.itemRight}>
        <Badge type={item.badge} />
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

function SectionGroup({ section }: { section: ReferenceSection }) {
  return (
    <>
      <Text style={styles.sectionHeader}>{section.header}</Text>
      <View style={styles.listGroup}>
        {section.items.map((item, index) => (
          <View key={item.id}>
            <ReferenceRow item={item} />
            {index < section.items.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>
    </>
  );
}

// ─────────────────────────────────────────────
// 📌 메인 스크린
// ─────────────────────────────────────────────

export function MedicalReferenceScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSections: ReferenceSection[] = REFERENCE_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(
      item =>
        item.title.includes(searchQuery) || item.meta.includes(searchQuery),
    ),
  })).filter(section => section.items.length > 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />

      {/* 네비게이션 바 */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navBack} onPress={() => router.back()}>
          <Text style={styles.navBackText}>‹ 마이페이지</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>의료 참고 문헌</Text>
        <View style={styles.navRight} />
      </View>

      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 안내 배너 */}
        <View style={styles.infoBanner}>
          <View style={styles.infoIcon}>
            <Text style={styles.infoIconText}>ℹ</Text>
          </View>
          <View style={styles.infoTextWrap}>
            <Text style={styles.infoTitle}>근거 기반 의료 정보 제공</Text>
            <Text style={styles.infoDesc}>
              이 앱의 모든 영양·의료 권고사항은 아래 공인 학회 지침 및 진료지침을 기반으로
              합니다. 개인 치료 결정은 반드시 담당 의료진과 상의하세요.
            </Text>
          </View>
        </View>

        {/* 검색바 */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="문헌 검색"
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {/* 섹션 목록 */}
        {filteredSections.length > 0 ? (
          filteredSections.map(section => (
            <SectionGroup key={section.id} section={section} />
          ))
        ) : (
          <Text style={styles.emptyText}>검색 결과가 없습니다.</Text>
        )}

        {/* 업데이트 안내 */}
        <View style={styles.updateNotice}>
          <View style={styles.updateDot} />
          <Text style={styles.updateText}>
            <Text style={styles.updateBold}>문헌은 최신 학회 발표 기준으로 업데이트</Text>
            됩니다. 마지막 갱신: {LAST_UPDATED}
          </Text>
        </View>

        {/* 면책 문구 */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            이 앱의 정보는 의학적 진단이나 치료를 대체하지 않습니다.{'\n'}
            구체적인 치료 계획은 반드시 담당 의료진과 상의하세요.
          </Text>
          <View style={styles.disclaimerLinks}>
            <TouchableOpacity onPress={() => Linking.openURL('https://yourapp.com/privacy')}>
              <Text style={styles.disclaimerLink}>개인정보 처리방침</Text>
            </TouchableOpacity>
            <Text style={styles.disclaimerSep}>·</Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://yourapp.com/terms')}>
              <Text style={styles.disclaimerLink}>이용약관</Text>
            </TouchableOpacity>
            <Text style={styles.disclaimerSep}>·</Text>
            <TouchableOpacity onPress={() => Linking.openURL('mailto:support@yourapp.com')}>
              <Text style={styles.disclaimerLink}>문의하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// 📌 스타일
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },

  // 네비게이션
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(242,242,247,0.95)',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(60,60,67,0.18)',
  },
  navBack: {
    minWidth: 72,
  },
  navBackText: {
    fontSize: 17,
    color: '#007AFF',
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  navRight: {
    minWidth: 72,
  },

  // 스크롤
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // 안내 배너
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    margin: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
  },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#E8F4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIconText: {
    fontSize: 14,
    color: '#007AFF',
  },
  infoTextWrap: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  infoDesc: {
    fontSize: 12,
    color: '#6C6C70',
    lineHeight: 17,
  },

  // 검색바
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: 'rgba(118,118,128,0.12)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 7 : 4,
  },
  searchIcon: {
    fontSize: 13,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1C1C1E',
    padding: 0,
  },

  // 섹션
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#6C6C70',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  listGroup: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  divider: {
    height: 0.5,
    backgroundColor: 'rgba(60,60,67,0.15)',
    marginLeft: 60,
  },

  // 아이템 아이콘
  itemIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    padding: 8,
  },
  iconBar1: { width: 14, height: 2, borderRadius: 1 },
  iconBar2: { width: 10, height: 2, borderRadius: 1 },
  iconBar3: { width: 8,  height: 2, borderRadius: 1 },

  // 아이템 본문
  itemBody: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
    lineHeight: 19,
  },
  itemMeta: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // 뱃지
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 18,
    color: '#C7C7CC',
    marginLeft: 2,
  },

  // 빈 결과
  emptyText: {
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: 14,
    marginTop: 40,
  },

  // 업데이트 안내
  updateNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
  },
  updateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
  },
  updateText: {
    flex: 1,
    fontSize: 12,
    color: '#6C6C70',
    lineHeight: 17,
  },
  updateBold: {
    fontWeight: '600',
    color: '#1C1C1E',
  },

  // 면책 문구
  disclaimer: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  disclaimerText: {
    fontSize: 11,
    color: '#8E8E93',
    lineHeight: 17,
    textAlign: 'center',
  },
  disclaimerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  disclaimerLink: {
    fontSize: 11,
    color: '#007AFF',
  },
  disclaimerSep: {
    fontSize: 11,
    color: '#8E8E93',
  },
});
