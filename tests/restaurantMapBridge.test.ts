/**
 * RN ↔ 카카오맵 WebView 브릿지 프로토콜.
 *
 * 프로토타입은 문자열 템플릿으로 `window.__setMarkers([...])` 를 직접 만들어 넣었고,
 * 값에 `'` 나 `\` 가 섞이면 **주입 스크립트가 문법 오류로 통째로 죽었다**. 그런데 이건
 * 눈에 보이는 실패가 아니다 — `injectJavaScript` 는 예외를 RN 으로 올려 주지 않으므로
 * 마커가 그냥 안 그려지고, 로그도 없다. 크롤링된 상호명에는 `\` 와 개행이 실제로 들어온다.
 *
 * 그래서 이 파일은 스크립트를 **실제로 실행해** 인자를 되받아 값이 왕복하는지 본다
 * (문자열 비교로는 이스케이프가 맞는지 증명되지 않는다).
 */

import type {
  MapBounds,
  MapCluster,
  MapMarker,
  MapStrings,
} from "../src/features/restaurant/map/mapBridge"
import {
  FALLBACK_CENTER,
  MAP_NAMESPACE,
  MAP_ZOOM,
  mapScript,
  parseMapEvent,
} from "../src/features/restaurant/map/mapBridge"

/**
 * 주입 스크립트를 브라우저 대신 실행한다. `window` 를 인자로 받는 함수로 컴파일하므로
 * (1) 문법이 유효한지, (2) 문장이 하나인지, (3) 어떤 인자가 넘어가는지 전부 확인된다.
 */
function runScript(script: string): { method: string; args: unknown[] }[] {
  const calls: { method: string; args: unknown[] }[] = []
  const namespace = new Proxy(
    {},
    {
      get:
        (_target, method: string) =>
        (...args: unknown[]) => {
          calls.push({ method, args })
        },
    },
  )

  const compiled = new Function("window", script)
  compiled({ [MAP_NAMESPACE]: namespace })
  return calls
}

/** web 쪽이 하는 일과 정확히 같다: 인자를 `JSON.parse` 한 번. */
function decodeArg(arg: unknown): unknown {
  return JSON.parse(arg as string)
}

const markers: MapMarker[] = [
  { id: 1, name: "신신국밥", lat: 37.4979, lng: 127.0276, safety: "SAFE" },
  {
    id: 2,
    name: '따옴표"백슬래시\\개행\n탭\t가게',
    lat: 37.5,
    lng: 127.03,
    safety: "RESTRICTED",
  },
  {
    id: 3,
    // 실제로 들어오는 모양들: 홑따옴표, 백틱, 세미콜론, `</script>`, 그리고
    // U+2028/U+2029(줄 구분자) — JSON.stringify 가 이 둘을 이스케이프하지 **않으므로**
    // 옛 엔진에서는 문자열 리터럴이 여기서 깨졌다. ES2019 부터는 허용된다.
    name: "O'Brien's café `backtick`; </script>    <b>",
    lat: 37.49,
    lng: 127.02,
    safety: "CAUTION",
  },
]

/** 언어가 무엇이든 이 모양이어야 한다. 값은 i18n 리소스의 템플릿 그대로다. */
const STRINGS: MapStrings = {
  markerAccessibility: "{{name}}, 안전도 {{safety}}",
  clusterAccessibility: "이 지역 식당 {{count}}곳, 눌러서 확대",
  safetyLabels: {
    SAFE: "안전",
    CAUTION: "주의",
    RESTRICTED: "제한",
    UNKNOWN: "정보 없음",
  },
}

describe("parseMapEvent — 형식이 깨진 메시지는 조용히 버린다", () => {
  it("정상 이벤트는 그대로 통과한다", () => {
    expect(parseMapEvent('{"type":"ready"}')).toEqual({ type: "ready" })
    const idle = parseMapEvent(
      '{"type":"idle","payload":{"center":{"lat":37.5,"lng":127},"bounds":{"swLat":37.4,"swLng":126.9,"neLat":37.6,"neLng":127.1},"zoom":4}}',
    )
    expect(idle?.type).toBe("idle")
  })

  it.each([
    ["빈 문자열", ""],
    ["JSON 이 아님", "not json"],
    ["잘린 JSON", '{"type":"ready"'],
    ["null", "null"],
    ["문자열 리터럴", '"ready"'],
    ["숫자", "42"],
    ["배열", '[{"type":"ready"}]'],
    ["type 없음", '{"payload":{}}'],
    ["type 이 문자열이 아님", '{"type":123}'],
    ["type 이 객체", '{"type":{"a":1}}'],
  ])("%s → null (throw 하지 않는다)", (_label, raw) => {
    // WebView 는 우리가 안 보낸 메시지도 올린다(확장·SDK 내부). 여기서 던지면 화면이 죽는다.
    expect(parseMapEvent(raw)).toBeNull()
  })

  it("알려진 이벤트도 페이로드가 계약과 다르면 버린다", () => {
    expect(parseMapEvent('{"type":"markerClick"}')).toBeNull()
    expect(
      parseMapEvent('{"type":"markerClick","payload":{"id":-1}}'),
    ).toBeNull()
    expect(
      parseMapEvent(
        '{"type":"clusterClick","payload":{"lat":91,"lng":127,"count":2}}',
      ),
    ).toBeNull()
    expect(
      parseMapEvent(
        '{"type":"idle","payload":{"center":{"lat":37.5,"lng":127},"bounds":{"swLat":37.6,"swLng":126.9,"neLat":37.4,"neLng":127.1},"zoom":4}}',
      ),
    ).toBeNull()
  })
})

