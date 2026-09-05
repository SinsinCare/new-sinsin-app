import ts from "typescript"
import { buildMapHtml } from "../src/features/restaurant/map/mapHtml"

// Execute the actual generated WebView layout function, with projected coordinates
// supplied as fixtures. SDK rendering and map gestures are checked in the Simulator.
const html = buildMapHtml({
  jsKey: "test",
  center: { lat: 37.5, lng: 127 },
  level: 3,
})
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? ""
const ast = ts.createSourceFile("map.js", script, ts.ScriptTarget.Latest, true)
let layoutSource = ""
function visit(node: ts.Node) {
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
      name: { style: { display: "" } },
      labelW: measured ? 80 : 0,
      labelH: measured ? 16 : 0,
      hit: { style: { width: "44px", height: "44px" } },
      el: { querySelector: () => ({ offsetWidth: 100, offsetHeight: 32 }) },
    },
  }
}
type Point = ReturnType<typeof point>
function layout(
  points: Point[],
  width = 400,
  height = 850,
  selectedId: number | null = null,
) {
  const run = new Function(
    "document",
    "selectedId",
    `${layoutSource}; return applyLabelCollision;`,
  )(
    { getElementById: () => ({ clientWidth: width, clientHeight: height }) },
    selectedId,
  ) as (points: Point[]) => void
  run(points)
  return points.filter(
    (p) =>
      p.entry.item.id !== selectedId && p.entry.name.style.display !== "none",
  )
}
const grid = (n: number, measured = true) =>
  Array.from({ length: n }, (_, i) =>
    point(i + 1, 70 + (i % 3) * 130, 40 + Math.floor(i / 3) * 65, measured),
  )

describe("map label density", () => {
  it("loads the actual generated function", () => {
    expect(layoutSource).toContain("function applyLabelCollision")
    expect(() => new Function(script)).not.toThrow()
  })
  it("caps dense labels while retaining server order and all marker hit targets", () => {
    const points = grid(30)
    const before = points.map((p) => ({ ...p.entry.hit.style }))
    const visible = layout(points)
    expect(visible.map((p) => p.entry.item.id)).toEqual(
      Array.from({ length: 12 }, (_, i) => i + 1),
    )
    expect(points).toHaveLength(30)
    expect(points.map((p) => p.entry.hit.style)).toEqual(before)
  })
  it("uses fewer labels in a shorter viewport", () => {
    expect(layout(grid(12), 400, 250)).toHaveLength(3)
  })
  it("keeps the selected bubble clear even if it is last in server order", () => {
    const covered = point(1, 200, 110)
    const clear = point(2, 70, 40)
    const selected = point(99, 200, 160)
    expect(
      layout([covered, clear, selected], 400, 850, 99).map(
        (p) => p.entry.item.id,
      ),
    ).toEqual([2])
    expect(covered.entry.name.style.display).toBe("none")
    expect(selected.entry.el.querySelector().offsetWidth).toBe(100)
  })
  it("rejects clipped names without using the visible label budget", () => {
    const clipped = [point(91, 5, 50), point(92, 398, 120), point(93, 200, 840)]
    expect(
      layout([...clipped, ...grid(12)]).map((p) => p.entry.item.id),
    ).toEqual(Array.from({ length: 12 }, (_, i) => i + 1))
    expect(clipped.every((p) => p.entry.name.style.display === "none")).toBe(
      true,
    )
  })
  it("does not place a name across another restaurant pin", () => {
    const first = point(1, 100, 100)
    const neighbor = point(2, 130, 120)
    layout([first, neighbor])
    expect(first.entry.name.style.display).toBe("none")
  })
  it("bounds density before font measurement and can reveal a label after panning", () => {
    expect(layout(grid(30, false))).toHaveLength(12)
    const moving = point(1, 5, 50)
    layout([moving])
    expect(moving.entry.name.style.display).toBe("none")
    moving.x = 200
    layout([moving])
    expect(moving.entry.name.style.display).toBe("")
  })
})
