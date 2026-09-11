# Spec Brief: 工具 Logo 上传与 `/api/img` 失败回退

Date: 2026-09-11  
Status: approved-for-planning（产品选择已确认；待用户审阅本文后进入实现计划）  
Issue: https://github.com/thirsty5034/van-nav/issues/8  
Approach: A — 就地修现有主人，不新增表/文件目录/multipart 路由

## 1. 目标

管理员能为单个**工具**上传自定义图标；远程 Logo 在缓存未命中、非图片或解码失败时，首页与后台预览显示**统一默认图**，不再出现破图或 500 JSON。

成功证据：见第 6 节验收清单。全部通过即停止。

## 2. 范围

**做**
- 修复 `GET /api/img` 失败态（占位图、MIME、只读缓存）
- 远程下载写入 `nav_img` 前校验 HTTP 状态与图片魔数
- 工具表单：本地选 png/jpeg/webp/ico（≤200KB）→ `data:` → 现有 Logo URL 字段
- Add/Update 工具时服务端校验 `data:`；非法则 400 且不写库
- 前台卡片与后台工具列表统一 `getLogoUrl` + `<img onError>` 默认图

**不做**
- 搜索引擎图标、站点 favicon、PWA logo192/512 上传
- 新表、`data/logos/` 磁盘、`POST /api/admin/tools/logo` multipart
- SVG 上传；公开 `GET /api/img` 出网抓取任意 URL
- 失败回退到原始外链；主动清理历史坏缓存（读时跳过即可）
- 重做 favicon API 模板 / 自动拉 favicon 流程

## 3. 当前行为（已复现）

- `nav_table.logo` 为 TEXT；现网多为 `https://favicon.im/...`
- 公开 `GET /api/img?url=` **不拉远端**，只读 `nav_img` 或内置占位
- PNG 占位 base64 缺 padding → 非 `.svg` 未命中返回 500 `图片解码失败`
- `.svg` 未命中返回 200 禁止符 SVG
- `GetImgBase64FromUrl` 不看状态码/Content-Type，HTML 可被写入 `nav_img`
- MIME 按 URL 后缀猜测；无后缀或 `?larger=true` 标成 `image/x-icon`
- 工具表单只有 URL + 自动 favicon；`Upload` 仅用于导入 `tools.json`
- `getLogoUrl()` 已支持 `data:` 直出；管理列表未走该函数且未编码 query

## 4. 目标行为

### 4.1 远程 URL logo

管理员仍可填 `http(s)://...`。保存后异步 `UpdateImg`：仅当远端 **2xx** 且 body 魔数为 png/jpeg/webp/ico/gif/svg 时写入 `nav_img`，否则不写。

`GET /api/img?url=`：
- 缺 `url`：400 JSON（保持）
- 有 `url`：**始终 200 且 body 为图片**
  - 缓存命中且魔数为图：按魔数设 `Content-Type` 吐缓存
  - 未命中、解码失败、或缓存体不是图：200 默认 PNG
- **不出网**

### 4.2 自定义上传

工具新增/编辑表单增加文件选择（`accept` 白名单）。浏览器读文件为 `data:image/<type>;base64,...`，填入现有 Logo URL 输入框（可预览、可改回 URL）。保存仍走现有 `POST/PUT /api/admin/tool*`。

服务端在 `service/tools.go` Add/Update 校验 `data:`：
- 前缀 `data:image/`
- 允许声明类型：`png`、`jpeg`/`jpg`、`webp`、`x-icon`/`vnd.microsoft.icon`
- 禁止 `svg+xml`、空 payload、非法 base64
- 解码字节 ≤ 200KB，魔数与声明类型一致
- 失败：400 中文错误，不写库

通过后原样写入 `nav_table.logo`。`data:` **不写入** `nav_img`。

前台 `getLogoUrl`：`data:` 当 `<img src>`；`http(s)` 走 `/api/img?url=`（`encodeURIComponent`）。

### 4.3 前端失败兜底

卡片与管理列表 `<img onError>` 指向同一张静态默认图（优先现有 `/logo192.png`）。须避免 onError 再失败导致死循环。

## 5. 主人与兼容

| 职责 | 主人 |
|---|---|
| 占位图、MIME、缓存读、下载校验 | `service/image.go` + 现有 `database` img 函数 |
| `data:` 校验 | `service/tools.go` Add/Update |
| HTTP 适配 | 现有 `GetLogoImgHandler` / tool handlers；**不新路由** |
| URL 规范化与预览 | `ui/src/utils/check.ts`、`Tools.tsx`、`CardV2` |

`handler/` 禁止导入 `database`、禁止 SQL。MIME 不得再按 URL 后缀猜测。

**保持：** favicon API 模板、自动拉 favicon、相对路径 logo（`baidu.ico`）、导入导出/WebDAV（`data:` 随 `logo` 文本走）、公开 `/api/img` 不出网。

**副作用：** 含 `data:` 的工具会增大 `/api/` JSON 与备份体积；用 200KB 上限约束。历史坏缓存不强制删除，读时当未命中。

## 6. 验收

1. `GET /api/img?url=` 无参数 → 400 JSON  
2. 未缓存 `https://example.com/x.png` → 200，body 为 PNG（非 JSON、非禁止符 SVG）  
3. 未缓存 `.svg` URL → 200 默认 PNG  
4. 已缓存真实 PNG（如 favicon.im 百度）→ 200，`Content-Type: image/png`  
5. 上传 ≤200KB PNG 并保存 → `logo` 为 `data:image/png;base64,...`，首页卡片显示该图  
6. 上传 SVG 或 >200KB → 前端拒绝；绕过 API 则 400 且库不更新  
7. 管理列表带 `?larger=true` 的 URL 仍能出图  
8. `./assert_architecture.sh` 通过  

## 7. 实现形态（已选 A）

就地修现有文件，不抽 `service/logo.go`，不以纯前端 `onError` 代替后端合同修复。

## 附录：工作草稿

**TaskIntentDraft**
- 结果：坏远程 logo 显示统一默认图；管理员可为单个工具上传 png/jpeg/webp/ico（≤200KB）到现有 `logo` 的 `data:`
- 非目标：见第 2 节
- 风险：占位 base64 损坏、HTML 已入缓存、公开 GET 若出网会变成开放代理

**BaselineReadSetHint**
- `service/image.go`、`handler.GetLogoImgHandler`、`utils.GetImgBase64FromUrl`、`service/tools.go`、`ui/src/utils/check.ts`、`ui/src/pages/admin/tabs/Tools.tsx`、`ui/src/components/CardV2/index.tsx`、`nav_table.logo`、`nav_img`

**ImpactStatementDraft**
- 层：handler / service / database（现有）/ ui
- 不变量：三层单向依赖；公开 `/api/img` 不出网；无新持久化主人
- 兼容：现有 http logo 与导入导出继续可用
- 非目标：见第 2 节
