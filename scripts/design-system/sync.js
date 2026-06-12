/**
 * design-system.json을 admin dashboard repo로 복사합니다.
 * 대상 경로는 DESIGN_SYNC_TARGET 환경변수로 오버라이드할 수 있습니다.
 *
 * 실행: npm run design:sync (export 후 자동 실행)
 */
const fs = require("fs")
const path = require("path")

const repoRoot = path.resolve(__dirname, "../..")
const source = path.join(repoRoot, "design-system", "design-system.json")
const target =
  process.env.DESIGN_SYNC_TARGET ||
  path.resolve(
    repoRoot,
    "../sinsin-admin-dashboard/src/features/design-system/data/design-system.json",
  )

if (!fs.existsSync(source)) {
  console.error(
    `[design-sync] 원본 없음: ${source} — 먼저 npm run design:export를 실행하세요`,
  )
  process.exit(1)
}
if (!fs.existsSync(path.dirname(target))) {
  console.error(
    `[design-sync] 대상 디렉토리 없음: ${path.dirname(target)}\n` +
      "  sinsin-admin-dashboard repo가 형제 디렉토리에 있는지 확인하거나 " +
      "DESIGN_SYNC_TARGET으로 경로를 지정하세요",
  )
  process.exit(1)
}

fs.copyFileSync(source, target)
console.log(`[design-sync] 복사 완료 → ${target}`)
