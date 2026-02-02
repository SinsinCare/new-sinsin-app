const { getDefaultConfig } = require('@expo/metro-config')

const config = getDefaultConfig(__dirname)

// Support .cjs files (used by Firebase and other packages)
config.resolver.sourceExts.push('cjs')

module.exports = config
