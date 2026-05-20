# npm 包更新发布流程

这份文档用于记录 `zjj-virtual-arcade-controller` 后续修改代码后，如何重新发布到 npm。

## 发布前确认

- [ ] 已完成代码修改。
- [ ] 已同步更新 README 或组件文档。
- [ ] 已确认本次改动属于 `patch`、`minor` 还是 `major`。
- [ ] 已确认当前 npm registry 使用官方地址，或发布命令显式指定官方地址。

版本规则：

- `patch`：修 bug、补文档、样式微调，不改变 API，例如 `0.1.0 -> 0.1.1`。
- `minor`：新增向后兼容能力，例如新增 prop、组件、事件，例如 `0.1.0 -> 0.2.0`。
- `major`：破坏性变更，例如删除 prop、修改事件载荷、改默认行为，例如 `0.1.0 -> 1.0.0`。

## 1. 进入项目并切换 Node

```bash
cd /Users/zhongjijie/study/小工具/摇杆

export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 22.22.1
```

## 2. 构建验证

```bash
npm run build:package
```

必须确认输出里没有构建失败。成功时会生成：

- `dist/index.mjs`
- `dist/style.css`
- `dist/**/*.d.ts`

## 3. 升版本号

npm 不允许同一个 `name + version` 重复发布，所以每次重新发布都必须先升版本。

修 bug 或文档：

```bash
npm version patch
```

新增兼容功能：

```bash
npm version minor
```

破坏性变更：

```bash
npm version major
```

如果不想让 `npm version` 自动创建 git tag，可以使用：

```bash
npm version patch --no-git-tag-version
```

## 4. 发布前 dry-run

当前本机默认 registry 可能是镜像源，所以这里显式指定官方 npm registry。

```bash
npm publish --dry-run --registry=https://registry.npmjs.org/ --cache /private/tmp/npm-publish-dry-cache
```

检查输出里的 `Tarball Contents`，正常情况下应该只包含：

- `LICENSE`
- `README.md`
- `dist/index.mjs`
- `dist/style.css`
- `dist/**/*.d.ts`
- `package.json`

## 5. 正式发布

```bash
npm publish --registry=https://registry.npmjs.org/ --cache /private/tmp/npm-publish-dry-cache
```

如果终端提示网页登录认证：

1. 打开终端给出的 npm 登录链接。
2. 在浏览器完成登录和授权。
3. 回到终端按 `ENTER`。
4. 看到 `+ zjj-virtual-arcade-controller@版本号` 才表示发布完成。

## 6. 发布后验证

```bash
npm view zjj-virtual-arcade-controller version --registry=https://registry.npmjs.org/
```

返回的新版本号应该和 `package.json` 里的 `version` 一致。

也可以查看包信息：

```bash
npm view zjj-virtual-arcade-controller --registry=https://registry.npmjs.org/
```

## 常见问题

### 不能重复发布同版本

如果看到类似 `Cannot publish over previously published version`，说明这个版本已经发布过。执行：

```bash
npm version patch
npm publish --registry=https://registry.npmjs.org/ --cache /private/tmp/npm-publish-dry-cache
```

### 默认 registry 是镜像源

检查当前 registry：

```bash
npm config get registry
```

如果返回 `https://registry.npmmirror.com/`，发布时必须显式加：

```bash
--registry=https://registry.npmjs.org/
```

### npm cache 权限错误

如果看到 `EPERM` 或提示 `~/.npm` cache 里有 root-owned files，可以继续使用临时 cache：

```bash
--cache /private/tmp/npm-publish-dry-cache
```

不要为了发布这个包随意修改全局 npm 目录权限，除非你明确知道本机 npm 环境要统一修复。

## 推荐完整命令

普通 patch 更新：

```bash
cd /Users/zhongjijie/study/小工具/摇杆
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 22.22.1

npm run build:package
npm version patch
npm publish --dry-run --registry=https://registry.npmjs.org/ --cache /private/tmp/npm-publish-dry-cache
npm publish --registry=https://registry.npmjs.org/ --cache /private/tmp/npm-publish-dry-cache
npm view zjj-virtual-arcade-controller version --registry=https://registry.npmjs.org/
```
