import { Button, Card, Checkbox, ColorPicker, Form, Input, InputNumber, message, Modal, Radio, Select, Space, Spin, Switch, Tabs, TimePicker } from "antd";
import dayjs from "dayjs";
import type { Color } from "antd/es/color-picker";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchGetTheme,
  fetchUpdateTheme,
  fetchResetTheme,
  fetchListThemePresets,
  fetchSaveThemePreset,
  fetchDeleteThemePreset,
  fetchApplyThemePreset,
  fetchExportTheme,
  fetchImportTheme,
} from "../../../utils/api";
import { applyPreferredTheme, applyThemeVars, applyVarsToStyle, clearThemeVars, computeThemeVars, type ThemeConfig } from "../../../utils/theme";
import { BgColorsOutlined, ReloadOutlined, SaveOutlined } from "@ant-design/icons";
import { useTranslation } from '../../../i18n';

// 渐变毛玻璃预设主题的自定义CSS
const GRADIENT_GLASS_CSS = `/* 1. 全局渐变背景 */
body {
  background: linear-gradient(135deg, #74b9ff 0%, #a29bfe 50%, #fd79a8 100%) !important;
  background-attachment: fixed !important;
}

/* 2. 顶栏透明化 */
.topbar {
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: none !important;
  box-shadow: none !important;
  z-index: 10000 !important;
}

/* 搜索框毛玻璃 */
.topbar input {
  background: rgba(255, 255, 255, 0.25) !important;
  backdrop-filter: blur(16px) !important;
  -webkit-backdrop-filter: blur(16px) !important;
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  color: #ffffff !important;
}
.topbar input::placeholder {
  color: rgba(255, 255, 255, 0.6) !important;
}

/* 分类标签 */
.select-tag {
  background: rgba(255, 255, 255, 0.15) !important;
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  color: #ffffff !important;
}
.select-tag-active {
  background: rgba(255, 255, 255, 0.45) !important;
  border: 1px solid rgba(255, 255, 255, 0.55) !important;
  color: #ffffff !important;
}

/* 3. 色彩消隐盾 */
.content-wraper {
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  position: relative !important;
}
.content-wraper::before {
  content: "" !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 190px !important;
  background: linear-gradient(to bottom, rgba(116, 185, 255, 1) 0%, rgba(116, 185, 255, 0.9) 50%, rgba(116, 185, 255, 0) 100%) !important;
  z-index: 9990 !important;
  pointer-events: none !important;
}
body.dark-mode .content-wraper::before {
  background: linear-gradient(to bottom, rgba(15, 23, 42, 1) 0%, rgba(15, 23, 42, 0.9) 50%, rgba(15, 23, 42, 0) 100%) !important;
}

/* 4. 工具卡片毛玻璃 */
.card-box {
  background: rgba(255, 255, 255, 0.25) !important;
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.25) !important;
  border-radius: 16px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05) !important;
  transition: transform 0.2s ease-in-out;
}
.card-box:hover {
  background: rgba(255, 255, 255, 0.35) !important;
  transform: translateY(-2px);
}
body.dark-mode .card-box {
  background: rgba(30, 41, 59, 0.4) !important;
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
}

/* 白字清晰度 */
.card-right-title { color: #ffffff !important; }
.card-right-bottom { color: rgba(255, 255, 255, 0.8) !important; }
.card-tag { background: rgba(255, 255, 255, 0.2) !important; color: #ffffff !important; }

/* 页脚透明 */
.record-wraper {
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border-top: none !important;
}`;

// 预设主题
const presetThemes: Record<string, { name: string; config: ThemeConfig }> = {
  default: {
    name: "经典蓝",
    config: {
      version: "1.0",
      colors: {
        primary: "#1677ff",
        bgBase: "#f0f2f5",
        bgCard: "#ffffff",
        textPrimary: "#1f1f1f",
        textSecondary: "#666666",
        border: "#e8e8e8",
      },
            layout: {
        cardBorderRadius: "8px",
        cardShadow: "0 1px 2px rgba(0,0,0,0.03), 0 1px 6px rgba(0,0,0,0.02)",
        cardPadding: "16px",
        cardGap: "16px",
      },
      typography: {
        titleFontSize: "15px",
        titleFontWeight: "600",
        descFontSize: "13px",
      },
      customCSS: "",
    },
  },
  techPurple: {
    name: "科技紫",
    config: {
      version: "1.0",
      colors: {
        primary: "#722ed1",
        bgBase: "#f9f0ff",
        bgCard: "#ffffff",
        textPrimary: "#1f1f1f",
        textSecondary: "#666666",
        border: "#d3adf7",
      },
            layout: {
        cardBorderRadius: "8px",
        cardShadow: "0 1px 2px rgba(0,0,0,0.03), 0 1px 6px rgba(0,0,0,0.02)",
        cardPadding: "16px",
        cardGap: "16px",
      },
      typography: {
        titleFontSize: "15px",
        titleFontWeight: "600",
        descFontSize: "13px",
      },
      customCSS: "",
    },
  },
  minimalGray: {
    name: "极简灰",
    config: {
      version: "1.0",
      colors: {
        primary: "#434343",
        bgBase: "#f7f7f7",
        bgCard: "#ffffff",
        textPrimary: "#262626",
        textSecondary: "#8c8c8c",
        border: "#e0e0e0",
      },
            layout: {
        cardBorderRadius: "8px",
        cardShadow: "0 1px 2px rgba(0,0,0,0.03), 0 1px 6px rgba(0,0,0,0.02)",
        cardPadding: "16px",
        cardGap: "16px",
      },
      typography: {
        titleFontSize: "15px",
        titleFontWeight: "600",
        descFontSize: "13px",
      },
      customCSS: "",
    },
  },
  forestGreen: {
    name: "自然绿",
    config: {
      version: "1.0",
      colors: {
        primary: "#389e0d",
        bgBase: "#f6ffed",
        bgCard: "#ffffff",
        textPrimary: "#1f1f1f",
        textSecondary: "#666666",
        border: "#b7eb8f",
      },
            layout: {
        cardBorderRadius: "8px",
        cardShadow: "0 1px 2px rgba(0,0,0,0.03), 0 1px 6px rgba(0,0,0,0.02)",
        cardPadding: "16px",
        cardGap: "16px",
      },
      typography: {
        titleFontSize: "15px",
        titleFontWeight: "600",
        descFontSize: "13px",
      },
      customCSS: "",
    },
  },
  sunsetOrange: {
    name: "日落橙",
    config: {
      version: "1.0",
      colors: {
        primary: "#d46b08",
        bgBase: "#fff7e6",
        bgCard: "#ffffff",
        textPrimary: "#1f1f1f",
        textSecondary: "#666666",
        border: "#ffd591",
      },
            layout: {
        cardBorderRadius: "8px",
        cardShadow: "0 1px 2px rgba(0,0,0,0.03), 0 1px 6px rgba(0,0,0,0.02)",
        cardPadding: "16px",
        cardGap: "16px",
      },
      typography: {
        titleFontSize: "15px",
        titleFontWeight: "600",
        descFontSize: "13px",
      },
      customCSS: "",
    },
  },
  sakuraPink: {
    name: "樱花粉",
    config: {
      version: "1.0",
      colors: {
        primary: "#eb2f96",
        bgBase: "#fff0f6",
        bgCard: "#ffffff",
        textPrimary: "#1f1f1f",
        textSecondary: "#666666",
        border: "#ffadd2",
      },
            layout: {
        cardBorderRadius: "8px",
        cardShadow: "0 1px 2px rgba(0,0,0,0.03), 0 1px 6px rgba(0,0,0,0.02)",
        cardPadding: "16px",
        cardGap: "16px",
      },
      typography: {
        titleFontSize: "15px",
        titleFontWeight: "600",
        descFontSize: "13px",
      },
      customCSS: "",
    },
  },
  gradientGlass: {
    name: "渐变毛玻璃",
    config: {
      version: "1.0",
      colors: {
        primary: "#74b9ff",
        bgBase: "#f0f2f5",
        bgCard: "#ffffff",
        textPrimary: "#1f1f1f",
        textSecondary: "#666666",
        border: "#e8e8e8",
      },
      layout: {
        cardBorderRadius: "16px",
        cardShadow: "0 8px 32px rgba(0,0,0,0.05)",
        cardPadding: "16px",
        cardGap: "16px",
      },
      typography: {
        titleFontSize: "15px",
        titleFontWeight: "600",
        descFontSize: "13px",
      },
      customCSS: GRADIENT_GLASS_CSS
    },
  },
};

