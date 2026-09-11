# 实现计划：工具 Logo 上传与 `/api/img` 失败回退

Goal: 远程 Logo 缓存未命中/坏数据时，`GET /api/img` 返回 200 默认 PNG；管理员可为单个工具上传 png/jpeg/webp/ico（≤200KB）写入现有 `nav_table.logo` 的 `data:`。  
Architecture: `handler/` → `service/` → `database/`。图片合同主人是 `service/image.go`；`data:` 校验主人是 `service/tools.go`。不新路由、不新表、不新文件目录。  
Tech Stack: Go 1.25 + Gin + SQLite；React 18 + Ant Design 5；测试口 `51738`。  
Baseline/Authority Refs: `docs/aegis/specs/2026-09-11-logo-upload-and-img-fallback-brief.md`；`ARCH_CONTRACT.md`；`AGENTS.md`。  
Compatibility Boundary: 现有 http(s) Logo URL、favicon API、相对路径 logo、导入导出/WebDAV 继续可用。公开 `GET /api/img` **不出网**。无 SVG 上传、无 multipart 新接口。历史坏缓存读时跳过，不强制清库。  
TDD Route:
- Mode: off
- Decision: skipped
- Strict authority: not applicable
- Strict signals: 行为/合同变化存在，但用户/项目未要求 strict TDD
- Light eligibility: 否
- TDD-fit exception: 无
- Test posture: post-change regression（Go 表测试 + curl 51738 + 架构脚本）
- Reason: 项目 TDD 默认 off；不把 RED/GREEN 写成任务步骤
- Verification: 见各 Task 与文末总验收

Execution context: 复用当前 `master` 工作区。工作区已有无关脏文件（`assert_architecture.sh`、`handler/handlers.go`、`service/auth.go`）——**本计划不得把它们塞进本功能提交**。

---

Aegis Visibility: `/api/img` 是公开合同，占位/MIME/下载校验必须收口在 `service/image.go`，否则会继续在 1590 行 handler 里猜后缀。

Plan Basis: 已批准 Spec Brief `docs/aegis/specs/2026-09-11-logo-upload-and-img-fallback-brief.md`。

BaselineUsageDraft:
- Required baseline refs: Spec Brief；`service/image.go`；`handler.GetLogoImgHandler`；`utils.GetImgBase64FromUrl`；`service/tools.go`；`ui/src/utils/check.ts`；`Tools.tsx`；`CardV2`
- Delivered context refs: 无
- Acknowledged before plan refs: Spec Brief 第 2–6 节；本地复现（PNG 占位缺 padding → 500）
- Cited in plan refs: 同上
- Missing refs: 无
- Decision: continue

Requirement Ready Check:
- Requirement source refs: issue #8 + Spec Brief
- Goals and scope refs: Brief §1–2
- User / scenario refs: 工具管理员上传；前台卡片失败回退
- Requirement item refs: Brief §4
- Acceptance / verification criteria refs: Brief §6
- Open blocker questions: 无
- Decision: ready

Files:
- 改：`utils/utils.go`、`service/image.go`、`handler/handlers.go`（仅 `GetLogoImgHandler`）、`service/tools.go`、`service/image_test.go`（新建）、`service/tools_logo_test.go`（新建）、`ui/src/utils/check.ts`、`ui/src/components/CardV2/index.tsx`、`ui/src/pages/admin/tabs/Tools.tsx`、`ui/src/i18n/zh-CN.ts`、`ui/src/i18n/en-US.ts`
- 不改：`database/` schema、`main.go` 路由、搜索引擎/站点设置表单

Compatibility: 公开 `/api/img` 缺 url 仍 400 JSON；有 url 改为始终 200 图片（行为收紧失败态，成功路径兼容）。`data:` 对 `getLogoUrl` 已是直出。

Change Necessity:
- User-visible need: 破图/500 JSON；无法上传自定义工具图标
- No-change / non-code option: 无；占位损坏与缺上传入口都在代码里
- Why code change is necessary: 合同与校验在 service/handler/UI
- Minimum change boundary: 上列 Files
- Decision: code-change

