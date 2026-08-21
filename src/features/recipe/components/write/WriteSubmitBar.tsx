/**
 * 하단 등록 바 — **왜 못 누르는지를 버튼 위에 적는다.**
 *
 * 시안(`Home_Recipes_writing-16`)은 등록 버튼이 회색인데 이유가 화면 어디에도 없다.
 * 사용자는 위로 올라가 다섯 칸을 다시 살펴야 하고, 그중 어느 것이 필수인지도 모른다.
 * 여기서는 남은 것 중 **첫 번째 한 줄**만 말한다("한줄 소개를 적어 주세요") —
 * 다섯 개를 한꺼번에 나열하면 그것도 읽히지 않는다.
 *
 * 다 채우면 그 자리에 "이제 등록할 수 있어요" 가 들어간다. 자리를 비우면 문구가
 * 사라질 때 버튼이 위로 튀어 손가락 아래 위치가 바뀐다.
 *
 * **이 한 줄은 시안에 없지만 유지한다.** 시안은 헤더의 `필수 n/5` 와 섹션 아코디언으로
 * "무엇이 남았나" 를 말하고 있었는데 둘 다 사라졌다. 그러면 회색 버튼의 이유를 말해 주는
 * 자리가 여기 하나만 남는다. 게다가 이 문구는 버튼을 막는 것과 **같은 계산**에서 나오므로
 * 구조적으로 거짓말을 할 수 없다 — 지우면 그 보증도 같이 사라진다.
 *
 * ## 상단 헤어라인을 그라데이션 페이드로 바꾼 이유
 *
 * 시안 실측: 바 위 **36pt** 가 흰색으로 사라진다(§2 의 y=1160 구간). 헤어라인은 "여기서
 * 스크롤이 끝난다" 고 잘라 말하지만, 페이드는 "아래로 더 있다" 를 남긴다 — 긴 폼에서
 * 후자가 맞다. 선 하나를 지우고 페이드를 넣는 것이지 둘을 겹치지 않는다(겹치면 페이드가
 * 만든 부드러운 경계를 선이 도로 잘라 버린다).
 *
 * 페이드 색은 `"transparent"` 가 **아니라** `s.canvas` 에 알파 `00` 을 붙인 값이다.
 * RN 의 `transparent` 는 투명한 **검정**이라, 흰 면으로 사라지는 그라데이션에 쓰면
 * 중간 구간이 회색으로 뜬다(안드로이드에서 특히 눈에 띈다). 같은 색의 알파 0 → 알파 1 로
 * 가야 색상이 흔들리지 않는다. 다크 모드도 같은 규칙으로 자동으로 맞는다.
 *
 * 페이드는 **레이아웃을 차지하지 않는다**(절대 배치, `top: -36`). 흐름에 넣으면 본문이
 * 36pt 위로 밀리고, 화면 바닥이 이미 `s.canvas` 라 그 자리는 아무것도 안 보이는 빈 띠가 된다.
 * 페이드가 값을 하는 것은 **본문이 그 아래로 지나갈 때뿐**이다.
 *
 * 절대 배치의 기준을 잡으려고 바깥에 패딩 없는 껍데기 `View` 를 하나 두었다. 바 자신에
 * 붙이면 `left/top` 이 바의 `paddingHorizontal`·`paddingTop` 기준인지 테두리 기준인지가
 * Yoga 버전에 따라 갈려서, 여백을 고칠 때마다 페이드가 조용히 어긋난다.
 */

import { LinearGradient } from "expo-linear-gradient"
import { StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"

import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE } from "@/src/theme/surface"

/** 시안 실측(375pt 폭 기준). 바 위에서 본문이 사라지는 구간. */
const FADE_HEIGHT = 36

/**
 * 눌린 브랜드 면의 알파(85%). `V2Button` 이 pressed 를 `opacity: 0.85` 로 처리하는 것과
 * 같은 세기다 — 브랜드 위에 얹을 "한 단 어두운 주황" 토큰이 정본에 없고, 없는 색을
 * 지어내는 대신 이미 있는 값의 알파로 같은 결과를 만든다.
 *
 * `SurfacePressable` 은 면 색을 보간하므로 base 와 pressed 를 같은 값으로 주면 색 반응이
 * 아예 없다(예전 상태). 화면의 유일한 주 버튼이 스케일 1.5% 말고는 아무 말도 안 하는 건
 * 과묵한 게 아니라 안 눌린 것처럼 보인다.
 */
