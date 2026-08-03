// Design System v2 — Modal (확인/경고 다이얼로그)
// Spec: project/design-system-v2/design-system-base/components/Dialog.md (Figma node 217:2542)
//
// Figma의 Dialog(Alert/Confirm)를 RN 관점으로 매핑:
//  - Kind=Alert   → 단일 주 액션 (secondaryLabel 없음)
//  - Kind=Confirm → 보조 + 주 액션 2버튼 (secondaryLabel 주입 시)
//  - Button Area / options(가로·세로) → `buttonLayout` prop
//
// 하단 버튼은 공용 V2Button을 "조립"(Confirm은 Button size=L 재사용).
//  주 액션 = Brand/Fill(destructive면 Danger/Fill), 보조 액션 = Neutral/Weak.
//
// 보정(Dialog.md `## 참고`):
//  - Dialog 컴포넌트 자체엔 스크림/딤이 없음 → 이 컴포넌트가 딤 배경을 소유(colors.background.dim).
//  - Figma 토큰 오타 `label/nomal` → `label.normal`로 사용.
//  - Alert/Confirm 버튼영역 구조 차이 반영: Alert=우측 정렬 단일 버튼, Confirm=가로 분할 / 세로 스택.

import { Pressable, StyleSheet, Text, View } from "react-native"
// 네이티브 Modal 직접 사용 금지 — 전이 직렬화 게이트를 통과해야 한다(AppModal 머리말)
import { AppModal } from "@/src/shared/components/AppModal"
import { radius, spacing, typography } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"
// 배럴(../components) 대신 직접 경로 import — 순환참조 방지
import { V2Button } from "./V2Button"

export type V2ModalButtonLayout = "horizontal" | "vertical"

export type V2ModalProps = {
  /** 표시 여부 */
  visible: boolean
  /** 스크림 탭 / Android 뒤로가기 시 호출 (모달 닫기 요청) */
  onRequestClose: () => void
  /** 제목 (필수) */
  title: string
  /** 설명 (옵션) */
  description?: string
  /** 주 액션 라벨 */
  primaryLabel: string
  /** 주 액션 콜백 */
  onPrimary: () => void
  /** 보조 액션 라벨 — 주입 시 Confirm(2버튼)로 렌더 */
  secondaryLabel?: string
  /** 보조 액션 콜백 */
  onSecondary?: () => void
  /** Confirm 2버튼 배치 (기본 가로) */
  buttonLayout?: V2ModalButtonLayout
  /** 파괴적 액션 — 주 액션을 Danger/Fill로 */
  destructive?: boolean
}

export function V2Modal({
  visible,
  onRequestClose,
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  buttonLayout = "horizontal",
  destructive = false,
}: V2ModalProps) {
  const { colors } = useV2Theme()
  // secondaryLabel 유무로 Alert(1버튼) / Confirm(2버튼) 결정
  const isConfirm = secondaryLabel != null
  const isVertical = buttonLayout === "vertical"

  // 주 액션 — Brand/Fill (destructive면 Danger/Fill)
  const primaryButton = (
    <V2Button
      size="l"
      color={destructive ? "danger" : "brand"}
      variant="fill"
      onPress={onPrimary}
      fullWidth={!isConfirm || isVertical}
      style={isConfirm && !isVertical ? styles.flexButton : undefined}
    >
      {primaryLabel}
    </V2Button>
  )

  // 보조 액션 — Neutral/Weak
  const secondaryButton = isConfirm ? (
    <V2Button
      size="l"
      color="neutral"
      variant="weak"
      onPress={onSecondary}
      fullWidth={isVertical}
      style={!isVertical ? styles.flexButton : undefined}
    >
      {secondaryLabel}
    </V2Button>
  ) : null

  return (
    <AppModal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onRequestClose}
    >
      {/* 딤 배경(스크림) — 탭 시 닫기 요청 */}
      <Pressable
        style={[styles.scrim, { backgroundColor: colors.background.dim }]}
        onPress={onRequestClose}
      >
        {/* 카드 — 내부 탭이 스크림으로 전파되지 않도록 흡수 */}
        <Pressable
          style={[styles.card, { backgroundColor: colors.background.default }]}
          onPress={() => {}}
        >
          {/* 텍스트 영역 */}
          <View style={styles.textContainer}>
            {/* 제목·본문 모두 한글 어절 단위로 끊는다. 없으면 iOS 가 어절 중간에서
                줄을 넘겨 `인증번호를 보낼 수 없어` / `요` 같은 줄이 나온다 — 한 번
                읽고 바로 행동해야 하는 안내문에서 특히 나쁘다. */}
            <Text
              style={[typography.title.small, { color: colors.label.normal }]}
              lineBreakStrategyIOS="hangul-word"
              textBreakStrategy="balanced"
            >
              {title}
            </Text>
            {description != null && (
              <Text
                style={[
                  typography.subtext.large,
                  { color: colors.label.neutral },
                ]}
                lineBreakStrategyIOS="hangul-word"
                textBreakStrategy="balanced"
              >
                {description}
              </Text>
            )}
          </View>

          {/* 버튼 영역 — Alert(우측 단일) / Confirm(가로 분할·세로 스택) */}
          <View
            style={[
              styles.buttonArea,
              isConfirm
                ? isVertical
                  ? styles.buttonAreaVertical
                  : styles.buttonAreaHorizontal
                : styles.buttonAreaAlert,
            ]}
          >
            {/* 가로=보조 좌 / 주 우, 세로=주 위 / 보조 아래 */}
            {isVertical ? (
              <>
                {primaryButton}
                {secondaryButton}
              </>
            ) : (
              <>
                {secondaryButton}
                {primaryButton}
              </>
            )}
          </View>
        </Pressable>
      </Pressable>
    </AppModal>
  )
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[24],
  },
  card: {
    width: "100%",
    maxWidth: 320,
    borderRadius: radius["3xl"], // 24
    overflow: "hidden",
  },
  // 텍스트 컨테이너: 상단/좌우 패딩 + Title/Description 간 gap 8
  textContainer: {
    paddingTop: spacing[24],
    paddingHorizontal: spacing[24],
    gap: spacing[8],
  },
  // 버튼 영역 공통: 좌우 패딩 16
  buttonArea: {
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[16],
    gap: spacing[8],
  },
  // Alert: 우측 정렬 단일 버튼
  buttonAreaAlert: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: spacing[16],
  },
  // Confirm 가로: 좌 보조 / 우 주, 각 flex 분할
  buttonAreaHorizontal: {
    flexDirection: "row",
    paddingTop: spacing[20],
  },
  // Confirm 세로: 주 위 / 보조 아래, 각 full-width
  buttonAreaVertical: {
    flexDirection: "column",
    paddingTop: spacing[20],
  },
  // 가로 분할 시 각 버튼 균등 폭
  flexButton: { flex: 1 },
})
