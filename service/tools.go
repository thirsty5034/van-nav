package service

import (
	"strings"
	"sync"

	"github.com/mereith/nav/database"
	"github.com/mereith/nav/logger"
	"github.com/mereith/nav/types"
)

func ValidateToolLogo(logo string) error {
	return ValidateDataURLImage("Logo", logo, "png/jpeg/webp/ico", 200, webIconImageMIMEs)
}

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

	for _, v := range data {
		if v.Catelog != "" {
			// 确保分类存在
			_ = database.InsertNewCatelog(v.Catelog, 0, false)
		}
		if err := ValidateToolLogo(v.Logo); err != nil {
			skipped++
			continue
		}
		_, err := database.InsertToolRow(types.AddToolDto{
			Name: v.Name, Url: v.Url, Logo: v.Logo, Catelog: v.Catelog,
			Desc: v.Desc, Sort: v.Sort, Hide: v.Hide,
		})
		if err != nil {
			skipped++
			continue
		}
		imported++
		if v.Catelog != "" {
			found := false
			for _, c := range catelogs {
				if c == v.Catelog {
					found = true
					break
				}
			}
			if !found {
				catelogs = append(catelogs, v.Catelog)
			}
		}
	}

	// 异步转存所有图片
	go func() {
		defer func() {
			if r := recover(); r != nil {
				logger.LogError("ImportTools async image download panic: %v", r)
			}
		}()
		for _, v := range data {
			if v.Logo != "" && !strings.HasPrefix(v.Logo, "data:") {
				UpdateImg(v.Logo)
			}
		}
	}()

	InvalidateAllDataCache()
	return ImportToolsResult{Imported: imported, Skipped: skipped, Categories: catelogs}
}

func UpdateTool(data types.UpdateToolDto) error {
	if err := ValidateToolLogo(data.Logo); err != nil {
		return err
	}
	err := database.UpdateToolRow(data)
	if err != nil {
		return err
	}
	InvalidateAllDataCache()
	if data.Logo != "" && !strings.HasPrefix(data.Logo, "data:") {
		go UpdateImg(data.Logo)
	}
	return nil
}

func AddTool(data types.AddToolDto) (int64, error) {
	addToolMutex.Lock()
	defer addToolMutex.Unlock()

	if err := ValidateToolLogo(data.Logo); err != nil {
		return 0, err
	}

	id, err := database.InsertToolRow(data)
	if err != nil {
		return 0, err
	}
	logger.LogInfo("新增工具: %s", data.Name)
	InvalidateAllDataCache()
	if data.Logo != "" && !strings.HasPrefix(data.Logo, "data:") {
		go UpdateImg(data.Logo)
	}
	return id, nil
}

func GetAllTool() ([]types.Tool, error) {
	return database.GetAllToolRows()
}

func GetToolLogoUrlById(id int) (string, error) {
	return database.GetToolLogoUrl(id)
}

func UpdateToolIcon(id int64, logo string) error {
	err := database.UpdateToolLogoUrl(id, logo)
	if err != nil {
		return err
	}
	InvalidateAllDataCache()
	if logo != "" && !strings.HasPrefix(logo, "data:") {
		UpdateImg(logo)
	}
	return nil
}

func UpdateToolsSort(updates []types.UpdateToolsSortDto) error {
	err := database.UpdateToolSortBatch(updates)
	if err == nil {
		InvalidateAllDataCache()
	}
	return err
}

func GetMaxSort() (int, error) {
	return database.GetToolMaxSort()
}

func DeleteTool(id string) error {
	err := database.DeleteToolWithImage(id)
	if err == nil {
		InvalidateAllDataCache()
	}
	return err
}

func UpdateToolDesc(id int, desc string) error {
	err := database.UpdateToolDescription(id, desc)
	if err == nil {
		InvalidateAllDataCache()
	}
	return err
}
