#!/usr/bin/env node

const { spawnSync } = require("node:child_process")
const fs = require("node:fs")
const path = require("node:path")
const dotenv = require("dotenv")

const [, , envFile, separator, ...command] = process.argv

if (!envFile || separator !== "--" || command.length === 0) {
  console.error(
    "Usage: node scripts/with-env.js <env-file> -- <command> [args...]",
  )
  process.exit(1)
}

const envPath = path.resolve(process.cwd(), envFile)

if (!fs.existsSync(envPath)) {
  console.error(`Missing env file: ${envFile}`)
  process.exit(1)
}

const result = dotenv.config({ path: envPath, override: true })

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

const [bin, ...args] = command
const child = spawnSync(bin, args, {
  env: process.env,
  shell: true,
  stdio: "inherit",
})

process.exit(child.status ?? 1)
