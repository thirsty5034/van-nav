package service

import (
	"github.com/mereith/nav/database"
	"github.com/mereith/nav/logger"
	"github.com/mereith/nav/types"
)

// GetDeploymentVersion 获取当前部署版本号
func GetDeploymentVersion() string {
	return database.GetDeploymentVersion()
}

// IncrementDeploymentVersion 递增部署版本号
func IncrementDeploymentVersion() (string, error) {
	return database.IncrementDeploymentVersion()
}

func GetSetting() types.Setting {
	sql_get_user := `
		SELECT id,favicon,title,govRecord,logo192,logo512,hideAdmin,hideGithub,hideToggleJumpTarget,jumpTargetBlank,showSearchEngine,pcColumnCount,COALESCE(deployment_version,'')
		FROM nav_setting
		ORDER BY id ASC
		LIMIT 1;
		`
	var setting types.Setting
	row := database.DB.QueryRow(sql_get_user, 0)
	// 建立一个空变量
	var hideGithub interface{}
	var hideAdmin interface{}
	var hideToggleJumpTarget interface{}
	var jumpTargetBlank interface{}
	var showSearchEngine interface{}
	var pcColumnCount interface{}
	var deploymentVersion string
	err := row.Scan(&setting.Id, &setting.Favicon, &setting.Title, &setting.GovRecord, &setting.Logo192, &setting.Logo512, &hideAdmin, &hideGithub, &hideToggleJumpTarget, &jumpTargetBlank, &showSearchEngine, &pcColumnCount, &deploymentVersion)
	if err != nil {
		logger.LogError("获取配置失败: %s", err)
		return types.Setting{
			Id:                   1,
			Favicon:              "favicon.ico",
			Title:                "Van Nav",
			GovRecord:            "",
			Logo192:              "logo192.png",
			Logo512:              "logo512.png",
			HideAdmin:            false,
			HideGithub:           false,
			HideToggleJumpTarget: false,
			JumpTargetBlank:      true,
			ShowSearchEngine:     true,
			PcColumnCount:        3,
			DeploymentVersion:    "",
		}
	}
	if hideGithub == nil {
		setting.HideGithub = false
	} else {
		if hideGithub.(int64) == 0 {
			setting.HideGithub = false
		} else {
			setting.HideGithub = true
		}
	}
	if hideAdmin == nil {
		setting.HideAdmin = false
	} else {
		if hideAdmin.(int64) == 0 {
			setting.HideAdmin = false
		} else {
			setting.HideAdmin = true
		}
	}

	if hideToggleJumpTarget == nil {
		setting.HideToggleJumpTarget = false
	} else {
		if hideToggleJumpTarget.(int64) == 0 {
			setting.HideToggleJumpTarget = false
		} else {
			setting.HideToggleJumpTarget = true
		}
	}

	if jumpTargetBlank == nil {
		setting.JumpTargetBlank = true
	} else {
		if jumpTargetBlank.(int64) == 0 {
			setting.JumpTargetBlank = false
		} else {
			setting.JumpTargetBlank = true
		}
	}

	// 搜索引擎显示开关（默认显示）
	if showSearchEngine == nil {
		setting.ShowSearchEngine = true
	} else {
		if showSearchEngine.(int64) == 0 {
			setting.ShowSearchEngine = false
		} else {
			setting.ShowSearchEngine = true
		}
	}

	// PC 端列数（默认 3）
	if pcColumnCount == nil {
		setting.PcColumnCount = 3
	} else {
		setting.PcColumnCount = int(pcColumnCount.(int64))
	}

	setting.DeploymentVersion = deploymentVersion

	return setting
}

func UpdateSetting(data types.Setting) error {
	sql_update_setting := `
		UPDATE nav_setting
		SET favicon = ?, title = ?, govRecord = ?, logo192 = ?, logo512 = ?, hideAdmin = ?, hideGithub = ?, hideToggleJumpTarget = ?, jumpTargetBlank = ?, showSearchEngine = ?, pcColumnCount = ?
		WHERE id = (SELECT id FROM nav_setting ORDER BY id ASC LIMIT 1);
		`

	stmt, err := database.DB.Prepare(sql_update_setting)
	if err != nil {
		return err
	}
	res, err := stmt.Exec(data.Favicon, data.Title, data.GovRecord, data.Logo192, data.Logo512, data.HideAdmin, data.HideGithub, data.HideToggleJumpTarget, data.JumpTargetBlank, data.ShowSearchEngine, data.PcColumnCount)
	if err != nil {
		return err
	}
	_, err = res.RowsAffected()
	if err != nil {
		return err
	}
	return nil
}
