import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { App as AntApp } from 'antd';
import { Spin } from 'antd';
import { decodeTheme, initTheme, broadcastThemeChange } from './utils/theme';
import './App.css';

// 使用 React.lazy 懒加载组件
const Home = React.lazy(() => import('./pages/Home'));
const AdminPage = React.lazy(() => import('./pages/admin').then(module => ({ default: module.AdminPage })));
const Login = React.lazy(() => import('./pages/Login'));

// 懒加载管理后台的子页面
const Tools = React.lazy(() => import('./pages/admin/tabs/Tools').then(module => ({ default: module.Tools })));
const Catelog = React.lazy(() => import('./pages/admin/tabs/Catelog').then(module => ({ default: module.Catelog })));
const ApiToken = React.lazy(() => import('./pages/admin/tabs/ApiToken').then(module => ({ default: module.ApiToken })));
const Setting = React.lazy(() => import('./pages/admin/tabs/Setting').then(module => ({ default: module.Setting })));
const SearchEngine = React.lazy(() => import('./pages/admin/tabs/Search'));

/**
 * 主题同步组件：监听路由变化和 storage 变化，全局同步主题
 */
const ThemeSync = () => {
  const location = useLocation();

  useEffect(() => {
    const applyThemeToBody = () => {
      const theme = initTheme();
      const decodedTheme = decodeTheme(theme);
      const isDark = decodedTheme.includes('dark');
      const body = document.querySelector('body');
      const html = document.querySelector('html');
      if (body) {
        body.classList.toggle('dark-mode', isDark);
      }
      // 同时给 html 添加 dark 类，让 Tailwind 的 dark: 前缀生效
      if (html) {
        html.classList.toggle('dark', isDark);
      }
    };

    // 路由变化时应用主题
    applyThemeToBody();
  }, [location.pathname]);

  useEffect(() => {
    // 监听 localStorage 变化（跨标签页同步）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme') {
        const theme = initTheme();
        const decodedTheme = decodeTheme(theme);
        const isDark = decodedTheme.includes('dark');
        const body = document.querySelector('body');
        const html = document.querySelector('html');
        if (body) {
          body.classList.toggle('dark-mode', isDark);
        }
        if (html) {
          html.classList.toggle('dark', isDark);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return null;
};

// 加载中的占位组件
const LoadingFallback = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const applyThemeFromStorage = () => {
      const theme = initTheme();
      const decodedTheme = decodeTheme(theme);
      const isDark = decodedTheme.includes('dark');
      setIsDarkMode(isDark);
      const body = document.querySelector('body');
      const html = document.querySelector('html');
      if (body) {
        body.classList.toggle('dark-mode', isDark);
      }
      if (html) {
        html.classList.toggle('dark', isDark);
      }
    };

    applyThemeFromStorage();

    // 监听 localStorage 变化（跨标签页/跨页面同步）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme') {
        applyThemeFromStorage();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: isDarkMode ? '#121212' : '#ffffff',
      color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : '#272e3b',
    }}>
      <Spin size="large" tip="加载中..." />
    </div>
  );
};

function App() {
  return (
    <AntApp>
      <Router>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<AdminPage />}>
              <Route index element={<Tools />} />
              <Route path="tools" element={<Tools />} />
              <Route path="categories" element={<Catelog />} />
              <Route path="search-engines" element={<SearchEngine />} />
              <Route path="api-token" element={<ApiToken />} />
              <Route path="settings" element={<Setting />} />
            </Route>
          </Routes>
          {/* 全局主题同步 */}
          <ThemeSync />
        </Suspense>
      </Router>
    </AntApp>
  );
}

export default App;
