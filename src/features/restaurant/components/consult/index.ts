/**
 * 식당 상세 `AI 식단 상담` 시트의 공개 입구.
 *
 * 밖에서 쓰는 것은 **호스트 하나뿐**이다. 헤더·버블·컴포저·면책은 이 시트의 부품이고,
 * 따로 꺼내 쓰면 `useChat` 없이 버블만 그리는 화면이 생긴다 — 그때 답변은 스트리밍도
 * 안 되고 면책도 안 붙는다. 부품이 필요하면 그건 새 표면이라는 뜻이고, 새 표면은
 * 계측 서페이스부터 정해야 한다.
 */

export {
  RestaurantConsultSheetHost,
  type RestaurantConsultRequest,
} from "./RestaurantConsultSheetHost"
