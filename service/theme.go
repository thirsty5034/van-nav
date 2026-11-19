package service

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"github.com/mereith/nav/database"
	"github.com/mereith/nav/types"
)

// 预编译正则表达式，避免重复编译
var (
	dangerousCSSPatterns []*regexp.Regexp
)

func init() {
	// 预编译危险CSS关键字正则（使用RE2兼容语法，不使用lookahead）
	patterns := []string{
		`(?i)expression\s*\(`,      // IE expression()
		`(?i)behavior\s*:`,         // IE behavior
		`(?i)-moz-binding\s*:`,     // Firefox binding
		`(?i)@import\s+`,           // 外部样式导入
		`(?i)url\s*\(`,            // url() 调用（后续逻辑检测协议）
	}
	
	for _, pattern := range patterns {
		compiled, err := regexp.Compile(pattern)
		if err != nil {
			panic(fmt.Sprintf("编译CSS净化正则失败: %v", err))
		}
		dangerousCSSPatterns = append(dangerousCSSPatterns, compiled)
	}
}

// 默认夜间配色（内置暗色）
func getDefaultDarkTheme() types.DarkThemeConfig {
	return types.DarkThemeConfig{
		Colors: types.ThemeColors{
			Primary:       "#4096ff",
			BgBase:        "#0f1115",
			BgCard:        "#1d1f24",
			TextPrimary:   "#ffffffe0",
			TextSecondary: "#ffffffa6",
			Border:        "#333333",
		},
		CustomCSS: "",
	}
}

// 默认主题配置
func getDefaultThemeConfig() types.ThemeConfig {
	return types.ThemeConfig{
		Version: "1.0",
		Colors: types.ThemeColors{
			Primary:       "#1677ff",
			BgBase:        "#f5f5f5",
			BgCard:        "#ffffff",
			TextPrimary:   "#000000e0",
			TextSecondary: "#000000a6",
			Border:        "#d9d9d9",
		},

		Layout: types.ThemeLayout{
			CardBorderRadius: "8px",
			CardShadow:       "0 1px 2px rgba(0,0,0,0.03), 0 1px 6px rgba(0,0,0,0.02)",
			CardPadding:      "16px",
			CardGap:          "16px",
		},
		Typography: types.ThemeTypography{
			TitleFontSize:   "15px",
			TitleFontWeight: "600",
			DescFontSize:    "13px",
		},
		CustomCSS: "",
		NightMode: types.NightModeConfig{
			Mode:  "system",
			Start: "18:00",
			End:   "08:00",
		},
		DarkTheme: getDefaultDarkTheme(),
		Font:      types.ThemeFontConfig{Family: "", BaseFontSize: "14px"},
		Radius:    types.ThemeRadiusConfig{Style: "small"},
		Topbar:    types.ThemeTopbarConfig{Background: "", TextColor: "", Blur: false, Height: ""},
		PageBg:    types.ThemePageBgConfig{GradientTo: "", Image: "", DimOpacity: ""},
		CardExtra: types.ThemeCardConfig{LogoRadius: "", LogoSize: "", TitleColor: "", HoverLift: true, Outline: false,
			Height: "", ShowLogo: true, ShowTitle: true, ShowDesc: true, ShowTag: true, BgOpacity: ""},
		LinkBtn: types.ThemeLinkConfig{LinkColor: "", ButtonRadius: ""},
		Footer:  types.ThemeFooterConfig{TextColor: "", Hidden: false, Text: ""},
		Search: types.ThemeSearchConfig{
			Hidden:           false,
			Position:         "center",
			Width:            "60%",
			Vertical:         "top",
			Height:           "40px",
			Radius:           "8px",
			Transparent:      false,
			TextColor:        "",
			PlaceholderColor: "",
			Placeholder:      "",
		},
		Tag: types.ThemeTagConfig{Hidden: false, Position: "top", Transparent: false, Bg: "", ActiveBg: "", TextColor: "", Radius: ""},
	}
}

// sanitizeCustomCSS 净化自定义CSS，过滤危险关键字
func sanitizeCustomCSS(css string) (string, error) {
	// 1. 长度校验
	if len(css) > 10240 { // 10KB
		return "", fmt.Errorf("customCSS长度超过10KB限制")
	}
	
	if css == "" {
		return "", nil
	}
	
	// 2. 危险关键字过滤（使用预编译正则）
	for _, pattern := range dangerousCSSPatterns {
		if pattern.MatchString(css) {
			// 特殊处理 url()：允许 data: 协议
			if pattern.String() == `(?i)url\s*\(` {
				// 检测所有 url() 调用，验证是否为 data: 协议
				if !isDataURL(css) {
					return "", fmt.Errorf("检测到非 data: 协议的 url() 引用，请移除外部资源引用")
				}
				continue
			}
			return "", fmt.Errorf("检测到潜在危险CSS关键字，请移除后重试")
		}
	}
	
	// 3. 去除首尾空白
	css = strings.TrimSpace(css)
	
	return css, nil
}