// 辅助函数：将 Color 对象或字符串转换为 hex 字符串
const colorToHex = (color: any, defaultVal: string): string => {
  if (!color) return defaultVal;
  if (typeof color === 'string') return color;
  if (color.toHexString) return color.toHexString();
  if (color.metaColor) {
    const { r, g, b, a } = color.metaColor;
    if (a === 1) {
      return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    }
    return '#' + [r, g, b, Math.round(a * 255)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  return defaultVal;
};

// 由表单值构建提交配置（保存 / 存为方案 共用同一转换）
const buildConfigFromValues = (values: any) => ({
  ...values,
  colors: {
    primary: colorToHex(values.colors?.primary, "#1677ff"),
    bgBase: colorToHex(values.colors?.bgBase, "#f5f5f5"),
    bgCard: colorToHex(values.colors?.bgCard, "#ffffff"),
    textPrimary: colorToHex(values.colors?.textPrimary, "#000000e0"),
    textSecondary: colorToHex(values.colors?.textSecondary, "#000000a6"),
    border: colorToHex(values.colors?.border, "#d9d9d9"),
  },
  layout: {
    cardBorderRadius: values.layout?.cardBorderRadius || "8px",
    cardShadow: values.layout?.cardShadow || "0 1px 2px rgba(0,0,0,0.03), 0 1px 6px rgba(0,0,0,0.02)",
    cardPadding: values.layout?.cardPadding || "16px",
    cardGap: values.layout?.cardGap || "16px",
  },
  typography: values.typography || {},
  customCSS: values.customCSS || "",
  nightMode: {
    mode: values.nightMode?.mode || "system",
    start: values.nightMode?.start?.format ? values.nightMode.start.format("HH:mm") : (values.nightMode?.start || "18:00"),
    end: values.nightMode?.end?.format ? values.nightMode.end.format("HH:mm") : (values.nightMode?.end || "08:00"),
  },
  darkTheme: {
    colors: {
      primary: colorToHex(values.darkTheme?.colors?.primary, "#4096ff"),
      bgBase: colorToHex(values.darkTheme?.colors?.bgBase, "#0f1115"),
      bgCard: colorToHex(values.darkTheme?.colors?.bgCard, "#1d1f24"),
      textPrimary: colorToHex(values.darkTheme?.colors?.textPrimary, "#ffffffe0"),
      textSecondary: colorToHex(values.darkTheme?.colors?.textSecondary, "#ffffffa6"),
      border: colorToHex(values.darkTheme?.colors?.border, "#333333"),
    },
    customCSS: values.darkTheme?.customCSS || "",
  },
  font: {
    family: values.font?.family || "",
    baseFontSize: values.font?.baseFontSize || "14px",
  },
  radius: { style: values.radius?.style || "small" },
  topbar: {
    background: values.topbar?.transparent ? "transparent" : colorToHex(values.topbar?.background, ""),
    textColor: colorToHex(values.topbar?.textColor, ""),
    blur: !!values.topbar?.blur,
    height: values.topbar?.height || "",
  },
  pageBg: {
    gradientTo: colorToHex(values.pageBg?.gradientTo, ""),
    image: values.pageBg?.image || "",
    dimOpacity: values.pageBg?.dimOpacity != null && values.pageBg.dimOpacity !== "" ? String(values.pageBg.dimOpacity) : "",
  },
  cardExtra: {
    logoRadius: values.cardExtra?.logoRadius || "",
    logoSize: values.cardExtra?.logoSize || "",
    titleColor: colorToHex(values.cardExtra?.titleColor, ""),
    hoverLift: values.cardExtra?.hoverLift !== false,
    outline: !!values.cardExtra?.outline,
  },
  linkBtn: {
    linkColor: colorToHex(values.linkBtn?.linkColor, ""),
    buttonRadius: values.linkBtn?.buttonRadius || "",
  },
  footer: {
    textColor: colorToHex(values.footer?.textColor, ""),
    hidden: !!values.footer?.hidden,
  },
});

// ===== 实时预览（沙箱模拟页） =====
// 用 srcDoc 渲染一个与首页同构的静态模拟页（无脚本）：
// - 表单变化 → computeThemeVars → 变量写入模拟页 body → 样式实时联动
// - 自定义 CSS 注入模拟页 <style>，其选择器（body/.topbar/.card-box/.record-wraper 等）
//   在模拟页中均有对应元素，因此自定义 CSS 也能实时预览
const buildPreviewDoc = () => {
  const cardsHtml = "<a class=\"card-box\" data-catelog=\"\u6280\u672f\">\n        <div class=\"card-left\"><img src=\"data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2264%22%20height%3D%2264%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2212%22%20fill%3D%22%2324292f%22/%3E%3Ctext%20x%3D%2232%22%20y%3D%2242%22%20font-size%3D%2230%22%20fill%3D%22%23ffffff%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%3EG%3C/text%3E%3C/svg%3E\" alt=\"GitHub\" /></div>\n        <div class=\"card-right\">\n          <div class=\"card-right-top\"><span class=\"card-right-title\">GitHub</span><span class=\"card-tag\">\u6280\u672f</span></div>\n          <div class=\"card-right-bottom\">\u5168\u7403\u5f00\u6e90\u4ee3\u7801\u6258\u7ba1\u53ca\u5f00\u53d1\u8005\u534f\u4f5c\u5e73\u53f0</div>\n        </div>\n      </a>\n<a class=\"card-box\" data-catelog=\"\u641c\u7d22\">\n        <div class=\"card-left\"><img src=\"data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2264%22%20height%3D%2264%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2212%22%20fill%3D%22%232932e1%22/%3E%3Ctext%20x%3D%2232%22%20y%3D%2242%22%20font-size%3D%2230%22%20fill%3D%22%23ffffff%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%3E%E7%99%BE%3C/text%3E%3C/svg%3E\" alt=\"\u767e\u5ea6\" /></div>\n        <div class=\"card-right\">\n          <div class=\"card-right-top\"><span class=\"card-right-title\">\u767e\u5ea6</span><span class=\"card-tag\">\u641c\u7d22</span></div>\n          <div class=\"card-right-bottom\">\u5168\u7403\u9886\u5148\u7684\u4e2d\u6587\u641c\u7d22\u5f15\u64ce</div>\n        </div>\n      </a>\n<a class=\"card-box\" data-catelog=\"\u793e\u533a\">\n        <div class=\"card-left\"><img src=\"data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2264%22%20height%3D%2264%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2212%22%20fill%3D%22%23fb7299%22/%3E%3Ctext%20x%3D%2232%22%20y%3D%2242%22%20font-size%3D%2230%22%20fill%3D%22%23ffffff%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%3E%E5%93%94%3C/text%3E%3C/svg%3E\" alt=\"\u54d4\u54e9\u54d4\u54e9\" /></div>\n        <div class=\"card-right\">\n          <div class=\"card-right-top\"><span class=\"card-right-title\">\u54d4\u54e9\u54d4\u54e9</span><span class=\"card-tag\">\u793e\u533a</span></div>\n          <div class=\"card-right-bottom\">\u56fd\u5185\u77e5\u540d\u7684\u5e74\u8f7b\u4e16\u4ee3\u6f6e\u6d41\u6587\u5316\u793e\u533a</div>\n        </div>\n      </a>\n<a class=\"card-box\" data-catelog=\"\u5de5\u5177\">\n        <div class=\"card-left\"><img src=\"data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2264%22%20height%3D%2264%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2212%22%20fill%3D%22%230f2b46%22/%3E%3Ctext%20x%3D%2232%22%20y%3D%2242%22%20font-size%3D%2230%22%20fill%3D%22%23ffffff%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%3ED%3C/text%3E%3C/svg%3E\" alt=\"DeepL \u7ffb\u8bd1\" /></div>\n        <div class=\"card-right\">\n          <div class=\"card-right-top\"><span class=\"card-right-title\">DeepL \u7ffb\u8bd1</span><span class=\"card-tag\">\u5de5\u5177</span></div>\n          <div class=\"card-right-bottom\">\u7ed3\u5408AI\u6df1\u5ea6\u5b66\u4e60\u7684\u9ad8\u51c6\u786e\u7387\u7ffb\u8bd1\u5de5\u5177</div>\n        </div>\n      </a>\n<a class=\"card-box\" data-catelog=\"\u793e\u533a\">\n        <div class=\"card-left\"><img src=\"data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2264%22%20height%3D%2264%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2212%22%20fill%3D%22%230084ff%22/%3E%3Ctext%20x%3D%2232%22%20y%3D%2242%22%20font-size%3D%2230%22%20fill%3D%22%23ffffff%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%3E%E7%9F%A5%3C/text%3E%3C/svg%3E\" alt=\"\u77e5\u4e4e\" /></div>\n        <div class=\"card-right\">\n          <div class=\"card-right-top\"><span class=\"card-right-title\">\u77e5\u4e4e</span><span class=\"card-tag\">\u793e\u533a</span></div>\n          <div class=\"card-right-bottom\">\u4e2d\u6587\u4e92\u8054\u7f51\u9ad8\u8d28\u91cf\u95ee\u7b54\u793e\u533a</div>\n        </div>\n      </a>\n<a class=\"card-box\" data-catelog=\"\u5de5\u5177\">\n        <div class=\"card-left\"><img src=\"data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2264%22%20height%3D%2264%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2212%22%20fill%3D%22%23111111%22/%3E%3Ctext%20x%3D%2232%22%20y%3D%2242%22%20font-size%3D%2230%22%20fill%3D%22%23ffffff%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%3EN%3C/text%3E%3C/svg%3E\" alt=\"Notion\" /></div>\n        <div class=\"card-right\">\n          <div class=\"card-right-top\"><span class=\"card-right-title\">Notion</span><span class=\"card-tag\">\u5de5\u5177</span></div>\n          <div class=\"card-right-bottom\">\u5168\u80fd\u578b\u4e00\u4f53\u5316\u77e5\u8bc6\u5e93\u4e0e\u534f\u4f5c\u5de5\u5177</div>\n        </div>\n      </a>";
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
* { box-sizing: border-box; }
body {
  margin: 0; padding-bottom: 46px;
  font-family: var(--van-nav-font-family);
  font-size: var(--van-nav-base-font-size);
  background: var(--van-nav-page-bg);
  background-attachment: fixed;
  color: var(--van-nav-text-primary);
}
.topbar { padding: 16px 0 8px; background: var(--van-nav-topbar-bg); color: var(--van-nav-topbar-text); backdrop-filter: var(--van-nav-topbar-filter); -webkit-backdrop-filter: var(--van-nav-topbar-filter); }
.search-wraper { max-width: 640px; margin: 0 auto; padding: 0 16px; }
.search-wraper input {
  width: 100%; height: 40px; padding: 0 14px;
  border: 1px solid var(--van-nav-border); border-radius: var(--van-nav-radius-global);
  background: color-mix(in srgb, var(--van-nav-bg-card) 55%, transparent);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  color: var(--van-nav-text-primary); outline: none;
}
.tag-row { max-width: 640px; margin: 12px auto 18px; padding: 0 16px; }
.select-tag { display: inline-block; padding: 3px 12px; margin: 0 6px 6px 0; border: 1px solid var(--van-nav-border); border-radius: var(--van-nav-radius-global); color: var(--van-nav-text-secondary); font-size: 12px; }
.select-tag-active { border-color: var(--van-nav-primary); color: var(--van-nav-primary); }
.cards { display: grid; grid-template-columns: 1fr 1fr; gap: var(--van-nav-card-gap); padding: 0 18px; }
.card-box { display: flex; gap: 10px; align-items: center; background: var(--van-nav-bg-card); border-radius: var(--van-nav-card-radius); box-shadow: var(--van-nav-card-shadow); padding: var(--van-nav-card-padding); transition: transform 0.2s ease; }
.card-box:hover { transform: translateY(-2px); }
body.card-hover-off .card-box:hover { transform: none; }
body.card-outline-mode .card-box { box-shadow: none; border: 1px solid var(--van-nav-border); }
.card-left { flex-shrink: 0; }
.card-left img { width: var(--van-nav-card-logo-size, 32px); height: var(--van-nav-card-logo-size, 32px); border-radius: var(--van-nav-card-logo-radius, 0px); display: block; }
.card-right { flex: 1; overflow: hidden; }
.card-right-title { color: var(--van-nav-card-title-color, var(--van-nav-text-primary)); font-size: var(--van-nav-title-size, 16px); font-weight: var(--van-nav-title-weight, 600); }
.card-tag { font-size: 11px; color: var(--van-nav-text-secondary); border: 1px solid var(--van-nav-border); border-radius: 4px; padding: 1px 6px; margin-left: 6px; }
.card-right-bottom { color: var(--van-nav-text-secondary); font-size: var(--van-nav-desc-size, 13px); margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.record-wraper { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; padding: 10px 0; background: var(--van-nav-bg-base); color: var(--van-nav-footer-text, var(--van-nav-text-secondary)); font-size: 12px; }
body.footer-hidden .record-wraper { display: none; }
</style>
</head>
<body>
  <div class="topbar">
    <div class="search-wraper"><input id="search-bar" placeholder="按任意键直接开始搜索" /></div>
    <div class="tag-row">
      <span class="select-tag select-tag-active">全部工具</span>
      <span class="select-tag">常用</span>
      <span class="select-tag">技术</span>
      <span class="select-tag">社区</span>
    </div>
  </div>
  <div class="cards"><a class="card-box" data-catelog="技术">
        <div class="card-left"><img src="data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2264%22%20height%3D%2264%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2212%22%20fill%3D%22%2324292f%22/%3E%3Ctext%20x%3D%2232%22%20y%3D%2242%22%20font-size%3D%2230%22%20fill%3D%22%23ffffff%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%3EG%3C/text%3E%3C/svg%3E" alt="GitHub" /></div>
        <div class="card-right">
          <div class="card-right-top"><span class="card-right-title">GitHub</span><span class="card-tag">技术</span></div>
          <div class="card-right-bottom">全球开源代码托管及开发者协作平台</div>
        </div>
      </a>
<a class="card-box" data-catelog="搜索">
        <div class="card-left"><img src="data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2264%22%20height%3D%2264%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2212%22%20fill%3D%22%232932e1%22/%3E%3Ctext%20x%3D%2232%22%20y%3D%2242%22%20font-size%3D%2230%22%20fill%3D%22%23ffffff%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%3E%E7%99%BE%3C/text%3E%3C/svg%3E" alt="百度" /></div>
        <div class="card-right">
          <div class="card-right-top"><span class="card-right-title">百度</span><span class="card-tag">搜索</span></div>
          <div class="card-right-bottom">全球领先的中文搜索引擎</div>
        </div>
      </a>
<a class="card-box" data-catelog="社区">
        <div class="card-left"><img src="data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2264%22%20height%3D%2264%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2212%22%20fill%3D%22%23fb7299%22/%3E%3Ctext%20x%3D%2232%22%20y%3D%2242%22%20font-size%3D%2230%22%20fill%3D%22%23ffffff%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%3E%E5%93%94%3C/text%3E%3C/svg%3E" alt="哔哩哔哩" /></div>
        <div class="card-right">
          <div class="card-right-top"><span class="card-right-title">哔哩哔哩</span><span class="card-tag">社区</span></div>
          <div class="card-right-bottom">国内知名的年轻世代潮流文化社区</div>
        </div>
      </a>
<a class="card-box" data-catelog="工具">
        <div class="card-left"><img src="data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2264%22%20height%3D%2264%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2212%22%20fill%3D%22%230f2b46%22/%3E%3Ctext%20x%3D%2232%22%20y%3D%2242%22%20font-size%3D%2230%22%20fill%3D%22%23ffffff%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%3ED%3C/text%3E%3C/svg%3E" alt="DeepL 翻译" /></div>
        <div class="card-right">
          <div class="card-right-top"><span class="card-right-title">DeepL 翻译</span><span class="card-tag">工具</span></div>
          <div class="card-right-bottom">结合AI深度学习的高准确率翻译工具</div>
        </div>
      </a>
<a class="card-box" data-catelog="社区">
        <div class="card-left"><img src="data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2264%22%20height%3D%2264%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2212%22%20fill%3D%22%230084ff%22/%3E%3Ctext%20x%3D%2232%22%20y%3D%2242%22%20font-size%3D%2230%22%20fill%3D%22%23ffffff%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%3E%E7%9F%A5%3C/text%3E%3C/svg%3E" alt="知乎" /></div>
        <div class="card-right">
          <div class="card-right-top"><span class="card-right-title">知乎</span><span class="card-tag">社区</span></div>
          <div class="card-right-bottom">中文互联网高质量问答社区</div>
        </div>
      </a>
<a class="card-box" data-catelog="工具">
        <div class="card-left"><img src="data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2264%22%20height%3D%2264%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2212%22%20fill%3D%22%23111111%22/%3E%3Ctext%20x%3D%2232%22%20y%3D%2242%22%20font-size%3D%2230%22%20fill%3D%22%23ffffff%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%3EN%3C/text%3E%3C/svg%3E" alt="Notion" /></div>
        <div class="card-right">
          <div class="card-right-top"><span class="card-right-title">Notion</span><span class="card-tag">工具</span></div>
          <div class="card-right-bottom">全能型一体化知识库与协作工具</div>
        </div>
      </a></div>
  <div class="record-wraper">© 主题实时预览 · 备案信息示例</div>
</body>
</html>`;
};

const ThemePreview: React.FC<{ form: any; isDark: boolean }> = ({ form, isDark }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const values = Form.useWatch([], form);
  const [srcDoc] = useState(() => buildPreviewDoc());

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const doc = iframeRef.current?.contentDocument;
        if (!doc || !doc.body || !values) return;
        const config = buildConfigFromValues(values);
        const vars = computeThemeVars(config, isDark);
        applyVarsToStyle(doc.body.style, vars);
        let styleEl = doc.getElementById("preview-custom-css") as HTMLStyleElement | null;
        if (!styleEl) {
          styleEl = doc.createElement("style");
          styleEl.id = "preview-custom-css";
          doc.head.appendChild(styleEl);
        }
        styleEl.textContent = vars["--van-nav-custom-css"] || "";
        doc.body.classList.toggle("card-hover-off", config.cardExtra?.hoverLift === false);
        doc.body.classList.toggle("card-outline-mode", config.cardExtra?.outline === true);
        doc.body.classList.toggle("footer-hidden", config.footer?.hidden === true);
      } catch {
        // iframe 文档未就绪时忽略本次同步
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [values, isDark]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc}
      sandbox="allow-same-origin"
      title="主题实时预览"
      style={{ width: "100%", height: 520, border: "1px solid #d9d9d9", borderRadius: 8, background: "#fff" }}
    />
  );
};

export interface ThemeProps {}

// 夜间配色预设（仅填充 darkTheme 表单，不写入数据库）
const nightPresets: { name: string; colors: Record<string, string> }[] = [
  { name: "深邃蓝", colors: { primary: "#4096ff", bgBase: "#0f1115", bgCard: "#1d1f24", textPrimary: "#ffffffe0", textSecondary: "#ffffffa6", border: "#333333" } },
  { name: "石墨黑", colors: { primary: "#8b8b8b", bgBase: "#0a0a0a", bgCard: "#171717", textPrimary: "#f5f5f5e0", textSecondary: "#a3a3a3a6", border: "#2e2e2e" } },
  { name: "暗夜紫", colors: { primary: "#7c5cff", bgBase: "#13111c", bgCard: "#1e1b2e", textPrimary: "#f0eeffe0", textSecondary: "#b8b3cfa6", border: "#332e47" } },
  { name: "护眼绿", colors: { primary: "#2ba471", bgBase: "#0e1a14", bgCard: "#16241d", textPrimary: "#e6f2ebe0", textSecondary: "#a8c5b8a6", border: "#28402f" } },
  { name: "暖橙", colors: { primary: "#ff8c42", bgBase: "#1a120c", bgCard: "#241a12", textPrimary: "#ffeadbe0", textSecondary: "#d8bfa8a6", border: "#3d2c1e" } },
  { name: "赛博朋克", colors: { primary: "#ff2ea6", bgBase: "#0d0b1e", bgCard: "#161331", textPrimary: "#eae6ffe0", textSecondary: "#9f97c9a6", border: "#2c2650" } },
  { name: "玫瑰金", colors: { primary: "#e56b8c", bgBase: "#1a1114", bgCard: "#251a1e", textPrimary: "#ffe9eee0", textSecondary: "#d3aeb8a6", border: "#402930" } },
  { name: "青柠", colors: { primary: "#7ed321", bgBase: "#101508", bgCard: "#1a2210", textPrimary: "#f2ffe0e0", textSecondary: "#c2d8a0a6", border: "#2e3d1c" } },
];

export const Theme: React.FC<ThemeProps> = () => {
  const { t: _t } = useTranslation();
  const [form] = Form.useForm();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDark, setIsDark] = useState(() => document.body.classList.contains("dark-mode"));
  // 当前夜间策略（控制时间窗口选择器的显隐）
  const nightModeValue = Form.useWatch(["nightMode", "mode"], form);

  // 监听主题变化
  useEffect(() => {
    const check = () => setIsDark(document.body.classList.contains("dark-mode"));
    check();
    window.addEventListener("theme-change", check);
    return () => window.removeEventListener("theme-change", check);
  }, []);

  // 加载主题配置
  const loadThemeConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchGetTheme();
      if (res?.success && res?.data) {
        const data = res.data;
        // TimePicker 需要 dayjs 值：把后端 HH:mm 字符串转换
        if (data.nightMode) {
          if (typeof data.nightMode.start === "string") data.nightMode.start = dayjs(data.nightMode.start, "HH:mm");
          if (typeof data.nightMode.end === "string") data.nightMode.end = dayjs(data.nightMode.end, "HH:mm");
        }
        form.setFieldsValue(data);
      }
    } catch (err) {
      console.error("加载主题配置失败:", err);
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    loadThemeConfig();
  }, [loadThemeConfig]);

  // ===== 主题方案 =====
  const [presets, setPresets] = useState<any[]>([]);
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const importFileRef = useRef<HTMLInputElement>(null);

  const loadPresets = useCallback(async () => {
    try {
      const res = await fetchListThemePresets();
      if (res?.success) setPresets(res.data || []);
    } catch (err) {
      console.error("加载主题方案失败:", err);
    }
  }, []);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  const handleSaveAsPreset = useCallback(async () => {
    if (!presetName.trim()) {
      message.warning("请填写方案名称");
      return;
    }
    try {
      // getFieldsValue(true)：包含未挂载页签中的字段，避免切页签丢配置
      const config = buildConfigFromValues(form.getFieldsValue(true));
      const res = await fetchSaveThemePreset(0, presetName.trim(), config);
      if (res?.success) {
        message.success("主题方案已保存");
        setPresetModalOpen(false);
        setPresetName("");
        loadPresets();
      } else {
        message.error(res?.errorMessage || "保存失败");
      }
    } catch (err: any) {
      if (err?.errorFields) return; // 表单校验错误，提示已由表单展示
      message.error("保存失败: " + (err.message || "未知错误"));
    }
  }, [form, presetName, loadPresets]);

  const handleApplyPresetById = useCallback(async (id: number) => {
    try {
      const res = await fetchApplyThemePreset(id);
      if (res?.success) {
        message.success("主题方案已应用");
        const themeRes = await fetchGetTheme();
        if (themeRes?.success && themeRes?.data) {
          applyThemeVars(themeRes.data);
          applyPreferredTheme("theme-preset");
        }
        loadThemeConfig();
      } else {
        message.error(res?.errorMessage || "应用失败");
      }
    } catch (err: any) {
      message.error("应用失败: " + (err.message || "未知错误"));
    }
  }, [loadThemeConfig]);

  const handleDeletePreset = useCallback((id: number) => {
    Modal.confirm({
      title: "删除主题方案",
      content: "确定删除该方案吗？",
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        const res = await fetchDeleteThemePreset(id);
        if (res?.success) {
          message.success("已删除");
          loadPresets();
        } else {
          message.error(res?.errorMessage || "删除失败");
        }
      },
    });
  }, [loadPresets]);

  // ===== 导入导出 =====
  const handleExport = useCallback(async () => {
    try {
      const res = await fetchExportTheme();
      if (!res?.success) {
        message.error(res?.errorMessage || "导出失败");
        return;
      }
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `van-nav-theme-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      message.error("导出失败: " + (err.message || "未知错误"));
    }
  }, []);

  const handleImportFile = useCallback(async (file: File) => {
    try {
      const config = JSON.parse(await file.text());
      const res = await fetchImportTheme(config);
      if (res?.success) {
        message.success("主题配置已导入");
        const themeRes = await fetchGetTheme();
        if (themeRes?.success && themeRes?.data) {
          applyThemeVars(themeRes.data);
          applyPreferredTheme("theme-import");
        }
        loadThemeConfig();
      } else {
        message.error(res?.errorMessage || "导入失败");
      }
    } catch (err: any) {
      message.error("导入失败: " + (err.message || "文件不是合法的 JSON"));
    }
  }, [loadThemeConfig]);

  // 保存主题配置
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // getFieldsValue(true)：包含未挂载页签中的字段，避免切页签丢配置
      const config = buildConfigFromValues(form.getFieldsValue(true));
      const res = await fetchUpdateTheme(config);
      if (res?.success) {
        message.success("主题配置已保存");
        // 重新拉取最新主题配置并应用（含夜间策略立即生效）
        const themeRes = await fetchGetTheme();
        if (themeRes?.success && themeRes?.data) {
          applyThemeVars(themeRes.data);
          applyPreferredTheme("theme-save");
        }
      } else {
        message.error(res?.errorMessage || "保存失败");
      }
    } catch (err: any) {
      message.error("保存失败: " + (err.message || "未知错误"));
    } finally {
      setSaving(false);
    }
  }, []);

  // 重置为主题默认值
  const handleReset = useCallback(() => {
    Modal.confirm({
      title: "重置主题",
      content: "确定要重置为默认主题吗？当前的所有自定义配置将丢失。",
      okText: "确定重置",
      cancelText: "取消",
      okType: "danger",
      onOk: async () => {
        try {
          const res = await fetchResetTheme();
          if (res?.success) {
            message.success("已重置为默认主题");
            clearThemeVars();
            loadThemeConfig();
          } else {
            message.error(res?.errorMessage || "重置失败");
          }
        } catch (err: any) {
          message.error("重置失败: " + (err.message || "未知错误"));
        }
      },
    });
  }, [loadThemeConfig]);

  // 应用预设主题（仅填充表单，不写入数据库）
  const handleApplyPreset = useCallback((presetName: string) => {
    const preset = presetThemes[presetName];
    if (preset) {
      form.setFieldsValue(preset.config);
      message.info(`已应用「${preset.name}」预设主题，请点击「保存配置」生效`);
    }
  }, [form]);

  return (
    <div className="theme-page-layout">
      <div className="theme-page-main">
        <Spin spinning={loading}>
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              version: "1.0",
              colors: {
                primary: "#1677ff",
                bgBase: "#f5f5f5",
                bgCard: "#ffffff",
                textPrimary: "#000000e0",
                textSecondary: "#000000a6",
                border: "#d9d9d9",
              },
              layout: {
                cardBorderRadius: "8px",
                cardShadow: "0 1px 2px rgba(0,0,0,0.03), 0 1px 6px rgba(0,0,0,0.02)",
                cardPadding: "16px",
                cardGap: "16px",
              },
              typography: {
                titleFontSize: "15px",
                titleFontWeight: "600",
                descFontSize: "13px",
              },
              customCSS: "",
              nightMode: { mode: "system", start: null, end: null },
              darkTheme: { customCSS: "" },
              font: { family: "", baseFontSize: "14px" },
              radius: { style: "small" },
              topbar: { transparent: false, blur: false, height: "" },
              pageBg: { image: "", dimOpacity: "" },
              cardExtra: { hoverLift: true, outline: false },
              linkBtn: { buttonRadius: "" },
              footer: { hidden: false },
            }}
          >
            <Tabs
              defaultActiveKey="preset"
              items={[
                {
                  key: "preset",
                  label: "预设主题",
                  children: (
                    <>
                      {/* 预设主题选择 */}
        <Card
          title={
            <span>
              <BgColorsOutlined style={{ marginRight: 8 }} />
              预设主题
            </span>
          }
          style={{ marginBottom: 24 }}
          extra={<span style={{ fontSize: 12, color: '#999' }}>点击预设可快速填充配置，需手动保存生效</span>}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {Object.entries(presetThemes).map(([key, preset]) => (
              <Button
                key={key}
                onClick={() => handleApplyPreset(key)}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    backgroundColor: preset.config.colors.primary,
                  }}
                />
                {preset.name}
              </Button>
            ))}
          </div>
        </Card>
                    </>
                  ),
                },
                {
                  key: "color",
                  label: "色彩与背景",
                  children: (
                    <>
                      {/* 主题色彩配置 */}
          <Card title="主题色彩" style={{ marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              <Form.Item name={["colors", "primary"]} label="主色调">
                <ColorPicker showText />
              </Form.Item>
              <Form.Item name={["colors", "bgBase"]} label="页面背景色">
                <ColorPicker showText />
              </Form.Item>
              <Form.Item name={["colors", "bgCard"]} label="卡片背景色">
                <ColorPicker showText />
              </Form.Item>
              <Form.Item name={["colors", "textPrimary"]} label="主文字颜色">
                <ColorPicker showText />
              </Form.Item>
              <Form.Item name={["colors", "textSecondary"]} label="次文字颜色">
                <ColorPicker showText />
              </Form.Item>
              <Form.Item name={["colors", "border"]} label="边框颜色">
                <ColorPicker showText />
              </Form.Item>
            </div>
          </Card>{/* 页面背景 */}
          <Card title="页面背景" style={{ marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              <Form.Item name={["pageBg", "gradientTo"]} label="渐变第二色" tooltip="留空为纯色；填写后与页面背景色形成纵向渐变">
                <Input placeholder="留空 = 纯色" />
              </Form.Item>
              <Form.Item name={["pageBg", "dimOpacity"]} label="背景暗色遮罩" tooltip="叠加在背景图上的黑色遮罩透明度">
                <InputNumber min={0} max={1} step={0.1} style={{ width: '100%' }} placeholder="0 - 1" />
              </Form.Item>
              <Form.Item
                name={["pageBg", "image"]}
                label="背景图片"
                tooltip="支持 data: 协议或站内路径（如 /bg.webp），禁止外链"
              >
                <Input placeholder="data:image/png;base64,... 或 /bg.webp" />
              </Form.Item>
            </div>
          </Card>
                    </>
                  ),
                },
                {
                  key: "card",
                  label: "卡片样式",
                  children: (
                    <>
                      <Card title="全局圆角风格" style={{ marginBottom: 24 }}>
            <div style={{ maxWidth: 360 }}>
              <Form.Item name={["radius", "style"]} label="全局圆角风格">
                <Select
                  options={[
                    { label: "直角", value: "none" },
                    { label: "小圆角（默认）", value: "small" },
                    { label: "中圆角", value: "medium" },
                    { label: "大圆角", value: "large" },
                  ]}
                />
              </Form.Item>
            </div>
          </Card>{/* 布局配置 */}
          <Card title="布局调整" style={{ marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              <Form.Item name={["layout", "cardBorderRadius"]} label="卡片圆角">
                <Input placeholder="8px" />
              </Form.Item>
              <Form.Item name={["layout", "cardPadding"]} label="卡片内边距">
                <Input placeholder="16px" />
              </Form.Item>
              <Form.Item name={["layout", "cardGap"]} label="卡片间距">
                <Input placeholder="12px" />
              </Form.Item>
            </div>
            <Form.Item name={["layout", "cardShadow"]} label="卡片阴影">
              <Select
                options={[
                  { label: "无阴影", value: "none" },
                  { label: "轻微阴影", value: "0 1px 2px rgba(0,0,0,0.03), 0 1px 6px rgba(0,0,0,0.02)" },
                  { label: "柔和阴影", value: "0 2px 8px rgba(0,0,0,0.08)" },
                  { label: "明显阴影", value: "0 4px 16px rgba(0,0,0,0.12)" },
                ]}
              />
            </Form.Item>
          </Card>{/* 卡片细项 */}
          <Card title="卡片细项" style={{ marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              <Form.Item name={["cardExtra", "logoSize"]} label="Logo 尺寸">
                <Input placeholder="32px" />
              </Form.Item>
              <Form.Item name={["cardExtra", "logoRadius"]} label="Logo 圆角">
                <Input placeholder="0px / 8px / 50%" />
              </Form.Item>
              <Form.Item name={["cardExtra", "titleColor"]} label="标题颜色">
                <Input placeholder="留空跟随文字主色" />
              </Form.Item>
              <Form.Item name={["cardExtra", "hoverLift"]} label="Hover 动效" valuePropName="checked" tooltip="鼠标悬停时卡片上浮">
                <Switch />
              </Form.Item>
              <Form.Item name={["cardExtra", "outline"]} label="描边模式" valuePropName="checked" tooltip="开启后卡片用边框替代阴影">
                <Switch />
              </Form.Item>
            </div>
          </Card>{/* 排版配置 */}
          <Card title="排版设置" style={{ marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              <Form.Item name={["typography", "titleFontSize"]} label="标题字号">
                <Input placeholder="16px" />
              </Form.Item>
              <Form.Item name={["typography", "titleFontWeight"]} label="标题字重">
                <Select
                  options={[
                    { label: "正常 (400)", value: "400" },
                    { label: "中等 (500)", value: "500" },
                    { label: "半粗 (600)", value: "600" },
                    { label: "粗体 (700)", value: "700" },
                  ]}
                />
              </Form.Item>
              <Form.Item name={["typography", "descFontSize"]} label="描述字号">
                <Input placeholder="13px" />
              </Form.Item>
            </div>
            
          </Card>
                    </>
                  ),
                },
                {
                  key: "topbar",
                  label: "顶栏",
                  children: (
                    <>
                      {/* 顶栏样式 */}
          <Card title="顶栏样式" style={{ marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              <Form.Item name={["topbar", "transparent"]} label="透明顶栏" valuePropName="checked">
                <Checkbox>背景透明（滚动内容透出）</Checkbox>
              </Form.Item>
              <Form.Item name={["topbar", "blur"]} label="毛玻璃效果" valuePropName="checked">
                <Checkbox>背景模糊</Checkbox>
              </Form.Item>
              <Form.Item name={["topbar", "background"]} label="顶栏背景色" tooltip="留空跟随页面背景；勾选透明顶栏时忽略此项">
                <Input placeholder="#1677ff / 留空跟随页面" />
              </Form.Item>
              <Form.Item name={["topbar", "textColor"]} label="顶栏文字色">
                <Input placeholder="留空跟随文字主色" />
              </Form.Item>
              <Form.Item name={["topbar", "height"]} label="顶栏最小高度">
                <Input placeholder="默认（由内容撑开）" />
              </Form.Item>
            </div>
          </Card>
                    </>
                  ),
                },
                {
                  key: "font",
                  label: "字体",
                  children: (
                    <>
                      {/* 字体与圆角 */}
          <Card title="字体与圆角" style={{ marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              <Form.Item name={["font", "family"]} label="字体族" tooltip="留空使用系统默认字体栈，多个字体用逗号分隔">
                <Input placeholder="留空 = 系统默认" />
              </Form.Item>
              <Form.Item name={["font", "baseFontSize"]} label="正文字号">
                <Input placeholder="14px" />
              </Form.Item>
              
            </div>
          </Card>
                    </>
                  ),
                },
                {
                  key: "link",
                  label: "链接与页脚",
                  children: (
                    <>
                      {/* 链接与按钮 */}
          <Card title="链接与按钮" style={{ marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              <Form.Item name={["linkBtn", "linkColor"]} label="链接颜色">
                <Input placeholder="留空跟随主色调" />
              </Form.Item>
              <Form.Item name={["linkBtn", "buttonRadius"]} label="按钮圆角">
                <Input placeholder="4px" />
              </Form.Item>
            </div>
          </Card>{/* 页脚 */}
          <Card title="页脚 / 备案区" style={{ marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              <Form.Item name={["footer", "textColor"]} label="文字颜色">
                <Input placeholder="留空跟随次级文字色" />
              </Form.Item>
              <Form.Item name={["footer", "hidden"]} label="隐藏备案区" valuePropName="checked">
                <Switch />
              </Form.Item>
            </div>
          </Card>
                    </>
                  ),
                },
                {
                  key: "night",
                  label: "夜间模式",
                  children: (
                    <Card
                      title="夜间模式"
                      style={{ marginBottom: 24 }}
                      extra={<span style={{ fontSize: 12, color: '#999' }}>访客未手动切换主题时，按此策略自动进入夜间</span>}
                    >
                      <Form.Item name={["nightMode", "mode"]} label="自动策略">
                        <Radio.Group>
                          <Radio.Button value="system">跟随系统</Radio.Button>
                          <Radio.Button value="scheduled">定时切换</Radio.Button>
                          <Radio.Button value="off">关闭自动</Radio.Button>
                        </Radio.Group>
                      </Form.Item>
                      {nightModeValue === "scheduled" && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', marginBottom: 8 }}>
                          <Form.Item name={["nightMode", "start"]} label="夜间开始" rules={[{ required: true, message: "请选择开始时间" }]}>
                            <TimePicker format="HH:mm" minuteStep={5} placeholder="18:00" popupClassName={isDark ? "nav-dark-picker-dropdown" : ""} />
                          </Form.Item>
                          <Form.Item name={["nightMode", "end"]} label="夜间结束" rules={[{ required: true, message: "请选择结束时间" }]}>
                            <TimePicker format="HH:mm" minuteStep={5} placeholder="08:00" popupClassName={isDark ? "nav-dark-picker-dropdown" : ""} />
                          </Form.Item>
                          <span style={{ fontSize: 12, color: '#999' }}>支持跨午夜，例如 18:00 - 08:00；时段内自动进入夜间</span>
                        </div>
                      )}
                      <div style={{ marginBottom: 8, fontWeight: 500 }}>夜间配色（变暗时生效，布局排版与日间共享）</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                        {nightPresets.map((p) => (
                          <Button
                            key={p.name}
                            size="small"
                            onClick={() => form.setFieldsValue({ darkTheme: { colors: p.colors } })}
                            title="填充夜间配色，需保存后生效"
                          >
                            <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, backgroundColor: p.colors.bgCard, marginRight: 6, border: '1px solid #ccc' }} />
                            {p.name}
                          </Button>
                        ))}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                        <Form.Item name={["darkTheme", "colors", "primary"]} label="主色调">
                          <ColorPicker showText />
                        </Form.Item>
                        <Form.Item name={["darkTheme", "colors", "bgBase"]} label="页面背景色">
                          <ColorPicker showText />
                        </Form.Item>
                        <Form.Item name={["darkTheme", "colors", "bgCard"]} label="卡片背景色">
                          <ColorPicker showText />
                        </Form.Item>
                        <Form.Item name={["darkTheme", "colors", "textPrimary"]} label="主文字颜色">
                          <ColorPicker showText />
                        </Form.Item>
                        <Form.Item name={["darkTheme", "colors", "textSecondary"]} label="次文字颜色">
                          <ColorPicker showText />
                        </Form.Item>
                        <Form.Item name={["darkTheme", "colors", "border"]} label="边框颜色">
                          <ColorPicker showText />
                        </Form.Item>
                      </div>
                      <Form.Item
                        name={["darkTheme", "customCSS"]}
                        label="夜间自定义 CSS"
                        rules={[
                          {
                            validator: (_, value) => {
                              if (value && value.length > 10240) {
                                return Promise.reject(new Error("夜间自定义CSS长度不能超过10KB"));
                              }
                              return Promise.resolve();
                            },
                          },
                        ]}
                      >
                        <Input.TextArea rows={4} placeholder="/* 仅夜间生效的自定义CSS */" />
                      </Form.Item>
                    </Card>
                  ),
                },
                {
key: "css",
                  label: "自定义 CSS",
                  children: (
                    <Card
                      title="自定义CSS"
                      style={{ marginBottom: 24 }}
                      extra={<span style={{ fontSize: 12, color: '#ff4d4f' }}>⚠️ 高级功能，最大10KB</span>}
                    >
                      <Form.Item
                        name="customCSS"
                        rules={[
                          {
                            validator: (_, value) => {
                              if (value && value.length > 10240) {
                                return Promise.reject(new Error("自定义CSS长度不能超过10KB"));
                              }
                              return Promise.resolve();
                            },
                          },
                        ]}
                      >
                        <Input.TextArea
                          rows={6}
                          placeholder={`/* 在此输入自定义CSS */\n.card-box {\n  /* 自定义样式 */\n}`}
                        />
                      </Form.Item>
                      <div style={{ fontSize: 12, color: '#999' }}>
                        <p>⚠️ 注意事项：</p>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          <li>自定义CSS优先级最高，可能覆盖上述配置</li>
                          <li>支持按页面定向：body[data-page="home" / "admin" / "login"]</li>
                          <li>支持按分类定向：卡片带有 data-catelog="分类名" 属性</li>
                          <li>禁止使用 expression()、behavior 等危险关键字</li>
                          <li>禁止使用非 data: 协议的 url() 引用外部资源</li>
                        </ul>
                      </div>
                    </Card>
                  ),
                },
                {
key: "presets",
                  label: "主题方案",
                  children: (
                    <Card
                      title="主题方案"
                      style={{ marginBottom: 24 }}
                      extra={
                        <Space>
                          <Button size="small" onClick={() => setPresetModalOpen(true)}>把当前配置存为方案</Button>
                          <Button size="small" onClick={handleExport}>导出 JSON</Button>
                          <Button size="small" onClick={() => importFileRef.current?.click()}>导入 JSON</Button>
                          <input
                            ref={importFileRef}
                            type="file"
                            accept="application/json"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleImportFile(f);
                              e.target.value = '';
                            }}
                          />
                        </Space>
                      }
                    >
                      {presets.length === 0 ? (
                        <div style={{ color: '#999', fontSize: 13 }}>
                          还没有保存的主题方案。配置好当前主题后，可将其存为命名方案，之后一键应用。
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                          {presets.map((p: any) => (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4, border: '1px solid #eee', borderRadius: 6, padding: '4px 8px' }}>
                              <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                              <Button type="link" size="small" onClick={() => handleApplyPresetById(p.id)}>应用</Button>
                              <Button type="link" size="small" danger onClick={() => handleDeletePreset(p.id)}>删除</Button>
                            </div>
                          ))}
                        </div>
                      )}
                      <Modal
                        title="保存为主题方案"
                        open={presetModalOpen}
                        onOk={handleSaveAsPreset}
                        onCancel={() => setPresetModalOpen(false)}
                        okText="保存"
                        cancelText="取消"
                      >
                        <Input value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="方案名称，例如：默认蓝 / 护眼夜话" />
                      </Modal>
                    </Card>
                  ),
                },
              ]}
            />
            {/* 操作按钮 */}
          <Form.Item>
            <Space>
              <Button type="primary" icon={<SaveOutlined />} loading={saving} size="large" onClick={handleSave}>
                保存配置
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset} size="large">
                重置默认
              </Button>
            </Space>
          </Form.Item>
          </Form>
        </Spin>
      </div>
      <div className="theme-page-preview">
          <Card
            title="实时预览"
            extra={<span style={{ fontSize: 12, color: '#999' }}>随左侧配置实时变化，自定义 CSS 同步生效</span>}
          >
            <ThemePreview form={form} isDark={isDark} />
          </Card>
        </div>
    </div>
  );
};