Existence Check:
- Proposed new surface: 无新表/路由/磁盘
- Existing owner / reuse candidate: `nav_table.logo`、`GET /api/img`、Add/Update tool
- Why existing surface is insufficient: 占位损坏、下载不校验、Add/Update 不拦 `data:`、管理表未编码
- Creation proof: 不新增主人
- Entropy / retirement impact: 删除损坏 PNG/SVG 双占位，改为单一默认 PNG
- Decision: reuse-existing

Architecture Integrity Lens:
- Invariant: handler 不碰 database；公开 GET 不出网
- Canonical owner: 图片字节/MIME → `service/image.go`；`data:` 合法性 → `service/tools.go`
- Responsibility overlap: handler 去掉后缀猜 MIME
- Higher-level simplification: 不抽 `service/logo.go`（Brief §7）
- Retirement / falsifier: 禁止符 SVG 占位不再返回；若 `.svg` 未命中仍返回 SVG 则失败
- Verdict: 就地修现有主人

Plan Pressure Test:
- Owner / contract / retirement: 清晰
- Architecture integrity / higher-level path: 不新文件
- Verification scope: 单元 + curl + 架构脚本
- Task executability: 可复制代码
- Pressure result: proceed

Complexity Budget:
- Artifact class: handler/service 核心路径
- Target files: `handler/handlers.go`（1590 行，**只改 GetLogoImgHandler**）、`service/image.go`、`service/tools.go`、`Tools.tsx`
- Current pressure: handlers.go 已超大
- Projected post-change pressure: handler 行数应下降（删后缀分支）；image.go 增加有界辅助函数
- Budget result: at-risk（handlers.go）
- Planned governance: 禁止整文件重写 handlers.go；用精确补丁只改 GetLogoImgHandler

Plan-Time Complexity Check:
- Target files: 见上
- Existing size / shape signals: handlers.go 1590 行
- Owner fit: MIME 从 handler 收回 service
- Add-in-place risk: 勿在 handler 再堆校验
- Better file boundary: 校验函数放 `service/image.go` / `service/tools.go`
- Recommendation: edit-in-place（handler 只变薄）

Execution Readiness View:
- Intent Lock: issue #8 = 失败默认图 + 工具 Logo 上传（data:）
- Scope Fence: 不做搜索引擎/站点上传、不做公开代理、不做 SVG 上传
- Baseline Lock: Spec Brief 2026-09-11
- Approved Behavior: Brief §4
- Owner / Contract Constraints: 三层架构；`GET /api/img` 只读
- Compatibility Boundary: 见文首
- Retirement Boundary: 双占位（坏 PNG + 禁止符 SVG）退役为单一默认 PNG；读时跳过非图片缓存
- Task Batches: T1 图片合同 → T2 data: 校验 → T3 前端上传与预览 → T4 51738 总验收
- Test Obligations: `go test` 相关包；curl 验收 1–4、6；UI 构建部署后看 5、7
- Review Gates: 每 Task 验证后再提交；不要混入无关脏文件
- Drift / Rewind Rules: 偏离 Brief 立刻停；`git revert` 对应提交
- Evidence Required Before Completion: Brief §6 八条 + `./assert_architecture.sh`
- Advisory Boundary: 本计划不是完成授权

Repair Track（T1）: 根因是占位 base64 缺 padding + MIME 按后缀猜 + 下载不校验；主人 `service/image.go` / `utils.GetImgBase64FromUrl`。  
Retirement Track: 禁止符 SVG 占位与损坏 PNG 占位删除；无兼容保留价值。HTML 缓存行不删除，读路径当未命中。

---

## 共享常量（全任务必须一致）

默认 PNG（32×32 灰，102 字节，base64 长度 136，`len%4==0`）：

```
iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAALUlEQVR42u3OIQEAAAwCMPono9UfAzMxv7S9pQgICAgICAgICAgICAgICKwDD9YGXMTFGcCDAAAAAElFTkSuQmCC
```

解码后 magic：`89 50 4E 47 0D 0A 1A 0A`。

前端 `onError` 回退：`/logo192.png`（已存在于 `public/` / CRA public）。若 `src` 已经是该路径则不再改，避免死循环。

