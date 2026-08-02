/**
 * 건강 검진 화면들의 로딩 자리표시.
 *
 * 네 화면(대시보드/결과 목록/결과 상세/OCR 검토)이 모두 화면 한가운데 링 하나만 돌리고
 * 있었다. 링은 (1) 무엇이 올지 말하지 않고 (2) 도착 순간 빈 화면이 콘텐츠로 갈리면서
 * 스크롤 위치와 높이가 통째로 튄다. 여기서는 각 화면이 실제로 그리는 카드 배치를
 * 그대로 흉내 낸다 — 도착하면 회색이 글자로 바뀌는 것처럼 보인다.
 *
 * 모양의 근거는 각 화면의 StyleSheet 다. 카드 radius·패딩·섹션 간격을 눈대중으로 잡으면
 * 도착 전후가 어긋나 오히려 튄다. 값이 바뀌면 여기도 같이 바꾼다.
 */

import { StyleSheet, View } from "react-native"

import {
  V2Skeleton,
  V2SkeletonGroup,
  V2SkeletonText,
} from "@/src/design-system-v2"

/** 건강 화면 공통 좌우 여백 (각 화면 scrollContent.paddingHorizontal) */
const CONTENT_PADDING = 20

/** 대시보드: 요약 카드 + 모듈 상태 카드 3장 + 추세 그래프 1장. */
export function HealthDashboardSkeleton() {
  return (
    <V2SkeletonGroup style={styles.page}>
      {/* 요약 카드 — 아이콘 + 두 줄 */}
      <View style={styles.summaryCard}>
        <V2Skeleton width={40} height={40} radius="lg" />
        <View style={styles.summaryInfo}>
          <V2Skeleton width="52%" height={17} />
          <V2Skeleton width="38%" height={13} />
        </View>
      </View>

      <V2Skeleton width="72%" height={13} style={styles.note} />

      <V2Skeleton width={96} height={16} style={styles.sectionTitle} />
      <View style={styles.moduleGrid}>
        {[0, 1, 2].map((index) => (
          <V2Skeleton key={index} height={72} radius="lg" />
        ))}
      </View>

      <V2Skeleton width={112} height={16} style={styles.sectionTitle} />
      <V2Skeleton height={180} radius="lg" />
    </V2SkeletonGroup>
  )
}

/** 결과 목록: 개수 줄 + 최신 카드 + 지난 결과 행들. */
export function HealthResultListSkeleton() {
  return (
    <V2SkeletonGroup style={styles.page}>
      <View style={styles.countRow}>
        <V2Skeleton width={84} height={13} />
        <V2Skeleton width={52} height={13} />
      </View>

      {/* 최신 결과 강조 카드 */}
      <View style={styles.latestCard}>
        <View style={styles.latestHeader}>
          <V2Skeleton width={44} height={20} radius="full" />
          <V2Skeleton width={96} height={15} />
        </View>
        <V2Skeleton width="58%" height={13} />
        <V2Skeleton width="40%" height={13} />
      </View>

      {[0, 1, 2, 3].map((index) => (
        <View key={index} style={styles.row}>
          <View style={styles.rowBody}>
            <V2Skeleton width="46%" height={15} />
            <V2Skeleton width="64%" height={13} />
          </View>
          <V2Skeleton width={8} height={14} />
        </View>
      ))}
    </V2SkeletonGroup>
  )
}

/** 결과 상세: 헤더 카드 + 항목 섹션 두 덩어리. */
export function HealthResultDetailSkeleton() {
  return (
    <V2SkeletonGroup style={styles.page}>
      <View style={styles.headerCard}>
        <V2Skeleton width="44%" height={19} />
        <V2Skeleton width="60%" height={14} />
        <V2Skeleton height={56} radius="lg" style={styles.judgement} />
      </View>

      {[0, 1].map((section) => (
        <View key={section} style={styles.detailSection}>
          <V2Skeleton width={104} height={16} />
          {[0, 1, 2].map((index) => (
            <View key={index} style={styles.metricRow}>
              <V2Skeleton width="38%" height={14} />
              <V2Skeleton width={64} height={14} />
            </View>
          ))}
        </View>
      ))}
    </V2SkeletonGroup>
  )
}

/** OCR 검토: 안내 문단 + 원본 미리보기 + 입력 행들. */
export function OcrReviewSkeleton() {
  return (
    <V2SkeletonGroup style={styles.page}>
      <V2Skeleton width="56%" height={20} />
      <V2SkeletonText lines={2} lineHeight={13} style={styles.subtitle} />
      <V2Skeleton height={160} radius="lg" style={styles.preview} />

      {[0, 1, 2, 3].map((index) => (
        <View key={index} style={styles.field}>
          <V2Skeleton width="30%" height={13} />
          <V2Skeleton height={48} radius="lg" />
        </View>
      ))}
    </V2SkeletonGroup>
  )
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: CONTENT_PADDING,
    paddingTop: 16,
  },
  // 요약/최신/헤더 카드는 실제 카드와 같은 14 radius·패딩을 쓴다.
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: 16,
  },
  summaryInfo: { flex: 1, gap: 6 },
  note: { marginTop: 12 },
  sectionTitle: { marginTop: 24, marginBottom: 12 },
  moduleGrid: { gap: 10 },
  countRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  latestCard: {
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    gap: 6,
  },
  latestHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    gap: 12,
  },
  rowBody: { flex: 1, gap: 8 },
  headerCard: { borderRadius: 14, padding: 18, gap: 8 },
  judgement: { marginTop: 6 },
  detailSection: { marginTop: 24, gap: 12 },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subtitle: { marginTop: 8 },
  preview: { marginTop: 16 },
  field: { marginTop: 20, gap: 8 },
})