describe("주입 스크립트는 유효한 한 문장이다", () => {
  const scripts: [string, string][] = [
    ["setMarkers", mapScript.setMarkers(markers)],
    [
      "setClusters",
      mapScript.setClusters([
        { key: "37.5,127.0", lat: 37.5, lng: 127, count: 12 } as MapCluster,
      ]),
    ],
    ["select", mapScript.select(7)],
    ["select(null)", mapScript.select(null)],
    ["moveTo", mapScript.moveTo(37.5, 127, { zoom: 3, animate: false })],
    ["setLevel", mapScript.setLevel(3)],
    [
      "fitBounds",
      mapScript.fitBounds(
        { swLat: 37.4, swLng: 126.9, neLat: 37.6, neLng: 127.1 } as MapBounds,
        { top: 12, bottom: 340 },
      ),
    ],
    ["setUserLocation", mapScript.setUserLocation({ lat: 37.5, lng: 127 }, 90)],
    ["setUserLocation(null)", mapScript.setUserLocation(null)],
    ["panBy", mapScript.panBy(0, -170)],
    ["relayout", mapScript.relayout()],
    ["setStrings", mapScript.setStrings(STRINGS)],
  ]

  it.each(scripts)("%s 는 컴파일된다", (_name, script) => {
    expect(() => new Function("window", script)).not.toThrow()
  })

  it.each(scripts)("%s 는 `; true;` 로 끝난다", (_name, script) => {
    // iOS `evaluateJavaScript` 가 마지막 표현식 값을 직렬화하려 한다. DOM 노드나
    // undefined 가 마지막이면 콘솔에 경고가 쌓인다.
    expect(script.trimEnd().endsWith("; true;")).toBe(true)
    // 문장은 정확히 하나다(가드 표현식 + `true`). 값 안에 `;` 가 있어도 문자열 리터럴
    // 안이므로 문장이 늘지 않는다 — 그래서 세미콜론을 세지 않고 모양을 본다.
    expect(script).toMatch(
      /^\(window\.__sinsinMap && window\.__sinsinMap\.[A-Za-z]+\(.*\)\); true;$/su,
    )
  })

  it.each(scripts)("%s 는 전역이 없어도 터지지 않는다", (_name, script) => {
    // 지도가 준비되기 전에 새는 한 발이 있어도 조용히 무시돼야 한다.

    const compiled = new Function("window", script)
    expect(() => compiled({})).not.toThrow()
  })

  it("전역 이름 하나에 모아 호출한다", () => {
    expect(MAP_NAMESPACE).toBe("__sinsinMap")
    expect(mapScript.relayout()).toContain(`window.${MAP_NAMESPACE}.relayout(`)
  })
})

/**
 * 접근성 문구는 HTML 에 박지 않고 명령으로 보낸다. 프로토타입은 클러스터 라벨을
 * '식당 N곳, 확대해서 보기' 로 스크립트에 직접 넣어, 같은 뜻의 i18n 키가 ko/en 양쪽에
 * 있는데도 영어 사용자가 한국어를 들었다. 여기서 잡는 것은 두 가지다 — 템플릿의 `{{}}`
 * 자리가 이중 인코딩을 통과해 살아남는가, 그리고 네 등급 라벨이 빠짐없이 실려 가는가.
 */
describe("접근성 문구 주입", () => {
  it("템플릿의 보간 자리가 왕복한다", () => {
    const calls = runScript(mapScript.setStrings(STRINGS))
    expect(calls).toHaveLength(1)
    expect(decodeArg(calls[0].args[0])).toEqual(STRINGS)
  })

  it("네 등급 라벨을 모두 싣는다 — 하나라도 빠지면 마커가 등급을 말하지 못한다", () => {
    const decoded = decodeArg(
      runScript(mapScript.setStrings(STRINGS))[0].args[0],
    ) as MapStrings
    expect(Object.keys(decoded.safetyLabels).sort()).toEqual([
      "CAUTION",
      "RESTRICTED",
      "SAFE",
      "UNKNOWN",
    ])
  })
})

