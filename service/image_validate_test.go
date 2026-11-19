package service

import (
	"encoding/base64"
	"strings"
	"testing"
)

func pngDataURI(size int) string {
	raw := make([]byte, size)
	copy(raw, []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A})
	return "data:image/png;base64," + base64.StdEncoding.EncodeToString(raw)
}

func TestValidateDataURLImageEmptyAndNonData(t *testing.T) {
	if err := ValidateDataURLImage("Favicon", "", "png/jpeg/webp/ico", 200, webIconImageMIMEs); err != nil {
		t.Errorf("空值应放行, got %v", err)
	}
	if err := ValidateDataURLImage("Favicon", "favicon.ico", "png/jpeg/webp/ico", 200, webIconImageMIMEs); err != nil {
		t.Errorf("历史文件名应放行, got %v", err)
	}
	if err := ValidateDataURLImage("Favicon", "https://example.com/a.png", "png/jpeg/webp/ico", 200, webIconImageMIMEs); err != nil {
		t.Errorf("历史 URL 应放行, got %v", err)
	}
}

func TestValidateDataURLImageAcceptsPNG(t *testing.T) {
	if err := ValidateDataURLImage("Favicon", pngDataURI(1024), "png/jpeg/webp/ico", 200, webIconImageMIMEs); err != nil {
		t.Errorf("合法 png data:URI 应通过, got %v", err)
	}
}

func TestValidateDataURLImageRejectsBad(t *testing.T) {
	cases := []struct {
		name  string
		value string
	}{
		{"非图片 data:", "data:text/plain;base64,QQ=="},
		{"空 payload", "data:image/png;base64,"},
		{"无 payload 分隔", "data:image/png;base64"},
		{"声明类型不在白名单", "data:image/gif;base64,R0lGODlhAQABAAAAADs="},
		{"类型与内容不一致", "data:image/png;base64," + base64.StdEncoding.EncodeToString([]byte("<html>hi</html>"))},
		{"超过大小上限", pngDataURI(201 * 1024)},
	}
	for _, c := range cases {
		if err := ValidateDataURLImage("Favicon", c.value, "png/jpeg/webp/ico", 200, webIconImageMIMEs); err == nil {
			t.Errorf("%s 应被拒绝", c.name)
		}
	}
}

func TestValidateThemeConfigPageBgImage(t *testing.T) {
	base := getDefaultThemeConfig()

	// 合法 png data:URI
	c := base
	c.PageBg.Image = pngDataURI(1024)
	if err := validateThemeConfig(&c); err != nil {
		t.Errorf("合法背景图应通过, got %v", err)
	}

	// 站内路径放行
	c = base
	c.PageBg.Image = "/bg.webp"
	if err := validateThemeConfig(&c); err != nil {
		t.Errorf("站内路径背景图应通过, got %v", err)
	}

	// 超过 500KB 拒绝
	c = base
	c.PageBg.Image = pngDataURI(501 * 1024)
	if err := validateThemeConfig(&c); err == nil {
		t.Errorf("超过 500KB 的背景图应被拒绝")
	}

	// svg data:URI 拒绝
	c = base
	c.PageBg.Image = "data:image/svg+xml;base64," + base64.StdEncoding.EncodeToString([]byte("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))
	if err := validateThemeConfig(&c); err == nil {
		t.Errorf("svg 背景图应被拒绝")
	}

	// 外链拒绝
	c = base
	c.PageBg.Image = "https://evil.com/bg.png"
	if err := validateThemeConfig(&c); err == nil {
		t.Errorf("外部背景图应被拒绝")
	}
}

func TestUpdateSettingRejectsOversizeFavicon(t *testing.T) {
	// 不依赖数据库：校验失败应在写库前返回
	err := ValidateDataURLImage("Favicon", pngDataURI(201*1024), "png/jpeg/webp/ico", 200, webIconImageMIMEs)
	if err == nil || !strings.Contains(err.Error(), "200KB") {
		t.Errorf("超 200KB favicon 应被拒绝并提示大小, got %v", err)
	}
}
