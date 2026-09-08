import { renderHookWithEffects } from "./helpers/effectHookHarness"
import { ConsultHistoryActions } from "../src/features/consultation/components/ConsultHistoryActions"
import { BackHandler } from "react-native"
import type { Chat } from "../src/types/chat"

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  ...jest.requireActual("./helpers/effectHookHarness"),
}))
jest.mock("react-native", () => ({
  View: "View",
  Pressable: "Pressable",
  BackHandler: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
  StyleSheet: { create: (value: unknown) => value, hairlineWidth: 1 },
}))
jest.mock("react-native-reanimated", () => ({
  __esModule: true,
  default: { View: "AnimatedView" },
  useReducedMotion: () => true,
}))
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 34 }),
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("@/src/shared/components/Icon", () => ({ Icon: "Icon" }))
jest.mock("@/src/design-system-v2", () => ({
  V2Icon: "Icon",
  V2Text: "Text",
  spacing: {},
  useV2Theme: () => ({
    colors: { label: {}, background: {}, fill: {}, line: {}, status: {} },
  }),
}))

function nodes(tree: any): any[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes)
  return tree?.props ? [tree, ...nodes(tree.props.children)] : []
}
const target = {
  id: 7,
  title: "상담",
  status: "ACTIVE",
  category: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
} satisfies Chat

it.each(["rename", "delete"])(
  "closes the current menu before %s and passes the selected conversation",
  (action) => {
    const order: string[] = []
    const mutate = jest.fn((chat: Chat) => {
      expect(chat).toBe(target)
      order.push(action)
    })
    const other = jest.fn()
    const h = renderHookWithEffects(() =>
      ConsultHistoryActions({
        target,
        onClose: () => order.push("close"),
        onRename: action === "rename" ? mutate : other,
        onDelete: action === "delete" ? mutate : other,
      }),
    )
    const button = nodes(h.result()).find(
      (n) =>
        n.type === "Pressable" &&
        nodes(n).some(
          (child) =>
            child.type === "Text" &&
            child.props.children === `consult.history.${action}`,
        ),
    )
    expect(button).toBeDefined()
    button.props.onPress()
    expect(order).toEqual(["close", action])
    expect(mutate).toHaveBeenCalledTimes(1)
    expect(other).not.toHaveBeenCalled()
    h.unmount()
  },
)

it("hardware back only closes the overlay and removes its listener on unmount", () => {
  const close = jest.fn(),
    rename = jest.fn(),
    remove = jest.fn()
  const h = renderHookWithEffects(() =>
    ConsultHistoryActions({
      target,
      onClose: close,
      onRename: rename,
      onDelete: remove,
    }),
  )
  const listen = BackHandler.addEventListener as jest.Mock
  const [, handler] = listen.mock.calls.at(-1)!
  const subscription = listen.mock.results.at(-1)!.value
  expect(handler()).toBe(true)
  expect(close).toHaveBeenCalledTimes(1)
  expect(rename).not.toHaveBeenCalled()
  expect(remove).not.toHaveBeenCalled()
  h.unmount()
  expect(subscription.remove).toHaveBeenCalledTimes(1)
})
