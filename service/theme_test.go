package service

import (
	"strings"
	"testing"

	"github.com/mereith/nav/types"
)

func TestDefaultThemeConfigNightMode(t *testing.T) {
	config := getDefaultThemeConfig()
	if config.NightMode.Mode != "system" {
		t.Errorf("默认夜间策略应为 system, got %q", config.NightMode.Mode)
	}
	if config.NightMode.Start != "18:00" || config.NightMode.End != "08:00" {
		t.Errorf("默认夜间窗口应为 18:00-08:00, got %s-%s", config.NightMode.Start, config.NightMode.End)
	}
	if config.DarkTheme.Colors.BgCard == "" {
		t.Errorf("默认夜间卡片背景色不应为空")
	}
}

func TestValidateThemeConfigNightMode(t *testing.T) {
	base := getDefaultThemeConfig()

	// 合法：三种种策略均应通过
	for _, mode := range []string{"system", "scheduled", "off"} {
		c := base
		c.NightMode.Mode = mode
		if err := validateThemeConfig(&c); err != nil {
			t.Errorf("策略 %q 应合法, got %v", mode, err)
		}
	}

	// 非法策略
	c := base
	c.NightMode.Mode = "always"
	if err := validateThemeConfig(&c); err == nil {
		t.Errorf("策略 always 应被拒绝")
	}

	// scheduled 缺时间窗口应被拒绝
	c = base
	c.NightMode.Mode = "scheduled"
	c.NightMode.Start = ""
	c.NightMode.End = ""
	if err := validateThemeConfig(&c); err == nil {
		t.Errorf("scheduled 缺时间窗口应被拒绝")
	}

	// scheduled 时间格式非法应被拒绝
	c = base
	c.NightMode.Mode = "scheduled"
	c.NightMode.Start = "18:0"
	if err := validateThemeConfig(&c); err == nil {
		t.Errorf("非法时间格式应被拒绝")
	}

	// scheduled 合法跨午夜窗口应通过
	c = base
	c.NightMode.Mode = "scheduled"
	c.NightMode.Start = "18:00"
	c.NightMode.End = "08:00"
	if err := validateThemeConfig(&c); err != nil {
		t.Errorf("跨午夜窗口应合法, got %v", err)
	}
}

func TestValidateThemeConfigDarkColors(t *testing.T) {
	base := getDefaultThemeConfig()
	c := base
	c.DarkTheme.Colors.BgCard = "not-a-color"
	if err := validateThemeConfig(&c); err == nil {
		t.Errorf("夜间卡片背景色非法值应被拒绝")
	}
}

func TestColorsFromMap(t *testing.T) {
	fallback := types.ThemeColors{Primary: "#111111", BgBase: "#222222", BgCard: "#333333",
		TextPrimary: "#444444", TextSecondary: "#555555", Border: "#666666"}
	got := colorsFromMap(map[string]interface{}{
		"primary": "#abcdef",
		"bgBase":  "#123456",
	}, fallback)
	if got.Primary != "#abcdef" || got.BgBase != "#123456" {
		t.Errorf("map 字段应覆盖 fallback, got %+v", got)
	}
	if got.BgCard != "#333333" || got.Border != "#666666" {
		t.Errorf("缺失字段应保留 fallback, got %+v", got)
	}
}

func TestSanitizeCustomCSSNightTheme(t *testing.T) {
	if _, err := sanitizeCustomCSS(""); err != nil {
		t.Errorf("空 CSS 应合法: %v", err)
	}
	_, err := sanitizeCustomCSS("body { background: url(https://evil.com/x.png); }")
	if err == nil || !strings.Contains(err.Error(), "url()") {
		t.Errorf("外部 url() 应被拒绝, got %v", err)
	}
}

func TestValidateThemeConfigExtended(t *testing.T) {
	base := getDefaultThemeConfig()

	// 默认值应整体合法
	if err := validateThemeConfig(&base); err != nil {
		t.Errorf("默认扩展配置应合法, got %v", err)
	}

	// 圆角风格非法
	c := base
	c.Radius.Style = "huge"
	if err := validateThemeConfig(&c); err == nil {
		t.Errorf("非法圆角风格应被拒绝")
	}

	// 顶栏背景色非法
	c = base
	c.Topbar.Background = "#zzz"
	if err := validateThemeConfig(&c); err == nil {
		t.Errorf("非法顶栏背景色应被拒绝")
	}

	// 顶栏 transparent 合法
	c = base
	c.Topbar.Background = "transparent"
	if err := validateThemeConfig(&c); err != nil {
		t.Errorf("transparent 顶栏应合法, got %v", err)
	}

	// 背景图协议非法
	c = base
	c.PageBg.Image = "https://evil.com/bg.png"
	if err := validateThemeConfig(&c); err == nil {
		t.Errorf("外部背景图应被拒绝")
	}

	// data: 背景图合法
	c = base
	c.PageBg.Image = "data:image/png;base64,iVBORw0KGgo="
	if err := validateThemeConfig(&c); err != nil {
		t.Errorf("data: 背景图应合法, got %v", err)
	}

	// 遮罩透明度非法
	c = base
	c.PageBg.DimOpacity = "1.5"
	if err := validateThemeConfig(&c); err == nil {
		t.Errorf("超范围遮罩透明度应被拒绝")
	}

	// 字号非法
	c = base
	c.Font.BaseFontSize = "big"
	if err := validateThemeConfig(&c); err == nil {
		t.Errorf("非法字号应被拒绝")
	}
}
