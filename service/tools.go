package service

import (
	"strings"
	"sync"
	"time"

	"github.com/mereith/nav/database"
	"github.com/mereith/nav/logger"
	"github.com/mereith/nav/types"
	"github.com/mereith/nav/utils"
)

// addToolMutex 保护 AddTool 操作的并发安全
var addToolMutex sync.Mutex

type ImportToolsResult struct {
	Imported   int
	Skipped    int
	Categories []string
}

func ImportTools(data []types.Tool) ImportToolsResult {
	var catelogs []string
	imported := 0
	skipped := 0

	// 准备 SQL 语句，避免循环内重复 Prepare
	sql_add_tool := `
		INSERT OR IGNORE INTO nav_table (id, name, catelog, url, logo, desc, sort, hide)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?);
		`
	stmt, err := database.DB.Prepare(sql_add_tool)
	if err != nil {
		utils.CheckErr(err)
		return ImportToolsResult{Imported: 0, Skipped: len(data), Categories: nil}
	}
	defer stmt.Close()

	for _, v := range data {
		// 过滤掉空分类，只收集有效的分类名称
		if v.Catelog != "" && strings.TrimSpace(v.Catelog) != "" && !utils.In(v.Catelog, catelogs) {
			catelogs = append(catelogs, v.Catelog)
		}
		res, err := stmt.Exec(v.Id, v.Name, v.Catelog, v.Url, v.Logo, v.Desc, v.Sort, v.Hide)
		if err != nil {
			utils.CheckErr(err)
			skipped++
			continue
		}
		affected, _ := res.RowsAffected()
		if affected > 0 {
			imported++
		} else {
			skipped++
		}
	}
	for _, catelog := range catelogs {
		var addCatelogDto types.AddCatelogDto
		addCatelogDto.Name = catelog
		AddCatelog(addCatelogDto)
	}
	// 转存所有图片，顺序执行避免 SQLite 锁竞争
	for _, v := range data {
		UpdateImg(v.Logo)
	}
	return ImportToolsResult{
		Imported:   imported,
		Skipped:    skipped,
		Categories: catelogs,
	}
}

func UpdateTool(data types.UpdateToolDto) {
	// 除了更新工具本身之外，也要更新 img 表
	sql_update_tool := `
		UPDATE nav_table
		SET name = ?, url = ?, logo = ?, catelog = ?, desc = ?, sort = ?, hide = ?
		WHERE id = ?;
		`
	stmt, err := database.DB.Prepare(sql_update_tool)
	utils.CheckErr(err)
	res, err := stmt.Exec(data.Name, data.Url, data.Logo, data.Catelog, data.Desc, data.Sort, data.Hide, data.Id)
	utils.CheckErr(err)
	_, err = res.RowsAffected()
	utils.CheckErr(err)
	// 更新 img（异步，不阻塞响应）
	if data.Logo != "" {
		go UpdateImg(data.Logo)
	}
}

func AddTool(data types.AddToolDto) (int64, error) {
	// 使用包级互斥锁保护数据库操作
	addToolMutex.Lock()
	defer addToolMutex.Unlock()

	tx, err := database.DB.Begin()
	if err != nil {
		return 0, err
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	sql_add_tool := `
		INSERT INTO nav_table (name, url, logo, catelog, desc, sort, hide)
		VALUES (?, ?, ?, ?, ?, ?, ?);
		`
	stmt, err := tx.Prepare(sql_add_tool)
	if err != nil {
		return 0, err
	}
	defer stmt.Close()

	res, err := stmt.Exec(data.Name, data.Url, data.Logo, data.Catelog, data.Desc, data.Sort, data.Hide)
	if err != nil {
		return 0, err
	}

	id, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}

	err = tx.Commit()
	if err != nil {
		return 0, err
	}
	logger.LogInfo("新增工具: %s", data.Name)

	// 在事务完成后再异步更新图片（异步，不阻塞响应）
	if data.Logo != "" {
		go UpdateImg(data.Logo)
	}

	return id, nil
}

func GetAllTool() []types.Tool {
	sql_get_all := `
		SELECT id,name,url,logo,catelog,desc,sort,hide,is_alive,last_checked FROM nav_table order by sort;
		`
	results := make([]types.Tool, 0)
	rows, err := database.DB.Query(sql_get_all)
	if err != nil {
		utils.CheckErr(err)
		return results
	}
	defer rows.Close()
	for rows.Next() {
		var tool types.Tool
		var hide interface{}
		var sort interface{}
		var isAlive interface{}
		var lastChecked interface{}
		err = rows.Scan(&tool.Id, &tool.Name, &tool.Url, &tool.Logo, &tool.Catelog, &tool.Desc, &sort, &hide, &isAlive, &lastChecked)
		if hide == nil {
			tool.Hide = false
		} else {
			if hide.(int64) == 0 {
				tool.Hide = false
			} else {
				tool.Hide = true
			}
		}
		if sort == nil {
			tool.Sort = 0
		} else {
			i64 := sort.(int64)
			tool.Sort = int(i64)
		}
		// is_alive: NULL 或 1 表示正常，0 表示失效
		if isAlive == nil {
			alive := true
			tool.IsAlive = &alive
		} else {
			alive := isAlive.(int64) == 1
			tool.IsAlive = &alive
		}
		// last_checked: NULL 表示从未检测
		if lastChecked != nil {
			if t, ok := lastChecked.(time.Time); ok {
				tool.LastChecked = t.Format("2006-01-02 15:04:05")
			}
		}
		utils.CheckErr(err)
		results = append(results, tool)
	}
	return results
}

func GetToolLogoUrlById(id int) string {
	sql_get_tool := `
		SELECT logo FROM nav_table WHERE id=?;
		`
	rows, err := database.DB.Query(sql_get_tool, id)
	if err != nil {
		utils.CheckErr(err)
		return ""
	}
	defer rows.Close()
	var tool types.Tool
	for rows.Next() {
		err = rows.Scan(&tool.Logo)
		utils.CheckErr(err)
	}
	return tool.Logo
}

func UpdateToolIcon(id int64, logo string) {
	sql_update_tool := `
		UPDATE nav_table SET logo=? WHERE id=?;
		`
	_, err := database.DB.Exec(sql_update_tool, logo, id)
	utils.CheckErr(err)
	UpdateImg(logo)
}
func UpdateToolsSort(updates []types.UpdateToolsSortDto) error {
	tx, err := database.DB.Begin()
	if err != nil {
		return err
	}

	sql := `UPDATE nav_table SET sort = ? WHERE id = ?`
	stmt, err := tx.Prepare(sql)
	if err != nil {
		tx.Rollback()
		return err
	}
	defer stmt.Close()

	for _, update := range updates {
		_, err = stmt.Exec(update.Sort, update.Id)
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit()
}

// GetMaxSort 获取工具表最大排序值
func GetMaxSort() (int, error) {
	sql := `SELECT COALESCE(MAX(sort), 0) FROM nav_table`
	var maxSort int
	err := database.DB.QueryRow(sql).Scan(&maxSort)
	if err != nil {
		return 0, err
	}
	return maxSort, nil
}
