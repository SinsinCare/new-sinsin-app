// Compatibility for existing consultation consumers; history now occupies a full page.
import { ConsultHistoryPage, ConsultHistoryHeader } from "./ConsultHistoryPage"
import { ConsultHistoryList } from "./ConsultHistoryList"
export const ChatHistorySheet = {
  Layout: ConsultHistoryPage,
  Header: ConsultHistoryHeader,
  Content: ConsultHistoryList,
}
