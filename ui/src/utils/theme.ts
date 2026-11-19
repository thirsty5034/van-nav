// ==================== 夜间模式策略 ====================

export interface NightModeConfig {
  mode: 'system' | 'scheduled' | 'off';
  start?: string;
  end?: string;
}

export interface DarkThemeConfig {
  colors: ThemeColors;
  customCSS: string;
}

export interface ThemeFontConfig {
  family?: string;
  baseFontSize?: string;
}

export interface ThemeRadiusConfig {
  style?: 'none' | 'small' | 'medium' | 'large';
}

export interface ThemeTopbarConfig {
  background?: string;
  textColor?: string;
  blur?: boolean;
  height?: string;
}

export interface ThemePageBgConfig {
  mode?: 'color' | 'image';
  gradientTo?: string;
  image?: string;
  dimOpacity?: string;
}

export interface ThemeCardConfig {
  logoRadius?: string;
  logoSize?: string;
  titleColor?: string;
  hoverLift?: boolean;
  outline?: boolean;
  height?: string;
  showLogo?: boolean;
  showTitle?: boolean;
  showDesc?: boolean;
  showTag?: boolean;
  bgOpacity?: string;
  titleFontFamily?: string;
  descFontFamily?: string;
  descColor?: string;
  tagColor?: string;
  tagBg?: string;
  tagRadius?: string;
  borderColor?: string;
}

export interface ThemeLinkConfig {
  linkColor?: string;
  buttonRadius?: string;
}

export interface ThemeFooterConfig {
  textColor?: string;
  bgColor?: string;
  hidden?: boolean;
  text?: string;
  fontFamily?: string;
}

export interface ThemeSearchConfig {
  hidden?: boolean;
  position?: 'left' | 'center' | 'right';
  width?: string;
  vertical?: 'top' | 'bottom';
  height?: string;
  radius?: string;
  transparent?: boolean;
  textColor?: string;
  placeholderColor?: string;
  placeholder?: string;
  fontFamily?: string;
  fontSize?: string;
  bgColor?: string;
  borderColor?: string;
}

export interface ThemeTagConfig {
  hidden?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  transparent?: boolean;
  bg?: string;
  activeBg?: string;
  textColor?: string;
  radius?: string;
  fontFamily?: string;
  fontSize?: string;
  borderColor?: string;
}

