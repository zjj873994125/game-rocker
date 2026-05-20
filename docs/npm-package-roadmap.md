# npm 包化步骤清单

这份文档用于跟踪 `VirtualArcadeController` 从当前 demo 项目整理成 npm 包的过程。每次完成一个步骤后，把对应复选框从 `[ ]` 改成 `[x]`。

当前策略：先把白色控制面板里的核心组件 `VirtualArcadeController` 做成可发布包，外层 demo 页面、主题切换、`SELECT / START / COIN`、状态卡片暂时不进入核心组件 API。

## 1. 明确包入口和组件边界

- [x] 确认 npm 包主入口只导出 `src/lib/index.ts`。
- [x] 保持 `VirtualArcadeController` 作为推荐主组件。
- [x] 保留 `ThreeJoystick` 和 `VirtualActionButton` 作为底层可选导出。
- [x] 确认 `App.vue` 只作为 demo，不参与包入口。
- [x] 确认 `SELECT / START / COIN` 暂时不进入核心组件。

完成标准：

- `src/lib/index.ts` 导出清晰。
- README 和组件文档都说明推荐优先使用 `VirtualArcadeController`。

## 2. 配置 Vite library mode

- [x] 新增独立的 `vite.lib.config.ts`，配置 library 构建入口。
- [x] 入口设置为 `src/lib/index.ts`。
- [x] 输出 ESM 格式文件，例如 `dist/index.mjs`。
- [x] 确认 CSS 会随组件构建输出。
- [x] 确认 demo 构建和 library 构建职责不混在一起。

完成标准：

- 执行构建后，`dist` 里能看到 npm 包需要的 JS 和 CSS 产物。
- `VirtualArcadeController` 可以从构建产物中被导入。

## 3. 生成 TypeScript 类型声明

- [x] 确认 `vue-tsc` 能输出 `.d.ts`。
- [x] 增加类型构建命令，例如 `build:types`。
- [x] 确认 `ArcadeButtonConfig`、`ArcadeAxisPayload`、`ArcadeButtonPayload`、`ArcadeViewMode` 等类型会被导出。
- [x] 确认 Vue 单文件组件的类型可以被宿主项目识别。

完成标准：

- `dist` 中包含 `index.d.ts` 或等效类型入口。
- 外部项目导入组件和类型时没有 TypeScript 报错。

## 4. 整理 package.json

- [x] 改包名，从 `yao-gan-demo` 改成正式 npm 包名。
- [x] 移除或调整 `private: true`。
- [x] 增加 `main`、`module`、`types` 字段。
- [x] 增加 `exports` 字段。
- [x] 增加 `files` 字段，只发布必要产物。
- [x] 增加 `sideEffects` 字段，确保 CSS 不被错误 tree-shaking。
- [x] 增加 `build:lib`、`build:types`、`pack:local` 等脚本。

完成标准：

- `package.json` 能表达 npm 包入口。
- `npm pack --dry-run` 只包含必要文件。

## 5. 调整依赖关系

- [x] 将 `vue` 放入 `peerDependencies`。
- [x] 将 `three` 放入 `peerDependencies`。
- [x] 在 `devDependencies` 中保留本地开发所需的 `vue` 和 `three`。
- [x] 确认宿主项目不会因为组件包重复安装 Vue 或 Three.js。

完成标准：

- `npm install` 后本地开发仍可运行。
- 打包产物不会把 `vue` 和 `three` 内联进组件包。

## 6. 验证样式导出和使用方式

- [x] 确认组件 scoped style 会被构建到 CSS 产物中。
- [x] 在 README 中说明是否需要手动引入样式文件。
- [x] 如果需要手动引入，文档补充 `import '包名/style.css'` 示例。
- [x] 检查箭头、按钮标签、摇杆布局在外部项目中不会丢样式。

完成标准：

- 外部项目引入组件后样式完整。
- 文档中有明确的样式引入说明。

## 7. 补充最小 npm 使用示例

- [x] 在 README 中增加“安装后使用”示例。
- [x] 示例使用正式包名导入 `VirtualArcadeController`。
- [x] 示例包含 `buttons` 配置。
- [x] 示例包含 `axis-change`、`axis-end`、`button-change` 事件。
- [x] 示例说明 `App.vue` 只是 demo，不是包 API。

完成标准：

- 新用户只看 README 就能在 Vue 3 项目中接入组件。

## 8. 本地打包验证

- [x] 执行 `npm run build`。
- [x] 执行 `npm pack --dry-run`。
- [x] 执行 `npm pack` 生成 `.tgz`。
- [x] 在临时 Vue 3 项目中安装本地 `.tgz`。
- [x] 验证组件能渲染、摇杆能移动、按钮能触发事件。
- [x] 验证 `flat` 和 `angled` 两种视角都可用。

完成标准：

- 本地 `.tgz` 安装后能正常使用。
- 控制台没有 Vue 或 Three.js 运行时错误。

## 9. 明确分层组件导出

- [x] 确认 `ThreeJoystick` 可以作为单独摇杆组件从包入口导入。
- [x] 确认 `VirtualActionButton` 可以作为单个按钮组件从包入口导入。
- [x] 确认 `VirtualArcadeController` 作为组合组件，继续提供 1 个摇杆 + 多个按钮的快速接入方式。
- [x] 在 README 中补充三个组件的分层使用场景。
- [x] 增加单独导入 `ThreeJoystick` 的最小示例。
- [x] 增加单独导入 `VirtualActionButton` 的最小示例。
- [x] 确认类型声明里能识别这三个组件导出。
- [x] 确认样式文件仍然覆盖单独摇杆、单独按钮和组合控制器。

完成标准：

- 用户可以只导入一个摇杆、只导入一个按钮、或导入完整控制器。
- 文档明确说明白色底盘和街机外壳不属于这三个基础组件；如需完整面板，后续再新增更高层 `ArcadeControlPanel`。

## 10. 发布前信息补齐

- [x] 确认包名是否可用。
- [x] 确认版本号，例如 `0.1.0`。
- [x] 增加 `description`、`keywords`、`author`、`license`。
- [x] 确认 README 包含功能、安装、使用、API、注意事项。
- [x] 视情况补充截图或动图。

完成标准：

- `npm publish --dry-run` 输出内容符合预期。
- README 已足够给外部用户理解和接入。

## 11. 可选增强，暂不优先

- [x] 透出摇杆方向键映射配置。
- [ ] 透出布局配置，例如摇杆和按钮间距、按钮列宽、行距。
- [ ] 新增更高层 `ArcadeControlPanel`，包含白色底盘、螺丝、摇杆和按钮。
- [ ] 增加 `utilityButtons`，用于 `SELECT / START / COIN`。
- [ ] 增加自动化测试或视觉回归测试。
- [ ] 增加独立 playground 或 examples 目录。

完成标准：

- 只有在真实使用场景需要时再做。
- 不影响第一阶段 npm 包最小闭环。
