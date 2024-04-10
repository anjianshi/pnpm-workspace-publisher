/**
 * 通用工具函数
 */
import childProcess from 'node:child_process'

/**
 * 输出错误消息并退出程序
 */
export function exit(message: string, exitCode = 1): never {
  console.error(message)
  process.exit(exitCode)
}

/**
 * 确认一个值不为 null 或 undefined，否则退出程序
 */
export function assert<T>(
  value: T | null | undefined,
  message: string,
  exitCode?: number,
): asserts value is T {
  if (value === null || value === undefined) exit(message, exitCode)
}

/**
 * 生成用于输出到日志的时间
 */
export function getLogTime() {
  const d = new Date()
  const p = (n: number, size = 2) => n.toString().padStart(size, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`
}

/**
 * 输出一条日志
 */
export function logging(...args: unknown[]) {
  console.log(`[${getLogTime()}]`, ...args)
}

export async function sleep(ms: number) {
  return new Promise<void>(resolve => {
    setTimeout(resolve, ms)
  })
}

/**
 * 清除 stdout 中最近输出的一行内容（输出这行内容时不能有换行）
 */
export function clearLastLine() {
  process.stdout.clearLine(0)
  process.stdout.cursorTo(0)
}

/**
 * 在异步任务完成前，显示一个临时的提示信息
 */
export async function waitTask<T>(tips: string, task: Promise<T>): Promise<T> {
  process.stdout.write(tips)
  const result = await task
  clearLastLine()
  return result
}

/**
 * 开启子进程执行一条 shell 语句，返回执行结果
 */
export async function tryExecute(command: string, options?: childProcess.ExecOptions) {
  return new Promise<ExecuteResult>(resolve => {
    const proc = childProcess.exec(command, options, (error, stdout, stderr) => {
      resolve({
        stdout: stdout.toString(),
        stderr: stderr.toString(),
        code: error?.code ?? proc.exitCode ?? 0,
        error,
      })
    })
  })
}
interface ExecuteResult {
  stdout: string
  stderr: string
  code: number
  error: childProcess.ExecException | null
}

/**
 * 执行一条 shell 语句。成功返回 stdout，失败则退出程序，子进程的 stderr 始终会输出到当前进程。
 */
export async function execute(command: string, options?: childProcess.ExecOptions) {
  const result = await tryExecute(command, options)
  if (result.stderr) process.stderr.write('\n' + result.stderr)
  if (result.error) {
    if (result.stdout) process.stderr.write('\n' + result.stdout)
    exit(`${command} 执行失败 [${result.code}]`)
  }
  return result.stdout
}

/**
 * 解析 JSON，若失败，返回 fallback 或 undefined
 */
function safeParseJSON<T>(raw: string): T | undefined
function safeParseJSON<T>(raw: string, fallback: T): T
function safeParseJSON<T>(raw: string, fallback?: T) {
  try {
    return JSON.parse(raw) as T
  } catch (e) {
    return fallback
  }
}
export { safeParseJSON }
