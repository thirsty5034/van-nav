package database

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/mereith/nav/types"
)

func HasApiToken(token string) bool {
	sql := `SELECT value FROM nav_api_token WHERE value = ? and disabled = 0`
	rows, err := DB.Query(sql, token)
	if err != nil {
		return false
	}
	defer rows.Close()

	for rows.Next() {
		return true
	}
	return false
}

// ==================== 搜索引擎相关操作 ====================

// 获取所有搜索引擎（按排序）
func GetAllSearchEngines() ([]types.SearchEngine, error) {
	sql := `SELECT id, name, urlTemplate, logo, sort, enabled, COALESCE(description, '') FROM nav_search_engine ORDER BY sort ASC`
	rows, err := DB.Query(sql)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var engines []types.SearchEngine
	for rows.Next() {
		var engine types.SearchEngine
		err := rows.Scan(&engine.Id, &engine.Name, &engine.UrlTemplate, &engine.Logo, &engine.Sort, &engine.Enabled, &engine.Description)
		if err != nil {
			return nil, err
		}
		engines = append(engines, engine)
	}
	return engines, nil
}

// 获取启用的搜索引擎（按排序）
func GetEnabledSearchEngines() ([]types.SearchEngine, error) {
	sql := `SELECT id, name, urlTemplate, logo, sort, enabled, COALESCE(description, '') FROM nav_search_engine WHERE enabled = 1 ORDER BY sort ASC`
	rows, err := DB.Query(sql)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var engines []types.SearchEngine
	for rows.Next() {
		var engine types.SearchEngine
		err := rows.Scan(&engine.Id, &engine.Name, &engine.UrlTemplate, &engine.Logo, &engine.Sort, &engine.Enabled, &engine.Description)
		if err != nil {
			return nil, err
		}
		engines = append(engines, engine)
	}
	return engines, nil
}

// 添加搜索引擎
func AddSearchEngine(engine types.SearchEngine) (int64, error) {
	var maxSort int
	err := DB.QueryRow(`SELECT COALESCE(MAX(sort), 0) FROM nav_search_engine`).Scan(&maxSort)
	if err != nil {
		return 0, err
	}

	sql := `INSERT INTO nav_search_engine (name, urlTemplate, logo, sort, enabled, description) VALUES (?, ?, ?, ?, ?, ?)`
	stmt, err := DB.Prepare(sql)
	if err != nil {
		return 0, err
	}
	defer stmt.Close()

	result, err := stmt.Exec(engine.Name, engine.UrlTemplate, engine.Logo, maxSort+1, engine.Enabled, engine.Description)
	if err != nil {
		return 0, err
	}

	return result.LastInsertId()
}

// 更新搜索引擎
func UpdateSearchEngine(engine types.SearchEngine) error {
	sql := `UPDATE nav_search_engine SET name = ?, urlTemplate = ?, logo = ?, enabled = ?, description = ? WHERE id = ?`
	stmt, err := DB.Prepare(sql)
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.Exec(engine.Name, engine.UrlTemplate, engine.Logo, engine.Enabled, engine.Description, engine.Id)
	return err
}

// 删除搜索引擎
func DeleteSearchEngine(id int) error {
	sql := `DELETE FROM nav_search_engine WHERE id = ?`
	stmt, err := DB.Prepare(sql)
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.Exec(id)
	return err
}

