# pnpm-workspace-publisher: 快捷发布 pnpm workspace 下的多个 npm 包

维护 Monorepo（一个大文件夹下的多个互相关联的 npm 包）是一件繁琐的事情。
pnpm 的 workspace 为此提供了一些便利，例如 package-a 依赖 package-b 时会自动 link，且无需手动更新依赖的版本号。
但是它并没有处理 npm 包的发布：package-a 发布后，依赖它的 package-b 也需要更新依赖版本并发布。
此工具补充上了这个功能。

## 使用方式

先全局安装此工具：

```shell
pnpm add --global pnpm-workspace-publisher
```

然后在 pnpm workspace 内（通过 `pnpm-workspace.yaml` 识别），执行 `ws-publish`。  
此工具会自动发布 workspace 内版本号有变化的包和依赖它们的包。

## 约定

### 外部依赖

此工具只处理 workspace 内各包之间的依赖，不考虑外部依赖。  
即：包发布时，不会更新外部依赖的版本号；也不会因外部依赖有新版本而触发包的发布。

### 循环依赖

此工具不处理循环依赖。
每次发布流程，一个包一定只发布一次，在有循环依赖的情况下，不保证发布时依赖的其他包一定包含最新的内容。
（主要是 pnpm 自己也不能很好地处理循环依赖，此工具就不在这个方面花精力了）
