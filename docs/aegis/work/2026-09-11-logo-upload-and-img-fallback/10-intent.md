# 工具 Logo 上传与 /api/img 失败回退 - Intent

## TaskIntentDraft

- Requested outcome: 远程 Logo 失败返回 200 默认 PNG；管理员可为工具上传 png/jpeg/webp/ico 到 logo data URI
- Goal: 落地 Spec Brief 与实现计划：/api/img 回退 + 工具 Logo 上传
- Success evidence:
- Brief 第6节八条验收 + assert_architecture.sh + go test ./service ./utils
- Stop condition: 八条验收通过则为 done；公开代理/新表/SVG 上传为 scope-exceeded；测试口或校验反复失败为 blocked；缺浏览器上传证据为 needs-verification
- Non-goals:
- 搜索引擎/站点 logo 上传
- multipart 新接口或磁盘 logos
- SVG 上传或公开代理任意 URL
- Scope: 复用 nav_table.logo、GET /api/img、Add/Update tool；不新表不新路由不公开出网
- Change kinds:
- contract
- bugfix
- feature
- Risk hints:
- 公开 /api/img 合同变化（失败改 200 图片）
- handler/handlers.go 已超大且工作区有无关脏改动

## BaselineReadSetHint

- docs/aegis/specs/2026-09-11-logo-upload-and-img-fallback-brief.md
- docs/aegis/plans/2026-09-11-logo-upload-and-img-fallback.md
- ARCH_CONTRACT.md

## BaselineUsageDraft

- Required baseline refs:
- docs/aegis/specs/2026-09-11-logo-upload-and-img-fallback-brief.md
- docs/aegis/plans/2026-09-11-logo-upload-and-img-fallback.md
- ARCH_CONTRACT.md
- Acknowledged before plan:
- none
- Cited in plan:
- none
- Missing refs:
- docs/aegis/specs/2026-09-11-logo-upload-and-img-fallback-brief.md
- docs/aegis/plans/2026-09-11-logo-upload-and-img-fallback.md
- ARCH_CONTRACT.md
- Advisory decision: needs-baseline-readback

## ImpactStatementDraft

- Compatibility boundary: http(s) logo、favicon API、相对路径、导入导出保持；缺 url 仍 400
- Affected layers:
- handler
- service
- ui
- Owners:
- service/image.go
- service/tools.go
- Invariants:
- handler 不导入 database
- 公开 GET /api/img 不出网
- Non-goals:
- 搜索引擎/站点 logo 上传
- multipart 新接口或磁盘 logos
- SVG 上传或公开代理任意 URL

These records are Method Pack drafts / hints, not authoritative runtime decisions.