const toMinutes = (s?: string): number => {
  if (!s || !/^\d{1,2}:\d{2}$/.test(s)) return NaN;
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

/**
 * 判定 now 是否落在夜间窗口内（纯函数，支持跨午夜如 18:00-08:00）。
 * start === end 视为全天夜间；非法时间返回 false。
 */
export const isInNightWindow = (now: Date, start?: string, end?: string): boolean => {
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (Number.isNaN(s) || Number.isNaN(e)) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  if (s === e) return true;
  if (s < e) return cur >= s && cur < e;
  return cur >= s || cur < e; // 跨午夜环形区间
};

/**
 * 亮暗决策唯一入口：
 * - 手动偏好 light/dark 直接生效
 * - auto 按全站夜间策略解码：system=跟随系统；scheduled=时间窗口；off=不自动
 */
export const resolveIsDark = (
  pref: string,
  nightMode?: Partial<NightModeConfig>
): boolean => {
  if (pref === 'dark') return true;
  if (pref === 'light') return false;
  const mode = nightMode?.mode || 'system';
  if (mode === 'off') return false;
  if (mode === 'scheduled') {
    return isInNightWindow(new Date(), nightMode?.start || '18:00', nightMode?.end || '08:00');
  }
  // system（缺省）
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
};

export const initTheme = (): 'auto' | 'light' | 'dark' => {
  if (typeof localStorage == "undefined") {
    return "auto";
  }
  if (!("theme" in localStorage) || localStorage.theme === "auto") {
    return "auto";
  }
  return localStorage.theme === "dark" ? "dark" : "light";
};

/**
 * 统一主题应用入口：读访客偏好 → 按夜间策略决策 → 切换样式类 → 应用对应配色变量。
 * 页面各处（DarkSwitch / ThemeSync / 全局监听）一律调用本函数，避免解码规则分散。
 */
export const applyPreferredTheme = (source: string) => {
  const pref = initTheme();
  const cfg = getCurrentThemeConfig();
  const isDark = resolveIsDark(pref, cfg?.nightMode);
  const body = document.querySelector('body');
  const html = document.documentElement;
  if (body) body.classList.toggle('dark-mode', isDark);
  if (html) html.classList.toggle('dark', isDark);
  // 主题切换后重新应用CSS变量（暗色走夜间配色）
  reapplyThemeVars();
  console.log(`[Apply Theme][${source}] ${isDark ? 'dark' : 'light'} (pref=${pref}, mode=${cfg?.nightMode?.mode || 'system'})`);
};

/**
 * 全局主题观察器（单例）：
 * - 系统亮暗变化时即时响应（matchMedia）
 * - 每分钟检查一次，保证定时窗口跨过起止边界时自动切换
 * 仅当访客偏好为 auto 时才实际重算应用。
 */
let watcherStarted = false;
export const startThemeWatcher = () => {
  if (watcherStarted || typeof window === 'undefined') return;
  watcherStarted = true;
  const tick = () => {
    if (initTheme() !== 'auto') return; // 手动偏好时不自动干预
    applyPreferredTheme('watcher');
    // 通知订阅方（antd 主题、全局监听）自动策略已重算
    broadcastThemeChange();
  };
  try {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    mql.addEventListener('change', tick);
  } catch {
    // matchMedia 不可用时仅靠定时检查
  }
  setInterval(tick, 60 * 1000);
};

/**
 * 广播主题变更事件，通知其他标签页/页面同步主题
 */
export const broadcastThemeChange = () => {
  if (typeof window !== "undefined" && window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent("theme-change"));
  }
};

// ==================== 主题美化配置相关 ====================

// 主题配置类型定义
export interface ThemeColors {
  primary: string;
  bgBase: string;
  bgCard: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
}

export interface ThemeLayout {
  cardBorderRadius: string;
  cardShadow: string;
  cardPadding: string;
  cardGap: string;
}

export interface ThemeTypography {
  titleFontSize: string;
  titleFontWeight: string;
  descFontSize: string;
}

export interface ThemeConfig {
  version: string;
  colors: ThemeColors;
  layout: ThemeLayout;
  typography: ThemeTypography;
  customCSS: string;
  nightMode?: NightModeConfig;
  darkTheme?: DarkThemeConfig;
  font?: ThemeFontConfig;
  radius?: ThemeRadiusConfig;
  topbar?: ThemeTopbarConfig;
  pageBg?: ThemePageBgConfig;
  cardExtra?: ThemeCardConfig;
  linkBtn?: ThemeLinkConfig;
  footer?: ThemeFooterConfig;
  search?: ThemeSearchConfig;
  tag?: ThemeTagConfig;
}

// 缓存当前主题配置
let currentThemeConfig: ThemeConfig | null = null;

// 设置当前主题配置
export const setCurrentThemeConfig = (config: ThemeConfig | null) => {
  currentThemeConfig = config;
};

// 获取当前主题配置
export const getCurrentThemeConfig = (): ThemeConfig | null => {
  return currentThemeConfig;
};

// 判断 8 位 hex 颜色是否为全透明（alpha=00），用于让“透明背景”真正全透明（同时去掉毛玻璃模糊）
const isTransparentHex = (v?: string): boolean => typeof v === 'string' && /^#[0-9a-f]{6}00$/i.test(v);

