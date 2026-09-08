import ts from "typescript"
import { renderHookWithEffects } from "./helpers/effectHookHarness"
import { useRegionFilterTransition } from "../src/features/restaurant/hooks/useRegionFilterTransition"
import { DEFAULT_RESTAURANT_FILTERS } from "../src/features/restaurant/hooks/useRestaurantFilters"
import { buildMapHtml } from "../src/features/restaurant/map/mapHtml"

jest.mock("react", () => {
  const actual = jest.requireActual("react")
  const harness = jest.requireActual("./helpers/effectHookHarness")
  return {
    ...actual,
    useState: harness.useState,
    useRef: harness.useRef,
    useEffect: harness.useEffect,
    useCallback: harness.useCallback,
    useMemo: harness.useMemo,
  }
})

const gangnam = { lat: 37.4979, lng: 127.0276 }
const seocho = { lat: 37.4836, lng: 127.0326 }
const busan = { lat: 35.1796, lng: 129.0756 }
const bounds = { swLat: 37.47, neLat: 37.51, swLng: 127.01, neLng: 127.05 }
const size = { width: 400, height: 800 }
const initial = {
  ...DEFAULT_RESTAURANT_FILTERS,
  regionGroups: ["seoul-gangnam"],
}
const selected = { ...initial, regionGroups: ["seoul-seocho"] }

describe("region filter and viewport commit", () => {
  it("keeps old query filters through old idle and only releases after the new bounds commit", () => {
    let filters = initial
    const hook = renderHookWithEffects(() => useRegionFilterTransition(filters))
    hook.result().begin(seocho)
    filters = selected
    hook.rerender()
    expect(hook.result().isPending).toBe(true)
    expect(hook.result().queryFilters).toEqual(initial)
    expect(hook.result().inspectViewport(gangnam, bounds, size)).toBe("wait")
    expect(hook.result().inspectViewport(seocho, bounds, size)).toBe("commit")
    // A rejected bbox must not publish new filters with old committed bounds.
    hook.rerender()
    expect(hook.result().queryFilters).toEqual(initial)
    hook.result().finish()
    hook.rerender()
    expect(hook.result().isPending).toBe(false)
    expect(hook.result().queryFilters).toEqual(selected)
    expect(hook.result().inspectViewport(seocho, bounds, size)).toBe("idle")
    hook.unmount()
  })

  it("accepts pixel-rounded arrival but rejects an old viewport beyond two pixels", () => {
    const hook = renderHookWithEffects(() => useRegionFilterTransition(initial))
    hook.result().begin(gangnam)
    hook.rerender()
    const rounded = {
      lat: gangnam.lat + 0.000012689808535526481,
      lng: gangnam.lng,
    }
    expect(hook.result().inspectViewport(rounded, bounds, size)).toBe("commit")
    expect(
      hook
        .result()
        .inspectViewport(
          { ...rounded, lat: gangnam.lat + 0.00015 },
          bounds,
          size,
        ),
    ).toBe("wait")
    // A much closer zoom must not accept the same coordinate error as arrival.
    const zoomedBounds = { ...bounds, neLat: bounds.swLat + 0.001 }
    expect(hook.result().inspectViewport(rounded, zoomedBounds, size)).toBe(
      "wait",
    )
    hook.unmount()
  })

  it("rapid reselection ignores the previous destination's late completion", () => {
    let filters = initial
    const hook = renderHookWithEffects(() => useRegionFilterTransition(filters))
    hook.result().begin(seocho)
    filters = selected
    hook.rerender()
    hook.result().begin(busan)
    filters = { ...initial, regionGroups: [], regionSidos: ["busan"] }
    hook.rerender()
    expect(hook.result().queryFilters).toEqual(initial)
    expect(hook.result().inspectViewport(seocho, bounds, size)).toBe("wait")
    expect(hook.result().inspectViewport(busan, bounds, size)).toBe("commit")
    hook.result().finish()
    hook.rerender()
    expect(hook.result().queryFilters).toEqual(filters)
    hook.unmount()
  })

  it("a drag transfers destination ownership but waits for its final viewport", () => {
    let filters = initial
    const hook = renderHookWithEffects(() => useRegionFilterTransition(filters))
    hook.result().begin(seocho)
    filters = selected
    hook.rerender()
    hook.result().interrupt()
    hook.rerender()
    expect(hook.result().isPending).toBe(true)
    expect(hook.result().queryFilters).toEqual(initial)
    expect(hook.result().destination()).toBeNull()
    expect(hook.result().inspectViewport(gangnam, bounds, size)).toBe("commit")
    hook.result().finish()
    hook.rerender()
    expect(hook.result().queryFilters).toEqual(selected)
    hook.unmount()
  })

  it("retains the requested camera destination for WebView recovery", () => {
    const hook = renderHookWithEffects(() => useRegionFilterTransition(initial))
    hook.result().begin(seocho)
    hook.rerender()
    expect(hook.result().destination()).toEqual(seocho)
    expect(hook.result().inspectViewport(gangnam, bounds, size)).toBe("wait")
    // Map-ready can reissue this destination after a failed/reloaded WebView.
    const recovered = hook.result().destination()!
    expect(hook.result().inspectViewport(recovered, bounds, size)).toBe(
      "commit",
    )
    hook.result().finish()
    hook.rerender()
    expect(hook.result().destination()).toBeNull()
    hook.unmount()
  })
})

