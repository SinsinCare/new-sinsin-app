import { WebView } from "react-native-webview"
import { StyleSheet, type ViewStyle } from "react-native"
import { MAP_CENTER } from "../data/curationData"
import type { PlaceRestaurant } from "../types"

const KAKAO_JS_APP_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY

const FOOD_TAG_ICON: Record<string, string> = {
  KOREAN: `<svg width="20" height="16" viewBox="0 0 38 30" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10.72" y="26.25" width="17.54" height="3.75" rx="1.88" fill="#F98E38"/><ellipse cx="9.26" cy="10.78" rx="7.31" ry="7.03" fill="#E3F8E3"/><ellipse cx="27.77" cy="12.65" rx="8.28" ry="7.97" fill="#E3F8E3"/><ellipse cx="17.06" cy="8.91" rx="9.26" ry="8.91" fill="#E3F8E3"/><path d="M37.98 14.86c-1.18 7.77-7.55 11.13-9.45 11.97a2.5 2.5 0 0 1-1.06.22H10.46c-.44 0-.89-.1-1.28-.3C2.35 23.24.5 17.88.02 14.73c-.2-1.35.97-2.55 2.48-2.55h33.02c1.52 0 2.67 1.22 2.46 2.57z" fill="#FFE073"/></svg>`,
  CHINESE: `<svg width="20" height="14" viewBox="0 0 37 27" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.66 19.58c-.29 0-.57-.09-.8-.25-1.02-.72-3.62-2.88-2.16-5.46.69-1.21 1.84-1.47 2.81-1.42.84.04 1.56-.62 1.51-1.47-.09-1.56.14-3.69 1.77-4.6 1.63-.92 3.41-.35 4.57.29.71.39 1.6.08 1.94-.66.63-1.36 1.82-3.08 3.73-3 1.91.08 3.24 1.87 3.92 3.13.34.62 1.12.8 1.71.43 1.32-.83 3.55-1.82 5.57-.3 1.41 1.05 1.71 2.37 1.63 3.49-.07.9.66 1.68 1.55 1.57 1.02-.14 2.19 0 3.1.97 2.15 2.29-.08 5.58-1.19 6.83-.26.3-.64.47-1.04.47H3.66z" fill="#FFE073"/><path d="M2.64 26.28c-1.58 0-2.7-1.73-2.17-3.4C2.18 17.49 6.83 7.57 17.77 7.62c10.87.05 15.9 9.78 17.86 15.17.61 1.67-.52 3.49-2.14 3.49H2.64z" fill="#FFE073"/><rect x="10.46" y="18.29" width="1.63" height="3.5" rx=".81" transform="rotate(-46.09 10.46 18.29)" fill="#F8C322" stroke="#F8C322" stroke-width=".95"/><rect x="16.16" y="18.29" width="1.63" height="3.5" rx=".81" transform="rotate(-46.09 16.16 18.29)" fill="#F8C322" stroke="#F8C322" stroke-width=".95"/><rect x="21.87" y="18.29" width="1.63" height="3.5" rx=".81" transform="rotate(-46.09 21.87 18.29)" fill="#F8C322" stroke="#F8C322" stroke-width=".95"/></svg>`,
  JAPANESE: `<svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.74 5.39c2.94-4.53 9.57-4.53 12.52 0l8.52 13.13c3.23 4.96-.33 11.52-6.25 11.52H7.47c-5.92 0-9.48-6.56-6.25-11.53L9.74 5.39z" fill="#ECF1EC"/><path d="M9.33 18.96c0-1.77 1.43-3.2 3.2-3.2h6.93c1.77 0 3.2 1.43 3.2 3.2v11.09H9.33V18.96z" fill="#F98E38"/></svg>`,
  WESTERN: `<svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18.13 31.15c-1.69 1.91-3.12 0-3.12 0L3.65 10.67c-.91-1.64-.8-3.67.75-4.74 1.94-1.35 5.33-2.95 10.81-3.41 6.92 0 11.88 1.47 14.08 4.31.83 1.06.64 2.52.02 3.71-2.67 5.16-10.05 19.33-11.18 20.61z" fill="#FFE073"/><path d="M0 7.83c0 .92.85 2.21 2.24 2.28.58.03 1.52-.43 1.99-.89C5.55 7.78 8.19 4.1 15.79 4.22c7.6.12 10.52 2.56 12.63 4.99.72.82 2.03.88 2.67.46.95-.61 1.18-1.6.59-2.93C30.27 3.57 24.82-.3 14.86.02 9.62.18 3.84 1.87.39 6.3c-.24.31-.32.73-.37 1.1L0 7.83z" fill="#F98F38"/><circle cx="14.71" cy="11.79" r="3.46" fill="#F98F38"/><path d="M23.95 20.91s-3.23-1.63-5.19 1.26c-1.64 2.79 1.73 5.05 1.73 5.05l3.46-6.31z" fill="#F98F38"/><rect width="1.47" height="3.5" rx=".73" transform="matrix(-.78 -.62 .64 -.77 13.13 22.06)" fill="#10C27B" stroke="#10C27B" stroke-width=".85"/><rect width="1.46" height="3.15" rx=".73" transform="matrix(.7 -.71 .73 .68 21.63 12.83)" fill="#10C27B" stroke="#10C27B" stroke-width=".85"/></svg>`,
  ETC: `<svg width="18" height="18" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="15" cy="15" r="15" fill="#F8AA22"/><path d="M0 14.85c0-1.72.29-3.37.81-4.91l2.94 3 3.75 3.82v3.82l3.75 3.82 1.88 1.91V30c-7.39-.95-13.13-7.37-13.13-15.15zm26.87 9.31c-1.22-1.01-3.08-1.67-4.37-1.67v-1.91c0-1.01-.4-1.98-1.1-2.7a3.73 3.73 0 0 0-2.65-1.12h-7.5v-5.73c1-.01 1.95-.4 2.65-1.12.71-.72 1.1-1.69 1.1-2.7V5.29h1.88c.99 0 1.95-.4 2.65-1.12.7-.72 1-1.66 1-2.67V1c5.49 2.27 9.5 7.45 9.5 13.85 0 3.37-1.1 6.65-3.13 9.31z" fill="#FFE073"/><circle cx="23" cy="14" r="2" fill="#F8AA22"/></svg>`,
}

