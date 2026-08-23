// Design System v2 — Toast (Figma `Design-system_Mobile` node-id=571-2529)
//
// 통보 한 종류의 **얼굴**을 여기서만 정한다. 위치·수명·애니메이션은 호출부의 몫이다 —
// 앱에는 통보가 뜨는 자리가 둘이고(루트 하단 / 네이티브 모달 안 플로팅) 그 둘의
// 위치 규칙이 다르기 때문이다. 얼굴만 하나로 모으면 자리가 달라도 같은 통보로 읽힌다.
//
// 이걸 만들기 전에는 얼굴이 둘이었다:
//   - `src/shared/components/Toast.tsx` — 어두운 필 + 아이콘 + 제목/본문/버튼
//   - `src/features/consultation/components/CopyToast.tsx` — 44줄짜리 별도 필(복사 확인 전용)
// 색·자간·라디우스가 제각각이었고 둘 다 리터럴 hex 를 들고 있었다.
//
// 남은 것(디자이너 확인 필요): Figma 는 폭 변형을 둘(고정/유동) 두는데 여기서는
// 유동 하나만 만들었다. 앱에 고정폭 토스트가 필요한 자리가 아직 없다.

import type { ReactElement } from "react"
// v2 컴포넌트는 `typography` 토큰이 face 를 들고 있어 RN 의 Text 를 그대로 쓴다
// (`shared/components/AppText` 는 `fontWeight` 만 쓰는 레거시 스타일을 위한 것이다).
import { StyleSheet, Text, View } from "react-native"

import { V2Icon } from "./V2Icon"
import type { V2IconName } from "../icons"
import { useV2Theme } from "../hooks/useV2Theme"
import { borderWidth, radius, spacing, typography } from "../tokens"
import {
  toastBackgroundColor,
  toastBorderColor,
  type V2ToastVariant,
} from "./toastChrome"

/** 공개 타입은 기존 import 경로를 깨지 않게 다시 내보낸다. */
export type { V2ToastVariant } from "./toastChrome"

const ICON: Record<V2ToastVariant, V2IconName | null> = {
  success: "safety",
  caution: "caution",
  error: "danger",
  // 기본은 아이콘 없이 문장만. 복사 확인처럼 "됐다"만 알리는 통보가 여기 온다.
  default: null,
}

export type V2ToastCardProps = {
  variant?: V2ToastVariant
  title: string
  /** 다음에 뭘 하면 되는지. 오류에서 특히 중요하다. */
  message?: string
  /** 한 번의 탭으로 끝나는 해결이면 문장 대신 버튼을 준다. */
  action?: { label: string; onPress: () => void }
  /** 버튼 렌더는 호출부가 맡는다(토스트 라이브러리마다 닫는 방법이 다르다). */
  renderAction?: (action: {
    label: string
    onPress: () => void
  }) => ReactElement
}

/**
 * 통보 카드.
 *
 * 라이트는 어두운 잉크 필, 다크는 화면 body와 같은 면을 쓴다. 다크에서 고정 잉크를
 * 쓰면 OKLCH L뿐 아니라 chroma가 달라 남보라 카드 하나만 튀었다(실측 지적).
 * 다크의 분리는 면 명도가 아니라 **1px 얕은 보더**가 담당한다.
 */
export function V2ToastCard({
  variant = "default",
  title,
  message,
  action,
  renderAction,
}: V2ToastCardProps) {
  const { colors, primitives, mode } = useV2Theme()

  const iconName = ICON[variant]
  const semanticColor =
    variant === "success"
      ? primitives.green[400]
      : variant === "caution"
        ? primitives.lightOrange[400]
        : variant === "error"
          ? primitives.red[400]
          : primitives.grayscale[400]
  const borderColor = toastBorderColor(variant, {
    lineAlternative: colors.line.alternative,
    success: primitives.green[400],
    caution: primitives.lightOrange[400],
    error: primitives.red[400],
  })
  const backgroundColor = toastBackgroundColor(mode, {
    lightInk: primitives.grayscale[900],
    darkBody: colors.background.default,
  })

  return (
    <View
      style={[
        styles.card,
        // 라이트는 잉크 필, 다크는 body와 같은 L/chroma. 경계는 22% 보더가 맡는다.
        {
          backgroundColor,
          borderColor,
        },
      ]}
    >
      <View style={styles.row}>
        {iconName ? (
          <V2Icon
            name={iconName}
            size={20}
            color={semanticColor}
            style={styles.icon}
          />
        ) : null}
        <View style={styles.texts}>
          <Text
            style={[styles.title, { color: colors.static.white }]}
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
            numberOfLines={2}
          >
            {title}
          </Text>
          {message ? (
            <Text
              style={[styles.message, { color: `${colors.static.white}b3` }]}
              lineBreakStrategyIOS="hangul-word"
              textBreakStrategy="balanced"
              // 해결 방법이 잘리면 토스트가 하는 일이 없어진다.
              numberOfLines={4}
            >
              {message}
            </Text>
          ) : null}
        </View>
      </View>
      {action && renderAction ? (
        // 버튼은 글줄 옆이 아니라 아래에 둔다. 옆에 두면 본문 폭이 390pt 화면에서
        // 284 → 198pt 로 줄어 13pt 한글 한 줄이 21자에서 15자가 되고, 두 줄이면
        // 끝나던 안내가 세 줄로 늘면서 어절이 줄 끝에서 잘리는 자리가 늘어난다.
        <View style={[styles.actionRow, iconName ? styles.actionIndent : null]}>
          {renderAction(action)}
        </View>
      ) : null}
    </View>
  )
}

/** 아이콘 폭(20) + 아이콘과 글줄 사이(10). 버튼 줄을 글줄에 맞춰 들여쓸 때 쓴다. */
const TEXT_INDENT = 30

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderRadius: radius["2xl"],
    borderWidth: borderWidth.thin,
  },
  // 아이콘은 제목 첫 줄에 맞춘다. 두세 줄짜리 안내에서 가운데 정렬하면
  // 아이콘이 본문 옆으로 내려가 제목과의 관계가 끊긴다.
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing[8] },
  icon: { flexShrink: 0, marginTop: 1 },
  texts: { flexShrink: 1, flexGrow: 1 },
  // 위계: 제목은 face 로, 본문은 크기와 투명도로 내린다.
  // 크기만으로 나누면 어두운 면에서 둘 다 강해 보인다.
  title: typography.label.small,
  message: { ...typography.subtext.medium, marginTop: 2 },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: spacing[8],
  },
  actionIndent: { marginLeft: TEXT_INDENT },
})
