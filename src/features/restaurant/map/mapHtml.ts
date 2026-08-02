/**
 * 카카오맵 JS SDK 를 WebView 안에서 띄우는 HTML.
 *
 * ## 이 파일이 지켜야 하는 네 가지
 *
 * 1. **한 번만 만든다.** 호출부가 `useMemo(..., [])` 로 잡아 마운트 시 한 번만 생성한다.
 *    마커가 바뀔 때마다 HTML 을 다시 만들면 WebView 가 통째로 리로드되고, 지도 타일을
 *    다시 받고, 카메라가 초기 위치로 튄다 — 기존 `KakaoMapWebView` 의 결함이 정확히 이거였다.
 *    마커/카메라는 전부 `window.__sinsinMap.*` 명령으로 바꾼다.
 *
 * 2. **선택 상태 변경으로 오버레이를 다시 만들지 않는다.** 마커 한 개를 고를 때마다
 *    200개 오버레이를 재생성하면(프로토타입이 그랬다) 탭이 눈에 띄게 늦는다. 선택/비선택
 *    두 모습을 한 DOM 에 담고 **클래스만 토글**한다. 그래서 마커 DOM 은
 *    좌표에 붙은 1×1 앵커이고 링·라벨·말풍선은 모두 그 앵커 기준 absolute 다 —
 *    이렇게 해야 `yAnchor` 를 바꾸지 않고도 말풍선 꼬리 끝이 좌표를 정확히 가리킨다
 *    (카카오 `CustomOverlay` 의 앵커는 생성 후 바꿀 수 없다).
 *
 * 3. **터치를 직접 판정한다.** iOS WebView 에서 카카오 지도는 제스처를 가로채며 `click`
 *    이벤트를 삼킨다. 그래서 `addTap()` 이 `touchstart`/`touchmove`/`touchend` 로 직접
 *    탭을 판정한다. 프로토타입이 커밋 3개를 이 문제에 썼고, 그 결론을 그대로 가져왔다.
 *
 * 4. **실패를 숨기지 않는다.** SDK 스크립트가 안 뜨거나(키 만료·도메인 미등록·네트워크)
 *    `kakao.maps.load` 가 안 돌면 `error` 이벤트를 올린다. 앱은 그 신호로 리스트 모드로
 *    내려간다. 아무것도 안 하면 사용자는 회색 사각형을 본다.
 *
 * 5. **이 파일에 사람이 읽는 문자열을 박지 않는다.** 접근성 라벨은 `setStrings` 명령으로
 *    받는다. 프로토타입은 `'식당 N곳, 확대해서 보기'` 를 스크립트에 직접 넣었고, 같은 뜻의
 *    i18n 키(`restaurant.map.clusterAccessibility`)가 ko/en 양쪽에 있는데도 영어 사용자가
 *    한국어를 들었다. WebView 라서 `t()` 를 쓸 수 없는 것이 문자열을 박아도 된다는 뜻은 아니다.
 *
 * ## 이 파일 전체가 **템플릿 리터럴**이다 — 이스케이프가 두 번 해석된다
 *
 * 아래 HTML 은 `` ` `` 로 감싼 문자열이라, 여기 적은 `\n`·`\\`·`` ` ``·`${}` 는
 * **타입스크립트가 먼저 먹는다.** 생성된 JS 에 그 문자를 그대로 남기려면 한 번 더
 * 이스케이프해야 한다(`\n` 이 아니라 `\\n`). 이걸 틀리면 아주 나쁜 방식으로 실패한다:
 *
 *     '\nlevel '   →  생성된 JS 에 **진짜 줄바꿈**이 들어간 홑따옴표 문자열
 *                  →  스크립트 전체가 SyntaxError
 *                  →  IIFE 가 한 줄도 안 돌고, 따라서 `post('error')` 도 안 나가고,
 *                     12초 마감 시한도 안 걸리고, 화면은 리스트 모드로도 못 내려간다.
 *                  →  **회색 사각형이 영원히 남는다.** (2026-07-31 실제로 이렇게 죽어 있었다.
 *                     `<div id="dbg">booting…</div>` 은 정적 HTML 이라 그대로 보이는 바람에
 *                     "부팅 중" 으로 오해하기 딱 좋았다.)
 *
 * 같은 이유로 이 파일의 주석에는 백틱을 쓸 수 없다(그것도 한 번 죽인 적이 있다).
 *
 * 이 실패 모드는 `tsc` 가 절대 못 잡는다 — 타입스크립트가 보기에 문자열은 완벽히 정상이고,
 * 깨지는 것은 그 문자열이 **담고 있는** 프로그램이기 때문이다. 그래서
 * `tests/restaurantMapHtml.test.ts` 가 생성된 스크립트를 실제로 파싱해 본다.
 * 이 파일을 고쳤으면 그 테스트를 돌릴 것.
 *
 * ## 라이브러리를 왜 안 붙이나
 *
 * `libraries=clusterer` 를 켜지 않는다. 클러스터는 **서버가 SQL 로 집계**해 내려주고
 * (`GET /restaurants/map` 의 `mode:"CLUSTER"`) 여기서는 그 숫자를 오버레이로 그릴 뿐이다.
 * 클라이언트 클러스터러를 함께 켜면 이중으로 묶이고, 무엇보다 클라이언트가 셀 수 있는 건
 * "이미 `limit` 에 잘려서 받은 마커 수" 라 참값이 아니다.
 */

import { MAP_NAMESPACE, MAP_ZOOM, type LatLng } from "./mapBridge"

/** 디자인 토큰과 같은 값. WebView 안이라 토큰 모듈을 import 할 수 없어 리터럴이다. */
const BRAND = "#FE7139"

export interface MapHtmlOptions {
  jsKey: string
  center: LatLng
  level?: number
}

/**
 * HTML 에 박아 넣는 초기 level 을 빌드 시점에 조인다.
 * 범위를 벗어난 값은 카카오가 예외로 던지고 지도가 아예 안 뜬다 — `error` 이벤트로
 * 처리할 수야 있지만, 애초에 막을 수 있는 건 막는다.
 */
function clampLevel(level: number): number {
  if (!Number.isFinite(level)) return MAP_ZOOM.DEFAULT
  return Math.min(MAP_ZOOM.MAX, Math.max(MAP_ZOOM.MIN, Math.round(level)))
}

