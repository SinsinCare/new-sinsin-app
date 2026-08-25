// Design System v2 — Avatar
// Spec: docs/design/community-redesign/00-MASTER.md §2.10 · §4-G12 / 실측: author-profile.md
//
// 원형 아바타 하나. 사진이 있으면 사진, 없으면 **채워진** 사람 글리프.
//
// ■ 크기 축은 시안이 실제로 쓰는 여섯 개뿐이다(§2.10)
//   24(피드 헤더) · 28(상세 작성자 행) · 40(스토리 오버레이) · 48(팔로워 행·작성자 카드)
//   56(프로필 헤더) · 60(신신이웃 행). 자유 숫자를 받지 않는 이유는 "아무 값이나 되면
//   화면마다 다른 값이 생기기 때문"이다 — 그게 이 DS 가 존재하는 이유다.
//
// ■ 글리프는 아바타와 **같은 px** 로 그린다
//   `icon-profile-filled.svg` 는 24 박스 안에서 글리프가 17.2 × 20.62 를 차지하도록
//   그려졌다(원 cx12 cy6.6 r4.9 → x 7.1~16.9 / y 1.7~11.5, 몸통 x 3.4~20.6 / y ~22.32).
//   그래서 아이콘을 아바타 크기 그대로 렌더하면
//     48 → 17.2/24×48 = **34.4 × 41.2**,  60 → **43.0 × 51.6**
//   이고 이것이 시안 실측(48 에서 34.3 × 41.1, 60 에서 42.9 × 51.4, author-profile.md
//   §"Avatar")과 0.4% 안에서 같다. **비율 계수를 따로 두지 않는다** — 글리프가 그
//   비율로 그려져 있으므로 계수를 넣는 순간 정본이 둘이 된다.
//   어깨가 원 밖으로 나가는 부분은 `overflow: "hidden"` 이 잘라 낸다(시안도 잘린 모양).
//
// ■ 원격 사진은 `expo-image`
//   프로젝트 표준이다(원격 사진 = expo-image: 디스크 캐시·다운스케일 디코드).
//   아바타 URL 은 **15분마다 도는 서명 URL** 이라 만료된 링크로 실패하는 일이 실제로
//   있다. 실패하면 빈 원이 남는 대신 **자리표시 글리프로 되돌아간다.**
//   실패 상태를 boolean 이 아니라 **실패한 URL** 로 들고 있는 이유가 여기 있다 —
//   서명이 새로 돌아 `uri` 가 바뀌면 조건이 저절로 풀려 다시 시도한다. boolean 이면
//   한 번 만료된 아바타가 새 URL 을 받아도 영영 글리프로 남는다.

import { useState } from "react"
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
// 원격 사진은 expo-image — 디스크 캐시·다운스케일 디코드로 목록 스크롤이 가볍다
import { Image } from "expo-image"
import {
  remoteImageSource,
  stableImageCacheKey,
} from "@/src/shared/images/remoteImageSource"

import { radius } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"
// 배럴(../components) 대신 직접 경로 import — 순환참조 방지
import { V2Icon } from "./V2Icon"

/** 시안이 쓰는 여섯 지름(§2.10). */
export type V2AvatarSize = 24 | 28 | 40 | 48 | 56 | 60

export type V2AvatarProps = {
  size: V2AvatarSize
  /** 프로필 사진 URL(서명 URL). 없거나 로드 실패면 자리표시 글리프. */
  uri?: string | null
  /**
   * 스크린리더 이름(예: `${닉네임}의 프로필 사진`). 주지 않으면 장식으로 보고
   * 접근성 트리에서 건너뛴다 — 이름 옆에 붙는 아바타는 보통 장식이다.
   */
  accessibilityLabel?: string
  style?: StyleProp<ViewStyle>
}

export function V2Avatar({
  size,
  uri,
  accessibilityLabel,
  style,
}: V2AvatarProps) {
  const { colors } = useV2Theme()
  // "무엇이 실패했나" 를 들고 있다 — 서명이 새로 돌면 조건이 저절로 풀린다(머리말).
  const [failedUri, setFailedUri] = useState<string | null>(null)

  const source = uri != null && uri !== "" ? uri : null
  const showPhoto = source !== null && failedUri !== source

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          backgroundColor: colors.fill.pressed,
        },
        style,
      ]}
      accessible={accessibilityLabel != null}
      accessibilityRole={accessibilityLabel != null ? "image" : undefined}
      accessibilityLabel={accessibilityLabel}
    >
      {showPhoto ? (
        <Image
          source={remoteImageSource(source)}
          style={styles.photo}
          contentFit="cover"
          // FlashList 는 행을 재활용한다 — 키가 없으면 새 행에 옛 사진이 한 프레임 남는다.
          // 키는 서명 회전(15분)에 불변 — URL 이 바뀌어도 같은 사진이면 리셋하지 않는다.
          // onError 의 failedUri 비교는 uri 기준 그대로: 새 서명 URL 이 오면 재시도가 풀린다.
          recyclingKey={stableImageCacheKey(source) ?? source}
          onError={() => setFailedUri(source)}
        />
      ) : (
        <V2Icon
          name="profileFilled"
          size={size}
          color={colors.label.assistive}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  circle: {
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    // 사진의 네 귀퉁이와, 원 밖으로 나가는 글리프 어깨를 자른다.
    overflow: "hidden",
  },
  photo: { width: "100%", height: "100%" },
})
