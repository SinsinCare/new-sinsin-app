/* eslint-disable import/first */
import { renderHookWithEffects } from "./helpers/effectHookHarness"
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  ...jest.requireActual("./helpers/effectHookHarness"),
  memo: (c: unknown) => c,
}))
jest.mock("@/src/design-system-v2/primitives/NativeText", () => ({
  TextInput: "Input",
}))
jest.mock("react-native", () => ({
  View: "View",
  Pressable: "Pressable",
  TextInput: "Input",
  SectionList: "List",
  Keyboard: { dismiss: jest.fn() },
  StyleSheet: { create: (v: unknown) => v, hairlineWidth: 0.5 },
}))
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 34 }),
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, v: unknown) => `${k}:${JSON.stringify(v ?? {})}`,
    i18n: { language: "ko" },
  }),
}))
jest.mock("@/src/lib/haptics", () => ({ hapticSelection: jest.fn() }))
jest.mock("@/src/design-system-v2", () => ({
  V2Text: "Text",
  V2HStack: "HStack",
  V2Icon: "Icon",
  typography: { subtext: { large: {} } },
  spacing: {},
  useV2Theme: () => ({
    colors: { background: {}, label: {}, fill: {}, line: {} },
  }),
}))
jest.mock(
  "../src/features/consultation/components/ConsultHistoryActions",
  () => ({ ConsultHistoryActions: "Actions" }),
)
import { RenameModal } from "../src/features/consultation/components/RenameModal"
import { ConsultHistoryList } from "../src/features/consultation/components/ConsultHistoryList"
import { ConsultHistoryRow } from "../src/features/consultation/components/ConsultHistoryRow"
import { historyRowCopy } from "../src/features/consultation/lib/chatHistoryPresentation"
import type { Chat } from "../src/types/chat"
const chats: Chat[] = [
  {
    id: 7,
    title: "콩나물 레시피",
    summary: "내 목표와 비교",
    createdAt: new Date(2026, 8, 6, 10),
    updatedAt: new Date(2026, 8, 6, 10),
    status: "ACTIVE",
    category: null,
  },
  {
    id: 8,
    title: "수분 기록",
    createdAt: new Date(2026, 8, 6, 10),
    updatedAt: new Date(2026, 8, 6, 10),
    status: "ACTIVE",
    category: null,
  },
]
function nodes(node: any): any[] {
  return Array.isArray(node)
    ? node.flatMap(nodes)
    : node && typeof node === "object"
      ? [node, ...nodes(node.props?.children)]
      : []
}
const get = (tree: unknown, type: string) =>
  nodes(tree).find((n) => n.type === type)

test("history search clears correctly; empty search offers a working recovery; loaded items keep their IDs", () => {
  const h = renderHookWithEffects(() =>
    ConsultHistoryList({
      chats,
      isLoading: false,
      onSelect: jest.fn(),
      onRename: jest.fn(),
      onDelete: jest.fn(),
    }),
  )
  const list = () => get(h.result(), "List")
  expect(
    list()
      .props.sections.flatMap((s: any) => s.data)
      .map((c: Chat) => c.id),
  ).toEqual([8, 7])
  get(h.result(), "Input").props.onChangeText("목표")
  expect(
    list()
      .props.sections.flatMap((s: any) => s.data)
      .map((c: Chat) => c.id),
  ).toEqual([7])
  get(h.result(), "Input").props.onChangeText("없는 질문")
  expect(list().props.sections).toEqual([])
  get(list().props.ListEmptyComponent, "Pressable").props.onPress()
  expect(get(h.result(), "Input").props.value).toBe("")
  expect(list().props.sections.flatMap((s: any) => s.data)).toHaveLength(2)
  h.unmount()
})
test("row title does not expose appended context, and selection/manage actions target the same conversation", () => {
  const chat = {
    ...chats[0],
    title: "오늘 메뉴 비교\n\n[식당] 특정 장소",
    summary: "오늘 메뉴 비교",
  }
  expect(historyRowCopy(chat)).toEqual({ title: "오늘 메뉴 비교", summary: "" })
  const select = jest.fn(),
    manage = jest.fn()
  const tree = (ConsultHistoryRow as unknown as Function)({
    chat,
    now: new Date(),
    selected: true,
    onSelect: select,
    onManage: manage,
  })
  const buttons = nodes(tree).filter((n) => n.type === "Pressable")
  expect(buttons[0].props.accessibilityState.selected).toBe(true)
  buttons[0].props.onPress()
  expect(select).toHaveBeenCalledWith(7)
  buttons[1].props.onPress()
  expect(manage).toHaveBeenCalledWith(chat)
})
test("management overlay hides the list from accessibility and closes without mutating data", () => {
  const rename = jest.fn(),
    remove = jest.fn()
  const h = renderHookWithEffects(() =>
    ConsultHistoryList({
      chats,
      isLoading: false,
      onSelect: jest.fn(),
      onRename: rename,
      onDelete: remove,
    }),
  )
  const row = get(h.result(), "List").props.renderItem({ item: chats[0] })
  row.props.onManage(chats[0])
  const actions = get(h.result(), "Actions")
  expect(actions.props.target.id).toBe(7)
  expect(
    nodes(h.result()).some(
      (n) => n.props?.importantForAccessibility === "no-hide-descendants",
    ),
  ).toBe(true)
  actions.props.onClose()
  expect(get(h.result(), "Actions")).toBeUndefined()
  expect(rename).not.toHaveBeenCalled()
  expect(remove).not.toHaveBeenCalled()
  h.unmount()
})

test("rename exposes separate input/actions, blocks blank save, and cancel never submits", () => {
  const onConfirm = jest.fn(),
    onCancel = jest.fn()
  const h = renderHookWithEffects(() =>
    RenameModal({
      visible: true,
      currentName: "기존 제목",
      onConfirm,
      onCancel,
    }),
  )
  expect(get(h.result(), "Input").props.value).toBe("기존 제목")
  get(h.result(), "Input").props.onChangeText("   ")
  const buttons = nodes(h.result()).filter(
    (n) => n.type === "Pressable" && n.props.accessibilityRole === "button",
  )
  expect(buttons[1].props.disabled).toBe(true)
  buttons[1].props.onPress()
  expect(onConfirm).not.toHaveBeenCalled()
  buttons[0].props.onPress()
  expect(onCancel).toHaveBeenCalledTimes(1)
  h.unmount()
})
