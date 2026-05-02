package database

import "github.com/mereith/nav/types"

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
