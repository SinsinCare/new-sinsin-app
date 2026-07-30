#!/usr/bin/env node

const { spawnSync } = require("node:child_process")
const path = require("node:path")

function getPrebuildArguments(platform) {
  if (platform !== "ios" && platform !== "android") {
    throw new Error("Usage: node scripts/sync-native-config.js <ios|android>")
  }

  return [
    require.resolve("expo/bin/cli"),
    "prebuild",
    "--platform",
    platform,
    "--no-install",
  ]
}

function getSyncEnvironment(environment = process.env) {
  return {
    ...environment,
    // Prevent Corepack from adding a packageManager field during config sync.
    COREPACK_ENABLE_PROJECT_SPEC: "0",
  }
}

function syncNativeConfig(platform) {
  const result = spawnSync(process.execPath, getPrebuildArguments(platform), {
    cwd: projectRoot,
    env: getSyncEnvironment(),
    stdio: "inherit",
  })

  if (result.error) {
    console.error(result.error.message)
  }

  return result.status ?? 1
}

const projectRoot = path.resolve(__dirname, "..")

if (require.main === module) {
  try {
    process.exit(syncNativeConfig(process.argv[2]))
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

module.exports = {
  getPrebuildArguments,
  getSyncEnvironment,
  syncNativeConfig,
}
