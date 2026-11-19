package service

import (
	"testing"

	"github.com/mereith/nav/database"
)

func TestGetSettingIncludesLanguage(t *testing.T) {
	database.InitDB()
	setting, err := GetSetting()
	if err != nil {
		t.Fatalf("GetSetting failed: %v", err)
	}
	if setting.Language != "zh-CN" {
		t.Errorf("expected default language 'zh-CN', got '%s'", setting.Language)
	}
}

func TestUpdateSettingLanguage(t *testing.T) {
	database.InitDB()
	setting, err := GetSetting()
	if err != nil {
		t.Fatalf("GetSetting failed: %v", err)
	}
	// Save original
	origLang := setting.Language

	// Update to en-US
	setting.Language = "en-US"
	err = UpdateSetting(setting)
	if err != nil {
		t.Fatalf("UpdateSetting failed: %v", err)
	}

	updated, err := GetSetting()
	if err != nil {
		t.Fatalf("GetSetting failed: %v", err)
	}
	if updated.Language != "en-US" {
		t.Errorf("expected 'en-US', got '%s'", updated.Language)
	}

	// Restore
	setting.Language = origLang
	UpdateSetting(setting)
}

func TestLanguageWhitelistRejectsInvalid(t *testing.T) {
	database.InitDB()
	setting, err := GetSetting()
	if err != nil {
		t.Fatalf("GetSetting failed: %v", err)
	}
	origLang := setting.Language

	// Try invalid language
	setting.Language = "fr-FR"
	err = UpdateSetting(setting)
	if err != nil {
		t.Fatalf("UpdateSetting failed: %v", err)
	}

	updated, err := GetSetting()
	if err != nil {
		t.Fatalf("GetSetting failed: %v", err)
	}
	if updated.Language != "zh-CN" {
		t.Errorf("expected 'zh-CN' (whitelist fallback), got '%s'", updated.Language)
	}

	// Restore
	setting.Language = origLang
	UpdateSetting(setting)
}

func TestGetSettingIconFallback(t *testing.T) {
	database.InitDB()
	orig, err := GetSetting()
	if err != nil {
		t.Fatalf("GetSetting failed: %v", err)
	}
	// 图标清空后保存（非必填），读取时应回退系统默认
	setting := orig
	setting.Favicon = ""
	setting.Logo192 = ""
	setting.Logo512 = ""
	if err := UpdateSetting(setting); err != nil {
		t.Fatalf("UpdateSetting failed: %v", err)
	}
	got, err := GetSetting()
	if err != nil {
		t.Fatalf("GetSetting failed: %v", err)
	}
	if got.Favicon != "favicon.ico" || got.Logo192 != "logo192.png" || got.Logo512 != "logo512.png" {
		t.Errorf("空图标应回退系统默认, got favicon=%q logo192=%q logo512=%q", got.Favicon, got.Logo192, got.Logo512)
	}
	// 恢复原值，避免影响其他用例
	_ = UpdateSetting(orig)
}
