/* eslint-disable import/first -- Native leaves and query state are supplied before loading the real rail. */
import React from "react"
import type { CommunityStory } from "../src/features/recipe/types/story"
import ko from "../src/i18n/locales/ko/recipe.json"

const mockPush = jest.fn()
const mockRefetch = jest.fn()
const mockNow = Date.parse("2026-09-05T00:00:00Z")
let mockQuery = {
  stories: [] as CommunityStory[],
  isLoading: false,
  isError: false,
  error: null,
  refetch: mockRefetch,
}

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useMemo: (fn: () => unknown) => fn(),
}))
jest.mock("react-native", () => ({
  ...jest.requireActual("react-native"),
  ScrollView: "ScrollView",
}))
jest.mock("expo-image", () => ({ Image: "Image" }))
jest.mock("@expo/vector-icons/Ionicons", () => "Icon")
jest.mock("@/src/shared/components/AppText", () => ({ Text: "Text" }))
jest.mock("@/src/shared/components/SurfacePressable", () => ({
  SurfacePressable: "SurfacePressable",
}))
jest.mock("@/src/shared/navigation", () => ({
  useAppRouter: () => ({ push: mockPush }),
}))
jest.mock("@/src/shared/images/remoteImageSource", () => ({
  remoteImageSource: (uri: string) => ({ uri }),
}))
jest.mock("@/src/hooks/useSurface", () => ({ useSurface: () => ({}) }))
jest.mock("@/src/lib/errorMessage", () => ({
  resolveError: () => ({ title: "불러오지 못했어요", retryable: true }),
}))
jest.mock("@/src/design-system-v2", () => ({
  V2EmptyState: "EmptyState",
  V2Skeleton: "Skeleton",
  V2SkeletonGroup: "SkeletonGroup",
}))
jest.mock("../src/features/recipe/components/community/SectionHeader", () => ({
  SectionHeader: "SectionHeader",
}))
jest.mock("../src/features/recipe/services/communityStoryService", () => ({
  communityStoryService: {},
}))
jest.mock("../src/features/recipe/hooks/useCommunityStories", () => ({
  ...jest.requireActual("../src/features/recipe/hooks/useCommunityStories"),
  useCommunityStories: () => mockQuery,
  useStoryNow: () => mockNow,
}))
jest.mock("../src/features/recipe/hooks/useBlockedUsers", () => ({
  ...jest.requireActual("../src/features/recipe/utils/blockedAuthors"),
  useBlockedUsers: () => ({
    blockedAuthors: { ids: new Set([2]), unresolvedNames: new Set() },
  }),
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { author: string }) => {
      const value = key
        .split(".")
        .reduce<unknown>(
          (part, segment) => (part as Record<string, unknown>)[segment],
          ko,
        )
      return String(value ?? key).replace("{{author}}", options?.author ?? "")
    },
  }),
}))
import { StoryRail } from "../src/features/recipe/components/StoryRail"

type Node = React.ReactElement<Record<string, unknown>>
function walk(node: React.ReactNode): Node[] {
  if (!React.isValidElement<Record<string, unknown>>(node)) return []
  return [
    node,
    ...React.Children.toArray(node.props.children as React.ReactNode).flatMap(
      walk,
    ),
    ...walk(node.props.illustration as React.ReactNode),
  ]
}
function nodes() {
  return walk(StoryRail({ compact: true }))
}
function strings(tree: Node[]) {
  return tree.flatMap((node) =>
    typeof node.props.children === "string" ? [node.props.children] : [],
  )
}
function story(
  id: string,
  overrides: Partial<CommunityStory> = {},
): CommunityStory {
  return {
    id,
    authorId: 1,
    authorName: "이웃",
    imageUri: "https://example.test/photo.jpg",
    caption: null,
    likes: 0,
    liked: false,
    views: 0,
    isMine: false,
    createdAt: new Date(mockNow),
    expiresAt: new Date(mockNow + 86_400_000),
    ...overrides,
  }
}
beforeEach(() => {
  jest.clearAllMocks()
  mockQuery = {
    stories: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: mockRefetch,
  }
})

test("empty rail uses the story name and keeps an actionable first story slot", () => {
  const tree = nodes()
  expect(tree.find((node) => node.type === "EmptyState")?.props.surface).toBe(
    "community_story",
  )
  expect(strings(tree)).toEqual(
    expect.arrayContaining([
      ko.story.title,
      ko.story.addPhoto,
      ko.story.inviteTitle,
      ko.story.durationHint,
    ]),
  )
  const entries = tree.filter(
    (node) => node.props.accessibilityLabel === ko.story.createAccessibility,
  )
  expect(entries).toHaveLength(1)
  const add = entries[0]
  ;(add.props.onPress as () => void)()
  expect(mockPush).toHaveBeenCalledWith("/story/new")
})
test("loading does not claim an empty community and retains the creation entry", () => {
  mockQuery.isLoading = true
  const tree = nodes()
  expect(strings(tree)).not.toContain(ko.story.inviteTitle)
  expect(tree.some((node) => node.type === "SkeletonGroup")).toBe(true)
  expect(
    tree.some(
      (node) => node.props.accessibilityLabel === ko.story.createAccessibility,
    ),
  ).toBe(true)
})
test("a failed request shows a retry instead of the empty invitation", () => {
  mockQuery.isError = true
  const tree = nodes()
  expect(strings(tree)).toContain("불러오지 못했어요")
  expect(strings(tree)).not.toContain(ko.story.inviteTitle)
  const retry = tree.find(
    (node) =>
      typeof node.props.onPress === "function" &&
      !node.props.accessibilityLabel,
  )!
  ;(retry.props.onPress as () => void)()
  expect(mockRefetch).toHaveBeenCalledTimes(1)
})
test("real stories retain identity-based navigation and omit expired or blocked authors", () => {
  mockQuery.stories = [
    story("valid/id"),
    story("blocked", { authorId: 2 }),
    story("expired", { expiresAt: new Date(mockNow - 60_000) }),
  ]
  const tree = nodes()
  expect(strings(tree)).not.toContain(ko.story.inviteTitle)
  const entry = tree.find(
    (node) => node.props.accessibilityLabel === "이웃님의 스토리",
  )!
  ;(entry.props.onPress as () => void)()
  expect(mockPush).toHaveBeenCalledWith("/stories?storyId=valid%2Fid")
  expect(tree.filter((node) => node.type === "Image")).toHaveLength(1)
})
