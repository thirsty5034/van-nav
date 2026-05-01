# Van Nav 项目分析报告

> 原项目：https://github.com/mereithhh/van-nav
> Fork 时间：2026-05-01
> Fork 者：thirsty5034

---

## 一、项目概述

**Van Nav** 是一个轻量级的个人导航站，用于汇总和管理你的所有在线服务/工具。全平台支持（PC / Pad / Phone），单文件部署，有配套浏览器插件。

- **Stars**: ⭐ 1,238
- **Forks**: 228
- **License**: MIT
- **语言**: TypeScript (前端) + Go (后端)
- **最新更新**: 2026-05-01

---

## 二、技术栈

### 后端 (Go)
| 组件 | 技术 | 说明 |
|:--|:--|:--|
| 框架 | **Gin** (gin-gonic/gin) | Go 最流行的 HTTP 框架 |
| 数据库 | **SQLite** (modernc.org/sqlite) | 纯 Go 实现，无需 CGO |
| 鉴权 | **JWT** (golang-jwt/jwt) | 用户认证 |
| 压缩 | **Gzip** (gin-contrib/gzip) | 全局响应压缩 |
| 图片处理 | **gabriel-vasile/mimetype** | 自动检测 MIME 类型 |
| 配置 | **Go 标准库** | 无第三方配置库 |

### 前端 (React + TypeScript)
| 组件 | 技术 | 说明 |
|:--|:--|:--|
| UI 框架 | **React 18 + TypeScript** | 函数组件 + Hooks |
| UI 组件库 | **Ant Design** | 后台管理界面 |
| 拖拽排序 | **@dnd-kit** | 卡片拖拽排序 |
| 路由 | **react-router-dom** | 页面路由 |
| 样式 | **Tailwind CSS** | 原子化 CSS |
| 搜索 | **pinyin-match** | 拼音模糊搜索 |
| HTTP | **axios** | API 请求 |
| PWA | **Workbox** | 离线可用 / 可安装 |
| 图标 | **@ant-design/icons + @radix-ui/react-icons** | 图标库 |

---

## 三、项目结构

```
van-nav/
├── main.go                  # 入口文件
├── serve.go                 # 服务启动配置
├── go.mod / go.sum          # Go 依赖管理
├── Dockerfile               # 多阶段构建 Docker
├── Makefile                 # 构建命令
├── .goreleaser.yml          # 发布配置（多平台编译）
│
├── handler/
│   └── handlers.go          # HTTP 路由注册 + 请求处理
│
├── middleware/
│   └── auth.go              # JWT 认证中间件
│
├── service/                  # 业务逻辑层
│   ├── auth.go              # 登录认证逻辑
│   ├── catelog.go           # 分类管理
│   ├── image.go             # 图片上传/存储
│   ├── import.go            # 导入导出
│   ├── settings.go          # 站点设置
│   ├── site_config.go       # 站点配置
│   └── tools.go             # 工具卡片 CRUD
│
├── database/                 # 数据库层
│   ├── init.db.go           # 数据库初始化
│   ├── migration.go         # 迁移脚本
│   └── operations.go        # 数据库操作
│
├── types/                    # 数据类型定义
│   ├── types.go             # 核心模型
│   └── dto.go               # 数据传输对象
│
├── utils/                    # 工具函数
│   ├── jwt.go               # JWT 工具
│   └── utils.go             # 通用工具
│
├── goscraper/                # 网站爬虫
│   └── goscraper.go         # 自动抓取网站信息
│
├── logger/                   # 日志
│   └── log.go               # 日志工具
│
├── api-website/              # API 文档站点
│   ├── index.html
│   └── openapi.yaml         # OpenAPI 规范文档
│
└── ui/                       # 前端代码 (React + TypeScript)
    ├── package.json
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── sw-config.js / workbox-config.js  # PWA 配置
    │
    ├── public/               # 静态资源
    │   ├── index.html
    │   ├── manifest.json     # PWA manifest
    │   ├── logo*.png         # 应用图标
    │   ├── baidu.ico / bing.ico / google.ico  # 搜索引擎图标
    │   └── bg.webp           # 背景图
    │
    └── src/                  # React 源码
        ├── index.tsx         # 入口
        ├── App.tsx           # 根组件
        ├── router.tsx        # 路由配置
        ├── serviceWorker.ts  # PWA Service Worker
        │
        ├── components/       # 通用组件
        │   ├── CardV2/       # 卡片组件（拖拽、展示）
        │   ├── Content/      # 内容区布局
        │   ├── DarkSwitch/   # 暗色模式切换
        │   ├── GithubLink/   # GitHub 链接
        │   ├── Loading/      # 加载动画
        │   ├── SearchBar/    # 搜索栏
        │   └── TagSelector/  # 标签选择器
        │
        ├── pages/            # 页面
        │   ├── Home.tsx      # 首页
        │   ├── Login.tsx     # 登录页
        │   └── admin/        # 后台管理
        │       ├── index.tsx # 后台主页面
        │       ├── components/sidebar.tsx
        │       └── tabs/     # 后台功能标签页
        │           ├── Tools.tsx     # 工具管理
        │           ├── Catelog.tsx   # 分类管理
        │           ├── Search.tsx    # 搜索引擎配置
        │           ├── Setting.tsx   # 站点设置
        │           └── ApiToken.tsx  # API Token 管理
        │
        └── utils/            # 前端工具
            ├── api.tsx       # API 请求封装
            ├── admin.ts      # 后台 API
            ├── tools.ts      # 工具函数
            ├── setting.ts    # 设置管理
            ├── theme.ts      # 主题切换
            ├── serachEngine.ts # 搜索引擎配置
            ├── touch.ts      # 触摸事件
            └── check.ts      # 校验工具
```