`data:` 上限：解码后 **200 * 1024** 字节。

Go 测试工作目录是包目录，但 `database.InitDB` 写 `./data`。本仓库已有测试会碰真实 `data/nav.db`。**新增测试禁止 `InitDB`、禁止连真实库**。T1/T2 测试只测纯函数。

Go 命令前缀（每条验证都要带）：

```bash
export GOPATH="$PWD/.cache/gopath" GOCACHE="$PWD/.cache/go-build"
```

---

## Task 1 — 图片合同：占位、MIME、下载校验、handler 变薄

Files:
- modify: `utils/utils.go`
- modify: `service/image.go`
- modify: `handler/handlers.go`（仅 `GetLogoImgHandler`）
- create: `service/image_test.go`

Why: 未命中不再 500 JSON / 禁止符 SVG；缓存 HTML 不再当图吐出。  
Change Necessity: 占位与解码在代码里坏了，文档改不了运行时。  
Impact/Compatibility: 缺 url 仍 400；有 url 改为始终 200 图片。  
Verification: `go test ./service ./utils`；curl 未缓存 URL。

### Step 1 — 在 `utils/utils.go` 增加魔数检测，并让下载函数拒绝非 2xx / 非图

在 `GetImgBase64FromUrl` 之前加入（若已有同名函数则复用，不要重复）：

```go
func DetectImageMIME(data []byte) string {
	if len(data) >= 8 && data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47 {
		return "image/png"
	}
	if len(data) >= 3 && data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF {
		return "image/jpeg"
	}
	if len(data) >= 12 && string(data[0:4]) == "RIFF" && string(data[8:12]) == "WEBP" {
		return "image/webp"
	}
	if len(data) >= 6 && (string(data[0:6]) == "GIF87a" || string(data[0:6]) == "GIF89a") {
		return "image/gif"
	}
	if len(data) >= 4 && data[0] == 0x00 && data[1] == 0x00 && (data[2] == 0x01 || data[2] == 0x02) && data[3] == 0x00 {
		return "image/x-icon"
	}
	head := data
	if len(head) > 256 {
		head = head[:256]
	}
	s := strings.TrimSpace(string(head))
	if strings.HasPrefix(s, "<svg") || strings.Contains(s, "<svg") {
		return "image/svg+xml"
	}
	return ""
}
```

改 `GetImgBase64FromUrl`：在 `defer res.Body.Close()` 之后立刻：

```go
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		logger.LogError("图片下载状态码异常: %s %d", url, res.StatusCode)
		return ""
	}
```

读完 `data` 后、做 base64 之前：

```go
	if DetectImageMIME(data) == "" {
		logger.LogError("远端内容不是图片: %s", url)
		return ""
	}
```

`GetMIME`（按后缀）可保留给其它调用方；本切片 `/api/img` 不再用它。

### Step 2 — 重写 `service/image.go` 的占位与 `GetImgFromDB`

删除 `nullImg` 的超长 SVG/PNG 字符串。改为：

```go
const defaultLogoPNGBase64 = "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAALUlEQVR42u3OIQEAAAwCMPono9UfAzMxv7S9pQgICAgICAgICAgICAgICKwDD9YGXMTFGcCDAAAAAElFTkSuQmCC"

func DefaultLogoPNG() []byte {
	b, err := base64.StdEncoding.DecodeString(defaultLogoPNGBase64)
	if err != nil {
		return []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}
	}
	return b
}

func ImageBytesFromCacheValue(value string) (body []byte, mime string, ok bool) {
	if value == "" {
		return nil, "", false
	}
	raw, err := base64.StdEncoding.DecodeString(value)
	if err != nil {
		raw, err = base64.StdEncoding.DecodeString(value + strings.Repeat("=", (4-len(value)%4)%4))
		if err != nil {
			return nil, "", false
		}
	}
	mime = utils.DetectImageMIME(raw)
	if mime == "" {
		return nil, "", false
	}
	return raw, mime, true
}
```

`GetImgFromDB` 保持现有「查库 / 未命中」结构，但未命中时返回：