// isDataURL 检查CSS中的url()是否只使用data:协议
func isDataURL(css string) bool {
	// 匹配所有 url(...) 调用
	re := regexp.MustCompile(`(?i)url\s*\(\s*['"]?([^)'"]*)`)
	matches := re.FindAllStringSubmatch(css, -1)
	
	for _, match := range matches {
		if len(match) < 2 {
			continue
		}
		url := strings.TrimSpace(match[1])
		// 空url或data:协议是安全的
		if url == "" || strings.HasPrefix(strings.ToLower(url), "data:") {
			continue
		}
		// 其他协议都不允许
		return false
	}
	return true
}

// fontFamilyPattern 字体族白名单：禁止 CSS 结构字符（字体族会进入样式变量）
var fontFamilyPattern = regexp.MustCompile(`^[^;{}<>\\` + "`" + `]*$`)

// validateFontFamilyField 字体族校验：长度限制 + 禁止 CSS 结构字符；空=跟随全局
func validateFontFamilyField(v, name string) error {
	if v == "" {
		return nil
	}
	if len(v) > 200 {
		return fmt.Errorf("%s过长", name)
	}
	if !fontFamilyPattern.MatchString(v) {
		return fmt.Errorf("%s含非法字符", name)
	}
	return nil
}

// validateThemeConfig 校验主题配置的有效性
func validateThemeConfig(config *types.ThemeConfig) error {
	// 校验颜色值格式（支持6位和8位hex）
	colorPattern := regexp.MustCompile(`^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$`)

	// 校验亮色主题颜色
	if !colorPattern.MatchString(config.Colors.Primary) {
		return fmt.Errorf("亮色主题主色调格式无效")
	}
	if !colorPattern.MatchString(config.Colors.BgBase) {
		return fmt.Errorf("亮色主题背景色格式无效")
	}
	if !colorPattern.MatchString(config.Colors.BgCard) {
		return fmt.Errorf("亮色主题卡片背景色格式无效")
	}

	// 校验夜间主题颜色
	if !colorPattern.MatchString(config.DarkTheme.Colors.Primary) {
		return fmt.Errorf("夜间主题主色调格式无效")
	}
	if !colorPattern.MatchString(config.DarkTheme.Colors.BgBase) {
		return fmt.Errorf("夜间主题背景色格式无效")
	}
	if !colorPattern.MatchString(config.DarkTheme.Colors.BgCard) {
		return fmt.Errorf("夜间主题卡片背景色格式无效")
	}

	// 校验夜间模式策略
	if !isValidNightModeMode(config.NightMode.Mode) {
		return fmt.Errorf("夜间模式策略无效，应为 system/scheduled/off")
	}
	if config.NightMode.Mode == "scheduled" {
		timePattern := regexp.MustCompile(`^([01]\d|2[0-3]):[0-5]\d$`)
		if !timePattern.MatchString(config.NightMode.Start) || !timePattern.MatchString(config.NightMode.End) {
			return fmt.Errorf("夜间时间窗口格式无效，应为 HH:mm")
		}
	}

	// 校验布局数值（使用正则提取数字）
	pxPattern := regexp.MustCompile(`^(\d+(?:\.\d+)?)px$`)

	if match := pxPattern.FindStringSubmatch(config.Layout.CardBorderRadius); match != nil {
		// 允许 0-50px
	} else if config.Layout.CardBorderRadius != "0" {
		return fmt.Errorf("卡片圆角格式无效，应为 0-50px")
	}

	// 校验扩展配置组
	validateColorField := func(v, name string) error {
		if v != "" && !colorPattern.MatchString(v) {
			return fmt.Errorf("%s格式无效", name)
		}
		return nil
	}
	validatePxField := func(v, name string) error {
		if v != "" && !pxPattern.MatchString(v) {
			return fmt.Errorf("%s格式无效，应为 px 值", name)
		}
		return nil
	}

	if err := validatePxField(config.Font.BaseFontSize, "正文字号"); err != nil {
		return err
	}
	switch config.Radius.Style {
	case "", "none", "small", "medium", "large":
	default:
		return fmt.Errorf("圆角风格无效，应为 none/small/medium/large")
	}
	if config.Topbar.Background != "" && config.Topbar.Background != "transparent" {
		if err := validateColorField(config.Topbar.Background, "顶栏背景色"); err != nil {
			return err
		}
	}
	if err := validateColorField(config.Topbar.TextColor, "顶栏文字色"); err != nil {
		return err
	}
	if err := validatePxField(config.Topbar.Height, "顶栏高度"); err != nil {
		return err
	}
	if err := validateColorField(config.PageBg.GradientTo, "背景渐变色"); err != nil {
		return err
	}
	switch config.PageBg.Mode {
	case "", "color", "image":
	default:
		return fmt.Errorf("背景模式无效，应为 color/image")
	}
	if config.PageBg.Image != "" && !strings.HasPrefix(config.PageBg.Image, "/") &&
		!strings.HasPrefix(config.PageBg.Image, "images/") {
		if !strings.HasPrefix(config.PageBg.Image, "data:") {
			return fmt.Errorf("背景图仅支持 data: 协议或站内路径")
		}
		if err := ValidateDataURLImage("背景图片", config.PageBg.Image, "png/jpeg/webp", 500, bitmapImageMIMEs); err != nil {
			return err
		}
	}
	if config.PageBg.DimOpacity != "" {
		dimPattern := regexp.MustCompile(`^(0(\.\d+)?|1)$`)
		if !dimPattern.MatchString(config.PageBg.DimOpacity) {
			return fmt.Errorf("背景遮罩透明度应为 0-1 之间的数字")
		}
	}
	if err := validateColorField(config.CardExtra.TitleColor, "卡片标题颜色"); err != nil {
		return err
	}
	if err := validatePxField(config.CardExtra.LogoRadius, "Logo圆角"); err != nil {
		return err
	}
	if err := validatePxField(config.CardExtra.LogoSize, "Logo尺寸"); err != nil {
		return err
	}
	if err := validateColorField(config.LinkBtn.LinkColor, "链接颜色"); err != nil {
		return err
	}
	if err := validatePxField(config.LinkBtn.ButtonRadius, "按钮圆角"); err != nil {
		return err
	}
	if err := validateColorField(config.Footer.TextColor, "页脚文字颜色"); err != nil {
		return err
	}
	if err := validateColorField(config.Footer.BgColor, "页脚背景颜色"); err != nil {
		return err
	}
	if err := validateFontFamilyField(config.Footer.FontFamily, "页脚字体"); err != nil {
		return err
	}

	// 校验搜索框配置
	switch config.Search.Position {
	case "", "left", "center", "right":
	default:
		return fmt.Errorf("搜索框水平位置无效，应为 left/center/right")
	}
	switch config.Search.Vertical {
	case "", "top", "bottom":
	default:
		return fmt.Errorf("搜索框摆放位置无效，应为 top/bottom")
	}
	percentPattern := regexp.MustCompile(`^([1-9]\d?|100)%$`)
	if config.Search.Width != "" && !percentPattern.MatchString(config.Search.Width) {
		return fmt.Errorf("搜索框宽度格式无效，应为 1-100 的百分比（如 60%%）")
	}
	if err := validatePxField(config.Search.Height, "搜索框高度"); err != nil {
		return err
	}
	if err := validatePxField(config.Search.Radius, "搜索框圆角"); err != nil {
		return err
	}
	if err := validateColorField(config.Search.TextColor, "搜索框文字颜色"); err != nil {
		return err
	}
	if err := validateColorField(config.Search.PlaceholderColor, "搜索框提示颜色"); err != nil {
		return err
	}
	if err := validateFontFamilyField(config.Search.FontFamily, "搜索框字体"); err != nil {
		return err
	}
	if err := validatePxField(config.Search.FontSize, "搜索框字号"); err != nil {
		return err
	}

	// 校验分类标签配置
	switch config.Tag.Position {
	case "", "top", "bottom", "left", "right":
	default:
		return fmt.Errorf("分类标签位置无效，应为 top/bottom/left/right")
	}
	if err := validateColorField(config.Tag.Bg, "分类标签底色"); err != nil {
		return err
	}
	if err := validateColorField(config.Tag.ActiveBg, "分类标签选中底色"); err != nil {
		return err
	}
	if err := validateColorField(config.Tag.TextColor, "分类标签文字颜色"); err != nil {
		return err
	}
	if err := validatePxField(config.Tag.Radius, "分类标签圆角"); err != nil {
		return err
	}
	if err := validateFontFamilyField(config.Tag.FontFamily, "分类标签字体"); err != nil {
		return err
	}
	if err := validatePxField(config.Tag.FontSize, "分类标签字号"); err != nil {
		return err
	}

	// 校验卡片扩展配置（高度 px、底色透明度 0-1）
	if err := validatePxField(config.CardExtra.Height, "卡片高度"); err != nil {
		return err
	}
	opacityPattern := regexp.MustCompile(`^(0(\.\d+)?|1)$`)
	if config.CardExtra.BgOpacity != "" && !opacityPattern.MatchString(config.CardExtra.BgOpacity) {
		return fmt.Errorf("卡片底色透明度应为 0-1 之间的数字")
	}
	if err := validateColorField(config.CardExtra.DescColor, "卡片描述颜色"); err != nil {
		return err
	}
	if err := validateColorField(config.CardExtra.TagColor, "卡片标签文字颜色"); err != nil {
		return err
	}
	if err := validateColorField(config.CardExtra.TagBg, "卡片标签底色"); err != nil {
		return err
	}
	if err := validatePxField(config.CardExtra.TagRadius, "卡片标签圆角"); err != nil {
		return err
	}
	if err := validateFontFamilyField(config.CardExtra.TitleFontFamily, "卡片标题字体"); err != nil {
		return err
	}
	if err := validateFontFamilyField(config.CardExtra.DescFontFamily, "卡片描述字体"); err != nil {
		return err
	}
	if err := validateColorField(config.CardExtra.BorderColor, "卡片描边颜色"); err != nil {
		return err
	}

	return nil
}