---

## 四、核心功能

### 1. 导航站点
- **工具卡片展示** — 分类展示所有工具/服务链接
- **拖拽排序** — 前端支持卡片拖拽重新排序
- **模糊搜索** — 支持拼音匹配搜索
- **快捷键** — 直接输入聚焦搜索，回车打开第一个结果
- **自定义跳转方式** — 新标签页 / 当前页

### 2. 后台管理
- **工具管理** — 增删改查工具卡片（名称、URL、图标、分类）
- **分类管理** — 自定义分类
- **搜索引擎集成** — 配置多个搜索引擎
- **站点设置** — 自定义 Logo、标题、跳转方式等
- **API Token** — 生成 API 密钥用于外部调用
- **导入导出** — 数据备份与迁移

### 3. 高级特性
- **暗色主题** — 支持手动切换 + 自动跟随系统
- **PWA** — 离线可用，可安装到桌面
- **自动获取网站信息** — 自动抓取网站标题、描述、Logo
- **图片存库** — 避免跨域和加载慢
- **隐藏卡片** — 登录后才能查看
- **浏览器插件** — 配套插件快速添加工具
- **API 接口** — 支持通过 API 添加工具

### 4. 未实现功能
- 国际化 (i18n) — 仅有中文
- 网站状态检测 — 检测服务是否在线

---

## 五、数据流

```
┌─────────┐    ┌─────────────┐    ┌──────────┐
│  Browser │───▶│ Gin Router  │───▶│  JWT Auth │
│ (React)  │    │ (handler/)  │    │ (middleware)│
└─────────┘    └──────┬──────┘    └──────────┘
                      │
                      ▼
              ┌──────────────┐
              │  Service Layer │
              │  (service/)   │
              └──────┬───────┘
                     │
                     ▼
              ┌──────────────┐
              │     SQLite    │
              │  (database/)  │
              └──────────────┘
```

---

## 六、部署方式

| 方式 | 命令 |
|:--|:--|
| Docker | `docker run -d -p 6412:6412 -v /path/to/data:/app/data mereith/van-nav:latest` |
| 二进制 | 下载 release 二进制文件直接运行 |
| systemd | 注册为系统服务，开机自启 |

- **默认端口**: 6412
- **默认账号密码**: admin / admin
- **数据文件**: `nav.db`（自动创建）
- **多平台**: 通过 goreleaser 自动构建 Linux / macOS / Windows

---

## 七、构建与开发

### 前端构建
```bash
cd ui
pnpm install
pnpm build
```

### 后端构建（包含前端静态资源）
```bash
# 前端构建后，资源自动嵌入到二进制中
go build .
```

### Docker 构建（多阶段）
```bash
docker build -t van-nav .
```
- Stage 1: Node 18 构建前端
- Stage 2: Go 1.23 编译二进制
- Stage 3: Alpine 运行镜像

---

## 八、适合修改的方向

| 方向 | 难度 | 说明 |
|:--|:--:|:--|
| 国际化 (i18n) | ⭐⭐⭐ | 前端 React + 后端都需要适配 |
| 增加新搜索引擎 | ⭐ | 前端搜索配置 + 后端 API |
| 网站状态检测 | ⭐⭐ | 后端定时检测 + 前端状态显示 |
| 自定义主题/样式 | ⭐ | Tailwind CSS 修改 |
| 添加更多卡片类型 | ⭐⭐ | 新组件 + 数据结构扩展 |
| OAuth 登录 | ⭐⭐⭐ | 增加第三方登录 |
| Docker 优化 | ⭐ | 减小镜像体积 |

---

*此文档由 Hermes Agent 自动生成，用于记录项目分析和后续开发参考。*
