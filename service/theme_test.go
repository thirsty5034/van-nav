package service

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/mereith/nav/database"
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

// ==================== 搜索框/分类标签/卡片扩展（定稿方案 v3） ====================

func TestValidateThemeConfigSearch(t *testing.T) {
	base := getDefaultThemeConfig()

	// 合法：水平位置枚举
	for _, pos := range []string{"left", "center", "right"} {
		c := base
		c.Search.Position = pos
		if err := validateThemeConfig(&c); err != nil {
			t.Errorf("搜索框水平位置 %q 应合法, got %v", pos, err)
		}
	}

	// 非法水平位置
	c := base
	c.Search.Position = "middle"
	if err := validateThemeConfig(&c); err == nil {
		t.Errorf("搜索框水平位置 middle 应被拒绝")
	}

	// 合法：摆放位置枚举
	for _, v := range []string{"top", "bottom"} {
		c := base
		c.Search.Vertical = v
		if err := validateThemeConfig(&c); err != nil {
			t.Errorf("搜索框摆放位置 %q 应合法, got %v", v, err)
		}
	}

	// 非法摆放位置
	c = base
	c.Search.Vertical = "middle"
	if err := validateThemeConfig(&c); err == nil {
		t.Errorf("搜索框摆放位置 middle 应被拒绝")
	}

	// 合法宽度百分比（1-100）
	for _, w := range []string{"1%", "60%", "100%"} {
		c := base
		c.Search.Width = w
		if err := validateThemeConfig(&c); err != nil {
			t.Errorf("搜索框宽度 %q 应合法, got %v", w, err)
		}
	}

	// 非法宽度百分比
	for _, w := range []string{"0%", "101%", "60", "abc%", "-10%"} {
		c := base
		c.Search.Width = w
		if err := validateThemeConfig(&c); err == nil {
			t.Errorf("搜索框宽度 %q 应被拒绝", w)
		}
	}

	// 高度/圆角需为 px 值
	c = base
	c.Search.Height = "40"
	if err := validateThemeConfig(&c); err == nil {
		t.Errorf("搜索框高度缺 px 单位应被拒绝")
	}
	c = base
	c.Search.Radius = "8px"
	if err := validateThemeConfig(&c); err != nil {
		t.Errorf("搜索框圆角 8px 应合法, got %v", err)
	}

	// 文字/提示颜色格式
	c = base
	c.Search.TextColor = "#123456"
	c.Search.PlaceholderColor = "#abcdef"
	if err := validateThemeConfig(&c); err != nil {
		t.Errorf("合法搜索框颜色应通过, got %v", err)
	}
	c = base
	c.Search.PlaceholderColor = "red"
	if err := validateThemeConfig(&c); err == nil {
		t.Errorf("非法搜索框提示颜色应被拒绝")
	}

	// 布尔开关不影响合法性
	c = base
	c.Search.Hidden = true
	c.Search.Transparent = true
	if err := validateThemeConfig(&c); err != nil {
		t.Errorf("搜索框布尔开关应合法, got %v", err)
	}
}

func TestValidateThemeConfigTag(t *testing.T) {
	base := getDefaultThemeConfig()

	// 合法：四向贴边枚举
	for _, pos := range []string{"top", "bottom", "left", "right"} {
		c := base
		c.Tag.Position = pos
		if err := validateThemeConfig(&c); err != nil {
			t.Errorf("分类标签位置 %q 应合法, got %v", pos, err)
		}
	}

	// 非法位置
	c := base
	c.Tag.Position = "middle"
	if err := validateThemeConfig(&c); err == nil {
		t.Errorf("分类标签位置 middle 应被拒绝")
	}

	// 颜色与圆角合法值
	c = base
	c.Tag.Bg = "#112233"
	c.Tag.ActiveBg = "#445566"
	c.Tag.TextColor = "#778899"
	c.Tag.Radius = "6px"
	if err := validateThemeConfig(&c); err != nil {
		t.Errorf("合法分类标签配置应通过, got %v", err)
	}

	// 非法底色
	c = base
	c.Tag.Bg = "white"
	if err := validateThemeConfig(&c); err == nil {
		t.Errorf("非法分类标签底色应被拒绝")
	}

	// 圆角仅支持 px，百分比应被拒绝
	c = base
	c.Tag.Radius = "50%"
	if err := validateThemeConfig(&c); err == nil {
		t.Errorf("分类标签圆角百分比应被拒绝")
	}

	// 布尔开关不影响合法性
	c = base
	c.Tag.Hidden = true
	c.Tag.Transparent = true
	if err := validateThemeConfig(&c); err != nil {
		t.Errorf("分类标签布尔开关应合法, got %v", err)
	}
}

