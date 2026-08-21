/**
 * 지도 테마는 WebView 재로드 없이 동적으로 바뀌어야 한다.
 *
 * ## 실측 사고 (2026-08-19)
 *
 * 앱 전체가 다크인데 Kakao 베이스맵만 밝은 ROADMAP 타일로 남아 화면의 70% 이상이
 * 흰색이었다. 공식 Kakao Maps JavaScript API에는 다크 베이스맵 옵션이 없고, 이 앱은
 * 이미 `/tile/` 이미지만 골라 라이트 톤 필터를 적용하고 있다. 따라서 같은 경로에서
 * 테마별 필터를 바꾸는 것이 정본이다.
 *
 * WebView HTML을 테마마다 새로 만들면 SDK 재다운로드·카메라 초기화·마커 선택 해제가
 * 일어난다. `setColorScheme` 브리지 명령이 기존 타일을 다시 칠해야 한다.
 */
import {
  semanticDark,
  semanticLight,
} from "@/src/design-system-v2/tokens/colors"
import {
  MAP_CLUSTER_SHADOW,
  MAP_LABEL_COLOR,
  MAP_TILE_FILTER,
  buildMapHtml,
} from "@/src/features/restaurant/map/mapHtml"
import { mapScript } from "@/src/features/restaurant/map/mapBridge"

const BASE = {
  jsKey: "test-js-key",
  center: { lat: 37.4979, lng: 127.0276 },
  level: 4,
} as const

function scriptOf(source: string): string {
  const match = source.match(/<script>([\s\S]*?)<\/script>/u)
  if (!match) throw new Error("generated map HTML has no script")
  return match[1]
}