// 计算主题 CSS 变量表（纯映射，主页面与预览 iframe 共用）
export const computeThemeVars = (config: ThemeConfig, dark: boolean): Record<string, string> => {
  const colors = dark && config.darkTheme?.colors ? config.darkTheme.colors : config.colors;
  const customCSS = dark && config.darkTheme?.customCSS ? config.darkTheme.customCSS : config.customCSS;
  const radiusMap: Record<string, string> = { none: '0px', small: '4px', medium: '8px', large: '16px' };

  const topbarBg = config.topbar?.background
    || (config.topbar?.blur ? 'color-mix(in srgb, var(--van-nav-bg-base) 80%, transparent)' : 'transparent');

  // 背景模式二选一：color=纯色/渐变，image=背景图片；旧数据无 mode 时按是否有图片推断
  const bgMode = config.pageBg?.mode === 'image' || (!config.pageBg?.mode && !!config.pageBg?.image) ? 'image' : 'color';
  let pageBg = 'var(--van-nav-bg-base)';
  if (bgMode === 'color' && config.pageBg?.gradientTo) {
    pageBg = `linear-gradient(180deg, var(--van-nav-bg-base), ${config.pageBg.gradientTo})`;
  }
  if (bgMode === 'image' && config.pageBg?.image) {
    const dim = config.pageBg.dimOpacity
      ? `linear-gradient(rgba(0,0,0,${config.pageBg.dimOpacity}),rgba(0,0,0,${config.pageBg.dimOpacity})),`
      : '';
    pageBg = `${dim} url("${config.pageBg.image}") center/cover fixed no-repeat`;
  }

  return {
    // 色彩
    '--van-nav-primary': colors.primary,
    '--van-nav-bg-base': colors.bgBase,
    '--van-nav-bg-card': colors.bgCard,
    '--van-nav-text-primary': colors.textPrimary,
    '--van-nav-text-secondary': colors.textSecondary,
    '--van-nav-border': colors.border,
    // 布局
    '--van-nav-card-radius': config.layout.cardBorderRadius,
    '--van-nav-card-shadow': config.layout.cardShadow,
    '--van-nav-card-padding': config.layout.cardPadding,
    '--van-nav-card-gap': config.layout.cardGap,
    // 排版
    '--van-nav-title-size': config.typography.titleFontSize,
    '--van-nav-title-weight': config.typography.titleFontWeight,
    '--van-nav-desc-size': config.typography.descFontSize,
    // 扩展：字体/圆角
    '--van-nav-font-family': config.font?.family || '',
    '--van-nav-base-font-size': config.font?.baseFontSize || '14px',
    '--van-nav-radius-global': radiusMap[config.radius?.style || 'small'] || '4px',
    // 扩展：顶栏
    '--van-nav-topbar-bg': topbarBg,
    '--van-nav-topbar-text': config.topbar?.textColor || 'var(--van-nav-text-primary)',
    '--van-nav-topbar-height': config.topbar?.height || '',
    '--van-nav-topbar-filter': config.topbar?.blur ? 'blur(12px)' : 'none',
    // 扩展：页面背景
    '--van-nav-page-bg': pageBg,
    // 扩展：卡片细项
    '--van-nav-card-logo-radius': config.cardExtra?.logoRadius || '0px',
    '--van-nav-card-logo-size': config.cardExtra?.logoSize || '32px',
    '--van-nav-card-title-color': config.cardExtra?.titleColor || 'var(--van-nav-text-primary)',
    // 扩展：链接/按钮、页脚
    '--van-nav-link-color': config.linkBtn?.linkColor || 'var(--van-nav-primary)',
    '--van-nav-btn-radius': config.linkBtn?.buttonRadius || '4px',
    '--van-nav-footer-text': config.footer?.textColor || 'var(--van-nav-text-secondary)',
    '--van-nav-footer-bg': config.footer?.bgColor || '',
    '--van-nav-footer-font-family': config.footer?.fontFamily || '',
    // 扩展：搜索框（空值=移除变量，回退 CSS 默认）
    '--van-nav-search-hidden': config.search?.hidden ? 'true' : 'false',
    '--van-nav-search-position': config.search?.position || '',
    '--van-nav-search-width': config.search?.width || '',
    '--van-nav-search-vertical': config.search?.vertical || '',
    '--van-nav-search-height': config.search?.height || '',
    '--van-nav-search-radius': config.search?.radius || '',
    '--van-nav-search-transparent': config.search?.transparent ? 'true' : 'false',
    '--van-nav-search-text-color': config.search?.textColor || '',
    '--van-nav-search-placeholder-color': config.search?.placeholderColor || '',
    '--van-nav-search-font-family': config.search?.fontFamily || '',
    '--van-nav-search-font-size': config.search?.fontSize || '',
    '--van-nav-search-bg': config.search?.bgColor || '',
    '--van-nav-search-border-color': config.search?.borderColor || '',
    // 背景全透明时去掉毛玻璃模糊，呈现完全透明
    '--van-nav-search-filter': isTransparentHex(config.search?.bgColor) ? 'none' : '',
    // 扩展：分类标签
    '--van-nav-tag-hidden': config.tag?.hidden ? 'true' : 'false',
    '--van-nav-tag-position': config.tag?.position || '',
    '--van-nav-tag-bg': config.tag?.bg || '',
    '--van-nav-tag-active-bg': config.tag?.activeBg || '',
    '--van-nav-tag-text-color': config.tag?.textColor || '',
    '--van-nav-tag-radius': config.tag?.radius || '',
    '--van-nav-tag-font-family': config.tag?.fontFamily || '',
    '--van-nav-tag-font-size': config.tag?.fontSize || '',
    '--van-nav-tag-border-color': config.tag?.borderColor || '',
    // 扩展：卡片高度/展示开关/底色透明度（展示开关缺省视为展示）
    '--van-nav-card-height': config.cardExtra?.height || '',
    '--van-nav-card-show-logo': config.cardExtra?.showLogo === false ? 'false' : 'true',
    '--van-nav-card-show-title': config.cardExtra?.showTitle === false ? 'false' : 'true',
    '--van-nav-card-show-desc': config.cardExtra?.showDesc === false ? 'false' : 'true',
    '--van-nav-card-show-tag': config.cardExtra?.showTag === false ? 'false' : 'true',
    // 透明度合法值 0 也要写入（空串才移除变量回退 1）；0 || '' 会把 0 吞掉导致全透明失效
    '--van-nav-card-bg-opacity': (config.cardExtra?.bgOpacity === undefined || config.cardExtra?.bgOpacity === null || config.cardExtra?.bgOpacity === '') ? '' : String(config.cardExtra.bgOpacity),
    // 扩展：卡片标题/描述/小标签 分区自定义
    '--van-nav-card-title-font-family': config.cardExtra?.titleFontFamily || '',
    '--van-nav-card-desc-font-family': config.cardExtra?.descFontFamily || '',
    '--van-nav-card-desc-color': config.cardExtra?.descColor || '',
    '--van-nav-card-tag-color': config.cardExtra?.tagColor || '',
    '--van-nav-card-tag-bg': config.cardExtra?.tagBg || '',
    '--van-nav-card-tag-radius': config.cardExtra?.tagRadius || '',
    '--van-nav-card-border-color': config.cardExtra?.borderColor || '',
    // 自定义 CSS 挂到变量，便于预览复用
    '--van-nav-custom-css': customCSS || '',
  };
};