func TestValidateThemeConfigCardShowFlags(t *testing.T) {
	base := getDefaultThemeConfig()

	// 展示开关全关仍合法（布尔值本身不做格式校验）
	c := base
	c.CardExtra.ShowLogo = false
	c.CardExtra.ShowTitle = false
	c.CardExtra.ShowDesc = false
	c.CardExtra.ShowTag = false
	if err := validateThemeConfig(&c); err != nil {
		t.Errorf("卡片展示开关全关应合法, got %v", err)
	}

	// 卡片高度 px 校验
	c = base
	c.CardExtra.Height = "120px"
	if err := validateThemeConfig(&c); err != nil {
		t.Errorf("卡片高度 120px 应合法, got %v", err)
	}
	c = base
	c.CardExtra.Height = "tall"
	if err := validateThemeConfig(&c); err == nil {
		t.Errorf("非法卡片高度应被拒绝")
	}

	// 底色透明度 0-1
	c = base
	c.CardExtra.BgOpacity = "0.5"
	if err := validateThemeConfig(&c); err != nil {
		t.Errorf("卡片底色透明度 0.5 应合法, got %v", err)
	}
	c = base
	c.CardExtra.BgOpacity = "1.5"
	if err := validateThemeConfig(&c); err == nil {
		t.Errorf("超范围卡片底色透明度应被拒绝")
	}
}

func TestThemeConfigSearchTagRoundTrip(t *testing.T) {
	database.InitDB()
	defer database.DeleteThemeConfig()

	base := getDefaultThemeConfig()
	base.Search.Hidden = true
	base.Search.Position = "left"
	base.Search.Width = "80%"
	base.Search.Vertical = "bottom"
	base.Search.Height = "48px"
	base.Search.Radius = "12px"
	base.Search.Transparent = true
	base.Search.TextColor = "#123456"
	base.Search.PlaceholderColor = "#654321"
	base.Search.Placeholder = "搜索站点"
	base.Tag.Hidden = true
	base.Tag.Position = "left"
	base.Tag.Transparent = true
	base.Tag.Bg = "#112233"
	base.Tag.ActiveBg = "#445566"
	base.Tag.TextColor = "#778899"
	base.Tag.Radius = "6px"
	base.CardExtra.Height = "120px"
	base.CardExtra.ShowLogo = false
	base.CardExtra.ShowTitle = false
	base.CardExtra.ShowDesc = false
	base.CardExtra.ShowTag = false
	base.CardExtra.BgOpacity = "0.5"
	base.Footer.Text = "备案信息"

	if err := SaveThemeConfig(base); err != nil {
		t.Fatalf("保存主题配置失败: %v", err)
	}
	got, err := GetThemeConfig()
	if err != nil {
		t.Fatalf("读取主题配置失败: %v", err)
	}

	if got.Search.Position != "left" || got.Search.Width != "80%" || got.Search.Vertical != "bottom" ||
		got.Search.Height != "48px" || got.Search.Radius != "12px" || !got.Search.Hidden ||
		!got.Search.Transparent || got.Search.TextColor != "#123456" ||
		got.Search.PlaceholderColor != "#654321" || got.Search.Placeholder != "搜索站点" {
		t.Errorf("搜索框配置往返不一致, got %+v", got.Search)
	}
	if got.Tag.Position != "left" || !got.Tag.Hidden || !got.Tag.Transparent ||
		got.Tag.Bg != "#112233" || got.Tag.ActiveBg != "#445566" ||
		got.Tag.TextColor != "#778899" || got.Tag.Radius != "6px" {
		t.Errorf("分类标签配置往返不一致, got %+v", got.Tag)
	}
	if got.CardExtra.Height != "120px" || got.CardExtra.ShowLogo || got.CardExtra.ShowTitle ||
		got.CardExtra.ShowDesc || got.CardExtra.ShowTag || got.CardExtra.BgOpacity != "0.5" {
		t.Errorf("卡片扩展配置往返不一致, got %+v", got.CardExtra)
	}
	if got.Footer.Text != "备案信息" {
		t.Errorf("页脚文案往返不一致, got %q", got.Footer.Text)
	}
}