```go
	return types.Img{Id: 0, Url: url1, Value: defaultLogoPNGBase64}, nil
```

命中后不要在 service 里因坏数据再造禁止符。handler 用 `ImageBytesFromCacheValue`；失败则吐 `DefaultLogoPNG()`。

`service/image.go` 需增加 import：`"encoding/base64"`（已有 `utils`）。

### Step 3 — 改 `GetLogoImgHandler`（精确补丁，禁止整文件重写）

用这段**完整替换**现有 `GetLogoImgHandler`（约 L225–271）：

```go
func GetLogoImgHandler(c *gin.Context) {
	url := c.Query("url")
	if url == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": "URL参数不能为空",
		})
		return
	}
	img, err := service.GetImgFromDB(url)
	if err != nil {
		c.Data(http.StatusOK, "image/png", service.DefaultLogoPNG())
		return
	}
	body, mime, ok := service.ImageBytesFromCacheValue(img.Value)
	if !ok {
		c.Data(http.StatusOK, "image/png", service.DefaultLogoPNG())
		return
	}
	c.Data(http.StatusOK, mime, body)
}
```

删除该函数内所有 `strings.Split(url, ".")` / suffix MIME / `图片解码失败` JSON。handler 顶部若因此不再需要某个 import **不要顺手大扫除**；未使用 import 才允许删（`go build` 会报）。本函数不再自己 `base64` 解码，若文件内其它函数仍用 `encoding/base64` 则保留 import。

### Step 4 — `service/image_test.go`（纯函数，不碰 DB）

```go
package service

import (
	"bytes"
	"encoding/base64"
	"testing"

	"github.com/mereith/nav/utils"
)

func TestDefaultLogoPNGIsPNG(t *testing.T) {
	b := DefaultLogoPNG()
	if utils.DetectImageMIME(b) != "image/png" {
		t.Fatalf("default logo mime=%q len=%d", utils.DetectImageMIME(b), len(b))
	}
}

func TestImageBytesFromCacheValueRejectsHTML(t *testing.T) {
	html := base64.StdEncoding.EncodeToString([]byte("<!doctype html><html></html>"))
	if _, _, ok := ImageBytesFromCacheValue(html); ok {
		t.Fatal("html must not be treated as image")
	}
}

func TestImageBytesFromCacheValueAcceptsPNG(t *testing.T) {
	body, mime, ok := ImageBytesFromCacheValue(defaultLogoPNGBase64)
	if !ok || mime != "image/png" || !bytes.Equal(body, DefaultLogoPNG()) {
		t.Fatalf("ok=%v mime=%s", ok, mime)
	}
}

func TestDetectImageMIMEJPEG(t *testing.T) {
	if utils.DetectImageMIME([]byte{0xFF, 0xD8, 0xFF, 0xE0}) != "image/jpeg" {
		t.Fatal("jpeg magic")
	}
}
```

### Step 5 — 验证 Task 1

```bash
cd /workspace/van-nav
export GOPATH="$PWD/.cache/gopath" GOCACHE="$PWD/.cache/go-build"
GOTOOLCHAIN=auto go test ./service ./utils
./assert_architecture.sh
```

期望：测试 PASS；架构脚本通过。

然后只编后端并重启（本 Task 无前端）：

```bash
./restart-test.sh
python3 - <<'PY'
import urllib.parse, subprocess, os
def probe(label, url):
    q = urllib.parse.quote(url, safe='') if url else ''
    target = 'http://127.0.0.1:51738/api/img' + (('?url='+q) if url is not None else '')
    p = subprocess.run(['curl','-sS','-D','-','-o','/tmp/img.bin','--max-time','5', target], capture_output=True, text=True)
    status=ctype=None
    for line in p.stdout.splitlines():
        if line.startswith('HTTP/'): status=line.split()[1]
        if line.lower().startswith('content-type:'): ctype=line.split(':',1)[1].strip()
    magic=open('/tmp/img.bin','rb').read(16)
    print(label, 'status', status, 'ctype', ctype, 'size', os.path.getsize('/tmp/img.bin'), 'magic', magic[:8])
probe('no-param', None)
probe('empty', '')
probe('miss-png', 'https://example.com/no-such.png')
probe('miss-svg', 'https://example.com/no-such.svg')
probe('cached-baidu', 'https://favicon.im/www.baidu.com?larger=true')
PY
```