// GetThemeConfig 获取主题配置
func GetThemeConfig() (*types.ThemeConfig, error) {
	configMap, err := database.GetThemeConfig()
	if err != nil {
		return nil, err
	}
	
	// 如果数据库中没有配置，返回默认配置
	if len(configMap) == 0 {
		defaultConfig := getDefaultThemeConfig()
		return &defaultConfig, nil
	}
	
	// 将map转换为结构体
	config := getDefaultThemeConfig() // 先填充默认值
	
	// 解析colors
	if colors, ok := configMap["colors"].(map[string]interface{}); ok {
		if v, ok := colors["primary"].(string); ok {
			config.Colors.Primary = v
		}
		if v, ok := colors["bgBase"].(string); ok {
			config.Colors.BgBase = v
		}
		if v, ok := colors["bgCard"].(string); ok {
			config.Colors.BgCard = v
		}
		if v, ok := colors["textPrimary"].(string); ok {
			config.Colors.TextPrimary = v
		}
		if v, ok := colors["textSecondary"].(string); ok {
			config.Colors.TextSecondary = v
		}
		if v, ok := colors["border"].(string); ok {
			config.Colors.Border = v
		}
	}
	
	
	// 解析layout
	if layout, ok := configMap["layout"].(map[string]interface{}); ok {
		if v, ok := layout["cardBorderRadius"].(string); ok {
			config.Layout.CardBorderRadius = v
		}
		if v, ok := layout["cardShadow"].(string); ok {
			config.Layout.CardShadow = v
		}
		if v, ok := layout["cardPadding"].(string); ok {
			config.Layout.CardPadding = v
		}
		if v, ok := layout["cardGap"].(string); ok {
			config.Layout.CardGap = v
		}

	}
	
	// 解析typography
	if typography, ok := configMap["typography"].(map[string]interface{}); ok {
		if v, ok := typography["titleFontSize"].(string); ok {
			config.Typography.TitleFontSize = v
		}
		if v, ok := typography["titleFontWeight"].(string); ok {
			config.Typography.TitleFontWeight = v
		}
		if v, ok := typography["descFontSize"].(string); ok {
			config.Typography.DescFontSize = v
		}
	}
	
	// 解析customCSS
	if v, ok := configMap["customCSS"].(string); ok {
		config.CustomCSS = v
	}
	
	// 解析version
	if v, ok := configMap["version"].(string); ok {
		config.Version = v
	}

	// 解析夜间模式策略（字段缺失/非法时保持默认 system + 18:00-08:00）
	if nm, ok := configMap["nightMode"].(map[string]interface{}); ok {
		if v, ok := nm["mode"].(string); ok && isValidNightModeMode(v) {
			config.NightMode.Mode = v
		}
		if v, ok := nm["start"].(string); ok && v != "" {
			config.NightMode.Start = v
		}
		if v, ok := nm["end"].(string); ok && v != "" {
			config.NightMode.End = v
		}
	}

	// 解析夜间主题配色
	if dt, ok := configMap["darkTheme"].(map[string]interface{}); ok {
		if colors, ok := dt["colors"].(map[string]interface{}); ok {
			config.DarkTheme.Colors = colorsFromMap(colors, config.DarkTheme.Colors)
		}
		if v, ok := dt["customCSS"].(string); ok {
			config.DarkTheme.CustomCSS = v
		}
	}

	// 解析扩展配置组（字体/圆角/顶栏/背景/卡片/链接/页脚）
	if m, ok := configMap["font"].(map[string]interface{}); ok {
		config.Font.Family = strFromMap(m, "family", config.Font.Family)
		config.Font.BaseFontSize = strFromMap(m, "baseFontSize", config.Font.BaseFontSize)
	}
	if m, ok := configMap["radius"].(map[string]interface{}); ok {
		config.Radius.Style = strFromMap(m, "style", config.Radius.Style)
	}
	if m, ok := configMap["topbar"].(map[string]interface{}); ok {
		config.Topbar.Background = strFromMap(m, "background", config.Topbar.Background)
		config.Topbar.TextColor = strFromMap(m, "textColor", config.Topbar.TextColor)
		config.Topbar.Blur = boolFromMap(m, "blur", config.Topbar.Blur)
		config.Topbar.Height = strFromMap(m, "height", config.Topbar.Height)
	}
	if m, ok := configMap["pageBg"].(map[string]interface{}); ok {
		config.PageBg.Mode = strFromMap(m, "mode", config.PageBg.Mode)
		config.PageBg.GradientTo = strFromMap(m, "gradientTo", config.PageBg.GradientTo)
		config.PageBg.Image = strFromMap(m, "image", config.PageBg.Image)
		config.PageBg.DimOpacity = strFromMap(m, "dimOpacity", config.PageBg.DimOpacity)
	}
	if m, ok := configMap["cardExtra"].(map[string]interface{}); ok {
		config.CardExtra.LogoRadius = strFromMap(m, "logoRadius", config.CardExtra.LogoRadius)
		config.CardExtra.LogoSize = strFromMap(m, "logoSize", config.CardExtra.LogoSize)
		config.CardExtra.TitleColor = strFromMap(m, "titleColor", config.CardExtra.TitleColor)
		config.CardExtra.HoverLift = boolFromMap(m, "hoverLift", config.CardExtra.HoverLift)
		config.CardExtra.Outline = boolFromMap(m, "outline", config.CardExtra.Outline)
		config.CardExtra.Height = strFromMap(m, "height", config.CardExtra.Height)
		config.CardExtra.ShowLogo = boolFromMap(m, "showLogo", config.CardExtra.ShowLogo)
		config.CardExtra.ShowTitle = boolFromMap(m, "showTitle", config.CardExtra.ShowTitle)
		config.CardExtra.ShowDesc = boolFromMap(m, "showDesc", config.CardExtra.ShowDesc)
		config.CardExtra.ShowTag = boolFromMap(m, "showTag", config.CardExtra.ShowTag)
		config.CardExtra.BgOpacity = strFromMap(m, "bgOpacity", config.CardExtra.BgOpacity)
		config.CardExtra.TitleFontFamily = strFromMap(m, "titleFontFamily", config.CardExtra.TitleFontFamily)
		config.CardExtra.DescFontFamily = strFromMap(m, "descFontFamily", config.CardExtra.DescFontFamily)
		config.CardExtra.DescColor = strFromMap(m, "descColor", config.CardExtra.DescColor)
		config.CardExtra.TagColor = strFromMap(m, "tagColor", config.CardExtra.TagColor)
		config.CardExtra.TagBg = strFromMap(m, "tagBg", config.CardExtra.TagBg)
		config.CardExtra.TagRadius = strFromMap(m, "tagRadius", config.CardExtra.TagRadius)
		config.CardExtra.BorderColor = strFromMap(m, "borderColor", config.CardExtra.BorderColor)
	}
	if m, ok := configMap["linkBtn"].(map[string]interface{}); ok {
		config.LinkBtn.LinkColor = strFromMap(m, "linkColor", config.LinkBtn.LinkColor)
		config.LinkBtn.ButtonRadius = strFromMap(m, "buttonRadius", config.LinkBtn.ButtonRadius)
	}
	if m, ok := configMap["footer"].(map[string]interface{}); ok {
		config.Footer.TextColor = strFromMap(m, "textColor", config.Footer.TextColor)
		config.Footer.BgColor = strFromMap(m, "bgColor", config.Footer.BgColor)
		config.Footer.Hidden = boolFromMap(m, "hidden", config.Footer.Hidden)
		config.Footer.Text = strFromMap(m, "text", config.Footer.Text)
		config.Footer.FontFamily = strFromMap(m, "fontFamily", config.Footer.FontFamily)
	}
	// 解析搜索框配置（字段缺失/为空时保持默认值）
	if m, ok := configMap["search"].(map[string]interface{}); ok {
		config.Search.Hidden = boolFromMap(m, "hidden", config.Search.Hidden)
		config.Search.Position = strFromMap(m, "position", config.Search.Position)
		config.Search.Width = strFromMap(m, "width", config.Search.Width)
		config.Search.Vertical = strFromMap(m, "vertical", config.Search.Vertical)
		config.Search.Height = strFromMap(m, "height", config.Search.Height)
		config.Search.Radius = strFromMap(m, "radius", config.Search.Radius)
		config.Search.Transparent = boolFromMap(m, "transparent", config.Search.Transparent)
		config.Search.TextColor = strFromMap(m, "textColor", config.Search.TextColor)
		config.Search.PlaceholderColor = strFromMap(m, "placeholderColor", config.Search.PlaceholderColor)
		config.Search.Placeholder = strFromMap(m, "placeholder", config.Search.Placeholder)
		config.Search.FontFamily = strFromMap(m, "fontFamily", config.Search.FontFamily)
		config.Search.FontSize = strFromMap(m, "fontSize", config.Search.FontSize)
	}
	// 解析分类标签配置（字段缺失/为空时保持默认值）
	if m, ok := configMap["tag"].(map[string]interface{}); ok {
		config.Tag.Hidden = boolFromMap(m, "hidden", config.Tag.Hidden)
		config.Tag.Position = strFromMap(m, "position", config.Tag.Position)
		config.Tag.Transparent = boolFromMap(m, "transparent", config.Tag.Transparent)
		config.Tag.Bg = strFromMap(m, "bg", config.Tag.Bg)
		config.Tag.ActiveBg = strFromMap(m, "activeBg", config.Tag.ActiveBg)
		config.Tag.TextColor = strFromMap(m, "textColor", config.Tag.TextColor)
		config.Tag.Radius = strFromMap(m, "radius", config.Tag.Radius)
		config.Tag.FontFamily = strFromMap(m, "fontFamily", config.Tag.FontFamily)
		config.Tag.FontSize = strFromMap(m, "fontSize", config.Tag.FontSize)
	}

	return &config, nil
}

