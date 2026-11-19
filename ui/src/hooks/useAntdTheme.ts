import { useEffect, useState } from "react";
import { theme as antdTheme } from "antd";
import { getCurrentThemeConfig } from "../utils/theme";

// antd 默认夜间兜底（与 service.getDefaultDarkTheme 保持一致）
const defaultDarkColors = {
  primary: "#4096ff",
  bgBase: "#0f1115",
  bgCard: "#1d1f24",
  textPrimary: "#ffffffe0",
  textSecondary: "#ffffffa6",
  border: "#333333",
};

/**
 * 把当前主题配置映射为 antd v5 的 ConfigProvider theme：
 * - 夜间：darkAlgorithm + 夜间配色 token
 * - 日间：defaultAlgorithm + 日间配色 token
 * 让 antd 组件（按钮/单选框/弹层等）真正跟随主题管理里的配色与夜间模式。
 *
 * 响应三类信号：theme-change（手动切换/自动策略跨越）、storage（跨标签页）、
 * theme-config-loaded（主题配置异步加载完成）。
 */
export const useAntdTheme = () => {
  const [bump, setBump] = useState(0);

  useEffect(() => {
    const refresh = () => setBump((v) => v + 1);
    window.addEventListener("theme-change", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("theme-config-loaded", refresh);
    return () => {
      window.removeEventListener("theme-change", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("theme-config-loaded", refresh);
    };
  }, []);

  const isDark = document.body.classList.contains("dark-mode");
  const cfg = getCurrentThemeConfig();
  const colors = isDark
    ? cfg?.darkTheme?.colors || defaultDarkColors
    : cfg?.colors;

  return {
    isDark,
    antdTheme: {
      algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: {
        colorPrimary: colors?.primary,
        colorBgBase: colors?.bgBase,
        colorBgContainer: colors?.bgCard,
        colorTextBase: colors?.textPrimary,
        colorBorder: colors?.border,
      },
    },
  };
};
