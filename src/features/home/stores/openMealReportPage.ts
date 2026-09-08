import { router } from "expo-router"

import {
  useMealReportPageStore,
  type MealReportPageParams,
} from "./mealReportPageStore"

/**
 * 식단 리포트 페이지를 연다. 재료를 스토어에 두고 라우트를 민다 — 두 줄이 늘 같이
 * 가야 해서 한 함수로 묶었다. 이미 열려 있으면(같은 결과를 두 번 누름) 재료만 갈아
 * 끼운다: 페이지가 두 장 쌓이면 X 를 두 번 눌러야 한다.
 */
export function openMealReportPage(params: MealReportPageParams) {
  const store = useMealReportPageStore.getState()
  const wasOpen = store.params !== null
  store.set(params)
  if (!wasOpen) router.push("/meal-report")
}