// isValidNightModeMode 夜间模式策略合法性
func isValidNightModeMode(mode string) bool {
	return mode == "system" || mode == "scheduled" || mode == "off"
}

// colorsFromMap 从 map 解析颜色配置，缺省字段回退 fallback
func colorsFromMap(colors map[string]interface{}, fallback types.ThemeColors) types.ThemeColors {	if v, ok := colors["primary"].(string); ok {
		fallback.Primary = v
	}
	if v, ok := colors["bgBase"].(string); ok {
		fallback.BgBase = v
	}
	if v, ok := colors["bgCard"].(string); ok {
		fallback.BgCard = v
	}
	if v, ok := colors["textPrimary"].(string); ok {
		fallback.TextPrimary = v
	}
	if v, ok := colors["textSecondary"].(string); ok {
		fallback.TextSecondary = v
	}
	if v, ok := colors["border"].(string); ok {
		fallback.Border = v
	}
	return fallback
}

// strFromMap 从 map 读取字符串，空值回退 fallback
func strFromMap(m map[string]interface{}, key, fallback string) string {
	if v, ok := m[key].(string); ok && v != "" {
		return v
	}
	return fallback
}

// boolFromMap 从 map 读取布尔值，缺省回退 fallback
func boolFromMap(m map[string]interface{}, key string, fallback bool) bool {
	if v, ok := m[key].(bool); ok {
		return v
	}
	return fallback
}

