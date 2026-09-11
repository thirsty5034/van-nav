package handler

import (
	"crypto/tls"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/mereith/nav/logger"
	"github.com/mereith/nav/service"
	"github.com/mereith/nav/types"
	"github.com/mereith/nav/utils"
	"golang.org/x/text/encoding/simplifiedchinese"
)

// 预编译正则表达式（避免请求热路径上重复编译）
var (
	reTitle            = regexp.MustCompile(`(?i)<title[^>]*>([^<]+)</title>`)
	reCharset          = regexp.MustCompile(`(?i)charset=([^\s;]+)`)
	reMetaCharset      = regexp.MustCompile(`(?i)<meta[^>]+charset=["']?([^\s"'>]+)`)
	reMetaCharsetHTTP  = regexp.MustCompile(`(?i)<meta[^>]+http-equiv=["']?Content-Type["']?[^>]+content=["']?[^"]*charset=([^\s"'>]+)`)
	reMetaNameFirst    = regexp.MustCompile(`(?i)<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']`)
	reMetaContentFirst = regexp.MustCompile(`(?i)<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']`)
)

func ExportToolsHandler(c *gin.Context) {
	tools, err := service.GetAllTool()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "errorMessage": err.Error()})
		return
	}
	c.JSON(200, gin.H{
		"success": true,
		"message": "导出工具成功",
		"data":    tools,
	})
}

func ImportToolsHandler(c *gin.Context) {
	var tools []types.Tool
	err := c.ShouldBindJSON(&tools)
	if err != nil {
		utils.CheckErr(err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}
	// 导入所有工具，返回统计信息
	result := service.ImportTools(tools)
	c.JSON(200, gin.H{
		"success":        true,
		"message":        "导入工具成功",
		"tools_imported": result.Imported,
		"tools_skipped":  result.Skipped,
		"categories":     result.Categories,
	})
}

func DeleteApiTokenHandler(c *gin.Context) {
	// 删除 Token
	id := c.Param("id")
	err := service.DeleteApiToken(id)
	if err != nil {
		utils.CheckErr(err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}
	c.JSON(200, gin.H{
		"success": true,
		"message": "删除 API Token 成功",
	})
}

func AddApiTokenHandler(c *gin.Context) {
	var token types.AddTokenDto
	err := c.ShouldBindJSON(&token)
	if err != nil {
		utils.CheckErr(err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}
	newId := utils.GenerateId()
	var signedJwt string
	signedJwt, err = utils.SignJWTForAPI(token.Name, newId)
	if err != nil {
		utils.CheckErr(err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}
	service.AddApiTokenInDB(types.Token{
		Name:     token.Name,
		Value:    signedJwt,
		Id:       newId,
		Disabled: 0,
	})
	// 签名 jwt
	c.JSON(200, gin.H{
		"success": true,
		"data": gin.H{
			"id":    newId,
			"Value": signedJwt,
			"Name":  token.Name,
		},
		"message": "添加 Token 成功",
	})
}

func UpdateSettingHandler(c *gin.Context) {
	var data types.Setting
	if err := c.ShouldBindJSON(&data); err != nil {
		utils.CheckErr(err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}
	logger.LogInfo("更新配置: %+v", data)
	err := service.UpdateSetting(data)
	if err != nil {
		utils.CheckErr(err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}
	c.JSON(200, gin.H{
		"success": true,
		"message": "更新配置成功",
	})
}

func UpdateUserHandler(c *gin.Context) {
	var data types.UpdateUserDto
	if err := c.ShouldBindJSON(&data); err != nil {
		utils.CheckErr(err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}
	service.UpdateUser(data)
	c.JSON(200, gin.H{
		"success": true,
		"message": "更新用户成功",
	})
}

func UpdateSiteConfigHandler(c *gin.Context) {
	var data types.SiteConfig
	if err := c.ShouldBindJSON(&data); err != nil {
		utils.CheckErr(err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}
	logger.LogInfo("更新网站配置: %+v", data)
	err := service.UpdateSiteConfig(data)
	if err != nil {
		utils.CheckErr(err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}
	c.JSON(200, gin.H{
		"success": true,
		"message": "更新网站配置成功",
	})
}

func GetAllHandler(c *gin.Context) {
	// 使用带 TTL 缓存的全量数据获取，降低 DB 查询频率
	cached, err := service.GetAllDataCached()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "errorMessage": err.Error()})
		return
	}
	tools := cached.Tools
	catelogs := cached.Catelogs
	isLogin := utils.IsLogin(c)
	if !isLogin {
		// 过滤掉隐藏工具
		tools = utils.FilterHideTools(tools, catelogs)
	}
	if !isLogin {
		// 过滤掉隐藏分类
		catelogs = utils.FilterHideCates(catelogs)
	}
	c.JSON(200, gin.H{
		"success": true,
		"data": gin.H{
			"tools":      tools,
			"catelogs":   catelogs,
			"setting":    cached.Setting,
			"siteConfig": cached.SiteConfig,
		},
	})
}

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

func GetAdminAllDataHandler(c *gin.Context) {
	// 管理员获取全部数据，还有个用户名。
	tools, err := service.GetAllTool()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "errorMessage": err.Error()})
		return
	}
	catelogs, err := service.GetAllCatelog()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "errorMessage": err.Error()})
		return
	}
	setting, err := service.GetSetting()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "errorMessage": err.Error()})
		return
	}
	siteConfig, err := service.GetSiteConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "errorMessage": err.Error()})
		return
	}
	tokens, err := service.GetApiTokens()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "errorMessage": err.Error()})
		return
	}
	userId, ok := c.Get("uid")
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": "不存在该用户！",
		})
		return
	}
	c.JSON(200, gin.H{
		"success": true,
		"data": gin.H{
			"tools":      tools,
			"catelogs":   catelogs,
			"setting":    setting,
			"siteConfig": siteConfig,
			"user": gin.H{
				"name": c.GetString("username"),
				"id":   userId,
			},
			"tokens": tokens,
		},
	})
}

