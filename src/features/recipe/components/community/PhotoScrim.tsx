/**
 * **140pt 사진 스크림** — 사진 위 흰 크롬(배지·아바타·닉네임·캡션·진행바)이 읽히게 하는 층.
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.19 · §5.18 · §4-G18 (WBS 1.15).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 이 층이 없으면 대비가 **정의되지 않는다**
 *
 * §5.18 의 판정: 임의의 사진 위에 놓인 글리프의 대비는 계산할 수 없다(밝은 하늘 사진에서
 * 흰 ✕ 는 사라진다). 그래서 "사진 위 컨트롤은 `static.white` + 스크림" 이 한 세트다 —
 * 스크림을 빼고 흰 글자만 쓰면 어두운 사진에서만 우연히 읽힌다.
 *
 * 스토리 뷰어(S12)는 하단(`bottom`), 스토리 작성(S13)의 떠 있는 헤더는 상단(`top`).
 *
 * ■ 끝점은 `"transparent"` 가 아니다
 *
 * RN 의 `"transparent"` 는 투명한 검정이라 **검정 스크림에서는 색이 안 흔들리지만**,
 * 그래도 같은 규칙을 쓴다(`EdgeFade.transparentOf`): 끝점을 한 곳에서 만들면 나중에
 * 스크림 색을 검정이 아닌 값으로 바꿔도 회색 띠가 생기지 않는다.
 *
 * ■ 색은 지어내지 않는다
 *
 * §2.19 는 `rgba(0,0,0,0.30)` 을 적었는데 그 값은 원시 팔레트에 이미 있다 —
 * `primitives.opacityBlack["300"]`(`#0000004d`, 0x4d/255 = 0.302). 리터럴을 쓰면 같은
 * 역할에 두 값이 생기고 eslint 도 막는다(디자인 계보 래칫).
 */
import { StyleSheet } from "react-native"
import { LinearGradient } from "expo-linear-gradient"

import { useV2Theme } from "@/src/design-system-v2/hooks/useV2Theme"

import { transparentOf } from "./EdgeFade"

/** 시안 실측 — 미디어 가장자리에서 스크림이 완전히 사라지기까지(§2.19). */
export const PHOTO_SCRIM_HEIGHT = 140

/** 사진의 어느 변에 붙는가. 하단이 기본(스토리 뷰어의 오버레이가 전부 아래에 있다). */
export type PhotoScrimAnchor = "bottom" | "top"

export type PhotoScrimProps = {
  anchor?: PhotoScrimAnchor
}

export function PhotoScrim({ anchor = "bottom" }: PhotoScrimProps) {
  const { primitives } = useV2Theme()
  // 사진 위라 두 모드가 같다 — 시맨틱이 아니라 원시 알파 팔레트를 본다.
  const dark = primitives.opacityBlack["300"]
  const clear = transparentOf(dark)

  return (
    <LinearGradient
      pointerEvents="none"
      colors={anchor === "top" ? [dark, clear] : [clear, dark]}
      style={[styles.scrim, anchor === "top" ? styles.top : styles.bottom]}
    />
  )
}

const styles = StyleSheet.create({
  scrim: {
    position: "absolute",
    left: 0,
    right: 0,
    height: PHOTO_SCRIM_HEIGHT,
  },
  bottom: { bottom: 0 },
  top: { top: 0 },
})
