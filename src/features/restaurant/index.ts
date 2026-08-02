/**
 * 식당 기능의 공개 표면. **route 파일만 여기서 가져간다.**
 *
 * `docs/mobile-frontend-architecture.md` 가 `index.ts` 를 "routes 를 위한 공개 export"
 * 로 규정한다. 지금까지 이 파일이 없어서 `app/(tabs)/restaurant.tsx` 가 컴포넌트 11개를
 * 직접 깊은 경로로 import 하고 좌표 표까지 들고 있었다(281줄) — 그 화면이 반례였다.
 *
 * 훅·타입·유틸은 **내보내지 않는다.** route 가 그것들을 집을 수 있으면 route 안에서
 * 질의를 부르는 일이 다시 생긴다. 화면과 그 화면이 필요한 props 타입까지만 공개한다.
 */

export { RestaurantMapScreen } from "./views/RestaurantMapScreen"
export { RestaurantDetailScreen } from "./views/RestaurantDetailScreen"
export { RestaurantSearchScreen } from "./views/RestaurantSearchScreen"
export { RestaurantListScreen } from "./views/RestaurantListScreen"
export { RestaurantBookmarksScreen } from "./views/RestaurantBookmarksScreen"
export { RestaurantReportScreen } from "./views/RestaurantReportScreen"
export {
  RestaurantPhotosScreen,
  serializePhotoHandoff,
} from "./views/RestaurantPhotosScreen"
export { RestaurantReviewWriteScreen } from "./views/RestaurantReviewWriteScreen"
export { ReviewerProfileScreen } from "./views/ReviewerProfileScreen"
export { RestaurantComingSoon } from "./components/RestaurantComingSoon"

export type { RestaurantDetailScreenProps } from "./views/RestaurantDetailScreen"
export type { RestaurantSearchScreenProps } from "./views/RestaurantSearchScreen"
export type { RestaurantListScreenProps } from "./views/RestaurantListScreen"
export type { RestaurantBookmarksScreenProps } from "./views/RestaurantBookmarksScreen"
export type { RestaurantReportScreenProps } from "./views/RestaurantReportScreen"
export type { RestaurantPhotosScreenProps } from "./views/RestaurantPhotosScreen"
export type { RestaurantReviewWriteScreenProps } from "./views/RestaurantReviewWriteScreen"
export type { ReviewerProfileScreenProps } from "./views/ReviewerProfileScreen"