期望：
- no-param / empty：400 JSON
- miss-png / miss-svg：200，`image/png`，magic `\\x89PNG`
- cached-baidu：200，`image/png`（若库内确为 PNG），magic `\\x89PNG`

提交（仅本 Task 文件）：

```bash
git add utils/utils.go service/image.go service/image_test.go handler/handlers.go
git commit -m "修复: /api/img 失败回退默认 PNG / fix: default PNG fallback for /api/img"
```

不要 `git add` 无关脏文件。

---

## Task 2 — `data:` Logo 服务端校验

Files:
- modify: `service/tools.go`
- create: `service/tools_logo_test.go`

Why: 上传最终写入现有 JSON 字段，必须在 Add/Update 拦 SVG/超大/假图。  
Change Necessity: 只改 UI 可被绕过。  
Impact/Compatibility: 空 logo、http(s)、相对路径（`baidu.ico`）原样通过。非法 `data:` 返回 error，handler 已把 `AddTool` 错误映射为 400。**必须同时改 `UpdateToolHandler`：当前忽略 `UpdateTool` 返回值，非法 logo 会假成功。** 这是本 Task 的契约修复，仍只改 handler 里 UpdateTool 的错误处理几行。  
Verification: `go test ./service`；curl 需登录，Task 4 再打 API；本 Task 以单测为主。

### Step 1 — `service/tools.go` 增加校验并在 Add/Update 调用

```go
func ValidateToolLogo(logo string) error {
	if logo == "" {
		return nil
	}
	if !strings.HasPrefix(logo, "data:") {
		return nil
	}
	if !strings.HasPrefix(logo, "data:image/") {
		return fmt.Errorf("不支持的 Logo 数据格式")
	}
	header, payload, ok := strings.Cut(logo[len("data:"):], ",")
	if !ok || payload == "" {
		return fmt.Errorf("Logo 数据为空")
	}
	mime := strings.TrimSpace(strings.Split(header, ";")[0])
	switch mime {
	case "image/png", "image/jpeg", "image/jpg", "image/webp", "image/x-icon", "image/vnd.microsoft.icon":
	default:
		return fmt.Errorf("仅支持 png/jpeg/webp/ico 格式的 Logo")
	}
	raw, err := base64.StdEncoding.DecodeString(payload)
	if err != nil {
		return fmt.Errorf("Logo 数据解码失败")
	}
	if len(raw) > 200*1024 {
		return fmt.Errorf("Logo 大小不能超过 200KB")
	}
	got := utils.DetectImageMIME(raw)
	if got == "" {
		return fmt.Errorf("Logo 不是有效图片")
	}
	if mime == "image/jpg" {
		mime = "image/jpeg"
	}
	if mime == "image/vnd.microsoft.icon" {
		mime = "image/x-icon"
	}
	if got == "image/x-icon" && mime == "image/x-icon" {
		return nil
	}
	if got != mime {
		return fmt.Errorf("Logo 类型与内容不一致")
	}
	return nil
}
```

import 增加：`"fmt"` `"strings"` `"encoding/base64"` `"github.com/mereith/nav/utils"`。

`AddTool`：在 `addToolMutex` 锁定后、`InsertToolRow` 前：

```go
	if err := ValidateToolLogo(data.Logo); err != nil {
		return 0, err
	}
```

`UpdateTool`：在 `UpdateToolRow` 前同样调用。

`UpdateImg` 仅在 `data.Logo != "" && !strings.HasPrefix(data.Logo, "data:")` 时 `go UpdateImg`。`data:` 不写 `nav_img`。

`ImportTools`：非法 `data:` 的工具计 `skipped`，不要插入。循环内 `InsertToolRow` 前：

```go
		if err := ValidateToolLogo(v.Logo); err != nil {
			skipped++
			continue
		}
```

### Step 2 — 修 `UpdateToolHandler` 错误传播（精确补丁）

把：

```go
	service.UpdateTool(data)
```

