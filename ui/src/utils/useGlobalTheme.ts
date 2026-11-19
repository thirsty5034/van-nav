import { useEffect } from 'react';
import { applyPreferredTheme } from './theme';

/**
 * 全局主题监听 Hook
 * 在任何组件中调用此 Hook，即可自动响应主题变更
 */
export const useGlobalTheme = () => {
  useEffect(() => {
    // 初始应用主题
    applyPreferredTheme('global-hook');

    // 监听 storage 事件（跨标签页同步）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme') {
        applyPreferredTheme('storage');
      }
    };

    // 监听自定义 theme-change 事件（同页面内同步）
    const handleThemeChange = () => {
      applyPreferredTheme('theme-change');
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('theme-change', handleThemeChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('theme-change', handleThemeChange);
    };
  }, []);
};
