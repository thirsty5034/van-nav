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
	Mode       string `json:"mode"`       // 背景模式：color=纯色/渐变 image=背景图片（二选一；空=按 image 是否存在推断）
	GradientTo string `json:"gradientTo"` // 渐变第二色（空=纯色 bgBase）
	Image      string `json:"image"`      // data: 协议或站内相对路径
	DimOpacity string `json:"dimOpacity"` // 背景暗色遮罩 0-1
}

// 卡片细项
type ThemeCardConfig struct {
	LogoRadius      string `json:"logoRadius"`      // 如 8px / 50%
	LogoSize        string `json:"logoSize"`        // 如 40px
	TitleColor      string `json:"titleColor"`      // 空=跟随 textPrimary
	HoverLift       bool   `json:"hoverLift"`       // hover 抬升动效
	Outline         bool   `json:"outline"`         // 描边模式（边框替代阴影）
	Height          string `json:"height"`          // 卡片高度，如 120px；空=自适应
	Width           string `json:"width"`           // 卡片宽度，如 320px；空=自适应（随网格列数均分）
	ShowLogo        bool   `json:"showLogo"`        // 展示 Logo
	ShowTitle       bool   `json:"showTitle"`       // 展示标题
	ShowDesc        bool   `json:"showDesc"`        // 展示简介
	ShowTag         bool   `json:"showTag"`         // 展示分类标签
	BgOpacity       string `json:"bgOpacity"`       // 卡片底色透明度 0-1；空=不透明
	TitleFontFamily string `json:"titleFontFamily"` // 标题字体族；空=跟随全局字体
	DescFontFamily  string `json:"descFontFamily"`  // 描述字体族；空=跟随全局字体
	DescColor       string `json:"descColor"`       // 描述颜色；空=跟随 textSecondary
	TagColor        string `json:"tagColor"`        // 卡内小标签文字色；空=跟随 textSecondary
	TagBg           string `json:"tagBg"`           // 卡内小标签底色；空=跟随 bgCard
	TagRadius       string `json:"tagRadius"`       // 卡内小标签圆角；空=4px
	BorderColor     string `json:"borderColor"`     // 卡片描边颜色（描边模式）；空=跟随全局边框色
}

// 链接与按钮
type ThemeLinkConfig struct {
	LinkColor    string `json:"linkColor"`    // 超链接颜色；空=跟随 primary
	ButtonRadius string `json:"buttonRadius"` // 按钮圆角 px
}

// 页脚/备案区
type ThemeFooterConfig struct {
	TextColor string `json:"textColor"` // 空=跟随 textSecondary
	BgColor   string `json:"bgColor"`   // 页脚背景色；空=透明融入页面背景
	Hidden    bool   `json:"hidden"`    // 隐藏备案区
	Text      string `json:"text"`      // 备案/页脚文案；空=跟随站点设置
	FontFamily string `json:"fontFamily"` // 页脚字体族；空=跟随全局字体
}

// 搜索框配置
type ThemeSearchConfig struct {
	Hidden           bool   `json:"hidden"`           // 显示/隐藏搜索框
	Position         string `json:"position"`         // 水平位置：left/center/right
	Width            string `json:"width"`            // 宽度占内容区比例，百分比如 60%
	Vertical         string `json:"vertical"`         // 摆放位置：top/bottom
	Height           string `json:"height"`           // 搜索框高度，如 40px
	Radius           string `json:"radius"`           // 圆角，如 8px
	Transparent      bool   `json:"transparent"`      // 透明无框
	TextColor        string `json:"textColor"`        // 文字颜色；空=跟随 textPrimary
	PlaceholderColor string `json:"placeholderColor"` // 占位提示颜色；空=跟随 textSecondary
	Placeholder      string `json:"placeholder"`      // 占位文案；空=使用默认
	FontFamily       string `json:"fontFamily"`       // 搜索框字体族；空=跟随全局字体
	FontSize         string `json:"fontSize"`         // 搜索框字号，如 16px；空=默认
	BgColor          string `json:"bgColor"`          // 搜索框背景颜色；空=跟随页面背景的半透明毛玻璃
	BorderColor      string `json:"borderColor"`      // 搜索框边框颜色；空=跟随全局边框色
}

// 分类标签配置
type ThemeTagConfig struct {
	Hidden      bool   `json:"hidden"`      // 显示/隐藏分类标签
	Position    string `json:"position"`    // 贴边位置：top/bottom/left/right
	Transparent bool   `json:"transparent"` // 透明无框
	Bg          string `json:"bg"`          // 底色；空=跟随 bgCard
	ActiveBg    string `json:"activeBg"`    // 选中底色；空=跟随 primary
	TextColor   string `json:"textColor"`   // 文字颜色；空=跟随 textPrimary
	Radius      string `json:"radius"`      // 圆角，如 8px
	FontFamily  string `json:"fontFamily"`  // 标签字体族；空=跟随全局字体
	FontSize    string `json:"fontSize"`    // 标签字号，如 13px；空=默认
	BorderColor string `json:"borderColor"` // 标签边框颜色；空=跟随全局边框色
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
	Search     ThemeSearchConfig `json:"search"`
	Tag        ThemeTagConfig    `json:"tag"`
}