// SaveThemeConfig 保存主题配置
func SaveThemeConfig(config types.ThemeConfig) error {
	configMap, err := buildThemeConfigMap(config)
	if err != nil {
		return err
	}
	return database.SaveThemeConfig(configMap)
}

// buildThemeConfigMap 校验、净化并转换为存储 map（保存/方案/导入共用同一校验标准）
func buildThemeConfigMap(config types.ThemeConfig) (map[string]interface{}, error) {
	// 1. 校验配置有效性
	if err := validateThemeConfig(&config); err != nil {
		return nil, fmt.Errorf("配置校验失败: %w", err)
	}
	
	// 2. 净化自定义CSS
	sanitizedCSS, err := sanitizeCustomCSS(config.CustomCSS)
	if err != nil {
		return nil, fmt.Errorf("自定义CSS校验失败: %w", err)
	}
	config.CustomCSS = sanitizedCSS

	// 2.5 净化夜间自定义CSS
	sanitizedDarkCSS, err := sanitizeCustomCSS(config.DarkTheme.CustomCSS)
	if err != nil {
		return nil, fmt.Errorf("夜间自定义CSS校验失败: %w", err)
	}
	config.DarkTheme.CustomCSS = sanitizedDarkCSS

	// 3. 设置版本号
	config.Version = "1.0"

	// 3.5 背景模式归一化：颜色与图片二选一；未显式选择时按是否已有图片推断（兼容旧数据）
	if config.PageBg.Mode == "" {
		if config.PageBg.Image != "" {
			config.PageBg.Mode = "image"
		} else {
			config.PageBg.Mode = "color"
		}
	}

	// 4. 转换为map存储
	configMap := map[string]interface{}{
		"version": config.Version,
		"colors": map[string]interface{}{
			"primary":       config.Colors.Primary,
			"bgBase":        config.Colors.BgBase,
			"bgCard":        config.Colors.BgCard,
			"textPrimary":   config.Colors.TextPrimary,
			"textSecondary": config.Colors.TextSecondary,
			"border":        config.Colors.Border,
		},

		"layout": map[string]interface{}{
			"cardBorderRadius": config.Layout.CardBorderRadius,
			"cardShadow":       config.Layout.CardShadow,
			"cardPadding":      config.Layout.CardPadding,
			"cardGap":          config.Layout.CardGap,
		},
		"typography": map[string]interface{}{
			"titleFontSize":   config.Typography.TitleFontSize,
			"titleFontWeight": config.Typography.TitleFontWeight,
			"descFontSize":    config.Typography.DescFontSize,
		},
		"customCSS": config.CustomCSS,
		"nightMode": map[string]interface{}{
			"mode":  config.NightMode.Mode,
			"start": config.NightMode.Start,
			"end":   config.NightMode.End,
		},
		"darkTheme": map[string]interface{}{
			"colors": map[string]interface{}{
				"primary":       config.DarkTheme.Colors.Primary,
				"bgBase":        config.DarkTheme.Colors.BgBase,
				"bgCard":        config.DarkTheme.Colors.BgCard,
				"textPrimary":   config.DarkTheme.Colors.TextPrimary,
				"textSecondary": config.DarkTheme.Colors.TextSecondary,
				"border":        config.DarkTheme.Colors.Border,
			},
			"customCSS": config.DarkTheme.CustomCSS,
		},
		"font": map[string]interface{}{
			"family":       config.Font.Family,
			"baseFontSize": config.Font.BaseFontSize,
		},
		"radius": map[string]interface{}{
			"style": config.Radius.Style,
		},
		"topbar": map[string]interface{}{
			"background": config.Topbar.Background,
			"textColor":  config.Topbar.TextColor,
			"blur":       config.Topbar.Blur,
			"height":     config.Topbar.Height,
		},
		"pageBg": map[string]interface{}{
			"mode":       config.PageBg.Mode,
			"gradientTo": config.PageBg.GradientTo,
			"image":      config.PageBg.Image,
			"dimOpacity": config.PageBg.DimOpacity,
		},
		"cardExtra": map[string]interface{}{
			"logoRadius":      config.CardExtra.LogoRadius,
			"logoSize":        config.CardExtra.LogoSize,
			"titleColor":      config.CardExtra.TitleColor,
			"hoverLift":       config.CardExtra.HoverLift,
			"outline":         config.CardExtra.Outline,
			"height":          config.CardExtra.Height,
			"showLogo":        config.CardExtra.ShowLogo,
			"showTitle":       config.CardExtra.ShowTitle,
			"showDesc":        config.CardExtra.ShowDesc,
			"showTag":         config.CardExtra.ShowTag,
			"bgOpacity":       config.CardExtra.BgOpacity,
			"titleFontFamily": config.CardExtra.TitleFontFamily,
			"descFontFamily":  config.CardExtra.DescFontFamily,
			"descColor":       config.CardExtra.DescColor,
			"tagColor":        config.CardExtra.TagColor,
			"tagBg":           config.CardExtra.TagBg,
			"tagRadius":       config.CardExtra.TagRadius,
			"borderColor":     config.CardExtra.BorderColor,
		},
		"linkBtn": map[string]interface{}{
			"linkColor":    config.LinkBtn.LinkColor,
			"buttonRadius": config.LinkBtn.ButtonRadius,
		},
		"footer": map[string]interface{}{
			"textColor": config.Footer.TextColor,
			"bgColor":   config.Footer.BgColor,
			"hidden":    config.Footer.Hidden,
			"text":      config.Footer.Text,
			"fontFamily": config.Footer.FontFamily,
		},
		"search": map[string]interface{}{
			"hidden":           config.Search.Hidden,
			"position":         config.Search.Position,
			"width":            config.Search.Width,
			"vertical":         config.Search.Vertical,
			"height":           config.Search.Height,
			"radius":           config.Search.Radius,
			"transparent":      config.Search.Transparent,
			"textColor":        config.Search.TextColor,
			"placeholderColor": config.Search.PlaceholderColor,
			"placeholder":      config.Search.Placeholder,
			"fontFamily":       config.Search.FontFamily,
			"fontSize":         config.Search.FontSize,
		},
		"tag": map[string]interface{}{
			"hidden":      config.Tag.Hidden,
			"position":    config.Tag.Position,
			"transparent": config.Tag.Transparent,
			"bg":          config.Tag.Bg,
			"activeBg":    config.Tag.ActiveBg,
			"textColor":   config.Tag.TextColor,
			"radius":      config.Tag.Radius,
			"fontFamily":  config.Tag.FontFamily,
			"fontSize":    config.Tag.FontSize,
		},
	}
	
	return configMap, nil
}

