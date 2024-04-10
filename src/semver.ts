export class SemVer {
  /**
   * major 为负数代表非标准版本号，此时 extra 是真正的版本号内容
   */
  readonly major: number
  readonly minor: number
  readonly patch: number
  readonly extra: string

  constructor(version: string) {
    const match = /^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/.exec(version)
    if (match) {
      const [, major, minor, patch, extra] = match
      this.major = parseInt(major!, 10)
      this.minor = parseInt(minor!, 10)
      this.patch = parseInt(patch!, 10)
      this.extra = extra ?? ''
    } else {
      this.major = -1
      this.minor = -1
      this.patch = -1
      this.extra = version
    }
  }

  toString() {
    return this.major >= 0
      ? `${this.major}.${this.minor}.${this.patch}${this.extra ? '-' + this.extra : ''}`
      : this.extra
  }

  /**
   * 与另一个版本号进行比较
   */
  compare(that: SemVer | string): SemVerDiff {
    if (typeof that === 'string') that = new SemVer(that)

    // 若出现非标准版本号，只要有不同，就认为当前版本号更新
    if (this.major === -1 || that.major === -1) {
      return { side: this.toString() !== that.toString() ? 1 : 0, level: SemVerLevel.major }
    }

    if (this.major > that.major) return { side: 1, level: SemVerLevel.major }
    else if (this.major < that.major) return { side: -1, level: SemVerLevel.major }

    if (this.minor > that.minor) return { side: 1, level: SemVerLevel.minor }
    else if (this.minor < that.minor) return { side: -1, level: SemVerLevel.minor }

    if (this.patch > that.patch) return { side: 1, level: SemVerLevel.patch }
    else if (this.patch < that.patch) return { side: -1, level: SemVerLevel.patch }

    // extra 不再具体解析，只要不一样就认为有更新
    if (this.extra !== that.extra) return { side: 1, level: SemVerLevel.extra }

    return { side: 0, level: SemVerLevel.major }
  }

  /**
   * 生成一个升级后的 SemVer
   */
  update(level: Exclude<SemVerLevel, SemVerLevel.extra>) {
    switch (level) {
      case SemVerLevel.major:
        return new SemVer(`${this.major + 1}.0.0`)
      case SemVerLevel.minor:
        return new SemVer(`${this.major}.${this.minor + 1}.0`)
      case SemVerLevel.patch:
        return new SemVer(`${this.major}.${this.minor}.${this.patch + 1}`)
    }
  }
}

export interface SemVerDiff {
  // -1: older, 0: same, 1: newer
  side: -1 | 0 | 1
  level: SemVerLevel
}

export enum SemVerLevel {
  major = 4,
  minor = 3,
  patch = 2,
  extra = 1,
}