改为：

```go
	if err := service.UpdateTool(data); err != nil {
		utils.CheckErr(err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}
```

不要改该函数其它逻辑（空 logo 仍 LazyFetch）。

### Step 3 — `service/tools_logo_test.go`

```go
package service

import (
	"encoding/base64"
	"testing"
)

func TestValidateToolLogoEmptyAndHTTP(t *testing.T) {
	if err := ValidateToolLogo(""); err != nil {
		t.Fatal(err)
	}
	if err := ValidateToolLogo("https://example.com/a.png"); err != nil {
		t.Fatal(err)
	}
	if err := ValidateToolLogo("baidu.ico"); err != nil {
		t.Fatal(err)
	}
}

func TestValidateToolLogoAcceptsPNG(t *testing.T) {
	logo := "data:image/png;base64," + defaultLogoPNGBase64
	if err := ValidateToolLogo(logo); err != nil {
		t.Fatal(err)
	}
}

func TestValidateToolLogoRejectsSVGAndOversize(t *testing.T) {
	svg := "data:image/svg+xml;base64," + base64.StdEncoding.EncodeToString([]byte("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))
	if err := ValidateToolLogo(svg); err == nil {
		t.Fatal("svg must fail")
	}
	big := "data:image/png;base64," + base64.StdEncoding.EncodeToString(make([]byte, 200*1024+1))
	if err := ValidateToolLogo(big); err == nil {
		t.Fatal("oversize must fail")
	}
	if err := ValidateToolLogo("data:text/plain;base64,QQ=="); err == nil {
		t.Fatal("non-image data must fail")
	}
}

func TestValidateToolLogoRejectsHTMLPretendingPNG(t *testing.T) {
	html := "data:image/png;base64," + base64.StdEncoding.EncodeToString([]byte("<html>x</html>"))
	if err := ValidateToolLogo(html); err == nil {
		t.Fatal("html-as-png must fail")
	}
}

func TestValidateToolLogoRejectsEmptyPayload(t *testing.T) {
	if err := ValidateToolLogo("data:image/png;base64,"); err == nil {
		t.Fatal("empty payload")
	}
}

func TestDefaultPNGUnderLimit(t *testing.T) {
	if len(DefaultLogoPNG()) > 200*1024 {
		t.Fatal("default png unexpectedly large")
	}
}
```

`tools_logo_test.go` 不要 import 未使用的 `strings`。

### Step 4 — 验证并提交

```bash
export GOPATH="$PWD/.cache/gopath" GOCACHE="$PWD/.cache/go-build"
GOTOOLCHAIN=auto go test ./service
./assert_architecture.sh
```

```bash
git add service/tools.go service/tools_logo_test.go handler/handlers.go
git commit -m "安全: 校验工具 Logo 的 data URI / security: validate tool logo data URIs"
```

---

## Task 3 — 前端：上传、编码、onError

Files:
- modify: `ui/src/utils/check.ts`
- modify: `ui/src/components/CardV2/index.tsx`
- modify: `ui/src/pages/admin/tabs/Tools.tsx`
- modify: `ui/src/i18n/zh-CN.ts`
- modify: `ui/src/i18n/en-US.ts`

Why: 用户可在现有 Logo 框旁选文件；管理列表不再截断 `?larger=true`。  
Change Necessity: 无上传 UI 则 Brief §4.2 不成立。  
Impact/Compatibility: 自动拉 favicon 按钮保留。  
Verification: `pnpm` 构建；TypeScript 编译过。

### Step 1 — `check.ts`

保留现有 `getLogoUrl`。追加：

```ts
export const DEFAULT_LOGO_SRC = "/logo192.png";
export const LOGO_MAX_BYTES = 200 * 1024;
const LOGO_FILE_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/x-icon", "image/vnd.microsoft.icon"]);

export const handleLogoImgError = (e: { currentTarget: HTMLImageElement }) => {
  const el = e.currentTarget;
  if (el.dataset.fallback === "1") return;
  el.dataset.fallback = "1";
  el.src = DEFAULT_LOGO_SRC;
};

export const fileToLogoDataURI = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.size > LOGO_MAX_BYTES) {
      reject(new Error("too-large"));
      return;
    }
    if (file.type && !LOGO_FILE_MIME.has(file.type) && file.type !== "image/jpg") {
      reject(new Error("bad-type"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      if (!result.startsWith("data:image/")) {
        reject(new Error("bad-type"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });
};
```

