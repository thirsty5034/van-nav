#!/bin/bash
# van-nav 编译期架构合规断路器 v2.1
# 检查范围：handler/ → database/、main.go → database.DB、service/ → database.DB
# 本环境适配：路径自适应 + workspace-scoped Go cache（DSH 沙箱要求）

set -u
ROOT="$(cd "$(dirname "$0")" && pwd)"
export GOPATH="$ROOT/.cache/gopath"
export GOCACHE="$ROOT/.cache/go-build"
mkdir -p "$GOPATH" "$GOCACHE"

EXIT_CODE=0

echo "🔍 [1/3] 扫描 handler/ 控制层是否存在私通 database/ 数据层的违规行为..."
HANDLER_VIOLATIONS=$(go list -f '{{.Dir}}: {{.Imports}}' "$ROOT/handler/..." 2>/dev/null | grep "github.com/mereith/nav/database")
if [ ! -z "$HANDLER_VIOLATIONS" ]; then
    echo -e "\n🚨 [严重架构违规] 以下 Handler 文件违法跨层导入了 database 包："
    echo "$HANDLER_VIOLATIONS"
    echo "❌ Handler 必须通过 service 层中转，禁止直接怼向数据库！"
    EXIT_CODE=1
else
    echo "✅ handler/ 隔离层干净，分层纪律达标。"
fi

echo ""
echo "🔍 [2/3] 扫描 main.go 入口层是否存在越级 database.DB 操作..."
MAIN_VIOLATIONS=$(grep -n 'database\.DB\.' "$ROOT/main.go" 2>/dev/null)
if [ ! -z "$MAIN_VIOLATIONS" ]; then
    echo -e "\n🚨 [架构违规] main.go 存在越级 DB 操作："
    echo "$MAIN_VIOLATIONS"
    echo "❌ main.go 应通过 service 层操作数据库，禁止直接引用 database.DB！"
    EXIT_CODE=1
else
    echo "✅ main.go 入口层干净，无越级 DB 操作。"
fi

echo ""
echo "🔍 [3/3] 扫描 service/ 业务层是否存在绕过封装直接操作 database.DB 的行为..."
SVN_VIOLATIONS=$(grep -rn 'database\.DB\.' "$ROOT/service/" --include="*.go" 2>/dev/null | grep -v '_test.go')
if [ ! -z "$SVN_VIOLATIONS" ]; then
    echo -e "\n🚨 [架构违规] service/ 存在越级 DB 操作（应调用 database/operations.go 封装函数）："
    echo "$SVN_VIOLATIONS"
    echo "❌ service/ 应调用 database/ 包的封装函数，禁止直接引用 database.DB！"
    EXIT_CODE=1
else
    echo "✅ service/ 业务层干净，全部通过 database/ 封装函数访问数据。"
fi

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "🎉 架构合规断路器：全部通过！三层架构纪律 100% 达标。"
else
    echo "💥 架构合规断路器：检测到违规，请立即修复！"
fi
exit $EXIT_CODE
