// Design System v2 — Bottom Sheet
// Spec: project/design-system-v2/design-system-base/components/Bottom-Sheet.md (Figma set 91:10642)
//
// 하단에서 올라오는 시트. 구성: RN Modal(transparent) + dim 스크림(탭 시 닫힘) + 하단 앵커 시트.
// 시트 = 핸들 → (옵션)Title/SubTitle → children(콘텐츠 슬롯) → (옵션)footer 버튼(V2Button size xl).
//
// 보정(Bottom-Sheet.md 참고):
//  - Figma 토큰 키 `label/nomal` 오타 → `label.normal`로 사용.
//  - 스크림(dim)은 이 컴포넌트가 소유(Dialog와 반대). 사용처에서 별도 오버레이 불필요.
//  - max-height 토큰 미노출 → 내용 기반 높이. 콘텐츠가 길 때의 스크롤/최대높이 정책은
//    소비처가 children 안에서 결정(예: ScrollView로 감싸기). 여기선 강제하지 않음.
//  - 애니메이션: 스크림(딤)과 시트를 분리한다. 스크림은 제자리 opacity 페이드,
//    시트만 translateY 슬라이드. (Modal animationType="slide"는 스크림까지 시트에 붙여
//    함께 슬라이드시켜 "검은 박스를 달고 올라오는" 것처럼 보이므로 쓰지 않는다.)

import { type ReactNode, useEffect, useRef, useState } from "react"
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { radius, spacing, typography } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"
import { V2Button } from "./V2Button"
import { useTranslation } from "react-i18next"

export type V2BottomSheetProps = {
  /** 표시 여부 */
  visible: boolean
  /** dim 탭 / Android 뒤로가기 / 닫기 요청 시 호출 */
  onClose: () => void
  /** 상단 타이틀 (typography.title.small) */
  title?: string
  /** 타이틀 아래 보조 설명 (typography.subtext.large) */
  subTitle?: string
  /** 콘텐츠 슬롯 (길면 소비처에서 ScrollView 등으로 스크롤 처리) */
  children?: ReactNode
  /** 주 액션 라벨 (Brand/Fill) */
  primaryLabel?: string
  onPrimary?: () => void
  /** 보조 액션 라벨 (Neutral/Weak) */
  secondaryLabel?: string
  onSecondary?: () => void
  /** 뒤 배경 딤(스크림) 표시. 기본 true (false여도 탭-투-클로즈는 유지) */
  dim?: boolean
}

/**
 * v2 하단 시트.
 * @example
 * <V2BottomSheet
 *   visible={open}
 *   onClose={() => setOpen(false)}
 *   title="삭제할까요?"
 *   subTitle="이 작업은 되돌릴 수 없어요."
 *   primaryLabel="삭제"
 *   onPrimary={handleDelete}
 *   secondaryLabel="취소"
 *   onSecondary={() => setOpen(false)}
 * >
 *   <MyContent />
 * </V2BottomSheet>
 */