func LoginHandler(c *gin.Context) {
	var data types.LoginDto
	if err := c.ShouldBindJSON(&data); err != nil {
		utils.CheckErr(err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}
	user, err := service.GetUser(data.Name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "errorMessage": err.Error()})
		return
	}
	if user.Name == "" {
		c.JSON(200, gin.H{
			"success":      false,
			"errorMessage": "用户名不存在",
		})
		return
	}
	// 使用 bcrypt 验证密码（兼容旧版明文：自动升级为哈希）
	if !utils.CheckPassword(data.Password, user.Password) {
		// 兜底：旧版明文密码兼容（登录成功后自动升级为 bcrypt 哈希）
		if user.Password != data.Password {
			c.JSON(200, gin.H{
				"success":      false,
				"errorMessage": "密码错误",
			})
			return
		}
		// 明文匹配 → 自动升级为 bcrypt 哈希
		if hashed, err := utils.HashPassword(data.Password); err == nil {
			service.UpgradeUserPassword(user.Id, hashed)
			logger.LogInfo("用户 %s 密码已自动升级为 bcrypt 哈希", user.Name)
		}
	}
	// 生成 token（嵌入当前 token_version，密码修改后旧 token 失效）
	tokenVersion := service.GetUserTokenVersion(user.Id)
	token, err := utils.SignJWT(user, tokenVersion)
	utils.CheckErr(err)

	c.JSON(200, gin.H{
		"success": true,
		"message": "登录成功",
		"data": gin.H{
			"user":  user,
			"token": token,
		},
	})

}

// 退出登录
func LogoutHandler(c *gin.Context) {
	c.JSON(200, gin.H{
		"success": true,
		"message": "登出成功",
	})
}