// 应用主题CSS变量到 body（暗色时优先使用夜间配色）
// 把变量表应用到指定元素的 style（空值移除，回到 CSS 默认）；主页面与预览 iframe 共用
export const applyVarsToStyle = (style: CSSStyleDeclaration, vars: Record<string, string>) => {
  Object.entries(vars).forEach(([key, value]) => {
    if (key === '--van-nav-custom-css') return;
    if (value === '') style.removeProperty(key);
    else style.setProperty(key, value);
  });
};

export const applyThemeVars = (config: ThemeConfig, isDark?: boolean) => {
  // 挂载到 body：inline 变量优先级高于 body.dark-mode 类内覆盖，夜间配色才能真实生效
  const root = document.body;
  const dark = isDark ?? (document.querySelector('body')?.classList.contains('dark-mode') ?? false);
  const vars = computeThemeVars(config, dark);

  applyVarsToStyle(root.style, vars);

  // 模式类：hover 动效开关 / 描边模式 / 页脚隐藏
  document.body.classList.toggle('card-hover-off', config.cardExtra?.hoverLift === false);
  document.body.classList.toggle('card-outline-mode', config.cardExtra?.outline === true);
  document.body.classList.toggle('footer-hidden', config.footer?.hidden === true);

  // 应用自定义CSS
  let styleEl = document.getElementById('van-nav-custom-css');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'van-nav-custom-css';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = vars['--van-nav-custom-css'];

  // 缓存配置
  setCurrentThemeConfig(config);
};

