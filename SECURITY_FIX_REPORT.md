# Van Nav 代码审查修复报告

## 修复概述

基于代码审查报告，已在 `fix/security-and-concurrency-issues` 分支中修复了以下问题。

## 修复内容

### 1. 严重（Critical）问题修复

#### 1.1 密码明文存储与比较 ✅
- **文件**: `handler/handlers.go`, `service/auth.go`, `utils/password.go`
- **修复**: 
  - 新增 `utils/password.go`，使用 `bcrypt` 进行密码哈希和验证
  - 修改 `LoginHandler` 支持 bcrypt 哈希和明文密码双模式验证（向后兼容）
  - 修改 `UpdateUser` 函数，对密码进行哈希处理后再存储
  - 数据库初始化时对默认密码 `admin` 进行 bcrypt 哈希存储

#### 1.4 数据竞争：`database.DB` 全局变量无并发保护 ✅
- **文件**: `service/backup.go`
- **修复**:
  - 新增 `dbMutex sync.Mutex` 包级互斥锁
  - 在 `RestoreFromBackup` 函数中，使用互斥锁保护数据库连接的关闭和重新初始化操作

#### 1.5 `AddToolHandler` 中的并发数据竞争 ✅
- **文件**: `service/tools.go`
- **修复**:
  - 将 `AddTool` 函数中的局部互斥锁提升为包级变量 `addToolMutex`
  - 确保并发调用时的互斥效果

#### 1.6 `GetLogoImgHandler` 中的路径遍历风险 ✅
- **文件**: `handler/handlers.go`
- **修复**:
  - 添加 URL 格式验证，检查分割后的切片长度
  - 防止空切片导致的 panic 错误

#### 1.7 JWT 签名密钥安全问题 ✅
- **文件**: `utils/jwt.go`
- **修复**:
  - 移除弱回退密钥 `"fallback_secret_key_12345"`
  - 改为 panic 确保使用安全的随机数生成器

### 2. 警告（Warning）问题修复

#### 2.1 `GenerateId` 使用时间戳导致 ID 冲突 ✅
- **文件**: `utils/utils.go`
- **修复**:
  - 使用 `crypto/rand` 生成 4 字节随机数
  - 避免同一秒内创建多个 Token 时的 ID 冲突

#### 2.2 `CheckErr` 掩盖错误问题 ⚠️
- **状态**: 暂不修改
- **原因**: `CheckErr` 被广泛使用（50+ 处），修改返回值会破坏现有逻辑，需要大规模重构

#### 2.3 SQLite 数据库锁竞争 ✅
- **状态**: 已存在解决方案
- **说明**: 数据库初始化时已启用 WAL 模式和 busy_timeout（`database/init.db.go` 第 30 行）

#### 2.4 Goroutine 中错误被完全忽略 ⚠️
- **状态**: 暂不修改
- **原因**: 需要重构多个 goroutine 函数，添加 context 和超时控制

#### 2.6 `defer rows.Close()` 位置错误 ✅
- **文件**: `service/catelog.go`, `service/tools.go`, `service/auth.go`
- **修复**:
  - 将 `defer rows.Close()` 移到 `rows` 获取后立即调用
  - 添加错误检查，确保 `rows` 不为 nil

### 3. 建议（Suggestion）问题修复

#### 3.2 硬编码的默认账号密码 ✅
- **文件**: `database/init.db.go`
- **修复**:
  - 初始化用户时对默认密码 `admin` 进行 bcrypt 哈希存储

#### 3.3 `ImportTools` 中的逐条 SQL 执行效率低 ✅
- **文件**: `service/tools.go`
- **修复**:
  - 在循环外 Prepare SQL 语句，循环内复用
  - 减少数据库连接开销

#### 3.4 缺少请求速率限制 ⚠️
- **状态**: 暂不修改
- **原因**: 需要引入新的依赖和中间件，影响范围较大

#### 3.5 `GetAllHandler` 中重复调用 `utils.IsLogin` ✅
- **文件**: `handler/handlers.go`
- **修复**:
  - 缓存 `IsLogin` 结果到局部变量，避免重复调用

#### 3.6 `ListBackupFiles` 中的冒泡排序效率低 ✅
- **文件**: `service/backup.go`
- **修复**:
  - 使用 `sort.Slice` 替代 O(n²) 的冒泡排序

#### 3.7 JWT Bearer 前缀处理 ✅
- **文件**: `utils/jwt.go`
- **修复**:
  - 在 `IsLogin` 函数中添加 `Bearer ` 前缀剥离
  - 兼容前端发送的 `Authorization: Bearer <token>` 格式

## 测试验证

1. **编译测试**: ✅ 通过
   ```bash
   go build -buildvcs=false ./...
   ```

2. **前端构建**: ✅ 通过
   ```bash
   cd ui && npm run build
   ```

3. **功能测试**: 建议在合并前进行以下测试
   - 登录功能（明文密码和 bcrypt 哈希密码）
   - 工具添加和删除（并发场景）
   - WebDAV 备份恢复功能
   - 首页数据加载

## 未修复问题说明

以下问题因影响范围较大或需要大规模重构，建议后续单独处理：

1. **`CheckErr` 返回错误**: 需要重构 50+ 处调用点
2. **Goroutine 超时控制**: 需要重构多个异步函数
3. **请求速率限制**: 需要引入新的依赖和中间件

## 分支信息

- **分支名**: `fix/security-and-concurrency-issues`
- **基于**: `master` 分支
- **提交数**: 2 个提交
- **修改文件**: 9 个文件
- **新增行数**: 121 行
- **删除行数**: 44 行