# 主题管理增强实施计划（2026-11-19）

## Goal
把主题管理从"6 色 + 4 布局 + 3 排版 + 自定义CSS"扩充为覆盖全站观感的配置体系：
变量贯通、字体/圆角、顶栏、页面背景、卡片细项、链接按钮、页脚、多夜间预设、
多主题方案、导入导出、分区 CSS、实时预览。共 14 项（含已完成 antd 贯通）。

## Architecture
- 配置真源：`nav_theme_config.config_json`（单套）+ 新表 `nav_theme_presets`（多主题方案）。
- 后端：`types.ThemeConfig` 扩展子配置组（全部带缺省值，旧数据零迁移）；`service/theme.go`
  统一解析/校验/保存；新 handler 提供方案 CRUD 与导入导出。
- 前端：`applyThemeVars` 把新配置展开为 `--van-nav-*` CSS 变量；组件 CSS 消费变量；
  `useAntdTheme` 已把配色映射进 antd token；`body[data-page]` + 卡片 `data-catelog`
  提供分区 CSS 作用域；Theme 页新增配置区与 iframe 实时预览。
- 事件链：手动切换/自动策略/配置加载 → theme-change / theme-config-loaded →
  React 重渲染 + CSS 变量重应用（已有链路复用）。

## Tech Stack
Go 1.25 + Gin + modernc sqlite；React 18 + TS + antd5 + CRA；验证 node CDP + jest。

## Baseline / Authority Refs
- `types/types.go` ThemeConfig 结构
- `service/theme.go` 解析/校验/保存
- `ui/src/utils/theme.ts` applyThemeVars / applyPreferredTheme / watcher
- `ui/src/hooks/useAntdTheme.ts` antd token 映射
- `ui/src/pages/admin/tabs/Theme.tsx` 配置表单
- `ui/src/components/Content/index.css` 顶栏/搜索/页脚样式
- ARCH_CONTRACT.md 分层约束（handler 不碰 SQL）

## Compatibility Boundary
- 所有新 JSON 字段可选、后端补缺省；旧前端忽略新字段、旧数据补默认值。
- `/api/theme` 只增不改；新接口全部挂在 `/api/admin/theme/*`（JWT）。
- 自定义 CSS 安全校验（10KB、危险关键字、url 协议）复用 `sanitizeCustomCSS`。

## TDD Route
mode=off（会话默认），decision=skipped；无 strict 授权。
验证姿态：纯函数单测（窗口/校验已有先例）+ 构建编译 + CDP 真实浏览器端到端。

## Change Necessity
code-change：现有配置项无法覆盖用户提出的定制面；变量不贯通导致配置"看不见"。
最小边界：全部改动收敛在 theme 配置域（types/service/handler/theme.ts/Theme.tsx/相关 css）。

## Tasks（顺序执行，每批验证后进入下一批）
- T1 变量贯通：Content/index.css 顶栏/搜索框/页脚/浮动按钮接入既有变量；Login 页接入；
  ThemeSync 写 `body[data-page]`（home/admin/login）。
- T2 后端字段：types 增加 Font/Radius/Topbar/PageBg/CardExtra/LinkBtn/Footer 六组；
  theme.go 默认值/解析/校验（颜色格式、px 格式、枚举）/保存；service 测试补用例。
- T3 前端变量应用：applyThemeVars 展开全部新变量（日/夜两套取值）；
  index.css 与 Content/index.css 消费（字体、全局圆角、顶栏、背景渐变/图片/遮罩、
  卡片 logo/标题/hover/描边、链接、按钮圆角、页脚）；CardV2 输出 `data-catelog` 与
  hover/描边模式类；nightPresets 扩充至 8 个。
- T4 配置表单：Theme.tsx 新增六个配置区（字体圆角/顶栏/页面背景/卡片细项/链接按钮/页脚），
  handleSave 组装 + 校验回显。
- T5 多主题方案：新表 nav_theme_presets + database/service/handler
  （GET 列表 / POST 保存 / DELETE / POST apply 应用到当前配置）+ api.tsx + Theme 页 UI。
- T6 导入导出：GET /api/admin/theme/export（JSON 下载）、POST /api/admin/theme/import
  （校验后写入）；Theme 页按钮。
- T7 实时预览：Theme 页右侧 iframe 预览面板，表单值变更（防抖 300ms）同步变量到 iframe 文档。
- T8 收尾：全部单测、架构断言、构建、部署 51738、CDP 端到端
  （后台改配置 → 前台变量/组件样式生效 → 夜间切换 → 多方案切换 → 导入导出）、提交。

## Verification
- 每批：`go test -vet=off ./service/`（涉及后端时）、`pnpm build` 通过。
- 最终：CDP 端到端断言关键计算样式（顶栏背景、卡片圆角、字体、背景图、页脚颜色、
  方案切换后变量变化、导入导出往返一致）。
