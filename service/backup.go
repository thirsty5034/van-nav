package service

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/mereith/nav/database"
	"github.com/mereith/nav/logger"
	"github.com/mereith/nav/types"
	"github.com/studio-b12/gowebdav"
)

// GetBackupEncryptionKey 从环境变量获取加密密钥（32字节用于AES-256）
func GetBackupEncryptionKey() ([]byte, error) {
	key := os.Getenv("BACKUP_ENCRYPTION_KEY")
	if key == "" {
		return nil, fmt.Errorf("环境变量 BACKUP_ENCRYPTION_KEY 未设置，服务无法安全存储备份密码")
	}
	// 如果是hex编码的64字符（即32字节），解码
	if len(key) == 64 {
		decoded, err := hex.DecodeString(key)
		if err == nil {
			return decoded, nil
		}
	}
	// 直接使用原始字节，必须恰好32字节
	keyBytes := []byte(key)
	if len(keyBytes) != 32 {
		return nil, fmt.Errorf("BACKUP_ENCRYPTION_KEY 长度必须为32字节（或64位hex编码），当前为%d字节", len(keyBytes))
	}
	return keyBytes, nil
}

// encryptPassword 使用 AES-256-GCM 加密密码
func encryptPassword(plaintext string) (string, error) {
	key, err := GetBackupEncryptionKey()
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("创建 AES cipher 失败: %w", err)
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("创建 GCM 失败: %w", err)
	}

	nonce := make([]byte, aesGCM.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("生成 nonce 失败: %w", err)
	}

	ciphertext := aesGCM.Seal(nonce, nonce, []byte(plaintext), nil)
	return hex.EncodeToString(ciphertext), nil
}

// decryptPassword 使用 AES-256-GCM 解密密码
func decryptPassword(ciphertext string) (string, error) {
	key, err := GetBackupEncryptionKey()
	if err != nil {
		return "", err
	}

	data, err := hex.DecodeString(ciphertext)
	if err != nil {
		return "", fmt.Errorf("解码密文失败: %w", err)
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("创建 AES cipher 失败: %w", err)
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("创建 GCM 失败: %w", err)
	}

	nonceSize := aesGCM.NonceSize()
	if len(data) < nonceSize {
		return "", fmt.Errorf("密文长度不足")
	}

	nonce, ciphertextBytes := data[:nonceSize], data[nonceSize:]
	plaintext, err := aesGCM.Open(nil, nonce, ciphertextBytes, nil)
	if err != nil {
		return "", fmt.Errorf("解密失败: %w", err)
	}

	return string(plaintext), nil
}

// GetBackupConfig 从数据库读取备份配置
func GetBackupConfig() (*types.BackupConfig, error) {
	sqlStr := `SELECT id, webdav_url, username, password, backup_dir, schedule_type, schedule_time, cron_expr, retention_type, retention_value, COALESCE(last_backup_time, ''), COALESCE(last_backup_status, ''), enabled, created_at, updated_at
		FROM nav_backup_config ORDER BY id ASC LIMIT 1;`

	var config types.BackupConfig
	var enabled int
	var passwordEncrypted string

	row := database.DB.QueryRow(sqlStr)
	err := row.Scan(
		&config.ID, &config.WebDAVURL, &config.Username, &passwordEncrypted,
		&config.BackupDir, &config.ScheduleType, &config.ScheduleTime,
		&config.CronExpr, &config.RetentionType, &config.RetentionValue,
		&config.LastBackupTime, &config.LastBackupStatus,
		&enabled, &config.CreatedAt, &config.UpdatedAt,
	)
	if err != nil {
		// 如果没有记录，返回默认配置
		return &types.BackupConfig{
			WebDAVURL:      "",
			Username:       "",
			Password:       "",
			BackupDir:      "/",
			ScheduleType:   "daily",
			ScheduleTime:   "02:00",
			CronExpr:       "",
			RetentionType:  "unlimited",
			RetentionValue: 0,
			Enabled:        true,
		}, nil
	}

	config.Enabled = enabled == 1

	// 解密密码
	if passwordEncrypted != "" {
		decrypted, err := decryptPassword(passwordEncrypted)
		if err != nil {
			logger.LogError("解密备份密码失败: %s", err)
			config.Password = ""
		} else {
			config.Password = decrypted
		}
	}

	return &config, nil
}

