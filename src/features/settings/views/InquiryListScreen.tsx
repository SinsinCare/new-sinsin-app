/**
 * 1:1 문의 목록 — 내가 보낸 문의와 그 답변.
 *
 * ## 왜 생겼나 (피드백 F9)
 *
 * 마이페이지의 "1:1 문의" 가 **작성 폼으로 바로 열렸다.** 보내고 나면 토스트 한 줄이
 * 전부였고, 보낸 문의를 다시 볼 자리도 답을 받을 자리도 없었다. 그래서 진입점은
 * 이 목록이고, 작성은 하단 CTA 로 한 단계 들어간다(`/(settings)/inquiry-new`).
 *
 * ## 디자인 시스템 통일 (2026-09-12)
 *
 * 홈 건강기록 6페이지·신장 정보 수정과 **같은 시스템**으로 그린다. 헤더는
 * `V2ScreenHeader`(separator·safeAreaTop), 행 머리는 `V2ListRow`(제목 + 메타 + 상태 배지),
 * 줄 사이는 `V2Divider`, 빈/오류 상태는 `V2EmptyState`/`V2ErrorState`. 하단 "새 문의하기" 는
 * `RecordPageShell` 의 CTA 와 같은 규격(`CTA`·`FOOTER_FADE`·`PAGE_X`)이다 — 목록이라
 * 셸을 통째로 쓸 수는 없지만, 버튼의 높이·라디우스·바닥 여백·페이드는 한 벌에서 온다.
 * 색은 `useSurface()` 한 벌, 치수는 `recordPageSpec` 한 벌.
 *
 * ## 한 줄의 문법
 *
 *   제목                                  [상태 배지]
 *   분류 · 날짜
 *   내용 (접힘: 2줄 · 탭하면 전부)
 *   ┌ 답변 ─ 답변 날짜 ────────────────┐   ← 답이 있을 때만
 *   │ 답변 본문                         │
 *   └──────────────────────────────────┘
 *
 * 답변은 **접힘 여부와 무관하게 항상 보인다** — 이 화면에 오는 이유가 그것이다.
 * 접히는 것은 내가 쓴 내용뿐이다(이미 아는 글이라 2줄이면 어느 문의인지 안다).
 *
 * ## 색 예산
 *
 * 브랜드 주황은 하단 "새 문의하기" 하나다. 상태 배지는 **둘 다 그레이스케일** —
 * "답변 완료" 는 잉크 면(`ink` fill), "접수됨" 은 옅은 회색(`neutral` weak). 완료·정상은
 * 색을 쓰지 않는다(브리프의 색 예산 규칙). 답변 상자는 `surfaceSunken` 면 위에 보더리스.
 */

import { useCallback, useMemo, useState } from "react"
import { Pressable, ScrollView, StyleSheet, View } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"

import {
  V2Badge,
  V2Divider,
  V2EmptyState,
  V2ErrorState,
  V2ListRow,
  V2ScreenHeader,
  V2Skeleton,
  V2SkeletonGroup,
  V2Text,
  useLoadingVisible,
} from "@/src/design-system-v2"
import { Text } from "@/src/shared/components/AppText"
import { useSurface } from "@/src/hooks/useSurface"
import { useInquiryList } from "@/src/features/settings/hooks/useInquiryList"
import { getAppLanguage } from "@/src/i18n"
import {
  isInquiryAnswered,
  splitInquirySubject,
  type InquiryItem,
} from "@/src/services/data/inquiryService"
import { useAppRouter } from "@/src/shared/navigation"
import { parseServerDate } from "@/src/shared/utils/serverDate"
import {
  CTA,
  FIELD,
  FOOTER_FADE,
  FORM,
  PAGE_X,
  S,
} from "@/src/features/home/components/record/pages/recordPageSpec"

/** 접힌 상태에서 보이는 내 글 줄 수. 제목이 따로 있으니 두 줄이면 어느 문의인지 안다. */
const COLLAPSED_CONTENT_LINES = 2

