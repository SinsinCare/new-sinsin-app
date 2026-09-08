import { create } from "zustand"

/**
 * 푸드 카메라 **페이지**(`app/food-camera.tsx`)와 여는 쪽(홈 RecordView)의 다리.
 *
 * 등록 절차 시안(2026-09-04, camera.svg): 식사 시트에서 "사진 촬영하기" 를 누르면
 * OS 카메라가 아니라 **앱 안의 카메라 페이지**가 밀려 들어오고, 셔터를 누르면 그
 * 사진으로 분석이 시작된다. 페이지는 사진 URI 만 알고 분석은 여는 쪽이 하므로,
 * 여는 쪽이 여기 `onCapture` 를 두고 페이지가 셔터 뒤에 부른다. 취소(X)는
 * `onCancel` — 예전 OS 카메라의 취소와 같이 시트로 되돌아간다.
 */
interface FoodCameraState {
  handlers: {
    onCapture: (uri: string) => void
    onCancel: () => void
  } | null
  set: (handlers: NonNullable<FoodCameraState["handlers"]>) => void
  clear: () => void
}

export const useFoodCameraStore = create<FoodCameraState>()((set) => ({
  handlers: null,
  set: (handlers) => set({ handlers }),
  clear: () => set({ handlers: null }),
}))
