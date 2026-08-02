/**
 * 검진 목록의 카드 한 줄 + 그 목록이 쓰는 날짜 유틸.
 *
 * ## 날짜 유틸이 왜 여기 있나
 *
 * `checkupDate` 를 읽는 곳은 이 카드(표시)와 목록 화면(정렬·연도 묶기) 둘뿐이다.
 * 지금 공용 유틸 파일을 새로 열면 같은 배치에서 다른 화면을 만드는 사람과 파일이
 * 겹친다. 쓰는 곳이 셋 이상으로 늘어나면 그때 옮기면 된다.
 *
 * ## 히트영역이 둘이다
 *
 * 원을 누르면 선택 토글, 카드 본문을 누르면 상세로 간다. 시안(-12)에 chevron 이
 * 있다는 게 본문이 이동 대상이라는 증거고, 원과 chevron 이 한 줄에 같이 있는데
 * 카드 전체가 하나의 동작만 한다면 둘 중 하나는 거짓말이 된다.
 * 원은 `V2Checkbox` 가 내부에서 hitSlop 으로 44 를 확보한다(시각 크기 24).
 */

import { Pressable, StyleSheet, Text, View } from "react-native"

import {
  V2Checkbox,
  V2Icon,
  radius,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import type { HealthCheckResultsRs } from "@/src/types/nhis"

export interface CheckupDateParts {
  year: number
  month: number
  day: number
}

/**
 * `"2023.10.15"` / `"2023-10-15"` / `"20231015"` 를 모두 받아 y·m·d 로 나눈다.
 *
 * **`new Date(checkupDate)` 를 쓰지 않는다.** Hermes 의 `Date` 파서는 ISO 형식만
 * 보장하고 점 구분 문자열(`"2023.10.15"`)은 `NaN` 이 될 수 있다 — 기존 목록 화면이
 * 실제로 그래서 정렬이 무작위가 됐다. 숫자만 뽑아 직접 나눈다.
 */
export function parseCheckupDate(raw: string): CheckupDateParts | null {
  if (!raw) return null

  const groups = raw.match(/\d+/g)
  if (!groups) return null

  // 구분자가 없는 8자리(20231015)는 한 덩어리로 잡히므로 잘라 쓴다.
  const [year, month, day] =
    groups.length === 1 && groups[0].length === 8
      ? [groups[0].slice(0, 4), groups[0].slice(4, 6), groups[0].slice(6, 8)]
      : groups
  if (year == null || month == null || day == null) return null

  const parts = { year: Number(year), month: Number(month), day: Number(day) }
  const valid =
    parts.year >= 1900 &&
    parts.month >= 1 &&
    parts.month <= 12 &&
    parts.day >= 1 &&
    parts.day <= 31
  return valid ? parts : null
}

/**
 * 정렬용 숫자 키(20231015). 못 읽은 날짜는 -1 이라 항상 뒤로 밀린다 —
 * 문자열 비교나 `Date` 변환 없이 내림차순 정렬이 된다.
 */
export function checkupSortKey(raw: string): number {
  const parts = parseCheckupDate(raw)
  if (!parts) return -1
  return parts.year * 10000 + parts.month * 100 + parts.day
}

/** i18n 언어 코드 → Intl 로케일. Hermes 에 있는 Intl 은 DateTimeFormat 까지다. */
export function intlLocale(language: string): string {
  return language.startsWith("en") ? "en-US" : "ko-KR"
}

/** "2026년" / "2026". 연도 표기는 언어마다 달라서 문자열을 조립하지 않는다. */
export function formatCheckupYear(year: number, language: string): string {
  return new Intl.DateTimeFormat(intlLocale(language), {
    year: "numeric",
  }).format(new Date(year, 0, 1))
}

/** "10월 12일" / "October 12". */
export function formatCheckupMonthDay(
  parts: CheckupDateParts,
  language: string,
): string {
  return new Intl.DateTimeFormat(intlLocale(language), {
    month: "long",
    day: "numeric",
  }).format(new Date(parts.year, parts.month - 1, parts.day))
}

/**
 * 목록 응답에는 **정상/주의 카운트가 없다**(`GET /health-check/results` 는
 * resultId·checkupDate·checkupPlace·createdAt 뿐). 시안의 "정상 2 · 주의 1" 은
 * 회차마다 상세를 한 번씩 더 불러야 나오는 값이라 목록에서 지어내지 않는다.
 *
 * 새 서버(`sinsin-be-bun`)만 이 필드를 실어 보낸다. 구 파이썬 서버는 안 준다 —
 * **있으면 읽고 없으면 줄을 지운다.** 타입에 optional 로 선언돼 있으므로 캐스트가 필요 없다.
 */
export interface CheckupCounts {
  normal: number
  caution: number
  warning: number
}

export function readCheckupCounts(
  result: HealthCheckResultsRs,
): CheckupCounts | null {
  const { normalCount, cautionCount, warningCount } = result
  if (typeof normalCount !== "number" || typeof cautionCount !== "number") {
    return null
  }
  const counts = {
    normal: normalCount,
    caution: cautionCount,
    warning: warningCount ?? 0,
  }
  // 셋 다 0 이면 "전부 정상" 이 아니라 **잡힌 항목이 없다** 는 뜻이다(복호화 실패 등).
  // 그때 "정상 0 · 주의 0" 을 그리면 화면이 거짓말을 한다.
  if (counts.normal + counts.caution + counts.warning === 0) return null
  return counts
}

/**
 * 요약 줄. **0 인 항목은 뺀다.**
 *
 * "정상 13 · 주의 0" 은 "주의가 0건" 이라는 정보를 주는 것 같지만, 실제로는 읽는 사람이
 * 0 을 한 번 해석해야 하는 비용만 남긴다. 없는 건 말하지 않는 편이 짧고 정확하다.
 *
 * 순서는 **위험 → 주의 → 정상**이다. 시안은 "정상 2 · 주의 1" 로 정상이 앞이지만,
 * 이 화면에서 눈이 먼저 찾아야 하는 건 문제 쪽이고 화면의 다른 모든 곳
 * (요약 타일·건강 수치 목록·서버 정렬)이 이미 그 순서를 쓴다.
 *
 * 전부 0 이면 `readCheckupCounts` 가 null 을 주므로 여기 오지 않는다.
 */
export function formatCheckupSummary(
  counts: CheckupCounts,
  label: (status: "warning" | "caution" | "normal") => string,
): string {
  return (["warning", "caution", "normal"] as const)
    .filter((status) => counts[status] > 0)
    .map((status) => `${label(status)} ${counts[status]}`)
    .join(" · ")
}

export interface CheckupListItemProps {
  selected: boolean
  onToggle: () => void
  onOpenDetail?: () => void
  /** 카운트 문구. 서버가 주지 않으면 undefined 로 두고 줄 자체를 그리지 않는다. */
  summary?: string
  /** "10월 12일 · 서울삼성병원" 처럼 이미 조립된 제목. */
  title: string
  /** 스크린리더가 원을 읽을 때 쓸 이름 — 원만으로는 어느 검진인지 알 수 없다. */
  accessibilityLabel?: string
}

export function CheckupListItem({
  selected,
  onToggle,
  onOpenDetail,
  summary,
  title,
  accessibilityLabel,
}: CheckupListItemProps) {
  const { colors } = useV2Theme()

  return (
    /*
      보더가 아니라 **면**으로 구획한다. 이 앱은 보더리스이고, 이 목록은 연도 섹션 사이를
      이미 `background.lower` 갭 밴드로 나누고 있어서 카드마다 테두리까지 두면 구획선이
      두 겹이 된다. 선택 상태는 왼쪽 체크 원이 말한다.
    */
    <View style={[styles.card, { backgroundColor: colors.fill.background }]}>
      <V2Checkbox
        variant="circle"
        size="m"
        checked={selected}
        onChange={onToggle}
        accessibilityLabel={accessibilityLabel}
      />

      {/* 본문(제목·요약·chevron)만 상세로 간다. 원은 위에서 자기 터치를 가져간다. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        disabled={onOpenDetail == null}
        onPress={onOpenDetail}
        style={({ pressed }) => [
          styles.body,
          pressed && onOpenDetail != null && styles.pressed,
        ]}
      >
        <View style={styles.textColumn}>
          <Text
            numberOfLines={1}
            style={[typography.label.medium, { color: colors.label.normal }]}
          >
            {title}
          </Text>
          {summary != null && (
            <Text
              numberOfLines={1}
              style={[
                typography.subtext.medium,
                { color: colors.label.alternative },
              ]}
            >
              {summary}
            </Text>
          )}
        </View>

        {onOpenDetail != null && (
          <V2Icon
            name="chevronRight"
            size="sm"
            color={colors.label.assistive}
          />
        )}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[16],
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[20],
    borderRadius: radius["2xl"],
  },
  body: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
  },
  textColumn: {
    flex: 1,
    gap: spacing[2],
  },
  pressed: { opacity: 0.6 },
})
