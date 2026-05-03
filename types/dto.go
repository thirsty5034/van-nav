package types

type ResUserDto struct {
	Name string `json:"name"`
}

type UpdateUserDto struct {
	Id       int64  `json:"id"`
	Name     string `json:"name"`
	Password string `json:"password"`
}

type LoginDto struct {
	Name     string `json:"name"`
	Password string `json:"password"`
}
type AddTokenDto struct {
	Name string `json:"name"`
}

type UpdateCatelogDto struct {
	Id   int    `json:"id"`
	Name string `json:"name"`
	Sort int    `json:"sort"`
	Hide bool   `json:"hide"`
}

type AddCatelogDto struct {
	Name string `json:"name"`
	Sort int    `json:"sort"`
	Hide bool   `json:"hide"`
}
type UpdateToolDto struct {
	Id      int    `json:"id"`
	Name    string `json:"name"`
	Url     string `json:"url"`
	Logo    string `json:"logo"`
	Catelog string `json:"catelog"`
	Desc    string `json:"desc"`
	Sort    int    `json:"sort"`
	Hide    bool   `json:"hide"`
}
type AddToolDto struct {
	Name    string `json:"name"`
	Url     string `json:"url"`
	Logo    string `json:"logo"`
	Catelog string `json:"catelog"`
	Desc    string `json:"desc"`
	Sort    int    `json:"sort"`
	Hide    bool   `json:"hide"`
}

type FetchPageInfoResponse struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

type MaxSortResponse struct {
	MaxSort int `json:"maxSort"`
}
type UpdateToolsSortDto struct {
	Id   int `json:"id"`
	Sort int `json:"sort"`
}

// ==================== 导入导出相关 ====================

// 导出配置响应
type ExportConfigResponse struct {
	ExportTime    string         `json:"export_time"`
	Version       string         `json:"version"`
	Tools         []Tool         `json:"tools"`
	Catelogs      []Catelog      `json:"categories"`
	SearchEngines []SearchEngine `json:"search_engines"`
	ApiTokens     []Token        `json:"api_tokens"`
	Settings      map[string]string `json:"settings"`
	SiteConfig    map[string]interface{} `json:"site_config"`
}

// 导入配置请求
type ImportConfigRequest struct {
	Tools         []Tool         `json:"tools"`
	Catelogs      []Catelog      `json:"categories"`
	SearchEngines []SearchEngine `json:"search_engines"`
	ApiTokens     []Token        `json:"api_tokens"`
	Settings      map[string]string `json:"settings"`
	SiteConfig    map[string]interface{} `json:"site_config"`
}

// 导入配置响应
type ImportConfigResponse struct {
	Success       bool                    `json:"success"`
	Message       string                  `json:"message"`
	ToolsImported int                     `json:"tools_imported"`
	ToolsSkipped  int                     `json:"tools_skipped"`
	CatelogsImported int                  `json:"categories_imported"`
	SearchEnginesImported int             `json:"search_engines_imported"`
	ApiTokensImported int                 `json:"api_tokens_imported"`
	ApiTokensSkipped int                  `json:"api_tokens_skipped"`
	SettingsUpdated int                   `json:"settings_updated"`
	SiteConfigUpdated int                 `json:"site_config_updated"`
	Errors        []string                `json:"errors"`
}