export function V2BottomSheet({
  visible,
  onClose,
  title,
  subTitle,
  children,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  dim = true,
}: V2BottomSheetProps) {
  const { t } = useTranslation()
  const { colors } = useV2Theme()
  const insets = useSafeAreaInsets()
  const { height: screenHeight } = useWindowDimensions()

  const hasPrimary = !!primaryLabel
  const hasSecondary = !!secondaryLabel
  const hasFooter = hasPrimary || hasSecondary
  // 2버튼: 좌 보조(Neutral/Weak) / 우 주(Brand/Fill), 각 flex-1 (Bottom-Sheet.md 배치표)
  const hasTwoButtons = hasPrimary && hasSecondary

  // 스크림(딤)과 시트를 각각 독립 애니메이션한다(위 헤더 주석 참고).
  //  - backdropOpacity: 스크림 제자리 페이드(0=투명 → 1=딤)
  //  - translateY: 시트 슬라이드(screenHeight=화면 밖 아래 → 0=제자리)
  //  닫힘 애니메이션을 끝까지 보여주려고 rendered로 Modal 마운트를 유지한다.
  const [rendered, setRendered] = useState(visible)
  const backdropOpacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(screenHeight)).current

  useEffect(() => {
    if (visible) {
      setRendered(true)
      translateY.setValue(screenHeight) // 열기 직전 항상 화면 밖 아래에서 시작
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start()
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: screenHeight,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setRendered(false) // 닫힘 완료 후 언마운트
      })
    }
    // rendered는 애니메이션 종료 콜백으로만 바뀌므로 deps에서 제외(열림 재트리거 방지).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  return (
    <Modal
      visible={rendered}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        {/* 스크림: 제자리 opacity 페이드 + 탭-투-클로즈. 시트와 분리되어 함께 슬라이드하지 않는다. */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("action.close")}
            onPress={onClose}
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: dim ? colors.background.dim : "transparent" },
            ]}
          />
        </Animated.View>

        {/* 시트 본체 (하단 앵커) — translateY로 독립 슬라이드 */}
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background.default,
              // 하단 내부 패딩 20 + safe-area 하단
              paddingBottom: spacing[20] + insets.bottom,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* 1) 핸들 바 (48×4, radius full, label.disable) */}
          <View style={styles.handleArea}>
            <View
              style={[
                styles.handleBar,
                { backgroundColor: colors.label.disable },
              ]}
            />
          </View>

          {/* 2) 헤더 — Title(옵션) + SubTitle(옵션) */}
          {!!title && (
            <Text style={[styles.title, { color: colors.label.normal }]}>
              {title}
            </Text>
          )}
          {!!subTitle && (
            <Text style={[styles.subTitle, { color: colors.label.neutral }]}>
              {subTitle}
            </Text>
          )}

          {/* 3) 콘텐츠 슬롯 */}
          {children}

          {/* 4) 푸터 — Button Area (V2Button size xl) */}
          {hasFooter && (
            <View style={styles.footer}>
              {hasSecondary && (
                <V2Button
                  size="xl"
                  color="neutral"
                  variant="weak"
                  fullWidth={!hasTwoButtons}
                  style={hasTwoButtons ? styles.footerButton : undefined}
                  onPress={onSecondary}
                >
                  {secondaryLabel}
                </V2Button>
              )}
              {hasPrimary && (
                <V2Button
                  size="xl"
                  color="brand"
                  variant="fill"
                  fullWidth={!hasTwoButtons}
                  style={hasTwoButtons ? styles.footerButton : undefined}
                  onPress={onPrimary}
                >
                  {primaryLabel}
                </V2Button>
              )}
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    // 상단 radius 28 (하단은 화면 밖 → top radius만 시각화)
    borderTopLeftRadius: radius["4xl"],
    borderTopRightRadius: radius["4xl"],
    // 가로 패딩은 시트 전체가 아니라 헤더/푸터에만 준다.
    //  → children(리스트 행 등)은 full-bleed. 각 행이 자체 좌우 패딩(sideMargin)으로
    //    제목·안내문과 같은 x에 정렬되고, 눌림/구분선도 시트 폭 전체로 자연스럽게 확장된다.
    //  (일반 텍스트 등 자체 여백이 없는 콘텐츠는 소비처가 감싸며 패딩을 준다.)
  },
  handleArea: {
    alignItems: "center",
    paddingTop: spacing[16],
  },
  handleBar: {
    width: 48,
    height: 4,
    borderRadius: radius.full,
  },
  title: {
    ...typography.title.small,
    marginTop: spacing[20],
    paddingHorizontal: spacing[24],
  },
  subTitle: {
    ...typography.subtext.large,
    marginTop: spacing[8],
    paddingHorizontal: spacing[24],
  },
  footer: {
    flexDirection: "row",
    gap: spacing[8],
    marginTop: spacing[32],
    paddingHorizontal: spacing[24],
  },
  footerButton: { flex: 1 },
})
