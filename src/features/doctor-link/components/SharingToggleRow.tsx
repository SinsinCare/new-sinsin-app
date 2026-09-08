import { Text } from "@/src/design-system-v2/primitives/NativeText"
/**
 * 데이터 공유 설정 화면의 토글 한 줄과, 그 아래 안내 불릿.
 *
 * ## 아이콘 색을 하나로 묶은 이유
 * 시안은 세 줄의 아이콘을 각각 주황·노랑·빨강으로 칠했다. 여기서는 전부
 * `label.neutral` 한 색이다. 이 앱의 색 규칙이 "프라이머리 하나 + 그레이스케일"
 * 이기 때문이다 — 빨강은 이미 `status.negative`(위험 수치)를, 노랑은
 * `status.cautionary`(주의)를 뜻한다. 같은 색을 아무 의미 없는 장식으로 여기서
 * 쓰면, 정작 검사 결과 화면에서 빨강이 나왔을 때 그게 경고인지 그냥 아이콘 색인지
 * 읽는 사람이 구분할 수 없게 된다. 세 줄은 서로 위계가 없으므로 색으로 나눌 이유도 없다.
 */

import { StyleSheet, View } from "react-native"

import {
  V2Icon,
  V2Switch,
  radius,
  spacing,
  typography,
  useV2Theme,
  type V2IconName,
} from "@/src/design-system-v2"

/** 아이콘 타일 한 변. 시안의 라운드 스퀘어. */
const TILE = 40

export type SharingToggleRowProps = {
  icon: V2IconName
  title: string
  body: string
  value: boolean
  onValueChange: (next: boolean) => void
  disabled?: boolean
  /**
   * `highlight` 는 실시간 전송 카드 전용 — 브랜드 틴트 면 위에 얹힌다.
   * 나머지 세 줄은 `plain`(면 없음)이라 화면 배경 위에 그대로 놓인다.
   */
  tone?: "plain" | "highlight"
}

export function SharingToggleRow({
  icon,
  title,
  body,
  value,
  onValueChange,
  disabled = false,
  tone = "plain",
}: SharingToggleRowProps) {
  const { colors } = useV2Theme()
  const isHighlight = tone === "highlight"

  return (
    <View
      style={[
        styles.row,
        isHighlight && [
          styles.highlight,
          { backgroundColor: colors.primary.primaryWeak },
        ],
      ]}
    >
      <View style={[styles.tile, { backgroundColor: colors.fill.background }]}>
        <V2Icon name={icon} size="sm" color={colors.label.neutral} />
      </View>

      <View style={styles.texts}>
        <Text style={[styles.title, { color: colors.label.normal }]}>
          {title}
        </Text>
        <Text style={[styles.body, { color: colors.label.alternative }]}>
          {body}
        </Text>
      </View>

      <V2Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityLabel={title}
      />
    </View>
  )
}

/**
 * 공유 동의 안내 한 줄. 불릿을 문자로 찍지 않고 원을 그리는 이유는
 * 문자 불릿("·"·"•")이 폰트·로케일마다 굵기와 세로 위치가 달라지기 때문이다.
 */
export function SharingNoticeItem({ text }: { text: string }) {
  const { colors } = useV2Theme()
  return (
    <View style={styles.notice}>
      <View style={[styles.dot, { backgroundColor: colors.label.assistive }]} />
      <Text style={[styles.noticeText, { color: colors.label.alternative }]}>
        {text}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
  },
  highlight: {
    padding: spacing[16],
    borderRadius: radius.lg,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  texts: {
    flex: 1,
    gap: spacing[2],
  },
  title: {
    ...typography.title.xSmallWeak,
  },
  body: {
    ...typography.subtext.medium,
  },
  notice: {
    flexDirection: "row",
    gap: spacing[8],
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: radius.full,
    // 불릿이 첫 줄 글자 중앙에 오도록. subtext.medium 의 lineHeight 절반 언저리.
    marginTop: 9,
  },
  noticeText: {
    ...typography.subtext.medium,
    flex: 1,
  },
})
