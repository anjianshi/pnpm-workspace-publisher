/**
 * 获取 npm 包相关信息
 */
import fs from 'node:fs'
import path from 'node:path'
import { SemVer } from './semver.js'
import { assert, execute, tryExecute, safeParseJSON, clearLastLine } from './utils.js'

export const WORKSPACE_FILENAME = 'pnpm-workspace.yaml'

/**
 * 找到 pnpm workspace 根目录，若不在工作区内，返回 null
 */
export function getWorkspaceRoot() {
  let dir = process.cwd()
  while (true) {
    const filepath = path.join(dir, WORKSPACE_FILENAME)
    if (fs.existsSync(filepath)) return dir

    const nextDir = path.resolve(dir, '..')
    if (nextDir === dir) return null
    dir = nextDir
  }
}

/**
 * 返回 pnpm workspace 中的所有包及其依赖
 */
export async function getPackagesInWorkspace() {
  await execute('pnpm install') // 必须先执行一次 install 才能保证 pnpm list 的输出是基于最新的 package.json 的
  const raw = await execute('pnpm list --recursive --json')
  const packages = JSON.parse(raw) as PnpmPackageInfo[]
  return packages
}
export interface PnpmPackageInfo {
  name: string
  version: string
  path: string
  private: boolean
  dependencies?: { [name: string]: PnpmDependencyInfo }
  devDependencies?: { [name: string]: PnpmDependencyInfo }
}
export interface PnpmDependencyInfo {
  from: string
  version: string
  resolved?: string
  path: string
}

/**
 * 返回指定包在 registry 中的最新版本。
 * 若包在 registry 不存在（也就是未发布过）返回 null。
 */
export async function getLatestVersion(pkgName: string) {
  const viewResult = await tryExecute(`npm view ${pkgName} --json`)
  if (viewResult.error) {
    const data = safeParseJSON<{ error: { code: string } }>(viewResult.stdout)
    // 包未发布过
    if (data && data.error.code === 'E404') return null
    else process.exit(1)
  }

  const info = safeParseJSON<{ version: string }>(viewResult.stdout)
  assert(info, 'npm 包最新版本获取失败：' + viewResult.stdout)
  return new SemVer(info.version)
}

/**
 * 返回所有包的最新版本
 */
export async function getLatestVersions(pkgNames: string[]) {
  const promises = pkgNames.map(getLatestVersion)

  let finished = 0
  process.stdout.write(`正在确认最新版本号 ${finished}/${promises.length} ...`)
  for (const promise of promises) {
    void promise.then(() => {
      clearLastLine()
      if (++finished < promises.length) {
        process.stdout.write(`正在确认最新版本号 ${finished}/${promises.length} ...`)
      }
    })
  }

  const versions = new Map(
    (await Promise.all(promises)).map((version, i) => [pkgNames[i]!, version]),
  )
  return versions
}

export function updatePackageVersion(packageDir: string, semver: SemVer) {
  const jsonPath = path.join(packageDir, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as { version: string }
  pkg.version = semver.toString()
  fs.writeFileSync(jsonPath, JSON.stringify(pkg, null, 2) + '\n')
}

export async function publishPackage(packageDir: string) {
  return execute('pnpm publish --no-git-checks', { cwd: packageDir })
}
