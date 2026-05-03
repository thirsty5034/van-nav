package service

import (
	"github.com/mereith/nav/database"
	"github.com/mereith/nav/logger"
	"github.com/mereith/nav/types"
)

func GetSiteConfig() types.SiteConfig {
	sql_get_site_config := `
		SELECT id, noImageMode, compactMode, faviconApiEnabled, faviconApiTemplate 
		FROM nav_site_config 
		ORDER BY id ASC 
		LIMIT 1;
		`
	var siteConfig types.SiteConfig
	row := database.DB.QueryRow(sql_get_site_config)
	var noImageMode, compactMode, faviconApiEnabled interface{}
	var faviconApiTemplate interface{}
	err := row.Scan(&siteConfig.Id, &noImageMode, &compactMode, &faviconApiEnabled, &faviconApiTemplate)
	if err != nil {
		logger.LogError("获取网站配置失败: %s", err)
		return types.SiteConfig{
			Id:                  1,
			NoImageMode:         false,
			CompactMode:         false,
			FaviconApiEnabled:   false,
			FaviconApiTemplate:  "https://favicon.im/{domain}",
		}
	}

	if noImageMode == nil {
		siteConfig.NoImageMode = false
	} else {
		if noImageMode.(int64) == 0 {
			siteConfig.NoImageMode = false
		} else {
			siteConfig.NoImageMode = true
		}
	}

	if compactMode == nil {
		siteConfig.CompactMode = false
	} else {
		if compactMode.(int64) == 0 {
			siteConfig.CompactMode = false
		} else {
			siteConfig.CompactMode = true
		}
	}

	if faviconApiEnabled == nil {
		siteConfig.FaviconApiEnabled = false
	} else {
		if faviconApiEnabled.(int64) == 0 {
			siteConfig.FaviconApiEnabled = false
		} else {
			siteConfig.FaviconApiEnabled = true
		}
	}

	if faviconApiTemplate == nil {
		siteConfig.FaviconApiTemplate = "https://favicon.im/{domain}"
	} else {
		siteConfig.FaviconApiTemplate = faviconApiTemplate.(string)
	}

	return siteConfig
}

func UpdateSiteConfig(data types.SiteConfig) error {
	sql_update_site_config := `
		UPDATE nav_site_config
		SET noImageMode = ?, compactMode = ?, faviconApiEnabled = ?, faviconApiTemplate = ?
		WHERE id = (SELECT id FROM nav_site_config ORDER BY id ASC LIMIT 1);
		`

	stmt, err := database.DB.Prepare(sql_update_site_config)
	if err != nil {
		return err
	}
	res, err := stmt.Exec(data.NoImageMode, data.CompactMode, data.FaviconApiEnabled, data.FaviconApiTemplate)
	if err != nil {
		return err
	}
	_, err = res.RowsAffected()
	if err != nil {
		return err
	}
	return nil
}