// 重新应用当前缓存的主题变量（用于主题切换时）
export const reapplyThemeVars = () => {
  if (currentThemeConfig) {
    applyThemeVars(currentThemeConfig);
  }
};

// 清除自定义主题变量（恢复默认）
export const clearThemeVars = () => {
  const root = document.body;
  const customProps = [
    '--van-nav-primary',
    '--van-nav-bg-base', '--van-nav-bg-card',
    '--van-nav-text-primary', '--van-nav-text-secondary', '--van-nav-border',
    '--van-nav-card-radius', '--van-nav-card-shadow', '--van-nav-card-padding',
    '--van-nav-card-gap', '--van-nav-header-height',
    '--van-nav-title-size',
    '--van-nav-title-weight', '--van-nav-desc-size',
    '--van-nav-font-family', '--van-nav-base-font-size', '--van-nav-radius-global',
    '--van-nav-topbar-bg', '--van-nav-topbar-text', '--van-nav-topbar-height', '--van-nav-topbar-filter',
    '--van-nav-page-bg',
    '--van-nav-card-logo-radius', '--van-nav-card-logo-size', '--van-nav-card-title-color',
    '--van-nav-link-color', '--van-nav-btn-radius', '--van-nav-footer-text',
    '--van-nav-search-hidden', '--van-nav-search-position', '--van-nav-search-width',
    '--van-nav-search-vertical', '--van-nav-search-height', '--van-nav-search-radius',
    '--van-nav-search-transparent', '--van-nav-search-text-color', '--van-nav-search-placeholder-color',
    '--van-nav-tag-hidden', '--van-nav-tag-position', '--van-nav-tag-bg',
    '--van-nav-tag-active-bg', '--van-nav-tag-text-color', '--van-nav-tag-radius',
    '--van-nav-card-height', '--van-nav-card-show-logo', '--van-nav-card-show-title',
    '--van-nav-card-show-desc', '--van-nav-card-show-tag', '--van-nav-card-bg-opacity',
    '--van-nav-footer-bg', '--van-nav-footer-font-family',
    '--van-nav-search-font-family', '--van-nav-search-font-size', '--van-nav-search-bg',
    '--van-nav-search-border-color', '--van-nav-search-filter',
    '--van-nav-tag-font-family', '--van-nav-tag-font-size', '--van-nav-tag-border-color',
    '--van-nav-card-title-font-family', '--van-nav-card-desc-font-family',
    '--van-nav-card-desc-color', '--van-nav-card-tag-color', '--van-nav-card-tag-bg',
    '--van-nav-card-tag-radius', '--van-nav-card-border-color',
  ];

  customProps.forEach(prop => root.style.removeProperty(prop));

  // 清除模式类
  document.body.classList.remove('card-hover-off', 'card-outline-mode', 'footer-hidden');

  // 清除自定义CSS
  const styleEl = document.getElementById('van-nav-custom-css');
  if (styleEl) {
    styleEl.textContent = '';
  }
  
  setCurrentThemeConfig(null);
};
