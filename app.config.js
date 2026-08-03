const appJson = require("./app.json")

const config = structuredClone(appJson.expo)

if (process.env.SINSIN_BUILD_VARIANT === "production-qa") {
  config.name = `${config.name} 운영 QA`
  config.scheme = "sinsin-production-qa"
  config.android.package = "com.mediology.sinsinapp.productionqa"
  config.ios.bundleIdentifier = "com.mediology.sinsin-care.productionqa"
  config.ios.infoPlist = {
    ...config.ios.infoPlist,
    CFBundleDisplayName: "신신당부 운영 QA",
    CFBundleName: "신신당부 운영 QA",
  }
  config.extra = {
    ...config.extra,
    buildVariant: "production-qa",
  }
}

module.exports = { expo: config }
