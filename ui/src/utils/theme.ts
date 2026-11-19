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

// 应用主题CSS变量到:root（暗色时优先使用夜间配色）
export const applyThemeVars = (config: ThemeConfig, isDark?: boolean) => {
  const root = document.documentElement;
  const dark = isDark ?? (document.querySelector('body')?.classList.contains('dark-mode') ?? false);
  const colors = dark && config.darkTheme?.colors ? config.darkTheme.colors : config.colors;
  const customCSS = dark && config.darkTheme?.customCSS ? config.darkTheme.customCSS : config.customCSS;
  
  // 应用色彩变量
  root.style.setProperty('--van-nav-primary', colors.primary);
  root.style.setProperty('--van-nav-bg-base', colors.bgBase);
  root.style.setProperty('--van-nav-bg-card', colors.bgCard);
  root.style.setProperty('--van-nav-text-primary', colors.textPrimary);
  root.style.setProperty('--van-nav-text-secondary', colors.textSecondary);
  root.style.setProperty('--van-nav-border', colors.border);
  
  // 应用布局变量
  root.style.setProperty('--van-nav-card-radius', config.layout.cardBorderRadius);
  root.style.setProperty('--van-nav-card-shadow', config.layout.cardShadow);
  root.style.setProperty('--van-nav-card-padding', config.layout.cardPadding);
  root.style.setProperty('--van-nav-card-gap', config.layout.cardGap);
  
  // 应用排版变量
  root.style.setProperty('--van-nav-title-size', config.typography.titleFontSize);
  root.style.setProperty('--van-nav-title-weight', config.typography.titleFontWeight);
  root.style.setProperty('--van-nav-desc-size', config.typography.descFontSize);
  
  // 应用自定义CSS
  let styleEl = document.getElementById('van-nav-custom-css');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'van-nav-custom-css';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = customCSS || '';
  
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
  const root = document.documentElement;
  const customProps = [
    '--van-nav-primary',
    '--van-nav-bg-base', '--van-nav-bg-card',
    '--van-nav-text-primary', '--van-nav-text-secondary', '--van-nav-border',
    '--van-nav-card-radius', '--van-nav-card-shadow', '--van-nav-card-padding',
    '--van-nav-card-gap', '--van-nav-header-height',
    '--van-nav-title-size',
    '--van-nav-title-weight', '--van-nav-desc-size',
  ];
  
  customProps.forEach(prop => root.style.removeProperty(prop));
  
  // 清除自定义CSS
  const styleEl = document.getElementById('van-nav-custom-css');
  if (styleEl) {
    styleEl.textContent = '';
  }
  
  setCurrentThemeConfig(null);
};