// getBackupConfigFromDB 从数据库读取备份配置（密码为密文，不用于直接连接）
func getBackupConfigFromDB() (*types.BackupConfig, error) {
	sqlStr := `SELECT id, webdav_url, username, password, backup_dir, schedule_type, schedule_time, cron_expr, retention_type, retention_value, COALESCE(last_backup_time, ''), COALESCE(last_backup_status, ''), enabled, created_at, updated_at
		FROM nav_backup_config ORDER BY id ASC LIMIT 1;`

	var config types.BackupConfig
	var enabled int
	var passwordEncrypted string

	row := database.DB.QueryRow(sqlStr)
	err := row.Scan(
		&config.ID, &config.WebDAVURL, &config.Username, &passwordEncrypted,
		&config.BackupDir, &config.ScheduleType, &config.ScheduleTime,
		&config.CronExpr, &config.RetentionType, &config.RetentionValue,
		&config.LastBackupTime, &config.LastBackupStatus,
		&enabled, &config.CreatedAt, &config.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	config.Enabled = enabled == 1
	config.Password = passwordEncrypted // 保持密文
	return &config, nil
}

// SaveBackupConfig 保存备份配置到数据库
func SaveBackupConfig(config *types.BackupConfig) error {
	// 加密密码
	encryptedPassword, err := encryptPassword(config.Password)
	if err != nil {
		return fmt.Errorf("加密密码失败: %w", err)
	}

	// 检查是否已有配置记录
	var count int
	err = database.DB.QueryRow("SELECT COUNT(*) FROM nav_backup_config;").Scan(&count)
	if err != nil {
		return fmt.Errorf("查询备份配置失败: %w", err)
	}

	enabledInt := 0
	if config.Enabled {
		enabledInt = 1
	}

	if count == 0 {
		// 插入新记录
		sqlStr := `INSERT INTO nav_backup_config (webdav_url, username, password, backup_dir, schedule_type, schedule_time, cron_expr, retention_type, retention_value, enabled, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'));`
		_, err = database.DB.Exec(sqlStr,
			config.WebDAVURL, config.Username, encryptedPassword,
			config.BackupDir, config.ScheduleType, config.ScheduleTime,
			config.CronExpr, config.RetentionType, config.RetentionValue,
			enabledInt,
		)
	} else {
		// 更新已有记录
		sqlStr := `UPDATE nav_backup_config SET
			webdav_url = ?, username = ?, password = ?, backup_dir = ?,
			schedule_type = ?, schedule_time = ?, cron_expr = ?,
			retention_type = ?, retention_value = ?, enabled = ?,
			updated_at = datetime('now')
			WHERE id = (SELECT id FROM nav_backup_config ORDER BY id ASC LIMIT 1);`
		_, err = database.DB.Exec(sqlStr,
			config.WebDAVURL, config.Username, encryptedPassword,
			config.BackupDir, config.ScheduleType, config.ScheduleTime,
			config.CronExpr, config.RetentionType, config.RetentionValue,
			enabledInt,
		)
	}

	if err != nil {
		return fmt.Errorf("保存备份配置失败: %w", err)
	}

	return nil
}

// TestWebDAVConnection 测试 WebDAV 连接
func TestWebDAVConnection(config *types.BackupConfig) error {
	if config.WebDAVURL == "" {
		return fmt.Errorf("WebDAV 服务地址不能为空")
	}
	if config.Username == "" {
		return fmt.Errorf("用户名不能为空")
	}
	if config.Password == "" {
		return fmt.Errorf("密码不能为空")
	}

	client := gowebdav.NewClient(config.WebDAVURL, config.Username, config.Password)
	_, err := client.ReadDir("/")
	if err != nil {
		return fmt.Errorf("WebDAV 连接失败: %w", err)
	}

	return nil
}

// createWebDAVClient 创建 WebDAV 客户端
func createWebDAVClient(config *types.BackupConfig) (*gowebdav.Client, error) {
	// 解密密码
	decryptedPassword, err := decryptPassword(config.Password)
	if err != nil {
		return nil, fmt.Errorf("解密密码失败: %w", err)
	}

	client := gowebdav.NewClient(config.WebDAVURL, config.Username, decryptedPassword)
	return client, nil
}

// ExecuteBackup 执行备份
func ExecuteBackup() error {
	logger.LogInfo("开始执行 WebDAV 备份...")

	// 读取备份配置
	config, err := getBackupConfigFromDB()
	if err != nil {
		updateBackupStatus("", fmt.Sprintf("读取配置失败: %s", err))
		return fmt.Errorf("读取备份配置失败: %w", err)
	}

	if !config.Enabled {
		logger.LogInfo("备份功能已禁用，跳过")
		return nil
	}

	if config.WebDAVURL == "" || config.Username == "" || config.Password == "" {
		errMsg := "WebDAV 配置不完整"
		updateBackupStatus("", errMsg)
		return fmt.Errorf(errMsg)
	}

	// 创建 WebDAV 客户端
	client, err := createWebDAVClient(config)
	if err != nil {
		updateBackupStatus("", fmt.Sprintf("创建客户端失败: %s", err))
		return err
	}

	// 确保备份目录存在
	backupDir := config.BackupDir
	if backupDir == "" || backupDir == "/" {
		backupDir = "/van-nav-backup"
	}
	// 确保目录路径格式正确
	if !strings.HasSuffix(backupDir, "/") {
		backupDir += "/"
	}
	// 确保以 / 开头
	if !strings.HasPrefix(backupDir, "/") {
		backupDir = "/" + backupDir
	}
	// 尝试创建目录（忽略已存在的错误）
	_ = client.MkdirAll(strings.TrimSuffix(backupDir, "/"), 0755)

	// 执行 WAL checkpoint 保证数据一致性
	_, err = database.DB.Exec("PRAGMA wal_checkpoint(TRUNCATE);")
	if err != nil {
		logger.LogError("WAL checkpoint 失败: %s", err)
	}

	// 复制数据库文件到临时文件
	dbPath := "./data/nav.db"
	tmpFile, err := os.CreateTemp("", "nav_backup_*.db")
	if err != nil {
		updateBackupStatus("", fmt.Sprintf("创建临时文件失败: %s", err))
		return fmt.Errorf("创建临时文件失败: %w", err)
	}
	tmpPath := tmpFile.Name()
	defer os.Remove(tmpPath)

	srcFile, err := os.Open(dbPath)
	if err != nil {
		tmpFile.Close()
		updateBackupStatus("", fmt.Sprintf("打开数据库失败: %s", err))
		return fmt.Errorf("打开数据库文件失败: %w", err)
	}

	_, err = io.Copy(tmpFile, srcFile)
	srcFile.Close()
	tmpFile.Close()
	if err != nil {
		updateBackupStatus("", fmt.Sprintf("复制数据库失败: %s", err))
		return fmt.Errorf("复制数据库文件失败: %w", err)
	}

	// 生成备份文件名
	now := time.Now()
	filename := fmt.Sprintf("nav_backup_%s.db", now.Format("20060102_150405"))
	remotePath := filepath.Join(backupDir, filename)
	// 确保路径使用正斜杠
	remotePath = strings.ReplaceAll(remotePath, "\\", "/")

	// 读取临时文件并上传
	tmpData, err := os.ReadFile(tmpPath)
	if err != nil {
		updateBackupStatus("", fmt.Sprintf("读取临时文件失败: %s", err))
		return fmt.Errorf("读取临时文件失败: %w", err)
	}

	err = client.Write(remotePath, tmpData, 0644)
	if err != nil {
		updateBackupStatus("", fmt.Sprintf("上传失败: %s", err))
		return fmt.Errorf("上传备份文件失败: %w", err)
	}

	logger.LogInfo("备份成功: %s", remotePath)

	// 更新备份状态
	updateBackupStatus(now.Format("2006-01-02 15:04:05"), "成功")

	// 清理旧备份
	err = CleanOldBackups(config)
	if err != nil {
		logger.LogError("清理旧备份失败: %s", err)
	}

	return nil
}

// updateBackupStatus 更新备份状态到数据库
func updateBackupStatus(backupTime, status string) {
	sqlStr := `UPDATE nav_backup_config SET last_backup_time = ?, last_backup_status = ?, updated_at = datetime('now')
		WHERE id = (SELECT id FROM nav_backup_config ORDER BY id ASC LIMIT 1);`
	_, err := database.DB.Exec(sqlStr, backupTime, status)
	if err != nil {
		logger.LogError("更新备份状态失败: %s", err)
	}
}

// CleanOldBackups 清理过期的备份文件
func CleanOldBackups(config *types.BackupConfig) error {
	if config.RetentionType == "unlimited" {
		return nil
	}

	client, err := createWebDAVClient(config)
	if err != nil {
		return err
	}

	backupDir := config.BackupDir
	if backupDir == "" || backupDir == "/" {
		backupDir = "/van-nav-backup"
	}
	if !strings.HasSuffix(backupDir, "/") {
		backupDir += "/"
	}
	if !strings.HasPrefix(backupDir, "/") {
		backupDir = "/" + backupDir
	}

	files, err := client.ReadDir(backupDir)
	if err != nil {
		return fmt.Errorf("读取备份目录失败: %w", err)
	}

	// 计算过期时间
	var cutoffTime time.Time
	now := time.Now()
	switch config.RetentionType {
	case "days":
		cutoffTime = now.AddDate(0, 0, -config.RetentionValue)
	case "weeks":
		cutoffTime = now.AddDate(0, 0, -config.RetentionValue*7)
	case "months":
		cutoffTime = now.AddDate(0, -config.RetentionValue, 0)
	default:
		return nil
	}

	// 匹配备份文件名中的时间戳
	// 格式: nav_backup_YYYYMMDD_HHmmss.db
	re := regexp.MustCompile(`nav_backup_(\d{8}_\d{6})\.db`)

	for _, file := range files {
		if file.IsDir() {
			continue
		}

		matches := re.FindStringSubmatch(file.Name())
		if matches == nil {
			continue
		}

		fileTime, err := time.Parse("20060102_150405", matches[1])
		if err != nil {
			continue
		}

		if fileTime.Before(cutoffTime) {
			filePath := filepath.Join(backupDir, file.Name())
			filePath = strings.ReplaceAll(filePath, "\\", "/")
			err = client.Remove(filePath)
			if err != nil {
				logger.LogError("删除过期备份失败 %s: %s", filePath, err)
			} else {
				logger.LogInfo("已删除过期备份: %s", filePath)
			}
		}
	}

	return nil
}

// GetBackupStatus 获取最近一次备份状态
func GetBackupStatus() (backupTime string, status string) {
	config, err := getBackupConfigFromDB()
	if err != nil {
		return "", ""
	}
	return config.LastBackupTime, config.LastBackupStatus
}

// GetBackupStatusForDisplay 获取用于显示的备份状态
func GetBackupStatusForDisplay() map[string]string {
	config, err := getBackupConfigFromDB()
	if err != nil {
		return map[string]string{
			"lastBackupTime":   "",
			"lastBackupStatus": "",
		}
	}
	return map[string]string{
		"lastBackupTime":   config.LastBackupTime,
		"lastBackupStatus": config.LastBackupStatus,
	}
}

// parseScheduleTime 解析时间字符串 "HH:MM" 返回时和分
func parseScheduleTime(timeStr string) (int, int) {
	parts := strings.Split(timeStr, ":")
	if len(parts) != 2 {
		return 2, 0 // 默认 02:00
	}
	hour, err := strconv.Atoi(parts[0])
	if err != nil || hour < 0 || hour > 23 {
		return 2, 0
	}
	minute, err := strconv.Atoi(parts[1])
	if err != nil || minute < 0 || minute > 59 {
		return 0, 0
	}
	return hour, minute
}

// BackupFileInfo 备份文件信息
type BackupFileInfo struct {
	Name    string `json:"name"`
	Size    int64  `json:"size"`
	ModTime string `json:"modTime"`
}

// ListBackupFiles 列出 WebDAV 上的备份文件
func ListBackupFiles() ([]BackupFileInfo, error) {
	config, err := getBackupConfigFromDB()
	if err != nil {
		return nil, fmt.Errorf("读取备份配置失败: %w", err)
	}

	if config.WebDAVURL == "" || config.Username == "" || config.Password == "" {
		return nil, fmt.Errorf("WebDAV 配置不完整")
	}

	client, err := createWebDAVClient(config)
	if err != nil {
		return nil, fmt.Errorf("创建 WebDAV 客户端失败: %w", err)
	}

	backupDir := config.BackupDir
	if backupDir == "" || backupDir == "/" {
		backupDir = "/van-nav-backup"
	}
	if !strings.HasSuffix(backupDir, "/") {
		backupDir += "/"
	}
	if !strings.HasPrefix(backupDir, "/") {
		backupDir = "/" + backupDir
	}

	files, err := client.ReadDir(backupDir)
	if err != nil {
		return nil, fmt.Errorf("读取备份目录失败: %w", err)
	}

	re := regexp.MustCompile(`nav_backup_(\d{8}_\d{6})\.db`)
	var result []BackupFileInfo
	for _, file := range files {
		if file.IsDir() {
			continue
		}
		matches := re.FindStringSubmatch(file.Name())
		if matches == nil {
			continue
		}
		// 解析时间戳用于显示
		fileTime, err := time.Parse("20060102_150405", matches[1])
		modTime := ""
		if err == nil {
			modTime = fileTime.Format("2006-01-02 15:04:05")
		}
		result = append(result, BackupFileInfo{
			Name:    file.Name(),
			Size:    file.Size(),
			ModTime: modTime,
		})
	}

	// 按文件名倒序排列（最新的在前）
	for i := 0; i < len(result); i++ {
		for j := i + 1; j < len(result); j++ {
			if result[j].Name > result[i].Name {
				result[i], result[j] = result[j], result[i]
			}
		}
	}

	return result, nil
}

// RestoreFromBackup 从 WebDAV 下载备份文件并恢复数据库
func RestoreFromBackup(filename string) error {
	logger.LogInfo("开始从 WebDAV 恢复备份: %s", filename)

	// 安全检查：只允许恢复 nav_backup_*.db 文件
	re := regexp.MustCompile(`^nav_backup_\d{8}_\d{6}\.db$`)
	if !re.MatchString(filename) {
		return fmt.Errorf("无效的备份文件名: %s", filename)
	}

	config, err := getBackupConfigFromDB()
	if err != nil {
		return fmt.Errorf("读取备份配置失败: %w", err)
	}

	if config.WebDAVURL == "" || config.Username == "" || config.Password == "" {
		return fmt.Errorf("WebDAV 配置不完整")
	}

	client, err := createWebDAVClient(config)
	if err != nil {
		return fmt.Errorf("创建 WebDAV 客户端失败: %w", err)
	}

	backupDir := config.BackupDir
	if backupDir == "" || backupDir == "/" {
		backupDir = "/van-nav-backup"
	}
	if !strings.HasSuffix(backupDir, "/") {
		backupDir += "/"
	}
	if !strings.HasPrefix(backupDir, "/") {
		backupDir = "/" + backupDir
	}

	remotePath := backupDir + filename
	remotePath = strings.ReplaceAll(remotePath, "\\", "/")

	// 从 WebDAV 下载备份文件
	data, err := client.Read(remotePath)
	if err != nil {
		return fmt.Errorf("下载备份文件失败: %w", err)
	}

	// 备份当前数据库文件
	dbPath := "./data/nav.db"
	backupPath := dbPath + ".bak." + time.Now().Format("20060102_150405")
	if _, err := os.Stat(dbPath); err == nil {
		srcData, err := os.ReadFile(dbPath)
		if err != nil {
			logger.LogError("备份当前数据库失败: %s", err)
		} else {
			if err := os.WriteFile(backupPath, srcData, 0644); err != nil {
				logger.LogError("写入备份文件失败: %s", err)
			} else {
				logger.LogInfo("已将当前数据库备份到: %s", backupPath)
			}
		}
	}

	// 关闭当前数据库连接
	if database.DB != nil {
		database.DB.Close()
	}

	// 写入恢复的数据库文件
	err = os.WriteFile(dbPath, data, 0644)
	if err != nil {
		return fmt.Errorf("写入数据库文件失败: %w", err)
	}

	logger.LogInfo("数据库恢复成功: %s -> %s", remotePath, dbPath)
	return nil
}

// buildCronExpr 根据调度类型构建 cron 表达式
func buildCronExpr(config *types.BackupConfig) string {
	hour, minute := parseScheduleTime(config.ScheduleTime)

	switch config.ScheduleType {
	case "daily":
		return fmt.Sprintf("%d %d * * *", minute, hour)
	case "weekly":
		return fmt.Sprintf("%d %d * * 0", minute, hour) // 默认周日
	case "monthly":
		return fmt.Sprintf("%d %d 1 * *", minute, hour)
	case "cron":
		if config.CronExpr != "" {
			return config.CronExpr
		}
		return fmt.Sprintf("%d %d * * *", minute, hour) // fallback
	default:
		return fmt.Sprintf("%d %d * * *", minute, hour)
	}
}
