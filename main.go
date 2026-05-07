package main

import (
	"embed"
	"flag"
	"fmt"
	"net/http"
	"os"
	"path"
	"strings"
	"time"

	"github.com/mereith/nav/database"
	"github.com/mereith/nav/handler"
	"github.com/mereith/nav/logger"
	"github.com/mereith/nav/middleware"
	"github.com/mereith/nav/service"

	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
)

const INDEX = "index.html"

//go:embed public
var fs embed.FS

type binaryFileSystem struct {
	fs   http.FileSystem
	root string
}

func (b *binaryFileSystem) Open(name string) (http.File, error) {
	openPath := path.Join(b.root, name)
	return b.fs.Open(openPath)
}

func (b *binaryFileSystem) Exists(prefix string, filepath string) bool {
	if p := strings.TrimPrefix(filepath, prefix); len(p) < len(filepath) {
		var name string
		if p == "" {
			name = path.Join(b.root, p, INDEX)
		} else {
			name = path.Join(b.root, p)
		}
		// 判断
		if _, err := b.fs.Open(name); err != nil {
			return false
		}
		return true
	}
	return false
}
func BinaryFileSystem(data embed.FS, root string) *binaryFileSystem {
	fs := http.FS(data)
	return &binaryFileSystem{
		fs,
		root,
	}
}

var port = flag.String("port", "6412", "指定监听端口")
var addr = flag.String("addr", "0.0.0.0", "指定监听地址")

func main() {
	flag.Parse()
	database.InitDB()
	// 检查备份加密密钥
	if os.Getenv("BACKUP_ENCRYPTION_KEY") == "" {
		logger.LogError("警告：环境变量 BACKUP_ENCRYPTION_KEY 未设置，备份密码将以明文存储。建议设置一个32字节的密钥。")
	}
	service.InitBackupCron()
	gin.SetMode(gin.ReleaseMode)
	router := gin.Default()
	router.Use(gzip.Gzip(gzip.DefaultCompression, gzip.WithExcludedExtensions([]string{".png", ".jpg", ".jpeg", ".ico", ".svg"})))
	//router.Use(gzip.Gzip(gzip.DefaultCompression))
	// 嵌入文件夹
	router.GET("/manifest.json", handler.ManifastHanlder)
	router.Use(Serve("/", BinaryFileSystem(fs, "public")))
	api := router.Group("/api")
	api.Use(func(c *gin.Context) {
		c.Header("Cache-Control", "no-store, no-cache, must-revalidate")
		c.Header("Pragma", "no-cache")
		c.Next()
	})
	{
		// 获取数据的路由
		api.GET("/", handler.GetAllHandler)
		// 获取用户信息

		api.POST("/login", handler.LoginHandler)
		api.GET("/logout", handler.LogoutHandler)
		api.GET("/img", handler.GetLogoImgHandler)
		
		// 获取启用的搜索引擎（公开接口）
		api.GET("/searchEngines", handler.GetEnabledSearchEnginesHandler)
		
		// 管理员用的
		admin := api.Group("/admin")
		admin.Use(middleware.JWTMiddleware())
		{
			admin.POST("/apiToken", handler.AddApiTokenHandler)
			admin.DELETE("/apiToken/:id", handler.DeleteApiTokenHandler)
			admin.GET("/all", handler.GetAdminAllDataHandler)

			admin.GET("/exportTools", handler.ExportToolsHandler)

			admin.POST("/importTools", handler.ImportToolsHandler)

			admin.PUT("/user", handler.UpdateUserHandler)

			admin.PUT("/setting", handler.UpdateSettingHandler)

			admin.PUT("/siteConfig", handler.UpdateSiteConfigHandler)

			admin.POST("/tool", handler.AddToolHandler)
			admin.DELETE("/tool/:id", handler.DeleteToolHandler)
			admin.PUT("/tool/:id", handler.UpdateToolHandler)
			admin.PUT("/tool/:id/desc", handler.UpdateToolDescOnlyHandler)
			admin.PUT("/tools/sort", handler.UpdateToolsSortHandler)
			admin.POST("/tools/logo/from-api", handler.GetFaviconFromApiHandler)
			admin.GET("/tools/max-sort", handler.GetMaxSortHandler)
			admin.GET("/fetch-page-info", handler.FetchPageInfoHandler)

			admin.POST("/catelog", handler.AddCatelogHandler)
			admin.DELETE("/catelog/:id", handler.DeleteCatelogHandler)
			admin.PUT("/catelog/:id", handler.UpdateCatelogHandler)
			
			// 搜索引擎管理路由
			admin.GET("/searchEngine", handler.GetAllSearchEnginesHandler)
			admin.POST("/searchEngine", handler.AddSearchEngineHandler)
			admin.PUT("/searchEngine/:id", handler.UpdateSearchEngineHandler)
			admin.DELETE("/searchEngine/:id", handler.DeleteSearchEngineHandler)
			admin.PUT("/searchEngines/sort", handler.UpdateSearchEngineSortHandler)
			
			// 分类排序路由
			admin.PUT("/catelogs/sort", handler.UpdateCatelogSortHandler)
			
			// 数据备份
			admin.GET("/backup/config", handler.GetBackupConfigHandler)
			admin.PUT("/backup/config", handler.SaveBackupConfigHandler)
			admin.POST("/backup/test-connection", handler.TestBackupConnectionHandler)
			admin.POST("/backup/backup-now", handler.BackupNowHandler)
			admin.GET("/backup/status", handler.GetBackupStatusHandler)
			
		// 导入导出路由
		admin.GET("/exportConfig", handler.ExportConfigHandler)
		admin.POST("/importConfig", handler.ImportConfigHandler)

		// 网站健康检测路由
		admin.POST("/check-links", handler.CheckLinksHandler)
		admin.POST("/organize-dead-links", handler.OrganizeDeadLinksHandler)

		// 部署版本
		admin.GET("/deploymentVersion", handler.GetDeploymentVersionHandler)
		admin.POST("/deploymentVersion/increment", handler.IncrementDeploymentVersionHandler)
	}
	}
	logger.LogInfo("应用启动成功，网址: http://localhost:%s", *port)
	listen := fmt.Sprintf("%s:%s", *addr, *port)
	srv := &http.Server{
		Addr:         listen,
		Handler:      router,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 60 * time.Second, // 较长以支持批量链接检测
		IdleTimeout:  10 * time.Second,
	}

	err := srv.ListenAndServe()
	if err != nil && err != http.ErrServerClosed {
		logger.LogError("应用启动失败，错误: %s", err)
	}
}