describe("이중 인코딩 — 상호명의 따옴표·백슬래시·개행이 왕복한다", () => {
  it("setMarkers 인자를 JSON.parse 한 번으로 원본 그대로 되받는다", () => {
    const calls = runScript(mapScript.setMarkers(markers))
    expect(calls).toHaveLength(1)
    expect(calls[0].method).toBe("setMarkers")
    // 한 번만 stringify 하면 값 안의 `"` 가 주입 스크립트 문법을 깬다.
    // 두 번 통과시키므로 web 쪽은 parse 한 번이면 된다.
    expect(decodeArg(calls[0].args[0])).toEqual(markers)
  })

  it("문제가 되는 문자들이 그대로 살아 있다", () => {
    const calls = runScript(mapScript.setMarkers(markers))
    const decoded = decodeArg(calls[0].args[0]) as MapMarker[]
    expect(decoded[1].name).toBe('따옴표"백슬래시\\개행\n탭\t가게')
    expect(decoded[1].name).toContain("\\")
    expect(decoded[1].name).toContain("\n")
    expect(decoded[2].name).toContain("O'Brien's")
    expect(decoded[2].name).toContain("`backtick`")
    expect(decoded[2].name).toContain("</script>")
  })

  it("여러 인자를 쓰는 명령도 각 인자가 독립적으로 왕복한다", () => {
    const bounds: MapBounds = {
      swLat: 37.4906,
      swLng: 127.0197,
      neLat: 37.5053,
      neLng: 127.0367,
    }
    const calls = runScript(
      mapScript.fitBounds(bounds, { top: 12, bottom: 340 }),
    )
    expect(calls[0].args).toHaveLength(2)
    expect(decodeArg(calls[0].args[0])).toEqual(bounds)
    expect(decodeArg(calls[0].args[1])).toEqual({ top: 12, bottom: 340 })
  })

  it("moveTo 는 옵션을 한 객체로 접고 기본값을 명시한다", () => {
    const calls = runScript(mapScript.moveTo(37.5, 127.03))
    // 기본 animate=true, zoom 은 "지정 안 함" 을 null 로 명시한다 — undefined 는 JSON 에서 사라진다.
    expect(decodeArg(calls[0].args[0])).toEqual({
      lat: 37.5,
      lng: 127.03,
      zoom: null,
      animate: true,
    })
    const explicit = runScript(
      mapScript.moveTo(37.5, 127.03, { zoom: 3, animate: false }),
    )
    expect(decodeArg(explicit[0].args[0])).toEqual({
      lat: 37.5,
      lng: 127.03,
      zoom: 3,
      animate: false,
    })
  })

  it("null 인자가 undefined 로 뭉개지지 않는다", () => {
    expect(decodeArg(runScript(mapScript.select(null))[0].args[0])).toBeNull()
    const user = runScript(mapScript.setUserLocation(null))
    expect(decodeArg(user[0].args[0])).toBeNull()
    expect(decodeArg(user[0].args[1])).toBeNull()
  })

  it("빈 배열도 명령을 보낸다 — 마커 지우기가 무음이 되면 안 된다", () => {
    const calls = runScript(mapScript.setMarkers([]))
    expect(calls).toHaveLength(1)
    expect(decodeArg(calls[0].args[0])).toEqual([])
  })

  it("숫자 인자는 문자열이 아니라 숫자로 도착한다", () => {
    const calls = runScript(mapScript.panBy(0, -170))
    expect(decodeArg(calls[0].args[0])).toBe(0)
    expect(decodeArg(calls[0].args[1])).toBe(-170)
  })
})

describe("줌 규약과 폴백 중심", () => {
  it("카카오 level 은 작을수록 확대다", () => {
    expect(MAP_ZOOM.FOCUSED).toBeLessThan(MAP_ZOOM.DEFAULT)
    expect(MAP_ZOOM.MIN).toBeLessThan(MAP_ZOOM.MAX)
  })

  it("클러스터 임계값은 백엔드와 같은 4다", () => {
    // 여기를 바꾸면 백엔드 CLUSTER_ZOOM_THRESHOLD 도 같이 바꿔야 한다.
    // 6 에서 내린 근거는 실측이다: level 4 에서 `한식` 마커가 161개, 링이 겹치는 쌍이
    // 259개였다(표는 백엔드 상수 주석).
    expect(MAP_ZOOM.CLUSTER_THRESHOLD).toBe(4)
  })

  it("식당 선택은 더 가까운 배율로 이동하고 이름은 전 배율에서 허용한다", () => {
    expect(MAP_ZOOM.FOCUSED).toBeLessThan(MAP_ZOOM.DEFAULT)
    expect(MAP_ZOOM.LABEL_THRESHOLD).toBe(MAP_ZOOM.MAX)
  })

  it("진입 배율은 도보권 개요를 유지한다", () => {
    expect(MAP_ZOOM.DEFAULT).toBe(4)
  })

  it("폴백 중심은 강남역이다 — 시드 데이터가 그 한 블록뿐이다", () => {
    // 시청(37.5665,126.978)으로 열면 첫 화면이 항상 0건이고 사용자는 고장으로 읽는다.
    expect(FALLBACK_CENTER).toEqual({ lat: 37.4979, lng: 127.0276 })
  })
})

it("round-trips exposed map insets through the command bridge", () => {
  const insets = { top: 130, bottom: 260, left: 8, right: 12 }
  const [call] = runScript(mapScript.setLabelInsets(insets))
  expect(call.method).toBe("setLabelInsets")
  expect(decodeArg(call.args[0])).toEqual(insets)
})
