package types

// 默认是 0
type Setting struct {
	Id                   int    `json:"id"`
	Favicon              string `json:"favicon"`
	Title                string `json:"title"`
	GovRecord            string `json:"govRecord"`
	Logo192              string `json:"logo192"`
	Logo512              string `json:"logo512"`
	HideAdmin            bool   `json:"hideAdmin"`
	HideGithub           bool   `json:"hideGithub"`
	HideToggleJumpTarget bool   `json:"hideToggleJumpTarget"`
	JumpTargetBlank      bool   `json:"jumpTargetBlank"`
	ShowSearchEngine     bool   `json:"showSearchEngine"`
	PcColumnCount        int    `json:"pcColumnCount"`
	DeploymentVersion    string `json:"deploymentVersion"`
	Language             string `json:"language"`
}

type Token struct {
	Id       int    `json:"id"`
	Name     string `json:"name"`
	Value    string `json:"value"`
	Disabled int    `json:"disabled"`
}

type User struct {
	Id       int    `json:"id"`
	Name     string `json:"name"`
	Password string `json:"password"`
}
type Img struct {
	Id    int    `json:"id"`
	Url   string `json:"url"`
	Value string `json:"value"`
}

type Tool struct {
	Id          int    `json:"id"`
	Name        string `json:"name"`
	Url         string `json:"url"`
	Logo        string `json:"logo"`
	Catelog     string `json:"catelog"`
	Desc        string `json:"desc"`
	Sort        int    `json:"sort"`
	Hide        bool   `json:"hide"`
	IsAlive     *bool  `json:"is_alive,omitempty"`
	LastChecked string `json:"last_checked,omitempty"`
	CreatedAt   string `json:"created_at,omitempty"`
}

type Catelog struct {
	Id   int    `json:"id"`
	Name string `json:"name"`
	Sort int    `json:"sort"`
	Hide bool   `json:"hide"`
}

// 搜索引擎模型 - 使用 URL 模板方式
type SearchEngine struct {
	Id          int    `json:"id"`
	Name        string `json:"name"`
	UrlTemplate string `json:"urlTemplate"`
	Logo        string `json:"logo"`
	Sort        int    `json:"sort"`
	Enabled     bool   `json:"enabled"`
	Description string `json:"description"`
}

// 网站配置模型
type SiteConfig struct {
	Id                 int    `json:"id"`
	NoImageMode        bool   `json:"noImageMode"`
	CompactMode        bool   `json:"compactMode"`
	FaviconApiEnabled  bool   `json:"faviconApiEnabled"`
	FaviconApiTemplate string `json:"faviconApiTemplate"`
	SortByClicks       bool   `json:"sortByClicks"`
}

// WebDAV 备份配置模型
type BackupConfig struct {
	ID               int    `json:"id"`
	WebDAVURL        string `json:"webdavUrl"`
	Username         string `json:"username"`
	Password         string `json:"password"`
	BackupDir        string `json:"backupDir"`
	ScheduleType     string `json:"scheduleType"`
	ScheduleTime     string `json:"scheduleTime"`
	CronExpr         string `json:"cronExpr"`
	RetentionType    string `json:"retentionType"`
	RetentionValue   int    `json:"retentionValue"`
	LastBackupTime   string `json:"lastBackupTime,omitempty"`
	LastBackupStatus string `json:"lastBackupStatus,omitempty"`
	Enabled          bool   `json:"enabled"`
	CreatedAt        string `json:"createdAt"`
	UpdatedAt        string `json:"updatedAt"`
}

// ==================== 主题美化配置相关 ====================

// 主题色彩配置
type ThemeColors struct {
	Primary        string `json:"primary"`
	BgBase         string `json:"bgBase"`
	BgCard         string `json:"bgCard"`
	TextPrimary    string `json:"textPrimary"`
	TextSecondary  string `json:"textSecondary"`
	Border         string `json:"border"`
}

