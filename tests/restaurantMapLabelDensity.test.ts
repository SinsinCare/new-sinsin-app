import ts from "typescript"
import { buildMapHtml } from "../src/features/restaurant/map/mapHtml"

// Execute the actual generated WebView layout function, with projected coordinates
// supplied as fixtures. This does not exercise SDK rendering or native gestures.
const html = buildMapHtml({
  jsKey: "test",
  center: { lat: 37.5, lng: 127 },
  level: 3,
})
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? ""
const ast = ts.createSourceFile("map.js", script, ts.ScriptTarget.Latest, true)
let layoutSource = ""
let nodeSource = ""
let rebuildSource = ""
let labelOverlaySource = ""
let dropSource = ""
let splitSource = ""
function visit(node: ts.Node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === "splitMarkerName")
    splitSource = node.getText(ast)
  if (
    ts.isFunctionDeclaration(node) &&
    node.name?.text === "ensureLabelOverlay"
  )
    labelOverlaySource = node.getText(ast)
  if (ts.isFunctionDeclaration(node) && node.name?.text === "dropAll")
    dropSource = node.getText(ast)
  if (ts.isFunctionDeclaration(node) && node.name?.text === "rebuildMarkers")
    rebuildSource = node.getText(ast)
  if (
    ts.isFunctionDeclaration(node) &&
    node.name?.text === "visibleMarkerNodes"
  ) {
    nodeSource = node.getText(ast)
  }
  if (
    ts.isFunctionDeclaration(node) &&
    node.name?.text === "applyLabelCollision"
  ) {
    layoutSource = node.getText(ast)
  }
  ts.forEachChild(node, visit)
}
visit(ast)

function point(id: number, x: number, y: number, measured = true) {
  return {
    x,
    y,
    entry: {
      item: { id, name: `식당 ${id}` },
      name: {
        style: {
          display: "",
          opacity: "0",
          left: "0px",
          top: "19px",
          transform: "",
        },
      },
      labelW: measured ? 80 : 0,
      labelH: measured ? 16 : 0,
      hit: { style: { width: "44px", height: "44px" } },
      el: {
        style: { display: "", opacity: "1", pointerEvents: "" },
        setAttribute: jest.fn(),
        querySelector: () => ({ offsetWidth: 100, offsetHeight: 32 }),
      },
    },
  }
}
type Point = ReturnType<typeof point>
function createLayout(
  width = 400,
  height = 850,
  selectedId: number | null = null,
  insets = { top: 0, bottom: 0, left: 0, right: 0 },
) {
  return new Function(
    "document",
    "selectedId",
    "labelInsets",
    `var labelPlacements = {}; function ensureLabelOverlay() {} ${layoutSource};
     return { run: applyLabelCollision, placements: () => ({...labelPlacements}) };`,
  )(
    { getElementById: () => ({ clientWidth: width, clientHeight: height }) },
    selectedId,
    insets,
  ) as {
    run: (points: Point[]) => void
    placements: () => Record<string, boolean>
  }
}
function shown(points: Point[]) {
  return points.filter((p) => p.entry.name.style.opacity === "1")
}
function rect(p: Point) {
  const x = p.x - p.entry.labelW / 2
  const y = p.y + 19
  return [x, y, x + p.entry.labelW, y + p.entry.labelH]
}
function overlaps(a: number[], b: number[], gap = 0) {
  return (
    a[0] < b[2] + gap &&
    a[2] + gap > b[0] &&
    a[1] < b[3] + gap &&
    a[3] + gap > b[1]
  )
}
const grid = (n: number, measured = true) =>
  Array.from({ length: n }, (_, i) =>
    point(i + 1, 70 + (i % 3) * 130, 40 + Math.floor(i / 3) * 65, measured),
  )