const PRESSED_ALPHA = "d9"

/**
 * `#RRGGBB`/`#RRGGBBAA` 에 알파를 붙인다. `toastChrome.ts` 와 같은 방어다 —
 * 토큰이 언젠가 `rgba()` 나 플랫폼 색으로 바뀌면 깨진 문자열을 만드는 대신 원값을 쓴다.
 *
 * 2026-08 실측: `getSurfacePalette(false/true)` 의 `canvas`·`brand` 는 라이트·다크 모두
 * 알파 없는 6자리 값이라 알파를 그냥 붙일 수 있다. 값이 궁금하면 지어내지 말고
 * `npx tsx -e '...getSurfacePalette(true).canvas'` 로 다시 찍어 볼 것 —
 * 이 파일에 색 값을 적어 두면 그 순간 정본이 둘이 된다.
 */
function withAlpha(color: string, alpha: string): string {
  if (/^#[0-9a-f]{8}$/iu.test(color)) return `${color.slice(0, 7)}${alpha}`
  if (/^#[0-9a-f]{6}$/iu.test(color)) return `${color}${alpha}`
  return color
}

interface WriteSubmitBarProps {
  /** 버튼 위 한 줄. 남은 것이 있으면 그 이유, 없으면 준비됐다는 말. */
  statusText: string
  label: string
  onPress: () => void
  disabled: boolean
  /**
   * 바 아래 여백. 호출부가 safe-area 를 알고 있으므로 여기서 재계산하지 않는다.
   * 시안 기준값은 `insets.bottom + 20`(§6.7).
   */
  paddingBottom: number
}

export function WriteSubmitBar({
  statusText,
  label,
  onPress,
  disabled,
  paddingBottom,
}: WriteSubmitBarProps) {
  const s = useSurface()

  return (
    <View>
      <LinearGradient
        pointerEvents="none"
        colors={[withAlpha(s.canvas, "00"), s.canvas]}
        style={styles.fade}
      />
      <View style={[styles.bar, { paddingBottom, backgroundColor: s.canvas }]}>
        <Text
          style={[
            styles.status,
            { color: disabled ? s.textMuted : s.textWeak },
          ]}
          accessibilityLiveRegion="polite"
        >
          {statusText}
        </Text>
        <SurfacePressable
          onPress={onPress}
          disabled={disabled}
          accessibilityLabel={`${label}. ${statusText}`}
          baseColor={disabled ? s.ctaOffBg : s.brand}
          pressedColor={
            disabled ? s.ctaOffBg : withAlpha(s.brand, PRESSED_ALPHA)
          }
          haptic={!disabled}
          style={styles.button}
        >
          {/* 비활성 글자는 `s.ctaOffText`(= label.assistive). v2 의 `label.disable` 은
              이 면 위에서 1.3:1 이라 "못 누른다" 가 아니라 "거기 아무것도 없다" 로 읽힌다. */}
          <Text
            style={[
              styles.buttonText,
              { color: disabled ? s.ctaOffText : s.onBrand },
            ]}
          >
            {label}
          </Text>
        </SurfacePressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  /** 흐름 밖. 바로 위 36pt 를 덮는다 — 껍데기에 패딩이 없어 기준이 흔들리지 않는다. */
  fade: {
    position: "absolute",
    left: 0,
    right: 0,
    top: -FADE_HEIGHT,
    height: FADE_HEIGHT,
  },
  bar: {
    paddingHorizontal: LAYOUT.screenX,
    paddingTop: 10,
    gap: 8,
  },
  status: { ...TYPE.caption, textAlign: "center" },
  button: {
    height: LAYOUT.cta.height,
    borderRadius: LAYOUT.cta.radius,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { ...TYPE.cta, fontWeight: "700" },
})