func TestGetThemeConfigLegacyFallback(t *testing.T) {
	database.InitDB()
	defer database.DeleteThemeConfig()

	// 旧版配置 JSON：无 search/tag/cardExtra 扩展与 footer.text 字段
	legacyJSON := `{"version":"1.0","colors":{"primary":"#1677ff","bgBase":"#f5f5f5","bgCard":"#ffffff","textPrimary":"#000000e0","textSecondary":"#000000a6","border":"#d9d9d9"},"layout":{"cardBorderRadius":"8px","cardShadow":"0 1px 2px rgba(0,0,0,0.03)","cardPadding":"16px","cardGap":"16px"},"typography":{"titleFontSize":"15px","titleFontWeight":"600","descFontSize":"13px"},"customCSS":"","nightMode":{"mode":"system","start":"18:00","end":"08:00"}}`
	var legacy map[string]interface{}
	if err := json.Unmarshal([]byte(legacyJSON), &legacy); err != nil {
		t.Fatalf("解析旧配置失败: %v", err)
	}
	if err := database.SaveThemeConfig(legacy); err != nil {
		t.Fatalf("写入旧配置失败: %v", err)
	}

	got, err := GetThemeConfig()
	if err != nil {
		t.Fatalf("读取主题配置失败: %v", err)
	}

	// 搜索框应回退文档默认值
	if got.Search.Hidden || got.Search.Position != "center" || got.Search.Width != "60%" ||
		got.Search.Vertical != "top" || got.Search.Height != "40px" || got.Search.Radius != "8px" ||
		got.Search.Transparent {
		t.Errorf("旧数据搜索框应回退默认值, got %+v", got.Search)
	}
	// 分类标签应回退文档默认值
	if got.Tag.Hidden || got.Tag.Position != "top" || got.Tag.Transparent {
		t.Errorf("旧数据分类标签应回退默认值, got %+v", got.Tag)
	}
	// 卡片展示开关应默认全开，新字段为空
	if !got.CardExtra.ShowLogo || !got.CardExtra.ShowTitle || !got.CardExtra.ShowDesc || !got.CardExtra.ShowTag {
		t.Errorf("旧数据卡片展示开关应默认全开, got %+v", got.CardExtra)
	}
	if got.CardExtra.Height != "" || got.CardExtra.BgOpacity != "" {
		t.Errorf("旧数据卡片高度/透明度应为空, got %+v", got.CardExtra)
	}
	if got.Footer.Text != "" {
		t.Errorf("旧数据页脚文案应为空, got %q", got.Footer.Text)
	}
}

// TestSanitizeCustomCSSImportNoWhitespace 验证无空白 @import 写法被拒绝（评审 I3）
func TestSanitizeCustomCSSImportNoWhitespace(t *testing.T) {
	cases := []string{
		`@import"//evil.com/x.css";`,
		`@import url("//evil.com/x.css");`,
		`@IMPORT "//evil.com/x.css";`,
	}
	for _, css := range cases {
		if _, err := sanitizeCustomCSS(css); err == nil {
			t.Errorf("危险 CSS %q 应被拒绝", css)
		}
	}
	// 正常 CSS 应通过
	if _, err := sanitizeCustomCSS(`.card-box { color: #333; }`); err != nil {
		t.Errorf("正常 CSS 不应被拒绝: %v", err)
	}
}