func AddToolHandler(c *gin.Context) {
	// 添加工具
	var data types.AddToolDto
	if err := c.ShouldBindJSON(&data); err != nil {
		utils.CheckErr(err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}

	logger.LogInfo("%s 获取 logo: %s", data.Name, data.Logo)
	id, err := service.AddTool(data)
	if err != nil {
		utils.CheckErr(err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}
	if data.Logo == "" {
		go service.LazyFetchLogo(data.Url, id)
	}
	c.JSON(200, gin.H{
		"success": true,
		"message": "添加成功",
	})
}

func DeleteToolHandler(c *gin.Context) {
	// 删除工具
	id := c.Param("id")
	err := service.DeleteTool(id)
	if err != nil {
		utils.CheckErr(err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}
	c.JSON(200, gin.H{
		"success": true,
		"message": "删除成功",
	})
}

func UpdateToolHandler(c *gin.Context) {
	// 更新工具
	var data types.UpdateToolDto
	if err := c.ShouldBindJSON(&data); err != nil {
		utils.CheckErr(err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}
	if err := service.UpdateTool(data); err != nil {
		utils.CheckErr(err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}
	if data.Logo == "" {
		logger.LogInfo("%s 获取 logo: %s", data.Name, data.Logo)
		go service.LazyFetchLogo(data.Url, int64(data.Id))
	}

	c.JSON(200, gin.H{
		"success": true,
		"message": "更新成功",
	})
}

// UpdateToolDescOnlyHandler 只更新工具描述，不修改其他字段
func UpdateToolDescOnlyHandler(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": "无效的ID",
		})
		return
	}

	var body struct {
		Desc string `json:"desc"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}

	err = service.UpdateToolDesc(id, body.Desc)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"message": "更新描述成功",
	})
}

func AddCatelogHandler(c *gin.Context) {
	// 添加分类
	var data types.AddCatelogDto
	if err := c.ShouldBindJSON(&data); err != nil {
		utils.CheckErr(err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}
	service.AddCatelog(data)

	c.JSON(200, gin.H{
		"success": true,
		"message": "增加分类成功",
	})
}

func DeleteCatelogHandler(c *gin.Context) {
	// 删除分类
	id := c.Param("id")
	err := service.DeleteCatelog(id)
	if err != nil {
		utils.CheckErr(err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}
	c.JSON(200, gin.H{
		"success": true,
		"message": "删除分类成功",
	})
}

func UpdateCatelogHandler(c *gin.Context) {
	// 更新分类
	var data types.UpdateCatelogDto
	if err := c.ShouldBindJSON(&data); err != nil {
		utils.CheckErr(err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}
	service.UpdateCatelog(data)

	c.JSON(200, gin.H{
		"success": true,
		"message": "更新分类成功",
	})
}

func ManifestHandler(c *gin.Context) {

	setting, err := service.GetSetting()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "errorMessage": err.Error()})
		return
	}
	title := setting.Title

	var icons = []gin.H{}

	logo192 := setting.Logo192
	if logo192 == "" {
		logo192 = "logo192.png"
	}

	logo512 := setting.Logo512
	if logo512 == "" {
		logo512 = "logo512.png"
	}

	icons = append(icons, gin.H{
		"src":   logo192,
		"type":  "image/png",
		"sizes": "192x192",
	})
	icons = append(icons, gin.H{
		"src":   logo512,
		"type":  "image/png",
		"sizes": "512x512",
	})

	if title == "" {
		title = "Van nav"
	}
	c.JSON(200, gin.H{
		"short_name":       title,
		"name":             title,
		"icons":            icons,
		"start_url":        "/",
		"display":          "standalone",
		"scope":            "/",
		"theme_color":      "#000000",
		"background_color": "#ffffff",
	})
}

func UpdateToolsSortHandler(c *gin.Context) {
	var updates []types.UpdateToolsSortDto
	if err := c.ShouldBindJSON(&updates); err != nil {
		utils.CheckErr(err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}

	err := service.UpdateToolsSort(updates)
	if err != nil {
		utils.CheckErr(err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"message": "更新排序成功",
	})
}

// ==================== 搜索引擎相关处理函数 ====================

// 获取所有搜索引擎
func GetAllSearchEnginesHandler(c *gin.Context) {
	engines, err := service.GetAllSearchEngines()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}
	c.JSON(200, gin.H{
		"success": true,
		"data":    engines,
	})
}

// 获取启用的搜索引擎（用于前端搜索功能）
func GetEnabledSearchEnginesHandler(c *gin.Context) {
	engines, err := service.GetEnabledSearchEngines()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}
	c.JSON(200, gin.H{
		"success": true,
		"data":    engines,
	})
}

// 添加搜索引擎
func AddSearchEngineHandler(c *gin.Context) {
	var engine types.SearchEngine
	err := c.ShouldBindJSON(&engine)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}

	id, err := service.AddSearchEngine(engine)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"message": "添加搜索引擎成功",
		"data": gin.H{
			"id": id,
		},
	})
}

// 更新搜索引擎
func UpdateSearchEngineHandler(c *gin.Context) {
	var engine types.SearchEngine
	err := c.ShouldBindJSON(&engine)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}

	// 从URL参数获取ID
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": "无效的ID",
		})
		return
	}
	engine.Id = id

	err = service.UpdateSearchEngine(engine)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"message": "更新搜索引擎成功",
	})
}

// 删除搜索引擎
func DeleteSearchEngineHandler(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": "无效的ID",
		})
		return
	}

	err = service.DeleteSearchEngine(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"message": "删除搜索引擎成功",
	})
}

// 更新搜索引擎排序
func UpdateSearchEngineSortHandler(c *gin.Context) {
	var sortData []struct {
		Id   int `json:"id"`
		Sort int `json:"sort"`
	}
	err := c.ShouldBindJSON(&sortData)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}

	err = service.UpdateSearchEngineSort(sortData)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"message": "更新排序成功",
	})
}

// 更新分类排序
func UpdateCatelogSortHandler(c *gin.Context) {
	var sortData []struct {
		Id   int `json:"id"`
		Sort int `json:"sort"`
	}
	err := c.ShouldBindJSON(&sortData)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}

	err = service.UpdateCatelogSort(sortData)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"message": "更新排序成功",
	})
}

// GetFaviconFromApiHandler 通过 API 获取工具 favicon
type FaviconRequest struct {
	URL string `json:"url" binding:"required"`
}

type FaviconResponse struct {
	LogoUrl string `json:"logoUrl"`
}

func GetFaviconFromApiHandler(c *gin.Context) {
	var req FaviconRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": "请提供有效的工具网址",
		})
		return
	}

	// 获取站点配置
	siteConfig, err := service.GetSiteConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "errorMessage": err.Error()})
		return
	}

	// 获取 API 地址模板，始终可用
	apiTemplate := siteConfig.FaviconApiTemplate
	if apiTemplate == "" {
		apiTemplate = "https://favicon.im/{domain}"
	}

	// 从 URL 中提取域名
	domain := extractDomain(req.URL)
	if domain == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": "无法从网址中提取域名",
		})
		return
	}

	// 替换模板中的 {domain}
	logoUrl := replaceDomain(apiTemplate, domain)

	c.JSON(200, gin.H{
		"success": true,
		"logoUrl": logoUrl,
		"message": "获取成功",
	})
}

// extractDomain 从 URL 中提取主域名
func extractDomain(urlStr string) string {
	// 如果 URL 没有协议头，添加 http://
	if len(urlStr) > 0 && !(urlStr[:7] == "http://" || urlStr[:8] == "https://") {
		urlStr = "http://" + urlStr
	}

	u, err := url.Parse(urlStr)
	if err != nil {
		return ""
	}

	host := u.Host
	if host == "" {
		return ""
	}

	// 如果包含端口，去掉端口
	if idx := strings.Index(host, ":"); idx != -1 {
		host = host[:idx]
	}

	return host
}

// replaceDomain 替换模板中的 {domain}
func replaceDomain(template, domain string) string {
	result := strings.ReplaceAll(template, "{domain}", domain)
	return result
}

// FetchPageInfoHandler 获取页面标题和描述
func FetchPageInfoHandler(c *gin.Context) {
	urlStr := c.Query("url")
	if urlStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": "url 参数不能为空",
		})
		return
	}

	// 如果 URL 没有协议头，添加 https://
	if len(urlStr) > 0 && !(urlStr[:7] == "http://" || urlStr[:8] == "https://") {
		urlStr = "https://" + urlStr
	}

	// SSRF 防护：校验目标地址不是内网/私有地址
	parsedURL, err := url.Parse(urlStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": "无效的 URL 格式",
		})
		return
	}
	host := parsedURL.Hostname()
	ip := net.ParseIP(host)
	if ip != nil && (ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast()) {
		c.JSON(http.StatusForbidden, gin.H{
			"success":      false,
			"errorMessage": "禁止请求内网地址",
		})
		return
	}

	// 浏览器 User-Agent，模拟真实浏览器请求
	browserUA := "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

	client := &http.Client{
		Timeout: 30 * time.Second,
	}
	client.Transport = &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true}, // codeql[go/disabled-certificate-check] — 页面信息抓取需兼容自签名证书
	}

	// 最多重试 1 次
	maxRetries := 1
	var lastErr error

	for attempt := 0; attempt <= maxRetries; attempt++ {
		req, err := http.NewRequest("GET", urlStr, nil)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success":      false,
				"errorMessage": "构建请求失败: " + err.Error(),
			})
			return
		}
		req.Header.Set("User-Agent", browserUA)
		req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
		req.Header.Set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")

		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			// 网络错误可以重试
			if attempt < maxRetries {
				time.Sleep(time.Second)
				continue
			}
			c.JSON(http.StatusOK, gin.H{
				"success":      false,
				"errorMessage": "请求失败: " + err.Error(),
			})
			return
		}
		defer resp.Body.Close()

		// 处理 429 限速
		if resp.StatusCode == http.StatusTooManyRequests {
			retryAfter := resp.Header.Get("Retry-After")
			waitSeconds := 2 // 默认等待 2 秒
			if retryAfter != "" {
				if s, err := strconv.Atoi(retryAfter); err == nil {
					waitSeconds = s
				}
			}
			if attempt < maxRetries {
				time.Sleep(time.Duration(waitSeconds) * time.Second)
				continue
			}
			c.JSON(http.StatusOK, gin.H{
				"success":      false,
				"errorMessage": "请求过于频繁，请稍后再试",
			})
			return
		}

		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("状态码 %d", resp.StatusCode)
			c.JSON(http.StatusOK, gin.H{
				"success":      false,
				"errorMessage": "请求失败，状态码: " + strconv.Itoa(resp.StatusCode),
			})
			return
		}

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success":      false,
				"errorMessage": "读取响应失败: " + err.Error(),
			})
			return
		}

		// 识别网页编码并转换
		html := decodeHTMLBody(body, resp.Header.Get("Content-Type"))

		// 提取 title
		title := extractTitle(html)

		// 检测反爬页面（如验证码页面）
		if isAntiCrawlPage(title) != "" {
			c.JSON(http.StatusOK, gin.H{
				"success":      false,
				"errorMessage": "目标网站存在反爬限制，请手动填写描述",
			})
			return
		}

		// 提取 description
		desc := extractMetaContent(html, "description")

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": types.FetchPageInfoResponse{
				Title:       title,
				Description: desc,
			},
		})
		return
	}

	// 兜底错误
	c.JSON(http.StatusOK, gin.H{
		"success":      false,
		"errorMessage": "请求失败: " + lastErr.Error(),
	})
}

// extractMetaContent 从 HTML 中提取 meta 标签内容
func extractMetaContent(html, name string) string {
	// 优先使用预编译正则（覆盖 description 这个 99% 调用场景）
	if name == "description" {
		if m := reMetaNameFirst.FindStringSubmatch(html); len(m) > 1 && strings.TrimSpace(m[1]) != "" {
			return strings.TrimSpace(m[1])
		}
		if m := reMetaContentFirst.FindStringSubmatch(html); len(m) > 1 && strings.TrimSpace(m[1]) != "" {
			return strings.TrimSpace(m[1])
		}
		return ""
	}
	// 其他 name 动态编译（极少触发）
	p1 := fmt.Sprintf(`<meta[^>]+name=["']%s["'][^>]+content=["']([^"']+)["']`, name)
	p2 := fmt.Sprintf(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']%s["']`, name)
	for _, p := range []string{p1, p2} {
		re := regexp.MustCompile("(?i)" + p)
		if m := re.FindStringSubmatch(html); len(m) > 1 && strings.TrimSpace(m[1]) != "" {
			return strings.TrimSpace(m[1])
		}
	}
	return ""
}

// extractTitle 从 HTML 中提取 title 标签内容
func extractTitle(html string) string {
	matches := reTitle.FindStringSubmatch(html)
	if len(matches) > 1 {
		return strings.TrimSpace(matches[1])
	}
	return ""
}

// decodeHTMLBody 根据 Content-Type 或 HTML meta 标签识别编码并转换为 UTF-8
func decodeHTMLBody(body []byte, contentType string) string {
	// 1. 尝试从 Content-Type header 获取编码
	charset := extractCharsetFromContentType(contentType)

	// 2. 如果 header 没有，尝试从 HTML meta 标签获取
	if charset == "" {
		charset = extractCharsetFromMeta(string(body))
	}

	// 3. 根据编码转换
	if charset != "" {
		encodingName := strings.ToLower(charset)
		switch encodingName {
		case "gbk", "gb2312", "gb18030":
			// 使用 simplifiedchinese 将 GBK 转换为 UTF-8
			result := convertGBKToUTF8(body)
			if result != "" {
				return result
			}
		case "big5":
			// Big5 编码需要额外处理，这里暂不支持
			return string(body)
		case "utf-8", "utf8":
			return string(body)
		}
	}

	// 4. 默认：尝试用 UTF-8 解码，如果失败则尝试 GBK
	// 检查是否有效的 UTF-8
	if validUTF8(body) {
		return string(body)
	}
	// 不是有效 UTF-8，尝试 GBK
	result := convertGBKToUTF8(body)
	if result != "" {
		return result
	}

	// 5. 兜底：直接返回原始内容
	return string(body)
}

// validUTF8 检查是否为有效的 UTF-8 编码
func validUTF8(data []byte) bool {
	return utf8.Valid(data)
}

// extractCharsetFromContentType 从 Content-Type header 提取 charset
func extractCharsetFromContentType(contentType string) string {
	matches := reCharset.FindStringSubmatch(contentType)
	if len(matches) > 1 {
		return matches[1]
	}
	return ""
}

// extractCharsetFromMeta 从 HTML meta 标签提取编码
func extractCharsetFromMeta(html string) string {
	matches := reMetaCharset.FindStringSubmatch(html)
	if len(matches) > 1 {
		return matches[1]
	}
	matches = reMetaCharsetHTTP.FindStringSubmatch(html)
	if len(matches) > 1 {
		return matches[1]
	}
	return ""
}

// convertGBKToUTF8 手动转换 GBK 到 UTF-8
func convertGBKToUTF8(body []byte) string {
	// 使用 golang.org/x/text/encoding/simplifiedchinese
	GBK := simplifiedchinese.GB18030
	decoder := GBK.NewDecoder()
	result, err := decoder.Bytes(body)
	if err == nil {
		return string(result)
	}
	return ""
}

// isAntiCrawlPage 检测是否为反爬页面（如验证码页面）
func isAntiCrawlPage(title string) string {
	if title == "" {
		return ""
	}

	// 常见的反爬关键词
	antiCrawlKeywords := []string{
		"验证码",
		"captcha",
		"验证",
		"安全验证",
		"人机验证",
		"atk",
		"安全中心",
	}

	titleLower := strings.ToLower(title)
	for _, keyword := range antiCrawlKeywords {
		if strings.Contains(titleLower, strings.ToLower(keyword)) {
			return keyword
		}
	}
	return ""
}

// GetMaxSortHandler 获取工具表最大排序值
func GetMaxSortHandler(c *gin.Context) {
	maxSort, err := service.GetMaxSort()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":      false,
			"errorMessage": "获取最大排序失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": types.MaxSortResponse{
			MaxSort: maxSort,
		},
	})
}

// ==================== 导入导出相关 Handler ====================

// ExportConfigHandler 导出所有配置
func ExportConfigHandler(c *gin.Context) {
	resp, err := service.ExportFullConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":      false,
			"errorMessage": "导出配置失败: " + err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"data":    resp,
	})
}

// ImportConfigHandler 导入配置
func ImportConfigHandler(c *gin.Context) {
	var req types.ImportConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": "请求格式无效: " + err.Error(),
		})
		return
	}

	result := service.ImportFullConfig(req)

	c.JSON(200, gin.H{
		"success": true,
		"data":    result,
	})
}

// ==================== 网站健康检测 Handler ====================

// CheckLinksHandler 并发检测所有链接的存活状态
func CheckLinksHandler(c *gin.Context) {
	results, aliveCount, deadCount := service.CheckAllLinks()
	if results == nil {
		c.JSON(200, gin.H{
			"success": true,
			"data": types.LinkCheckResponse{
				Total:   0,
				Alive:   0,
				Dead:    0,
				Results: []types.LinkCheckResult{},
			},
		})
		return
	}

	linkResults := make([]types.LinkCheckResult, len(results))
	for i, r := range results {
		linkResults[i] = types.LinkCheckResult{
			Id:         r.Id,
			Url:        r.Url,
			Title:      r.Title,
			StatusCode: r.StatusCode,
			Alive:      r.Alive,
			Error:      r.Error,
		}
	}

	c.JSON(200, gin.H{
		"success": true,
		"data": types.LinkCheckResponse{
			Total:   len(results),
			Alive:   aliveCount,
			Dead:    deadCount,
			Results: linkResults,
		},
	})
}

// OrganizeDeadLinksHandler 先刷新检测，再将失效链接移至末尾，最后返回更新后的完整数据
func OrganizeDeadLinksHandler(c *gin.Context) {
	affected, tools, catelogs, setting, siteConfig, err := service.OrganizeDeadLinks()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":      false,
			"errorMessage": "整理失败: " + err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"data": gin.H{
			"affected":   affected,
			"tools":      tools,
			"catelogs":   catelogs,
			"setting":    setting,
			"siteConfig": siteConfig,
		},
		"message": fmt.Sprintf("已整理，%d 条失效链接已移至末尾", affected),
	})
}

// UpdateLanguageHandler 仅更新语言设置，不覆盖其他配置
func UpdateLanguageHandler(c *gin.Context) {
	var req struct {
		Language string `json:"language"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}
	if req.Language != "zh-CN" && req.Language != "en-US" {
		req.Language = "zh-CN"
	}
	err := service.UpdateLanguage(req.Language)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}
	c.JSON(200, gin.H{
		"success": true,
		"message": "语言设置已更新",
	})
}

// GetDeploymentVersionHandler 获取当前部署版本号
func GetDeploymentVersionHandler(c *gin.Context) {
	version, err := service.GetDeploymentVersion()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "errorMessage": err.Error()})
		return
	}
	c.JSON(200, gin.H{
		"success": true,
		"data": gin.H{
			"version": version,
		},
	})
}

