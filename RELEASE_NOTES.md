## [v2.4.5] - 2026-09-11

### Added
- **工具自定义 Logo 上传**：后台新增/编辑工具时可上传 png/jpeg/webp/ico（≤200KB），写入现有 Logo 字段的 `data:` URI，无需新接口或磁盘目录；远程 SVG 仍可通过 URL 填写

### Fixed
- **`/api/img` 失败破图**：缓存未命中、非图片或解码失败时返回 200 默认 PNG，不再吐 500 JSON 或禁止符 SVG；Content-Type 按图片魔数设置
- **远端非图片被缓存**：下载时校验 HTTP 2xx 与图片魔数，HTML/404 不再写入 `nav_img`
- **管理列表 Logo URL 截断**：统一走 `getLogoUrl` + `encodeURIComponent`，带 `?larger=true` 的 favicon 地址可正常显示
- **非法 data URI 假成功**：Add/Update 服务端校验格式/大小/魔数；`UpdateToolHandler` 正确返回 400；SVG 与超限文件在前端拦截
- **handler 登录越层**：登录签发 JWT 改为经 service 读取 token_version，不再从 handler 直连 database

### Changed
- **失败占位图**：默认 Logo 改为 Van Nav 主色圆底 + 2×2 导航格（`/logo-fallback.png`），`/api/img` 未命中与前端 `onError` 共用
- **架构审计脚本**：路径自适应，Go 缓存落到仓库 `.cache/`（适配沙箱环境）

### ⚠️ 风险提示
本项目代码部分由 AI 自动修改，无法保证完全无误。请在升级前备份重要数据，并自行评估使用风险。

---

## 升级注意事项
1. **无数据库 schema 变更**：直接替换二进制/镜像即可；JWT / 数据目录无需迁移
2. **自定义 Logo** 存在 `nav_table.logo` 文本中，导入导出与 WebDAV 备份会一并带走；单张上限 200KB
3. **公开 `/api/img` 仍不出网**：未命中只返回默认图，真正拉远端发生在管理员保存工具之后
4. **Service Worker**：若仍看到旧的灰色/符号占位图，强制刷新（Ctrl+Shift+R）一次
