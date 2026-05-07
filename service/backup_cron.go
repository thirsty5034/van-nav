package service

import (
	"github.com/mereith/nav/logger"
	"github.com/robfig/cron/v3"
)

var backupCron *cron.Cron

// InitBackupCron 初始化备份定时调度
func InitBackupCron() {
	config, err := getBackupConfigFromDB()
	if err != nil {
		logger.LogError("读取备份配置失败，定时备份未启动: %s", err)
		return
	}

	if !config.Enabled {
		logger.LogInfo("备份功能已禁用，定时备份未启动")
		return
	}

	if config.WebDAVURL == "" || config.Username == "" || config.Password == "" {
		logger.LogInfo("WebDAV 配置不完整，定时备份未启动")
		return
	}

	UpdateBackupCron()
}

// UpdateBackupCron 更新备份定时调度
func UpdateBackupCron() {
	// 停止已有的调度器
	if backupCron != nil {
		backupCron.Stop()
		backupCron = nil
	}

	config, err := getBackupConfigFromDB()
	if err != nil {
		logger.LogError("读取备份配置失败: %s", err)
		return
	}

	if !config.Enabled {
		logger.LogInfo("备份功能已禁用")
		return
	}

	if config.WebDAVURL == "" || config.Username == "" || config.Password == "" {
		logger.LogInfo("WebDAV 配置不完整，定时备份未启动")
		return
	}

	cronExpr := buildCronExpr(config)
	logger.LogInfo("启动定时备份，cron 表达式: %s", cronExpr)

	backupCron = cron.New()
	_, err = backupCron.AddFunc(cronExpr, func() {
		logger.LogInfo("定时备份触发")
		err := ExecuteBackup()
		if err != nil {
			logger.LogError("定时备份执行失败: %s", err)
		}
	})
	if err != nil {
		logger.LogError("添加定时备份任务失败: %s", err)
		return
	}

	backupCron.Start()
	logger.LogInfo("定时备份已启动")
}

// StopBackupCron 停止备份定时调度
func StopBackupCron() {
	if backupCron != nil {
		backupCron.Stop()
		backupCron = nil
	}
}
