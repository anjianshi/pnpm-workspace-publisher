import { type PnpmPackageInfo, getLatestVersions } from './package.js'
import { SemVer, type SemVerDiff, SemVerLevel } from './semver.js'

/**
 * 分析包列表，仅保留此工具要维护的包，依赖列表里也仅保留此工具维护的包
 */
export function analyzePackages(pnpmPackages: PnpmPackageInfo[]): Packages {
  const pnpmPackagesToMaintain = pnpmPackages
    .filter(pkg => !pkg.private) // 不维护 private 包
    .sort((a, b) => a.name.localeCompare(b.name))

  // 整理包列表
  const packages = new Map<string, PackageInfo>()
  for (const pnpmPackage of pnpmPackagesToMaintain) {
    const pkg = {
      name: pnpmPackage.name,
      semver: new SemVer(pnpmPackage.version),
      path: pnpmPackage.path,
      dependencies: [],
      dependents: [],
      allDependencies: new Set<string>(),
      allDependents: new Set<string>(),
    }
    packages.set(pkg.name, pkg)
  }

  // 整理直接依赖
  for (const pnpmPackage of pnpmPackagesToMaintain) {
    const pkg = packages.get(pnpmPackage.name)!

    for (const [depName, dependency] of Object.entries({
      ...(pnpmPackage.dependencies ?? {}),
      ...(pnpmPackage.devDependencies ?? {}),
    })) {
      if (dependency.version.startsWith('link:') && packages.has(depName)) {
        pkg.dependencies.push(depName)
        if (pkg.dependents.includes(depName)) continue
        packages.get(depName)!.dependents.push(pkg.name)
      }
    }
  }

  // 整理间接依赖
  for (const pkg of packages.values()) {
    getAllRelatedPackages(packages, pkg.name, 'dependencies').forEach(name =>
      pkg.allDependencies.add(name),
    )
    getAllRelatedPackages(packages, pkg.name, 'dependents').forEach(name =>
      pkg.allDependents.add(name),
    )
  }

  return packages
}
export type Packages = Map<string, PackageInfo>
export interface PackageInfo {
  name: string
  semver: SemVer
  path: string
  dependencies: string[] // 此包直接依赖哪些包
  dependents: string[] // 此包被哪些包直接依赖
  allDependencies: Set<string> // 此包所有直接或间接依赖的包（上级包）
  allDependents: Set<string> // 所有直接或间接依赖此包的包（下级包）
}

/**
 * 返回指定包的所有上级包或下级包
 */
export function getAllRelatedPackages(
  packages: Packages,
  packageName: string,
  type: 'dependencies' | 'dependents',
  skip = new Set<string>(),
) {
  skip.add(packageName)

  const relatedNames = packages.get(packageName)![type].filter(name => !skip.has(name))
  for (const name of relatedNames) skip.add(name)
  for (const name of relatedNames)
    relatedNames.push(...getAllRelatedPackages(packages, name, type, skip))
  return relatedNames
}

/**
 * 找出内容有更新的包（本地版本号比 registry 里新），返回它们的更新信息
 */
export async function getPackageUpdates(packages: Packages) {
  const updates = new Map<string, SemVerDiff['level']>()
  const latestVersions = await getLatestVersions([...packages.keys()])
  for (const pkg of packages.values()) {
    const latestVersion = latestVersions.get(pkg.name)
    if (!latestVersion) continue
    const compare = pkg.semver.compare(latestVersion)
    if (compare.side === 1) updates.set(pkg.name, compare.level)
  }
  return updates
}
type PackageUpdates = Map<string, SemVerDiff['level']>

/**
 * 为单个包生成更新队列
 */
export function generatePublishQueue(packages: Packages, updates: PackageUpdates) {
  const queue: PublishInfo[] = [...updates].map(([name, level]) => ({
    name,
    level,
    semver: packages.get(name)!.semver,
  }))

  for (const [name, origLevel] of updates) {
    // 更新的包是 extra 级别更新时，依赖它的包变为 patch 级别更新
    const level = origLevel === SemVerLevel.extra ? SemVerLevel.patch : origLevel
    const pkg = packages.get(name)!
    for (const dependent of pkg.allDependents) {
      const exists = queue.find(item => item.name === dependent)
      if (!exists) {
        queue.push({
          name: dependent,
          level,
          semver: packages.get(dependent)!.semver.update(level),
        })
      } else if (exists.level < level) {
        exists.level = level
        exists.semver = packages.get(dependent)!.semver.update(level)
      }
    }
  }

  return queue.sort((a, b) =>
    comparePackageForPublish(packages.get(a.name)!, packages.get(b.name)!),
  )
}
function comparePackageForPublish(a: PackageInfo, b: PackageInfo) {
  return a.allDependencies.has(b.name)
    ? 1
    : a.allDependents.has(b.name)
      ? -1
      : a.name.localeCompare(b.name)
}
interface PublishInfo {
  /** 要发布的包 */
  name: string
  /** 要发布的版本 */
  semver: SemVer
  /** 更新级别 */
  level: SemVerLevel
}
