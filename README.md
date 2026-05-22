# zjj-virtual-arcade-controller examples

这个分支是 `zjj-virtual-arcade-controller` 的独立示例项目。

示例不会从本仓库源码导入组件，而是像真实用户一样从 npm 包导入：

```ts
import {
  ThreeJoystick,
  VirtualActionButton,
  VirtualArcadeController,
} from 'zjj-virtual-arcade-controller'
import 'zjj-virtual-arcade-controller/style.css'
```

## 示例内容

- `VirtualArcadeController` 完整控制器。
- `ThreeJoystick` 独立摇杆。
- `VirtualActionButton` 独立按钮。
- `flat / angled` 视角切换。
- 自定义摇杆方向键映射。
- 摇杆和按钮事件状态展示。

## 本地运行

```bash
npm install
npm run dev
```

打开：

```text
http://localhost:5173/
```

## 构建验证

```bash
npm run build
```

## 相关包

npm 包地址：

```text
https://www.npmjs.com/package/zjj-virtual-arcade-controller
```
