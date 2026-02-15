const { getDefaultConfig } = require("@expo/metro-config")

const config = getDefaultConfig(__dirname)

// Support .cjs and .mjs files (Firebase, react-hook-form 등)
config.resolver.sourceExts = [...config.resolver.sourceExts, "cjs", "mjs"]

module.exports = config
