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