// ListThemePresets 主题方案列表（config 已解析为 map）
func ListThemePresets() ([]map[string]interface{}, error) {
	presets, err := database.ListThemePresets()
	if err != nil {
		return nil, err
	}
	result := []map[string]interface{}{}
	for _, p := range presets {
		var config map[string]interface{}
		if err := json.Unmarshal([]byte(p.ConfigJSON), &config); err != nil {
			return nil, fmt.Errorf("解析主题方案配置失败: %w", err)
		}
		result = append(result, map[string]interface{}{
			"id":        p.ID,
			"name":      p.Name,
			"config":    config,
			"updatedAt": p.UpdatedAt,
		})
	}
	return result, nil
}

// SaveThemePreset 保存主题方案（与主配置同校验标准）
func SaveThemePreset(id int64, name string, config types.ThemeConfig) (int64, error) {
	if strings.TrimSpace(name) == "" {
		return 0, fmt.Errorf("方案名称不能为空")
	}
	configMap, err := buildThemeConfigMap(config)
	if err != nil {
		return 0, err
	}
	configJSON, err := json.Marshal(configMap)
	if err != nil {
		return 0, fmt.Errorf("序列化主题方案失败: %w", err)
	}
	return database.SaveThemePreset(database.ThemePreset{ID: id, Name: name, ConfigJSON: string(configJSON)})
}