Safari 上 `.ico` 可能 `file.type === ""`：若 type 为空，仍允许读取，交给后端魔数校验。把 type 检查改成：

```ts
    if (file.type && !LOGO_FILE_MIME.has(file.type) && file.type !== "image/jpg") {
```

（已包含。）空 type 放行。

### Step 2 — `CardV2`

```tsx
import { getLogoUrl, handleLogoImgError } from "../../utils/check";
```

img：

```tsx
            <img 
              src={imageSrc}
              alt={title}
              loading="lazy"
              decoding="async"
              onError={handleLogoImgError}
            />
```

### Step 3 — i18n

`zh-CN.ts` 在 `admin.tools.form.logoPlaceholder` 后加：

```ts
  "admin.tools.form.logoUpload": "上传图标",
  "admin.tools.form.logoUploadHint": "png/jpeg/webp/ico，最大 200KB",
  "admin.tools.msg.logoTooLarge": "图标不能超过 200KB",
  "admin.tools.msg.logoBadType": "仅支持 png/jpeg/webp/ico",
  "admin.tools.msg.logoReadFailed": "读取图标失败",
```

`en-US.ts` 对应：

```ts
  "admin.tools.form.logoUpload": "Upload icon",
  "admin.tools.form.logoUploadHint": "png/jpeg/webp/ico, max 200KB",
  "admin.tools.msg.logoTooLarge": "Icon must be 200KB or smaller",
  "admin.tools.msg.logoBadType": "Only png/jpeg/webp/ico are supported",
  "admin.tools.msg.logoReadFailed": "Failed to read icon",
```

### Step 4 — `Tools.tsx`

顶部 import 增加 `UploadOutlined`（与现有 `@ant-design/icons` 合并），以及：

```ts
import { getLogoUrl, handleLogoImgError, fileToLogoDataURI } from "../../../utils/check";
```

在 `handleGetFavicon` 旁增加：

```ts
  const applyLogoFile = async (form: any, file: File) => {
    try {
      const dataUri = await fileToLogoDataURI(file);
      form.setFieldsValue({ logo: dataUri });
    } catch (e: any) {
      if (e?.message === "too-large") message.error(t("admin.tools.msg.logoTooLarge"));
      else if (e?.message === "bad-type") message.error(t("admin.tools.msg.logoBadType"));
      else message.error(t("admin.tools.msg.logoReadFailed"));
    }
    return false;
  };
```

管理列表 img（约 L683–689）改为：

```tsx
                        <img
                          src={getLogoUrl(record.logo)}
                          width={32}
                          height={32}
                          loading="lazy"
                          style={{ objectFit: 'cover' }}
                          onError={handleLogoImgError}
                        ></img>
```

新增与编辑两个 `Form.Item name="logo"` **后面**各加一块（不要拆掉原 Input + 自动 favicon）：

```tsx
            <Form.Item label={t("admin.tools.form.logoUpload")} labelCol={{ span: 4 }}>
              <Upload
                accept="image/png,image/jpeg,image/webp,image/x-icon,.png,.jpg,.jpeg,.webp,.ico"
                showUploadList={false}
                maxCount={1}
                beforeUpload={(file) => applyLogoFile(addForm, file)}
              >
                <Button icon={<UploadOutlined />}>{t("admin.tools.form.logoUpload")}</Button>
              </Upload>
              <div style={{ color: "rgba(0,0,0,0.45)", marginTop: 4 }}>
                {t("admin.tools.form.logoUploadHint")}
              </div>
            </Form.Item>
```

编辑表单把 `addForm` 换成 `updateForm`。

`Tools.tsx` 已 import `Upload`，复用即可。JSON 导入那个 `Upload` 不要改。

### Step 5 — 构建并提交

```bash
cd /workspace/van-nav/ui && pnpm run build && cd ..
rm -rf public/static public/index.html && cp -r ui/build/* public/
```

