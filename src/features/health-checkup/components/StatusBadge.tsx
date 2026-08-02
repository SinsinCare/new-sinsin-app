/**
 * 검사 수치의 정상/주의/위험 배지.
 *
 * 색은 만들지 않는다 — 디자인 시안의 배지 색을 픽셀로 뽑아 보면 v2 `V2Badge` 의
 * weak 변형과 **정확히** 같다:
 *   정상 `#d6efe3` = greenWeak(#02a26229) over white
 *   주의 `#fff6dc` / 글자 `#9c5800` = yellowWeak + accentForeground.orange
 *   위험 `#ffe5e3` / 글자 `#ff4242` = redWeak + status.negative
 * 그래서 여기서는 상태 → V2Badge color 매핑만 한다. 배지에 hex 를 쓰면 다크모드에서 깨진다.
 */

import { V2Badge, type V2BadgeSize } from "@/src/design-system-v2"
import { useTranslation } from "react-i18next"

import type { MetricStatus } from "@/src/types/healthAnalysis"

/** 상태 → V2Badge 색. 이 매핑이 디자인과 코드를 잇는 유일한 지점이다. */
const BADGE_COLOR = {
  normal: "green",
  caution: "yellow",
  warning: "red",
} as const

export function StatusBadge({
  status,
  size = "s",
}: {
  status: MetricStatus
  size?: V2BadgeSize
}) {
  const { t } = useTranslation("health")
  return (
    <V2Badge size={size} color={BADGE_COLOR[status]} variant="weak">
      {t(`checkup.status.${status}`)}
    </V2Badge>
  )
}

/**
 * 상태별 아이콘 이름과 색.
 *
 * 요약 타일과 캘린더가 같이 쓴다. 정상이 **브랜드 오렌지 방패**인 건 시안 그대로다 —
 * 이 앱에서 오렌지는 보통 CTA·활성이지만, 이 타일에서는 "지켜졌다" 는 의미로 쓰인다.
 * 위험(레드)·주의(앰버)와 나란히 놓였을 때만 성립하므로 단독으로 재사용하지 말 것.
 */
export const STATUS_GLYPH = {
  warning: { icon: "danger", colorKey: "negative" },
  caution: { icon: "caution", colorKey: "cautionary" },
  normal: { icon: "safety", colorKey: "brand" },
} as const

export type StatusGlyphKey = keyof typeof STATUS_GLYPH