// ApplyThemePreset 将方案应用为当前主题配置
func ApplyThemePreset(id int64) error {
	preset, err := database.GetThemePreset(id)
	if err != nil {
		return err
	}
	var configMap map[string]interface{}
	if err := json.Unmarshal([]byte(preset.ConfigJSON), &configMap); err != nil {
		return fmt.Errorf("解析主题方案配置失败: %w", err)
	}
	return database.SaveThemeConfig(configMap)
}

// DeleteThemePreset 删除主题方案
func DeleteThemePreset(id int64) error {
	return database.DeleteThemePreset(id)
}

// ExportThemeConfig 导出当前主题配置（原始 map，便于 JSON 分享）
func ExportThemeConfig() (map[string]interface{}, error) {
	return database.GetThemeConfig()
}

// ImportThemeConfig 导入主题配置（与主配置同校验标准）
func ImportThemeConfig(config types.ThemeConfig) error {
	configMap, err := buildThemeConfigMap(config)
	if err != nil {
		return err
	}
	return database.SaveThemeConfig(configMap)
}

// ResetThemeConfig 重置主题配置为默认值
func ResetThemeConfig() error {
	return database.DeleteThemeConfig()
}

// GetThemeConfigAsMap 获取主题配置（map格式，用于导出）
func GetThemeConfigAsMap() (map[string]interface{}, error) {
	return database.GetThemeConfig()
}
