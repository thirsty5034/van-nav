package service

import (
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

	return &config, nil
}

// isValidNightModeMode 夜间模式策略合法性
func isValidNightModeMode(mode string) bool {
	return mode == "system" || mode == "scheduled" || mode == "off"
}

// colorsFromMap 从 map 解析颜色配置，缺省字段回退 fallback
func colorsFromMap(colors map[string]interface{}, fallback types.ThemeColors) types.ThemeColors {
	if v, ok := colors["primary"].(string); ok {
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

// SaveThemeConfig 保存主题配置
func SaveThemeConfig(config types.ThemeConfig) error {
	// 1. 校验配置有效性
	if err := validateThemeConfig(&config); err != nil {
		return fmt.Errorf("配置校验失败: %w", err)
	}
	
	// 2. 净化自定义CSS
	sanitizedCSS, err := sanitizeCustomCSS(config.CustomCSS)
	if err != nil {
		return fmt.Errorf("自定义CSS校验失败: %w", err)
	}
	config.CustomCSS = sanitizedCSS

	// 2.5 净化夜间自定义CSS
	sanitizedDarkCSS, err := sanitizeCustomCSS(config.DarkTheme.CustomCSS)
	if err != nil {
		return fmt.Errorf("夜间自定义CSS校验失败: %w", err)
	}
	config.DarkTheme.CustomCSS = sanitizedDarkCSS

	// 3. 设置版本号
	config.Version = "1.0"

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
	}
	
	// 5. 保存到数据库
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