export function InquiryListScreen() {
  const router = useAppRouter()
  const s = useSurface()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation("settings")
  const query = useInquiryList()
  const showSkeleton = useLoadingVisible(query.isPending, {
    surface: "settings_inquiry",
  })
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set())

  const toggle = useCallback((id: number) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const openNew = useCallback(() => {
    router.push("/(settings)/inquiry-new")
  }, [router])

  const items = query.data ?? []
  // 마지막 행이 고정 CTA 밑에 숨지 않게 — 셸과 같은 계산(버튼 + 바닥 여백 + 페이드).
  const footerHeight = CTA.height + CTA.bottomInset + insets.bottom + S[2]
  const fadeTransparent = s.isDark ? "rgba(31,31,33,0)" : "rgba(255,255,255,0)"

  let body: React.ReactNode
  if (query.isPending) {
    body = showSkeleton ? <InquiryListSkeleton /> : null
  } else if (query.isError && items.length === 0) {
    body = (
      <V2ErrorState
        surface="settings_inquiry"
        tone="quiet"
        title={t("inquiry.list.errorTitle")}
        description={t("inquiry.list.errorBody")}
        onRetry={() => void query.refetch()}
        retryLabel={t("inquiry.list.retry")}
        style={styles.state}
      />
    )
  } else if (items.length === 0) {
    body = (
      <V2EmptyState
        surface="settings_inquiry"
        icon="chat"
        title={t("inquiry.list.emptyTitle")}
        description={t("inquiry.list.emptyBody")}
        style={styles.state}
      />
    )
  } else {
    body = (
      <ScrollView
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.list,
          { paddingBottom: footerHeight + FOOTER_FADE },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item, index) => (
          <View key={item.id}>
            <InquiryRow
              item={item}
              expanded={expanded.has(item.id)}
              onToggle={() => toggle(item.id)}
            />
            {/* 줄 사이는 헤어라인 하나. 마지막 줄 뒤에는 긋지 않는다(공지 목록과 같은 규칙). */}
            {index < items.length - 1 && (
              <V2Divider tone="alternative" style={styles.divider} />
            )}
          </View>
        ))}
      </ScrollView>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: s.canvas }]}>
      <V2ScreenHeader
        title={t("inquiry.title")}
        titleAlign="leading"
        separator
        safeAreaTop
        onBack={() => router.back()}
      />
      <View style={styles.flex}>{body}</View>

      {/* 하단 고정 CTA — RecordPageShell 의 저장 버튼과 같은 규격. */}
      <View style={styles.footerDock}>
        <LinearGradient
          pointerEvents="none"
          colors={[fadeTransparent, s.canvas]}
          style={styles.fade}
        />
        <View
          style={[
            styles.footer,
            {
              backgroundColor: s.canvas,
              paddingBottom: insets.bottom + CTA.bottomInset,
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("inquiry.list.newInquiry")}
            onPress={openNew}
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: s.brand, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Text style={[styles.ctaLabel, { color: s.onBrand }]}>
              {t("inquiry.list.newInquiry")}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

function InquiryRow({
  item,
  expanded,
  onToggle,
}: {
  item: InquiryItem
  expanded: boolean
  onToggle: () => void
}) {
  const s = useSurface()
  const { t } = useTranslation("settings")
  const answered = isInquiryAnswered(item)
  const { category, title } = useMemo(
    () => splitInquirySubject(item.subject),
    [item.subject],
  )
  const meta = [category, formatInquiryDate(item.createdAt)]
    .filter((part): part is string => !!part)
    .join(" · ")

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ expanded }}
      onPress={onToggle}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: s.surfacePressed },
      ]}
    >
      {/* 행 머리: 제목 + 메타 + 상태 배지. 눌림은 바깥 Pressable 이 소유하므로 onPress 를 주지 않는다. */}
      <V2ListRow
        title={title}
        subtitle={meta}
        sideMargin="s"
        verticalPadding="s"
        style={styles.rowHead}
        trailing={
          <V2Badge
            size="s"
            variant={answered ? "fill" : "weak"}
            color={answered ? "ink" : "neutral"}
          >
            {answered
              ? t("inquiry.list.statusAnswered")
              : t("inquiry.list.statusOpen")}
          </V2Badge>
        }
      />

      <View style={styles.rowBody}>
        <V2Text
          style={styles.body}
          color={s.text}
          numberOfLines={expanded ? undefined : COLLAPSED_CONTENT_LINES}
          lineBreakStrategyIOS="hangul-word"
        >
          {item.content}
        </V2Text>

        {answered && item.answer ? (
          <View style={[styles.answer, { backgroundColor: s.surfaceSunken }]}>
            <View style={styles.answerHead}>
              <V2Text style={styles.answerLabel} color={s.textStrong}>
                {t("inquiry.list.answerLabel")}
              </V2Text>
              {item.answeredAt ? (
                <V2Text style={styles.hint} color={s.textMuted}>
                  {formatInquiryDate(item.answeredAt)}
                </V2Text>
              ) : null}
            </View>
            <V2Text
              style={styles.body}
              color={s.textStrong}
              lineBreakStrategyIOS="hangul-word"
            >
              {item.answer}
            </V2Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  )
}