// IncrementDeploymentVersionHandler 递增部署版本号（供部署 agent 调用）
func IncrementDeploymentVersionHandler(c *gin.Context) {
	newVersion, err := service.IncrementDeploymentVersion()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}
	c.JSON(200, gin.H{
		"success": true,
		"data": gin.H{
			"version": newVersion,
		},
		"message": "版本号已递增",
	})
}

// ==================== WebDAV 备份相关 Handler ====================

// GetBackupConfigHandler 获取备份配置
func GetBackupConfigHandler(c *gin.Context) {
	config, err := service.GetBackupConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}
	c.JSON(200, gin.H{
		"success": true,
		"data":    config,
	})
}

// SaveBackupConfigHandler 保存备份配置
func SaveBackupConfigHandler(c *gin.Context) {
	var config types.BackupConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}

	err := service.SaveBackupConfig(&config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}

	// 更新定时调度
	service.UpdateBackupCron()

	c.JSON(200, gin.H{
		"success": true,
		"message": "备份配置已保存",
	})
}

// TestBackupConnectionHandler 测试 WebDAV 连接
func TestBackupConnectionHandler(c *gin.Context) {
	var config types.BackupConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}

	err := service.TestWebDAVConnection(&config)
	if err != nil {
		c.JSON(200, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"message": "WebDAV 连接成功",
	})
}

