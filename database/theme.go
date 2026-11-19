package database

import (
	"encoding/json"
	"fmt"
)

// GetThemeConfig 获取主题配置
func GetThemeConfig() (map[string]interface{}, error) {
	query := `SELECT config_json FROM nav_theme_config WHERE id = 1`
	
	var configJSON string
	err := DB.QueryRow(query).Scan(&configJSON)
	if err != nil {
		// 如果不存在记录，返回空配置
		if err.Error() == "sql: no rows in result set" {
			return map[string]interface{}{}, nil
		}
		return nil, fmt.Errorf("查询主题配置失败: %w", err)
	}
	
	var config map[string]interface{}
	if err := json.Unmarshal([]byte(configJSON), &config); err != nil {
		return nil, fmt.Errorf("解析主题配置JSON失败: %w", err)
	}
	
	return config, nil
}

// SaveThemeConfig 保存主题配置（UPSERT逻辑，强制id=1）
func SaveThemeConfig(config map[string]interface{}) error {
	configJSON, err := json.Marshal(config)
	if err != nil {
		return fmt.Errorf("序列化主题配置失败: %w", err)
	}
	
	query := `INSERT INTO nav_theme_config (id, config_json, updated_at) 
              VALUES (1, ?, datetime('now'))
              ON CONFLICT(id) DO UPDATE SET 
              config_json = excluded.config_json,
              updated_at = excluded.updated_at`
	
	_, err = DB.Exec(query, string(configJSON))
	if err != nil {
		return fmt.Errorf("保存主题配置失败: %w", err)
	}
	
	return nil
}

// DeleteThemeConfig 删除主题配置（重置为默认）
func DeleteThemeConfig() error {
	query := `DELETE FROM nav_theme_config WHERE id = 1`
	_, err := DB.Exec(query)
	if err != nil {
		return fmt.Errorf("删除主题配置失败: %w", err)
	}
	return nil
}

// ==================== 主题方案（多套可切换主题） ====================

// ThemePreset 主题方案记录
type ThemePreset struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	ConfigJSON string `json:"configJson"`
	UpdatedAt string `json:"updatedAt"`
}

// ListThemePresets 获取全部主题方案（按更新时间倒序）
func ListThemePresets() ([]ThemePreset, error) {
	rows, err := DB.Query(`SELECT id, name, config_json, updated_at FROM nav_theme_presets ORDER BY updated_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("查询主题方案失败: %w", err)
	}
	defer rows.Close()

	presets := []ThemePreset{}
	for rows.Next() {
		var p ThemePreset
		if err := rows.Scan(&p.ID, &p.Name, &p.ConfigJSON, &p.UpdatedAt); err != nil {
			return nil, fmt.Errorf("读取主题方案失败: %w", err)
		}
		presets = append(presets, p)
	}
	return presets, nil
}

// SaveThemePreset 新增/更新主题方案，返回方案 id
func SaveThemePreset(preset ThemePreset) (int64, error) {
	if preset.ID > 0 {
		query := `UPDATE nav_theme_presets SET name = ?, config_json = ?, updated_at = datetime('now') WHERE id = ?`
		_, err := DB.Exec(query, preset.Name, preset.ConfigJSON, preset.ID)
		if err != nil {
			return 0, fmt.Errorf("更新主题方案失败: %w", err)
		}
		return preset.ID, nil
	}
	query := `INSERT INTO nav_theme_presets (name, config_json, created_at, updated_at)
              VALUES (?, ?, datetime('now'), datetime('now'))`
	res, err := DB.Exec(query, preset.Name, preset.ConfigJSON)
	if err != nil {
		return 0, fmt.Errorf("新增主题方案失败: %w", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("获取主题方案ID失败: %w", err)
	}
	return id, nil
}

// DeleteThemePreset 删除主题方案
func DeleteThemePreset(id int64) error {
	_, err := DB.Exec(`DELETE FROM nav_theme_presets WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("删除主题方案失败: %w", err)
	}
	return nil
}

// GetThemePreset 获取单个主题方案
func GetThemePreset(id int64) (ThemePreset, error) {
	var p ThemePreset
	err := DB.QueryRow(`SELECT id, name, config_json, updated_at FROM nav_theme_presets WHERE id = ?`, id).
		Scan(&p.ID, &p.Name, &p.ConfigJSON, &p.UpdatedAt)
	if err != nil {
		return p, fmt.Errorf("查询主题方案失败: %w", err)
	}
	return p, nil
}