/** 제목 + 메타 + 본문 두 줄이 반복되는 리듬을 그대로 깐다. */
function InquiryListSkeleton() {
  return (
    <V2SkeletonGroup style={styles.list}>
      {[0, 1, 2, 3].map((index) => (
        <View key={index} style={styles.skeletonRow}>
          <View style={styles.skeletonHead}>
            <V2Skeleton width="60%" height={FORM.label.lineHeight} />
            <V2Skeleton width={52} height={S[5]} radius="sm" />
          </View>
          <V2Skeleton width="36%" height={FORM.hint.lineHeight} />
          <V2Skeleton width="100%" height={FORM.body.lineHeight} />
          <V2Skeleton width="84%" height={FORM.body.lineHeight} />
        </View>
      ))}
    </V2SkeletonGroup>
  )
}

/**
 * 서버 시각(오프셋 없는 UTC) → 기기 로컬 날짜. 공지 목록과 같은 이유로 `parseServerDate`
 * 를 거친다 — 맨 `new Date()` 는 KST 에서 9시간 이르게 읽어 자정 근처 문의가 전날이 된다.
 */
function formatInquiryDate(value: string): string {
  const date = parseServerDate(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(getAppLanguage() === "en" ? "en-US" : "ko-KR")
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  state: { flex: 1, justifyContent: "center" },
  list: { paddingTop: S[2] },
  row: { paddingVertical: S[2] },
  // 행 머리의 면은 바깥 Pressable 이 칠한다(눌림 색이 머리·본문에 한 번에 든다).
  rowHead: { backgroundColor: "transparent" },
  rowBody: { paddingHorizontal: PAGE_X, paddingBottom: S[2], gap: S[3] },
  body: FORM.body,
  hint: FORM.hint,
  answerLabel: FORM.option,
  answer: {
    padding: FIELD.paddingX,
    borderRadius: FIELD.radius,
    gap: S[2],
  },
  answerHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: S[2],
  },
  divider: { marginHorizontal: PAGE_X },
  skeletonRow: { paddingHorizontal: PAGE_X, paddingVertical: S[4], gap: S[2] },
  skeletonHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: S[2],
  },
  fade: {
    position: "absolute",
    left: 0,
    right: 0,
    top: -FOOTER_FADE,
    height: FOOTER_FADE,
  },
  footerDock: { position: "absolute", left: 0, right: 0, bottom: 0 },
  footer: { paddingTop: S[2], paddingHorizontal: PAGE_X },
  cta: {
    minHeight: CTA.height,
    paddingVertical: S[3],
    paddingHorizontal: S[4],
    borderRadius: CTA.radius,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaLabel: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "700",
    textAlign: "center",
  },
})
