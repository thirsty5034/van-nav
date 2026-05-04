import { useEffect } from 'react';
import { initTheme, decodeTheme } from './theme';

/**
 * 全局主题监听 Hook
 * 在任何组件中调用此 Hook，即可自动响应主题变更
 */
export const useGlobalTheme = () => {
  useEffect(() => {
    const applyTheme = () => {
      const theme = initTheme();
      const decodedTheme = decodeTheme(theme);
      const isDark = decodedTheme.includes('dark');
      const body = document.querySelector('body');
      const html = document.documentElement;
      if (body) {
        body.classList.toggle('dark-mode', isDark);
      }
      if (html) {
        html.classList.toggle('dark', isDark);
      }
    };

    // 初始应用主题
    applyTheme();

    // 监听 storage 事件（跨标签页同步）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme') {
        applyTheme();
      }
    };

    // 监听自定义 theme-change 事件（同页面内同步）
    const handleThemeChange = () => {
      applyTheme();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('theme-change', handleThemeChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('theme-change', handleThemeChange);
    };
  }, []);
};
