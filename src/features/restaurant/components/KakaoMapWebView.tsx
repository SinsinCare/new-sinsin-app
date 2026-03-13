import { WebView } from "react-native-webview"
import { StyleSheet, type ViewStyle } from "react-native"

const KAKAO_JS_APP_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY

interface KakaoMapWebViewProps {
  latitude?: number
  longitude?: number
  zoomLevel?: number
  style?: ViewStyle
}

export function KakaoMapWebView({
  latitude = 37.5665,
  longitude = 126.978,
  zoomLevel = 3,
  style,
}: KakaoMapWebViewProps) {
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
        new kakao.maps.Map(container, options);
      });
    };
    document.head.appendChild(script);
  </script>
</body>
</html>
  `.trim()

  return (
    <WebView
      source={{ html, baseUrl: "https://sinsin.mediology.ai" }}
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