期望：`pnpm run build` 成功，无 TS 错误。

```bash
git add ui/src/utils/check.ts ui/src/components/CardV2/index.tsx ui/src/pages/admin/tabs/Tools.tsx ui/src/i18n/zh-CN.ts ui/src/i18n/en-US.ts
# public/ 被 gitignore，不要强加
git commit -m "功能: 工具表单支持上传 Logo / feat: allow uploading tool logos"
```

---

## Task 4 — 编译、重启 51738、Brief §6 总验收

Files: 无新逻辑；嵌入 `public/` 后重编 Go。

Why: 前端改动必须进二进制。  
Verification: Brief 八条。

```bash
cd /workspace/van-nav
./assert_architecture.sh
# 若 Task 3 已复制 public/，直接：
./restart-test.sh
```

curl 清单（对应 Brief 1–4、7 的后端部分）：

```bash
python3 - <<'PY'
import urllib.parse, subprocess, os, json
base='http://127.0.0.1:51738'
def headers_body(url):
    p=subprocess.run(['curl','-sS','-D','-','-o','/tmp/img.bin','--max-time','5', url], capture_output=True, text=True)
    status=ctype=None
    for line in p.stdout.splitlines():
        if line.startswith('HTTP/'): status=line.split()[1]
        if line.lower().startswith('content-type:'): ctype=line.split(':',1)[1].strip()
    body=open('/tmp/img.bin','rb').read()
    return status, ctype, body

s,c,b=headers_body(base+'/api/img')
assert s=='400' and b.startswith(b'{'), (s,b[:80])
print('1 ok empty param')

for label,u in [('2 png','https://example.com/x.png'),('3 svg','https://example.com/x.svg')]:
    s,c,b=headers_body(base+'/api/img?url='+urllib.parse.quote(u, safe=''))
    assert s=='200' and c.startswith('image/png') and b[:8]==b'\x89PNG\r\n\x1a\n', (label,s,c,b[:20])
    print(label,'ok')

s,c,b=headers_body(base+'/api/img?url='+urllib.parse.quote('https://favicon.im/www.baidu.com?larger=true', safe=''))
assert s=='200' and b[:8]==b'\x89PNG\r\n\x1a\n' and 'png' in c, (s,c,b[:16])
print('4 ok cached png ctype', c)

s,c,b=headers_body(base+'/api/img?url='+urllib.parse.quote('https://favicon.im/www.baidu.com?larger=true', safe=''))
print('7 encoded query ok', s, c)
print('version', subprocess.check_output(['curl','-sS',base+'/api/'], text=True)[:80])
PY
```

`data:` 拒绝（Brief 6）用本地单测已覆盖；可选登录后 POST。不要把 JWT 打印到聊天。

首页 `http://127.0.0.1:51738/`：卡片图标仍在。管理页上传 PNG 保存后 `logo` 以 `data:image/png;base64,` 开头（Brief 5）——需架构师在浏览器点一次；AI 用 `browser_open` 打开测试口辅助。

声称完成前贴上：`go test ./service ./utils` 输出、`./assert_architecture.sh` 输出、上述 python 断言输出、`curl /api/` 的 `deploymentVersion`。

本 Task 若只有 `public/` 与二进制变化：`public/` 与 `van-nav` 均 gitignore，**不要提交二进制**。若 Task 3 已提交前端源码，本 Task 可以没有新 commit。

---

## 风险与回滚

- `UpdateToolHandler` 以前吞掉错误；修好后非法 logo 会 400。这是预期。
- 默认 PNG 仅 32×32 灰块，不是品牌 logo；足够当失败占位。
- 导入 JSON 含非法 `data:` 会 skip 该条；比写入坏数据更安全。
- 回滚：`git revert` Task 1–3 对应提交；重启 `./restart-test.sh`。

## 执行路由

Execution Route:
- Decision: inline
- Evidence: 任务共享 `service.DefaultLogoPNG` / `ValidateToolLogo` / handler 同一函数，顺序依赖强，不适合并行子代理
- Fallback: 无
- User confirmation required: no