// 主题布局配置
type ThemeLayout struct {
	CardBorderRadius string `json:"cardBorderRadius"`
	CardShadow       string `json:"cardShadow"`
	CardPadding      string `json:"cardPadding"`
	CardGap          string `json:"cardGap"`
}

// 主题排版配置
type ThemeTypography struct {
	TitleFontSize   string `json:"titleFontSize"`
	TitleFontWeight string `json:"titleFontWeight"`
	DescFontSize    string `json:"descFontSize"`
}

// 夜间模式策略配置
type NightModeConfig struct {
	// Mode: system=跟随系统 scheduled=定时窗口 off=关闭自动
	Mode string `json:"mode"`
	// Start/End: HH:mm，scheduled 模式的夜间窗口，支持跨午夜（如 18:00-08:00）
	Start string `json:"start,omitempty"`
	End   string `json:"end,omitempty"`
}

// 夜间主题配色（变暗时应用；布局排版与日间共享）
type DarkThemeConfig struct {
	Colors    ThemeColors `json:"colors"`
	CustomCSS string      `json:"customCSS"`
}

// 全局字体
type ThemeFontConfig struct {
	Family       string `json:"family"`       // 字体族（空=默认栈）
	BaseFontSize string `json:"baseFontSize"` // 正文字号，如 14px
}

// 全局圆角风格：none=直角 small=4px medium=8px large=16px
type ThemeRadiusConfig struct {
	Style string `json:"style"`
}

// 顶栏样式
type ThemeTopbarConfig struct {
	Background string `json:"background"` // 颜色；transparent=透明
	TextColor  string `json:"textColor"`
	Blur       bool   `json:"blur"`   // 毛玻璃效果
	Height     string `json:"height"` // 如 56px；空=默认
}

// 页面背景增强
type ThemePageBgConfig struct {
	GradientTo string `json:"gradientTo"` // 渐变第二色（空=纯色 bgBase）
	Image      string `json:"image"`      // data: 协议或站内相对路径
	DimOpacity string `json:"dimOpacity"` // 背景暗色遮罩 0-1
}

// 卡片细项
type ThemeCardConfig struct {
	LogoRadius string `json:"logoRadius"` // 如 8px / 50%
	LogoSize   string `json:"logoSize"`   // 如 40px
	TitleColor string `json:"titleColor"` // 空=跟随 textPrimary
	HoverLift  bool   `json:"hoverLift"`  // hover 抬升动效
	Outline    bool   `json:"outline"`    // 描边模式（边框替代阴影）
}

// 链接与按钮
type ThemeLinkConfig struct {
	LinkColor    string `json:"linkColor"`    // 超链接颜色；空=跟随 primary
	ButtonRadius string `json:"buttonRadius"` // 按钮圆角 px
}

// 页脚/备案区
type ThemeFooterConfig struct {
	TextColor string `json:"textColor"` // 空=跟随 textSecondary
	Hidden    bool   `json:"hidden"`    // 隐藏备案区
}

// 完整主题配置
type ThemeConfig struct {
	Version    string            `json:"version"`
	Colors     ThemeColors       `json:"colors"`
	Layout     ThemeLayout       `json:"layout"`
	Typography ThemeTypography   `json:"typography"`
	CustomCSS  string            `json:"customCSS"`
	NightMode  NightModeConfig   `json:"nightMode"`
	DarkTheme  DarkThemeConfig   `json:"darkTheme"`
	Font       ThemeFontConfig   `json:"font"`
	Radius     ThemeRadiusConfig `json:"radius"`
	Topbar     ThemeTopbarConfig `json:"topbar"`
	PageBg     ThemePageBgConfig `json:"pageBg"`
	CardExtra  ThemeCardConfig   `json:"cardExtra"`
	LinkBtn    ThemeLinkConfig   `json:"linkBtn"`
	Footer     ThemeFooterConfig `json:"footer"`
}
