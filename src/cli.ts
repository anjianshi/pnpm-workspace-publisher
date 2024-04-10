import { analyzePackages, getPackageUpdates, generatePublishQueue } from './analyze.js'
import {
  updatePackageVersion,
  getWorkspaceRoot,
  getPackagesInWorkspace,
  publishPackage,
} from './package.js'
import { SemVerLevel } from './semver.js'
import { exit, assert, logging, waitTask } from './utils.js'

const workspaceRoot = getWorkspaceRoot()
assert(workspaceRoot !== null, '此工具只能在 pnpm workspace 内运行')
logging(`workspace: ${workspaceRoot}`)

const allPackages = await waitTask('正在获取包列表...', getPackagesInWorkspace())
const packages = analyzePackages(allPackages)
if (!packages.size) exit('workspace 内没有可维护的包', 0)

const updates = await getPackageUpdates(packages)
if (!updates.size) exit('没有需要发布的包', 0)
logging(
  '有更新的包：\n' +
    [...updates.keys()].map(name => `${name}@${packages.get(name)!.semver.toString()}`).join('\n'),
)

const queue = generatePublishQueue(packages, updates)
logging(
  '待发布的包：\n' +
    [...queue]
      .map(info => `${info.name}@${info.semver.toString()} [${SemVerLevel[info.level]}]`)
      .join('\n'),
)

let count = 0
for (const { name, semver } of queue) {
  console.log(`正在发布(${++count}/${queue.length}) ${name}@${semver.toString()}...`)
  const pkg = packages.get(name)!
  updatePackageVersion(pkg.path, semver)
  const result = await publishPackage(pkg.path)
  process.stdout.write(result)
}
