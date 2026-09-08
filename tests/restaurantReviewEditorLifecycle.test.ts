import { renderHookWithEffects } from "./helpers/effectHookHarness"
import { useReviewEditorLifecycle } from "../src/features/restaurant/hooks/useReviewEditorLifecycle"
import { imageUploadService } from "../src/features/recipe/services/imageUploadService"
import { showConfirm } from "../src/lib/dialog"
import { presentError } from "../src/lib/errorMessage"
import { showReviewPhotoNotice } from "../src/features/restaurant/utils/reviewDraft"
import type { ReviewDto } from "../src/features/restaurant/types"

jest.mock("react", () => {
  const harness = jest.requireActual("./helpers/effectHookHarness")
  return {
    ...jest.requireActual("react"),
    useState: harness.useState,
    useRef: harness.useRef,
    useEffect: harness.useEffect,
    useCallback: harness.useCallback,
  }
})
const mockDispatch = jest.fn()
let mockPrevent: (event: { data: { action: { type: string } } }) => void
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ dispatch: mockDispatch }),
  usePreventRemove: (_enabled: boolean, fn: typeof mockPrevent) => {
    mockPrevent = fn
  },
}))
jest.mock("react-native", () => ({ Keyboard: { dismiss: jest.fn() } }))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("@/src/lib/dialog", () => ({ showConfirm: jest.fn() }))
jest.mock("@/src/lib/errorMessage", () => ({ presentError: jest.fn() }))
jest.mock("@/src/features/recipe/services/imageUploadService", () => ({
  imageUploadService: { uploadImage: jest.fn() },
}))
jest.mock("@/src/lib/toast", () => ({
  showSuccessToast: jest.fn(),
  showCautionToast: jest.fn(),
  showErrorToast: jest.fn(),
}))
jest.mock("../src/features/restaurant/utils/reviewDraft", () => ({
  ...jest.requireActual("../src/features/restaurant/utils/reviewDraft"),
  showReviewPhotoNotice: jest.fn(),
}))
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const review = { reviewId: 123 } as ReviewDto
const upload = jest.mocked(imageUploadService.uploadImage)
const confirm = jest.mocked(showConfirm)
function mount(photos = ["file:///test.jpg"], dirty = true) {
  const post = jest
    .fn()
    .mockResolvedValue({ review, photosIndexed: photos.length })
  const close = jest.fn()
  const success = jest.fn()
  const draft = {
    rating: dirty ? 4 : 0,
    content: dirty ? "테스트 초안" : "",
    keywords: [],
    photoUris: dirty ? photos : [],
  }
  const hook = renderHookWithEffects(() =>
    useReviewEditorLifecycle({
      draft,
      submitReview: post,
      onClose: close,
      onSubmitted: success,
    }),
  )
  return { ...hook, post, close, success, draft }
}
beforeEach(() => jest.clearAllMocks())
const photo = {
  objectPath: "test/path",
  imageUrl: "",
  contentType: "image/jpeg",
  size: 1,
}

