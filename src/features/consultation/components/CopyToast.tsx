import Animated, { FadeInDown, FadeOut } from "react-native-reanimated"

import { V2ToastCard } from "@/src/design-system-v2/components/V2Toast"

/**
 * 복사 확인 토스트.
 *
 * **얼굴은 앱의 통보와 같은 것**(`V2ToastCard`)이고, 여기서 정하는 것은 자리뿐이다.
 * 예전에는 이 파일이 자기 필(색·자간·라디우스·그림자)을 따로 들고 있어서
 * 같은 "됐다" 통보가 화면마다 다르게 생겼었다.
 *
 * ## 왜 `showSuccessToast` 를 쓰지 않는가
 *
 * 상담은 `presentation: "modal"` 로 뜨는 네이티브 모달 라우트다. 루트의 토스트
 * 호스트는 그 모달 **뒤에** 그려져 안 보인다(같은 이유로 RN Modal 안에는
 * `ModalOverlayHost` 를 넣는다 — shared/components 참고).
 *
 * 호스트를 하나 더 얹는 대신 이 플로팅 배치를 유지한다. 복사는 **키보드가 올라온
 * 상태에서도** 일어나는데 루트 토스트의 하단 오프셋은 탭바 기준이라 키보드에 가린다.
 * 호출부(app/consult.tsx)가 키보드 값을 태워 위치를 잡는다.
 */
export function CopyToast({ message }: { message: string }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOut.duration(180)}
    >
      <V2ToastCard variant="default" title={message} />
    </Animated.View>
  )
}
