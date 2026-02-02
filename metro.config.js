const { getDefaultConfig } = require('@expo/metro-config')

const config = getDefaultConfig(__dirname)

// Fix for Firebase SDK compatibility with Expo SDK 53+
// Firebase uses CommonJS files that need special handling
config.resolver.sourceExts.push('cjs')
config.resolver.unstable_enablePackageExports = false

module.exports = config