function actualMoveTo() {
  const html = buildMapHtml({ jsKey: "test", center: gangnam, level: 4 })
  const script = html.match(/<script>([\s\S]*?)<\/script>/)![1]
  const source = ts.createSourceFile(
    "map.js",
    script,
    ts.ScriptTarget.Latest,
    true,
  )
  let body: string | undefined
  function visit(node: ts.Node) {
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(source) === "moveTo"
    ) {
      body = node.initializer.getText(source)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  if (!body) throw new Error("Generated map moveTo command not found")
  return new Function(
    "map",
    "kakao",
    "arg",
    "clamp",
    "postIdle",
    `return (${body})`,
  )
}

describe("actual generated map camera command", () => {
  class LatLng {
    constructor(
      private lat: number,
      private lng: number,
    ) {}
    getLat() {
      return this.lat
    }
    getLng() {
      return this.lng
    }
  }

  function camera() {
    const map = {
      getCenter: () => new LatLng(gangnam.lat, gangnam.lng),
      getLevel: () => 4,
      getProjection: () => ({
        containerPointFromCoords: (point: LatLng) => ({
          x: point.getLng() / 0.0001,
          y: point.getLat() / 0.00005,
        }),
      }),
      setCenter: jest.fn(),
      setLevel: jest.fn(),
      panTo: jest.fn(),
    }
    const postIdle = jest.fn()
    const move = actualMoveTo()(
      map,
      { maps: { LatLng } },
      (v: unknown) => v,
      (v: number) => v,
      postIdle,
    )
    return { map, postIdle, move }
  }

  it("acknowledges the current viewport even when Kakao emits no event for a no-op", () => {
    const { map, postIdle, move } = camera()
    move(gangnam)
    expect(postIdle).toHaveBeenCalledTimes(1)
    expect(map.panTo).not.toHaveBeenCalled()
  })

  it("subpixel coordinate differences also complete and snap to the exact target", () => {
    const { map, postIdle, move } = camera()
    const target = {
      lat: gangnam.lat + 0.000012689808535526481,
      lng: gangnam.lng,
    }
    move(target)
    expect(postIdle).toHaveBeenCalledTimes(1)
    expect(map.setCenter.mock.calls[0][0].getLat()).toBe(target.lat)
  })

  it("does not acknowledge the old viewport before a different destination arrives", () => {
    const { map, postIdle, move } = camera()
    move(seocho)
    expect(map.panTo).toHaveBeenCalledTimes(1)
    expect(postIdle).not.toHaveBeenCalled()
  })

  it("a zoom change at the same center still executes the zoom command", () => {
    const { map, postIdle, move } = camera()
    move({ ...gangnam, zoom: 3 })
    expect(map.setLevel).toHaveBeenCalledWith(3, { animate: false })
    expect(postIdle).not.toHaveBeenCalled()
  })
})
