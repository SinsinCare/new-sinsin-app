const { getDefaultConfig } = require("@expo/metro-config")

const config = getDefaultConfig(__dirname)

// SVG를 소스 파일로 처리 (react-native-svg-transformer)
config.transformer.babelTransformerPath = require.resolve(
  "react-native-svg-transformer/expo"
)
config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== "svg"
)
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  "svg",
  "cjs",
  "mjs",
]

module.exports = config