describe("restaurant map color scheme", () => {
  it("라이트·다크 타일 필터가 서로 다르고 다크는 실제로 밝기를 낮춘다", () => {
    expect(MAP_TILE_FILTER.light).not.toBe(MAP_TILE_FILTER.dark)
    expect(MAP_TILE_FILTER.light).toContain("saturate")
    expect(MAP_TILE_FILTER.dark).toContain("invert")
    expect(MAP_TILE_FILTER.dark).toContain("brightness")
  })

  it("초기 다크 모드가 HTML 배경과 타일 필터에 들어간다", () => {
    const html = buildMapHtml({ ...BASE, colorScheme: "dark" })
    expect(html).toContain("#1f1f21")
    expect(html).toContain(JSON.stringify(MAP_TILE_FILTER.dark))
  })

  it("라이트 클러스터는 주황 네온이 아니라 중립 elevation을 쓴다", () => {
    /* 값을 **심볼에서** 본다. 예전에는 파일 원문을 읽어 `/light:\s*"..."/` 로 봤는데,
       그 정규식은 파일 안 아무 `light:` 나 물면 통과한다(타일 필터·배경도 같은 모양이다) —
       정작 클러스터 그림자를 주황으로 되돌려도 다른 `light:` 가 대신 매칭돼 초록이었다. */
    expect(MAP_CLUSTER_SHADOW.light).not.toContain("254,113,57")
    expect(MAP_CLUSTER_SHADOW.dark).toContain("254,113,57")

    const html = buildMapHtml({ ...BASE, colorScheme: "light" })
    expect(html).toContain("box-shadow: var(--cluster-shadow)")
    expect(html).toContain("CLUSTER_SHADOWS")
    expect(html).toContain("--cluster-shadow")
  })

  /**
   * **상호명 라벨은 브랜드색이 아니라 본문색이다 — 그래서 모드마다 갈라야 한다.**
   *
   * 시안(Light) 3배 타일에서 라벨 글자의 잉크는 전부 `#2A2A37`(label.normal)이었고
   * 브랜드 `#FE7139` 는 한 픽셀도 없었다. 마커가 이미 브랜드색이라 라벨까지 주황이면
   * 지도 위 주황 면적이 두 배가 되고 카카오 기본 지도의 주황 POI 라벨과도 섞인다.
   *
   * 그런데 브랜드색은 두 모드에서 그냥 읽혔던 반면 본문색은 그렇지 않다 — 다크에서
   * `#2a2a37` 은 `--map-label-halo`(#1f1f21) 와 같은 어둠이라 **글자가 사라진다.**
   * 그래서 halo 와 같은 자리에서 같은 방식으로 뒤집는다. 이 테스트가 그 한 쌍이
   * 갈라지지 않도록 붙잡는다.
   */
  it("상호명 라벨 색이 모드별로 주입되고 halo 와 같은 자리에서 바뀐다", () => {
    // 라이트 label.normal / 다크 label.normal. 둘이 같아지면 한쪽이 안 보인다.
    // 토큰 대조와 리터럴 못을 함께 둔다 — 앞은 '리터럴 hex 로 되돌아가는 것'을,
    // 뒤는 '토큰 팔레트가 조용히 바뀌는 것'을 잡는다.
    expect(MAP_LABEL_COLOR.light).toBe(semanticLight.label.normal)
    expect(MAP_LABEL_COLOR.dark).toBe(semanticDark.label.normal)
    expect(MAP_LABEL_COLOR.light).toBe("#2a2a37")
    expect(MAP_LABEL_COLOR.dark).toBe("#f9fafb")
    expect(MAP_LABEL_COLOR.light).not.toBe(MAP_LABEL_COLOR.dark)

    const html = buildMapHtml({ ...BASE, colorScheme: "dark" })
    // CSS 는 var 로 받고, 폴백은 초기 모드값이다(첫 페인트가 라이트로 새지 않게).
    expect(html).toContain(
      `color: var(--map-label-color, ${MAP_LABEL_COLOR.dark})`,
    )
    /* 브랜드색으로 되돌아가는 회귀를 막는다. 규칙 **본문 전체**를 보는 이유는 한 줄
       문자열로 잡으면 줄바꿈만 바뀌어도 조용히 무력해지기 때문이다(실제로 그랬다). */
    expect(html).not.toMatch(/\.mk \.name \{[^}]*#FE7139/iu)

    const script = scriptOf(html)
    expect(script).toContain(JSON.stringify(MAP_LABEL_COLOR))
    // halo 와 같은 함수 안에서 바뀌어야 한다 — 갈리면 다크에서 한쪽만 전환된다.
    const applyFn =
      script.split("function applyMapColorScheme(")[1]?.split("\n  }")[0] ?? ""

    /* **대입식 전체**를 본다. 속성 이름만 보면(예전의 `toContain("--map-label-color")`)
       그 값이 한쪽 모드로 굳어도 초록이다 — halo 는 모드별로 뒤집히는데 라벨색만
       라이트 값에 고정되는 분기가 정확히 그렇게 통과했다. 그 분기의 실제 증상은 다크에서
       #2a2a37 라벨이 halo(#1f1f21)에 묻혀 상호명이 사라지는 것이고, 그것이 바로 이 it 이
       막겠다고 선언한 실패다. 따라서 둘 다 '현재 모드로 키잉된다' 는 것까지 못 박는다. */
    expect(applyFn).toMatch(
      /setProperty\(\s*'--map-label-halo',\s*mapColorScheme === 'dark' \? '#1f1f21' : '#ffffff'\s*\)/u,
    )
    expect(applyFn).toMatch(
      /setProperty\(\s*'--map-label-color',\s*LABEL_COLORS\[mapColorScheme\]\s*\)/u,
    )
    /* 위 두 줄이면 충분하지만, 값이 한쪽으로 굳었을 때 "정규식 불일치" 대신 무엇이
       박혔는지가 보이도록 한 겹 더 둔다. */
    const labelColorCall = applyFn.match(/--map-label-color[^\n]*/u)?.[0] ?? ""
    expect(labelColorCall).not.toMatch(
      /LABEL_COLORS\.(light|dark)|LABEL_COLORS\['|#[0-9a-f]{3,8}/iu,
    )
  })

  it("기존 WebView에 setColorScheme 명령을 보낼 수 있다", () => {
    const command = mapScript.setColorScheme("dark")
    expect(command).toContain(".setColorScheme(")
    /*
      bridge 는 모든 인자를 JSON 문자열로 **두 번** 감싼다. WebView 쪽 `arg()` 가 한 번
      풀어 원래 값을 얻는 기존 규약이다 — 여기서 평문 `dark` 를 기대하면 다른 명령과
      인코딩 규칙이 갈라진다.
    */
    expect(command).toContain('"\\\"dark\\\""')
  })

  it("테마 변경 시 이미 뜬 타일까지 다시 칠한다", () => {
    const script = scriptOf(buildMapHtml({ ...BASE, colorScheme: "light" }))
    const setter =
      script.split("setColorScheme: function")[1]?.slice(0, 500) ?? ""
    expect(setter).toContain("applyMapColorScheme")
    expect(setter).toContain("toneDownTiles")

    // 옛 `__sinsinToned` boolean 가드는 한 번 칠한 타일을 영구히 건너뛰어 테마 전환을 막는다.
    expect(script).not.toContain("el.__sinsinToned")
    expect(script).toContain("el.__sinsinTileFilter")
  })

  it("생성된 다크 스크립트가 문법적으로 올바르다", () => {
    expect(
      () =>
        new Function(scriptOf(buildMapHtml({ ...BASE, colorScheme: "dark" }))),
    ).not.toThrow()
  })
})