describe("map label density", () => {
  it("keeps real nodes sparse, prioritizes selection, and reveals them after zooming", () => {
    const points = [point(1, 100, 100), point(2, 120, 110), point(3, 250, 250)]
    const nodes = (selectedId: number | null) =>
      new Function("selectedId", `${nodeSource}; return visibleMarkerNodes;`)(
        selectedId,
      )(points) as Point[]
    expect(nodes(null).map((p) => p.entry.item.id)).toEqual([1, 3])
    expect(points[1].entry.el.style.opacity).toBe("0")
    expect(nodes(2).map((p) => p.entry.item.id)).toEqual([2, 3])
    expect(points[0].entry.el.style.opacity).toBe("0")
    points[1].x = 170
    expect(nodes(null).map((p) => p.entry.item.id)).toEqual([1, 2, 3])
    expect(points.every((p) => p.entry.el.style.opacity === "1")).toBe(true)
  })
  it.each([
    ["진남관", ["진남관"]],
    ["해담아구찜&해물찜", ["해담아구찜&해물찜"]],
    ["전설의우대갈비 강남역직영점", ["전설의우대갈비", "강남역직영점"]],
    ["명인만두 강남역지하상가점", ["명인만두", "강남역지하상가점"]],
    ["대진돈원참치 강남역점", ["대진돈원참치", "강남역점"]],
    ["술내음 강남 역삼 선릉역점", ["술내음 강남", "역삼 선릉역점"]],
    ["  보승회관   강남역직영점  ", ["보승회관", "강남역직영점"]],
  ])("splits %s at a readable word or branch boundary", (input, expected) => {
    const split = new Function(`${splitSource}; return splitMarkerName;`)()
    expect(split(input)).toEqual(expected)
  })
  it("reserves the measured second line during name collision checks", () => {
    const points = [point(1, 100, 100), point(2, 100, 135)]
    points.forEach((p) => {
      p.entry.labelH = 32
    })
    createLayout().run(points)
    expect(shown(points)).toEqual([points[0]])
    expect(points.every((p) => p.entry.el.style.opacity === "1")).toBe(true)
  })
  it("loads the actual generated function", () => {
    expect(layoutSource).toContain("function applyLabelCollision")
    expect(() => new Function(script)).not.toThrow()
  })
  it("uses available space beyond the old 12-name cap without changing hit targets", () => {
    const points = grid(30)
    const before = points.map((p) => ({ ...p.entry.hit.style }))
    createLayout().run(points)
    expect(shown(points).length).toBeGreaterThan(12)
    expect(points.map((p) => p.entry.hit.style)).toEqual(before)
    const visible = shown(points)
    visible.forEach((p, index) => {
      visible.slice(index + 1).forEach((other) => {
        expect(overlaps(rect(p), rect(other), 8)).toBe(false)
      })
    })
  })
  it("keeps names below pins while allowing overlap with another pin", () => {
    const points = [point(1, 100, 100), point(2, 100, 140)]
    createLayout().run(points)
    expect(shown(points)).toContain(points[0])
    expect(shown(points)).toContain(points[1])
    expect(points[1].entry.el.style.opacity).toBe("1")
    expect(points[1].entry.el.style.pointerEvents).toBe("")
    points.forEach((p) => {
      expect(p.entry.name.style.left).toBe("0px")
      expect(p.entry.name.style.top).toBe("19px")
      expect(p.entry.name.style.transform).toBe("")
    })
  })
  it("allows a name over an ordinary named pin without hiding either place", () => {
    const points = [point(1, 100, 160), point(2, 100, 120)]
    createLayout().run(points)
    expect(shown(points)).toEqual(points)
    expect(points.every((p) => p.entry.el.style.opacity !== "0")).toBe(true)
  })
  it("reserves the selected bubble and tail regardless of server rank", () => {
    const points = [point(1, 200, 110), point(2, 70, 40), point(99, 200, 160)]
    createLayout(400, 850, 99).run(points)
    expect(points[2].entry.name.style.opacity).toBe("0")
    shown(points).forEach((p) => {
      expect(overlaps(rect(p), [150, 102, 250, 139], 8)).toBe(false)
    })
  })
  it("excludes covered pins and fits labels within the exposed viewport", () => {
    const points = [point(91, 100, 60), point(92, 200, 650), ...grid(24)]
    const insets = { top: 100, bottom: 250, left: 0, right: 0 }
    createLayout(400, 850, null, insets).run(points)
    expect(points[0].entry.name.style.opacity).toBe("0")
    expect(points[1].entry.name.style.opacity).toBe("0")
    expect(shown(points).length).toBeGreaterThan(0)
    shown(points).forEach((p) => {
      const [l, t, r, b] = rect(p)
      expect(l).toBeGreaterThanOrEqual(12)
      expect(t).toBeGreaterThanOrEqual(112)
      expect(r).toBeLessThanOrEqual(388)
      expect(b).toBeLessThanOrEqual(588)
    })
    createLayout(400, 850, null, { ...insets, bottom: 800 }).run(points)
    expect(shown(points)).toHaveLength(0)
  })
  it("distributes names across regions before a ranked hotspot exhausts the area budget", () => {
    const points = grid(36).sort((a, b) => a.x - b.x)
    createLayout().run(points)
    expect(new Set(shown(points).map((p) => p.x)).size).toBe(3)
    expect(
      new Set(shown(points).map((p) => Math.floor(p.y / (850 / 3)))).size,
    ).toBe(3)
  })
  it("retains placement on small pans and forgets removed points", () => {
    const points = grid(24)
    const layout = createLayout()
    layout.run(points)
    const before = layout.placements()
    points.forEach((p) => {
      p.x += 2
      p.y += 2
    })
    layout.run([...points].reverse())
    expect(layout.placements()).toEqual(before)
    layout.run([points[0]])
    expect(Object.keys(layout.placements())).toEqual([
      String(points[0].entry.item.id),
    ])
  })
  it("preserves the same overlay and label opacity across data refreshes", () => {
    const original = {
      ...point(1, 100, 100).entry,
      item: { id: 1, name: "식당", safety: "SAFE", lat: 37.5, lng: 127 },
      overlay: { setMap: jest.fn(), setPosition: jest.fn() },
      labelOverlay: { setMap: jest.fn(), setPosition: jest.fn() },
    }
    original.name.style.opacity = "1"
    const removed = {
      ...original,
      labelOverlay: { setMap: jest.fn(), setPosition: jest.fn() },
      overlay: { setMap: jest.fn(), setPosition: jest.fn() },
    }
    const markerEl = jest.fn()
    const LatLng = jest.fn(function (lat: number, lng: number) {
      return { lat, lng }
    })
    const run = new Function(
      "markers",
      "markerEl",
      "kakao",
      "applySelection",
      "applyScreenLayout",
      `var map = {}, labelsOn = true, lastMarkers = []; function labelsVisible(){return true;}
       ${rebuildSource}; return items => {lastMarkers=items; rebuildMarkers(); return markers;};`,
    )(
      { 1: original, 2: removed },
      markerEl,
      { maps: { LatLng } },
      jest.fn(),
      jest.fn(),
    )
    const next = run([{ ...original.item, lng: 127.001 }])
    expect(next[1]).toBe(original)
    expect(markerEl).not.toHaveBeenCalled()
    expect(original.name.style.opacity).toBe("1")
    expect(original.overlay.setMap).not.toHaveBeenCalled()
    expect(original.overlay.setPosition).toHaveBeenCalledWith({
      lat: 37.5,
      lng: 127.001,
    })
    expect(original.labelOverlay.setPosition).toHaveBeenCalledWith({
      lat: 37.5,
      lng: 127.001,
    })
    expect(removed.overlay.setMap).toHaveBeenCalledWith(null)
    expect(removed.labelOverlay.setMap).toHaveBeenCalledWith(null)
  })
  it("creates a name overlay only once and removes it together with its pin", () => {
    const overlay = { setMap: jest.fn() }
    const CustomOverlay = jest.fn(function () {
      return overlay
    })
    const holder = {
      className: "",
      appendChild: jest.fn(),
      setAttribute: jest.fn(),
    }
    const entry = {
      ...point(1, 100, 100).entry,
      overlay: { setMap: jest.fn() },
    }
    const api = new Function(
      "document",
      "kakao",
      `var map = {}; ${labelOverlaySource}; ${dropSource}; return {ensureLabelOverlay, dropAll};`,
    )(
      { createElement: () => holder },
      { maps: { CustomOverlay, LatLng: function () {} } },
    )
    api.ensureLabelOverlay(entry)
    api.ensureLabelOverlay(entry)
    expect(CustomOverlay).toHaveBeenCalledTimes(1)
    expect(CustomOverlay).toHaveBeenCalledWith(
      expect.objectContaining({
        content: holder,
        zIndex: 50000,
        xAnchor: 0,
        yAnchor: 0,
      }),
    )
    expect(holder.appendChild).toHaveBeenCalledWith(entry.name)
    api.dropAll({ 1: entry })
    expect(entry.overlay.setMap).toHaveBeenCalledWith(null)
    expect(overlay.setMap).toHaveBeenLastCalledWith(null)
  })
  it("uses separate entry and exit thresholds near the viewport edge", () => {
    const p = point(1, 335, 100)
    const layout = createLayout()
    layout.run([p])
    expect(shown([p])).toHaveLength(1)
    p.x = 345
    layout.run([p])
    expect(shown([p])).toHaveLength(1)
    p.x = 350
    layout.run([p])
    expect(shown([p])).toHaveLength(0)
    p.x = 345
    layout.run([p])
    expect(shown([p])).toHaveLength(0)
    p.x = 335
    layout.run([p])
    expect(shown([p])).toHaveLength(1)
  })
  it("handles unmeasured names and reveals a previously offscreen name after panning", () => {
    const points = grid(30, false)
    createLayout().run(points)
    expect(shown(points).length).toBeGreaterThan(0)
    expect(shown(points).length).toBeLessThanOrEqual(30)
    const moving = point(100, -20, 50)
    const layout = createLayout()
    layout.run([moving])
    expect(shown([moving])).toHaveLength(0)
    moving.x = 200
    layout.run([moving])
    expect(shown([moving])).toHaveLength(1)
  })
})