- 架构断言 `./assert_architecture.sh` 通过。

## Risks / Retirement
- antd token 与手写暗色 CSS 叠加：以 token 为基、页面 CSS 仅微调，冲突时以 CSS 变量为准。
- 背景图安全：仅允许 data: 协议或站内相对路径，走 sanitizeCustomCSS 同源校验思路。
- 旧逻辑退休：无（decodeAuto 等已在上批清理）。


---

# 定稿方案 v3（用户已确认，2026-11-19）—— 团队实施版

## 设计原则
设置项按"用户看到的页面部位"组织，命名用效果语言（"形状：方形↔圆形"、"透明无框"），
不出现工程词汇。主题页为**左侧设置区（页签）+ 右侧固定实时预览**。

## 最终页签结构（11 个）
1. **快速开始**：预设主题一键套用；主题方案保存/切换/删除；导入导出
2. **品牌与图标**（🔁 自 settings 迁入）：站点标题、favicon、logo192、logo512
3. **页面背景**：背景颜色、渐变第二色、背景图片、压暗程度
4. **搜索框**（🆕）：显示/隐藏；水平位置（左/中/右）；宽度占内容区比例；摆放（页面顶部/底部）；高度；圆角；透明无框/毛玻璃/纯色；文字色；提示色；占位文案
5. **分类标签**（🆕）：位置（上/下/左/右贴屏，左右为侧边竖排）；透明无框；底色/选中底色/文字色；圆角；显示/隐藏
6. **卡片样式**：透明无框；形状（圆角档位）；**卡片高度**（🆕）；每行列数（🔁 pcColumnCount 迁入）；展示开关（Logo/标题/简介/分类标签，🆕 拆分）；底色透明度（🆕）；标题/简介颜色；Logo 形状/大小；Hover 上浮；描边模式；隐藏 Logo 模式（🔁 noImageMode）；精简模式（🔁 compactMode）；按访问次数排序（🔁 sortByClicks）
7. **链接与打开方式**（部分🔁）：链接颜色、按钮圆角、新窗口/当前页（jumpTargetBlank 迁入）
8. **页脚与备案**（部分🔁）：备案文案（govRecord 迁入）、文字颜色、显示/隐藏
9. **字体**：字体族、正文字号、标题字号/字重、简介字号
10. **夜间模式**：策略/时间窗、夜间配色（背景/卡片/文字）、8 个夜间预设、夜间 CSS
11. **高级 · 自定义 CSS**：全局 CSS，支持 body[data-page] 与卡片 data-catelog 定向

说明：卡片**不展示访问次数**（用户决定）。搜索引擎卡片显隐（showSearchEngine）保留在
"卡片样式"页签（它本质是"要不要在搜索结果里附加搜索引擎卡片"）。

## 实现机制
- 每个用户设置项 → 一条 CSS 变量，由 `computeThemeVars(config, isDark)` 统一展开；
  组件 CSS 只消费变量。变量挂载到模拟页/真实页的 body。
- 新增配置组（types.ThemeConfig）：`search`、`tag`、`card` 扩展（height/showLogo/showTitle/showDesc/showTag/bgOpacity）、`footer.text`。
- 卡片展示开关通过 props 传入 CardV2（Content 从主题配置读取）。
- 从 settings 迁移的项：**存储不变**（仍在 nav_setting/site_config），仅管理入口搬到主题页；
  主题页同时拉取 setting + theme 两个接口，保存时各走各的 API。
- 预览：`srcDoc` 沙箱模拟页（无脚本），结构与真实首页同构（.topbar/.search-wraper/.select-tag/
  .card-box/.card-right-*/.record-wraper），customCSS 注入后选择器可命中。

## 任务分解（共享任务板）
- **task-1 配置与变量层**：types/theme.go（新配置组+校验+默认值）、computeThemeVars 新变量、
  单测。产出后 task-2/task-3 才能开工。
- **task-2 主题页重构与迁移**：Theme.tsx 重排为 11 页签；settings 外观项迁入；新设置表单区；
  保存链路（setting/theme 双 API）。依赖 task-1。
- **task-3 首页布局与组件消费**：搜索框位置/宽度/上下、标签栏四向贴边、卡片高度/展示开关/
  透明无框（Content/index.tsx、CardV2、Content/index.css、index.css）。依赖 task-1。
- **task-4 集成与发布**：全量回归、Browser Relay 实测、构建部署（lead 负责）。依赖 task-2、task-3。

## 团队分工
- agent-fe-config：task-1
- agent-fe-page：task-2
- agent-fe-home：task-3
- lead：协调、task-4、代码审查、合并
