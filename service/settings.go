package service

import (
	"github.com/mereith/nav/database"
	"github.com/mereith/nav/types"
)

func GetDeploymentVersion() (string, error) {
	v := database.GetDeploymentVersion()
	return v, nil
}

func IncrementDeploymentVersion() (string, error) {
	return database.IncrementDeploymentVersion()
}

func GetSetting() (types.Setting, error) {
	data, err := database.GetSettingRow()
	if err != nil {
		return data, err
	}
	// 图标允许留空（非必填）：读取时回退系统默认，与前端"留空使用默认"语义一致
	if data.Favicon == "" {
		data.Favicon = "favicon.ico"
	}
	if data.Logo192 == "" {
		data.Logo192 = "logo192.png"
	}
	if data.Logo512 == "" {
		data.Logo512 = "logo512.png"
	}
	return data, nil
}

func UpdateSetting(data types.Setting) error {
	// 站点图标 data:URI 上传校验（类型白名单 / 大小 / 魔数）；历史 URL 与文件名原样放行
	if err := ValidateDataURLImage("Favicon", data.Favicon, "png/jpeg/webp/ico", 200, webIconImageMIMEs); err != nil {
		return err
	}
	if err := ValidateDataURLImage("Logo192", data.Logo192, "png/jpeg/webp/ico", 200, webIconImageMIMEs); err != nil {
		return err
	}
	if err := ValidateDataURLImage("Logo512", data.Logo512, "png/jpeg/webp/ico", 200, webIconImageMIMEs); err != nil {
		return err
	}
	err := database.UpdateSettingRow(data)
	if err == nil {
		InvalidateAllDataCache()
	}
	return err
}

func UpdateLanguage(language string) error {
	err := database.UpdateSettingLanguage(language)
	if err == nil {
		InvalidateAllDataCache()
	}
	return err
}

// SyncDeploymentVersion 启动时同步部署版本号到数据库
func SyncDeploymentVersion(version string) {
	database.SyncDeploymentVersion(version)
}