function getFoodIcon(cuisineType: string | undefined): string {
  return FOOD_TAG_ICON[cuisineType ?? ""] ?? FOOD_TAG_ICON.KOREAN
}

function serializeForInlineScript(value: string): string {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
}

function buildMarkersJs(restaurants: PlaceRestaurant[]): string {
  return restaurants
    .map(
      (r) => `
      (function() {
        var content = document.createElement('div');
        content.className = 'marker';
        var icon = document.createElement('span');
        icon.className = 'marker-icon';
        icon.innerHTML = '${getFoodIcon(r.cuisineType)}';
        var name = document.createElement('span');
        name.className = 'marker-name';
        name.textContent = ${serializeForInlineScript(r.name)};
        content.appendChild(icon);
        content.appendChild(name);
        var overlay = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(${r.latitude}, ${r.longitude}),
          content: content,
          yAnchor: 1.2
        });
        overlay.setMap(map);
      })();`,
    )
    .join("\n")
}

interface KakaoMapWebViewProps {
  latitude?: number
  longitude?: number
  zoomLevel?: number
  style?: ViewStyle
  restaurants?: PlaceRestaurant[]
}

export function KakaoMapWebView({
  latitude = MAP_CENTER.latitude,
  longitude = MAP_CENTER.longitude,
  zoomLevel = 5,
  style,
  restaurants = [],
}: KakaoMapWebViewProps) {
  const markersJs = buildMarkersJs(restaurants)

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; }
    #map { width: 100%; height: 100%; }
    .marker {
      display: flex;
      align-items: center;
      gap: 4px;
      background: #fff;
      border-radius: 20px;
      padding: 6px 12px 6px 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      white-space: nowrap;
      position: relative;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .marker::after {
      content: '';
      position: absolute;
      bottom: -6px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 6px solid #fff;
    }
    .marker-icon {
      display: flex;
      align-items: center;
      line-height: 0;
    }
    .marker-name {
      font-size: 13px;
      font-weight: 600;
      color: #2A2A37;
      line-height: 1;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var script = document.createElement('script');
    script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_APP_KEY}&autoload=false';
    script.onload = function() {
      kakao.maps.load(function() {
        var container = document.getElementById('map');
        var options = {
          center: new kakao.maps.LatLng(${latitude}, ${longitude}),
          level: ${zoomLevel}
        };
        var map = new kakao.maps.Map(container, options);
        ${markersJs}
      });
    };
    document.head.appendChild(script);
  </script>
</body>
</html>
  `.trim()

  return (
    <WebView
      source={{ html, baseUrl: "https://sinsincare.kr" }}
      style={[styles.container, style]}
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={["*"]}
      mixedContentMode="always"
    />
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