// 更新搜索引擎排序
func UpdateSearchEngineSort(sortData []struct {
	Id   int `json:"id"`
	Sort int `json:"sort"`
}) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`UPDATE nav_search_engine SET sort = ? WHERE id = ?`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, item := range sortData {
		_, err = stmt.Exec(item.Sort, item.Id)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// 更新分类排序
func UpdateCatelogSort(sortData []struct {
	Id   int `json:"id"`
	Sort int `json:"sort"`
}) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`UPDATE nav_catelog SET sort = ? WHERE id = ?`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, item := range sortData {
		_, err = stmt.Exec(item.Sort, item.Id)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// ==================== 导入导出相关数据库操作 ====================

// 获取所有 API Token
func GetAllTokens() ([]types.Token, error) {
	sql := `SELECT id, name, value, disabled FROM nav_api_token ORDER BY id ASC`
	rows, err := DB.Query(sql)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tokens []types.Token
	for rows.Next() {
		var token types.Token
		err := rows.Scan(&token.Id, &token.Name, &token.Value, &token.Disabled)
		if err != nil {
			return nil, err
		}
		tokens = append(tokens, token)
	}
	return tokens, nil
}

// 获取所有分类
func GetAllCatelogs() ([]types.Catelog, error) {
	sql := `SELECT id, name, sort, hide FROM nav_catelog ORDER BY sort ASC`
	rows, err := DB.Query(sql)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var catelogs []types.Catelog
	for rows.Next() {
		var catelog types.Catelog
		var hide interface{}
		var sort interface{}
		err := rows.Scan(&catelog.Id, &catelog.Name, &sort, &hide)
		if err != nil {
			return nil, err
		}
		if hide == nil {
			catelog.Hide = false
		} else {
			catelog.Hide = hide.(int64) == 1
		}
		if sort == nil {
			catelog.Sort = 0
		} else {
			catelog.Sort = int(sort.(int64))
		}
		catelogs = append(catelogs, catelog)
	}
	return catelogs, nil
}

// 获取所有设置（键值对形式）
func GetAllSettings() (map[string]string, error) {
	sql := `SELECT id, favicon, title, govRecord, logo192, logo512, hideAdmin, hideGithub, hideToggleJumpTarget, jumpTargetBlank FROM nav_setting ORDER BY id ASC LIMIT 1`
	row := DB.QueryRow(sql)

	var setting types.Setting
	var hideGithub, hideAdmin, hideToggleJumpTarget, jumpTargetBlank interface{}
	err := row.Scan(&setting.Id, &setting.Favicon, &setting.Title, &setting.GovRecord, &setting.Logo192, &setting.Logo512, &hideAdmin, &hideGithub, &hideToggleJumpTarget, &jumpTargetBlank)
	if err != nil {
		return make(map[string]string), nil
	}

	settings := make(map[string]string)
	settings["favicon"] = setting.Favicon
	settings["title"] = setting.Title
	settings["govRecord"] = setting.GovRecord
	settings["logo192"] = setting.Logo192
	settings["logo512"] = setting.Logo512

	if hideAdmin != nil {
		if hideAdmin.(int64) == 1 {
			settings["hideAdmin"] = "true"
		} else {
			settings["hideAdmin"] = "false"
		}
	} else {
		settings["hideAdmin"] = "false"
	}
	if hideGithub != nil {
		if hideGithub.(int64) == 1 {
			settings["hideGithub"] = "true"
		} else {
			settings["hideGithub"] = "false"
		}
	} else {
		settings["hideGithub"] = "false"
	}
	if hideToggleJumpTarget != nil {
		if hideToggleJumpTarget.(int64) == 1 {
			settings["hideToggleJumpTarget"] = "true"
		} else {
			settings["hideToggleJumpTarget"] = "false"
		}
	} else {
		settings["hideToggleJumpTarget"] = "false"
	}
	if jumpTargetBlank != nil {
		if jumpTargetBlank.(int64) == 1 {
			settings["jumpTargetBlank"] = "true"
		} else {
			settings["jumpTargetBlank"] = "false"
		}
	} else {
		settings["jumpTargetBlank"] = "true"
	}

	return settings, nil
}

// 删除所有工具
func DeleteAllTools() error {
	_, err := DB.Exec(`DELETE FROM nav_table`)
	return err
}

// 删除所有分类
func DeleteAllCatelogs() error {
	_, err := DB.Exec(`DELETE FROM nav_catelog`)
	return err
}

// 删除所有搜索引擎
func DeleteAllSearchEngines() error {
	_, err := DB.Exec(`DELETE FROM nav_search_engine`)
	return err
}

// 批量插入工具
func InsertTools(tools []types.Tool) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`INSERT INTO nav_table (id, name, url, logo, catelog, desc, sort, hide) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, tool := range tools {
		hide := 0
		if tool.Hide {
			hide = 1
		}
		_, err := stmt.Exec(tool.Id, tool.Name, tool.Url, tool.Logo, tool.Catelog, tool.Desc, tool.Sort, hide)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// 批量插入分类
func InsertCatelogs(catelogs []types.Catelog) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`INSERT INTO nav_catelog (id, name, sort, hide) VALUES (?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, catelog := range catelogs {
		hide := 0
		if catelog.Hide {
			hide = 1
		}
		_, err := stmt.Exec(catelog.Id, catelog.Name, catelog.Sort, hide)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// 批量插入搜索引擎
func InsertSearchEngines(engines []types.SearchEngine) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`INSERT INTO nav_search_engine (id, name, urlTemplate, logo, sort, enabled, description) VALUES (?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, engine := range engines {
		enabled := 1
		if !engine.Enabled {
			enabled = 0
		}
		_, err := stmt.Exec(engine.Id, engine.Name, engine.UrlTemplate, engine.Logo, engine.Sort, enabled, engine.Description)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// 检查 Token 是否存在
func TokenExists(name string) bool {
	var count int
	err := DB.QueryRow(`SELECT COUNT(*) FROM nav_api_token WHERE name = ?`, name).Scan(&count)
	if err != nil {
		return false
	}
	return count > 0
}

// 插入 Token
func InsertToken(token types.Token) error {
	_, err := DB.Exec(`INSERT INTO nav_api_token (name, value, disabled) VALUES (?, ?, ?)`, token.Name, token.Value, token.Disabled)
	return err
}

// 更新设置字段
func UpdateSettingField(key string, value string) error {
	var sql string
	switch key {
	case "favicon":
		sql = `UPDATE nav_setting SET favicon = ? WHERE id = (SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1)`
	case "title":
		sql = `UPDATE nav_setting SET title = ? WHERE id = (SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1)`
	case "govRecord":
		sql = `UPDATE nav_setting SET govRecord = ? WHERE id = (SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1)`
	case "logo192":
		sql = `UPDATE nav_setting SET logo192 = ? WHERE id = (SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1)`
	case "logo512":
		sql = `UPDATE nav_setting SET logo512 = ? WHERE id = (SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1)`
	case "hideAdmin":
		sql = `UPDATE nav_setting SET hideAdmin = ? WHERE id = (SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1)`
	case "hideGithub":
		sql = `UPDATE nav_setting SET hideGithub = ? WHERE id = (SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1)`
	case "hideToggleJumpTarget":
		sql = `UPDATE nav_setting SET hideToggleJumpTarget = ? WHERE id = (SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1)`
	case "jumpTargetBlank":
		sql = `UPDATE nav_setting SET jumpTargetBlank = ? WHERE id = (SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1)`
	default:
		return nil
	}

	var val interface{}
	if value == "true" {
		val = 1
	} else if value == "false" {
		val = 0
	} else {
		val = value
	}

	_, err := DB.Exec(sql, val)
	return err
}

// GetSiteConfigAsMap 获取网站配置为 map
func GetSiteConfigAsMap() (map[string]interface{}, error) {
	sql := `SELECT id, noImageMode, compactMode, faviconApiEnabled, COALESCE(faviconApiTemplate, '') FROM nav_site_config ORDER BY id ASC LIMIT 1`
	row := DB.QueryRow(sql)

	var id int
	var noImageMode, compactMode, faviconApiEnabled interface{}
	var faviconApiTemplate string
	err := row.Scan(&id, &noImageMode, &compactMode, &faviconApiEnabled, &faviconApiTemplate)
	if err != nil {
		return make(map[string]interface{}), nil
	}

	cfg := make(map[string]interface{})
	cfg["id"] = id

	if noImageMode == nil {
		cfg["noImageMode"] = false
	} else {
		cfg["noImageMode"] = noImageMode.(int64) == 1
	}
	if compactMode == nil {
		cfg["compactMode"] = false
	} else {
		cfg["compactMode"] = compactMode.(int64) == 1
	}
	if faviconApiEnabled == nil {
		cfg["faviconApiEnabled"] = false
	} else {
		cfg["faviconApiEnabled"] = faviconApiEnabled.(int64) == 1
	}
	cfg["faviconApiTemplate"] = faviconApiTemplate

	return cfg, nil
}

// UpdateSiteConfigFromMap 从 map 更新网站配置
func UpdateSiteConfigFromMap(cfg map[string]interface{}) error {
	sql := `UPDATE nav_site_config SET noImageMode = ?, compactMode = ?, faviconApiEnabled = ?, faviconApiTemplate = ? WHERE id = (SELECT id FROM nav_site_config ORDER BY id ASC LIMIT 1)`

	toBool := func(v interface{}) int {
		switch val := v.(type) {
		case bool:
			if val {
				return 1
			}
			return 0
		case float64:
			if val != 0 {
				return 1
			}
			return 0
		case string:
			if val == "true" || val == "1" {
				return 1
			}
			return 0
		default:
			return 0
		}
	}

	noImageMode := toBool(cfg["noImageMode"])
	compactMode := toBool(cfg["compactMode"])
	faviconApiEnabled := toBool(cfg["faviconApiEnabled"])
	faviconApiTemplate := ""
	if v, ok := cfg["faviconApiTemplate"].(string); ok {
		faviconApiTemplate = v
	}

	_, err := DB.Exec(sql, noImageMode, compactMode, faviconApiEnabled, faviconApiTemplate)
	return err
}

// ==================== 部署版本相关操作 ====================

// GetDeploymentVersion 获取当前部署版本号
func GetDeploymentVersion() string {
	var version string
	err := DB.QueryRow(`SELECT COALESCE(deployment_version, 'v1.13.1.1') FROM nav_setting ORDER BY id ASC LIMIT 1`).Scan(&version)
	if err != nil {
		return "v1.13.1.1"
	}
	if version == "" {
		return "v1.13.1.1"
	}
	return version
}

// IncrementDeploymentVersion 递增部署版本号（构建号 +1）
func IncrementDeploymentVersion() (string, error) {
	current := GetDeploymentVersion()

	// 解析版本号 v主版本.次版本.修订版本.构建号
	// 格式: v1.13.1.1 -> parts: [v1, 13, 1, 1]
	if !strings.HasPrefix(current, "v") {
		// 格式异常，重置为初始版本
		current = "v1.13.1.1"
	}

	parts := strings.Split(current, ".")
	if len(parts) != 4 {
		// 格式异常，重置为初始版本
		current = "v1.13.1.1"
		parts = strings.Split(current, ".")
	}

	// 递增构建号（最后一部分）
	buildNum, err := strconv.Atoi(parts[3])
	if err != nil {
		buildNum = 1
	}
	buildNum++

	newVersion := fmt.Sprintf("%s.%s.%s.%d", parts[0], parts[1], parts[2], buildNum)

	// 更新数据库
	_, err = DB.Exec(`UPDATE nav_setting SET deployment_version = ? WHERE id = (SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1)`, newVersion)
	if err != nil {
		return current, err
	}

	return newVersion, nil
}
