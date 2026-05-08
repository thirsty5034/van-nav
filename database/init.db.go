package database

import (
	"database/sql"
	"path/filepath"

	_ "modernc.org/sqlite"

	"github.com/mereith/nav/logger"
	"github.com/mereith/nav/utils"
)

var DB *sql.DB

func columnExists(tableName string, columnName string) bool {
	query := `SELECT COUNT(*) FROM pragma_table_info(?) WHERE name=?`
	var count int
	err := DB.QueryRow(query, tableName, columnName).Scan(&count)
	if err != nil {
		return false
	}
	return count > 0
}

func InitDB() {
	var err error
	utils.PathExistsOrCreate("./data")
	dir := "./data"
	dbPath := filepath.Join(dir, "nav.db")
	dbPath = dbPath + "?_journal=WAL&_timeout=5000&_busy_timeout=5000&_txlock=immediate"
	DB, err = sql.Open("sqlite", dbPath)
	utils.CheckErr(err)

	sql_create_table := `CREATE TABLE IF NOT EXISTS nav_user (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, password TEXT);`
	_, err = DB.Exec(sql_create_table)
	utils.CheckErr(err)

	sql_create_table = `CREATE TABLE IF NOT EXISTS nav_setting (id INTEGER PRIMARY KEY AUTOINCREMENT, favicon TEXT, title TEXT, govRecord TEXT, logo192 TEXT, logo512 TEXT, hideAdmin BOOLEAN, hideGithub BOOLEAN, hideToggleJumpTarget BOOLEAN, jumpTargetBlank BOOLEAN);`
	_, err = DB.Exec(sql_create_table)
	utils.CheckErr(err)

	if !columnExists("nav_setting", "logo192") { DB.Exec(`ALTER TABLE nav_setting ADD COLUMN logo192 TEXT;`) }
	if !columnExists("nav_setting", "logo512") { DB.Exec(`ALTER TABLE nav_setting ADD COLUMN logo512 TEXT;`) }
	if !columnExists("nav_setting", "govRecord") { DB.Exec(`ALTER TABLE nav_setting ADD COLUMN govRecord TEXT;`) }
	if !columnExists("nav_setting", "jumpTargetBlank") { DB.Exec(`ALTER TABLE nav_setting ADD COLUMN jumpTargetBlank BOOLEAN;`) }
	if !columnExists("nav_setting", "hideAdmin") { DB.Exec(`ALTER TABLE nav_setting ADD COLUMN hideAdmin BOOLEAN;`) }
	if !columnExists("nav_setting", "hideGithub") { DB.Exec(`ALTER TABLE nav_setting ADD COLUMN hideGithub BOOLEAN;`) }
	if !columnExists("nav_setting", "hideToggleJumpTarget") { DB.Exec(`ALTER TABLE nav_setting ADD COLUMN hideToggleJumpTarget BOOLEAN;`) }

	// 搜索引擎显示开关（默认显示）
	if !columnExists("nav_setting", "showSearchEngine") {
		DB.Exec(`ALTER TABLE nav_setting ADD COLUMN showSearchEngine BOOLEAN DEFAULT 1;`)
	}
	// PC 端标签列数（默认 3）
	if !columnExists("nav_setting", "pcColumnCount") {
		DB.Exec(`ALTER TABLE nav_setting ADD COLUMN pcColumnCount INTEGER DEFAULT 3;`)
	}

	// 部署版本号字段
	if !columnExists("nav_setting", "deployment_version") {
		DB.Exec(`ALTER TABLE nav_setting ADD COLUMN deployment_version TEXT DEFAULT 'v1.13.1.1';`)
	}

	sql_create_table = `CREATE TABLE IF NOT EXISTS nav_table (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, url TEXT, logo TEXT, catelog TEXT, desc TEXT);`
	_, err = DB.Exec(sql_create_table)
	utils.CheckErr(err)
	if !columnExists("nav_table", "sort") { DB.Exec(`ALTER TABLE nav_table ADD COLUMN sort INTEGER;`) }
	if !columnExists("nav_table", "hide") { DB.Exec(`ALTER TABLE nav_table ADD COLUMN hide BOOLEAN;`) }
	if !columnExists("nav_table", "is_alive") { DB.Exec(`ALTER TABLE nav_table ADD COLUMN is_alive BOOLEAN DEFAULT 1;`) }
	if !columnExists("nav_table", "last_checked") { DB.Exec(`ALTER TABLE nav_table ADD COLUMN last_checked DATETIME;`) }

	sql_create_table = `CREATE TABLE IF NOT EXISTS nav_catelog (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);`
	_, err = DB.Exec(sql_create_table)
	utils.CheckErr(err)
	if !columnExists("nav_catelog", "sort") { DB.Exec(`ALTER TABLE nav_catelog ADD COLUMN sort INTEGER NOT NULL DEFAULT 0;`) }
	if !columnExists("nav_catelog", "hide") { DB.Exec(`ALTER TABLE nav_catelog ADD COLUMN hide BOOLEAN;`) }
	migration_2024_12_13()

	sql_create_table = `CREATE TABLE IF NOT EXISTS nav_api_token (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, value TEXT, disabled INTEGER);`
	_, err = DB.Exec(sql_create_table)
	utils.CheckErr(err)

	sql_create_table = `CREATE TABLE IF NOT EXISTS nav_img (id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT, value TEXT);`
	_, err = DB.Exec(sql_create_table)
	utils.CheckErr(err)

	// 搜索引擎表 - urlTemplate 替代 baseUrl + queryParam
	sql_create_table = `CREATE TABLE IF NOT EXISTS nav_search_engine (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, urlTemplate TEXT NOT NULL, logo TEXT, sort INTEGER NOT NULL DEFAULT 0, enabled BOOLEAN NOT NULL DEFAULT 1, description TEXT DEFAULT '');`
	_, err = DB.Exec(sql_create_table)
	utils.CheckErr(err)

	// 兼容旧版：如果存在 baseUrl + queryParam 但没有 urlTemplate，则迁移
	if !columnExists("nav_search_engine", "urlTemplate") {
		DB.Exec(`ALTER TABLE nav_search_engine ADD COLUMN urlTemplate TEXT;`)
		DB.Exec(`UPDATE nav_search_engine SET urlTemplate = baseUrl || '?' || queryParam || '={query}' WHERE urlTemplate IS NULL OR urlTemplate = '';`)
		logger.LogInfo("搜索引擎表升级：已从 baseUrl+queryParam 迁移到 urlTemplate")
	}
	if !columnExists("nav_search_engine", "description") {
		DB.Exec(`ALTER TABLE nav_search_engine ADD COLUMN description TEXT DEFAULT '';`)
	}

	sql_create_table = `CREATE TABLE IF NOT EXISTS nav_site_config (id INTEGER PRIMARY KEY AUTOINCREMENT, noImageMode BOOLEAN NOT NULL DEFAULT 0, compactMode BOOLEAN NOT NULL DEFAULT 0, faviconApiEnabled BOOLEAN NOT NULL DEFAULT 0, faviconApiTemplate TEXT DEFAULT '');`
	_, err = DB.Exec(sql_create_table)
	utils.CheckErr(err)
	if !columnExists("nav_site_config", "compactMode") { DB.Exec(`ALTER TABLE nav_site_config ADD COLUMN compactMode BOOLEAN NOT NULL DEFAULT 0;`) }
	if !columnExists("nav_site_config", "faviconApiEnabled") { DB.Exec(`ALTER TABLE nav_site_config ADD COLUMN faviconApiEnabled BOOLEAN NOT NULL DEFAULT 0;`) }
	if !columnExists("nav_site_config", "faviconApiTemplate") { DB.Exec(`ALTER TABLE nav_site_config ADD COLUMN faviconApiTemplate TEXT DEFAULT 'https://favicon.im/{domain}';`) }

	// WebDAV 备份配置表
	sql_create_table = `CREATE TABLE IF NOT EXISTS nav_backup_config (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		webdav_url TEXT NOT NULL DEFAULT '',
		username TEXT NOT NULL DEFAULT '',
		password TEXT NOT NULL DEFAULT '',
		backup_dir TEXT NOT NULL DEFAULT '/',
		schedule_type TEXT NOT NULL DEFAULT 'daily',
		schedule_time TEXT NOT NULL DEFAULT '02:00',
		cron_expr TEXT NOT NULL DEFAULT '',
		retention_type TEXT NOT NULL DEFAULT 'unlimited',
		retention_value INTEGER NOT NULL DEFAULT 0,
		last_backup_time TEXT,
		last_backup_status TEXT,
		enabled INTEGER NOT NULL DEFAULT 1,
		encryption_key TEXT NOT NULL DEFAULT '',
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		updated_at TEXT NOT NULL DEFAULT (datetime('now'))
	);`
	_, err = DB.Exec(sql_create_table)
	utils.CheckErr(err)

	// 兼容旧表：添加 encryption_key 字段
	if !columnExists("nav_backup_config", "encryption_key") {
		DB.Exec(`ALTER TABLE nav_backup_config ADD COLUMN encryption_key TEXT NOT NULL DEFAULT '';`)
	}

	// 初始化默认搜索引擎
	var searchEngineCount int
	err = DB.QueryRow(`SELECT COUNT(*) FROM nav_search_engine;`).Scan(&searchEngineCount)
	utils.CheckErr(err)
	if searchEngineCount == 0 {
		defaultEngines := []struct {
			name, urlTemplate, logo, description string
			sort int
		}{
			{"百度", "https://www.baidu.com/s?wd={query}", "baidu.ico", "百度搜索", 1},
			{"Bing", "https://cn.bing.com/search?q={query}", "bing.ico", "微软必应搜索", 2},
			{"Google", "https://www.google.com/search?q={query}", "google.ico", "Google 搜索", 3},
		}
		stmt, err := DB.Prepare(`INSERT INTO nav_search_engine (name, urlTemplate, logo, sort, enabled, description) VALUES (?, ?, ?, ?, ?, ?);`)
		utils.CheckErr(err)
		defer stmt.Close()
		for _, e := range defaultEngines {
			_, err = stmt.Exec(e.name, e.urlTemplate, e.logo, e.sort, true, e.description)
			utils.CheckErr(err)
		}
		logger.LogInfo("默认搜索引擎初始化成功")
	}

	// 初始化用户
	rows, err := DB.Query(`SELECT * FROM nav_user;`)
	utils.CheckErr(err)
	if !rows.Next() {
		stmt, err := DB.Prepare(`INSERT INTO nav_user (id, name, password) VALUES (?, ?, ?);`)
		utils.CheckErr(err)
		_, err = stmt.Exec(utils.GenerateId(), "admin", "admin")
		utils.CheckErr(err)
	}
	rows.Close()

	// 初始化设置
	rows, err = DB.Query(`SELECT * FROM nav_setting;`)
	utils.CheckErr(err)
	if !rows.Next() {
		stmt, err := DB.Prepare(`INSERT INTO nav_setting (favicon, title, govRecord, logo192, logo512, hideAdmin, hideGithub, hideToggleJumpTarget, jumpTargetBlank) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`)
		utils.CheckErr(err)
		_, err = stmt.Exec("favicon.ico", "Van Nav", "", "logo192.png", "logo512.png", false, false, false, true)
		utils.CheckErr(err)
	}
	rows.Close()

	// 初始化网站配置
	rows, err = DB.Query(`SELECT * FROM nav_site_config;`)
	utils.CheckErr(err)
	if !rows.Next() {
		stmt, err := DB.Prepare(`INSERT INTO nav_site_config (noImageMode, compactMode, faviconApiEnabled, faviconApiTemplate) VALUES (?, ?, ?, ?);`)
		utils.CheckErr(err)
		_, err = stmt.Exec(false, false, true, "https://favicon.im/{domain}")
		utils.CheckErr(err)
	}
	rows.Close()
	logger.LogInfo("数据库初始化成功💗")

	cleanupEmptyCategories()
}

func cleanupEmptyCategories() {
	result, err := DB.Exec(`DELETE FROM nav_catelog WHERE name IS NULL OR name = '' OR TRIM(name) = '';`)
	if err != nil {
		logger.LogInfo("清理空分类记录时出错: %v", err)
		return
	}
	rowsAffected, err := result.RowsAffected()
	if err == nil && rowsAffected > 0 {
		logger.LogInfo("已清理 %d 条空分类记录", rowsAffected)
	}
}
