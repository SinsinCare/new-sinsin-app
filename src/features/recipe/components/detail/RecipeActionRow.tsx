/**
 * 제목 바로 아래의 **액션 행**. 네이버 지도 벤치마크 §F-P0 세 번째 항목이다.
 *
 * ─── 무엇을 고쳤나 (실측) ───────────────────────────────────────────────────
 * 종전에는 저장·공유가 `position: absolute` 로 떠 있는 **반투명 검은 동그라미**였다.
 * 사진 위에 얹는 전제로 만든 것인데, 실측하면 그 전제가 오늘 데이터에 없다:
 *  - dev DB 175건 중 `image_url`·`thumbnail_url`·`detail_image_url` 이 채워진 레시피가
 *    **0건**이다. 그래서 히어로는 늘 96pt 짜리 빈 회색 띠였고,
 *  - 그 위에 뜬 검은 동그라미가 제목(`잡채덮밥 (저염)`)과 메타 줄을 **덮었다**(스크린샷 확인),
 *  - 스크롤해도 절대 위치라 재료 목록 위에 계속 떠서 `식용유 15g` 줄을 가렸다.
 * 즉 사진이 없는 상태에서 그 UI 는 "사진 위 컨트롤" 이 아니라 **콘텐츠 위 가림막**이었다.
 *
 * 그래서 식당 상세와 같은 자리로 내렸다: 헤더에는 뒤로가기만 두고, 저장·공유는
 * 제목 아래 알약 행으로. 겹칠 수 없는 자리이고, 라벨이 있어 아이콘만 있을 때보다 읽힌다.
 *
 * ─── 없는 버튼은 만들지 않는다 (§G) ─────────────────────────────────────────
 * 네이버는 이 자리에 출발·도착·예약을 둔다. 우리에게 없는 기능이라 베끼지 않는다.
 * 식당 상세의 `진단하기` 도 레시피에는 대응물이 없다 — 서버가 레시피에 대해
 * **개인 판정을 계산하지 않는다**(응답에 그런 필드가 없다. 실측: `/recipes/21` 은
 * `budget` 과 `percentOfRemaining` 만 준다). 그래서 알약은 실제로 동작하는 둘뿐이다.
 */
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import {
  CHIP_GAP,
  GUTTER,
  V2Icon,
  radius,
  spacing,
  touchTarget,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import type { V2IconName } from "@/src/design-system-v2"

export interface RecipeActionRowProps {
  saved: boolean
  saveBusy: boolean
  onToggleSave: () => void
  onShare: () => void
}

export function RecipeActionRow({
  saved,
  saveBusy,
  onToggleSave,
  onShare,
}: RecipeActionRowProps) {
  const { t } = useTranslation("recipe")

  return (
    <View style={styles.row}>
      {/*
       * 저장 상태는 **색이 아니라 면**으로 구분한다(DS 아이콘 레지스트리의 주석과 같은 규칙).
       * 저장되면 알약이 브랜드 weak 면으로 차고 아이콘이 채워진다 — 색만 바꾸면
       * 색각 이상에서 두 상태가 같아 보인다.
       */}
      <ActionPill
        icon={saved ? "bookmarkFilled" : "bookmark"}
        label={saved ? t("detail.action.saved") : t("detail.action.save")}
        accessibilityLabel={
          saved
            ? t("detail.unsaveAccessibility")
            : t("detail.saveAccessibility")
        }
        selected={saved}
        disabled={saveBusy}
        onPress={onToggleSave}
      />
      <ActionPill
        icon="share"
        label={t("detail.action.share")}
        accessibilityLabel={t("detail.shareAccessibility")}
        onPress={onShare}
      />
    </View>
  )
}

function ActionPill({
  icon,
  label,
  accessibilityLabel,
  onPress,
  selected = false,
  disabled = false,
}: {
  icon: V2IconName
  label: string
  accessibilityLabel: string
  onPress: () => void
  selected?: boolean
  disabled?: boolean
}) {
  const { colors } = useV2Theme()
  const foreground = selected ? colors.primary.primary : colors.label.neutral

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled }}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: selected
            ? colors.primary.primaryWeak
            : colors.fill.normal,
          opacity: pressed || disabled ? 0.6 : 1,
        },
      ]}
    >
      <V2Icon name={icon} size={18} color={foreground} />
      <Text style={[styles.pillLabel, { color: foreground }]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: CHIP_GAP,
    paddingHorizontal: GUTTER,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[6],
    // 시각 높이를 최소 터치 타깃과 같게 둔다 — 알약이 두 개뿐이라 여백이 남고,
    // 38(controlHeight.md)로 낮추면 hit-slop 없이는 터치 타깃 미달이다.
    height: touchTarget.min,
    paddingHorizontal: spacing[16],
    borderRadius: radius.full,
  },
  pillLabel: { ...typography.label.small },
})