// TestBuildThemeConfigMapLegacyPayloadCompat 验证旧版最小载荷可保存且新字段补默认（评审 I1）
func TestBuildThemeConfigMapLegacyPayloadCompat(t *testing.T) {
	database.InitDB()
	defer database.DeleteThemeConfig()

	legacy := getDefaultThemeConfig()
	// 模拟旧版前端：只填 colors/layout/typography/customCSS，夜间模式与暗色主题全部零值
	legacy.NightMode = types.NightModeConfig{}
	legacy.DarkTheme = types.DarkThemeConfig{}

	if err := SaveThemeConfig(legacy); err != nil {
		t.Fatalf("旧版最小载荷应可保存, got %v", err)
	}
	got, err := GetThemeConfig()
	if err != nil {
		t.Fatalf("读取主题配置失败: %v", err)
	}
	if got.NightMode.Mode != "system" || got.NightMode.Start != "18:00" || got.NightMode.End != "08:00" {
		t.Errorf("旧载荷夜间模式应补默认值, got %+v", got.NightMode)
	}
	dark := getDefaultDarkTheme().Colors
	if got.DarkTheme.Colors.Primary != dark.Primary || got.DarkTheme.Colors.BgBase != dark.BgBase ||
		got.DarkTheme.Colors.BgCard != dark.BgCard {
		t.Errorf("旧载荷暗色主题应补默认值, got %+v, want %+v", got.DarkTheme.Colors, dark)
	}
}

// TestApplyThemePresetSanitizesAndValidates 验证 apply 走统一校验/消毒入口（评审 I2）
func TestApplyThemePresetSanitizesAndValidates(t *testing.T) {
	database.InitDB()
	defer database.DeleteThemeConfig()

	// 1. 正常方案：apply 后主配置应更新
	preset := getDefaultThemeConfig()
	preset.CustomCSS = ".card-box { border-radius: 12px; }"
	presetID, err := SaveThemePreset(0, "正常方案", preset)
	if err != nil {
		t.Fatalf("保存方案失败: %v", err)
	}
	defer database.DeleteThemePreset(presetID)
	if err := ApplyThemePreset(presetID); err != nil {
		t.Fatalf("应用正常方案不应报错: %v", err)
	}
	got, err := GetThemeConfig()
	if err != nil {
		t.Fatalf("读取主配置失败: %v", err)
	}
	if got.CustomCSS != preset.CustomCSS {
		t.Errorf("应用方案后主配置 CSS 应更新, got %q", got.CustomCSS)
	}

	// 2. 历史脏方案（含危险 CSS，绕过 service 直写库）：apply 应被拒绝且主配置不被污染
	dirtyJSON := `{"version":"1.0","customCSS":"@import\"//evil.com/x.css\";"}`
	res, err := database.DB.Exec(
		`INSERT INTO nav_theme_presets (name, config_json, created_at, updated_at) VALUES ('脏方案', ?, datetime('now'), datetime('now'))`,
		dirtyJSON,
	)
	if err != nil {
		t.Fatalf("写入脏方案失败: %v", err)
	}
	dirtyID, err := res.LastInsertId()
	if err != nil {
		t.Fatalf("获取脏方案ID失败: %v", err)
	}
	defer database.DeleteThemePreset(dirtyID)

	before, err := GetThemeConfig()
	if err != nil {
		t.Fatalf("读取主配置失败: %v", err)
	}
	if err := ApplyThemePreset(dirtyID); err == nil {
		t.Errorf("含危险 CSS 的方案 apply 应被拒绝")
	}
	after, err := GetThemeConfig()
	if err != nil {
		t.Fatalf("读取主配置失败: %v", err)
	}
	if after.CustomCSS != before.CustomCSS {
		t.Errorf("apply 被拒后主配置不应变化, before %q after %q", before.CustomCSS, after.CustomCSS)
	}
}

// TestSaveThemePresetUpdateNonexistent 验证更新不存在的方案返回明确错误（评审 I4）
func TestSaveThemePresetUpdateNonexistent(t *testing.T) {
	database.InitDB()
	defer database.DeleteThemeConfig()

	base := getDefaultThemeConfig()
	if _, err := SaveThemePreset(999999, "幽灵方案", base); err != ErrThemePresetNotFound {
		t.Errorf("更新不存在的方案应返回 ErrThemePresetNotFound, got %v", err)
	}
}