// BackupNowHandler 立即执行备份
func BackupNowHandler(c *gin.Context) {
	go func() {
		defer func() {
			if r := recover(); r != nil {
				logger.LogError("手动备份 panic: %v", r)
			}
		}()
		err := service.ExecuteBackup()
		if err != nil {
			logger.LogError("手动备份失败: %s", err)
		}
	}()

	c.JSON(200, gin.H{
		"success": true,
		"message": "备份任务已启动",
	})
}

// GetBackupStatusHandler 获取备份状态
func GetBackupStatusHandler(c *gin.Context) {
	status := service.GetBackupStatusForDisplay()
	c.JSON(200, gin.H{
		"success": true,
		"data":    status,
	})
}

// ListBackupFilesHandler 列出 WebDAV 上的备份文件
func ListBackupFilesHandler(c *gin.Context) {
	files, err := service.ListBackupFiles()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}
	if files == nil {
		files = []service.BackupFileInfo{}
	}
	c.JSON(200, gin.H{
		"success": true,
		"data":    files,
	})
}

// RestoreBackupHandler 从指定备份文件恢复数据库
func RestoreBackupHandler(c *gin.Context) {
	var req struct {
		Filename string `json:"filename"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}
	if req.Filename == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": "文件名不能为空",
		})
		return
	}

	err := service.RestoreFromBackup(req.Filename)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"message": "数据库恢复成功，请刷新页面以查看最新数据",
	})
}

// ==================== 主题美化配置相关 ====================

// GetThemeConfigHandler 获取主题配置（公开接口，无token返回默认主题）
func GetThemeConfigHandler(c *gin.Context) {
	config, err := service.GetThemeConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"data":    config,
	})
}

// UpdateThemeConfigHandler 更新主题配置（管理员接口）
func UpdateThemeConfigHandler(c *gin.Context) {
	var config types.ThemeConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": "请求参数格式错误: " + err.Error(),
		})
		return
	}

	if err := service.SaveThemeConfig(config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"message": "主题配置已保存",
	})
}

// ResetThemeConfigHandler 重置主题配置为默认值（管理员接口）
func ResetThemeConfigHandler(c *gin.Context) {
	if err := service.ResetThemeConfig(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":      false,
			"errorMessage": err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"message": "已重置为默认主题",
	})
}