describe("review editor lifecycle", () => {
  it("locks during a single photo upload and through publication, including stale double taps", async () => {
    const pending = deferred<typeof photo>()
    upload.mockReturnValueOnce(pending.promise)
    const hook = mount()
    const submit = hook.result().submit
    const first = submit()
    await submit()
    expect(hook.result().isSubmitting).toBe(true)
    expect(hook.result().uploadProgress).not.toBeNull()
    await hook.result().requestClose()
    mockPrevent({ data: { action: { type: "GO_BACK" } } })
    expect(confirm).not.toHaveBeenCalled()
    expect(hook.close).not.toHaveBeenCalled()
    expect(mockDispatch).not.toHaveBeenCalled()
    expect(upload).toHaveBeenCalledTimes(1)
    pending.resolve(photo)
    await first
    await submit()
    expect(hook.post).toHaveBeenCalledTimes(1)
    expect(hook.post).toHaveBeenCalledWith({
      rating: 4,
      content: "테스트 초안",
      keywords: [],
      imageObjectPaths: ["test/path"],
    })
    expect(showReviewPhotoNotice).toHaveBeenCalledWith(
      { sent: 1, indexed: 1 },
      expect.any(Function),
    )
    expect(hook.success).toHaveBeenCalledWith(review)
    mockPrevent({ data: { action: { type: "GO_BACK" } } })
    expect(mockDispatch).toHaveBeenCalledTimes(1)
    hook.unmount()
  })
  it("keeps submission and exit locked while the POST itself is pending", async () => {
    const pending = deferred<{ review: ReviewDto; photosIndexed: number }>()
    const hook = mount([])
    hook.post.mockReturnValueOnce(pending.promise)
    const first = hook.result().submit()
    await hook.result().submit()
    await hook.result().requestClose()
    expect(hook.result().isSubmitting).toBe(true)
    expect(hook.post).toHaveBeenCalledTimes(1)
    expect(hook.close).not.toHaveBeenCalled()
    expect(confirm).not.toHaveBeenCalled()
    pending.resolve({ review, photosIndexed: 0 })
    await first
    hook.unmount()
  })
  it.each([-1, 0, 1, 2])(
    "delivers photo outcome %i before the success callback without retrying publication",
    async (indexed) => {
      upload.mockResolvedValue(photo)
      const hook = mount(["file:///one.jpg", "file:///two.jpg"])
      hook.post.mockResolvedValueOnce({ review, photosIndexed: indexed })
      await hook.result().submit()
      expect(showReviewPhotoNotice).toHaveBeenCalledWith(
        { sent: 2, indexed },
        expect.any(Function),
      )
      expect(
        jest.mocked(showReviewPhotoNotice).mock.invocationCallOrder[0],
      ).toBeLessThan(hook.success.mock.invocationCallOrder[0])
      await hook.result().submit()
      expect(hook.post).toHaveBeenCalledTimes(1)
      hook.unmount()
    },
  )
  it("keeps the draft and reuses successful uploads on failed POST retry", async () => {
    upload.mockResolvedValueOnce(photo)
    const hook = mount()
    hook.post.mockRejectedValueOnce(new Error("offline"))
    await hook.result().submit()
    expect(hook.result().isSubmitting).toBe(false)
    expect(hook.success).not.toHaveBeenCalled()
    expect(presentError).toHaveBeenCalledTimes(1)
    await hook.result().submit()
    expect(upload).toHaveBeenCalledTimes(1)
    expect(hook.post).toHaveBeenCalledTimes(2)
    expect(hook.success).toHaveBeenCalledTimes(1)
    hook.unmount()
  })
  it("does not publish when an upload fails and permits retry", async () => {
    upload
      .mockRejectedValueOnce(new Error("upload failed"))
      .mockResolvedValueOnce(photo)
    const hook = mount()
    await hook.result().submit()
    expect(hook.post).not.toHaveBeenCalled()
    expect(hook.result().uploadProgress).toBeNull()
    await hook.result().submit()
    expect(hook.post).toHaveBeenCalledTimes(1)
    hook.unmount()
  })
  it("stops before publication after unmount during upload", async () => {
    const pending = deferred<typeof photo>()
    upload.mockReturnValueOnce(pending.promise)
    const hook = mount()
    const first = hook.result().submit()
    hook.unmount()
    pending.resolve(photo)
    await first
    expect(hook.post).not.toHaveBeenCalled()
    expect(hook.success).not.toHaveBeenCalled()
  })
  it("suppresses late success and error UI when forcibly unmounted during POST", async () => {
    for (const fail of [false, true]) {
      const pending = deferred<{ review: ReviewDto; photosIndexed: number }>()
      const hook = mount([])
      hook.post.mockReturnValueOnce(pending.promise)
      const first = hook.result().submit()
      hook.unmount()
      if (fail) pending.reject(new Error("late error"))
      else pending.resolve({ review, photosIndexed: 0 })
      await first
      expect(hook.success).not.toHaveBeenCalled()
    }
    expect(presentError).not.toHaveBeenCalled()
    expect(showReviewPhotoNotice).not.toHaveBeenCalled()
  })
  it("uses one discard dialog for close and native back and preserves on cancel", async () => {
    const pending = deferred<boolean>()
    confirm.mockReturnValueOnce(pending.promise)
    const hook = mount([])
    const closing = hook.result().requestClose()
    mockPrevent({ data: { action: { type: "GO_BACK" } } })
    await hook.result().submit()
    expect(hook.post).not.toHaveBeenCalled()
    expect(confirm).toHaveBeenCalledTimes(1)
    pending.resolve(false)
    await closing
    expect(hook.close).not.toHaveBeenCalled()
    confirm.mockResolvedValueOnce(true)
    mockPrevent({ data: { action: { type: "GO_BACK" } } })
    await Promise.resolve()
    expect(mockDispatch).toHaveBeenCalledWith({ type: "GO_BACK" })
    hook.unmount()
  })
  it("closes an empty draft without a dialog and ignores a late discard after unmount", async () => {
    const empty = mount([], false)
    await empty.result().requestClose()
    expect(empty.close).toHaveBeenCalledTimes(1)
    expect(confirm).not.toHaveBeenCalled()
    empty.unmount()
    const pending = deferred<boolean>()
    confirm.mockReturnValueOnce(pending.promise)
    const dirty = mount([])
    const closing = dirty.result().requestClose()
    dirty.unmount()
    pending.resolve(true)
    await closing
    expect(dirty.close).not.toHaveBeenCalled()
  })
})