export function buildMapHtml({
  jsKey,
  center,
  level = MAP_ZOOM.DEFAULT,
}: MapHtmlOptions): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
<style>
  /* 텍스트 선택·콜아웃을 끈다. 마커 라벨/말풍선은 글자라서 롱프레스하면 iOS 가 돋보기와
     복사 메뉴를 띄우고, 그 뒤 첫 탭이 메뉴 닫기에 소비돼 마커가 안 열린다.
     상속되므로 자식 셀렉터를 따로 두지 않는다. */
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #EAE8E4;
               -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
  #map { width: 100%; height: 100%; }

  /* 마커 폰트. Pretendard 는 WebView 에 없으므로 시스템 한글 폰트로 떨어진다. */
  .mk, .cl { font-family: -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; }

  /* ── 마커 앵커 ──
     1×1 이다. 좌표에 정확히 놓이고, 보이는 것들은 전부 이 점 기준 absolute 다.
     0×0 으로 두면 일부 WebView 가 자식의 히트 테스트를 건너뛴다. */
  .mk { position: relative; width: 1px; height: 1px; }

  /* 히트 영역. 링이 20px 이라 손가락으로 정확히 못 짚는다. 44px 투명 사각형을 깐다.
     보이는 요소를 키우는 대신 이걸 쓴다 — 시각 크기는 디자인이 정한 값이다. */
  .mk .hit { position: absolute; left: -22px; top: -22px; width: 44px; height: 44px; }

  /* 기본 마커: 흰 채움 + 브랜드 링. 목업의 링 마커 그대로. */
  .mk .ring { position: absolute; left: -10px; top: -10px; width: 20px; height: 20px;
              border-radius: 50%; background: #fff; border: 3px solid ${BRAND};
              box-shadow: 0 1px 3px rgba(42,42,55,0.28); box-sizing: border-box; }

  /* 상호명 라벨. 확대했을 때만 붙는다(겹침 방지). 배경이 무엇이든 읽히도록 흰 외곽선. */
  .mk .name { position: absolute; left: 0; top: 13px; transform: translateX(-50%);
              font-size: 13px; font-weight: 600; color: ${BRAND}; white-space: nowrap;
              text-shadow: 0 0 3px #fff, 0 0 3px #fff, 0 0 3px #fff, 0 0 2px #fff; }

  /* ── 선택 말풍선 ──
     배치는 **앵커 원점(= 좌표) 기준**이고 부모 상자 크기에 의존하지 않는다:
     top:-18px + translateY(-100%) → 말풍선 **아랫변**이 원점에서 18px 위.
     꼬리(아래로 5px)의 끝은 13px 위 = 링 윗변(10px 위)보다 3px 높다.

     bottom:Npx 로 두지 않는 이유: 그 값은 부모(.mk)의 높이를 기준으로 계산되므로 앵커
     상자 크기가 흔들리면 같이 흔들린다. 위 배치는 원점만 보므로 흔들릴 곳이 없다. */
  /* pointer-events 를 끄는 이유: 말풍선은 불투명하고 앵커 기준 x ±90 · y -50~-18 까지
     번진다. 강남 시드는 376곳 중 202곳이 반경 10m 안에 이웃을 가지므로, 하나를 고르면
     그 말풍선이 이웃 마커의 탭을 통째로 삼킨다. 히트는 .hit(44px)가 계속 받는다. */
  .mk .bubble { display: none; pointer-events: none; position: absolute; left: 0; top: -18px;
                transform: translate(-50%, -100%); align-items: center; height: 32px; padding: 0 12px;
                border-radius: 999px; background: ${BRAND};
                font-size: 13px; font-weight: 700; color: #fff; white-space: nowrap;
                box-shadow: 0 2px 8px rgba(42,42,55,0.22); }
  .mk .bubble::after { content: ''; position: absolute; left: 50%; bottom: -5px;
                transform: translateX(-50%);
                border-left: 5px solid transparent; border-right: 5px solid transparent;
                border-top: 5px solid ${BRAND}; }

  /*
    ── 선택 시 ──

    §꼬리가 가리키는 곳 (2026-07-31 수정)

    (주의: 이 파일은 통째로 템플릿 리터럴이라 주석에도 백틱을 쓸 수 없다.)

    종전에는 선택하면 **링이 사라졌다**(.mk.sel .ring 이 display:none 이었다). 그래서 화면에는
    말풍선만 남고, 그 꼬리는 **아무것도 없는 자리**를 가리켰다. 사용자 보고가 정확히
    그것이다 — "노드에 말풍선 꼬리가 붙은 게 아니라 말풍선이 근처 이상한 위치에 생긴다".
    좌표 계산은 맞았지만 **가리킬 대상을 우리가 지웠기 때문에** 어긋나 보였다.

    지도 앱들은 반대로 한다: 선택하면 핀을 **더 또렷하게** 만들고 라벨을 그 위에 얹는다.
    핀이 남아 있어야 '이 말풍선은 저 점의 것' 이 눈으로 이어진다.

    그래서 링은 남기고 **채움을 뒤집는다**(흰 채움 → 브랜드 채움). 선택은 색이 아니라
    채움의 반전으로 말하므로 색각 이상에서도 갈린다. 상호명 라벨(.name)만 숨긴다 —
    말풍선이 같은 이름을 더 크게 말하고 있어서 두 번 적을 이유가 없다.
  */
  .mk.sel .bubble { display: inline-flex; }
  .mk.sel .name { display: none; }
  .mk.sel .ring { background: ${BRAND}; border-color: #fff;
                  box-shadow: 0 2px 6px rgba(42,42,55,0.32); }

  /* ── 클러스터: 개수 배지. 구간별로 크기를 키운다. ── */
  .cl { position: relative; display: flex; align-items: center; justify-content: center;
        border-radius: 50%; background: ${BRAND}; color: #fff; font-weight: 700;
        box-shadow: 0 2px 10px rgba(254,113,57,0.42);
        /* 반투명 흰 테로 배경 지도와 분리한다. */
        border: 3px solid rgba(255,255,255,0.9); box-sizing: border-box; }
  .cl.s1 { width: 40px; height: 40px; font-size: 13px; }
  .cl.s2 { width: 48px; height: 48px; font-size: 14px; }
  .cl.s3 { width: 58px; height: 58px; font-size: 15px; }

  /* ── 내 위치: 점 + 반투명 헤일로. 헤일로는 정확도가 아니라 존재감 표시다. ── */
  .ul { position: relative; width: 1px; height: 1px; }
  .ul .halo { position: absolute; left: -22px; top: -22px; width: 44px; height: 44px;
              border-radius: 50%; background: rgba(254,113,57,0.18); }
  .ul .dot { position: absolute; left: -7px; top: -7px; width: 14px; height: 14px;
             border-radius: 50%; background: ${BRAND}; border: 2px solid #fff;
             box-shadow: 0 1px 4px rgba(42,42,55,0.3); box-sizing: border-box; }
  /* 방향 삼각형. 점 위쪽에 놓고 점을 중심으로 회전한다. */
  .ul .head { position: absolute; left: -5px; top: -18px; width: 0; height: 0;
              border-left: 5px solid transparent; border-right: 5px solid transparent;
              border-bottom: 8px solid ${BRAND}; transform-origin: 5px 18px; }
</style>
</head>
<body>
<div id="map"></div>
<script>
(function () {
  'use strict';

  var LABEL_THRESHOLD = ${MAP_ZOOM.LABEL_THRESHOLD};
  var ZOOM_MIN = ${MAP_ZOOM.MIN};
  var ZOOM_MAX = ${MAP_ZOOM.MAX};

  var map = null;
  /**
   * 접근성 문구. RN 이 'setStrings' 로 넣어 준다(HTML 에 한글을 박지 않는다).
   * 도착 전에는 이름만 라벨로 쓴다 — 빈 껍데기 문구를 읽어 주는 것보다 낫다.
   */
  var strings = null;
  /**
   * id -> { overlay, el, hit, name, item, labelW, labelH, z }.
   * el 을 들고 있어야 선택 토글을 DOM 조작으로 끝낼 수 있고, hit/name 을 함께 들고 있어야
   * 매 배치마다 querySelector 를 200번 돌지 않는다.
   */
  var markers = {};
  /** key -> { overlay, el, item }. 마커와 같은 모양이어야 라벨을 나중에 갈 수 있다. */
  var clusters = {};
  var userOverlay = null;
  var lastMarkers = [];
  var selectedId = null;
  var labelsOn = null;
  /** 마커 탭 직후에 함께 날아오는 지도 click 을 무시하기 위한 시각. */
  var lastTapAt = 0;
  /*
    마커/클러스터 탭만 적는 시각. 배경 탭은 여기 손대지 않는다.

    왜 lastTapAt 과 따로 있나: addTap 은 발화 직전에 lastTapAt 을 지금으로 갱신하므로,
    배경 탭 콜백 안에서 lastTapAt 을 읽으면 그 값은 항상 방금 갱신된 값이다 — 즉 400ms 가드가
    자기 자신을 걸러 배경 탭이 영원히 안 나간다. 마커 쪽만 적는 변수를 따로 두면
    가드가 원래 뜻대로(마커 탭 직후의 배경 탭을 버린다) 동작한다.
  */
  var lastMarkerTapAt = 0;

  function post(type, payload) {
    if (!window.ReactNativeWebView) return;
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload || {} }));
  }

  function fail(message) { post('error', { message: String(message) }); }

  /** RN 은 인자를 이중 인코딩해서 보낸다(mapBridge.encodeArg). 그래서 parse 한 번. */
  function arg(raw) {
    if (raw === undefined || raw === null) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function clamp(level) { return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, level)); }
  function labelsVisible() { return map ? map.getLevel() <= LABEL_THRESHOLD : false; }

  /**
   * i18next 의 '{{key}}' 자리를 채운다. 정규식을 키마다 만들지 않고 한 번 훑는 이유는
   * 값 안에 '{{' 가 섞여도 두 번 치환되지 않게 하려는 것이다(상호명은 사용자 데이터다).
   */
  function fill(template, vars) {
    return String(template).replace(/\\{\\{(\\w+)\\}\\}/g, function (whole, key) {
      return Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : whole;
    });
  }

  /** 마커 라벨. 문구가 아직 없으면 상호명만 읽어 준다. */
  function markerLabel(item) {
    if (!strings || !strings.markerAccessibility) return item.name;
    var labels = strings.safetyLabels || {};
    var safety = labels[item.safety];
    // 등급 라벨이 없으면 등급을 말하지 않는다 — 열거형 이름('RESTRICTED')을 읽어 주면
    // 스크린리더 사용자에게는 뜻 없는 영문이 된다.
    if (!safety) return item.name;
    return fill(strings.markerAccessibility, { name: item.name, safety: safety });
  }

  /** 클러스터 라벨. 문구가 없으면 숫자만 읽어 준다. */
  function clusterLabel(item) {
    if (!strings || !strings.clusterAccessibility) return String(item.count);
    return fill(strings.clusterAccessibility, { count: item.count });
  }

  /** 'setStrings' 가 늦게 도착했을 때 이미 그려진 오버레이의 라벨을 갈아 준다. */
  function refreshLabels() {
    for (var k in markers) {
      if (!Object.prototype.hasOwnProperty.call(markers, k)) continue;
      markers[k].el.setAttribute('aria-label', markerLabel(markers[k].item));
    }
    for (var c in clusters) {
      if (!Object.prototype.hasOwnProperty.call(clusters, c)) continue;
      var entry = clusters[c];
      entry.el.setAttribute('aria-label', clusterLabel(entry.item));
    }
  }

  /**
   * 탭 판정. iOS WebView 에서 지도가 click 을 삼키므로 터치를 직접 본다.
   * 이동이 8px 를 넘으면 팬으로 보고 탭으로 세지 않는다.
   */
  function addTap(el, fn) {
    var sx = 0, sy = 0, moved = false, firedAt = 0;
    function fire(e) {
      // touchend 와 click 이 둘 다 오는 기기가 있다. 500ms 안의 두 번째 발화는 버린다.
      if (Date.now() - firedAt < 500) return;
      firedAt = Date.now();
      if (e && e.stopPropagation) e.stopPropagation();
      lastTapAt = Date.now();
      fn();
    }
    /*
      손가락이 둘 이상이면 탭이 아니다 — 핀치다.

      종전 판정은 첫 손가락의 이동만 봤다. 핀치는 보통 한 손가락(엄지)을 거의 고정한 채
      다른 손가락을 벌리므로 8px 문턱을 넘지 않고, touchend 에서 그대로 탭으로 발화했다.
      배경에서 나면 선택이 풀리고, 마커 위에서 나면 확대하려던 사용자에게 엉뚱한 가게가
      열렸다. touches.length 로만 판정하므로 새 상태 변수가 없다.
    */
    el.addEventListener('touchstart', function (e) {
      var t = e.touches[0]; sx = t.clientX; sy = t.clientY;
      moved = e.touches.length > 1;
    }, { passive: true });
    el.addEventListener('touchmove', function (e) {
      var t = e.touches[0];
      if (e.touches.length > 1) moved = true;
      else if (Math.abs(t.clientX - sx) > 8 || Math.abs(t.clientY - sy) > 8) moved = true;
    }, { passive: true });
    el.addEventListener('touchend', function (e) { if (!moved) fire(e); });
    el.addEventListener('click', fire);
    return el;
  }

  function boundsPayload() {
    var b = map.getBounds();
    var sw = b.getSouthWest(), ne = b.getNorthEast();
    return { swLat: sw.getLat(), swLng: sw.getLng(), neLat: ne.getLat(), neLng: ne.getLng() };
  }

  /*
    현재 뷰포트를 RN 에 알린다.

    ## 카카오 'idle' 은 **변화가 있을 때만** 온다 — 그래서 이 함수가 따로 있다

    지도를 처음 띄우고 사용자가 손대지 않으면 'idle' 리스너는 **한 번도 불리지 않는다.**
    앱 쪽에서는 그 한 번이 전부인데도 그렇다: 첫 뷰포트가 도착해야 useMapSearch 가 bbox 를
    확정하고(committedBounds), 그래야 지도 질의가 처음으로 실행된다. 실측된 증상은
    이랬다 — 위치 권한이 없는 상태로 식당 탭에 들어가면 handleMapReady 가 옮길 좌표가 없어
    카메라가 그대로 있고, 'idle' 이 안 오고, bbox 가 확정되지 않아 마커가 **영원히** 안 뜬다.
    한식 칩을 눌러도 마찬가지다. 지도를 손으로 한 번 끌어야만 그때 idle 이 오면서
    현재 지도에서 찾기 pill 이 떴다. 목록은 bbox 없이도 전국 검색으로 채워졌기 때문에
    목록은 되는데 지도만 빈다 — 그렇게 보여서 원인이 더 안 보였다.

    그래서 크기가 확정되는 순간(relayoutIfSized) 이 함수를 직접 부른다.
    **D7 을 어기지 않는다** — 여기서 하는 일은 뷰포트를 알려 주는 것뿐이고, 질의를 낼지는
    화면이 정한다(진입 1회 예외는 RestaurantMapScreen 이 소유한다).
  */
  /*
    ── 왜 idle 을 모아서 한 번만 올리는가 ──

    카카오는 **카메라 변경마다** idle 을 낸다. 앱이 줌과 이동을 함께 주는 명령(클러스터
    파고들기, 카드 탭, 지역 이동)은 그래서 idle 을 두 번 낸다 — 줌 직후 한 번, 이동 뒤
    한 번. 그 사이 상태는 **어디에도 존재하지 않는 화면**이다(새 배율 + 옛 중심).

    RN 쪽이 그 중간 idle 을 먼저 받으면 두 가지가 동시에 깨진다.
      1. 자동 재검색 예약을 중간 상태가 소비한다 → **엉뚱한 bbox 로 질의가 나간다.**
      2. 남은 진짜 idle 은 예약이 없으니 사용자 팬으로 읽힌다 → 방금 파고든 자리에
         재검색 버튼이 뜬다(결과는 이미 최신인데).
         (이 파일은 템플릿 리터럴 안이라 백틱을 쓸 수 없다.)

    그래서 여기서 모은다. 마지막 것만 올라가므로 RN 은 **카메라가 실제로 멈춘 자리**
    하나만 본다. 상태 기계를 RN 쪽에 만들지 않는 것이 요지다 — 중간 상태를 아예
    보내지 않으면 그것을 구분할 규칙도 필요 없다.
  */
  var IDLE_SETTLE_MS = 80;
  var idleTimer = null;

  function postIdle() {
    if (idleTimer !== null) clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { idleTimer = null; postIdleNow(); }, IDLE_SETTLE_MS);
  }

  function postIdleNow() {
    if (!map) return;
    var c = map.getCenter();
    post('idle', {
      center: { lat: c.getLat(), lng: c.getLng() },
      bounds: boundsPayload(),
      zoom: map.getLevel(),
    });
    // 라벨 경계를 넘나들었으면 마커를 다시 그린다. zoom_changed 만 보면 더블탭 줌처럼
    // zoom_changed 없이 끝나는 경로를 놓친다.
    if (labelsVisible() !== labelsOn && lastMarkers.length > 0) {
      rebuildMarkers();
    } else {
      // 배율이 그대로여도 마커의 화면 좌표는 바뀐다 — 겹침 순서·히트 크기·라벨을 다시 잡는다.
      applyScreenLayout();
    }
  }

  function dropAll(store) {
    for (var k in store) {
      if (!Object.prototype.hasOwnProperty.call(store, k)) continue;
      var entry = store[k];
      var overlay = (entry && entry.overlay) ? entry.overlay : entry;
      if (overlay && overlay.setMap) overlay.setMap(null);
    }
  }

  /* ── 마커 ───────────────────────────────────────────── */

  function markerEl(item, showLabel) {
    var el = document.createElement('div');
    el.className = 'mk';

    var bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = item.name;

    var ring = document.createElement('div');
    ring.className = 'ring';

    el.appendChild(bubble);
    el.appendChild(ring);

    var name = null;
    if (showLabel) {
      name = document.createElement('div');
      name.className = 'name';
      name.textContent = item.name;
      el.appendChild(name);
    }

    // 히트 영역은 마지막에 얹어 다른 자식 위에 온다. 링·라벨 어디를 눌러도 같은 탭이다.
    var hit = document.createElement('div');
    hit.className = 'hit';
    el.appendChild(hit);

    el.setAttribute('role', 'button');
    // 링 색이 등급을 말하지 않으므로(mapBridge 의 'MapMarker.safety' 주석) 등급은
    // 여기 라벨에만 실린다. 색만으로 뜻을 전하지 않기 위한 요건이다.
    el.setAttribute('aria-label', markerLabel(item));
    addTap(el, function () {
      lastMarkerTapAt = Date.now();
      post('markerClick', { id: item.id });
    });
    return { el: el, hit: hit, name: name };
  }

  /** 오버레이를 전부 다시 만든다. 마커 목록이나 라벨 경계가 바뀔 때만 부른다. */
  function rebuildMarkers() {
    labelsOn = labelsVisible();
    var next = {};
    var i, entry;
    /*
      **역순**으로 만든다. 좌표가 같은 마커는 z 가 같고(z = round(y)+1), 동점은 DOM 순서가
      가른다 — 나중에 붙은 것이 위다. 라벨은 서버 순서 앞쪽이 가져가므로(applyLabelCollision),
      정순으로 만들면 라벨에 적힌 가게가 뒤에 깔려 **다른 가게가 눌린다.** 강남 시드는
      좌표가 완전히 같은 쌍이 10% 라 히트 영역을 아무리 조여도 못 가른다.
      역순이면 앞쪽이 마지막에 붙어 위로 온다 = 라벨과 탭이 같은 가게를 가리킨다.
    */
    for (i = lastMarkers.length - 1; i >= 0; i--) {
      var item = lastMarkers[i];
      var parts = markerEl(item, labelsOn);
      var overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(item.lat, item.lng),
        content: parts.el,
        /*
          앵커를 **0/0** 으로 둔다 (2026-07-31).

          카카오 CustomOverlay 는 앵커를 (측정된 콘텐츠 크기 × 앵커비율) 만큼의 마진으로
          적용한다. 0.5/0.5 일 때는 그 곱이 크기에 비례하므로, 크기를 **한 번이라도 잘못
          재면** 그만큼 오버레이가 통째로 밀린다. 우리 앵커(.mk)는 1×1 이라 정상적으로는
          0.5px 밖에 안 되지만, 스타일이 적용되기 전(첫 페인트·재삽입 시점)에 재면
          말풍선 크기 그대로 잡혀 **상호명이 길수록 크게 밀린다** — 기본적으로는 맞는데
          가끔 안 맞는다는 증상의 정체가 이 타이밍 의존이다.

          앵커가 0/0 이면 곱이 항상 0 이라 **측정값이 무엇이든 위치가 같다.** 대신 자식들이
          앵커 원점(=좌표)을 기준으로 놓여야 하므로 CSS 도 함께 바꿨다(아래 .bubble/.name).
        */
        xAnchor: 0,
        yAnchor: 0,
        zIndex: 1,
      });
      overlay.setMap(map);
      next[item.id] = {
        overlay: overlay, el: parts.el, hit: parts.hit, name: parts.name,
        item: item, labelW: 0, labelH: 0, z: 1,
      };
    }
    dropAll(markers);
    markers = next;

    /*
      라벨 크기를 **여기서 딱 한 번** 잰다.

      선택 클래스를 이 루프에서 붙이지 않는 것이 그 때문이다. 'mk sel' 은 CSS 로
      .name 을 display:none 으로 만들고, 숨은 요소의 offsetWidth 는 0 이다 — 루프 안에서
      선택을 칠하면 하필 선택된 마커만 라벨 폭을 영원히 0 으로 캐시한다. 선택은
      아래 applySelection() 이 잰 다음에 칠한다.

      읽기를 한 덩어리로 모으는 것도 의도다. 쓰기와 번갈아 읽으면 마커마다 리플로가
      한 번씩 돌아 200개면 200번이다. 여기서는 전부 붙인 뒤 한 번만 돈다.
      폭은 배율이 바뀌어도 변하지 않으므로(글자 크기가 고정이다) 이후 배치 패스는
      DOM 을 읽지 않는다.
    */
    for (i = 0; i < lastMarkers.length; i++) {
      entry = next[lastMarkers[i].id];
      if (!entry || !entry.name) continue;
      entry.labelW = entry.name.offsetWidth;
      entry.labelH = entry.name.offsetHeight;
    }

    applySelection();
    applyScreenLayout();
  }

  /**
   * 선택만 바꾼다. 오버레이를 건드리지 않는다 — 클래스 토글 + zIndex 뿐이다.
   * setZIndex 는 카카오 CustomOverlay 가 제공하는 몇 안 되는 사후 변경 API 다.
   * (이 파일은 템플릿 리터럴 안이라 백틱을 쓸 수 없다 — 쓰면 템플릿이 여기서 끊긴다.)
   *
   * 비선택 마커의 z 는 1 로 되돌리지 않고 배치 패스가 계산해 둔 entry.z 로 되돌린다.
   * 1 로 되돌리면 선택을 한 번 했다 푼 마커만 겹침 순서가 달라져, 같은 자리를 눌렀는데
   * 어제와 다른 가게가 열린다.
   */
  function applySelection() {
    for (var k in markers) {
      if (!Object.prototype.hasOwnProperty.call(markers, k)) continue;
      var entry = markers[k];
      var isSel = entry.item.id === selectedId;
      entry.el.className = isSel ? 'mk sel' : 'mk';
      if (entry.overlay.setZIndex) {
        entry.overlay.setZIndex(isSel ? SELECTED_Z : (entry.z || 1));
      }
    }
  }

  /*
    ── 화면 좌표 배치 ────────────────────────────────────────────

    마커를 그린 뒤와 지도가 멎을 때마다 한 번 돈다. 세 가지를 화면 픽셀 기준으로 정한다.

    **1. 겹침 순서(z).** 화면에서 아래쪽에 있는 마커가 앞이다(지도 관례). 이게 중요한
    이유는 미관이 아니라 **히트 테스트**다. 예전에는 비선택 마커가 전부 z=1 이라 겹쳤을 때
    누가 탭을 먹을지 DOM 순서, 즉 서버가 준 배열 순서가 정했다. 사용자에게는 "보이는 것과
    다른 가게가 열린다" 로 보였고, 정렬을 바꾸면 같은 자리에서 다른 가게가 열렸다.
    이제는 앞에 그려진 것이 눌린다 — 그 성질이 성립한다.

    **2. 히트 영역 크기.** 44px 투명 사각형은 이웃이 멀 때는 옳지만, 마커가 20px 간격으로
    붙어 있으면 서로를 완전히 덮어 옆 가게를 누르는 것이 불가능해진다. 그래서 반너비를
    가장 가까운 이웃까지 거리의 절반으로 조인다(하한 10px). 이웃이 없으면 그대로 22px 다.
    하한이 필요한 이유는 데이터가 실제로 겹쳐 있어서다 — 강남 시드 376곳 중 202곳이
    반경 10m 안에 이웃을 갖고 10%는 좌표가 아예 같다. 그런 쌍은 어떤 크기로도 못 가르므로,
    거기서는 1번(z 순서)이 보이는 것과 눌리는 것을 일치시킨다.

    **3. 라벨 충돌.** 아래 applyLabelCollision 주석 참고.

    비용: 최근접 이웃이 O(n²) 다. n 은 서버 상한이 500 이고 보통 200 이하라
    25만 번의 곱셈 없는 비교이고, 지도가 멎을 때만 돈다. 격자 해시로 줄일 수 있지만
    그 복잡도를 살 만큼 비싸지 않다. **DOM 은 한 글자도 읽지 않는다** — 좌표는 카카오
    projection 에서, 라벨 크기는 rebuildMarkers 가 캐시해 둔 값에서 온다.
  */
  var SELECTED_Z = 100000;
  /** 히트 반너비 하한. 이보다 작으면 손가락이 아예 못 짚는다. */
  var HIT_HALF_MIN = 10;
  /** 히트 반너비 상한(= 44px 정사각형). */
  var HIT_HALF_MAX = 22;
  /** 화면 밖 여유. 이 밖의 마커는 배치 계산에서 뺀다. */
  var LAYOUT_MARGIN = 160;

  function applyScreenLayout() {
    if (!map) return;
    var proj = map.getProjection();
    if (!proj || !proj.containerPointFromCoords) return;
    var box = document.getElementById('map');
    var w = box ? box.clientWidth : 0;
    var h = box ? box.clientHeight : 0;
    if (w <= 0 || h <= 0) return;

    // 1) 투영. 화면 밖 마커는 뺀다 — 안 보이는 마커가 보이는 마커의 라벨을 지우면 안 되고,
    //    이웃 거리도 보이는 것들 사이에서만 따져야 히트 영역이 쓸데없이 좁아지지 않는다.
    var live = [];
    for (var i = 0; i < lastMarkers.length; i++) {
      var item = lastMarkers[i];
      var entry = markers[item.id];
      if (!entry) continue;
      var pt = proj.containerPointFromCoords(new kakao.maps.LatLng(item.lat, item.lng));
      if (!pt) continue;
      if (pt.x < -LAYOUT_MARGIN || pt.x > w + LAYOUT_MARGIN) continue;
      if (pt.y < -LAYOUT_MARGIN || pt.y > h + LAYOUT_MARGIN) continue;
      live.push({ entry: entry, x: pt.x, y: pt.y });
    }

    // 2) 겹침 순서 + 히트 영역.
    for (var a = 0; a < live.length; a++) {
      var self = live[a];
      var nearest = Infinity;
      for (var b = 0; b < live.length; b++) {
        if (a === b) continue;
        var dx = self.x - live[b].x, dy = self.y - live[b].y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < nearest) nearest = d;
      }
      // y 를 그대로 z 로 쓴다. 화면 아래일수록 큰 값 = 앞.
      self.entry.z = Math.max(1, Math.round(self.y) + 1);
      var isSel = self.entry.item.id === selectedId;
      if (self.entry.overlay.setZIndex) {
        self.entry.overlay.setZIndex(isSel ? SELECTED_Z : self.entry.z);
      }
      /* 선택된 마커는 말풍선이라 시각 폭이 44px 를 넘는다. 좁히면 방금 고른 것을
         다시 누르지 못하므로 항상 최대치로 둔다. */
      var half = isSel
        ? HIT_HALF_MAX
        : Math.max(HIT_HALF_MIN, Math.min(HIT_HALF_MAX, nearest / 2));
      var size = Math.round(half * 2);
      var offset = Math.round(half);
      var hit = self.entry.hit;
      hit.style.width = size + 'px';
      hit.style.height = size + 'px';
      hit.style.left = (-offset) + 'px';
      hit.style.top = (-offset) + 'px';
    }

    // 3) 라벨.
    if (labelsOn) applyLabelCollision(live);
  }

  /*
    라벨 충돌 판정.

    ## 왜 배율만으로는 안 되는가

    예전에는 level 3 이하면 라벨을 켠다는 규칙이 전부였다. 그 규칙은 마커가 고르게 흩어져
    있다고 가정한다. 실제 데이터는 그렇지 않아서(같은 건물에 여러 곳) 켜는 순간 상호명이
    서로 겹쳐 한 덩어리 주황 글자가 됐다 — 한 글자도 못 읽는다. 배율은 한 화면에 몇 개가
    들어오는지는 정하지만 **그것들이 서로 겹치는지는 정하지 못한다.**

    ## 규칙

    - 우선순위는 **서버가 준 순서**다. 서버는 정렬(추천순·평점순…)을 이미 적용해 보냈으므로
      배열 앞쪽이 곧 먼저 보여 줄 만한 곳이다. 화면이 다시 순위를 만들지 않는다.
    - **선택된 곳은 언제나 이긴다.** 사용자가 방금 고른 것이므로 맨 먼저 자리를 잡는다.
      선택 마커는 라벨 대신 말풍선을 그리므로, 말풍선이 차지하는 사각형을 대신 예약한다 —
      예약하지 않으면 다른 라벨이 말풍선 위에 겹쳐 글자가 뒤섞인다.
    - 이미 놓인 사각형과 겹치면 그 라벨은 **숨긴다**(마커 링은 그대로 남는다). 자리를 밀어
      옮기지 않는다 — 옮기면 라벨과 좌표의 대응이 깨져 어느 링의 이름인지 알 수 없게 된다.

    ## 비용

    놓인 라벨 수는 화면 넓이 나누기 라벨 넓이로 묶이므로(390×844 에서 30개 안팎) 전체는
    n × placed 이고, 겹쳐서 숨겨진 것은 placed 를 늘리지 않는다. 앞 단계와 달리 여기서
    커지는 것은 n 이 아니라 placed 다.
  */
  function applyLabelCollision(live) {
    var order = [];
    var selectedEntry = null;
    var i;
    for (i = 0; i < live.length; i++) {
      if (live[i].entry.item.id === selectedId) selectedEntry = live[i];
      else order.push(live[i]);
    }

    var placed = [];
    if (selectedEntry) {
      /* 말풍선은 지금 화면에 보이므로 실제 크기를 읽을 수 있다. 마커 하나뿐이라
         리플로 비용도 하나다. 라벨 폭처럼 미리 캐시하지 못하는 것은 말풍선이
         만들어질 때 display:none 이라 그때 잰 값이 0 이기 때문이다. */
      var bubble = selectedEntry.entry.el.querySelector('.bubble');
      if (bubble && bubble.offsetWidth > 0) {
        var bw = bubble.offsetWidth, bh = bubble.offsetHeight;
        /* CSS: 앵커 기준 left 50% / bottom 18px 에 가운데 정렬(링 위에 뜬다).
           이 숫자가 CSS 와 갈리면 라벨 겹침 판정이 엉뚱한 사각형을 피하게 된다. */
        placed.push([
          selectedEntry.x - bw / 2, selectedEntry.y - 18 - bh,
          selectedEntry.x + bw / 2, selectedEntry.y - 18,
        ]);
      }
    }

    for (i = 0; i < order.length; i++) {
      var cell = order[i];
      var name = cell.entry.name;
      if (!name) continue;
      var lw = cell.entry.labelW, lh = cell.entry.labelH;
      if (lw <= 0 || lh <= 0) {
        /* 붙이자마자 잰 값이 0 이었다(레이아웃이 아직 안 돈 드문 경로). 없는 크기로
           겹침을 판정하느니 그냥 보여 준다 — 오늘까지의 동작이고, 라벨이 사라지는
           쪽보다 낫다. */
        name.style.display = '';
        continue;
      }
      // CSS: 앵커 기준 left 50% / top 13px 에 가운데 정렬.
      var l = cell.x - lw / 2, t = cell.y + 13;
      var r = l + lw, bo = t + lh;
      var blocked = false;
      for (var p = 0; p < placed.length; p++) {
        var q = placed[p];
        // 2px 는 숨 쉴 틈이다. 딱 붙은 두 라벨은 겹치지 않아도 한 단어로 읽힌다.
        if (l < q[2] + 2 && r + 2 > q[0] && t < q[3] + 2 && bo + 2 > q[1]) {
          blocked = true;
          break;
        }
      }
      name.style.display = blocked ? 'none' : '';
      if (!blocked) placed.push([l, t, r, bo]);
    }
  }

  /* ── 클러스터 ────────────────────────────────────────── */

  function clusterSize(count) { return count >= 100 ? 's3' : (count >= 10 ? 's2' : 's1'); }

  function clusterEl(item) {
    var el = document.createElement('div');
    el.className = 'cl ' + clusterSize(item.count);
    // 999 를 넘으면 자릿수가 늘어 원을 깨뜨린다. 목업의 '999+' 규칙과 같게 자른다.
    el.textContent = item.count > 999 ? '999+' : String(item.count);
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', clusterLabel(item));
    return addTap(el, function () {
      lastMarkerTapAt = Date.now();
      post('clusterClick', { lat: item.lat, lng: item.lng, count: item.count });
    });
  }

  function rebuildClusters(items) {
    var next = {};
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var el = clusterEl(item);
      var overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(item.lat, item.lng),
        content: el,
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: 50,
      });
      overlay.setMap(map);
      next[item.key] = { overlay: overlay, el: el, item: item };
    }
    dropAll(clusters);
    clusters = next;
  }

  /* ── 명령 API ────────────────────────────────────────── */

  var api = {
    setMarkers: function (raw) {
      lastMarkers = arg(raw) || [];
      // 마커 모드로 들어가면 클러스터는 반드시 걷는다. 안 걷으면 두 표현이 겹쳐 보인다.
      dropAll(clusters); clusters = {};
      // 사라진 식당이 선택돼 있었으면 선택을 놓는다. 안 놓으면 없는 id 가 남아
      // 다음 rebuild 에서 아무것도 선택되지 않은 듯 보이는데 상태는 살아 있다.
      if (selectedId !== null) {
        var stillThere = false;
        for (var i = 0; i < lastMarkers.length; i++) {
          if (lastMarkers[i].id === selectedId) { stillThere = true; break; }
        }
        if (!stillThere) selectedId = null;
      }
      if (!map) return;
      rebuildMarkers();
    },

    setClusters: function (raw) {
      var items = arg(raw) || [];
      dropAll(markers); markers = {};
      lastMarkers = [];
      selectedId = null;
      if (!map) return;
      rebuildClusters(items);
    },

    select: function (raw) {
      var id = arg(raw);
      selectedId = (id === null || id === undefined) ? null : id;
      if (!map) return;
      applySelection();
      /* 선택이 바뀌면 배치도 바뀐다 — 새로 고른 마커의 히트 영역이 최대치로 넓어져야 하고,
         말풍선이 차지하는 자리를 다른 라벨이 비켜 줘야 한다. 오버레이는 다시 만들지 않는다. */
      applyScreenLayout();
    },

    moveTo: function (raw) {
      var o = arg(raw); if (!o || !map) return;
      var target = new kakao.maps.LatLng(o.lat, o.lng);
      if (o.zoom !== null && o.zoom !== undefined) {
        /*
          줌을 **즉시** 확정한 뒤 이동 하나만 남긴다.

          종전에는 anchor: target 으로 줌하고 곧바로 panTo 를 걸었다. 두 가지가 겹쳐 깨졌다.
            1. anchor 줌은 그 점을 화면 픽셀에 고정할 뿐 중앙에 놓지 않는다. 새 중심은
               T + k(C-T) 라 축소하면 오히려 목표에서 멀어졌다가 panTo 로 되돌아온다 —
               카메라가 두 번 움직이는 것으로 보인다.
            2. animate: true 로 시작한 줌 애니메이션 위에 얹은 panTo 는 통째로 무시된다.
               실 SDK A/B 로 확인했다(animate:true 는 오차 -818px, animate:false 는 0).
          그래서 줌은 애니메이션 없이 확정하고, 눈에 보이는 움직임은 panTo 하나로 만든다.
        */
        map.setLevel(clamp(o.zoom), { animate: false });
        if (o.animate === false) map.setCenter(target);
        else map.panTo(target);
      } else if (o.animate === false) {
        map.setCenter(target);
      } else {
        map.panTo(target);
      }
    },

    /*
      선택 마커를 **보이는 영역의 중앙**에 놓는다. 카메라 명령 한 번으로 끝난다.

      ## 왜 moveTo + panBy 조합을 버렸나

      예전에는 moveTo(마커) 로 화면 정중앙에 놓은 뒤 panBy(0, 시트높이/2) 로 밀어 올렸다.
      두 가지가 겹쳐 깨졌다:

        1. moveTo 는 panTo — **애니메이션**이다. panBy 는 그 애니메이션이 끝나기 전에
           **현재(이동 중) 중심**을 기준으로 상대 이동을 얹는다. 목표가 어디로 갈지
           프레임 타이밍에 달린다.
        2. 그래서 연타하면 offset 이 **쌓인다.** 사용자 보고: "누르면 누를수록 위로
           화면 밖으로 더 밀려난다." 상대 이동을 애니메이션 위에 겹치면 필연이다.

      여기서는 **목표 중심 좌표를 먼저 계산해서 panTo 를 한 번만** 부른다. 같은 마커를
      열 번 눌러도 결과가 같다(멱등). 상대 이동이 없으므로 쌓일 것도 없다.

      계산: 지도 중심은 항상 컨테이너의 세로 정중앙(h/2)에 그려진다. 마커를 보이는
      영역의 중앙(visibleCenterY)에 놓으려면, 지도 중심을 마커보다 (h/2 - visibleCenterY)
      픽셀만큼 **아래**에 두면 된다. 화면 좌표 ↔ 좌표 변환은 projection 이 해 주므로
      줌 레벨과 위도에 관계없이 맞는다.
    */
    focusMarker: function (raw) {
      var o = arg(raw); if (!o || !map) return;
      var box = document.getElementById('map');
      if (!box) return;
      var h = box.clientHeight;
      if (h <= 0) return;

      /*
        배율이 함께 왔으면 **여기서 먼저** 확정한다(애니메이션 없이).

        줌과 이동을 나눠 주면 카카오가 idle 을 두 번 낸다 — 줌에서 한 번, 팬에서 한 번.
        화면은 자동 재검색 예약을 첫 idle 에서 소진하므로 두 번째 idle 이 사용자 팬으로
        읽혀, 방금 파고든 자리에 재검색 버튼이 떴다(결과는 이미 최신인데).
        같은 이유로 아래 이동도 애니메이션을 쓰지 않는다 — 애니메이션은 그 자체로
        두 번째 idle 을 만든다. 줌이 이미 즉시 바뀌므로 이동만 부드러울 이유도 없다.
      */
      var jump = o.zoom !== null && o.zoom !== undefined;
      if (jump) map.setLevel(clamp(o.zoom), { animate: false });

      var padTop = o.padTop || 0;
      var padBottom = o.padBottom || 0;
      // 보이는 영역이 음수가 되면(시트가 화면을 다 덮은 경우) 중앙 기준으로 되돌린다.
      var visibleH = h - padTop - padBottom;
      var visibleCenterY = visibleH > 0 ? (padTop + visibleH / 2) : (h / 2);

      var target = new kakao.maps.LatLng(o.lat, o.lng);
      var proj = map.getProjection();
      if (!proj || !proj.containerPointFromCoords) {
        // projection 을 못 쓰는 버전이면 최소한 중앙에라도 놓는다(밀어 올리지는 못한다).
        map.panTo(target);
        return;
      }
      var targetPt = proj.containerPointFromCoords(target);
      var dy = (h / 2) - visibleCenterY;
      var centerPt = new kakao.maps.Point(targetPt.x, targetPt.y + dy);
      var newCenter = proj.coordsFromContainerPoint(centerPt);

      if (jump || o.animate === false) map.setCenter(newCenter);
      else map.panTo(newCenter);
    },

    setLevel: function (raw) {
      var level = arg(raw); if (level === null || !map) return;
      /* animate: false 여야 한다. 호출부(클러스터 파고들기·카드 탭)는 곧바로 focusMarker 를
         이어 붙이는데, 줌 애니메이션이 도는 동안 들어온 panTo 는 카카오가 통째로 버린다.
         그러면 확대만 되고 위치 보정이 사라져 방금 누른 덩어리가 화면 밖으로 나간다. */
      map.setLevel(clamp(level), { animate: false });
    },

    fitBounds: function (rawBounds, rawPadding) {
      var b = arg(rawBounds); if (!b || !map) return;
      var p = arg(rawPadding) || {};
      var area = new kakao.maps.LatLngBounds(
        new kakao.maps.LatLng(b.swLat, b.swLng),
        new kakao.maps.LatLng(b.neLat, b.neLng)
      );
      // setBounds 의 패딩 인자는 (top, right, bottom, left) — CSS 와 같은 순서다.
      // 값이 없을 때 0 대신 24 를 깔아 마커가 화면 끝에 붙지 않게 한다.
      map.setBounds(area,
        p.top === undefined ? 24 : p.top,
        p.right === undefined ? 24 : p.right,
        p.bottom === undefined ? 24 : p.bottom,
        p.left === undefined ? 24 : p.left);
    },

    setUserLocation: function (rawPos, rawHeading) {
      var pos = arg(rawPos);
      var heading = arg(rawHeading);
      if (userOverlay) { userOverlay.setMap(null); userOverlay = null; }
      if (!pos || !map) return;

      var el = document.createElement('div');
      el.className = 'ul';
      var halo = document.createElement('div'); halo.className = 'halo';
      el.appendChild(halo);
      if (heading !== null && heading !== undefined && !isNaN(heading)) {
        var head = document.createElement('div'); head.className = 'head';
        // 0도가 북이고 CSS rotate 도 위쪽 기준이라 값을 그대로 넣는다.
        head.style.transform = 'rotate(' + heading + 'deg)';
        el.appendChild(head);
      }
      var dot = document.createElement('div'); dot.className = 'dot';
      el.appendChild(dot);

      userOverlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(pos.lat, pos.lng),
        content: el,
        xAnchor: 0.5,
        yAnchor: 0.5,
        // 내 위치는 식당 마커 아래 깐다. 위에 있으면 겹친 식당을 못 누른다.
        zIndex: 0,
      });
      userOverlay.setMap(map);
    },

    panBy: function (rawX, rawY) {
      var dx = arg(rawX), dy = arg(rawY);
      if (!map || dx === null || dy === null) return;
      map.panBy(dx, dy);
    },

    setStrings: function (raw) {
      var next = arg(raw);
      if (!next) return;
      strings = next;
      // 문구가 오버레이보다 늦게 도착할 수 있다(언어 전환, 첫 렌더 경합).
      // 이미 그려 둔 것의 라벨을 갈아 준다 — 다시 만들지 않는다.
      refreshLabels();
    },

    relayout: function () {
      if (!map) return;
      // 시트 스냅으로 지도의 보이는 높이가 바뀌면 카카오는 스스로 알지 못한다.
      // 알려 주지 않으면 타일이 잘린 채로 남는다.
      map.relayout();
    },
  };

  window.${MAP_NAMESPACE} = api;

  /* ── 부트스트랩 ──────────────────────────────────────── */

  function boot() {
    try {
      map = new kakao.maps.Map(document.getElementById('map'), {
        center: new kakao.maps.LatLng(${center.lat}, ${center.lng}),
        level: ${clampLevel(level)},
      });
    } catch (e) { fail('map init failed: ' + e); return; }

    kakao.maps.event.addListener(map, 'idle', postIdle);

    kakao.maps.event.addListener(map, 'dragstart', function () { post('dragStart', {}); });

    /*
      핀치도 지도를 만진 것이다.

      카카오는 핀치에 dragstart 를 내지 않는다. RN 쪽에서 dragStart 는 사용자가 카메라를
      가져갔다는 유일한 신호라(시트 접기 + 늦게 온 GPS 로부터 카메라 지키기), 핀치로 확대한
      사용자만 시트가 안 접히고 1~3초 뒤 도착한 콜드 GPS 에 카메라를 빼앗겼다.

      zoom_start 리스너를 쓰지 않는 이유: 앱이 부른 setLevel(클러스터 파고들기)에서도 울려
      스스로 예약한 재검색을 지운다. 여기서는 손가락이 둘일 때만 울린다.
    */
    var pinchEl = document.getElementById('map');
    if (pinchEl) {
      pinchEl.addEventListener('touchstart', function (e) {
        if (e.touches.length > 1) post('dragStart', {});
      }, { passive: true });
    }

    kakao.maps.event.addListener(map, 'click', function () {
      // 마커 탭과 함께 올라온 지도 click 은 버린다. 없으면 카드가 열리자마자 닫힌다.
      if (Date.now() - lastTapAt < 400) return;
      post('mapClick', {});
    });

    /*
      빈 지도 탭 — 카카오의 click 이 오지 않으므로 **터치를 직접 본다.**

      RN 쪽은 이미 옳다(mapClick -> onMapPress -> setSelection(null), 단위 테스트도 있다).
      그런데 iOS WebView 에서는 그 mapClick 이 **한 번도 올라오지 않는다.** 카카오 지도가
      제스처를 가로채며 click 을 삼키기 때문이고, 마커에 addTap 터치 shim 을 붙인 이유와
      정확히 같은 문제다(파일 헤더 3번). 마커만 고쳐 두는 바람에 배경 탭만 죽어 있었다 —
      증상은 말풍선을 띄운 뒤 빈 곳을 눌러도 선택이 안 풀린다 였다.

      팬과 싸우지 않게 하는 방법은 새로 만들지 않는다. addTap 이 이미
      8px 넘게 움직이면 탭이 아니다 를 판정하므로 그것을 그대로 재사용한다.

      마커 탭이 배경 탭으로도 읽히지 않는 이유는 두 겹이다.
        1. 마커의 addTap 이 touchend/click 에서 stopPropagation 을 부른다 — 조상인
           #map 의 리스너에는 애초에 닿지 않는다.
        2. 그래도 새어 나오는 경로를 위해 lastMarkerTapAt 400ms 가드를 둔다.
           (이 가드는 lastTapAt 이 아니라 별도 변수를 본다 — 위 선언부의 주석 참고.)
    */
    var mapEl = document.getElementById('map');
    if (mapEl) {
      addTap(mapEl, function () {
        if (Date.now() - lastMarkerTapAt < 400) return;
        post('mapClick', {});
      });
    }

    /*
      컨테이너 크기가 바뀌면 카카오에 **직접 알려 준다.**

      왜 필요한가: WebView 는 HTML 을 먼저 로드하고 레이아웃을 나중에 확정한다. 그 사이에
      'new kakao.maps.Map()' 이 돌면 카카오는 컨테이너를 0×0 으로 측정하고 그 값을 캐시한다.
      결과가 정확히 이 증상이었다 — **타일이 한 장도 안 뜨고**(회색 사각형),
      'getBounds()' 가 세계 전체에 가까운 값을 돌려줘서 앱이 그걸로 질의하면 서버가
      "viewport diagonal must not exceed 200km" 로 400 을 낸다. 지도도 비고 목록도 빈다.

      (이 주석에 백틱을 쓸 수 없다 — 이 파일 전체가 템플릿 리터럴 안이라 백틱 하나가
       템플릿을 끊고 번들이 SyntaxError 로 죽는다. 실제로 한 번 그렇게 죽었다.)

      RN 쪽에도 'relayout' 명령이 있고 시트 스냅이 바뀔 때 부른다. 그런데 그건 **사용자가
      시트를 움직여야** 도는 것이고, 첫 화면에서는 아무도 부르지 않는다. 그래서 여기서
      스스로 고친다 — 누가 부르는 것을 잊어도 낫는 쪽이 맞다.

      'ResizeObserver' 가 없는 구형 WebView 를 위해 폴백으로 몇 번 재시도한다.
    */
    var lastW = -1, lastH = -1;
    function relayoutIfSized() {
      var el = document.getElementById('map');
      if (!el || !map) return false;
      var w = el.clientWidth, h = el.clientHeight;
      if (w <= 0 || h <= 0) return false;
      // 크기가 그대로면 아무 일도 하지 않는다. 아래 재시도와 ResizeObserver 가 같은 크기로
      // 여러 번 부르는데, 그때마다 idle 을 올리면 RN 쪽 dirty 판정이 흔들린다.
      if (w === lastW && h === lastH) return true;
      lastW = w; lastH = h;
      map.relayout();
      /* 크기가 확정된 지금의 뷰포트를 한 번 알린다. 이것이 없으면 사용자가 지도를 만지기
         전까지 RN 은 뷰포트를 **한 번도** 받지 못한다(postIdle 주석의 실측 증상). */
      postIdle();
      return true;
    }

    if (typeof ResizeObserver === 'function') {
      var ro = new ResizeObserver(function () { relayoutIfSized(); });
      ro.observe(document.getElementById('map'));
    }
    // 옵저버가 있어도 첫 프레임은 놓칠 수 있다. 짧은 구간 동안 몇 번 더 확인한다.
    [0, 60, 200, 600, 1200].forEach(function (delay) {
      setTimeout(relayoutIfSized, delay);
    });

    // 준비 전에 RN 이 보낸 명령은 RN 쪽 큐에 쌓여 있다. ready 를 받고 흘려보낸다.
    // 컨테이너 크기를 함께 싣는다 — 0 이면 위 증상이므로 진단이 한 번에 끝난다.
    var box = document.getElementById('map');
    post('ready', { width: box ? box.clientWidth : -1, height: box ? box.clientHeight : -1 });
  }

  var sdk = document.createElement('script');
  sdk.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(jsKey)}&autoload=false';
  sdk.onerror = function () { fail('kakao sdk script failed to load'); };
  sdk.onload = function () {
    if (!window.kakao || !window.kakao.maps) { fail('kakao namespace missing after load'); return; }
    try { kakao.maps.load(boot); } catch (e) { fail('kakao.maps.load threw: ' + e); }
  };
  document.head.appendChild(sdk);

  // 스크립트 태그가 onerror 도 onload 도 안 부르는 경우가 있다(프록시가 200 에 빈 본문을
  // 돌려줄 때). 지도가 안 뜬 채 조용히 끝나지 않게 마감 시한을 둔다.
  setTimeout(function () { if (!map) fail('kakao sdk load timed out'); }, 12000);
})();
</script>
</body>
</html>`
}
