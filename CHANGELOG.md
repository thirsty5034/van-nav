# Changelog

本文件记录本项目（[thirsty5034/van-nav](https://github.com/thirsty5034/van-nav)）的更新日志。上游项目（[Mereithhh/van-nav](https://github.com/Mereithhh/van-nav)）的历史记录附在末尾。


## [2.4.5] - 2026-09-11

### 🚀 New Features

- **工具 Logo 上传**：后台可为单个工具上传 png/jpeg/webp/ico（≤200KB），保存为 `data:` URI

### 🐛 Bug Fixes

- **`/api/img` 失败破图**：未命中/坏缓存返回 200 默认 PNG，不再 500 JSON
- **非图片写入缓存**：下载校验状态码与魔数
- **管理列表 Logo 查询串截断**：统一编码
- **非法 data URI**：服务端校验；更新接口不再吞掉错误
- **handler 登录直连 database**：改为 service 封装

### ⚙️ Changed

- 失败占位图改为 Van Nav 导航格图标
- `assert_architecture.sh` 路径与 Go cache 适配沙箱

---

## [2.4.4] - 2026-07-29

### 🔒 Security

- **Go 与 x/* 依赖**：go 1.25.0；`golang.org/x/crypto` 0.52.0、`x/net` 0.55.0、`x/text` 0.37.0
- **前端 Plan A/B overrides**：form-data / launch-editor / brace-expansion（含 1.1.16）/ js-yaml / serialize-javascript（≥7.0.5）/ svgo 2.8.3 等；刷新 pnpm-lock
- **直接依赖对齐**：react-router-dom ^7.18.0、postcss ^8.5.18

### ⚙️ Changed

- CI 与 Dockerfile Go 版本同步 1.25
- pnpm 11：overrides 迁入 `ui/pnpm-workspace.yaml`

---

## [2.4.3] - 2026-07-26

### 🐛 Bug Fixes

- **中文输入法搜索竞态**：拼音组字期间不驱动列表过滤；汉字上屏后立即 flush；确认后立刻回车按汉字打开首条匹配
- **首页首屏装不满**：按视口与列数估算首屏卡片数，内容高度不足时自动补批次
- **离线/弱网首屏与图片**：`FetchList` 4s 超时 + SWR 本地缓存优先；`/api/img` CacheFirst + logo 预热

### 🔒 Security

- **Dependabot 依赖修复**：axios 1.16.1 → 1.18.0；form-data / launch-editor 通过 pnpm.overrides 锁定修复版本

### ⚙️ Changed

- 搜索防抖 300ms → 150ms

---

## [2.0.2] - 2026-05-31

### 🚀 New Features

- **密码重置 CLI**：`-reset-password` 参数，无需启动服务即可重置密码，数据零丢失
- **README 双语**：新增英文翻译 + 中英文语言选择器
- **后台截图更新**：新增 6 张管理页面截图，移除过时图片
- **CHANGELOG 规范化**：本项目日志与上游历史分离
- **发版流程增强**：RELEASE_PROMPT 新增 CHANGELOG 同步步骤

### 🐛 Bug Fixes

- **登录错误提示不显示**：前端字段名不匹配 + antd message 被背景遮挡，改为内联红色错误横幅
- **部署版本号硬编码**：默认值从 `v2.0.0.0` 改为 `dev` / 空字符串
- **GoReleaser changelog 覆盖**：禁用自动 changelog，改用 RELEASE_NOTES.md

### ⚙️ Changed

- 移除 PAD 预览、交流群截图、在线体验链接、API 文档链接
- 新增 `-reset-password` 文档说明

### 🙏 鸣谢

本项目开发过程中得到了[小米大模型团队](https://platform.xiaomimimo.com/)百万亿 Token 创造者激励计划的支持与赞助，在此表示衷心感谢。

---

---

## [2.0.1] - 2026-05-31

### 🚀 New Features

- **WebDAV 云备份与恢复**：支持将数据库加密备份到坚果云等 WebDAV 服务，自动轮询备份，密钥自动生成
- **全量配置导入导出**：一键导出所有配置（工具、分类、搜索引擎、Token、设置、网站配置）为 JSON 文件，支持跨实例迁移
- **链接健康检查**：后台批量检测工具链接存活状态，标记死链并支持一键排序到末尾
- **工具描述自动获取**：支持"一键更新描述"批量获取工具页面标题和描述，支持 GBK/UTF-8 自动编码识别
- **部署版本号管理**：编译时注入 Git tag，启动时同步到数据库，后台设置页显示当前版本
- **Docker Compose**：提供开箱即用的 `docker-compose.yml`
- **GHCR 多架构镜像**：切换到 GitHub Container Registry，支持 amd64/arm64/arm

### 🔒 Security

- **JWT 密钥持久化**：改为环境变量 → 文件 → 自动生成三级优先策略，重启后 token 不再失效
- **密码 bcrypt 强制**：登录改为 bcrypt-first 校验，旧版明文密码首次登录自动升级为 bcrypt 哈希
- **API Token 有效期收窄**：100 年 → 10 年
- **数据库迁移安全**：`panic(err)` → `logger.LogError` + `os.Exit(1)`
- **依赖安全升级**：解决 98 个 npm 漏洞 + 15 个 Dependabot 告警

### 🏗️ Architecture

- **分层架构合规**：Handler 层 14 处直接数据库调用全部下沉到 Service 层，handler 包零 database 引用
- **新增编译期断路器**：`assert_architecture.sh` 阻止分层违规回归
- **搜索引擎 Service 层补全**：新建 `service/search_engine.go`
- **配置导入导出 Service 层**：新建 `service/config.go`

### 🐛 Bug Fixes

- **goroutine panic 兜底**：4 个异步路径全部增加 `defer/recover` 保护
- **错误处理升级**：5 个删除/更新 Handler 从静默吞错改为显式 HTTP 500 响应
- **批量导入事务优化**：循环内独立事务合并为单次批量提交
- **废弃 API 替换**：`ioutil.ReadAll` → `io.ReadAll`
- **拼写修正**：`ManifastHanlder` → `ManifestHandler`

### ⚙️ CI/CD

- **CI 全链路升级**：Node.js 22 + pnpm 11.4.0 + Go 1.23
- **Docker 现代化**：多阶段构建，GHCR 多架构镜像发布
- **发版流程标准化**：GoReleaser + 结构化 Release Notes + 用户确认门禁

---

## [2.0.0] - 2026-05-19

### 🚀 New Features

- **搜索引擎自由管理**：后台可自由添加、编辑、删除搜索引擎，支持自定义名称、图标、URL 模板和启用状态
- **三页面统一拖拽排序与批量操作**：分类管理、工具管理、搜索引擎管理均支持拖拽排序、隐藏列开关、多选批量删除
- **工具 Logo 自动获取**：添加工具时自动调用 favicon.im API 获取网站图标，支持"一键更新 Logo 网址"批量操作
- **全局配置导入导出**：支持一键导出所有配置为 JSON 文件，可在其他实例导入恢复
- **工具描述自动化**：支持"一键更新描述"批量获取工具描述
- **链接健康检查**：后台批量检测工具链接是否可访问，支持自动将死链排序至末尾
- **断网本地显示**：主页工具数据 fallback 到 localStorage，断网时仍能显示已缓存的工具列表
- **搜索引擎开关与列数配置**：新增"是否显示搜索栏"和"桌面端列数（2-8）"全局设置
- **主页分类滚轮切换**：鼠标悬停在分类标签栏上滚动滚轮即可切换分类
- **WebDAV 云备份**：支持将数据库加密备份到坚果云等 WebDAV 服务
- **备份文件管理与恢复**：后台可查看云端备份文件列表，支持从指定备份恢复数据库
- **部署版本自动同步**：编译时注入 Git tag 作为版本号，启动时自动同步到数据库

### 🐛 Bug Fixes

- **搜索引擎图标显示**：修复管理页面 Logo 列对本地图标错误代理到 API 的问题
- **异步图标获取阻塞**：AddTool/UpdateTool 中远程取图标改为异步 goroutine
- **夜间模式全面适配**：修复 DarkSwitch、TimePicker、InputNumber、Modal 等组件暗色模式样式
- **导入导出功能**：修复 ImportTools ID 冲突、缺少 sort/hide 字段等问题
- **JWT 认证**：修复 Bearer 前缀未剥离导致管理员接口 401
- **SQLite 并发崩溃**：修复批量导入时并发 UpdateImg 导致 database locked
- **路径遍历防护**：GetLogoImgHandler 添加 URL 格式验证防止空切片 panic
- **ID 生成安全**：使用 crypto/rand 替代时间戳生成 ID
- **备份恢复逻辑**：修复恢复后数据库连接未重初始化导致 panic
- **跳转方式同步**：修复 toggleJumpTarget 写服务器导致的循环依赖

### ⚙️ Changed

- **密码存储安全升级**：用户密码从明文存储迁移到 bcrypt 哈希存储
- **数据竞争防护**：RestoreFromBackup 添加互斥锁保护数据库连接
- **Git 产物清理**：van-nav 二进制文件从 git 跟踪中移除并加入 .gitignore
- **GitHub Actions 升级**：所有 workflow 升级到支持 Node.js 24 的版本

---

## 上游项目历史记录（Mereithhh/van-nav）

> 以下为上游项目 [Mereithhh/van-nav](https://github.com/Mereithhh/van-nav) 的历史更新记录，仅供参考。

<details>
<summary>展开查看上游 v1.0.0 ~ v1.12.1 完整历史</summary>

### [1.12.1] - 2025-01-17

- 🚀 修正 embed 导致的图标显示不全 #40
- 🐛 调整后端 svg 显示 #40
- 🐛 处理在初始化后返回结果为 null 导致的无法显示后台登录卡片问题 #67

### [1.12.0] - 2024-12-21

- 🚀 前台实现隐藏分类，后台实现隐藏编辑 #56
- 🐛 移除多余的 print

### [1.11.5] - 2024-12-21

- 🐛 管理入口消失，网站修改信息无效 #52 #53

### [1.11.4] - 2024-12-14

- 🐛 ApiToken 无法获取工具 & api-token 页面不能刷新 #51

### [1.11.3] - 2024-12-14

- 🐛 后台添加工具后，表单信息没重置 #50

### [1.11.2] - 2024-12-14

- 🐛 重构后浏览器插件无法添加工具

### [1.11.1] - 2024-12-13

- 🐛 隐藏工具失效，改成后端判断 #49
- 🐛 Sql error
- 🐛 轮换 jwt secret 后签发 api token 失效

### [1.11.0] - 2024-12-08

- 🚀 Jwt secret 轮换
- 🚀 默认 30 天过期
- 🚀 后台增加拖拽排序功能 #48
- 🐛 Use crypto/rand

### [1.10.0] - 2024-12-07

- 🐛 Run error / Build error

### [1.9.3] - 2024-12-07

- 🚜 重构后端，结构清晰便于维护
- 🚜 前端更新为 react19
- 🚜 前端整合成一个，UI 优化，路由懒加载

### [1.9.2] - 2023-09-16

- 🐛 中文输入法回车触发提交 & 默认没有 icp 备案号

### [1.9.1] - 2023-09-15

- 🐛 默认不展示 icp 证

### [1.9.0] - 2023-09-15

- 🚀 优化搜索速度 & 允许输入空格
- 🚀 后台可设置默认跳转方式
- 🚀 支持启动时指定端口

### [1.8.0] - 2023-06-27

- 🚀 增加去掉 github 链接的后台配置项 #7
- 🚀 支持隐藏条目，只有登录后才展示 #2
- 🚀 搜索引擎集成 #10
- 🚀 增加快速选择快捷键
- 🚀 支持自定义跳转方式

### [1.7.0] - 2023-04-27

- 🚀 后台增加一个隐藏管理按钮的设置

### [1.6.0] - 2023-03-30

- 🚀 数据库增加排序字段，并实现相应 CRUD 接口
- 🚀 后台管理页面增加工具、分类排序字段编辑
- 🐛 修改分类名称时，同步修改工具相关分类名称

### [1.5.0] - 2023-02-20

- 🚀 光标移动到内容上会有 tooltip
- 🚀 增加项目地址链接按钮

### [1.4.0] - 2023-02-15

- 🚀 自动主题切换 #1
- 🚀 更新工具异步获取图标 #3

### [1.3.0] - 2023-02-14

- 🚀 异步 logo 自动获取 #3

### [1.2.0] - 2022-11-17

- 🚀 PWA 支持

### [1.1.0] - 2022-04-11

- 🚀 管理后台不记录缓存
- 🚀 API Token 功能

### [1.0.0] - 2022-03-31

- 🐛 暗色模式卡片颜色调整
- 🎉 首个正式版本

### [0.6.0] - 2022-03-25

- 🚀 支持暗色模式

### [0.5.0] - 2022-03-25

- 🚀 基本完成

### [0.4.0] - 2022-01-04

- 🚀 增加导入导出功能

### [0.3.3] - 2021-12-20

- 🚀 增加总数概览

</details>
