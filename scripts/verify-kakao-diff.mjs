#!/usr/bin/env node

import fs from "node:fs"
import { spawnSync } from "node:child_process"
import path from "node:path"
import ts from "typescript"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const workspace = path.resolve(root, "..")
const backend = path.resolve(workspace, "sinsin-be-bun")

function git(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" })
  if (result.error) throw result.error
  if (result.status !== 0) {
    process.stderr.write(result.stderr)
    process.exit(result.status ?? 1)
  }
  return result.stdout
}

// tracked diff whitespace is Git's oracle; untracked task files are checked below.
git(["diff", "--check"], root)
git(["diff", "--check"], backend)

function changedPaths(cwd) {
  const records = git(
    ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    cwd,
  ).split("\0")
  const paths = []
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]
    if (!record) continue
    const status = record.slice(0, 2)
    paths.push(record.slice(3))
    if (status.includes("R") || status.includes("C")) index += 1
  }
  return paths
}

const frontendExact = new Set([
  "app.json",
  "eas.json",
  "package.json",
  "package-lock.json",
  "app/(auth)/terms-agreement.tsx",
  "src/config/kakaoConfig.ts",
  "src/hooks/useAuth.ts",
  "src/services/core/apiClient.ts",
  "src/services/types/serviceTypes.ts",
  "src/types/auth.ts",
  "tests/socialAuthService.test.ts",
  "tests/socialLoginFlow.test.ts",
  "tests/socialAuthContract.test.ts",
  "tests/socialLogin409EndToEnd.test.ts",
  "tests/socialSessionRestoreRace.test.ts",
  "tests/socialTermsSingleFlight.test.ts",
  "tests/socialLinkEmailSingleFlight.test.ts",
  "tests/kakaoLoginConfig.test.ts",
  "tests/apiClientLocale.test.ts",
  "tests/setup.ts",
  "scripts/verify-kakao-login.mjs",
  "scripts/verify-kakao-quality.mjs",
  "scripts/verify-kakao-diff.mjs",
])
const frontendPrefixes = [
  "src/services/auth/",
  "src/features/auth/hooks/",
  "src/features/auth/utils/",
  "src/features/auth/views/",
  "patches/@react-native-kakao",
]
const backendPrefixes = [
  "src/app.ts",
  "src/domains/auth/",
  "src/http/middleware/requestContext.ts",
  "tests/auth/",
  "tests/http/requestClientContext.test.ts",
  "test/auth/",
]

function isFrontendOwned(relative) {
  return (
    frontendExact.has(relative) ||
    frontendPrefixes.some((prefix) => relative.startsWith(prefix))
  )
}

function readTextIfPresent(cwd, relative) {
  const absolute = path.join(cwd, relative)
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) return null
  const data = fs.readFileSync(absolute)
  if (data.includes(0)) return null
  return data.toString("utf8")
}

const taskFiles = [
  ...changedPaths(root)
    .filter(isFrontendOwned)
    .map((relative) => ({ cwd: root, relative })),
  ...changedPaths(backend)
    .filter((relative) =>
      backendPrefixes.some((prefix) => relative.startsWith(prefix)),
    )
    .map((relative) => ({ cwd: backend, relative })),
  { cwd: workspace, relative: "GATES.md" },
  { cwd: workspace, relative: "PLAN.md" },
]

for (const { cwd, relative } of taskFiles) {
  const source = readTextIfPresent(cwd, relative)
  if (source === null) continue
  const lines = source.split("\n")
  const whitespaceLine = lines.findIndex((line) => /[\t ]+$/u.test(line))
  if (whitespaceLine >= 0) {
    throw new Error(`${relative}:${whitespaceLine + 1}: trailing whitespace`)
  }
  if (/^(?:<{7}|={7}|>{7})(?: |$)/mu.test(source)) {
    throw new Error(`${relative}: unresolved merge marker`)
  }
}

const sensitiveNames = new Set([
  "accessToken",
  "idToken",
  "refreshToken",
  "socialSignupToken",
  "authorization",
  "providerToken",
])

function isLoggerCall(node) {
  if (
    !ts.isCallExpression(node) ||
    !ts.isPropertyAccessExpression(node.expression)
  ) {
    return false
  }
  const owner = node.expression.expression.getText()
  const method = node.expression.name.text
  return (
    (owner === "logger" || owner === "console") &&
    ["log", "debug", "info", "warn", "error"].includes(method)
  )
}

function isSanitized(node) {
  if (ts.isParenthesizedExpression(node)) return isSanitized(node.expression)
  if (
    ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.ExclamationToken
  ) {
    return true
  }
  if (ts.isBinaryExpression(node)) return true
  if (ts.isTypeOfExpression(node)) return true
  if (
    ts.isPropertyAccessExpression(node) &&
    ["length", "name"].includes(node.name.text)
  ) {
    return true
  }
  if (ts.isCallExpression(node)) {
    const callee = node.expression.getText()
    if (/^(?:Boolean|redactSensitiveText|sanitize)/u.test(callee)) return true
  }
  return false
}

function exposesSensitiveValue(node) {
  if (isSanitized(node)) return false
  if (ts.isIdentifier(node) && sensitiveNames.has(node.text)) return true
  if (
    ts.isPropertyAccessExpression(node) &&
    sensitiveNames.has(node.name.text)
  ) {
    return true
  }
  return node.getChildren().some(exposesSensitiveValue)
}

function findCredentialLogging(source, fileName = "source.ts") {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
  )
  let found = false
  const visit = (node) => {
    if (isLoggerCall(node)) {
      const [, ...payloadArguments] = node.arguments
      if (payloadArguments.some(exposesSensitiveValue)) found = true
    }
    if (!found) ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return found
}

// Positive and negative controls keep the scanner itself from silently weakening.
if (!findCredentialLogging('logger.debug("leak", accessToken)')) {
  throw new Error("credential logger scanner positive control failed")
}
if (
  findCredentialLogging(
    'logger.debug("safe", { hasAccessToken: !!accessToken, size: idToken.length })',
  )
) {
  throw new Error("credential logger scanner safe-value control failed")
}

for (const { cwd, relative } of taskFiles) {
  if (!relative.startsWith("src/") || !/\.[cm]?[jt]sx?$/u.test(relative)) {
    continue
  }
  const source = readTextIfPresent(cwd, relative)
  if (source && findCredentialLogging(source, relative)) {
    throw new Error(
      `${relative}: raw OAuth/session credential logging detected`,
    )
  }
  if (
    source &&
    /\b(?:clientSecret|appSecret|privateKey)\b\s*[:=]\s*["'][^"']+["']/u.test(
      source,
    )
  ) {
    throw new Error(`${relative}: embedded secret-like value detected`)
  }
}

console.log("KAKAO_DIFF_SAFETY_OK")
